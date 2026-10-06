import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { MENU_ADRESLERI } from "@/lib/menu/katalog";

import { adresinOzelligi, kilitAdresi, kilitliEkranlar, PAKET_YOL_BASLIGI } from "./ozellikler";
import { firmaPaketi } from "./yonetim";

/**
 * ============================================================================
 *  PAKET ERİŞİMİ — firma uygulaması (K303 ② 2. adım, 06.10.2026)
 * ----------------------------------------------------------------------------
 *  Sayfa kapısı (`sayfaIzni` / `sayfaGirisi`) ve menü buradan okur — iki yerde
 *  iki ölçüt olmaz. Kapalı özelliğin sayfası açılmaz, `/paket?ozellik=…`
 *  açıklama sayfasına gider: «paketinizde yok, şu pakette var». VERİ SİLİNMEZ.
 *
 *  ⚠ Kapalı ekranın ARKASINDAKİ eylemler bu adımda ayrıca kilitlenmedi:
 *  ekran açılamadığı için düğmelere ulaşılamaz (panoda açık kalem).
 * ============================================================================
 */

/** Firmanın açık özellikleri — istek başına bir kez okunur. */
export const firmaAcikOzellikleri = cache(async (firmaId: string): Promise<Set<string>> => {
  return (await firmaPaketi(firmaId))?.acik ?? new Set();
});

/** Menü için: bu firmada kilitli ekranlar (ekran anahtarı → özelliği). */
export async function firmaKilitliEkranlari(firmaId: string): Promise<Record<string, string>> {
  return kilitliEkranlar(await firmaAcikOzellikleri(firmaId));
}

/**
 * Sayfa kapısının paket halkası. Adres proxy'nin yazdığı başlıktan okunur;
 * başlık yoksa (proxy'den geçmeyen iç çağrı) kapı KARAR VEREMEZ ve açık
 * bırakır — o yol proxy matcher'ı dışında kalan statik dosyalardır.
 */
export async function paketKapisi(firmaId: string): Promise<void> {
  const yol = (await headers()).get(PAKET_YOL_BASLIGI);
  if (!yol) return;
  const ozellik = adresinOzelligi(yol, MENU_ADRESLERI);
  if (!ozellik) return;
  if (!(await firmaAcikOzellikleri(firmaId)).has(ozellik)) redirect(kilitAdresi(ozellik));
}
