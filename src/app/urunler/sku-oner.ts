"use server";

import {
  gunKodu,
  skuOnEki,
  skuUret,
  sonrakiSira,
  urunKisaltmasi,
} from "@/lib/kimlik";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  SKU ÖNERİSİ
 * ----------------------------------------------------------------------------
 *  OYU-LG-260811-01 = kategori kodu · ürün/marka kısaltması · gün · sıra
 *
 *  ÜÇ KURAL (bkz. src/lib/kimlik.ts):
 *   - Kod İPUCUDUR, gerçek veritabanındadır. Kategori sonradan değişse kod
 *     değişmez.
 *   - Tarih ürünün SİSTEME İLK GİRİŞ günüdür, alım günü değil.
 *   - Doğduktan sonra değişmez (hareket görmüş üründe kilitli).
 *
 *  ÖNERİ DAYATMA DEĞİLDİR: düğmeye basılmadan alan dolmaz, dolduktan sonra
 *  elle değiştirilebilir. Bu yüzden sunucu tarafında SADECE öneri üretilir,
 *  kaydetme sırasında zorunluluk aranmaz.
 * ============================================================================
 */

export type SkuOnerisi =
  | { kod: string }
  | { hata: "KATEGORI_SECILMEDI" | "KATEGORI_KODSUZ" | "KISALTMA_YOK"; ad?: string };

export async function skuOner(girdi: {
  kategoriId: string;
  ad: string;
  marka: string;
  /**
   * Aynı formda HENÜZ KAYDEDİLMEMİŞ varyantların kodları.
   * Veritabanı bunları bilmez; çok varyantlı üründe ikinci varyant
   * birincinin numarasını alırdı.
   */
  kullanilan?: string[];
}): Promise<SkuOnerisi> {
  if (!girdi.kategoriId) return { hata: "KATEGORI_SECILMEDI" };

  const kategori = await prisma.category.findUnique({
    where: { id: girdi.kategoriId },
    select: { name: true, code: true },
  });
  if (!kategori) return { hata: "KATEGORI_SECILMEDI" };
  if (!kategori.code) return { hata: "KATEGORI_KODSUZ", ad: kategori.name };

  const kisaltma = urunKisaltmasi(girdi.ad, girdi.marka);
  if (!kisaltma) return { hata: "KISALTMA_YOK" };

  // Gün İŞ saat diliminden çözülür — Almanya'da gece yarısından sonra
  // girilen ürün Türkiye'nin ertesi gününü alır.
  const gun = gunKodu(new Date());
  const onEk = skuOnEki({ kategoriKodu: kategori.code, kisaltma, gun });

  const mevcutlar = await prisma.productVariant.findMany({
    where: { sku: { startsWith: onEk } },
    select: { sku: true },
  });

  const sira = sonrakiSira(
    [...mevcutlar.map((v) => v.sku), ...(girdi.kullanilan ?? [])],
    onEk,
  );

  return {
    kod: skuUret({ kategoriKodu: kategori.code, kisaltma, gun, sira }),
  };
}
