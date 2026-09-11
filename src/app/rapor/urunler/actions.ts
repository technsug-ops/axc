"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  ÜRÜN ETİKETLERİ — FAVORİ / İNCELENECEK / MEVSİM (K212)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 11.09.2026: _"favori ürünler ve incelenilecek ürünler
 *  şeklinde ürünleri etiketleyebilelim... yaz kış tag'ları da olabilir."_
 *
 *  ⚠ ORTAK ETİKET, KULLANICI BAZLI DEĞİL (kullanıcı kararı 11.09.2026).
 *  Alanlar `Product` üzerinde — kim işaretlerse işaretlesin tüm ekibe
 *  görünür. Şema gerekçesi `prisma/schema.prisma`da (K212).
 *
 *  ⚠ İZ YAZILMIYOR — bu bir LEDGER kaydı değil, `KargoDurumu`daki
 *  (`satislar/actions.ts`) basit toggle ile AYNI sınıf: geri alınabilir,
 *  hiçbir para hesabı değişmiyor.
 *
 *  ⚠ OTOMATİK "MEVSİM ÖNERİSİ" YOK — yalnız ELLE atama. Gerekçe:
 *  `urun-analizi-verisi.ts`teki `mevsimselVerisi` başlığında (K212, ölçüldü
 *  11.09.2026: veri yetersiz).
 * ============================================================================
 */
export type EtiketSonucu = { hata?: string };

async function urunVarMi(urunId: string): Promise<boolean> {
  const urun = await prisma.product.findUnique({
    where: { id: urunId },
    select: { id: true },
  });
  return urun !== null;
}

function tazele() {
  revalidatePath("/rapor/urunler");
  revalidatePath("/urunler");
}

export async function urunFavoriGuncelle(
  urunId: string,
  yeniDeger: boolean,
): Promise<EtiketSonucu> {
  await yetkiIste("urun.yaz");
  const t = await getTranslations("UrunAnalizi");
  if (!(await urunVarMi(urunId))) return { hata: t("urunBulunamadi") };

  await prisma.product.update({
    where: { id: urunId },
    data: { isFavorite: yeniDeger },
  });
  tazele();
  return {};
}

export async function urunIncelenecekGuncelle(
  urunId: string,
  yeniDeger: boolean,
): Promise<EtiketSonucu> {
  await yetkiIste("urun.yaz");
  const t = await getTranslations("UrunAnalizi");
  if (!(await urunVarMi(urunId))) return { hata: t("urunBulunamadi") };

  await prisma.product.update({
    where: { id: urunId },
    data: { needsReview: yeniDeger },
  });
  tazele();
  return {};
}

export async function urunSezonGuncelle(
  urunId: string,
  yeniSezon: "YAZ" | "KIS" | null,
): Promise<EtiketSonucu> {
  await yetkiIste("urun.yaz");
  const t = await getTranslations("UrunAnalizi");
  if (!(await urunVarMi(urunId))) return { hata: t("urunBulunamadi") };

  await prisma.product.update({
    where: { id: urunId },
    data: { season: yeniSezon },
  });
  tazele();
  return {};
}
