import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ============================================================================
 *  FIFO SINIRI — DESEN YASAĞI (bekçi)
 * ----------------------------------------------------------------------------
 *      npm run fifo-sinir:dogrula
 *
 *  ⛔ 29.08.2026 CANLI ARIZASI: 27.07.2025 tarihli bir satış 13.08.2026
 *  tarihli partiyi tüketti; gerçek stok kilitlendi, yeni sipariş
 *  kaydedilemedi. Kapsam 809 bağ · 181 varyant.
 *
 *  ⭐ ÖLÇÜT DOSYA LİSTESİ DEĞİL, DESEN — anayasa: _"bekçi ölçütü elle
 *  tutulan liste değil, tersten kurulur"_. Liste tutulsaydı yarın açılan
 *  yedinci ekran sessizce yeşil kalırdı.
 *
 *      Sonucu `fifoDagit`e giden bir `acikPartiler`/`acikPartilerToplu`
 *      çağrısı `sinir` GEÇİRMEK ZORUNDA. Geçirmeyen çağrı, yanında
 *      `SINIR YOK: <gerekçe>` beyanı taşımıyorsa KIRMIZI.
 *
 *  ⚠ VE YORUMSUZ KODDA ARANIR: bir yasağı ANLATAN yorum, o yasağı çiğnemiş
 *  sayılmaz.
 * ============================================================================
 */

const KOK = ["src"];
/** Çağrı ile beyan arasında kaç satır kabul edilir. */
const BEYAN_PENCERESI = 6;

function dosyalar(dizin: string): string[] {
  const cikti: string[] = [];
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) cikti.push(...dosyalar(yol));
    else if (/\.tsx?$/.test(ad)) cikti.push(yol);
  }
  return cikti;
}

/** ⚠ Yorumlar SİLİNİR — ölçüt koda bakar, anlatıya değil. */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
}

let hata = 0;
let kontrol = 0;
const bulgular: string[] = [];

