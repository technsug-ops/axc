import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  N11 LISTELEME - MUTASYON HARNESS'I (22.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run n11-listeleme-mutasyon:kontrol
 *
 *  NIYE ZORUNLU: ceviri saf ve deger testiyle sinaniyor; ama testin DISI
 *  var mi, mutasyon soyler. En pahali bozulma: olculmemis `status` degerini
 *  PASIF saymak - 113/113 "Active" gorduk, baska deger ne demek BILMIYORUZ.
 *  UC YON: zararsiz - kaldiran - fazladan.
 * ============================================================================
 */

const BEKCI = "scripts/n11-listeleme-dogrula.ts";
const BEKCI_BASLIGI = "N11 LİSTELEME — BEKÇİ";
const SAF = "src/lib/kanal-listeleme-n11.ts";
const TARAYICI = "scripts/canli-n11-listeleme-yaz.ts";

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
    dosya: SAF,
    bul: "  /** ① Ölçülmemiş `status` değeri → hüküm YOK. */",
    koy: "  /** olculmemis status. */",
    bozdugu: "hicbir sey - bu mutasyon YESIL kalmali",
  },
  {
    ad: "OLCULMEMIS STATUS PASIF SAYILIYOR - hukum uyduruldu",
    yon: "FAZLADAN",
    dosya: SAF,
    bul: '  if (l.status !== "Active") return { durum: "BILINMIYOR", kaynak: "durum-olculmedi" };',
    koy: '  if (l.status !== "Active") return { durum: "PASIF", kaynak: "durum-olculmedi" };',
    bozdugu:
      "hic gorulmemis bir status degeri geldiginde urun 'satisa engel' sayilir; panel kutusu olmayan bir arizayi gosterir",
  },
  {
    ad: "ADET SIFIR KAPISI DUSTU - stoksuz urun ACIK gorunur",
    yon: "KALDIRAN",
    dosya: SAF,
    bul: '  if (adet <= 0) return { durum: "STOKSUZ", kaynak: "stok-sifir" };',
    koy: "",
    bozdugu:
      "quantity=0 olan 58 listeleme On_Sale olmadigi icin PASIF'e duser; 'stoksuz' ile 'vitrinden kalkmis' ayrimi kaybolur",
  },
  {
    ad: "ADET OKUNAMAYINCA SIFIR SAYILIYOR - bilinmeyen hukum oldu",
    yon: "FAZLADAN",
    dosya: SAF,
    bul: '  if (adet === null) return { durum: "BILINMIYOR", kaynak: "stok-okunamadi" };',
    koy: '  if (adet === null) return { durum: "STOKSUZ", kaynak: "stok-okunamadi" };',
    bozdugu:
      "quantity alani gelmeyen satir 'stoksuz' yazilir; bakmadigimiz bir sey hakkinda iddia kurulur",
  },
  {
    ad: "ANAHTAR n11ProductId'YE KAYDI - defterle hic eslesmez",
    yon: "KALDIRAN",
    dosya: SAF,
    bul: "  return l.stockCode === null || l.stockCode === undefined",
    koy: "  return (l as { n11ProductId?: unknown }).n11ProductId === null || (l as { n11ProductId?: unknown }).n11ProductId === undefined",
    bozdugu:
      "51 kanal SKU'sunun hicbiri bulunmaz, hepsi 'YOK' yazilir - ve sifir-eslesme kapisi olmasa sessizce yazilirdi",
  },
  {
    ad: "SIFIR ESLESMEDE YAZIM DURMUYOR - anahtar uyusmazligi 'YOK' yazar",
    yon: "KALDIRAN",
    dosya: TARAYICI,
    bul: "  if (!UYGULA || (satirlar.length > 0 && eslesen === 0)) {",
    koy: "  if (!UYGULA) {",
    bozdugu:
      "anahtar bir gun degisirse 51 satirin hepsi sessizce 'kanalda YOK' olur ve panel 51 sahte ariza gosterir",
  },
  {
    ad: "HESAP ADLA ARANIYOR - K13b'nin geri gelmesi",
    yon: "KALDIRAN",
    dosya: TARAYICI,
    bul: '    where: { channel: { code: "N11" }, externalId: saticiId },',
    koy: '    where: { channel: { code: "N11" }, name: { contains: "AXCALI" } },',
    bozdugu:
      "hesap adi degisince ya da ikinci hesap acilinca yanlis hesaba yazilir; ad etikettir, kimlik degil",
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
console.log("N11 LISTELEME - MUTASYON TURU");
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
  console.log("\n  OK  N11 listeleme UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
