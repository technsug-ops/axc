"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  rafSayfalariniTazele();
  return { basari: `"${code}" rafı eklendi.` };
}

/**
 * Raf listesini gösteren sayfaların hepsi statik derleniyor.
 * Tazelemezsek değişiklik üretimde görünmez.
 */
function rafSayfalariniTazele() {
  revalidatePath("/ayarlar/konumlar");
  revalidatePath("/ayarlar/konumlar/etiketler");
  revalidatePath("/urunler/yeni");
}

// ---------------------------------------------------------------------------

export async function konumGuncelle(
  _oncekiDurum: KonumDurumu,
  formData: FormData,
): Promise<KonumDurumu> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: ["Raf kimliği bulunamadı."] };

  const sonuc = konumSemasi.safeParse({
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  });

  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }

  const { code, name, description } = sonuc.data;

  // Kod benzersiz; başka bir rafta kullanılıyorsa engelle.
  const ayniKodlu = await prisma.location.findUnique({ where: { code } });
  if (ayniKodlu && ayniKodlu.id !== id) {
    return { hatalar: [`"${code}" kodlu başka bir raf zaten var.`] };
  }

  try {
    await prisma.location.update({
      where: { id },
      data: {
        code,
        name: name || null,
        description: description || null,
      },
    });
  } catch (e) {
    console.error("[konum guncelle] beklenmeyen hata:", e);
    return { hatalar: ["Raf güncellenemedi, beklenmeyen bir hata oluştu."] };
  }

  rafSayfalariniTazele();
  redirect("/ayarlar/konumlar");
}

/**
 * Rafı aktif/pasif yapar. SİLME YOK: varyantlar ve stok hareketleri bu rafa
 * referans veriyor olabilir; silmek geçmişi bozar.
 * Pasif raf, ürün formu ve mal kabul ekranındaki seçim listelerinde çıkmaz.
 */
export async function konumDurumDegistir(
  _oncekiDurum: KonumDurumu,
  formData: FormData,
): Promise<KonumDurumu> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: ["Raf kimliği bulunamadı."] };

  const konum = await prisma.location.findUnique({ where: { id } });
  if (!konum) return { hatalar: ["Raf bulunamadı."] };

  await prisma.location.update({
    where: { id },
    data: { isActive: !konum.isActive },
  });

  rafSayfalariniTazele();

  return {
    basari: konum.isActive
      ? `"${konum.code}" pasife alındı; artık raf seçim listelerinde çıkmaz.`
      : `"${konum.code}" tekrar aktif.`,
  };
}
