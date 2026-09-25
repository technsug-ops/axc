import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  TAZMINAT TUTARI - MUTASYON HARNESS'I (K238, 23.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run tazminat-mutasyon:kontrol
 *
 *  ⛔ NIYE DOGDU: dort tazminat talebi deftere TAM x10.000 yazildi
 *  (799,91 -> 7.999.100). Iki yari ayri ayri DOGRUYDU ve ayri ayri
 *  sinaniyordu; kimse ARADAKI BAGI olcmemisti. Bu harness, o bagi olcen
 *  yeni olcutlerin GERCEKTEN isirdigini gosterir - ilki tam hatanin
 *  kendisini geri getirir.
 * ============================================================================
 */

const BEKCI = "scripts/tazminat-dogrula.ts";
const GOVDE = "src/lib/tazminat.ts";
const EYLEM = "src/app/tazminat/actions.ts";

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
    ad: "ZARARSIZ - yalniz yorum degisti (harness saglamasi)",
    yon: "ZARARSIZ",
    dosya: GOVDE,
    bul: " * Bir hasar kaynağı için HENÜZ TALEP EDİLMEMİŞ adet.",
    koy: " * kalan adet.",
    bozdugu: "hicbir sey - bu mutasyon YESIL kalmali",
  },
  {
    /* ⛔ HATANIN TA KENDISI: 23.09.2026'da dort talebi x10.000 yazan kod. */
    ad: "HATA GERI GELDI - nokta binlik ayiraci sanilip siliniyor (x10.000)",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  return sayiCoz(metin) ?? Number.NaN;",
    koy: '  const s = metin.replace(/\\./g, "").replace(",", "."); return s === "" ? Number.NaN : Number(s);',
    bozdugu:
      "form '799.9100' yazar, sunucu 7999100 okur - dort talepte yasanan tam bu; GERCEK NET 8 milyon TL sisti",
  },
  {
    ad: "TR BICIMI KIRILDI - kullanici '1.234,56' yazinca sayi bozulur",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  return sayiCoz(metin) ?? Number.NaN;",
    koy: "  return Number(metin);",
    bozdugu:
      "elle Turkce bicim yazan kullanicinin tutari NaN olur ya da yanlis okunur - iki bicim de kabul edilmeliydi",
  },
  {
    ad: "BOS ALAN SIFIR SAYILIYOR - 'tutar sayi olmali' hic demez",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: '  if (metin === "") return Number.NaN;',
    koy: '  if (metin === "") return 0;',
    bozdugu:
      "bos birakilan tutar sessizce 0 TL talep olur; zod uyarisi hic gorunmez (bilinmeyen sifir sayilmaz)",
  },
  {
    ad: "EYLEM KENDI COZUCUSUNU KURDU - ayrisma geri doner",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: '    amount: talepTutariniCoz(formData.get("amount")),',
    koy: '    amount: Number(String(formData.get("amount") ?? "").replace(/\\./g, "")),',
    bozdugu:
      "iki yerde iki cozucu olur; biri duzeltilip oteki unutulur - K238'in kok sebebi",
  },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  const ciktiVar =
    cikti.includes("TÜM KONTROLLER GEÇTİ") || cikti.includes("KONTROL BAŞARISIZ");
  return { kod: r.status ?? 1, ciktiVar };
}

console.log("");
console.log("TAZMINAT TUTARI - MUTASYON TURU");
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
    bozuk.push(`${m.ad}\n       desen ${m.dosya} icinde ${adet} kez geciyor (1 olmali)`);
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
      bozuk.push(`${m.ad}\n       bekci COKTU (ozet basilmadi) - olcum gecersiz`);
    } else {
      kacan.push(`${m.ad}\n       YALANCI KIRMIZI: zararsiz degisiklik bekciyi kirmizi yakti`);
    }
    continue;
  }

  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log(`  OK  ${isaret} ${m.ad}`);
  } else if (sonuc.kod !== 0) {
    bozuk.push(`${m.ad}\n       bekci COKTU (ozet basilmadi) - olcum gecersiz`);
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
  console.log("\n  OK  Tazminat tutari UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
