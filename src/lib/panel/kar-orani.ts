/**
 * ============================================================================
 *  KÂR ORANLARI — İKİ ORAN, İKİ AYRI SORU
 * ----------------------------------------------------------------------------
 *  Tanımlar BEKLEYENLER.md'de mühürlü (14.08.2026):
 *
 *    Kâr / Maliyet       payda: ürün maliyeti, KDV HARİÇ
 *    Kâr / Satış fiyatı  payda: brüt ciro, KDV DAHİL
 *
 *  NEDEN MALİYET KDV HARİÇ: KDV eklemek paydayı yapay şişirir, oran
 *  olduğundan düşük görünür. ⚠ Bu KENDİLİĞİNDEN GELMİYOR — FIFO maliyeti
 *  KDV DÂHİL saklanıyor (`lib/kar.ts` başlığı: "TUTARLAR KDV DAHİLDİR —
 *  satış, maliyet, komisyon…"). Ayrıştırma çağıran tarafta `kdvHaric` ile
 *  yapılır; atlanırsa oran sessizce düşük çıkar ve kimse fark etmez.
 *
 *  NEDEN CİRO BRÜT: rakip araçlar müşteri ödemesi üzerinden hesaplıyor;
 *  karşılaştırılabilir olsun diye. Tanım ekranda yazılı olduğu için
 *  savunulabilir.
 *
 *  SIFIRA BÖLME SESSİZ GEÇMEZ: payda yoksa oran `null` döner ve ekran
 *  "—" gösterir. %0 yazmak "kâr yok" demek olurdu; oysa doğru cevap
 *  "hesaplanamıyor"dur — ikisi farklı şeydir.
 * ============================================================================
 */

/** Yüzde olarak oran; payda sıfır ya da eksiyse hesaplanamaz. */
export function karOrani(kar: number, payda: number): number | null {
  if (!Number.isFinite(kar) || !Number.isFinite(payda)) return null;
  if (payda <= 0) return null;
  return (kar / payda) * 100;
}

/**
 * Bir kutunun iki oranı. `kar` o kutunun KENDİ rakamıdır (NET-1 kutusunda
 * NET-1, NET-2 kutusunda NET-2) — kullanıcı isteği 15.08.2026.
 */
export function kutuOranlari(girdi: {
  kar: number;
  /** Ürün maliyeti, KDV HARİÇ (çağıran `kdvHaric` ile ayrıştırır). */
  maliyetKdvHaric: number;
  /** Brüt ciro, KDV DAHİL — iade düşülmemiş hâli. */
  brutCiro: number;
}): { maliyete: number | null; satisa: number | null } {
  return {
    maliyete: karOrani(girdi.kar, girdi.maliyetKdvHaric),
    satisa: karOrani(girdi.kar, girdi.brutCiro),
  };
}
