import { readdirSync } from "node:fs";

import { hamOku, kaynakOku, normallestir } from "./kaynak-oku";

/**
 * ============================================================================
 *  BEKÇİ ALTYAPISI TEK KAPIDAN — `npm run bekci-kapisi:dogrula` (K262 · K263)
 * ----------------------------------------------------------------------------
 *  İki desen yasağı, DOSYA LİSTESİ TUTMADAN (yarın eklenen dosya da kapsamda):
 *
 *   ① OKUMA — `scripts/*-dogrula.ts` `readFileSync`i doğrudan içeri ALAMAZ;
 *      kaynağı `kaynakOku` (satır sonu normalleşmiş) ya da `hamOku` (bayt)
 *      ile okur. Kapı: `scripts/kaynak-oku.ts`.
 *   ② YAZMA — `scripts/*mutasyon*.ts` `writeFileSync`i doğrudan içeri
 *      ALAMAZ; mutasyonu ve geri almayı `dayanikliYaz` ile yazar (Windows
 *      geçici kilidinde yeniden dener — geri alma yazımı düşerse mutant diskte
 *      kalırdı). Kapı: `scripts/mutasyon-deseni.ts` (tek istisna).
 *
 *  ⚠ ÖLÇÜT İÇE AKTARMAYA BAĞLI, ÇAĞRIYA DEĞİL: içeri alınmayan fonksiyon
 *  çağrılamaz. Ad alanı içe aktarması (`import * as fs`) ve `require("fs")`
 *  da yasak — yoksa `fs.readFileSync` yasağın etrafından dolaşırdı.
 *  Yorumlar temizlenerek taranır: yasağı ANLATAN yorum onu çiğnemiş sayılmaz.
 *
 *  ⚠ TABAN DOLULUĞU AYRICA ÖLÇÜLÜR: tarama sıfır dosya bulsaydı "ihlal 0"
 *  derdi — boş küme her koşulu sağlar (`every` kapısının tarama tarafı).
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 4;
function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log("        ", gorulen);
  }
}

console.log("=".repeat(70));
console.log("BEKÇİ ALTYAPISI TEK KAPIDAN (K262 · K263)");
console.log("=".repeat(70));

export type Kural = "okuma" | "yazma";
const YASAK: Record<Kural, string> = { okuma: "readFileSync", yazma: "writeFileSync" };
const KAPSAM: Record<Kural, (ad: string) => boolean> = {
  okuma: (ad) => ad.endsWith("-dogrula.ts"),
  yazma: (ad) => ad.endsWith(".ts") && ad.includes("mutasyon") && ad !== "mutasyon-deseni.ts",
};

function yorumsuz(metin: string): string {
  return metin.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}

/** SAF — bir dosyanın bu kurala göre ihlallerini döner (boş dizi = temiz). */
export function kapiIhlalleri(ad: string, metin: string, kural: Kural): string[] {
  if (!KAPSAM[kural](ad)) return [];
  const kod = yorumsuz(normallestir(metin));
  const ihlal: string[] = [];
  for (const m of kod.matchAll(/^import\s*\{([^}]*)\}\s*from\s*["'](node:)?fs["']/gm)) {
    const adlar = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0]);
    if (adlar.includes(YASAK[kural])) ihlal.push(`${YASAK[kural]} doğrudan içeri alınmış`);
  }
  if (/^import\s+\*\s+as\s+\w+\s+from\s*["'](node:)?fs["']/m.test(kod)) ihlal.push("fs ad alanı içe aktarması");
  if (/^import\s+\w+\s+from\s*["'](node:)?fs["']/m.test(kod)) ihlal.push("fs varsayılan içe aktarması");
  if (/^\s*(const|let|var)\s+[\w{}, ]+=\s*require\(\s*["'](node:)?fs["']\s*\)/m.test(kod)) ihlal.push('require("fs")');
  return ihlal;
}

// ── 1) SAF KURAL — değerle ────────────────────────────────────────────────
console.log("\n1) kural — sentetik kaynaklarla");
{
  const kirli = 'import { readdirSync, readFileSync } from "node:fs";\nconst x = readFileSync("a", "utf8");';
  kontrol("bekçi readFileSync içeri alırsa İHLAL", kapiIhlalleri("yeni-dogrula.ts", kirli, "okuma").length === 1);
  kontrol("  ...çok satırlı içe aktarmada da", kapiIhlalleri("yeni-dogrula.ts", 'import {\n  readdirSync,\n  readFileSync,\n} from "fs";', "okuma").length === 1);
  kontrol("  ...takma adla da (readFileSync as oku)", kapiIhlalleri("yeni-dogrula.ts", 'import { readFileSync as oku } from "node:fs";', "okuma").length === 1);
  kontrol("  ...ad alanıyla da (import * as fs)", kapiIhlalleri("yeni-dogrula.ts", 'import * as fs from "node:fs";', "okuma").length === 1);
  kontrol("  ...require ile de", kapiIhlalleri("yeni-dogrula.ts", 'const fs = require("fs");', "okuma").length === 1);
  kontrol("kapıdan okuyan bekçi TEMİZ", kapiIhlalleri("yeni-dogrula.ts", 'import { readdirSync } from "node:fs";\nimport { kaynakOku } from "./kaynak-oku";', "okuma").length === 0);
  kontrol("  ...yasağı ANLATAN yorum ihlal değil", kapiIhlalleri("yeni-dogrula.ts", '// import { readFileSync } from "node:fs" YASAK\nimport { kaynakOku } from "./kaynak-oku";', "okuma").length === 0);
  kontrol("bekçi DEĞİL (kapsam dışı) → kural işlemez", kapiIhlalleri("kaynak-oku.ts", kirli, "okuma").length === 0);
  const harness = 'import { readFileSync, writeFileSync } from "node:fs";';
  kontrol("harness writeFileSync içeri alırsa İHLAL", kapiIhlalleri("yeni-mutasyon-kontrol.ts", harness, "yazma").length === 1);
  kontrol("  ...harness OKUMAK için readFileSync alabilir (geri alma baytı birebir)", kapiIhlalleri("yeni-mutasyon-kontrol.ts", 'import { readFileSync } from "node:fs";', "yazma").length === 0);
  kontrol("  ...yazma kapısının kendisi istisna", kapiIhlalleri("mutasyon-deseni.ts", harness, "yazma").length === 0);
}
kosanBolumler.push("kural");

// ── 2) OKUMA KAPISI — değerle ─────────────────────────────────────────────
console.log("\n2) okuma kapısı normalleştirir");
{
  kontrol("CRLF → LF", normallestir("a\r\nb\r\n") === "a\nb\n");
  kontrol("  ...tek başına CR → LF", normallestir("a\rb") === "a\nb");
  kontrol("  ...baştaki BOM atılır", normallestir("﻿a") === "a");
  kontrol("  ...içerik aynen (sekme · Türkçe)", normallestir("\tçğış\n") === "\tçğış\n");
  const sema = kaynakOku("prisma/schema.prisma");
  kontrol("gerçek dosyada kapıdan okunan metinde CR yok", sema.length > 1000 && !sema.includes("\r"));
  kontrol("  ...hamOku BAYT döner (normalleştirmez)", Buffer.isBuffer(hamOku("prisma/schema.prisma")) && hamOku("prisma/schema.prisma").length >= sema.length);
}
kosanBolumler.push("okuma kapısı");

// ── 3) GERÇEK TARAMA ──────────────────────────────────────────────────────
console.log("\n3) scripts/ taraması (liste tutulmaz)");
const dosyalar = readdirSync("scripts").filter((d) => d.endsWith(".ts"));
for (const kural of ["okuma", "yazma"] as const) {
  const kapsam = dosyalar.filter(KAPSAM[kural]);
  const taban = kural === "okuma" ? 80 : 30;
  kontrol(`${kural}: taban DOLU (${kapsam.length} ≥ ${taban})`, kapsam.length >= taban, kapsam.length);
  const ihlaller = kapsam.flatMap((ad) => kapiIhlalleri(ad, kaynakOku(`scripts/${ad}`), kural).map((i) => `${ad}: ${i}`));
  kontrol(`${kural}: kapıyı atlayan dosya YOK`, ihlaller.length === 0, ihlaller);
}
kosanBolumler.push("tarama");

// ── 4) ÇAKIŞMA TARAYICISI YAZMA KAPISINI GÖRÜYOR ──────────────────────────
console.log("\n4) mutasyon hedef tarayıcısı dayanikliYaz'ı tanıyor");
{
  const hedefler = kaynakOku("scripts/mutasyon-hedefleri.ts");
  kontrol("hedef deseni dayanikliYaz çağrısını da sayıyor",
    /\(\?:readFileSync\|writeFileSync\|dayanikliYaz\)/.test(hedefler));
}
kosanBolumler.push("hedef tarayıcısı");

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
  process.exit(1);
} else if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
