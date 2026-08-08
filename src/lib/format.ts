/** Görüntüleme yardımcıları. Tüm biçimler Türkçe (tr-TR). */

const tarihBicimi = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** 08.08.2026 */
export function tarihFormatla(tarih: Date): string {
  return tarihBicimi.format(tarih);
}
