"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import type { CompensationStatus } from "@/generated/prisma/enums";
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
    purchaseItemId: z.string().min(1, t("kalemZorunlu")),
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
    purchaseItemId: String(formData.get("purchaseItemId") ?? ""),
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

  const kalem = await prisma.purchaseItem.findUnique({
    where: { id: veri.purchaseItemId },
    select: {
      id: true,
      damagedQuantity: true,
      unitCostCurrency: true,
      variant: { select: { sku: true } },
      purchase: { select: { supplierId: true, code: true } },
    },
  });
  if (!kalem) return { hatalar: [t("kalemBulunamadi")] };

  // Tedarikçi bağı olmayan eski alımdan talep açılamaz: alacak KİME
  // yazılacağı belli olmalı.
  if (!kalem.purchase.supplierId) {
    return { hatalar: [t("alimTedarikcisiz", { kod: kalem.purchase.code })] };
  }

  const mevcutler = await prisma.compensation.findMany({
    where: { purchaseItemId: kalem.id },
    select: { quantity: true },
  });
  const kalan = kalanTalepEdilebilirAdet(
    kalem.damagedQuantity,
    mevcutler.map((m) => m.quantity),
  );

  if (kalan <= 0) {
    return { hatalar: [t("hepsiTalepEdilmis", { sku: kalem.variant.sku })] };
  }
  if (veri.quantity > kalan) {
    return { hatalar: [t("adetKalandanFazla", { kalan })] };
  }

  try {
    await prisma.compensation.create({
      data: {
        supplierId: kalem.purchase.supplierId,
        purchaseItemId: kalem.id,
        quantity: veri.quantity,
        amount: String(veri.amount),
        // Para birimi TALEPTEN DEĞİL, kalemin maliyetinden gelir:
        // neyi kaybettiyseniz onu talep edersiniz.
        currency: kalem.unitCostCurrency,
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
  return { basari: t("acildi", { sku: kalem.variant.sku }) };
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
