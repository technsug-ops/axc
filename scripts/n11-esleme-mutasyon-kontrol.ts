import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  N11 ESLESTIRME BETIGI - MUTASYON HARNESS'I (22.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run n11-esleme-mutasyon:kontrol
 *
 *  Bekci kaynak tariyor; taradigi desenin DAVRANISA bagli oldugunu ancak
 *  mutasyon gosterir. UC YON: zararsiz - kaldiran - fazladan.
 * ============================================================================
 */

const BEKCI = "scripts/n11-esleme-dogrula.ts";
const BEKCI_BASLIGI = "N11 EŞLEŞTİRME — BEKÇİ";
const BETIK = "scripts/canli-n11-esle.ts";

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
    dosya: BETIK,
    bul: "    /** Hedef: barkod ya da stockCode ile TEK varyant. */",
    koy: "    /** hedef. */",
    bozdugu: "hicbir sey - bu mutasyon YESIL kalmali",
  },
  {
    ad: "K231 KAPISI DUSTU - baskasinin kodu esleme olarak acilir",
    yon: "KALDIRAN",
    dosya: BETIK,
    bul: "    if (baskasi) { cakisan.push({ stockCode: l.stockCode, sebep: `${baskasi.sku} (${baskasi.ad.slice(0, 40)})` }); continue; }",
    koy: "    if (false) { cakisan.push({ stockCode: l.stockCode, sebep: `${baskasi?.sku}` }); continue; }",
    bozdugu:
      "bir kod iki varyanta birden baglanir - 21.09'da uc ikizi doguran adimin ta kendisi, 58 kez",
  },
  {
    ad: "COK ESLESME YINE DE ACILIYOR - ilk aday sessizce secilir",
    yon: "KALDIRAN",
    dosya: BETIK,
    bul: "    if (adaylar.size > 1 || !adayBilgi) { cokEslesme.push(l); continue; }",
    koy: "    if (!adayBilgi) { cokEslesme.push(l); continue; }",
    bozdugu:
      "barkodu iki varyanta uyan listeleme ilk bulunana baglanir - findFirst'un sessiz secimi geri gelir",
  },
  {
    ad: "IKINCI KAYNAK YAZILIYOR - komisyon orani API'den defter'e",
    yon: "FAZLADAN",
    dosya: BETIK,
    bul: "      data: { channelAccountId: hesap.id, variantId: a.variantId, channelSku: a.stockCode },",
    koy: "      data: { channelAccountId: hesap.id, variantId: a.variantId, channelSku: a.stockCode, commissionRate: null },",
    bozdugu:
      "komisyon oraninin iki kaynagi olur (dosya yukleyici + API); hangisinin kazandigi belirsizlesir",
  },
  {
    ad: "GERI ALMA OLCULMUS SATIRI DA SILIYOR",
    yon: "FAZLADAN",
    dosya: BETIK,
    bul: "        listelemeDurumu: \"BILINMIYOR\",\n        kanalOlcumAt: null,",
    koy: "",
    bozdugu:
      "senkron bir kez kostuktan sonra geri alma, olculmus 58 kaydi siler - geri alma bir yazimdir ve ayni disipline tabidir",
  },
  {
    ad: "KURU KOSUM KAPISI DUSTU - --uygula olmadan yazar",
    yon: "KALDIRAN",
    dosya: BETIK,
    bul: "  if (!uygula) {",
    koy: "  if (false) {",
    bozdugu: "onay istemeden canliya yazar",
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
console.log("N11 ESLESTIRME - MUTASYON TURU");
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
  console.log("\n  OK  N11 eslestirme UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
