/** Veritabanı enum değerlerinin Türkçe karşılıkları (arayüzde gösterilir). */

export const ALIM_DURUMU: Record<string, string> = {
  DRAFT: "Taslak",
  ORDERED: "Sipariş verildi",
  RECEIVED: "Teslim alındı",
  CANCELLED: "İptal",
};

/** Alım listesi filtresi için sıralı liste. */
export const ALIM_DURUMLARI = [
  "DRAFT",
  "ORDERED",
  "RECEIVED",
  "CANCELLED",
] as const;

export function alimDurumuEtiketi(durum: string): string {
  return ALIM_DURUMU[durum] ?? durum;
}

export const STOK_HAREKETI: Record<string, string> = {
  INITIAL: "Açılış stoğu",
  PURCHASE_IN: "Alım girişi",
  ADJUSTMENT: "Düzeltme",
  COUNT_CORRECTION: "Sayım farkı",
};

export function stokHareketiEtiketi(tip: string): string {
  return STOK_HAREKETI[tip] ?? tip;
}
