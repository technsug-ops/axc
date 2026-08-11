"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import type { CompensationStatus, Currency } from "@/generated/prisma/enums";
import { gunMetninden } from "@/lib/donem";
import { prisma } from "@/lib/prisma";
import { kalanTalepEdilebilirAdet } from "@/lib/tazminat";

export type TazminatDurumu = {
  hatalar?: string[];
  basari?: string;
};

type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

const DURUMLAR = [
  "OPEN",
  "CLAIMED",
  "ACCEPTED",
  "REJECTED",
  "SETTLED",
] as const;

function semaKur(t: Ceviri) {
  return z.object({
    /** "alim" ya da "iade" — hasarın hangi kaynaktan geldiği. */
    kaynak: z.enum(["alim", "iade"], { message: t("kalemZorunlu") }),
    kalemId: z.string().min(1, t("kalemZorunlu")),
    quantity: z
      .number({ message: t("adetSayiOlmali") })
      .int(t("adetTamSayi"))
      .min(1, t("adetEnAzBir")),
    amount: z
      .number({ message: t("tutarSayiOlmali") })
      .min(0, t("tutarNegatifOlamaz")),
    occurredAt: z.string().min(1, t("tarihZorunlu")),
    status: z.enum(DURUMLAR, { message: t("durumGecersiz") }),
    note: z.string().trim(),
  });
}

