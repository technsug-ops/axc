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
export const ANLAMLI_RENKLER = ["olumlu", "olumsuz", "uyari", "bilgi"] as const;

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

/**
 * DURUM KUTUSU — form içi uyarı/başarı kutularının kabuğu.
 *
 * YENİ RENK DEĞİL: K1 (sol şerit) + K2 (pastel zemin) bileşimi. Uygulamada
 * 58 dosyada elle yazılmış iki kalıp vardı —
 * `border-amber-500/50 bg-amber-500/10` ve emerald eşdeğeri — yani paletin
 * tamamen dışından, doğrudan Tailwind'in kendi renk ölçeğinden. Sonuç: aynı
 * "uyarı" kavramı panelde bir tonda, formda başka bir tonda görünüyordu.
 *
 * Yarıçap ve dolgu BURAYA GİRMEZ: çağıran yer `rounded-md p-3` gibi kendi
 * ölçüsünü verir. Kutunun rengi tek yerden, biçimi çağıran yerden gelir.
 */
export const DURUM_KUTUSU: Record<DurumRengi, string> = {
  olumlu: `${DURUM_SERIDI.olumlu} ${DURUM_ZEMINI.olumlu}`,
  olumsuz: `${DURUM_SERIDI.olumsuz} ${DURUM_ZEMINI.olumsuz}`,
  uyari: `${DURUM_SERIDI.uyari} ${DURUM_ZEMINI.uyari}`,
  bilgi: `${DURUM_SERIDI.bilgi} ${DURUM_ZEMINI.bilgi}`,
  notr: `${DURUM_SERIDI.notr} ${DURUM_ZEMINI.notr}`,
};

/**
 * DOYGUN ÇİP — ikon kutusu için, BEYAZ ikon üstünde tam doygun ton.
 *
 * KURAL: DOYGUNLUK YALNIZ KÜÇÜK ALANDA (15.08.2026). Kullanıcının örnek
 * verdiği ERP ekranının asıl numarası buydu: renk tam doygun ama yalnız
 * ~28 px'lik ikon dairelerinde ve grafik çubuklarında yaşıyor; rakamların
 * kendisi siyah, kartlar beyaz. Böylece ekran hem renkli hem sakin.
 *
 * Yani kısıt #2 ("asla doygun koca blok") kalkmıyor — tersine, doygunluğun
 * nereye gideceği belirleniyor: ÇİPE. Bu yüzden bu sınıflar yalnız
 * `IstatistikKutusu`nun ikon kutusunda kullanılır; zemin olarak kullanılırsa
 * `panel:dogrula` yakalar.
 *
 * Tonlar beyaz ikon için koyulaştırıldı — grafik öğede aranan 3:1 kontrast
 * oranı her tonda sağlanıyor (en düşüğü yeşil, 3,46).
 */
