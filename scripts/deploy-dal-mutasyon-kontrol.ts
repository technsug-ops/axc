import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  DEPLOY EDİLMEYEN DAL MUAFİYETİ — MUTASYON HARNESS'I (09.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run deploy-dal-mutasyon:kontrol
 *  `deploy-dal:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran · fazladan.
 * ============================================================================
 */

const BEKCI = "scripts/deploy-dal-dogrula.ts";
const BEKCI_BASLIGI = "DEPLOY EDİLMEYEN DAL MUAFİYETİ (09.10.2026)";
const GOVDE = "scripts/deploy-bekci.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GOVDE,
    bul: " *  DEPLOY EDİLMEYEN DAL — B KATMANI ENGEL DEĞİL BİLGİ (09.10.2026)", koy: " *  DEPLOY EDİLMEYEN DAL — B KATMANI ENGEL DEĞİL BİLGİ (09.10.2026) ·", bozdugu: "hicbir sey" },
  { ad: "HER DAL MUAF (main de)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  return Object.prototype.hasOwnProperty.call(ayar, dal) && (ayar as Record<string, unknown>)[dal] === false;",
    koy: "  return true;", bozdugu: "main'de canlida kosmamis migration deploy edilir - 8cb0023 vakasi" },
  { ad: "BILINMEYEN DAL MUAF", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  if (!dal) return false;", koy: "  if (!dal) return true;", bozdugu: "ayrik HEAD'de kapi acilir" },
  { ad: "DESEN DE KABUL", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  return Object.prototype.hasOwnProperty.call(ayar, dal) && (ayar as Record<string, unknown>)[dal] === false;",
    koy: "  return Object.entries(ayar as Record<string, unknown>).some(([k, v]) => v === false && dal.startsWith(k.replace(\"*\", \"\")));",
    bozdugu: "genis desen main'i muaf tutabilir" },
  { ad: "A VE H DE MUAF", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  const bulgular = [...a, ...h, ...(bBilgi ? [] : b)];", koy: "  const bulgular = bBilgi ? [] : [...a, ...h, ...b];", bozdugu: "semasi yazilmamis migration da gecer" },
  { ad: "MUAFIYET HIC UYGULANMIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  const bulgular = [...a, ...h, ...(bBilgi ? [] : b)];", koy: "  const bulgular = [...a, ...h, ...b];", bozdugu: "dalin push kapisi sonsuza kadar kirmizi" },
  { ad: "MUAFIYET SESSIZ", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  if (bBilgi) {\n    console.log(`  ⓘ  bu dal", koy: "  if (false) {\n    console.log(`  ⓘ  bu dal", bozdugu: "B neden durdurmadi, ekranda yazmaz" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nDEPLOY DAL MUAFIYETI - MUTASYON TURU (09.10.2026)\n");
let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];
for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const n = asil.split(bul).length - 1;
  if (n !== 1) { bozuk.push(`${m.ad}\n       desen ${m.dosya} icinde ${n} kez geciyor (1 olmali) - OLCULEMEDI`); continue; }
  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) { bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`); continue; }
    sonuc = bekciyiKostur();
  } finally {
    dayanikliYaz(m.dosya, asil);
    if (readFileSync(m.dosya, "utf8") !== asil) bozuk.push(`${m.ad}\n       GERI ALMA BASARISIZ - dosya mutasyonlu kaldi`);
  }
  const isaret = m.yon === "ZARARSIZ" ? "o" : m.yon === "KALDIRAN" ? "-" : "+";
  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0 && sonuc.ciktiVar) { yakalanan++; console.log(`  OK  ${isaret} ${m.ad}`); }
    else if (!sonuc.ciktiVar) bozuk.push(`${m.ad}\n       bekci COKTU - olcum gecersiz`);
    else kacan.push(`${m.ad}\n       YALANCI KIRMIZI`);
    continue;
  }
  if (sonuc.kod !== 0 && sonuc.ciktiVar) { yakalanan++; console.log(`  OK  ${isaret} ${m.ad}`); }
  else if (sonuc.kod !== 0) bozuk.push(`${m.ad}\n       bekci COKTU (baslik basilmadi) - olcum gecersiz`);
  else kacan.push(`${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
}
console.log("");
for (const k of kacan) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(`\n  ${yakalanan}/${MUTASYONLAR.length} mutasyon beklendigi gibi davrandi`);
if (kacan.length || bozuk.length) { console.log("\n  Kacan ya da olculemeyen mutasyon var - bekci eksik.\n"); process.exitCode = 1; }
else console.log("\n  OK  Deploy dal muafiyeti UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
