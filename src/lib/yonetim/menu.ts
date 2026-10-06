import { YONETIM_YOLU } from "@/lib/oturum-imza";

/**
 * ============================================================================
 *  YÖNETİM MENÜSÜ — referans iskelet (HA-Kompass admin, 06.10.2026) · SAF
 * ----------------------------------------------------------------------------
 *  Referansın `NAV` dizisinin karşılığı: gruplu menü, her öğede isteğe bağlı
 *  sayı rozeti; «sıcak» rozet dikkat ister (kırmızı). Sayılar sunucuda tek
 *  kaynaktan (`lib/yonetim/durumlar`) gelir.
 *
 *  ⚠ YALNIZ VAR OLAN EKRANLAR (anayasa: «bağlantının hedefi var mı»): Sistem
 *  sayfası (③ yük/sağlık) yazılmadan menüye girmez.
 * ============================================================================
 */

export const YONETIM_ANA = `${YONETIM_YOLU}/bugun`;

export const YONETIM_MENUSU = [
  { grup: "grupGunluk", ogeler: ["bugun", "firmalar"] },
  { grup: "grupTicari", ogeler: ["paketler", "odemeler"] },
  { grup: "grupDestek", ogeler: ["eposta", "kayitDefteri"] },
] as const;

export type YonetimMenuOgesi = (typeof YONETIM_MENUSU)[number]["ogeler"][number];

export const YONETIM_ADRESLERI: Record<YonetimMenuOgesi, string> = {
  bugun: YONETIM_ANA,
  firmalar: `${YONETIM_YOLU}/firmalar`,
  paketler: `${YONETIM_YOLU}/paketler`,
  odemeler: `${YONETIM_YOLU}/odemeler`,
  eposta: `${YONETIM_YOLU}/eposta`,
  kayitDefteri: `${YONETIM_YOLU}/kayit-defteri`,
};

/** Saf — bulunulan adresin menü öğesi (en uzun eşleşme). */
export function seciliOge(yol: string): YonetimMenuOgesi | null {
  let enIyi: { oge: YonetimMenuOgesi; uzunluk: number } | null = null;
  for (const [oge, adres] of Object.entries(YONETIM_ADRESLERI) as [YonetimMenuOgesi, string][]) {
    if ((yol === adres || yol.startsWith(`${adres}/`)) && (!enIyi || adres.length > enIyi.uzunluk)) enIyi = { oge, uzunluk: adres.length };
  }
  return enIyi?.oge ?? null;
}
