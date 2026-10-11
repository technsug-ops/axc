import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KISA ÖNBELLEK — MUTASYON HARNESS'I (11.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run kisa-onbellek-mutasyon:kontrol
 *  `kisa-onbellek:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/kisa-onbellek-dogrula.ts";
const BEKCI_BASLIGI = "KISA ONBELLEK (K332, 11.10.2026)";
const GOVDE = "src/lib/kisa-onbellek.ts";
const PANEL = "src/app/page.tsx";
const BI = "src/app/panel-bi.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "/** Bellek tavanı — dönem/kanal birleşimleri sınırsız büyümesin; en eski kayıt düşer. */", koy: "/** Bellek tavani. */", bozdugu: "hicbir sey" },
  { ad: "SURE HIC DOLMUYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  if (kayit && kayit.bitis > simdi) {", koy: "  if (kayit) {", bozdugu: "panel rakami sunucu yeniden baslayana kadar donar" },
  { ad: "HATA ONBELLEKTE KALIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "    if (depo.get(anahtar)?.sonuc === sonuc) depo.delete(anahtar);\n", koy: "", bozdugu: "bir kez dusen blok 2 dk boyunca hep hata verir" },
  { ad: "ANAHTARDAN FIRMA DUSTU", yon: "FAZLADAN", dosya: PANEL,
    bul: "kisaOnbellek(`vitrin:${panelFirmasi}`, PANEL_ONBELLEK_MS, vitrinKutusunuTopla)", koy: "kisaOnbellek(`vitrin`, PANEL_ONBELLEK_MS, vitrinKutusunuTopla)", bozdugu: "cok firmada bir firmanin rakami otekine gider" },
  { ad: "IS ZEKASI SAATI YAZMIYOR", yon: "KALDIRAN", dosya: BI,
    bul: "        <OnbellekNotu an={biOnbellegi.an} />\n", koy: "", bozdugu: "eski rakam taze gibi gorunur" },
  { ad: "SURE 10 DAKIKA", yon: "FAZLADAN", dosya: GOVDE,
    bul: "export const PANEL_ONBELLEK_MS = 2 * 60 * 1000;", koy: "export const PANEL_ONBELLEK_MS = 10 * 60 * 1000;", bozdugu: "kullanici karari 2 dk, rakam 10 dk eski kalir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nKISA ONBELLEK - MUTASYON TURU (11.10.2026)\n");
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
else console.log("\n  OK  Kisa onbellek UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
