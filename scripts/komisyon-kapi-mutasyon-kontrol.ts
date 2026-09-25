import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KOMISYON YUKLEYICISI KIMLIK KAPISI - MUTASYON HARNESS'I (22.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run komisyon-kapi-mutasyon:kontrol
 *
 *  NIYE ZORUNLU: bu yukleyici ESLEME YARATIYOR ve 21.09'a kadar kapisi
 *  yoktu. Bozulmasi sessizdir: "N yeni esleme acildi" der, ve bir kod iki
 *  varyanta birden uyar hale gelir. K231'in dogus yolu tam buydu.
 *
 *  Bekci DEGER testi (komisyon:dogrula 10. bolum, govde cagrilir); burasi o
 *  testin dislerini sinar. UC YON: zararsiz - kaldiran - fazladan.
 * ============================================================================
 */

const BEKCI = "scripts/komisyon-dogrula.ts";
const BEKCI_BASLIGI = "10) KIMLIK KAPISI";
const PLAN = "src/lib/komisyon/plan.ts";

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
    dosya: PLAN,
    bul: "  /** Bu varyanta BÜTÜN hesaplarda bağlı kanal kodları. */",
    koy: "  /** Kanal kodlari. */",
    bozdugu: "hicbir sey - bu mutasyon YESIL kalmali",
  },
  {
    ad: "KAPI DUSTU - baskasinin kimligi kanal kodu olarak yazilir",
    yon: "KALDIRAN",
    dosya: PLAN,
    bul: "      if (sahip !== undefined && sahip.id !== varyant.id) {",
    koy: "      if (false) {",
    bozdugu:
      "HBCV kodu ikinci varyanta kanal kodu olarak baglanir - K231'in dogus yolu, toplu halde",
  },
  {
    ad: "DIZIN DARALDI - firmaSku ve baska kanal kodlari kimlik sayilmiyor",
    yon: "KALDIRAN",
    dosya: PLAN,
    bul: "    const kodlar = [v.sku, v.firmaSku ?? \"\", v.barkod ?? \"\", ...(v.kanalKodlari ?? [])];",
    koy: "    const kodlar = [v.sku, v.barkod ?? \"\"];",
    bozdugu:
      "Firma SKU ya da HB kodu olan bir deger N11 kanal kodu olarak yazilabilir - dort rolun ikisi korumasiz",
  },
  {
    ad: "KAPI KENDINI DE REDDEDIYOR - hedefin kendi barkodu suc sayiliyor",
    yon: "FAZLADAN",
    dosya: PLAN,
    bul: "      if (sahip !== undefined && sahip.id !== varyant.id) {",
    koy: "      if (sahip !== undefined) {",
    bozdugu:
      "barkodu kanal kodu olarak kullanan HER yeni esleme duser - en yaygin durum kilitlenir",
  },
  {
    ad: "CAKISAN KOD DIZINDE KALDI - son gelen kazaniyor (sessiz secim)",
    yon: "FAZLADAN",
    dosya: PLAN,
    bul: "  for (const kod of kimlikCakisik) kimlikSahibi.delete(kod);",
    koy: "",
    bozdugu:
      "iki varyanta dusen kod icin rastgele biri 'sahip' sayilir ve masum satir suclanir - 21.09'da kapatilan arizanin kilik degistirmis hali",
  },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("");
console.log("KOMISYON YUKLEYICISI KIMLIK KAPISI - MUTASYON TURU");
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
  console.log("\n  OK  Kimlik kapisi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
