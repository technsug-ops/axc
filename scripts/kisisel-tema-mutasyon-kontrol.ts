import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KİŞİSEL TEMA — MUTASYON HARNESS'I (07.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run kisisel-tema-mutasyon:kontrol
 *  `kisisel-tema:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/kisisel-tema-dogrula.ts";
const BEKCI_BASLIGI = "KİŞİSEL TEMA (07.10.2026)";
const GOVDE = "src/lib/marka/kisisel-tema.ts";
const SECICI = "src/components/tema-secici.tsx";
const DUZEN = "src/app/layout.tsx";
const KURESEL = "src/app/globals.css";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - govde yorumu", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "/** WCAG göreli parlaklık. */", koy: "/** Göreli parlaklık. */", bozdugu: "hicbir sey" },
  { ad: "ACIK TON OLCULMUYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: '    if (kontrastOrani(adayHex, "#FFFFFF") >= KONTRAST_ESIGI && kontrastOrani(adayHex, acikTon(aday)) >= KONTRAST_ESIGI) {',
    koy: '    if (kontrastOrani(adayHex, "#FFFFFF") >= KONTRAST_ESIGI) {', bozdugu: "aktif menu yazisi acik zeminde okunmaz" },
  { ad: "ESIK GEVSEDI", yon: "KALDIRAN", dosya: GOVDE,
    bul: "export const KONTRAST_ESIGI = 4.5;", koy: "export const KONTRAST_ESIGI = 3;", bozdugu: "sari bile gecer, beyaz yazi okunmaz" },
  { ad: "HER RENK KOYULASIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  for (let oran = 0; oran <= 1.0001; oran += 0.04) {", koy: "  for (let oran = 0.04; oran <= 1.0001; oran += 0.04) {", bozdugu: "secilen hazir renk bile degisir" },
  { ad: "KOSE SINIRSIZ", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  return Math.round(Math.min(KOSE_SINIRI.ust, Math.max(KOSE_SINIRI.alt, n)));", koy: "  return Math.round(n);", bozdugu: "kartlar daire olur" },
  { ad: "LOGO RENGI TEMAYA GIRDI", yon: "FAZLADAN", dosya: GOVDE,
    bul: '  "--se-odak-golge",\n', koy: '  "--se-odak-golge",\n  "--se-kabuk-marka",\n', bozdugu: "marka logosu kullanici rengine boyanir" },
  { ad: "BETIK DESENSIZ YAZIYOR", yon: "KALDIRAN", dosya: DUZEN,
    bul: 'if(typeof v==="string"&&r.test(v)){', koy: 'if(typeof v==="string"){', bozdugu: "bozuk kayit html'e stil basar" },
  { ad: "KISISELDEN CIKINCA RENK KALIYOR", yon: "KALDIRAN", dosya: SECICI,
    bul: '  kisiselDegiskenleriYaz(tema === "kisisel" ? kisisel : null);', koy: "  kisiselDegiskenleriYaz(kisisel);", bozdugu: "kobalta donen eski rengi gorur" },
  { ad: "KOYULASMA SESSIZ", yon: "KALDIRAN", dosya: SECICI,
    bul: "              {sonuc.koyulasti ? (", koy: "              {false ? (", bozdugu: "kullanici sectigi rengin degistigini bilmez" },
  { ad: "DUGME KOSESI SABIT", yon: "KALDIRAN", dosya: KURESEL,
    bul: "    border-radius: calc(var(--radius) * 2 / 3);\n}\n[data-slot=\"input\"]", koy: "    border-radius: 8px;\n}\n[data-slot=\"input\"]", bozdugu: "kose ayari dugmelere islemez" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nKISISEL TEMA - MUTASYON TURU (07.10.2026)\n");
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
else console.log("\n  OK  Kisisel tema UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
