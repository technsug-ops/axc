import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  LİSTE ARAMASI — MUTASYON HARNESS'I (K289, 27.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run liste-aramasi-mutasyon:kontrol
 *  `liste-aramasi:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/liste-aramasi-dogrula.ts";
const BEKCI_BASLIGI = "LİSTE ARAMASI (K289)";
const KOSUL = "src/lib/gider-arama.ts";
const RAF = "src/app/ayarlar/konumlar/page.tsx";
const GIDER = "src/app/giderler/page.tsx";
const FILTRE = "src/app/giderler/filtre.tsx";
const LISTE = "src/lib/disa-aktarma/listeler.ts";
const TAZ = "src/app/tazminat/page.tsx";
const HAK = "src/app/hakedis/page.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - kosul yorumu", yon: "ZARARSIZ", dosya: KOSUL,
    bul: "/**\n * GİDER ARAMASI — TEK KOŞUL", koy: "/**\n * GIDER ARAMASI - TEK KOSUL", bozdugu: "hicbir sey" },
  { ad: "GIDER ARAMASI KART ADINI ARAMIYOR", yon: "KALDIRAN", dosya: KOSUL,
    bul: "      { creditCard: { label: { contains: e } } },\n", koy: "", bozdugu: "kartla odenen gider kart adindan bulunamaz" },
  { ad: "RAF LISTESI ARAMAYI YOK SAYIYOR", yon: "KALDIRAN", dosya: RAF,
    bul: "{gorunen.map((konum) => (", koy: "{konumlar.map((konum) => (", bozdugu: "arama yazilir, liste suzulmez" },
  { ad: "GIDER ARAMASI SORGUDA DEGIL (toplam aramaya uymaz)", yon: "KALDIRAN", dosya: GIDER,
    bul: "        ...giderAramaKosulu(arama),\n", koy: "", bozdugu: "toplam seridi aramadan bagimsiz kalir (Ilke #15)" },
  { ad: "EXCEL ARAMAYI TASIMIYOR", yon: "KALDIRAN", dosya: LISTE,
    bul: "      ...giderAramaKosulu(p.q),\n", koy: "", bozdugu: "indirilen Excel ekrandaki listeden farkli" },
  { ad: "AY/KATEGORI SUZGECI ARAMAYI SILIYOR", yon: "KALDIRAN", dosya: FILTRE,
    bul: '    if (arama) parametreler.set("q", arama);\n', koy: "", bozdugu: "ay degisince arama kaybolur" },
  { ad: "TAZMINAT BOS ARAMA 'HIC HASAR YOK' DIYOR", yon: "KALDIRAN", dosya: TAZ,
    bul: "{arama && gorunenBekleyen.length === 0 ? (", koy: "{false && gorunenBekleyen.length === 0 ? (", bozdugu: "arama sonucsuzken yanlis 'hic hasar yok' yazar" },
  { ad: "HAKEDIS PARTI ARAMASI SORGUDA DEGIL", yon: "KALDIRAN", dosya: HAK,
    bul: "where: { ...kanalKosulu, ...partiAramaKosulu(sp.pq) },", koy: "where: kanalKosulu,", bozdugu: "arama yazilir ama sonuc degismez" },
  { ad: "HAKEDIS PARTI ARAMASI ODEME ARAMASIYLA CAKISIYOR", yon: "FAZLADAN", dosya: HAK,
    bul: 'parametre="pq"', koy: 'parametre="q"', bozdugu: "iki arama ayni parametreyi yazar, biri otekini ezer" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nLISTE ARAMASI - MUTASYON TURU (K289)\n");
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
else console.log("\n  OK  Liste aramasi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
