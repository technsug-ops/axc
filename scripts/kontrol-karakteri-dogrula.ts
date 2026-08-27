import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ============================================================================
 *  GÖRÜNMEZ KARAKTER BEKÇİSİ — "\b TUZAĞI"
 * ----------------------------------------------------------------------------
 *      npm run kontrol-karakteri:dogrula
 *
 *  ⚠ BU TUZAĞA İKİ KEZ DÜŞÜLDÜ (26.08 ve 28.08.2026) ve İKİSİNDE DE bir
 *  BEKÇİYİ sessizce işlevsiz yaptı.
 *
 *  Vaka: bir bekçi ölçütü Python ile dosyaya yazıldı ve desende `\b` (kelime
 *  sınırı) vardı. Python'un ham OLMAYAN dizesinde `\b` bir kaçış dizisidir ve
 *  **0x08 BACKSPACE** karakterine çevrilir. Dosyaya düşen şey şu oldu:
 *
 *      ["Date", /<BS>Date<BS>/]      ← ekranda `/Date/` GİBİ GÖRÜNÜR
 *
 *  `grep`, `sed` ve editör backspace'i çizmez; kod **doğru görünür.** Ama
 *  desen artık "backspace + Date + backspace" arıyor ve HİÇBİR ŞEYLE
 *  eşleşmiyor — yani ölçüt **her zaman yeşil.**
 *
 *  ⛔ 28.08'de tam olarak bu oldu: süre eşiği yasağını ölçen kontrol yazıldı,
 *  mutasyon denendi, KAÇTI. Sebep kodda değil, GÖRÜNMEZ KARAKTERDEYDİ ve
 *  ancak `cat -A` ile ortaya çıktı.
 *
 *  ═══ ÖLÇÜT DESEN YASAĞI: kaynakta kontrol karakteri OLMAZ ═══
 *  Tek tek dosya listelemiyoruz; `src/` ve `scripts/` altındaki her `.ts`
 *  taranıyor. Yarın yazılan dosya da kendiliğinden kapsama girer.
 *
 *  İZİN VERİLENLER: `\t` (0x09), `\n` (0x0A), `\r` (0x0D). Gerisi hata.
 * ============================================================================
 */

const KOKLER = ["src", "scripts"];

/** ⚠ İzin listesi — YASAK listesi değil. Yarın doğan karakter de yakalanır. */
const IZINLI = new Set([0x09, 0x0a, 0x0d]);

function dosyalar(kok: string, biriken: string[] = []): string[] {
  for (const ad of readdirSync(kok)) {
    const yol = join(kok, ad);
    if (statSync(yol).isDirectory()) {
      /* Üretilmiş istemci taranmaz — bizim yazdığımız kod değil. */
      if (yol.replaceAll("\\", "/") === "src/generated") continue;
      dosyalar(yol, biriken);
    } else if (/\.(ts|tsx)$/.test(ad)) {
      biriken.push(yol.replaceAll("\\", "/"));
    }
  }
  return biriken;
}

const bulgular: string[] = [];
let taranan = 0;

for (const kok of KOKLER) {
  for (const yol of dosyalar(kok)) {
    taranan++;
    const metin = readFileSync(yol, "utf8");
    for (let i = 0; i < metin.length; i++) {
      const k = metin.charCodeAt(i);
      /* C0 denetim karakterleri + DEL. */
      if ((k < 0x20 && !IZINLI.has(k)) || k === 0x7f) {
        const satir = metin.slice(0, i).split("\n").length;
        bulgular.push(
          yol + ":" + satir + "  → 0x" + k.toString(16).padStart(2, "0") +
            "  (`\\b` yazmak istediyseniz kaynakta İKİ karakter olmalı: ters bölü + b)",
        );
        break; // dosya başına bir bulgu yeter
      }
    }
  }
}

console.log("\nGÖRÜNMEZ KARAKTER BEKÇİSİ\n");
console.log("  taranan dosya: " + taranan);
if (bulgular.length === 0) {
  console.log("  ✓  kontrol karakteri yok — desenler göründükleri gibi\n");
} else {
  console.log("");
  for (const b of bulgular) console.log("  ✗  " + b);
  console.log(
    "\n  ⛔ " + bulgular.length + " dosyada GÖRÜNMEZ karakter var.\n" +
      "     Bu karakterler ekranda ÇİZİLMEZ; kod doğru görünür ama desen\n" +
      "     hiçbir şeyle eşleşmez ve ölçüt SESSİZCE her zaman yeşil yanar.\n",
  );
  process.exitCode = 1;
}
