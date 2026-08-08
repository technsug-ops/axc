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

/** <input type="date"> için: 2026-08-08 */
export function tarihGirdisi(tarih: Date): string {
  const yil = tarih.getFullYear();
  const ay = String(tarih.getMonth() + 1).padStart(2, "0");
  const gun = String(tarih.getDate()).padStart(2, "0");
  return `${yil}-${ay}-${gun}`;
}

/**
 * 1.234,56 ₺ / 1.234,56 €
 *
 * Prisma Decimal nesnesi, sayı veya metin kabul eder.
 * ASLA para birimi çevirmez — ne verilirse o birimde biçimlendirir.
 */
export function paraFormatla(
  tutar: { toString(): string } | number | string | null | undefined,
  paraBirimi: string,
): string {
  if (tutar === null || tutar === undefined) return "—";
  const sayi = Number(tutar.toString());
  if (!Number.isFinite(sayi)) return "—";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: paraBirimi,
    minimumFractionDigits: 2,
  }).format(sayi);
}
