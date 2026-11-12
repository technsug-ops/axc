import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  PARTI MALIYETI — MUTASYON HARNESS'I (K378, 12.11.2026)
 * ----------------------------------------------------------------------------
 *      npm run parti-maliyeti-mutasyon:kontrol
 *
 *  `parti-maliyeti:dogrula`nin disini sinar. UC YON: zararsiz · kaldiran ·
 *  fazladan. Capasi tutmayan mutasyon «olculemedi» sayilir, YESIL DEGIL.
 *
 *  NIYE: K378'in korudugu sey "maliyeti bilinmeyen parti DUZELTILEBILIR"
 *  sozudur. Bu soz sessizce kalkabilir — para birimi sorulmaz olur, kart
 *  ekranindaki kapi kaybolur, ya da uyari metni yine cikmaza goturur. Ucu de
 *  ekranda HICBIR hata uretmez; yalnizca kullanici yine duzeltemez.
 * ============================================================================
 */

const BEKCI = "scripts/parti-maliyeti-dogrula.ts";
const BEKCI_BASLIGI = "PARTİ MALİYETİ DÜZELTME BEKÇİSİ";
const EYLEM = "src/app/stok/parti-maliyet-actions.ts";
const DIYALOG = "src/app/satislar/[id]/parti-maliyet-duzelt.tsx";
const KART = "src/app/kart/[variantId]/page.tsx";
const SOZLUK = "messages/tr.json";

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
    ad: "ZARARSIZ - yorum",
    yon: "ZARARSIZ",
    dosya: EYLEM,
    bul: "/** ÖNİZLEME — hiçbir şey yazmaz, ne olacağını söyler. */",
    koy: "/** Onizleme. */",
    bozdugu: "hicbir sey",
  },
  {
    ad: "BIRIM YINE PARTIDEN - secilen yok sayiliyor",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: "  const para = parti.unitCostCurrency ?? secilenPara;",
    koy: "  const para = parti.unitCostCurrency;",
    bozdugu: "maliyetsiz parti yine PARA_BIRIMI_YOK ile reddedilir",
  },
  {
    ad: "SECILEN BIRIM PARTININKINI EZIYOR",
    yon: "FAZLADAN",
    dosya: EYLEM,
    bul: "  const para = parti.unitCostCurrency ?? secilenPara;",
    koy: "  const para = secilenPara ?? parti.unitCostCurrency;",
    bozdugu: "dolu bir maliyetin para birimi ekrandan degistirilebilir olur",
  },
  {
    ad: "TANIMSIZ BIRIM SESSIZCE TRY SAYILIYOR",
    yon: "FAZLADAN",
    dosya: EYLEM,
    bul: '  return ham === "TRY" || ham === "EUR" ? ham : null;',
    koy: '  return ham === "EUR" ? "EUR" : "TRY";',
    bozdugu: "formdan gelen cop deger TRY sayilir - birim uydurulur",
  },
  {
    ad: "YAZIM BIRIMI PLANDAN OKUMUYOR",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: "  const { parti, plan, para } = kurulum;",
    koy: "  const { parti, plan } = kurulum;\n  const para = parti.unitCostCurrency;",
    bozdugu: "onizleme TRY der, yazim null yazar - iki adim ayrisir",
  },
  {
    ad: "YAZIM YOLU BIRIMI HIC SORMUYOR",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: "    sebep,\n    paraSec(String(formData.get(\"paraBirimi\") ?? \"\")),",
    koy: "    sebep,\n    null,",
    bozdugu: "onizleme gecer, ikinci adim PARA_BIRIMI_YOK ile duser",
  },
  {
    ad: "BIRIM ALANI HIC CIZILMIYOR",
    yon: "KALDIRAN",
    dosya: DIYALOG,
    bul: "  const paraSoruluyor = partiParaBirimi === null;",
    koy: "  const paraSoruluyor = false;",
    bozdugu: "kullanici birimi secemez - maliyetsiz parti yine duzeltilemez",
  },
  {
    ad: "BIRIM ALANI HER ZAMAN CIZILIYOR",
    yon: "FAZLADAN",
    dosya: DIYALOG,
    bul: "  const paraSoruluyor = partiParaBirimi === null;",
    koy: "  const paraSoruluyor = true;",
    bozdugu: "dolu maliyette de birim sorulur - tutulamayan soz",
  },
  {
    ad: "KARTTAKI KAPI KAYBOLDU",
    yon: "KALDIRAN",
    dosya: KART,
    bul: "{maliyetDuzeltebilir && parti.birimMaliyet === null ? (",
    koy: "{false ? (",
    bozdugu: "tuketilmemis partiye ulasan hicbir yol kalmaz",
  },
  {
    ad: "KARTTAKI DUGME IZINSIZE DE CIZILIYOR",
    yon: "FAZLADAN",
    dosya: KART,
    bul: "{maliyetDuzeltebilir && parti.birimMaliyet === null ? (",
    koy: "{parti.birimMaliyet === null ? (",
    bozdugu: "yetkisize yapamayacagi bir dugme gosterilir",
  },
  {
    ad: "UYARI YINE CIKMAZA GOTURUYOR",
    yon: "KALDIRAN",
    dosya: SOZLUK,
    bul: '"eylem_maliyetsizStok": "Stokta duran partinin birim maliyetini girin — yeni alım bu partiyi kapatmaz"',
    koy: '"eylem_maliyetsizStok": "Alım girilirse kâr hesaplanabilir hâle gelir"',
    bozdugu: "yapilsa bile uyariyi sondurmeyen bir tarif verilir",
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

console.log("\nPARTI MALIYETI - MUTASYON TURU (K378, 12.11.2026)\n");
let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];
for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const n = asil.split(bul).length - 1;
  if (n !== 1) {
    bozuk.push(
      `${m.ad}\n       desen ${m.dosya} icinde ${n} kez geciyor (1 olmali) - OLCULEMEDI`,
    );
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
      bozuk.push(`${m.ad}\n       bekci COKTU - olcum gecersiz`);
    } else {
      kacan.push(`${m.ad}\n       YALANCI KIRMIZI`);
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
for (const k of kacan) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(
  `\n  ${yakalanan}/${MUTASYONLAR.length} mutasyon beklendigi gibi davrandi`,
);
if (kacan.length || bozuk.length) {
  console.log("\n  Kacan ya da olculemeyen mutasyon var - bekci eksik.\n");
  process.exitCode = 1;
} else {
  console.log("\n  OK  Parti maliyeti UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
