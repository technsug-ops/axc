import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ÜRÜN LİSTESİ STOK SÜZGECİ — MUTASYON HARNESS'I (07.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run stok-suzgeci-mutasyon:kontrol
 *  `stok-suzgeci:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/stok-suzgeci-dogrula.ts";
const BEKCI_BASLIGI = "ÜRÜN LİSTESİ STOK SÜZGECİ (07.10.2026)";
const GOVDE = "src/lib/stok.ts";
const LISTE = "src/app/urunler/page.tsx";
const EXCEL = "src/lib/disa-aktarma/listeler.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - govde yorumu", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "/** Toplam stoğu > 0 olan ürünlerin kimlikleri (liste + Excel aynı gövdeden). */", koy: "/** Stoklu ürünler. */", bozdugu: "hicbir sey" },
  { ad: "SIFIR STOK STOKLU SAYILIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  return [...urunToplami].filter(([, t]) => t > 0).map(([id]) => id);", koy: "  return [...urunToplami].filter(([, t]) => t >= 0).map(([id]) => id);", bozdugu: "stoksuz urunler gizlenmez" },
  { ad: "EKSI VARYANT YOK SAYILIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "    urunToplami.set(urunId, (urunToplami.get(urunId) ?? 0) + v.toplam);", koy: "    urunToplami.set(urunId, (urunToplami.get(urunId) ?? 0) + Math.max(0, v.toplam));", bozdugu: "sutunda 0 gorunen urun listede kalir" },
  { ad: "ADRES DEGERI SINIRSIZ", yon: "FAZLADAN", dosya: GOVDE,
    bul: '  return ham === "var";', koy: "  return Boolean(ham);", bozdugu: "stok=0 gibi bir adres de suzer" },
  { ad: "LISTE SUZMUYOR", yon: "KALDIRAN", dosya: LISTE,
    bul: "tyKategori ? tyKategoriUrunKosulu(tyKategori) : {}, stokKosulu] };", koy: "tyKategori ? tyKategoriUrunKosulu(tyKategori) : {}] };", bozdugu: "dugme hicbir sey gizlemez" },
  { ad: "YENI ARAMA SUZGECI DUSURUYOR", yon: "KALDIRAN", dosya: LISTE,
    bul: '          ...(yalnizStoklu ? { [STOK_PARAMETRESI]: "var" } : {}),\n', koy: "", bozdugu: "arama yapinca stoksuzlar geri gelir" },
  { ad: "EXCEL SUZMUYOR", yon: "KALDIRAN", dosya: EXCEL,
    bul: "        stokSuzgeciCoz(p[STOK_PARAMETRESI]) ? { id: { in: await stokluUrunIdleri() } } : {},\n", koy: "", bozdugu: "ekranla Excel ayrisir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nSTOK SUZGECI - MUTASYON TURU (07.10.2026)\n");
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
else console.log("\n  OK  Stok suzgeci UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
