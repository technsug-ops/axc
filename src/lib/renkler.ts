/**
 * ============================================================================
 *  SELLİORA RENK SİSTEMİ — DURUM BAZLI, SAYFA BAZLI DEĞİL
 * ----------------------------------------------------------------------------
 *  Mimar kararı 15.08.2026. Renk ANLAM taşır, süs değildir. En önemli kural:
 *  AYNI RENK HER SAYFADA AYNI ŞEYİ SÖYLER. Yeşil satışta "kâr", stokta
 *  "taze", kart borcunda "ödendi" demektir — hepsi aynı ailedendir: "iyi
 *  durumda". Sayfa başına renk seçilseydi kullanıcı her ekranda yeniden
 *  öğrenmek zorunda kalırdı.
 *
 *  ── ÜÇ KATMAN ────────────────────────────────────────────────────────────
 *  Her renkli kart/satır üç katman taşır:
 *    1. SOL ŞERİT (3px)  — net sinyal, göz önce onu yakalar
 *    2. AÇIK PASTEL ZEMİN — bölgeyi belli eder, yormaz
 *    3. KOYU RAKAM        — kontrast rakamda olur, zeminde değil
 *  Şerit kartın İÇİNDE durur; köşe yarıçapı taşmasın diye `overflow-hidden`
 *  yerine şeridi kenarlık olarak veriyoruz (border-l).
 *
 *  ── BEŞ ANLAM ────────────────────────────────────────────────────────────
 *  olumlu  → kâr · temiz · tamamlandı · nakit fazlası · yüksek marj ·
 *            teslim alındı · kapandı · ödendi
 *  olumsuz → zarar · gecikmiş · nakit açığı · hata · düşük marj · 60+ gün
 *  uyari   → bekleyen görev · mal kabul bekleyen · vadesi bilinmeyen ·
 *            onay bekliyor · iade · 31-60 gün · ayrıldı · itiraz · yaklaşan
 *  bilgi   → öngörü · tahmin · nakit girişi · mal geldi · nötr vurgu
 *  notr    → ciro · adet · tarih · sıfır · durum bildirmeyen her şey
 *
 *  ── DÖRT KISIT ───────────────────────────────────────────────────────────
 *  1. RENK TEK BAŞINA KONUŞMAZ. Her renkli öğede işaret (✓ − • →) VE
 *     mümkünse kelime bulunur. Renk körlüğü (erkeklerin ~%8'i) ve
 *     siyah-beyaz çıktı bilgiyi yok etmemeli.
 *  2. Zemin AÇIK pastel, rakam KOYU. Asla pastel üstüne pastel, asla doygun
 *     koca blok.
 *  3. NÖTR TABAN ~%70. Renk yalnız durum bildiren noktada; her şey renkliyse
 *     hiçbir şey vurgulu değildir.
 *  4. SIFIR NÖTRDÜR. "Sıfır kâr" ne müjde ne alarm.
 *
 *  ── TEK KAYNAK ───────────────────────────────────────────────────────────
 *  Ekranlar ham renk kodu YAZMAZ; hepsi buradan geçer. Yoksa biri yarın
 *  "başka bir yeşil" yazar ve sistem sessizce ayrışır. `panel:dogrula` bu
 *  kapıyı sınıyor.
 * ============================================================================
 */

export type DurumRengi = "olumlu" | "olumsuz" | "uyari" | "bilgi" | "notr";

export const DURUM_RENKLERI = [
  "olumlu",
  "olumsuz",
  "uyari",
  "bilgi",
  "notr",
] as const;

/** Anlam taşıyan dört ton — nötr hariç. Testler bunları dolaşır. */
export const ANLAMLI_RENKLER = [
  "olumlu",
  "olumsuz",
  "uyari",
  "bilgi",
] as const;

/**
 * Sol şerit — 3px kenarlık. Kartın içinde durur, köşeyi taşırmaz.
 * Karanlık temada da aynı ton: şerit zaten doygun, iki temada da okunur.
 */
export const DURUM_SERIDI: Record<DurumRengi, string> = {
  olumlu: "border-l-[3px] border-l-[#1D9E75]",
  olumsuz: "border-l-[3px] border-l-[#E24B4A]",
  uyari: "border-l-[3px] border-l-[#EF9F27]",
  bilgi: "border-l-[3px] border-l-[#378ADD]",
  notr: "border-l-[3px] border-l-[#B4B2A9]",
};

