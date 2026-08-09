"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export type KategoriDurumu = {
  hatalar?: string[];
  basari?: string;
};

type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

function kategoriSemasiKur(t: Ceviri) {
  return z.object({
    name: z.string().trim().min(1, t("adZorunlu")).max(191, t("adCokUzun")),
    vatRate: z
      .number({ message: t("oranSayiOlmali") })
      .min(0, t("oranAralik"))
      .max(100, t("oranAralik")),
  });
}

/** Formdan gelen "20" veya "1,5" -> 20 / 1.5 */
function oranaCevir(ham: FormDataEntryValue | null): number {
  const s = String(ham ?? "").trim().replace(",", ".");
  return s === "" ? NaN : Number(s);
}

/** Kategori formu hem ekleme hem düzenleme için kullanılır. */
function tazele() {
  revalidatePath("/ayarlar/kategoriler");
  // Ürün formu kategori listesini buradan alıyor; ikisi de statik üretiliyor.
  revalidatePath("/urunler/yeni");
}

export async function kategoriEkle(
  _oncekiDurum: KategoriDurumu,
  formData: FormData,
): Promise<KategoriDurumu> {
  const t = await getTranslations("Kategori");

  const sonuc = kategoriSemasiKur(t).safeParse({
    name: String(formData.get("name") ?? ""),
    vatRate: oranaCevir(formData.get("vatRate")),
  });
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;

  const mevcut = await prisma.category.findUnique({
    where: { name: veri.name },
    select: { id: true },
  });
  if (mevcut) return { hatalar: [t("adZatenVar", { ad: veri.name })] };

  try {
    await prisma.category.create({
      data: { name: veri.name, vatRate: String(veri.vatRate) },
    });
  } catch (e) {
    console.error("[kategori] beklenmeyen hata:", e);
    return { hatalar: [t("eklenemedi")] };
  }

  tazele();
  return { basari: t("eklendi", { ad: veri.name }) };
}

export async function kategoriGuncelle(
  _oncekiDurum: KategoriDurumu,
  formData: FormData,
): Promise<KategoriDurumu> {
  const t = await getTranslations("Kategori");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const sonuc = kategoriSemasiKur(t).safeParse({
    name: String(formData.get("name") ?? ""),
    vatRate: oranaCevir(formData.get("vatRate")),
  });
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;

  const kayit = await prisma.category.findUnique({ where: { id } });
  if (!kayit) return { hatalar: [t("bulunamadi")] };

  const cakisan = await prisma.category.findFirst({
    where: { name: veri.name, NOT: { id } },
    select: { id: true },
  });
  if (cakisan) return { hatalar: [t("adZatenVar", { ad: veri.name })] };

  try {
    await prisma.category.update({
      where: { id },
      data: { name: veri.name, vatRate: String(veri.vatRate) },
    });
  } catch (e) {
    console.error("[kategori] beklenmeyen hata:", e);
    return { hatalar: [t("guncellenemedi")] };
  }

  tazele();
  return { basari: t("eklendi", { ad: veri.name }) };
}

/** Kategori silinmez; ürünler ve geçmiş satışlar ona bağlı olabilir. */
export async function kategoriDurumDegistir(
  _oncekiDurum: KategoriDurumu,
  formData: FormData,
): Promise<KategoriDurumu> {
  const t = await getTranslations("Kategori");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const kayit = await prisma.category.findUnique({ where: { id } });
  if (!kayit) return { hatalar: [t("bulunamadi")] };

  await prisma.category.update({
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
