"use server";

import { yetkiIste } from "@/lib/yetki";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { harfleriKatla } from "@/lib/kimlik";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  TEDARİKÇİ İŞLEMLERİ
 * ----------------------------------------------------------------------------
 *  10.08.2026'da bulundu: `Supplier` tablosu vardı, migration eski serbest
 *  metin adları oraya taşımıştı, ama uygulama kodunda `supplierId` HİÇBİR
 *  YERDE yazılmıyordu. Alım formu tedarikçiyi hâlâ serbest metin olarak
 *  alıyordu; ilişki ölü duruyordu.
 *
 *  Alım numarası tedarikçi kodunu içerdiği için (ALM-HE-260811-01) önce bu
 *  ekran kuruldu. Kod olmadan numara üretilemez.
 * ============================================================================
 */

export type TedarikciDurumu = {
  hatalar?: string[];
  basari?: string;
  /** Akış içi ekleme için: oluşan kaydın kimliği, form onu seçsin diye. */
  yeniId?: string;
};

type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

/** Kod uzunluğu: alım numarasını okunur tutmak için kısa. */
const KOD_EN_AZ = 2;
const KOD_EN_COK = 4;

function semaKur(t: Ceviri) {
  return z.object({
    name: z.string().trim().min(1, t("adZorunlu")).max(191, t("adCokUzun")),
    // Kod ZORUNLU: alım numarasının parçası, boş kalırsa numara üretilemez.
    code: z
      .string()
      .trim()
      .min(1, t("kodZorunlu"))
      .refine(
        (ham) =>
          /^\p{L}+$/u.test(ham) &&
          harfleriKatla(ham).length >= KOD_EN_AZ &&
          harfleriKatla(ham).length <= KOD_EN_COK,
        { message: t("kodGecersiz") },
      ),
    contact: z.string().trim().max(191),
    note: z.string().trim(),
  });
}

function formuOku(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
    contact: String(formData.get("contact") ?? ""),
    note: String(formData.get("note") ?? ""),
  };
}

function tazele() {
  revalidatePath("/ayarlar/tedarikciler");
  // Alım formu tedarikçi listesini buradan alıyor.
  revalidatePath("/alimlar/yeni");
  revalidatePath("/alimlar");
}

/**
 * Ad ve kod ayrı ayrı benzersizdir. Çakışmada HANGİ tedarikçinin o değeri
 * tuttuğu söylenir — sessizce sonuna sayı eklenmez (anayasa #5).
 */
async function cakismalar(
  t: Ceviri,
  ad: string,
  kod: string,
  haricId?: string,
): Promise<string[]> {
  const hatalar: string[] = [];
  const haric = haricId ? { NOT: { id: haricId } } : {};

  const [adSahibi, kodSahibi] = await Promise.all([
    prisma.supplier.findFirst({ where: { name: ad, ...haric }, select: { id: true } }),
    prisma.supplier.findFirst({
      where: { code: kod, ...haric },
      select: { name: true },
    }),
  ]);

  if (adSahibi) hatalar.push(t("adZatenVar", { ad }));
  if (kodSahibi) hatalar.push(t("kodZatenVar", { kod, ad: kodSahibi.name }));
  return hatalar;
}

export async function tedarikciEkle(
  _oncekiDurum: TedarikciDurumu,
  formData: FormData,
): Promise<TedarikciDurumu> {
  await yetkiIste("ayar.yaz");

  const t = await getTranslations("Tedarikci");

  const sonuc = semaKur(t).safeParse(formuOku(formData));
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;
  const kod = harfleriKatla(veri.code);

  const hatalar = await cakismalar(t, veri.name, kod);
  if (hatalar.length) return { hatalar };

  try {
    const yeni = await prisma.supplier.create({
      data: {
        name: veri.name,
        code: kod,
        contact: veri.contact || null,
        note: veri.note || null,
      },
      select: { id: true },
    });
    tazele();
    return { basari: t("eklendi", { ad: veri.name }), yeniId: yeni.id };
  } catch (e) {
    console.error("[tedarikci] beklenmeyen hata:", e);
    return { hatalar: [t("eklenemedi")] };
  }
}

export async function tedarikciGuncelle(
  _oncekiDurum: TedarikciDurumu,
  formData: FormData,
): Promise<TedarikciDurumu> {
  await yetkiIste("ayar.yaz");

  const t = await getTranslations("Tedarikci");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const sonuc = semaKur(t).safeParse(formuOku(formData));
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;
  const kod = harfleriKatla(veri.code);

  const kayit = await prisma.supplier.findUnique({ where: { id } });
  if (!kayit) return { hatalar: [t("bulunamadi")] };

  const hatalar = await cakismalar(t, veri.name, kod, id);
  if (hatalar.length) return { hatalar };

  try {
    await prisma.supplier.update({
      where: { id },
      data: {
        name: veri.name,
        code: kod,
        contact: veri.contact || null,
        note: veri.note || null,
      },
    });
  } catch (e) {
    console.error("[tedarikci] beklenmeyen hata:", e);
    return { hatalar: [t("guncellenemedi")] };
  }

  tazele();
  return { basari: t("guncellendi", { ad: veri.name }) };
}

/**
 * Tedarikçi SİLİNMEZ, pasife alınır. Geçmiş alımlar ona bağlı; silmek
 * o alımların tedarikçisini kaybettirirdi (ledger mantığının aynısı).
 */
export async function tedarikciDurumDegistir(
  _oncekiDurum: TedarikciDurumu,
  formData: FormData,
): Promise<TedarikciDurumu> {
  await yetkiIste("ayar.yaz");

  const t = await getTranslations("Tedarikci");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const kayit = await prisma.supplier.findUnique({ where: { id } });
  if (!kayit) return { hatalar: [t("bulunamadi")] };

  await prisma.supplier.update({
    where: { id },
    data: { isActive: !kayit.isActive },
  });

  tazele();
  return {
    basari: kayit.isActive
      ? t("pasifeAlindi", { ad: kayit.name })
      : t("aktiflestirildi", { ad: kayit.name }),
  };
}
