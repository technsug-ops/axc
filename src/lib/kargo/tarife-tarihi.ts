/**
 * KARGO TARİFESİNİN TARİHİ — hangi gün geçerli olan fiyat listesi uygulanır.
 *
 * Kullanıcı kararı 07.10.2026: **kargoya veriliş tarihi** (gönderinin çıkış
 * yaptığı gün); henüz kargoya verilmemiş siparişte sipariş tarihi. Gerekçe:
 * Trendyol tarifesi «5 Ekim 2026 itibarıyla geçerli» ve fiyat gönderi kargoya
 * çıktığında doğar (PDF notu: «faturalandırma gönderinin çıkış yaptığı kargo
 * firmasının fiyat listesine göre»). Önceki kural `soldAt` idi (K201-4) —
 * tarihçe ilkesi aynen geçerli (bugünün değil, OLAYIN gününün tarifesi);
 * değişen yalnız olayın hangi an sayıldığı.
 *
 * ⚠ İade kargosu bunu KULLANMAZ — o ayrı bir gönderidir, kendi gününü taşır.
 */
export function kargoTarifeTarihi(satis: { soldAt: Date; shippedAt: Date | null }): Date {
  return satis.shippedAt ?? satis.soldAt;
}
