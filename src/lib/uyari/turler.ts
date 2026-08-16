/**
 * ============================================================================
 *  UYARI MERKEZİ — TANIMLAR
 * ----------------------------------------------------------------------------
 *  Mimar sözleşmesi 15.08.2026. FAZ 1: yalnız KIRMIZI uyarılar — para kaybı
 *  ya da para riski. "Bilgi için bilgi" yok; her uyarı bir EYLEME götürür.
 *
 *  ── SEVİYE BAŞTAN VAR, İÇERİK DAR ───────────────────────────────────────
 *  `seviye` alanı Faz 1'de hep "kirmizi" dönüyor ama tip üç değeri de
 *  tanıyor. Amber ve nötr katman Faz 2'de doldurulacak; o gün tipi
 *  genişletmek yerine yalnız yeni kural yazmak yetecek. (EUR kararıyla aynı
 *  ilke: mimari genişlemeye hazır, içerik bugüne göre dar.)
 *
 *  ── AÇIK SIFIR ──────────────────────────────────────────────────────────
 *  Uyarı yoksa çan GİZLENMEZ; nötr durur ve "temiz ✓" yazar. Bir şeyin
 *  YOKLUĞUNDAN "sorun yok" sonucu çıkarmak imkânsızdır — kullanıcı onu
 *  "ekran bozuk" diye okur (13.08.2026 dersi, görev kutusunda da geçerli).
 *
 *  ── YETKİ ETİKETİ HER UYARIDA ───────────────────────────────────────────
 *  Finans/kâr uyarıları `satis.kar.gor` ister; operasyonel olan (maliyetsiz
 *  stok) istemez. Depocuya nakit açığı ya da kârsız satış SIZMAZ. Etiket
 *  uyarının kendi tanımında durur ki toplayan taraf unutamasın.
 * ============================================================================
 */

import type { Izin } from "@/lib/yetki/izinler";

export const UYARI_SEVIYELERI = ["kirmizi", "amber", "notr"] as const;
export type UyariSeviyesi = (typeof UYARI_SEVIYELERI)[number];

export const UYARI_ANAHTARLARI = [
  /** Önümüzdeki 14 günde çıkacak para girecekten fazla. */
  "nakitAcigi",
  /** Stokta adedi olan ama birim maliyeti bilinmeyen partili varyantlar. */
  "maliyetsizStok",
  /** `profitStatus` CALCULATED değil — kâr hesaplanamadı. */
  "karHesaplanamayan",
  /** Vadesi geçmiş ve hâlâ ödenmemiş hakediş kalemi. */
  "hakedisGecikti",
] as const;

export type UyariAnahtari = (typeof UYARI_ANAHTARLARI)[number];

/**
 * Her uyarının gideceği SÜZÜLÜ adres.
 *
 * ⚠ ADRES, SAYIYI ÜRETEN KOŞULUN AYNISINI TAŞIMALI. Görev kutusunda tam
 * bu hata yaşandı (15.08.2026): panel 5 diyor, açılan liste 4 gösteriyordu.
 * Sayı ile listenin ayrışması, panele olan güveni tek seferde bitirir.
 */
export const UYARI_ADRESLERI: Record<UyariAnahtari, string> = {
  nakitAcigi: "/nakit-takvimi",
  maliyetsizStok: "/stok?maliyet=yok",
  karHesaplanamayan: "/satislar?kar=eksik",
  /**
   * SÜZGEÇSİZ /hakedis — çünkü o ekranda "durum" süzgeci YOK.
   * `?durum=geciken` yazmak, olmayan bir süzgece bel bağlamak olurdu
   * (anayasa notu: gösterdiğim link VAR OLAN bir ekrana mı gidiyor).
   * Ekran gecikenleri kendi uyarı kutusunda AYNI sayıyla gösteriyor;
   * kalem listesi Faz 2 işi olarak BEKLEYENLER’e yazıldı.
   */
  hakedisGecikti: "/hakedis",
};

/**
 * Uyarıyı görmek için gereken izin. `null` = herkese açık (operasyonel).
 *
 * Maliyetsiz stok OPERASYONEL bir eksiktir — depocu görüp alım girebilir,
 * içinde kâr bilgisi yoktur. Diğer üçü para/kâr taşır.
 */
export const UYARI_IZINLERI: Record<UyariAnahtari, Izin | null> = {
  nakitAcigi: "satis.kar.gor",
  maliyetsizStok: null,
  karHesaplanamayan: "satis.kar.gor",
  hakedisGecikti: "satis.kar.gor",
};

export type Uyari = {
  anahtar: UyariAnahtari;
  seviye: UyariSeviyesi;
  /** Kaç kayıt — 0 ise uyarı YOK sayılır. */
  sayi: number;
  /** Varsa para tutarı (nakit açığı, geciken hakediş). Yoksa null. */
  tutar: number | null;
  paraBirimi: "TRY" | "EUR" | null;
  adres: string;
  izin: Izin | null;
};
