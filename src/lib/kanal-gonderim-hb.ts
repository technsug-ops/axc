/**
 * ============================================================================
 *  K194-HB — HEPSİBURADA GÖNDERİMİNİN HÜKMÜ (SAF)
 * ----------------------------------------------------------------------------
 *  HB stok ve fiyatı AYRI yüklemelerle işliyor; her parçanın sonucu burada
 *  tek bir hükme çevrilir. Ağa gitmez — bekçi değerle sınar.
 *
 *  ⛔ STOKTA «KABUL» BAŞARI DEĞİLDİR (ölçüldü 01.10.2026, SIT): var olmayan bir
 *  SKU'ya stok gönderilince durum «Ready», hata YOK. Stok yalnız ilan GERİ
 *  OKUNUP gönderilen rakam görülünce «doğrulandı» sayılır; görülmezse
 *  «kanalda henüz görünmüyor» denir — «başarılı» denmez.
 *  Fiyatta HB hatayı durumda bildiriyor (`ListingNotFound`, `OutOfPriceRange`,
 *  kilitler) — orada hüküm durumdan okunur.
 * ============================================================================
 */

export type ParcaHukmu = "DOGRULANDI" | "KANALDA_GORUNMUYOR" | "ISLENIYOR" | "RED";

type Durum = { durum: string; hatalar: string[]; kilitler: unknown[] } | null;

/**
 * Bir parçanın hükmü — HB'nin satır hatası/kilidi varsa RED; yoksa YALNIZ
 * ilanda görülen rakam gönderilene eşitse DOĞRULANDI.
 * ⛔ «Done» tek başına başarı DEĞİL (ölçüldü: Done dendiği anda ilan eski
 * fiyattaydı). Rakam görünmüyorsa: durum hâlâ işleniyorsa İŞLENİYOR, değilse
 * KANALDA_GORUNMUYOR — ikisi de «tamam» demez.
 */
export function parcaHukmu(durum: Durum, gonderilen: number, kanaldaki: number | null): ParcaHukmu {
  if (durum && (durum.hatalar.length > 0 || durum.kilitler.length > 0)) return "RED";
  if (kanaldaki !== null && Math.round(kanaldaki * 100) === Math.round(gonderilen * 100)) return "DOGRULANDI";
  if (durum === null) return "ISLENIYOR";
  /**
   * ⚠ «Ready» BİTİŞ DEĞİL, KUYRUK (ölçüldü 01.10.2026): ilk okumada «Ready» dönen
   * yükleme ~10 sn sonra «Done» oldu. Yalnız «Done» bitti demektir; rakam o
   * hâlde bile görünmüyorsa «kanalda görünmüyor» yazılır.
   */
  return durum.durum === "Done" ? "KANALDA_GORUNMUYOR" : "ISLENIYOR";
}

/**
 * HB hata kodları → sözlük anahtarı (ekranda Türkçe). Tanınmayan kod HAM
 * hâliyle gösterilir — gizlenmez, uydurma bir çeviri de yapılmaz.
 */
export const HB_HATA_ANAHTARLARI: Record<string, string> = {
  ListingNotFound: "hbHata_ListingNotFound",
  ProductNotFound: "hbHata_ProductNotFound",
  InvalidPrice: "hbHata_InvalidPrice",
  InvalidAvailableStock: "hbHata_InvalidAvailableStock",
  OutOfPriceRange: "hbHata_OutOfPriceRange",
  DiscountedListingPriceIncrease: "hbHata_DiscountedListingPriceIncrease",
  ListingFrozen: "hbHata_ListingFrozen",
  MinLock: "hbHata_MinLock",
  MaxLock: "hbHata_MaxLock",
};