/** "1.234,56" / "1234.56" -> sayı. Boşsa NaN (zod yakalar). */
function tutaraCevir(ham: FormDataEntryValue | null): number {
  const s = String(ham ?? "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  return s === "" ? NaN : Number(s);
}

function tazele() {
  revalidatePath("/tazminat");
  revalidatePath("/ayarlar/tedarikciler");
}

/** İki kaynağın ortak şekli — çağıran taraf farkı bilmez. */
type CozulmusHasar = {
  id: string;
  sku: string;
  hasarliAdet: number;
  paraBirimi: Currency;
  tedarikciId: string | null;
  /** Hata metninde kullanılacak bağlam: alım kodu ya da sipariş no. */
  baglam: string;
};

/**
 * İADE TARAFINDA TEDARİKÇİ DOLAYLI BULUNUR.
 *
 * Alım kaleminde tedarikçi doğrudan yazılıdır. İade kaleminde yoktur:
 * müşteri bize iade eder, biz tedarikçiden isteriz. Sorumlu tedarikçi,
 * o varyantın EN SON alındığı tedarikçidir.
 *
 * ⚠ BU BİR TAHMİNDİR, kesin değildir. Aynı ürünü iki tedarikçiden aldıysanız
 * müşteriye giden malın hangisinden çıktığını iade kaydı bilmez (FIFO
 * partisi satışta tutulur, iadede değil). Bu yüzden form tedarikçiyi
 * DEĞİŞTİRİLEBİLİR gösterir; sistem sadece en olası olanı önerir.
 */
async function hasariCoz(
  kaynak: "alim" | "iade",
  kalemId: string,
): Promise<CozulmusHasar | null> {
  if (kaynak === "alim") {
    const k = await prisma.purchaseItem.findUnique({
      where: { id: kalemId },
      select: {
        id: true,
        damagedQuantity: true,
        unitCostCurrency: true,
        variant: { select: { sku: true } },
        purchase: { select: { supplierId: true, code: true } },
      },
    });
    if (!k) return null;
    return {
      id: k.id,
      sku: k.variant.sku,
      hasarliAdet: k.damagedQuantity,
      paraBirimi: k.unitCostCurrency,
      tedarikciId: k.purchase.supplierId,
      baglam: k.purchase.code,
    };
  }

  const k = await prisma.returnItem.findUnique({
    where: { id: kalemId },
    select: {
      id: true,
      damagedQuantity: true,
      variantId: true,
      variant: { select: { sku: true } },
      return: { select: { sale: { select: { code: true } } } },
    },
  });
  if (!k) return null;

  // O varyantın son alımı: tedarikçi ve maliyet para birimi oradan gelir.
  const sonAlim = await prisma.purchaseItem.findFirst({
    where: { variantId: k.variantId, purchase: { NOT: { supplierId: null } } },
    select: {
      unitCostCurrency: true,
      purchase: { select: { supplierId: true } },
    },
    orderBy: { purchase: { purchasedAt: "desc" } },
  });

  return {
    id: k.id,
    sku: k.variant.sku,
    hasarliAdet: k.damagedQuantity,
    paraBirimi: sonAlim?.unitCostCurrency ?? "TRY",
    tedarikciId: sonAlim?.purchase.supplierId ?? null,
    baglam: k.return.sale.code ?? k.variant.sku,
  };
}

/**
 * ============================================================================
 *  TAZMİNAT TALEBİ AÇMA
 * ----------------------------------------------------------------------------
 *  Talep bir HASARA bağlanır: alım kalemindeki `damagedQuantity`.
 *  Serbest talep açılamaz — "hangi hasar için?" sorusunun cevabı olmayan
 *  bir alacak kaydı, üç ay sonra kimsenin doğrulayamayacağı bir rakamdır.
 *
 *  AYNI HASAR İKİ KEZ TALEP EDİLEMEZ: açık taleplerin adedi düşülür ve
 *  kalan sıfırsa yeni talep reddedilir.
 * ============================================================================
 */
export async function tazminatAc(
  _oncekiDurum: TazminatDurumu,
  formData: FormData,
): Promise<TazminatDurumu> {
  const t = await getTranslations("Tazminat");

  const sonuc = semaKur(t).safeParse({
    kaynak: String(formData.get("kaynak") ?? "alim"),
    kalemId: String(formData.get("kalemId") ?? ""),
    quantity: Number(String(formData.get("quantity") ?? "")),
    amount: tutaraCevir(formData.get("amount")),
    occurredAt: String(formData.get("occurredAt") ?? ""),
    status: String(formData.get("status") ?? "OPEN"),
    note: String(formData.get("note") ?? ""),
  });
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;

  const tarih = gunMetninden(veri.occurredAt);
  if (!tarih) return { hatalar: [t("tarihGecersiz")] };

  /**
   * HASAR İKİ KAYNAKTAN GELİR ama talep TEK kaleme bağlanır:
   *  - alım kalemi: mal bize hasarlı geldi
   *  - iade kalemi: müşteriden hasarlı döndü
   *
   * İade tarafında tedarikçi DOLAYLI bulunur: iade → satış kalemi →
   * varyant → o varyantın SON alımı. Müşteriye giden mal hangi partiden
   * çıktıysa sorumluluk o tedarikçidedir.
   */
  const kalem = await hasariCoz(veri.kaynak, veri.kalemId);
  if (!kalem) return { hatalar: [t("kalemBulunamadi")] };
  if (!kalem.tedarikciId) {
    return { hatalar: [t("kaynakTedarikcisiz", { kod: kalem.baglam })] };
  }

  const mevcutler = await prisma.compensation.findMany({
    where:
      veri.kaynak === "alim"
        ? { purchaseItemId: kalem.id }
        : { returnItemId: kalem.id },
    select: { quantity: true },
  });
  const kalan = kalanTalepEdilebilirAdet(
    kalem.hasarliAdet,
    mevcutler.map((m) => m.quantity),
  );

  if (kalan <= 0) {
    return { hatalar: [t("hepsiTalepEdilmis", { sku: kalem.sku })] };
  }
  if (veri.quantity > kalan) {
    return { hatalar: [t("adetKalandanFazla", { kalan })] };
  }

  try {
    await prisma.compensation.create({
      data: {
        supplierId: kalem.tedarikciId,
        // Talep YA alım kalemine YA iade kalemine bağlanır, ikisine değil.
        purchaseItemId: veri.kaynak === "alim" ? kalem.id : null,
        returnItemId: veri.kaynak === "iade" ? kalem.id : null,
        quantity: veri.quantity,
        amount: String(veri.amount),
        // Para birimi TALEPTEN DEĞİL, malın maliyetinden gelir:
        // neyi kaybettiyseniz onu talep edersiniz.
        currency: kalem.paraBirimi,
        status: veri.status as CompensationStatus,
        occurredAt: tarih,
        note: veri.note || null,
      },
    });
  } catch (e) {
    console.error("[tazminat] beklenmeyen hata:", e);
    return { hatalar: [t("acilamadi")] };
  }

  tazele();
  return { basari: t("acildi", { sku: kalem.sku }) };
}

/**
 * Durum değiştirme. Kayıt SİLİNMEZ — reddedilen talep de geçmiştir,
 * "bu hasarı talep etmiştik, kabul etmediler" bilgisi kalır.
 */
export async function tazminatDurumDegistir(
  _oncekiDurum: TazminatDurumu,
  formData: FormData,
): Promise<TazminatDurumu> {
  const t = await getTranslations("Tazminat");
  const tDurum = await getTranslations("TazminatDurumu");

  const id = String(formData.get("id") ?? "");
  const yeni = String(formData.get("status") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };
  if (!(DURUMLAR as readonly string[]).includes(yeni)) {
    return { hatalar: [t("durumGecersiz")] };
  }

  const kayit = await prisma.compensation.findUnique({ where: { id } });
  if (!kayit) return { hatalar: [t("bulunamadi")] };

  await prisma.compensation.update({
    where: { id },
    data: { status: yeni as CompensationStatus },
  });

  tazele();
  return { basari: t("durumDegisti", { durum: tDurum(yeni) }) };
}