/**
 * Pastel zemin + koyu yazı + kendi tonunda ince kenarlık.
 *
 * TONLAR BİR TIK KOYULAŞTIRILDI (15.08.2026). İlk set kâğıt üstünde doğruydu
 * ama ekranda kayboluyordu — kullanıcı "inanılmaz zayıf bir renk uygulaması"
 * dedi. Sebebi ölçüldü: zeminler beyazdan yalnız birkaç birim ayrılıyordu,
 * yani rozet "renkli bir şey" olarak DEĞİL, biraz kirli beyaz olarak
 * görünüyordu.
 *
 * Kenarlık eklendi çünkü tek başına zemin, bir tablo hücresinin içinde
 * sınırını belli edemiyor; rozeti nesne yapan şey kenarıdır. Kısıt #2
 * korunuyor: zemin hâlâ pastel, kontrast hâlâ RAKAMDA — doygunluk zemine
 * değil, kenarlığa ve yazıya verildi.
 */
export const DURUM_ZEMINI: Record<DurumRengi, string> = {
  olumlu:
    "bg-[#CFEFE1] text-[#0B5C47] ring-1 ring-inset ring-[#1D9E75]/35 dark:bg-[#0F6E56]/35 dark:text-[#A9EBD4] dark:ring-[#1D9E75]/45",
  olumsuz:
    "bg-[#FBDADA] text-[#8F2424] ring-1 ring-inset ring-[#E24B4A]/35 dark:bg-[#A32D2D]/35 dark:text-[#F6C2C2] dark:ring-[#E24B4A]/45",
  uyari:
    "bg-[#F9E3BC] text-[#6F4108] ring-1 ring-inset ring-[#EF9F27]/40 dark:bg-[#854F0B]/40 dark:text-[#F3D5A2] dark:ring-[#EF9F27]/45",
  bilgi:
    "bg-[#D9E8F9] text-[#134F8B] ring-1 ring-inset ring-[#378ADD]/35 dark:bg-[#185FA5]/35 dark:text-[#B3D2F1] dark:ring-[#378ADD]/45",
  notr: "bg-[#EDEBE4] text-foreground ring-1 ring-inset ring-border dark:bg-muted dark:text-muted-foreground",
};

/** Yalnız RAKAM rengi — zemin nötr kalsın istenen büyük tutarlar için. */
export const DURUM_YAZISI: Record<DurumRengi, string> = {
  olumlu: "text-[#0F6E56] dark:text-[#6FD8B4]",
  olumsuz: "text-[#A32D2D] dark:text-[#EF9A9A]",
  uyari: "text-[#854F0B] dark:text-[#E5BE7C]",
  bilgi: "text-[#185FA5] dark:text-[#8DBBE8]",
  notr: "",
};

/**
 * RENGİN YANINDAKİ İŞARET — kısıt #1.
 *
 * Metin olarak duruyor çünkü ikon kütüphanesine bağlanmak bu dosyayı sunum
 * katmanına iliştirirdi; bu karakterler her yerde ve her yazı tipinde
 * çalışır, ekran okuyucu da okur.
 */
export const DURUM_ISARETI: Record<DurumRengi, string> = {
  olumlu: "✓",
  olumsuz: "−",
  uyari: "•",
  bilgi: "→",
  notr: "",
};

/**
 * Bir para tutarının durumu. SIFIR NÖTRDÜR (kısıt #4): "sıfır kâr" ne iyi
 * ne kötüdür; yeşile boyamak yanlış bir müjde, kırmızıya boyamak yersiz bir
 * alarm olurdu.
 */
export function tutarDurumu(tutar: number): DurumRengi {
  if (tutar > 0) return "olumlu";
  if (tutar < 0) return "olumsuz";
  return "notr";
}

/**
 * Kâr/zarar tutarı — bilinmiyorsa NÖTR. `null` "sıfır kâr" değildir;
 * hesaplanamamış demektir ve yeşil/kırmızı ikisi de yalan olurdu.
 */
export function karDurumu(tutar: number | null): DurumRengi {
  if (tutar === null) return "notr";
  return tutarDurumu(tutar);
}
