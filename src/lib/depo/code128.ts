/**
 * ============================================================================
 *  CODE 128-B — SAF KODLAYICI (bağımlılıksız)
 * ----------------------------------------------------------------------------
 *  ⛔ DIŞ SERVİS YOK (K50 kararı): etiket sistemin İÇİNDE üretilir. Bir
 *  barkod görüntüsünü uzaktan istemek, deponun etiket basma yeteneğini
 *  başkasının çalışır olmasına bağlamak olurdu.
 *
 *  ⚠ VE YENİ BAĞIMLILIK DA EKLENMEDİ: Code128 kodlaması küçük ve tam
 *  tanımlı; 100 satırlık bir tabloyla bitiyor. `qrcode` paketi zaten kurulu
 *  olduğu için QR tarafında o kullanılıyor — orada tekerlek yeniden
 *  icat edilmiyor. Ölçüt "kütüphane kötü" değil, "bu iş için kütüphane
 *  gerekiyor mu".
 *
 *  ── NİYE B KÜMESİ ────────────────────────────────────────────────────────
 *  Raf kodları harf + rakam karışık (`RAF-SLN3-2`). A kümesi küçük harf
 *  taşımaz, C kümesi yalnız rakam çiftleri kodlar. B tek başına hepsini
 *  taşır ve küme değiştirme karmaşası doğmaz.
 *
 *  ⚠ GİRDİ ASCII 32–126 OLMAK ZORUNDA. `kisaltmaNormalle` bunu zaten
 *  garanti ediyor (Türkçe harfler A–Z'ye iniyor); yine de burada KONTROL
 *  EDİLİR — iki katman, çünkü bu gövde başka yerden de çağrılabilir.
 * ============================================================================
 */

/**
 * Code128 modül desenleri — değer 0..106.
 * Her desen 6 rakam: sırayla çubuk/boşluk genişlikleri (modül sayısı).
 * Toplam 11 modül (dur karakteri 13).
 */
const DESENLER = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213",
  "122312", "132212", "221213", "221312", "231212", "112232", "122132",
  "122231", "113222", "123122", "123221", "223211", "221132", "221231",
  "213212", "223112", "312131", "311222", "321122", "321221", "312212",
  "322112", "322211", "212123", "212321", "232121", "111323", "131123",
  "131321", "112313", "132113", "132311", "211313", "231113", "231311",
  "112133", "112331", "132131", "113123", "113321", "133121", "313121",
  "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111",
  "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114",
  "413111", "241112", "134111", "111242", "121142", "121241", "114212",
  "124112", "124211", "411212", "421112", "421211", "212141", "214121",
  "412121", "111143", "111341", "131141", "114113", "114311", "411113",
  "411311", "113141", "114131", "311141", "411131", "211412", "211214",
  "211232", "2331112",
];

/** START B = 104, STOP = 106. */
const BASLA_B = 104;
const DUR = 106;

export type Code128Sonucu =
  | { olur: true; moduller: number[] }
  | { olur: false; sebep: "BOS" | "GECERSIZ_KARAKTER" };

/**
 * Metni modül genişlikleri dizisine çevirir.
 *
 * Dizinin ilk elemanı ÇUBUK genişliği, sonra boşluk, sonra çubuk… şeklinde
 * dönüşümlü okunur. Çizim katmanı bunu SVG dikdörtgenlerine dönüştürür.
 *
 * ⚠ SAF: DOM'a dokunmaz, dosya yazmaz. Değerle sınanabilir.
 */
export function code128B(metin: string): Code128Sonucu {
  if (metin === "") return { olur: false, sebep: "BOS" };

  const degerler: number[] = [BASLA_B];
  for (const ch of metin) {
    const kod = ch.charCodeAt(0);
    /** ⚠ B kümesi ASCII 32–126. Dışındaki karakter SESSİZCE ATLANMAZ. */
    if (kod < 32 || kod > 126) return { olur: false, sebep: "GECERSIZ_KARAKTER" };
    degerler.push(kod - 32);
  }

  /**
   * ⭐ SAĞLAMA (checksum) — MOD 103, AĞIRLIKLI.
   * Başlangıç değeri ağırlıksız; sonraki her değer 1'den başlayan konumuyla
   * çarpılır. Sağlama yanlış olursa okuyucu barkodu HİÇ okumaz — sessiz
   * yanlış okuma değil, açık ret. Bu iyi bir davranış ve korunuyor.
   */
  let toplam = degerler[0];
  for (let i = 1; i < degerler.length; i++) toplam += degerler[i] * i;
  degerler.push(toplam % 103);
  degerler.push(DUR);

  const moduller: number[] = [];
  for (const d of degerler) {
    for (const ch of DESENLER[d]) moduller.push(Number(ch));
  }
  return { olur: true, moduller };
}

/**
 * Modül dizisini SVG `<path>` verisine çevirir — yalnız ÇUBUKLAR çizilir.
 *
 * ⚠ Boşluk çizilmez: beyaz dikdörtgen basmak dosyayı iki katına çıkarır ve
 * yazıcıda ton farkı üretebilir. Zemin SVG'nin kendi arka planıdır.
 */
export function code128Yol(moduller: number[], modulGenisligi: number): string {
  let x = 0;
  let cubukMu = true;
  const parcalar: string[] = [];
  for (const m of moduller) {
    const w = m * modulGenisligi;
    if (cubukMu) parcalar.push(`M${x.toFixed(3)} 0h${w.toFixed(3)}v1h-${w.toFixed(3)}z`);
    x += w;
    cubukMu = !cubukMu;
  }
  return parcalar.join("");
}

/** Barkodun toplam modül genişliği — etiket yerleşimi bunu bilmeli. */
export function code128Genisligi(moduller: number[]): number {
  return moduller.reduce((t, m) => t + m, 0);
}
