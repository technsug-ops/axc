import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  BEKÇİLERİN ORTAK OKUMA KAPISI (K262, 25.09.2026)
 * ----------------------------------------------------------------------------
 *  Bir bekçi kaynak dosyayı BURADAN okur; `readFileSync`i doğrudan içeri
 *  alamaz (`bekci-kapisi:dogrula` desen yasağı — dosya listesi tutulmaz,
 *  yarın eklenen bekçi de kapsamda).
 *
 *  ⛔ NİYE: 87 bekçide 613 çıplak okuma vardı ve 12 bekçinin çapası ortada
 *  `\n` taşıyordu. Bir dosyanın satır sonu değişince (betikle yazım LF, git
 *  dokunuşu CRLF) böyle bir ölçüt SESSİZCE kırılır: kırmızı yanarsa şans,
 *  `indexOf → -1` ile boş dilime bakıp YEŞİL kalırsa felaket. 24.08'de
 *  `prisma format` şemayı CRLF'e çevirdi ve enum ayrıştıran ölçüt tam bu
 *  yüzden kırıldı; panel bekçisi kendi kapısını K258-②'de kurmuştu. Bu dosya
 *  o kapıyı ORTAK yapar. _(Anayasa: "metni okuyan kontrol, metnin geliş
 *  biçiminden bağımsız okur — düzeltme deseni tek tek yamamak değil, okuma
 *  kapısını kurmaktır".)_
 *
 *  NE NORMALLEŞİR: CRLF → LF, tek başına CR → LF, baştaki BOM atılır.
 *  NE NORMALLEŞMEZ: içerik. Sekme, boşluk, Türkçe karakter aynen kalır.
 *
 *  ⚠ BAYT GEREKEN YER `hamOku` KULLANIR (kontrol karakteri taraması, dosya
 *  boyutu, md5): normalleştirilmiş metin o soruların cevabını DEĞİŞTİRİR.
 * ============================================================================
 */
export function kaynakOku(yol: string): string {
  return normallestir(readFileSync(yol, "utf8"));
}

/** Saf gövde — değer testi bunu çağırır. */
export function normallestir(metin: string): string {
  return metin.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

/** Dosyanın BAYTLARI — biçimin kendisini ölçen bekçiler için. */
export function hamOku(yol: string): Buffer {
  return readFileSync(yol);
}
