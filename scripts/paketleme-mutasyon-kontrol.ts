import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  PAKETLEME — "BULUNAMADI" AYRIMI · MUTASYON HARNESS'I (K240, 23.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run paketleme-mutasyon:kontrol
 *
 *  ⛔ NIYE DOGDU: kullanici urun barkodunu /paketle'de okuttu, ekran "boyle
 *  siparis yok" dedi. Cumle teknik olarak dogruydu ama sistem o kodu TANIYOR
 *  ve o urunu bekleyen acik siparisi de biliyor. "Tanimadim" ile "tanidim ama
 *  bu baska bir sey" ayni cumleye sikisinca kullanici yanlis ise yoneliyor.
 *
 *  Bu harness, o ayrimi olcen yeni olcutlerin GERCEKTEN isirdigini gosterir.
 *  UC YON: zararsiz - kaldiran - fazladan.
 * ============================================================================
 */

const BEKCI = "scripts/paketleme-dogrula.ts";
const EYLEM = "src/app/paketle/actions.ts";
const EKRAN = "src/app/paketle/paketleyici.tsx";

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
    dosya: EYLEM,
    bul: "/** Ürün kodundan açılan sipariş listesinin tavanı. */",
    koy: "/** tavan. */",
    bozdugu: "hicbir sey - bu mutasyon YESIL kalmali",
  },
  {
    /* ⛔ HATANIN KENDISI: besinci hal yokken ekran "boyle siparis yok" diyordu. */
    ad: "BESINCI HAL DUSTU - urun kodu yine 'siparis yok' diye gecer",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: '      const cozum = await kodlaVaryantCoz(temiz, { pasifDahil: true });',
    koy: '      const cozum = { durum: "YOK" } as { durum: "YOK" };',
    bozdugu:
      "elinde kutuyla duran kullaniciya 'boyle siparis yok' denir; oysa sistem urunu de, onu bekleyen siparisi de biliyor",
  },
  {
    ad: "EKRAN DALI CIZMIYOR - govde calisir, kimse gormez",
    yon: "KALDIRAN",
    dosya: EKRAN,
    bul: '        {bulunamadi?.durum === "URUN_KODU" ? (',
    koy: "        {false ? (",
    bozdugu:
      "K121 dersi: sunucu dogru cevabi uretir, ekranda karsiligi yoktur ve tur yesil yanar",
  },
  {
    ad: "ORTAK KUME BIRAKILDI - ciplak shippedAt kosuluna donuldu",
    yon: "FAZLADAN",
    dosya: EYLEM,
    bul: "            ...KARGO_BEKLEYEN,",
    koy: "            shippedAt: null,",
    bozdugu:
      "ice aktarilmis/onaysiz siparis de onerilir; kullanici ustune basar, ekranin kendi aramasi onu BULAMAZ (K60 kumesi disinda)",
  },
  {
    ad: "ORTAK GOVDE BIRAKILDI - ekran kendi arama kuralini kurdu",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: "      const cozum = await kodlaVaryantCoz(temiz, { pasifDahil: true });",
    koy: '      const bulunanV = await prisma.productVariant.findFirst({ where: { barcode: temiz } });\n      const cozum = (bulunanV ? { durum: "TEK", id: bulunanV.id, aday: { ad: "" } } : { durum: "YOK" }) as never;',
    bozdugu:
      "/okut ile /paketle ayni kodu farkli gorur; dort kod rolunden yalnizca biri aranir (Ilke #10)",
  },
  {
    ad: "TAVAN SESSIZCE KESIYOR - 'daha var' hic soylenmez",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: "          dahaVar: siparisler.length > URUN_SIPARIS_TAVANI,",
    koy: "          dahaVar: false,",
    bozdugu:
      "besten fazla siparis varsa kullanici 'hepsi bu' saniyor - sessiz kesme yasak",
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
    cikti.includes("TÜM KONTROLLER GEÇTİ") ||
    cikti.includes("KONTROL BAŞARISIZ") ||
    cikti.includes("BAŞARISIZ");
  return { kod: r.status ?? 1, ciktiVar };
}

console.log("");
console.log("PAKETLEME 'BULUNAMADI' AYRIMI - MUTASYON TURU");
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
  console.log("\n  OK  Paketleme ayrimi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
