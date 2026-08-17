/**
 * ============================================================================
 *  YEDEK YAŞI — SAF KURAL
 * ----------------------------------------------------------------------------
 *  ⚠ NEDEN VAR (mimar kararı 17.08.2026)
 *
 *  Canlıda son yedek 13.08 tarihliydi ve bu DÖRT GÜN BOYUNCA KİMSE FARK
 *  ETMEDİ. Otomatik yedek kurulmuştu, çalıştığını sanıyorduk; durduğunu
 *  söyleyen hiçbir işaret yoktu. Sessiz yedeksizlik, para riskinin ta
 *  kendisidir — veritabanı gittiğinde fark edilir, ki o zaman geçtir.
 *
 *  Çan bunu görür. Aynı boşluk `cevapsizTalep`te de yaşanmıştı: ekran vardı
 *  ama oraya BAKMAK İÇİN BİR SEBEP yoktu.
 *
 *  ── EŞİK 2 GÜN, "DÜN" DEĞİL ─────────────────────────────────────────────
 *  Gece işi bir kez atlarsa alarm çalmaz; iki gün üst üste atlarsa artık
 *  tesadüf değildir. Her gecikmede öten bir uyarı, bir süre sonra okunmaz —
 *  okunmayan uyarı, olmayan uyarıdır.
 *
 *  ── "HİÇ YOK" AYRI UYARIDIR ─────────────────────────────────────────────
 *  Yedek hiç yoksa gün farkı hesaplanamaz. Uydurma bir sayı ("9999 gün")
 *  üretmek yerine ayrı bir anahtar kullanılıyor: rakamı uydurmaktansa
 *  durumu adıyla söylemek doğru. Aynı anahtar, yedek durumu OKUNAMADIĞINDA
 *  da yanar — "bilinmiyor" ile "yok" arasında kullanıcı için fark yoktur,
 *  ikisinde de elde doğrulanmış yedek YOKTUR.
 * ============================================================================
 */

/** Gece yedeği kaç gün atlarsa kırmızı yanar. */
export const YEDEK_ESIK_GUN = 2;

export type YedekOlcumu = {
  yedekEski: { sayi: number };
  yedekYok: { sayi: number };
};

/**
 * @param sonYedek Son BAŞARILI yedeğin zamanı; yoksa ya da okunamadıysa null.
 * @param bugun    İş takvimi günü (Europe/Istanbul) — çağıran normalize eder.
 * @returns `yedekEski.sayi` GÜN SAYISIDIR (kayıt sayısı değil); metin onu
 *          "N gün önce" olarak yazar.
 */
export function yedekOlcumu(
  sonYedek: Date | null,
  bugun: Date,
  esikGun: number = YEDEK_ESIK_GUN,
): YedekOlcumu {
  if (sonYedek === null) {
    return { yedekEski: { sayi: 0 }, yedekYok: { sayi: 1 } };
  }

  const gunFarki = Math.floor(
    (bugun.getTime() - sonYedek.getTime()) / (24 * 60 * 60 * 1000),
  );

  /**
   * İleri tarihli yedek (saat kayması) uyarı DEĞİLDİR: negatif fark
   * "0 gün önce" sayılır. Alarmın kendisi hatalı veri üretmemeli.
   */
  if (gunFarki <= esikGun) {
    return { yedekEski: { sayi: 0 }, yedekYok: { sayi: 0 } };
  }

  return { yedekEski: { sayi: gunFarki }, yedekYok: { sayi: 0 } };
}
