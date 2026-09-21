import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KARGO TARIFESI KANAL YETENEGI - MUTASYON HARNESS'I (K229, 21.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run kargo-tarifesi-mutasyon:kontrol
 *
 *  NIYE ZORUNLU: bu katmanin bozulmasi SESSIZDIR. Kanal adla aranirsa kayit
 *  bulunamaz ve yukleme "kanal yok" der; bir kanalin okuyucusu yanlis beyan
 *  edilirse ekran tutamayacagi bir soz verir; gecen gun yanlis hesaplanirsa
 *  iki aylik bir tarife "bugun yuklendi" gibi gorunur. Ucu de ekranda MAKUL
 *  gorunur.
 *
 *  UC YON AYRI SINANIR: zararsiz (yesil kalmali) - kaldiran - fazladan.
 * ============================================================================
 */

const BEKCI = "scripts/kargo-tarife-pdf-dogrula.ts";
const BEKCI_BASLIGI = "K229 - KANAL YETENEGI";

const YETENEK = "src/lib/kargo/kanal-yetenegi.ts";
const YAZICI = "src/lib/kargo-tarife-pdf/yaz.ts";

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
    dosya: YETENEK,
    bul: "/** Gün farkı — saat farkından değil, TAM GÜNDEN. */",
    koy: "/** Gün farkı: tam gün. */",
    bozdugu: "hicbir sey - bu mutasyon YESIL kalmali",
  },
  {
    ad: "KANAL YENIDEN ADLA ARANIYOR - K13b dersinin geri gelmesi",
    yon: "KALDIRAN",
    dosya: YAZICI,
    bul: 'where: { code: "HEPSIBURADA" },',
    koy: 'where: { name: { contains: "Hepsiburada" } },',
    bozdugu:
      "ad bir ETIKETTIR ve 'Hepsiburada - AXCALI' gibi ureyebilir; eslesme tutmaz, yukleme 'kanal yok' der ve sebebi gorunmez",
  },
  {
    ad: "OKUYUCU BEYANI BOSALDI",
    yon: "KALDIRAN",
    dosya: YETENEK,
    bul: '  "HEPSIBURADA",\n];',
    koy: '];',
    bozdugu:
      "hicbir kanalda yukleme kutusu cizilmez; calisan tek yol (HB PDF) ekrandan kaybolur",
  },
  {
    ad: "OKUYUCU HER KANALDA VAR SAYILIYOR",
    yon: "FAZLADAN",
    dosya: YETENEK,
    bul: "  return KARGO_OKUYUCUSU_OLAN_KANAL_KODLARI.includes(kanalKodu.toUpperCase());",
    koy: "  return kanalKodu.length > 0;",
    bozdugu:
      "N11 ve TY kartlarinda yukleme kutusu acilir; okuyucu YOK, yuklenen her dosya duser - ekran tutamayacagi bir soz verir",
  },
  {
    ad: "TARIFE YOKKEN 0 GUN DONUYOR",
    yon: "FAZLADAN",
    dosya: YETENEK,
    bul: "  if (sonTarife === null) return null;",
    koy: "  if (sonTarife === null) return 0;",
    bozdugu:
      "hic tarifesi olmayan kanal 'bugun yuklendi' gibi gorunur; en tehlikeli yanlis, cunku EN IYI haberi verir",
  },
  {
    ad: "NEGATIF GUN YAZILIYOR - gelecek tarihli tarife",
    yon: "KALDIRAN",
    dosya: YETENEK,
    bul: "  return Math.max(0, Math.floor(fark / 86_400_000));",
    koy: "  return Math.floor(fark / 86_400_000);",
    bozdugu:
      "ileri tarihli bir tarifede ekran '-9 gun gecti' yazar; sayi anlamsiz olur ve okuyan rakama guvenmeyi birakir",
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
console.log("KARGO TARIFESI KANAL YETENEGI - K229 MUTASYON TURU");
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
  console.log("\n  OK  Kargo kanal yetenegi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
