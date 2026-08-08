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
