import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  BEKÇİ ALTYAPISI TEK KAPIDAN — MUTASYON HARNESS'I (K262 · K263, 25.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run bekci-kapisi-mutasyon:kontrol
 *
 *  `bekci-kapisi:dogrula`nın dişini sınar. Kilit mutasyonlar GERÇEK dosyalarda:
 *  bir bekçi kapıyı atlayıp `readFileSync`i yeniden içeri alır, bir harness
 *  `writeFileSync`i yeniden içeri alır — ikisi de KIRMIZI yanmalı. ÜÇ YÖN.
 * ============================================================================
 */

const BEKCI = "scripts/bekci-kapisi-dogrula.ts";
const BEKCI_BASLIGI = "BEKÇİ ALTYAPISI TEK KAPIDAN";
const KAPI = "scripts/kaynak-oku.ts";
const ORNEK_BEKCI = "scripts/alim-ekseni-dogrula.ts";
const ORNEK_HARNESS = "scripts/tazminat-mutasyon-kontrol.ts";
const HEDEFLER = "scripts/mutasyon-hedefleri.ts";

type Mutasyon = {
  ad: string;
  yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "ZARARSIZ - kapi yorumu degisti (harness saglamasi)",
    yon: "ZARARSIZ",
    dosya: KAPI,
    bul: "/** Saf gövde — değer testi bunu çağırır. */",
    koy: "/** Saf govde. */",
    bozdugu: "hicbir sey - YESIL kalmali",
  },
  {
    ad: "KAPI CRLF'I NORMALLESTIRMIYOR",
    yon: "KALDIRAN",
    dosya: KAPI,
    bul: '.replace(/\\r\\n?/g, "\\n")',
    koy: "",
    bozdugu: "ortasinda \\n tasiyan capa CRLF dosyada sessizce kirilir - kapi kagit uzerinde kalir",
  },
  {
    ad: "BIR BEKCI KAPIYI ATLADI (readFileSync geri geldi)",
    yon: "KALDIRAN",
    dosya: ORNEK_BEKCI,
    bul: 'import { kaynakOku } from "./kaynak-oku";',
    koy: 'import { readFileSync } from "node:fs";\nimport { kaynakOku } from "./kaynak-oku";',
    bozdugu: "yarin eklenen bekci cipak okur - satir sonu tuzagi geri doner",
  },
  {
    ad: "BIR HARNESS YAZMA KAPISINI ATLADI (writeFileSync geri geldi)",
    yon: "KALDIRAN",
    dosya: ORNEK_HARNESS,
    bul: 'import { readFileSync } from "node:fs";',
    koy: 'import { readFileSync, writeFileSync } from "node:fs";',
    bozdugu: "Windows kilidinde geri alma yazimi duser, mutant diskte kalir",
  },
  {
    ad: "HEDEF TARAYICISI dayanikliYaz'I TANIMIYOR",
    yon: "KALDIRAN",
    dosya: HEDEFLER,
    bul: "(?:readFileSync|writeFileSync|dayanikliYaz)",
    koy: "(?:readFileSync|writeFileSync)",
    bozdugu: "yalniz dayanikliYaz ile yazan harness'in hedefi gorunmez - cakisma bekcisi kor",
  },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("");
console.log("BEKCI ALTYAPISI TEK KAPIDAN - MUTASYON TURU (K262 · K263)");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(`${m.ad}\n       desen ${m.dosya} icinde ${adet} kez geciyor (1 olmali) - OLCULEMEDI`);
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
    /* git checkout DEGIL: dosya commit edilmemis olabilir. */
    dayanikliYaz(m.dosya, asil);
    if (readFileSync(m.dosya, "utf8") !== asil) {
      bozuk.push(`${m.ad}\n       GERI ALMA BASARISIZ - dosya mutasyonlu kaldi`);
    }
  }
  const isaret = m.yon === "ZARARSIZ" ? "o" : m.yon === "KALDIRAN" ? "-" : "+";
  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0 && sonuc.ciktiVar) {
      yakalanan++;
      console.log(`  OK  ${isaret} ${m.ad}`);
    } else if (!sonuc.ciktiVar) {
      bozuk.push(`${m.ad}\n       bekci COKTU (baslik basilmadi) - olcum gecersiz`);
    } else {
      kacan.push(`${m.ad}\n       YALANCI KIRMIZI: zararsiz degisiklik bekciyi kirmizi yakti`);
    }
    continue;
  }
  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log(`  OK  ${isaret} ${m.ad}`);
  } else if (sonuc.kod !== 0) {
    bozuk.push(`${m.ad}\n       bekci COKTU (baslik basilmadi) - olcum gecersiz`);
  } else {
    kacan.push(`${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
  }
}

console.log("");
if (kacan.length) {
  console.log("  KACAN MUTASYONLAR - bekci bunlari GORMEDI:\n");
  for (const k of kacan) console.log("  X  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI - mutasyon olculemedi:\n");
  for (const b of bozuk) console.log("  !! " + b);
  console.log("");
}
console.log(`  ${yakalanan}/${MUTASYONLAR.length} mutasyon beklendigi gibi davrandi`);
if (kacan.length || bozuk.length) {
  console.log("\n  Kacan ya da olculemeyen mutasyon var - bekci eksik.\n");
  process.exitCode = 1;
} else {
  console.log("\n  OK  Bekci altyapisi kapisi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
