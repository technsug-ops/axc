import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  HAKEDIS ODEME OZETI - MUTASYON HARNESS'I (22.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run hakedis-ozeti-mutasyon:kontrol
 *
 *  `hakedis:dogrula` 9. bolumu uc dosyayi korur: saf govde (model.ts),
 *  ekran (page.tsx) ve bilesen (odeme-ozeti.tsx). Kaynak tarayan olcutlerin
 *  DAVRANISA bagli oldugunu ancak mutasyon gosterir. UC YON: zararsiz -
 *  kaldiran - fazladan.
 * ============================================================================
 */

const BEKCI = "scripts/hakedis-dogrula.ts";
const MODEL = "src/lib/hakedis/model.ts";
const EKRAN = "src/app/hakedis/page.tsx";
const BILESEN = "src/app/hakedis/odeme-ozeti.tsx";
const HB_OKU = "src/lib/hakedis/hb-api-oku.ts";

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
    dosya: BILESEN,
    /* ÇAPA K235'TE TAŞINDI: ok ikonu ortak gövdeye (`satir-karti.tsx`) geçti. */
    bul: "{/* SÜZGECİN TOPLAMI — sayfanın değil (İlke #15). Sıfır da yazılır. */}",
    koy: "{/* toplam. */}",
    bozdugu: "hicbir sey - bu mutasyon YESIL kalmali",
  },
  {
    ad: "TOPLAM SAYFADAN - suzgecin degil, gorunen dilimin toplami",
    yon: "KALDIRAN",
    dosya: EKRAN,
    bul: "  const odemeToplamlariSuzulmus = odemeToplamlari(odemelerSuzulmus);",
    koy: "  const odemeToplamlariSuzulmus = odemeToplamlari(odemelerSuzulmus.slice(0, 50));",
    bozdugu: "ikinci sayfaya gecince toplam degisir; ekran suzgecin degil sayfanin toplamini soyler (Ilke #15)",
  },
  {
    ad: "ARAMA YANLIS PARAMETREYE YAZIYOR - sayfa hic okumuyor",
    yon: "KALDIRAN",
    dosya: BILESEN,
    bul: "          parametre={ODEME_ARAMA_PARAMETRESI}",
    koy: '          parametre="sorgu"',
    bozdugu: "arama kutusu adrese 'sorgu' yazar, sayfa 'q' okur - arama sessizce calismaz",
  },
  {
    ad: "ROZET YANLIS IDDIA - odenmis satir 'Tahmini' der",
    yon: "KALDIRAN",
    dosya: BILESEN,
    /* ⚠ ÇAPA GİRİNTİSİZ: refaktör girintiyi değiştirir, deseni değil.
       `t("odemeYapildi")` bu dosyada bir kez geçiyor. */
    bul: '{t("odemeYapildi")}',
    koy: '{t("tahminiHesaplanmistir")}',
    bozdugu: "gercek para gecmis odeme tahmin gibi gorunur - rozet sahip olmadigi anlami iddia eder",
  },
  {
    ad: "ARAMA KAPALI - sorgu ne olursa olsun hepsi listelenir",
    yon: "KALDIRAN",
    dosya: MODEL,
    bul: '  const q = sorgu.trim().toLocaleLowerCase("tr");',
    koy: '  const q = "";',
    bozdugu: "siparis no ile arayan kullanici hep tam listeyi gorur",
  },
  {
    ad: "ZINCIR KOPTU - grup kendi anahtar formulunu kullaniyor",
    yon: "KALDIRAN",
    dosya: MODEL,
    bul: "    const { anahtar, odemeGunu } = gelecekOdemeAnahtari(k.kanalAdi, k.vade);",
    koy: '    const odemeGunu = sonrakiOdemeGunu(k.vade, k.kanalAdi); const anahtar = k.kanalAdi + "|" + odemeGunu.toISOString().slice(0, 10) + "|x";',
    bozdugu: "satirin rakami bir anahtardan, acilan kalem listesi baska anahtardan - sayi ile liste ayrisir",
  },
  {
    ad: "SIPARIS DOKUMU SIPARISSIZ KALEMI DE ALIYOR",
    yon: "FAZLADAN",
    dosya: MODEL,
    bul: "    if (!k.siparisNo) continue;",
    koy: "    if (k.siparisNo === undefined) continue;",
    bozdugu: "kargo faturasi/platform bedeli 'null' adli bir siparis gibi listelenir",
  },
  /* ═══ K239 — HB İŞ TARİHİ: ORTAMIN SAATİ KULLANILMAZ ════════════════ */
  {
    ad: "ORTAMIN SAATI GERI GELDI - new Date(ham) (bir gun kayma)",
    yon: "KALDIRAN",
    dosya: HB_OKU,
    /* ⚠ TS dizesinde ters bölü İKİ KEZ yazılır; tek yazılırsa çalışma anında
       kaybolur ve çapa HİÇ tutmaz (harness bunu "ölçülemedi" diye söyledi). */
    bul: "  const m = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(ham.trim());",
    koy: "  const m = null as RegExpExecArray | null; const d = new Date(ham); if (!Number.isNaN(d.getTime())) return d;",
    bozdugu:
      "HB'nin saat dilimsiz damgasi MAKINENIN saatinde okunur; Berlin'de 2026-09-16 -> 2026-09-15T22:00Z, Vercel'de baska deger - ayni satir iki makineden iki farkli sekilde deftere girer",
  },
  {
    ad: "SAAT KORUNUYOR - is tarihi saat tasimaya basliyor",
    yon: "FAZLADAN",
    dosya: HB_OKU,
    bul: "  return gunDegeri({ yil: Number(m[1]), ay: Number(m[2]), gun: Number(m[3]) });",
    koy: "  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 21));",
    bozdugu:
      "vade/odeme gunu saat tasirsa gun sinirina yakin kayitlar yanlis kovaya duser (donem.ts kurali: is tarihi saat tasimaz)",
  },
  {
    ad: "ODENDI KAPISI DUSTU - WillBePaid satira odeme tarihi yazar",
    yon: "KALDIRAN",
    dosya: HB_OKU,
    bul: '  const odendi = kayit.status === "Paid";',
    koy: "  const odendi = true;",
    bozdugu:
      "kanal 'odenecek' derken defter 'odendi' yazar; bekleyen para sessizce gecmis odemeye kayar",
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
console.log("HAKEDIS ODEME OZETI - MUTASYON TURU");
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
  console.log("\n  OK  Odeme ozeti UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