for (const kok of KOK) {
  for (const yol of dosyalar(kok)) {
    const ham = readFileSync(yol, "utf8");
    /** Motorun kendi gövdesi ölçütün dışında — tanımın kendisi burada. */
    if (yol.replace(/\\/g, "/").endsWith("src/lib/stok.ts")) continue;

    const kod = yorumsuz(ham);
    /** ⚠ Bu dosya FIFO DAĞITIMI yapıyor mu — davranışa bağlan, ada değil. */
    const dagitiyor = /\bfifoDagit\s*\(/.test(kod);
    const cagriDeseni = /\b(acikPartiler|acikPartilerToplu)\s*\(/g;

    let m: RegExpExecArray | null;
    while ((m = cagriDeseni.exec(kod)) !== null) {
      /** Çağrının tamamı — parantez dengesiyle, satır sonuyla değil. */
      let derinlik = 0;
      let son = m.index + m[0].length - 1;
      for (let i = son; i < kod.length; i++) {
        if (kod[i] === "(") derinlik++;
        else if (kod[i] === ")") { derinlik--; if (derinlik === 0) { son = i; break; } }
      }
      const cagri = kod.slice(m.index, son + 1);

      /**
       * ⚠ ARGÜMAN SAYISI VİRGÜLLE SAYILMAZ — iç içe çağrı ve dizi
       * literalleri virgül taşır. En dış seviyedeki virgüller sayılır.
       */
      const govde = cagri.slice(cagri.indexOf("(") + 1, -1);
      let d = 0, virgul = 0;
      for (const ch of govde) {
        if (ch === "(" || ch === "[" || ch === "{") d++;
        else if (ch === ")" || ch === "]" || ch === "}") d--;
        else if (ch === "," && d === 0) virgul++;
      }
      const sinirVar = virgul >= 2;

      if (!dagitiyor) continue;
      kontrol++;

      /**
       * ⭐ SINIR VAR AMA DEĞERİ NE — EN KRİTİK ÖLÇÜT.
       * `sinir = soldAt` (gün BAŞI) makul görünür ve defterin %48,72'sini
       * kilitler: aynı gün alınıp aynı gün satılan mal dışarıda kalır.
       * Bu yüzden sınır `gunSonu(...)` OLMAK ZORUNDA.
       */
      if (sinirVar) {
        /** ⚠ Argüman ayırma DERİNLİKLE — regex ile değil; iç içe çağrı
         *  ve dizi literalleri virgül taşır, regex onları yanlış böler. */
        const parcalar: string[] = [];
        let derin = 0, bas = 0;
        for (let i = 0; i < govde.length; i++) {
          const ch = govde[i];
          if (ch === "(" || ch === "[" || ch === "{") derin++;
          else if (ch === ")" || ch === "]" || ch === "}") derin--;
          else if (ch === "," && derin === 0) {
            parcalar.push(govde.slice(bas, i));
            bas = i + 1;
          }
        }
        parcalar.push(govde.slice(bas));
        const ucuncu = parcalar.slice(2).join(",");
        if (!/\bgunSonu\s*\(/.test(ucuncu)) {
          hata++;
          const sn = kod.slice(0, m.index).split("\n").length;
          bulgular.push(
            "  ⛔ " + yol.replace(/\\/g, "/") + ":" + sn +
            "  →  SINIR GÜN BAŞI OLABİLİR: " + ucuncu.trim().slice(0, 52) +
            "   (gunSonu bekleniyor)",
          );
        }
        continue;
      }

      /** Beyan aranıyor — çağrıdan ÖNCEKİ birkaç satırda, HAM metinde. */
      const oncekiKod = kod.slice(0, m.index);
      const satirNo = oncekiKod.split("\n").length;
      const hamSatirlar = ham.split("\n");
      const pencere = hamSatirlar
        .slice(Math.max(0, satirNo - 1 - BEYAN_PENCERESI), satirNo)
        .join("\n");
      if (/SINIR YOK:\s*\S/.test(pencere)) continue;

      hata++;
      bulgular.push(
        "  ⛔ " + yol.replace(/\\/g, "/") + ":" + satirNo +
        "  →  " + cagri.replace(/\s+/g, " ").slice(0, 72),
      );
    }
  }
}

/**
 * ⭐ SAF GÖVDE DEĞERLE SINANIR — desen taranmaz (anayasa: "saf hesap
 * katmanı, desen tarayan bekçiye muhtaç olmaz").
 */
{
  const kaynak = readFileSync("src/lib/stok.ts", "utf8");
  const govde = kaynak.slice(kaynak.indexOf("export async function acikPartilerToplu"));
  const pencere = govde.slice(0, 1200);
  const kodP = yorumsuz(pencere);
  if (!/occurredAt:\s*\{\s*lt:\s*sinir\s*\}/.test(kodP)) {
    hata++;
    bulgular.push("  ⛔ src/lib/stok.ts — süzgeç `occurredAt: { lt: sinir }` DEĞİL");
  }
  if (/occurredAt:\s*\{\s*lte:/.test(kodP)) {
    hata++;
    bulgular.push(
      "  ⛔ src/lib/stok.ts — süzgeç `lte` kullanıyor. Sınır GÜN SONU olduğu " +
      "için `lte` ertesi günün ilk anını İÇERİ ALIR.",
    );
  }
  kontrol += 2;
}

console.log("");
console.log("FIFO SINIRI — DESEN YASAĞI");
console.log("  ölçüt: sonucu `fifoDagit`e giden çağrı `sinir` geçirmeli;");
console.log("         geçirmiyorsa yanında `SINIR YOK: <gerekçe>` beyanı olmalı.");
console.log("  incelenen çağrı: " + kontrol);
if (hata === 0) {
  console.log("  TÜM KONTROLLER GEÇTİ (" + kontrol + ")");
  process.exit(0);
}
console.log("  ⛔ BEYANSIZ SINIRSIZ ÇAĞRI: " + hata);
for (const b of bulgular) console.log(b);
console.log("");
console.log("  Çare: çağrıya olayın GÜN SONU sınırını geçir (`gunSonu(...)`),");
console.log("  ya da bilinçliyse yanına `SINIR YOK: <gerekçe>` yaz.");
process.exit(1);
