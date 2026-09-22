import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  SATIR KARTI - MUTASYON HARNESS'I (K235, 22.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run satir-karti-mutasyon:kontrol
 *
 *  `satir-karti:dogrula` cogunlukla DEGER testi (govde cagriliyor) - ama bir
 *  deger testi de yanlis seyi olcuyor olabilir. UC YON: zararsiz - kaldiran -
 *  fazladan. Yesil test, sinanmis kontrol demek degildir.
 * ============================================================================
 */

const BEKCI = "scripts/satir-karti-dogrula.ts";
const GOVDE = "src/components/satir-karti.tsx";
const EKRAN = "src/app/tazminat/page.tsx";

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
    bul: "  /** Satırın kimliği: manşet tutar, ürün adı ya da bağlantı. */",
    koy: "  /** manşet. */",
    bozdugu: "hicbir sey - bu mutasyon YESIL kalmali",
  },
  {
    ad: "ACILIR OLCUTU GEVSEDI - bos dokum DUZ kutuya duser",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  if (acilir === undefined) {",
    koy: "  if (!acilir) {",
    bozdugu:
      "dokumu bos donen satir acilmaz gorunur; kullanici tiklar, hicbir sey olmaz - sessiz basarisizlik",
  },
  {
    ad: "BAGLAM SUZGECI DUSTU - null baglam ekranda 'null' yazar",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  const temizBaglam = (baglam ?? []).filter((b) => b !== null && b !== undefined && b !== false);",
    koy: "  const temizBaglam = baglam ?? [];",
    bozdugu:
      "kosullu baglam icin her ekranda disarida ayri dizi kurulur; unutulan yerde ekranda 'null' ve bos ayirac cikar",
  },
  {
    ad: "DOKUNMA HEDEFI KUCULDU - telefonda 56 px kalmadi",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: '      <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2">',
    koy: '      <div className="flex min-h-8 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2">',
    bozdugu: "Ilke #8: dokunulabilir her oge telefonda en az 44 px olmali",
  },
  {
    ad: "HER MANSET IRI - vurgu anlamini yitirir",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: '              : "leading-tight font-medium"',
    koy: '              : "text-lg leading-tight font-semibold tabular-nums"',
    bozdugu:
      "her satir bagirir; 'bu satirda onemli olan rakam' bilgisi kaybolur - hepsi vurguluysa hicbiri vurgulu degildir",
  },
  {
    ad: "CIFT RENDER GERI GELDI - ayni liste iki kez cizilir",
    yon: "FAZLADAN",
    dosya: EKRAN,
    bul: "                  sag={<TalepFormu hasar={h} bugun={bugun} />}",
    koy: "                  sag={<Table><ListeKarti /></Table>}",
    bozdugu:
      "masaustu tablo + telefon karti ikilisi geri doner; biri duzeltilip oteki unutulur (Ilke #10)",
  },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  /* Bekci kostuysa ozet satirlarindan biri MUTLAKA basilir. */
  const ciktiVar =
    cikti.includes("TÜM KONTROLLER GEÇTİ") || cikti.includes("KONTROL BAŞARISIZ");
  return { kod: r.status ?? 1, ciktiVar };
}

console.log("");
console.log("SATIR KARTI - MUTASYON TURU");
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
    writeFileSync(m.dosya, mutant, "utf8");
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) {
      bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`);
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    /* git checkout DEGIL: dosya commit edilmemis olabilir. */
    writeFileSync(m.dosya, asil, "utf8");
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
  console.log("\n  OK  Satir karti UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
