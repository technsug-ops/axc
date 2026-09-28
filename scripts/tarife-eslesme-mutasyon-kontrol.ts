import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  TARİFE EŞLEŞMESİ — MUTASYON HARNESS'I (K298, 28.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run tarife-eslesme-mutasyon:kontrol
 *  `tarife:dogrula`nın «dört rol, bütün kanallar» ve K298 (okuma anında bugünkü
 *  katalogla eşleşme) ölçütlerinin dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/tarife-dogrula.ts";
const BEKCI_BASLIGI = "TARIFE ESLESME KAPSAMI";
const KURAL = "src/lib/komisyon/tarife-eslesme.ts";
const EKRAN = "src/app/tarife/page.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - kural yorumu", yon: "ZARARSIZ", dosya: KURAL,
    bul: "/** Tek kod: önce kanal, sonra kimlik dizini (`tarifePlaniKur` ile aynı sıra). */", koy: "/** Tek kod. */", bozdugu: "hicbir sey" },
  { ad: "CAKISAN KOD YINE BAGLANIYOR (sessiz secim)", yon: "FAZLADAN", dosya: KURAL,
    bul: "    for (const kod of cakisan) harita.delete(kod);\n", koy: "", bozdugu: "iki urune uyan kod ilk gelene baglanir" },
  { ad: "KANAL/KIMLIK CAKISMASI ELENMIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: "      kanalDizini.delete(kod);\n      kimlikDizini.delete(kod);\n", koy: "", bozdugu: "kanal kodu ile barkod farkli urunu gosterirken biri sessizce kazanir" },
  { ad: "EKRAN BAGSIZ SATIRI BUGUNKU KATALOGLA COZMUYOR", yon: "KALDIRAN", dosya: EKRAN,
    bul: "        g.katalogda = true;\n        g.bugunEslesti = true;\n", koy: "", bozdugu: "Philips yine «katalogda yok» der" },
  { ad: "EKRAN FOTOGRAFA YAZIYOR", yon: "FAZLADAN", dosya: EKRAN,
    bul: "    const dizinler = await bugunkuTarifeDizinleri(tarife.channelAccountId);\n",
    koy: "    const dizinler = await bugunkuTarifeDizinleri(tarife.channelAccountId);\n    await prisma.komisyonTarifeKalemi.updateMany({ where: { tarifeId: tarife.id, variantId: null }, data: {} });\n",
    bozdugu: "yukleme aninin fotografi ekran acilinca degisir - denetim bozulur" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nTARIFE ESLESMESI - MUTASYON TURU (K298)\n");
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
else console.log("\n  OK  Tarife eslesmesi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
