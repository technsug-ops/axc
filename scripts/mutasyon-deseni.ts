/**
 * ============================================================================
 *  MUTASYON DESENİ — SATIR SONU NORMALLEŞTİRME · TEK GÖVDE
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE ORTAK GÖVDE (08.09.2026, K190): bu fonksiyon **16 harness'te ayrı
 *  ayrı** yazılıydı. Ölçüldü: 15'i birebir aynı, biri (`toplu-kargo`)
 *  `replaceAll` kullanıyordu — davranış aynı, yazılış farklı. Yani bugün bir
 *  hata YOK; ama çapa bekçisi (`mutasyon-capa:dogrula`) harness'lerle **aynı
 *  ölçüyle** saymak zorunda ve onu 17. kopya olarak yazmak, tam da o
 *  bekçinin önlemek istediği şeyi üretirdi.
 *  _(Anayasa: "kopyası olan seçici ölçüt iki kat tehlikelidir — ölçüt tek
 *  gövdeye taşınır".)_
 *
 *  ⚠ NİYE GEREKLİ: depoda dosyaların bir kısmı CRLF, bir kısmı LF. Kaynakta
 *  `"\n"` ile yazılmış bir desen, CRLF bir dosyada HİÇBİR ŞEYLE eşleşmez ve
 *  mutasyon sessizce "uygulanamadı" olur.
 *  _(Anayasa: "metni okuyan kontrol, metnin geliş biçiminden bağımsız okur —
 *  düzeltme tek tek yamamak değil, OKUMA KAPISINI kurmaktır".)_
 * ============================================================================
 */

/** Satır sonlarını hedef dosyanın biçimine uydurur (depoda CRLF de var). */
export function desenNormalle(kaynak: string, desen: string): string {
  return kaynak.includes("\r\n") ? desen.split("\n").join("\r\n") : desen;
}

/**
 * Desenin kaynakta KAÇ KEZ geçtiği — harness'in kullandığı sayımın ta
 * kendisi. Ayrı yazılsaydı çapa bekçisi ile harness farklı sayabilirdi.
 */
export function desenAdedi(kaynak: string, desen: string): number {
  return kaynak.split(desenNormalle(kaynak, desen)).length - 1;
}
