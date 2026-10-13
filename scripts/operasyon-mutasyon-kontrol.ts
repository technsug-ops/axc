import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  OPERASYON SERİSİ — MUTASYON HARNESS'I (K333, 11.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run operasyon-mutasyon:kontrol
 *  `operasyon:dogrula`nın K333 dişini sınar: pencere dışı kayıt kenar kovaya
 *  GİRMEZ. Kapı DÖRT döngüde ayrı ayrı sökülür — tek listeyle sınansaydı bir
 *  döngüyü eski hâline döndüren mutasyon kaçardı. ÜÇ YÖN: zararsız · kaldıran
 *  · fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 *  ⚠ KAPSAM BEYANI: yalnız K333 kapısı; bekçinin öteki ölçütleri bu turda
 *  mutasyonla sınanmıyor — «her şey sınandı» iddiası YOK.
 * ============================================================================
 */

const BEKCI = "scripts/operasyon-dogrula.ts";
const BEKCI_BASLIGI = "GÜNLÜK OPERASYON SERİSİ";
const GOVDE = "src/lib/panel/operasyon-serisi.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "bu kapıyı zaten taşıyordu; iki grafik aynı günleri sayar.", koy: "bu kapiyi zaten tasiyordu.", bozdugu: "hicbir sey" },
  /* Döngü başına çapa: her döngünün çağrısı dosyada TEK geçer (döngü değişkeni ayırır). */
  { ad: "SATIS DONGUSU KAPISIZ (K333 oncesi)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "const n = noktasi(s.tarih);", koy: "const n = dizin.get(kova(s.tarih, girdi.kirilim).anahtar);",
    bozdugu: "«01.02–17.02 · Satis 497» — 137'si 18–28 Subat" },
  { ad: "KARGO DONGUSU KAPISIZ", yon: "FAZLADAN", dosya: GOVDE,
    bul: "const n = noktasi(k.tarih);", koy: "const n = dizin.get(kova(k.tarih, girdi.kirilim).anahtar);",
    bozdugu: "kenar kovaya donem disi kargo sayilir" },
  { ad: "SIPARIS DONGUSU KAPISIZ", yon: "FAZLADAN", dosya: GOVDE,
    bul: "const n = noktasi(sp.tarih);", koy: "const n = dizin.get(kova(sp.tarih, girdi.kirilim).anahtar);",
    bozdugu: "kenar kovaya donem disi siparis sayilir" },
  { ad: "MAL KABUL DONGUSU KAPISIZ", yon: "FAZLADAN", dosya: GOVDE,
    bul: "const n = noktasi(a.tarih);", koy: "const n = dizin.get(kova(a.tarih, girdi.kirilim).anahtar);",
    bozdugu: "kenar kovaya donem disi mal kabul ve KDV'si sayilir" },
  { ad: "UST SINIR KAYIK (son gunden sonraki gun iceri)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "gun >= eksenBitHaric.getTime()) return undefined;", koy: "gun > eksenBitHaric.getTime()) return undefined;", bozdugu: "donemin ertesi gunu son kovaya sayilir" },
  { ad: "ALT SINIR KAYIK (ilk gun disari)", yon: "KALDIRAN", dosya: GOVDE,
    bul: "if (gun < eksenBas.getTime() ||", koy: "if (gun <= eksenBas.getTime() ||", bozdugu: "donemin ilk gunu hic sayilmaz" },
  { ad: "KAPI UTC GUNUNDEN (saat dilimi)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "const gun = gunDegeri(isTakvimGunu(tarih)).getTime();",
    koy: "const gun = Date.UTC(tarih.getUTCFullYear(), tarih.getUTCMonth(), tarih.getUTCDate());",
    bozdugu: "Istanbul'da ertesi gune gecmis gece satisi donemde sayilir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nOPERASYON SERISI - MUTASYON TURU (K333, 11.10.2026)\n");
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
