/**
 * ============================================================================
 *  GRAFİK DİKEY EKSENİ — taban ve tavan (K335 ②, 14.10.2026)
 * ----------------------------------------------------------------------------
 *  Vaka: yeni açılan boş firmada «Günlük operasyon» ekseni «1 · 1 · 1 · 0 · 0»
 *  yazıyordu. Veri hep 0 iken tavan 1'e çekiliyor, eksen 4 aralığa bölünüyor
 *  (0 · 0,25 · 0,5 · 0,75 · 1) ve ADET biçimi bunları tam sayıya yuvarlıyordu.
 *  Etiket, çizginin durduğu değeri söylemiyordu (anayasa: «metin, sahip
 *  olmadığı anlamı iddia etmez»).
 *
 *  Çare: veri TAM SAYIYSA (adet) adım da tam sayı seçilir — tavan, tabandan
 *  aralık sayısının katı kadar yukarıda durur; her çizginin etiketi kendi
 *  değeridir. Tam sayı olmayan veride (para) davranış AYNEN kalır.
 * ============================================================================
 */
export function eksenSinirlari(degerler: number[], aralik: number): { taban: number; tavan: number } {
  const tavanHam = Math.max(...degerler, 0);
  /* Taban sıfırın altına inebilir (ciro görünümünde FARK negatif olabilir). */
  const taban = Math.min(...degerler, 0);
  if (degerler.every((d) => Number.isInteger(d))) {
    return { taban, tavan: taban + aralik * Math.max(1, Math.ceil((tavanHam - taban) / aralik)) };
  }
  /* Tavan = taban olamaz: bölme sıfıra düşer ve bütün noktalar NaN olur. */
  return { taban, tavan: tavanHam === taban ? taban + 1 : tavanHam };
}
