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
 * Bir kutunun iki oranı.
 *
 * PAY, O KUTUNUN KENDİ KÂRIDIR — NET-1 kutusunda NET-1, NET-2 kutusunda
 * NET-2. Kullanıcı kararı 15.08.2026: _"net 1 kendi içinde, net 2 kendi
 * içinde değerlendirilmeli."_
 *
 * 14.08.2026'daki ilk mühür "pay ikisinde de NET-2" diyordu; aynı sayıyı
 * iki kutuda tekrarlamak bilgi taşımadığı için değişti. O kararın uyarısı
 * ise HÂLÂ GEÇERLİ: NET-1 stopaj öncesidir, bu yüzden NET-1'in oranı
 * NET-2'ninkinden HEP yüksek çıkar. İki oran birbirinin yerine geçmez;
 * aynı hesabın iki aşamasıdır.
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
