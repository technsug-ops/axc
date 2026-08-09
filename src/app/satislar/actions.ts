"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  satisKaydet,
  SiparisNoCakismasiHatasi,
  YetersizStokHatasi,
} from "@/lib/satis";

export type SatisDurumu = {
  hatalar?: string[];
};

/** Sözlükten çözülen çeviri işlevi. */
type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

/**
 * Şema, mesajlar çözüldükten SONRA kurulur.
 * Modül seviyesinde kurulamaz: getTranslations() istek kapsamlıdır.
 */
function satisSemasiKur(t: Ceviri) {
  const kalemSemasi = z.object({
    variantId: z.string().min(1, t("urunSecilmeli")),
    quantity: z
      .number({ message: t("adetSayiOlmali") })
      .int(t("adetTamSayi"))
      .min(1, t("adetEnAzBir")),
    unitPriceAmount: z
      .number({ message: t("fiyatSayiOlmali") })
      .min(0, t("fiyatNegatifOlamaz")),
    unitPriceCurrency: z.enum(["TRY", "EUR"], {
      message: t("paraBirimiGecersiz"),
    }),
  });

  return z.object({
    // Kanal sipariş numarası opsiyoneldir; girilirse benzersizdir.
    code: z.string().trim().max(191),
    soldAt: z.string().min(1, t("tarihZorunlu")),
    channelAccountId: z.string().min(1, t("kanalHesabiZorunlu")),
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

export async function satisOlustur(
  _oncekiDurum: SatisDurumu,
  formData: FormData,
): Promise<SatisDurumu> {
  const t = await getTranslations("Satis");

  const ham = formData.get("veri");
  if (typeof ham !== "string") return { hatalar: [t("formOkunamadi")] };

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: [t("formBozuk")] };
  }

  const sonuc = satisSemasiKur(t).safeParse(json);
  if (!sonuc.success) {
    return {
      hatalar: sonuc.error.issues.map((i) => hataMesaji(i.path, i.message, t)),
    };
  }
  const veri = sonuc.data;

  const tarih = new Date(veri.soldAt);
  if (Number.isNaN(tarih.getTime())) {
    return { hatalar: [t("tarihGecersiz")] };
  }

  const hesap = await prisma.channelAccount.findUnique({
    where: { id: veri.channelAccountId },
    select: { id: true },
  });
  if (!hesap) return { hatalar: [t("kanalHesabiBulunamadi")] };

  const varyantIdleri = [...new Set(veri.kalemler.map((k) => k.variantId))];
  const varyantlar = await prisma.productVariant.findMany({
    where: { id: { in: varyantIdleri } },
    select: { id: true, sku: true, product: { select: { name: true } } },
  });
  if (varyantlar.length !== varyantIdleri.length) {
    return { hatalar: [t("kalemMevcutDegil")] };
  }

  let yeniId: string;
  try {
    // Satış kaydı, FIFO düşümü ve negatif stok engeli TEK transaction:
    // bkz. src/lib/satis.ts. Yarım satış kaydı oluşamaz.
    yeniId = await satisKaydet({
      code: veri.code || null,
      channelAccountId: veri.channelAccountId,
      soldAt: tarih,
      note: veri.note || null,
      kalemler: veri.kalemler.map((k) => ({
        variantId: k.variantId,
        quantity: k.quantity,
        // Decimal'e string olarak gider; float'a çevrilmez.
        unitPriceAmount: String(k.unitPriceAmount),
        unitPriceCurrency: k.unitPriceCurrency,
      })),
    });
  } catch (e) {
    if (e instanceof YetersizStokHatasi) {
      // Hangi üründe, ne kadar var — kullanıcı ekranda görsün (#5).
      const varyant = varyantlar.find((v) => v.id === e.variantId);
      return {
        hatalar: [
          t("yetersizStok", {
            urun: varyant
              ? `${varyant.product.name} (${varyant.sku})`
              : e.variantId,
            istenen: e.istenen,
            mevcut: e.mevcut,
          }),
        ],
      };
    }
    if (e instanceof SiparisNoCakismasiHatasi) {
      return { hatalar: [t("siparisNoZatenKayitli", { kod: e.code })] };
    }

    const kod =
      typeof e === "object" && e !== null && "code" in e
        ? String((e as { code: unknown }).code)
        : "";
    if (kod === "P2002") {
      return { hatalar: [t("siparisNoCakisti")] };
    }

    console.error("[satis] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  revalidatePath("/satislar");
  revalidatePath("/stok");
  redirect(`/satislar/${yeniId}`);
}
