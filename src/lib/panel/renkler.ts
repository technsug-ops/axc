/**
 * ============================================================================
 *  DURUM RENKLERİ — RENK ANLAM TAŞIR, SÜS DEĞİLDİR
 * ----------------------------------------------------------------------------
 *  Mimar kararı 15.08.2026. Dört anlamsal renk, hepsi PASTEL zemin + KOYU
 *  yazı. Kartın tamamı boyanmaz; yalnız RAKAM ve küçük ROZET renklenir,
 *  zemin nötr kalır.
 *
 *  60-30-10: ekranın %60'ı nötr, %30'u tek sakin ton, %10'u vurgu.
 *
 *  ── ÜÇ KISIT ─────────────────────────────────────────────────────────────
 *  1. RENK TEK BAŞINA ANLAM TAŞIMAZ. Kırmızı rakamın yanında "−", yeşilin
 *     yanında "✓" ya da bir ok durur. Renk körlüğünde (erkeklerin ~%8'i) ve
 *     siyah-beyaz çıktıda kırmızı ile yeşil ayırt edilemez; renk yalnız
 *     GÜÇLENDİRİR, tek başına SÖYLEMEZ. Bu yüzden `DurumIsareti` var ve
 *     `panel:dogrula` işaretin varlığını kilitliyor.
 *  2. PASTEL ZEMİN + KOYU YAZI. Asla pastel üstüne pastel, asla doygun renk
 *     koca blok. Kontrast RAKAMDA olur, zeminde değil — soluk rakam değil,
 *     sakin zemin üstünde NET rakam.
 *  3. NÖTR TABAN KORUNUR. İçeriğin çoğu gri-beyaz kalır; renk yalnız durum
 *     bildiren noktada çıkar. Her şey renkliyse hiçbir şey vurgulu değildir.
 *
 *  ── İSTİSNA VURGU ────────────────────────────────────────────────────────
 *  Kritik eşik aşılırsa (ör. net pozisyon büyük eksi) O TEK RAKAM doygun
 *  tona çıkabilir. Genel kural pastel kalır; istisna istisna olduğu için
 *  işe yarar.
 *
 *  KARANLIK TEMA: aynı ton ailesi korunur — zemin koyu rengin düşük
 *  opaklığı, yazı açık ton. Renk kimliği iki temada da aynı şeyi söyler.
 * ============================================================================
 */

export type DurumRengi =
  /** Kâr · temiz · yüksek marj. */
  | "olumlu"
  /** Zarar · gecikmiş · düşük marj. AZ KULLAN — gücünü korusun. */
  | "olumsuz"
  /** Bekleyen · vadesi bilinmeyen · uyarı. */
  | "uyari"
  /** Nakit takvimi · tahmin · öngörü. */
  | "bilgi"
  | "notr";

/** Pastel zemin + koyu yazı — rozet ve küçük kutucuklar için. */
export const DURUM_ZEMINI: Record<DurumRengi, string> = {
  olumlu:
    "bg-[#E1F5EE] text-[#085041] dark:bg-[#085041]/30 dark:text-[#9FE6CE]",
  olumsuz:
    "bg-[#FCEBEB] text-[#791F1F] dark:bg-[#791F1F]/30 dark:text-[#F3B6B6]",
  uyari: "bg-[#FAEEDA] text-[#633806] dark:bg-[#633806]/35 dark:text-[#F0CE96]",
  bilgi: "bg-[#EAF2FB] text-[#0C447C] dark:bg-[#0C447C]/30 dark:text-[#A8CBEF]",
  notr: "bg-muted text-muted-foreground",
};

/** Yalnız YAZI rengi — zemin nötr kalsın istenen rakamlar için. */
export const DURUM_YAZISI: Record<DurumRengi, string> = {
  olumlu: "text-[#085041] dark:text-[#6FD8B4]",
  olumsuz: "text-[#791F1F] dark:text-[#EF9A9A]",
  uyari: "text-[#633806] dark:text-[#E5BE7C]",
  bilgi: "text-[#0C447C] dark:text-[#8DBBE8]",
  notr: "",
};

/**
 * RENGİN YANINDAKİ İŞARET — kısıt #1'in karşılığı.
 *
 * Metin olarak döner çünkü bir ikon kütüphanesi çağırmak bu dosyayı sunum
 * katmanına bağlardı; buradaki karakterler her yerde çalışır ve ekran
 * okuyucu da okur.
 */
export const DURUM_ISARETI: Record<DurumRengi, string> = {
  olumlu: "✓",
  olumsuz: "−",
  uyari: "•",
  bilgi: "→",
  notr: "",
};

/**
 * Bir para tutarının durumu. Sıfır NÖTRDÜR: "sıfır kâr" ne iyi ne kötü,
 * yeşile boyamak yanlış bir müjde olurdu.
 */
export function tutarDurumu(tutar: number): DurumRengi {
  if (tutar > 0) return "olumlu";
  if (tutar < 0) return "olumsuz";
  return "notr";
}
