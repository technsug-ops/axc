import { toplamlariBirlestir, type ParaToplami } from "@/lib/tutar";

/**
 * ============================================================================
 *  SÜZGEÇ TOPLAMI — TEK KURAL, BÜTÜN LİSTELER
 * ----------------------------------------------------------------------------
 *  Kullanıcı Kolaylığı #15 (17.08.2026): tek tek gösterilen yerde toplam da
 *  olur ve toplam SÜZGEÇLE BİRLİKTE değişir.
 *
 *  ⚠ NEDEN SAF KATMANDA: kural alım, satış, gider, iade — tutar taşıyan bütün
 *  listelere işliyor. Ayrımı (iptal toplama girer mi) her ekran kendi içinde
 *  yazsaydı, dört ekranda dört farklı cevap oluşurdu ve biri düzeltilirken
 *  ötekiler unutulurdu. Kural burada tek yerde duruyor ve sınanabiliyor.
 *
 *  ── İPTAL EDİLEN TOPLAMA GİRMEZ ─────────────────────────────────────────
 *  İptal edilmiş bir alım gerçekleşmiş bir alış değildir; KDV matrahına
 *  yazılamaz. Ama sessizce düşülmez: ayrı bir toplam olarak GERİ DÖNER ve
 *  ekranda gösterilir. Kullanıcı listede 4 satır görüp 3 satırlık toplam
 *  okuyorsa, farkı kendi bulmak zorunda kalmamalı.
 * ============================================================================
 */

export type SuzgecToplamSonucu = {
  /** Toplama GİREN kayıtların para birimi bazlı toplamı. */
  toplam: ParaToplami[];
  /** Toplama girmeyen (iptal) kayıtların toplamı — ekranda ayrıca yazılır. */
  haric: ParaToplami[];
  /** Toplama giren kayıt sayısı. */
  sayi: number;
  /** Hariç tutulan kayıt sayısı. */
  haricSayi: number;
};

/**
 * @param kayitlar  Ekranda GÖSTERİLEN kayıtlar — süzgeç zaten uygulanmış olmalı.
 * @param tutarlari Bir kaydın para birimi bazlı tutarını verir.
 * @param haricMi   Kayıt toplama girmiyor mu (iptal edilmiş mi).
 */
export function suzgecToplami<T>(
  kayitlar: readonly T[],
  tutarlari: (kayit: T) => ParaToplami[],
  haricMi: (kayit: T) => boolean,
): SuzgecToplamSonucu {
  const girenler: ParaToplami[][] = [];
  const harictekiler: ParaToplami[][] = [];

  for (const kayit of kayitlar) {
    (haricMi(kayit) ? harictekiler : girenler).push(tutarlari(kayit));
  }

  return {
    toplam: toplamlariBirlestir(girenler),
    haric: toplamlariBirlestir(harictekiler),
    sayi: girenler.length,
    haricSayi: harictekiler.length,
  };
}
