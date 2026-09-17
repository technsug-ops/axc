/**
 * ============================================================================
 *  KARGO TARİFESİ PDF — SAF DEĞER AYRIŞTIRMA (K202)
 * ----------------------------------------------------------------------------
 *  Bu dosya PDF'e HİÇ dokunmaz — yalnız metin parçalarını sayıya çevirir.
 *  Saf katman: girdi → çıktı, yan etki yok. Bekçi bu gövdeleri DOĞRUDAN
 *  ÇAĞIRIR; kaynak taraması gerekmiyor.
 *  _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz".)_
 * ============================================================================
 */

/** "₺30.897,42" → 30897.42. Türkçe biçim: nokta binlik ayıracı, virgül ondalık. */
export function tutarCoz(ham: string): number | null {
  const temiz = ham.trim().replace(/^₺\s*/, "");
  if (temiz === "") return null;
  const sayi = Number(temiz.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(sayi) ? sayi : null;
}

/**
 * Bir metin parçasındaki BÜTÜN "₺..." belirteçlerini ayırır — PDF'te bitişik
 * iki hücrenin TEK metin akışına birleştiği durum için (K202 canlı ölçümü,
 * 17.09.2026): 4501 satırın 1643'ünde yüksek desi tutarları o kadar geniş
 * ki komşu sütuna dokunuyor ve pdfjs ikisini TEK "item" olarak veriyor.
 * Ölçüldü: birleşme HER ZAMAN tam iki değer arasında oluyor, üç ve üzeri
 * hiç görülmedi — yine de fonksiyon N değere genelleşir (belirli bir çift
 * sayıya kilitlenmez).
 */
export function tutarBelirteclerineAyir(ham: string): string[] {
  return ham
    .split(/(?=₺)/)
    .map((s) => s.trim())
    .filter((s) => s !== "");
}
