import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KUTU BİÇİMİ — MUTASYON HARNESS'I (K330-③, 10.10.2026)
 *      npm run kutu-bicimi-mutasyon:kontrol
 *  `kutu-bicimi:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran · fazladan.
 * ============================================================================
 */
const BEKCI = "scripts/kutu-bicimi-dogrula.ts";
const BEKCI_BASLIGI = "KUTU BICIMI (K330-3, 10.10.2026)";
const CSS = "src/app/globals.css";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - kutu bicimi yorumu", yon: "ZARARSIZ", dosya: "src/lib/kutu-bicimi.ts",
    bul: " *  ile aynı: etiket 13 px orta kalınlık, rakam kalın + sabit genişlikli rakam.", koy: " *  ile aynı: etiket 13 px, rakam kalın.", bozdugu: "hicbir sey" },
  { ad: "KUCUK KOSELI KUTU KURALI KALKTI", yon: "KALDIRAN", dosya: CSS,
    bul: "        border-radius: var(--radius);\n        border-color: var(--se-kart-cizgi, transparent);", koy: "        border-color: var(--se-kart-cizgi, transparent);", bozdugu: "146 kutu eski koseli/golgesiz kalir" },
  { ad: "CIP/ETIKET DE KART OLDU", yon: "FAZLADAN", dosya: CSS,
    bul: ":where(div, section, article, aside, details, li, dl).rounded-md.border:is(.p-3, .p-4, .p-5, .p-6):not(.border-dashed) {\n        border-radius",
    koy: ":where(div, section, article, aside, details, li, dl).rounded-md.border:is(.px-2, .p-3, .p-4, .p-5, .p-6):not(.border-dashed) {\n        border-radius", bozdugu: "her etikete golge duser" },
  { ad: "GRI DOLGU KURALI KALKTI", yon: "KALDIRAN", dosya: CSS,
    bul: ".bg-muted\\/40 {\n    background-color: var(--card);\n}", koy: ".bg-muted\\/40 {\n}", bozdugu: "34 kutu gri kalir" },
  { ad: "GRI DOLGU KATMANA ALINDI (bg-* kazanir)", yon: "FAZLADAN", dosya: CSS,
    bul: ":where(div, section, article, aside, details, li, dl).border:is(.rounded-lg, .rounded-md).bg-muted\\/40 {\n    background-color: var(--card);\n}",
    koy: "@layer components {\n:where(div, section, article, aside, details, li, dl).border:is(.rounded-lg, .rounded-md).bg-muted\\/40 {\n    background-color: var(--card);\n}\n}", bozdugu: "kural yazili ama etkisiz" },
  { ad: "BAGLANTI KUTUSU KURALI KALKTI", yon: "KALDIRAN", dosya: CSS,
    bul: "    a.rounded-lg.border:not(.border-dashed) {\n        border-color: var(--se-kart-cizgi, transparent);\n        box-shadow: var(--se-golge-1);",
    koy: "    a.rounded-lg.border:not(.border-dashed) {\n        border-color: var(--se-kart-cizgi, transparent);",
    bozdugu: "tiklanir kutular gri zeminde cerceveli kalir" },
  { ad: "UYARI KUTUSU YINE SARI DOLGU", yon: "FAZLADAN", dosya: "src/lib/renkler.ts",
    bul: "  uyari: `${DURUM_SERIDI.uyari} bg-card ${DURUM_KUTU_YAZISI.uyari}`,", koy: "  uyari: `${DURUM_SERIDI.uyari} ${DURUM_ZEMINI.uyari}`,", bozdugu: "sari duvar geri doner" },
  { ad: "HATA KUTUSU SERITSIZ", yon: "KALDIRAN", dosya: "src/lib/renkler.ts",
    bul: "  olumsuz: `${DURUM_SERIDI.olumsuz} bg-card ${DURUM_KUTU_YAZISI.olumsuz}`,", koy: "  olumsuz: `bg-card ${DURUM_KUTU_YAZISI.olumsuz}`,", bozdugu: "hata kutusu siradan karttan ayirt edilmez" },
  { ad: "KART BASLIGI KUCULDU", yon: "KALDIRAN", dosya: CSS,
    bul: "[data-slot=\"card-title\"] {\n    font-size: 1rem;", koy: "[data-slot=\"card-title\"] {\n    font-size: 0.875rem;", bozdugu: "basliklar iki boyda" },
  { ad: "LISTE KARTI YINE rounded-xl", yon: "KALDIRAN", dosya: "src/components/liste-karti.tsx",
    bul: "bg-card min-w-0 space-y-2.5 rounded-lg border p-3", koy: "bg-card min-w-0 space-y-2.5 rounded-xl border p-3", bozdugu: "telefon liste kartlari temaya girmez" },
  { ad: "HAKEDIS ETIKETI ESKIYE DONDU", yon: "KALDIRAN", dosya: "src/app/hakedis/page.tsx",
    bul: "      <div className={KUTU_ETIKETI}>{etiket}</div>", koy: "      <div className=\"text-muted-foreground text-xs\">{etiket}</div>", bozdugu: "hakedis kutulari farkli dilde" },
  { ad: "IADE RAKAMI YARI KALINA DONDU", yon: "FAZLADAN", dosya: "src/app/iadeler/page.tsx",
    bul: "      <div className={`text-2xl ${KUTU_RAKAMI}`}>{deger}</div>", koy: "      <div className={`text-2xl font-semibold ${KUTU_RAKAMI}`}>{deger}</div>", bozdugu: "rakam iki agirlikta" },
  { ad: "NAKIT OZETI RAKAMI ORTAK BICIMDEN KOPTU", yon: "KALDIRAN", dosya: "src/app/nakit-ozeti.tsx",
    bul: "leading-tight break-words ${KUTU_RAKAMI} ${DURUM_YAZISI[durum]}", koy: "leading-tight break-words font-semibold tabular-nums ${DURUM_YAZISI[durum]}", bozdugu: "panel nakit kutulari farkli dilde" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nKUTU BICIMI - MUTASYON TURU (K330-3, 10.10.2026)\n");
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
else console.log("\n  OK  Kutu bicimi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