export const DURUM_CIPI: Record<DurumRengi, string> = {
  olumlu: "bg-[#1D9E75] text-white",
  olumsuz: "bg-[#E24B4A] text-white",
  uyari: "bg-[#B87309] text-white",
  bilgi: "bg-[#2F7FD1] text-white",
  notr: "bg-[#6B7280] text-white",
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

/**
 * ============================================================================
 *  MARJ RAMPASI — DERECE ÖLÇEĞİ, DURUM PALETİ DEĞİL
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 21.08.2026 (gönderilen pil ölçeği): marj kötüden iyiye
 *  DERECELİ renklensin — kırmızı · turuncu · sarı · yeşil · parlak yeşil.
 *
 *  ── NİYE YENİ BİR ÖLÇEK, "TEK KAYNAK" KURALINI DELMİYOR MU ──────────────
 *  Delmiyor; kural "ekranlar ham renk yazmaz, hepsi buradan geçer" der ve bu
 *  ölçek de BURADA. Ama beş durum rengiyle KARŞILANAMAZDI ve sebebi yapısal:
 *
 *    · DURUM paleti TÜR söyler — uyarı mı, bilgi mi, hata mı. Beş ayrı
 *      kavram; aralarında "daha çok/daha az" ilişkisi YOKTUR.
 *    · MARJ ölçeği DERECE söyler — tek eksende kötüden iyiye. Burada
 *      sıralama BİLGİNİN KENDİSİDİR.
 *
 *  Durum renklerini sıraya dizmeye kalksaydım (olumsuz→uyarı→?→olumlu)
 *  ortada sarı yoktu ve "kabul edilebilir" ya turuncuya ya yeşile
 *  yapışırdı — yani kullanıcının ayırmak istediği iki bant birleşirdi.
 *
 *  ⚠ VE RAMPA YALNIZ MARJ İÇİNDİR. Genel amaçlı bir "renk skalası" olarak
 *  kullanılırsa sistem sessizce ikiye bölünür ve durum paleti anlamını
 *  yitirir. Yeni bir derece ölçeği gerekirse KENDİ adıyla, kendi
 *  gerekçesiyle açılır.
 *
 *  UÇLAR DURUM PALETİNDEN ALINDI: en kötü #E24B4A ve en iyi #1D9E75 zaten
 *  sistemin kırmızısı ve yeşili. Rampa onların arasını dolduruyor, yanlarına
 *  YENİ bir kırmızı/yeşil koymuyor — yoksa aynı ekranda iki yeşil olurdu.
 * ============================================================================
 */

export type MarjTonu = {
  /** Pil bölmesinin dolgusu — doygun, küçük alan (kısıt #2'ye uygun). */
  dolgu: string;
  /** Rakamın rengi — zemin nötr kalır, kontrast yazıda. */
  yazi: string;
};

export const MARJ_RAMPASI = {
  /** Zarar: sistemin kırmızısının KOYU ucu — "çok riskli"den bir tık aşağı. */
  zarar: {
    dolgu: "bg-[#B03A3A]",
    yazi: "text-[#8F2424] dark:text-[#F6C2C2]",
  },
  cokRiskli: {
    dolgu: "bg-[#E24B4A]",
    yazi: "text-[#A32D2D] dark:text-[#EF9A9A]",
  },
  zayif: {
    dolgu: "bg-[#EF9F27]",
    yazi: "text-[#854F0B] dark:text-[#E5BE7C]",
  },
  /**
   * Sarı — rampanın ORTA basamağı ve paletin dışından gelen tek ton.
   * Açık sarı yazı olarak okunmaz (beyaz üstünde 1,6:1); bu yüzden dolgu
   * sarı, YAZI koyu hardal. Doygunluk yine yalnız küçük alanda.
   */
  kabul: {
    dolgu: "bg-[#D9B310]",
    yazi: "text-[#6B5304] dark:text-[#E8D07A]",
  },
  iyi: {
    dolgu: "bg-[#1D9E75]",
    yazi: "text-[#0F6E56] dark:text-[#6FD8B4]",
  },
  /** Çok iyi: aynı yeşilin parlak ucu — yeni bir hue değil, aynı ailenin tonu. */
  cokIyi: {
    dolgu: "bg-[#12B981]",
    yazi: "text-[#0B5C47] dark:text-[#6FD8B4]",
  },
} as const satisfies Record<string, MarjTonu>;

/**
 * PASTA DİLİM RENKLERİ — "satış fiyatı nereye gidiyor" grafiği için.
 *
 * ⚠ DURUM PALETİ DEĞİL, KATEGORİ PALETİ. Durum renkleri ANLAM taşır
 * (olumlu/olumsuz); burada dilimleri birbirinden AYIRMAK gerekiyor ve
 * "kargo kötüdür" gibi bir hüküm yok. Tek anlamlı dilim KÂR: o, sistemin
 * kendi yeşili. Kalanlar nötr-soğuk tonlar; hiçbiri alarm gibi okunmasın.
 *
 * ⚠ VE KIRMIZI YOK: bir gider kalemini kırmızıya boyamak "hata var" diye
 * okunurdu. Gider kaybı değil, işin maliyetidir.
 */
export const PASTA_RENKLERI: Record<string, string> = {
  MALIYET: "#64748B",
  KOMISYON: "#378ADD",
  KARGO: "#8B7FD4",
  STOPAJ: "#A88B6A",
  HIZMET_BEDELI: "#5FA8C7",
  SABIT_GIDER: "#5FA8C7",
  ODEME_GIDERI: "#7EA3B8",
  PAZARLAMA_HIZMET: "#9B8AA6",
  ODENECEK_KDV: "#B4B2A9",
  /** KÂR — sistemin kendi yeşili; tek anlamlı dilim. */
  KAR: "#1D9E75",
};

/** Tanınmayan kesinti kodu için nötr ton — sessizce kaybolmasın. */
export const PASTA_VARSAYILAN = "#94A3B8";
