"use server";

import { yetkiIste } from "@/lib/yetki";
import { basariAdresi } from "@/lib/bildirim";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { rafKoduGecerliMi } from "@/lib/kimlik";
import { prisma } from "@/lib/prisma";

export type KonumDurumu = {
  hatalar?: string[];
  basari?: string;
};

/**
 * Şema, mesajlar çözüldükten SONRA kuruluyor.
 * Modül seviyesinde kurulamaz: getTranslations() istek kapsamlıdır.
 */
function konumSemasi(mesajlar: {
  kodZorunlu: string;
  kodCokUzun: string;
  kodBicimHatasi: string;
  adCokUzun: string;
}) {
  return z.object({
    // BİÇİM DENETİMİ SUNUCUDA DA VAR: istemcideki canlı uyarı kolaylıktır,
    // form doğrudan da gönderilebilir. Desen deponun kendi düzenine göre
    // (A1, A27, R1, DEPO, A5-3) — bkz. src/lib/kimlik.ts.
    code: z
      .string()
      .trim()
      .min(1, mesajlar.kodZorunlu)
      .max(191, mesajlar.kodCokUzun)
      .refine(rafKoduGecerliMi, { message: mesajlar.kodBicimHatasi }),
    name: z.string().trim().max(191, mesajlar.adCokUzun),
    description: z.string().trim(),
  });
}

async function semaHazirla() {
  const t = await getTranslations("Raf");
  return {
    t,
    sema: konumSemasi({
      kodZorunlu: t("kodZorunlu"),
      kodCokUzun: t("kodCokUzun"),
      kodBicimHatasi: t("kodBicimHatasi"),
      adCokUzun: t("adCokUzun"),
    }),
  };
}

/** FormData null dönebiliyor; zod'a hep string veriyoruz. */
function formuOku(formData: FormData) {
  return {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
}

export async function konumEkle(
  _oncekiDurum: KonumDurumu,
  formData: FormData,
): Promise<KonumDurumu> {
  await yetkiIste("ayar.yaz");

  const { t, sema } = await semaHazirla();

  const sonuc = sema.safeParse(formuOku(formData));
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }

  const { code, name, description } = sonuc.data;

  const mevcut = await prisma.location.findUnique({ where: { code } });
  if (mevcut) {
    // PASİF RAF LİSTEDE GÖRÜNMEYEBİLİR: "zaten kayıtlı" deyip susmak,
    // kullanıcıyı göremediği bir kayıtla çarpıştırmak olurdu.
    return {
      hatalar: [
        mevcut.isActive
          ? t("kodZatenKayitli", { kod: code, ad: mevcut.name ?? "—" })
          : t("kodPasifRaftaVar", { kod: code, ad: mevcut.name ?? "—" }),
      ],
    };
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
    return { hatalar: [t("eklenemedi")] };
  }

  rafSayfalariniTazele();
  return { basari: t("eklendi", { kod: code }) };
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
  await yetkiIste("ayar.yaz");

  const { t, sema } = await semaHazirla();

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const sonuc = sema.safeParse(formuOku(formData));
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }

  const { code, name, description } = sonuc.data;

  // Kod benzersiz; başka bir rafta kullanılıyorsa engelle.
  const ayniKodlu = await prisma.location.findUnique({ where: { code } });
  if (ayniKodlu && ayniKodlu.id !== id) {
    return {
      hatalar: [
        ayniKodlu.isActive
          ? t("kodBaskaRaftaVar", { kod: code, ad: ayniKodlu.name ?? "—" })
          : t("kodPasifRaftaVar", { kod: code, ad: ayniKodlu.name ?? "—" }),
      ],
    };
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
    return { hatalar: [t("guncellenemedi")] };
  }

  rafSayfalariniTazele();
  redirect(basariAdresi("/ayarlar/konumlar", "guncellendi"));
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
  await yetkiIste("ayar.yaz");

  const t = await getTranslations("Raf");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const konum = await prisma.location.findUnique({ where: { id } });
  if (!konum) return { hatalar: [t("bulunamadi")] };

  await prisma.location.update({
    where: { id },
    data: { isActive: !konum.isActive },
  });

  rafSayfalariniTazele();

  return {
    basari: konum.isActive
      ? t("pasifeAlindi", { kod: konum.code })
      : t("aktiflestirildi", { kod: konum.code }),
  };
}
