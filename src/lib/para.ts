/**
 * ============================================================================
 *  PARA ARİTMETİĞİ — KURUŞ ÇÖZÜNÜRLÜĞÜ
 * ----------------------------------------------------------------------------
 *  Veritabanı Decimal(18,4) tutar; kayıtlar tamdır. Sapma JavaScript'te
 *  doğar: `0.1 + 0.2 !== 0.3`. Tek başına zararsız görünen bu artık, bir
 *  KARŞILAŞTIRMAYA girdiğinde saçma sonuç üretir.
 *
 *  ── NEDEN VAR (16.08.2026 canlı bulgusu) ────────────────────────────────
 *  Murat Garanti 24.07.2026 ekstresi. Taksit payları toplanınca ham değer
 *  `7137.869999999999` çıkıyor; ekranda ₺7.137,87 görünüyor çünkü
 *  biçimlendirici yuvarlıyor. Kullanıcı ön-dolu gelen ₺7.137,87'yi
 *  kaydetmek isteyince form dedi ki:
 *
 *      "Girilen tutar kalan borcu AŞIYOR — kalan yalnızca ₺7.137,87."
 *
 *  Aynı sayı hem aşan hem aşılan. Altında "−₺0,00" yazıyordu. Sebep:
 *  ön-dolu değer YUVARLANMIŞTI ama karşılaştırma HAM sayıyla yapılıyordu.
 *
 *  ── KURAL ────────────────────────────────────────────────────────────────
 *  Kuruşun altında para YOKTUR. İki tutar karşılaştırılacaksa önce kuruşa
 *  indirilir. Yuvarlama hesabın İÇİNE serpiştirilmez (art arda yuvarlama
 *  hata biriktirir); yalnız KARŞILAŞTIRMA ve SUNUM sınırında uygulanır.
 * ============================================================================
 */

/**
 * Tutarı kuruşa yuvarlar. Sunum ve karşılaştırma sınırı için.
 *
 * EKSİ SIFIR NORMALLEŞTİRİLİR. `Math.round(-9e-11)` JavaScript'te `-0`
 * verir ve `-0 === 0` doğru olduğu için hesapta fark etmez — ama
 * biçimlendirici eksi işaretini KORUR ve ekranda "−₺0,00" yazar. Bu tam
 * olarak 16.08.2026'da görülen kusurdu. "Eksi sıfır" diye bir tutar yoktur.
 */
export function kurusaYuvarla(tutar: number): number {
  const yuvarlanmis = Math.round(tutar * 100) / 100;
  return yuvarlanmis === 0 ? 0 : yuvarlanmis;
}

/**
 * `a`, `b`'yi kuruş düzeyinde AŞIYOR mu.
 *
 * Ham `a > b` kullanılamaz: 1e-13'lük bir artık "aşıyor" saydırır ve
 * kullanıcıya olmayan bir hata gösterir.
 */
export function kurusAsiyorMu(a: number, b: number): boolean {
  return kurusaYuvarla(a) > kurusaYuvarla(b);
}

/**
 * Tutar kuruş düzeyinde sıfır ya da altında mı.
 *
 * Kapanmış bir ekstrede kalan `-9e-13` çıkabiliyor; ham `<= 0` bunu doğru
 * yakalar ama `> 0` ile yazılmış her kontrol `+9e-13`te YANILIR ve kapalı
 * ekstreyi "ödenmedi" gösterir.
 */
export function kurusSifirMi(tutar: number): boolean {
  return kurusaYuvarla(tutar) <= 0;
}
