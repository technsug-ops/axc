import type { VitrinKutusu } from "./vitrin-verisi";

/**
 * ============================================================================
 *  "RAFTA VAR, VİTRİNDE YOK" — ŞERHİN SAF HÜKMÜ (K244, 23.09.2026)
 * ----------------------------------------------------------------------------
 *  Döküm `/kanal-listeleme`ye taşındı; panelde tek satırlık bir şerh kaldı
 *  (İlke #13). Bu gövde o şerhin RAKAMINI üretir — ekran yalnız çizer.
 *
 *  ⛔ ÖLÇÜT TEK GÖVDEDE, İKİ OKUYUCU: hem paneldeki şerh hem
 *  `/kanal-listeleme`deki kutu "bu kanalda bakılacak bir şey var mı" sorusunu
 *  AYNI ölçütle sorar. İki yerde iki ölçüt olsaydı biri düzeltilip öteki
 *  unutulurdu — bu deponun en sık tekrarlayan hatası.
 * ============================================================================
 */

/**
 * Damganın bayatlama eşiği. Gece koşumu günlük; 48 saat = iki koşum kaçtı.
 *
 * ⚠ SABİT BURADA YAŞAR, KUTUDA DEĞİL: eskiden `vitrin-kutusu.tsx` içinde
 * yerel bir `const`tu ve şerh onu göremezdi. İki dosya iki eşik tutsaydı
 * panel "taze" derken kutu "bayat" diyebilirdi.
 */
export const BAYAT_SAAT = 48;

/**
 * Bu kanalda ÖLÇÜMÜN KENDİSİYLE ilgili bir sorun var mı.
 *
 * ⛔ ÜÇÜ AYRI SEBEP, TEK SONUÇ: koşum düştü · damga bayat · hiç iz yok.
 * Üçü de aynı şeyi söyler — **ekrandaki rakama bugün güvenilmez**.
 * Başarısızlık bayatlıktan ÖNCE gelir (kullanıcı şartı 01.09.2026): koşum
 * düştüyse sorun geçen zaman değil, koşumun kendisidir.
 */
export function kanalSorunluMu(k: {
  yasSaat: number | null;
  sonKosumBasarisiz: boolean;
  kosumIziYok: boolean;
}): boolean {
  const bayat = k.yasSaat !== null && k.yasSaat > BAYAT_SAAT;
  return k.sonKosumBasarisiz || bayat || k.kosumIziYok;
}

export type VitrinSerhi = {
  /** Kanalların TOPLAM satılamaz ürün adedi. */
  adet: number;
  /** Aynı kümenin parası (ödenen tutar, KDV dahil). */
  tutar: number;
  /** Ölçümü şüpheli olan kanal var mı. */
  dikkatGerek: boolean;
  /** Kaç kanalın ölçümü şüpheli — "1 kanal" ile "3 kanal" aynı iş değildir. */
  dikkatKanalSayisi: number;
};

/**
 * Kanal kutularını TEK bir hükme indirir.
 *
 * ⛔ `kaydiYok` VE `olculmemis` TOPLAMA GİRMEZ — kutudaki kuralla aynı.
 * İkisi de bir KUSUR değil BOŞLUK: defter o ürünlerin kanalda olup
 * olmadığını bilmiyor. Toplasaydık panel olmayan bir zararı rapor ederdi.
 */
export function vitrinSerhi(veri: VitrinKutusu[]): VitrinSerhi {
  let adet = 0;
  let tutar = 0;
  let dikkatKanalSayisi = 0;
  for (const k of veri) {
    adet += k.toplamAdet;
    tutar += k.toplamTutar;
    if (kanalSorunluMu(k)) dikkatKanalSayisi += 1;
  }
  return {
    adet,
    tutar,
    dikkatGerek: dikkatKanalSayisi > 0,
    dikkatKanalSayisi,
  };
}
