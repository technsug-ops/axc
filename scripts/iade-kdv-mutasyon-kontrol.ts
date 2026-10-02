import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  İADE — ALIŞ KDV'Sİ GERİ ALINIR — MUTASYON HARNESS'İ (02.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run iade-kdv-mutasyon:kontrol
 *
 *  Vaka: TY 11629354592 — iade NET-2 +0,06 yazıyordu, olması gereken −384,94;
 *  canlıda 231 iade, NET-2 ₺79.077 fazla. ZARARSIZ yeşil kalmalı; öteki her
 *  mutasyon KIRMIZI yanmalı. Harness mutasyonun UYGULANDIĞINI doğrular,
 *  bekçinin başlığını görmeden «kırmızı» saymaz.
 * ============================================================================
 */

const BEKCI = "scripts/iade-dogrula.ts";
/** iade-dogrula ayrı bir başlık basmıyor; ilk bölüm başlığı koşumun kanıtı. */
const BEKCI_BASLIGI = "1) ÜÇ SENARYO";
const GOVDE = "src/lib/iade.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "let maliyetKdvIptali = 0; // stoğa dönen malın alış KDV'si -> ödenecek artar", koy: "let maliyetKdvIptali = 0; // alış KDV'si",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "ALIS KDV'SI ODENECEKE GIRMIYOR (eski kusur)", yon: "KALDIRAN", dosya: GOVDE,
    bul: "    odemeGideriKdvIptali +\n    maliyetKdvIptali -", koy: "    odemeGideriKdvIptali -",
    bozdugu: "ayni alis KDV'si iki kez dusulur; iade NET-2'si 385 TL fazla gorunur (olculen vaka)" },
  { ad: "ALIS KDV'SI HIC TOPLANMIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "        maliyetKdvIptali += kdvAyir(kalem.maliyet * saglamOran, kalem.kdvOrani);\n", koy: "",
    bozdugu: "kural sessizce sifira duser" },
  { ad: "HASARLI MALIN KDV'SI DE GERI ALINIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "kdvAyir(kalem.maliyet * saglamOran, kalem.kdvOrani)", koy: "kdvAyir(kalem.maliyet * oran, kalem.kdvOrani)",
    bozdugu: "stoga donmeyen malin KDV'si geri alinir; hasarli iadede NET-2 olmayan bir KDV borcu yazar" },
  { ad: "ORAN SABIT %20 (urun orani yok sayiliyor)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "kdvAyir(kalem.maliyet * saglamOran, kalem.kdvOrani)", koy: "kdvAyir(kalem.maliyet * saglamOran, 20) + 0 * kalem.kdvOrani",
    bozdugu: "%10'luk urunde satis tarafiyla farkli oranla geri alinir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nİADE ALIŞ KDV — MUTASYON TURU\n");

let dogru = 0;
const yanlis: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(`${m.ad}\n       desen ${adet} kez geçiyor (1 olmalı) — ${m.dosya}`);
    continue;
  }
  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) {
      bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`);
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    dayanikliYaz(m.dosya, asil);
  }
  const isaret = m.yon === "KALDIRAN" ? "-" : m.yon === "FAZLADAN" ? "+" : "o";
  if (!sonuc.ciktiVar) {
    bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
  } else if ((m.yon === "ZARARSIZ") === (sonuc.kod === 0)) {
    dogru++;
    console.log(`  OK  ${isaret} ${m.ad}`);
  } else {
    yanlis.push(m.yon === "ZARARSIZ" ? `${m.ad}\n       zararsız mutasyon KIRMIZI yandı — bekçi yalancı kırmızı üretiyor` : `${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
  }
}

console.log("");
for (const k of yanlis) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(`\n  ${dogru}/${MUTASYONLAR.length} mutasyon beklendiği gibi davrandı`);
if (yanlis.length || bozuk.length) {
  console.log("\n  Beklenmeyen ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  OK  İade alış KDV kuralı İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
