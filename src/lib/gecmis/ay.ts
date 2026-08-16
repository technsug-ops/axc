/**
 * ============================================================================
 *  TÜRKÇE AY ADI ÇÖZÜMLEME
 * ----------------------------------------------------------------------------
 *  Gerçek dosyada ay adları TUTARSIZ yazılmış (ölçüldü 16.08.2026):
 *
 *      "Mayis" · "Mayıs" · "MAyıs"      → aynı ay
 *      "temmuz" · "Temmuz"              → aynı ay
 *      "Agustos" · "Ağustos"            → aynı ay
 *      "Kasim" · "Kasım" · "Subat" · "Şubat" · "Aralik" · "Aralık"
 *
 *  Bunlar hata değil, insanın tabloya elle yazdığı gerçek veri. Reddetmek
 *  16 aylık geçmişi kaybetmek olurdu; sessizce tahmin etmek de yanlış aya
 *  yazma riski taşır. Bu yüzden: NORMALLEŞTİR, HAM HÂLİ SAKLA, çözemediğini
 *  HATA olarak bildir.
 *
 *  ── NEDEN `localeCompare` YA DA `toLowerCase("tr")` DEĞİL ────────────────
 *  Türkçe'nin i/I sorunu: `"MAyıs".toLowerCase()` ortamın diline göre farklı
 *  sonuç verebilir ve bu tür bir fark, aylar sonra "bazı satırlar neden
 *  atlanmış" diye sorulan cevapsız bir soruya dönüşür. Harf harf eşleme
 *  ortamdan bağımsızdır.
 * ============================================================================
 */

/** Türkçe harfleri ASCII karşılığına indirir — ortamdan bağımsız. */
export function harfleriSadelestir(metin: string): string {
  const esleme: Record<string, string> = {
    ı: "i", I: "i", İ: "i", i: "i",
    ş: "s", Ş: "s",
    ğ: "g", Ğ: "g",
    ü: "u", Ü: "u",
    ö: "o", Ö: "o",
    ç: "c", Ç: "c",
  };
  let sonuc = "";
  for (const harf of metin) {
    const karsilik = esleme[harf];
    if (karsilik !== undefined) sonuc += karsilik;
    else sonuc += harf >= "A" && harf <= "Z"
      ? String.fromCharCode(harf.charCodeAt(0) + 32)
      : harf;
  }
  return sonuc;
}

/** Sadeleştirilmiş ay adı → ay numarası (1-12). */
const AYLAR: Record<string, number> = {
  ocak: 1,
  subat: 2,
  mart: 3,
  nisan: 4,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  agustos: 8,
  eylul: 9,
  ekim: 10,
  kasim: 11,
  aralik: 12,
};

/**
 * Ay adını numaraya çevirir. Çözemezse `null` — TAHMİN ETMEZ.
 *
 * Yakın bir ada zorlamak ("mays" → mayıs) cazip görünür ama yanlış aya
 * yazılan bir ekstre sessiz bir para hatasıdır. Çözülemeyen satır hata
 * listesine düşer ve kullanıcı görür.
 */
export function ayiCoz(deger: unknown): number | null {
  if (typeof deger !== "string") return null;
  const sade = harfleriSadelestir(deger.trim());
  return AYLAR[sade] ?? null;
}

/** Yıl + ay → dönem tarihi (ayın 1'i, UTC gece yarısı). */
export function donemTarihi(yil: number, ay: number): Date {
  return new Date(Date.UTC(yil, ay - 1, 1));
}
