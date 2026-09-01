/**
 * ============================================================================
 *  KOMİSYON ORANI YAYIM RİTMİ (K14c, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  Pazaryerleri komisyon oranını haftalık yayımlar. Bu gövde "o kanalın en
 *  son yayım günü hangisiydi" sorusunu cevaplar; bayatlık ölçümü buradan
 *  beslenir.
 *
 *  ── ⛔ ANAHTAR KOD, AD DEĞİL ────────────────────────────────────────────
 *  Sözlük `canli-komisyon-envanter.ts` içinde kanal ADIYLA anahtarlanmıştı
 *  (`Trendyol: [2, 5]`). Ad bir ETİKETTİR — ayarlardan düzenlenebilir. Ad
 *  düzenlendiği gün sözlük eşleşmez, ritim "TANIMSIZ"a düşer ve bayatlık
 *  ölçümü SESSİZCE kaybolurdu; üstelik boş dönüş MAKUL GÖRÜNÜRDÜ.
 *
 *  Aynı gerekçe `kanal-sirasi.ts`te de yazılı: "Elden Satış" kanalının kodu
 *  `DEPO`. Ada bağlanan her ölçüt, ad değişince bozulur.
 *  _(Anayasa: "kimlik varken dizeyle aranmaz".)_
 *
 *  ── ⚠ BİLİNMEYEN KANAL `null` DÖNER, BOŞ DİZİ DEĞİL ─────────────────────
 *  Boş dizi "ölçtüm, yayım günü yok" der; `null` "bu kanalın ritmini
 *  BİLMİYORUM" der. İkisi farklı iddialardır ve çağıran taraf ayrımı
 *  görebilmelidir — boş dizi dönseydi `sonGuncellemeGunu` sessizce hüküm
 *  üretirdi. _(Anayasa: "varsayılan değer, alanın anlamından türetilir".)_
 * ============================================================================
 */

/**
 * Oranın haftalık güncellendiği gün (0=Paz … 6=Cmt), KANAL KODUNA göre.
 * _Kaynak: CLAUDE.md iş sabitleri — Trendyol Salı, Hepsiburada Çarşamba._
 */
export const KANAL_RITMI: Record<string, number[]> = {
  /**
   * TRENDYOL HAFTADA İKİ KEZ — 18.08.2026'da tarife dosyasından ÖLÇÜLDÜ.
   * Pencereler: Salı 08:00→Cuma 07:59 (3 gün) · Cuma 08:00→Salı 07:59
   * (4 gün). Tek gün yazsaydık cuma yayımını kaçırır, salıya kadar
   * "güncel" sayardık.
   */
  TRENDYOL: [2, 5],
  HEPSIBURADA: [3],
};

/**
 * Kanalın yayım günleri — BİLİNMİYORSA `null`.
 *
 * ⛔ BOŞ DİZİ DÖNMEZ: "ritmi yok" ile "ritmini bilmiyorum" aynı şey değil.
 */
export function ritimGunleri(kanalKodu: string): number[] | null {
  const gunler = KANAL_RITMI[kanalKodu];
  if (gunler === undefined || gunler.length === 0) return null;
  return gunler;
}

/**
 * Verilen haftanın günlerine göre EN SON yayım tarihi.
 *
 * Bugün o günse bugünü sayar — yayım günü henüz geçmemiş olabilir; "bayat"
 * hükmü çağıran tarafta eşikle veriliyor.
 *
 * ⚠ BİRDEN ÇOK YAYIM GÜNÜ VARSA **EN YAKINI** GEÇERLİDİR: Trendyol salı VE
 * cuma yayımlıyor; cuma günü salıyı seçseydik üç günlük yayım penceresini
 * kaçırır, tazelenmiş oranları "bayat" sayardık.
 */
export function sonGuncellemeGunu(bugun: Date, gunler: number[]): Date {
  let enYakin: Date | null = null;
  for (const g of gunler) {
    const d = new Date(bugun);
    const fark = (d.getUTCDay() - g + 7) % 7;
    d.setUTCDate(d.getUTCDate() - fark);
    if (!enYakin || d > enYakin) enYakin = d;
  }
  if (enYakin === null) {
    throw new Error("sonGuncellemeGunu: yayım günü listesi boş");
  }
  return enYakin;
}
