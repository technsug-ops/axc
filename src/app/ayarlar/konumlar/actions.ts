"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export type KonumDurumu = {
  hatalar?: string[];
  basari?: string;
};

const konumSemasi = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Raf kodu zorunlu")
    .max(191, "Raf kodu çok uzun"),
  name: z.string().trim().max(191, "Ad çok uzun"),
  description: z.string().trim(),
});

export async function konumEkle(
  _oncekiDurum: KonumDurumu,
  formData: FormData,
): Promise<KonumDurumu> {
  const sonuc = konumSemasi.safeParse({
    // FormData null dönebiliyor; zod'a hep string veriyoruz ki hata mesajı
    // İngilizce tip hatası değil, bizim Türkçe metnimiz olsun.
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }

  const { code, name, description } = sonuc.data;

  const mevcut = await prisma.location.findUnique({ where: { code } });
  if (mevcut) {
    return { hatalar: [`"${code}" kodlu raf zaten kayıtlı.`] };
  }

  try {
    await prisma.location.create({
      data: {
        code,
        name: name || null,
        description: description || null,
      },
    });
  } catch (e) {
    console.error("[konum actions] beklenmeyen hata:", e);
    return { hatalar: ["Raf eklenemedi, beklenmeyen bir hata oluştu."] };
  }

  revalidatePath("/ayarlar/konumlar");
  // Ürün formu statik derleniyor ve raf listesini buradan alıyor.
  // Tazelemezsek yeni eklenen raf, üretimde açılır listede görünmez.
  revalidatePath("/urunler/yeni");
  return { basari: `"${code}" rafı eklendi.` };
}
