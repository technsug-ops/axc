/**
 * ============================================================================
 *  ZAMAN TABLOSU SIRASI — EN YENİ ÜSTTE (K125, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ KULLANICI KARARI: _"tabloların devamı en yeni tarihi üst tarafa
 *  koymalı, diğer tablolarda da görünüm bu şekilde olsun."_
 *
 *  ── ⚠ GRAFİK İLE TABLO AYNI DİZİYİ TERS OKUR — VE İKİSİ DE DOĞRU ────
 *  Grafik SOLDAN SAĞA zamanı çizer; ters çevrilirse eğri anlamını kaybeder
 *  (yükselen seri düşüyor görünür). Tablo ise bir DÖKÜMDÜR ve dökümde göz
 *  önce EN SON olana bakar — "dün ne oldu" sorusu, "otuz gün önce ne oldu"
 *  sorusundan önce gelir.
 *
 *  ⛔ BU YÜZDEN TERS ÇEVİRME GÖVDEDE, ÇAĞIRANDA DEĞİL: aynı `noktalar`
 *  dizisini hem grafik hem tablo kullanıyor. Çeviren taraf karışırsa grafik
 *  sessizce ters çizilir ve kimse fark etmez — eğri yine "makul" görünür.
 *  _(Anayasa: aynı veri, farklı soruya farklı pencereden bakar; ama hangi
 *  ekranın hangi soruyu sorduğu KODDA yazılı olmalı.)_
 *
 *  ── ⚠ NEDEN "TERS ÇEVİR", "TARİHE GÖRE SIRALA" DEĞİL ────────────────
 *  Nokta dizisi tarih taşımıyor; yalnız etiket (`tamEtiket`) taşıyor ve o
 *  etiket biçimlendirilmiş metin — dize olarak sıralamak `01.09` ile
 *  `03.08`u yanlış dizerdi. Diziyi ÜRETEN gövde zaten kronolojik veriyor;
 *  doğru işlem onu tersine okumaktır.
 *  ⚠ SÖZLEŞME: çağıran KRONOLOJİK dizi verir. Vermezse tablo da ters çıkar
 *  — bu yüzden sözleşme burada yazılı ve bekçi grafiğin ham diziyi
 *  kullandığını ayrıca ölçüyor.
 * ============================================================================
 */

/**
 * Zaman serisi tablosunun satır sırası — EN YENİ ÜSTTE.
 *
 * ⛔ GİRDİYİ BOZMAZ: `reverse()` yerinde çevirir ve aynı diziyi kullanan
 * grafik sessizce ters çizilirdi. Kopya alınıyor.
 */
export function tabloNoktalari<T>(noktalar: readonly T[]): T[] {
  return [...noktalar].reverse();
}
