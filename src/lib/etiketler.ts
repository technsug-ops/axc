import type {
  PurchaseStatus,
  StockMovementType,
} from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  VERİTABANI ENUM DEĞERLERİNİN TÜRKÇE KARŞILIKLARI
 * ----------------------------------------------------------------------------
 *  Record<PurchaseStatus, string> tipi BİLEREK dar tutuldu: şemaya yeni bir
 *  durum eklenip buraya Türkçesi yazılmazsa proje DERLENMEZ.
 *
 *  Neden: Bu sözlük önce Record<string, string> idi ve etiket bulunamayınca
 *  ham enum değerini geri veriyordu. Şemaya PARTIALLY_RECEIVED eklendiğinde
 *  karşılığı unutuldu; arayüzde kullanıcıya "PARTIALLY_RECEIVED" göründü ve
 *  hiçbir yerde hata çıkmadı. Sessiz sızıntı bir daha olmasın diye tip
 *  daraltıldı ve yedek dönüş kaldırıldı.
 * ============================================================================
 */

export const ALIM_DURUMU: Record<PurchaseStatus, string> = {
  DRAFT: "Taslak",
  ORDERED: "Sipariş verildi",
  PARTIALLY_RECEIVED: "Kısmen teslim alındı",
  RECEIVED: "Teslim alındı",
  CANCELLED: "İptal",
};

/**
 * Alım listesi durum filtresi.
 * Sözlükten TÜRETİLİYOR — ikisi birbirinden ayrışamaz; yeni bir durum
 * eklendiğinde filtrede de kendiliğinden çıkar.
 */
export const ALIM_DURUMLARI = Object.keys(ALIM_DURUMU) as PurchaseStatus[];

export function alimDurumuEtiketi(durum: PurchaseStatus): string {
  return ALIM_DURUMU[durum];
}

export const STOK_HAREKETI: Record<StockMovementType, string> = {
  INITIAL: "Açılış stoğu",
  PURCHASE_IN: "Alım girişi",
  ADJUSTMENT: "Düzeltme",
  COUNT_CORRECTION: "Sayım farkı",
};

export function stokHareketiEtiketi(tip: StockMovementType): string {
  return STOK_HAREKETI[tip];
}
