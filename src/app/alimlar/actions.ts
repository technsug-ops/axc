"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export type AlimDurumu = {
  hatalar?: string[];
};

// ---------------------------------------------------------------------------
//  ALIM OLUŞTURMA
// ---------------------------------------------------------------------------

/** Sözlükten çözülen çeviri işlevi. */
type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

/**
 * Şema, mesajlar çözüldükten SONRA kurulur.
 * Modül seviyesinde kurulamaz: getTranslations() istek kapsamlıdır.
 */
function alimSemasiKur(t: Ceviri) {
  const kalemSemasi = z.object({
    variantId: z.string().min(1, t("urunSecilmeli")),
    quantity: z
      .number({ message: t("adetSayiOlmali") })
      .int(t("adetTamSayi"))
      .min(1, t("adetEnAzBir")),
    unitCostAmount: z
      .number({ message: t("fiyatSayiOlmali") })
      .min(0, t("fiyatNegatifOlamaz")),
    unitCostCurrency: z.enum(["TRY", "EUR"], {
      message: t("paraBirimiGecersiz"),
    }),
  });

  return z.object({
    code: z.string().trim().min(1, t("siparisNoZorunlu")).max(191),
    purchasedAt: z.string().min(1, t("tarihZorunlu")),
    channelAccountId: z.string(),
    creditCardId: z.string(),
    installmentCount: z
      .number({ message: t("taksitSayiOlmali") })
      .int(t("taksitTamSayi"))
      .min(1, t("taksitEnAzBir"))
      .max(36, t("taksitEnFazla36")),
    supplierName: z.string().trim().max(191),
    note: z.string().trim(),
    kalemler: z.array(kalemSemasi).min(1, t("enAzBirKalem")),
  });
}

function hataMesaji(yol: PropertyKey[], mesaj: string, t: Ceviri): string {
  if (yol[0] === "kalemler" && typeof yol[1] === "number") {
    return t("kalemHataKalibi", { sira: yol[1] + 1, mesaj });
  }
  return mesaj;
}

export async function alimOlustur(
  _oncekiDurum: AlimDurumu,
  formData: FormData,
): Promise<AlimDurumu> {
  const t = await getTranslations("Alim");

  const ham = formData.get("veri");
  if (typeof ham !== "string") return { hatalar: [t("formOkunamadi")] };

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: [t("formBozuk")] };
  }

  const sonuc = alimSemasiKur(t).safeParse(json);
  if (!sonuc.success) {
    return {
      hatalar: sonuc.error.issues.map((i) => hataMesaji(i.path, i.message, t)),
    };
  }
  const veri = sonuc.data;

  // Sipariş no benzersiz olmalı (şemada @unique).
  const mevcut = await prisma.purchase.findUnique({
    where: { code: veri.code },
  });
  if (mevcut) {
    return { hatalar: [t("siparisNoZatenKayitli", { kod: veri.code })] };
  }

  const tarih = new Date(veri.purchasedAt);
  if (Number.isNaN(tarih.getTime())) {
    return { hatalar: [t("tarihGecersiz")] };
  }

  // Seçilen varyantlar gerçekten var mı?
  const varyantIdleri = [...new Set(veri.kalemler.map((k) => k.variantId))];
  const bulunan = await prisma.productVariant.count({
    where: { id: { in: varyantIdleri } },
  });
  if (bulunan !== varyantIdleri.length) {
    return { hatalar: [t("kalemMevcutDegil")] };
  }

  // Özet alanları: SADECE tüm kalemler aynı para birimindeyse doldurulur.
  // Karma para birimli alımda tek bir toplam yanıltıcı olurdu; boş bırakılır
  // ve toplamlar her zaman kalemlerden hesaplanır.
  const paraBirimleri = new Set(veri.kalemler.map((k) => k.unitCostCurrency));
  const tekParaBirimi =
    paraBirimleri.size === 1 ? [...paraBirimleri][0] : null;
  const malToplami = tekParaBirimi
    ? veri.kalemler.reduce(
        (toplam, k) => toplam + k.unitCostAmount * k.quantity,
        0,
      )
    : null;

  let yeniId: string;
  try {
    const alim = await prisma.purchase.create({
      data: {
        code: veri.code,
        // Spec gereği yeni alım "sipariş verildi" durumunda başlar.
        // Mal kabul (RECEIVED) ve stok girişi Aşama 3'te gelecek.
        status: "ORDERED",
        purchasedAt: tarih,
        supplierName: veri.supplierName || null,
        note: veri.note || null,
        installmentCount: veri.installmentCount,
        channelAccountId: veri.channelAccountId || null,
        creditCardId: veri.creditCardId || null,
        goodsAmount: malToplami,
        goodsCurrency: tekParaBirimi,
        items: {
          create: veri.kalemler.map((k) => ({
            variantId: k.variantId,
            quantity: k.quantity,
            unitCostAmount: k.unitCostAmount,
            unitCostCurrency: k.unitCostCurrency,
          })),
        },
      },
      select: { id: true },
    });
    yeniId = alim.id;
  } catch (e) {
    const kod =
      typeof e === "object" && e !== null && "code" in e
        ? String((e as { code: unknown }).code)
        : "";
    if (kod === "P2002") {
      return { hatalar: [t("siparisNoCakisti")] };
    }
    console.error("[alim] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  revalidatePath("/alimlar");
  redirect(`/alimlar/${yeniId}`);
}
