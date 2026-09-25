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
/** K235-3: izgara beyani ile GERCEK genislik ayrisirsa kayma geri gelir. */
const SECICI = "src/app/tazminat/durum-secici.tsx";
const NOT_ALANI = "src/app/tazminat/not-alani.tsx";
/** K272: telefon düzeni. */
const EYLEM = "src/components/satir-eylemi.tsx";
const LISTE = "src/components/liste-karti.tsx";
const ARAMA = "src/components/kod-arama-kutusu.tsx";
const EXCEL = "src/components/excel-indir.tsx";
const KARGO = "src/app/satislar/kargo-durumu.tsx";
const PAKET = "src/app/satislar/paketlendi-durumu.tsx";

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
    /* ÇAPA K235-②'DE TAŞINDI: süzgece boş dize dalı eklendi. */
    bul: "    (b) => b !== null && b !== undefined && b !== false && b !== \"\",",
    koy: "    (b) => true,",
    bozdugu:
      "kosullu baglam icin her ekranda disarida ayri dizi kurulur; unutulan yerde ekranda 'null' ve bos ayirac cikar",
  },
  {
    ad: "DOKUNMA HEDEFI KUCULDU - telefonda 56 px kalmadi",
    yon: "KALDIRAN",
    dosya: GOVDE,
    /* ÇAPA K235-②'DE TAŞINDI: sınıf dizesi `zemin` için şablona döndü. */
    bul: "flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2",
    koy: "flex min-h-8 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2",
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
  {
    /* K235-3: kullanici ekran goruntusu gonderdi - acilir kutular her
       satirda baska yerdeydi. Sag blok BUTUN olarak saga yaslaniyor ve
       genisligi icerigine gore degisiyor. */
    ad: "IZGARA BEYANI DUSTU - sag sutunlar yine kayar",
    yon: "KALDIRAN",
    dosya: EKRAN,
    bul: '                  sagIzgara="sm:grid-cols-[8rem_10rem_12rem]"',
    koy: "                  /* izgara beyani kaldirildi */",
    bozdugu:
      "tutar ve not uzadikca ARADAKI acilir kutu her satirda baska x konumunda durur - kullanicinin bildirdigi arizanin ta kendisi",
  },
  {
    ad: "GOVDE IZGARAYI UYGULAMIYOR - beyan var, etkisi yok",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: '            (sagIzgara ? " sm:grid sm:items-center " + sagIzgara : "")',
    koy: '            ""',
    bozdugu:
      "ekran sutun beyan eder, govde onu hic uygulamaz - beyan sessizce bos soze doner",
  },
  {
    ad: "TELEFON SARMASI KALKTI - dar ekranda sabit sutun tasar",
    yon: "FAZLADAN",
    dosya: GOVDE,
    /* K272: sag bloga max-sm:w-full eklendi - capa tasindi. */
    bul: '            "flex flex-wrap items-center gap-2 max-sm:w-full" +',
    koy: '            "items-center gap-2 max-sm:w-full" +',
    bozdugu:
      "telefonda sarma yok; 30rem'lik sabit sutun 360 px ekrana sigmaz ve yatay kaydirma dogar (Ilke #8)",
  },
  {
    ad: "SECICI GENISLIGI BEYANDAN AYRISTI (w-40 -> w-44)",
    yon: "KALDIRAN",
    dosya: SECICI,
    bul: '<SelectTrigger className="h-9 w-40">',
    koy: '<SelectTrigger className="h-9 w-44">',
    bozdugu:
      "izgara 10rem diyor, kontrol 11rem - kontrol kendi hucresini tasirir ve hizalama sessizce bozulur",
  },
  {
    ad: "NOT ALANI SABIT GENISLIGI KALKTI (max-w'ya geri donus)",
    yon: "KALDIRAN",
    dosya: NOT_ALANI,
    bul: " sm:min-h-0 sm:w-48",
    koy: " sm:min-h-0",
    bozdugu:
      "kisa notta buton daralir, sag blok kucullur ve sutunlar yine satirdan satira kayar",
  },
  {
    ad: "EYLEM TELEFONDA YINE YATAY VE DAR (eski h-11 px-3)",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: "  \"h-[52px] w-full min-w-0 flex-col gap-0.5 px-1 text-[11px] md:h-8 md:w-8 md:flex-row md:gap-2 md:px-0 md:text-sm\";",
    koy: "  \"h-11 px-3 md:h-8 md:w-8 md:px-0\";",
    bozdugu: "dugmeler farkli genislikte, son dugme alt satira tek basina duser",
  },
  {
    ad: "EYLEM IZGARASI YINE SARMALIYOR",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: "className=\"grid w-full auto-cols-[minmax(0,1fr)] grid-flow-col gap-1.5 md:flex md:w-auto md:flex-nowrap md:items-center md:gap-2\"",
    koy: "className=\"flex flex-wrap items-center gap-2 md:flex-nowrap\"",
    bozdugu: "«Mal Kabul» ikinci satira tek basina iner - kullanicinin gosterdigi sey",
  },
  {
    ad: "LISTE KARTI EYLEMLERI SARMALIYOR",
    yon: "KALDIRAN",
    dosya: LISTE,
    bul: "<div className=\"grid auto-cols-[minmax(0,1fr)] grid-flow-col gap-1.5 [&>*]:min-w-0\">{eylemler}</div>",
    koy: "<div className=\"flex flex-wrap gap-2 pt-1\">{eylemler}</div>",
    bozdugu: "13 sayfanin telefon kartinda «Sil» alt satira tek basina duser",
  },
  {
    ad: "TEK KALAN KUTU YARIM KALIR",
    yon: "KALDIRAN",
    dosya: LISTE,
    bul: "? \"col-span-2\" : \"\"",
    koy: "? \"\" : \"\"",
    bozdugu: "bes alanli kartta son satirda bos hucre - kart boyutlari duzensiz",
  },
  {
    ad: "SAG BLOK TELEFONDA DAR (ad tasar)",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "\"flex flex-wrap items-center gap-2 max-sm:w-full\" +",
    koy: "\"flex flex-wrap items-center gap-2\" +",
    bozdugu: "alimlarda urun adi kartin disina tasar",
  },
  {
    ad: "ARA DUGMESI TELEFONDA YAZILI",
    yon: "KALDIRAN",
    dosya: ARAMA,
    bul: "        <span className=\"max-md:sr-only\">{ortak(\"ara\")}</span>",
    koy: "        <span>{ortak(\"ara\")}</span>",
    bozdugu: "arama kutusu kisalir, ipucu yazisi kesilir",
  },
  {
    ad: "EXCEL TELEFONDA YAZILI",
    yon: "KALDIRAN",
    dosya: EXCEL,
    bul: "className=\"max-md:size-11 max-md:px-0\"",
    koy: "className=\"\"",
    bozdugu: "baslik satiri iki satira bolunur",
  },
  /* ── K275 durum düğmeleri (Kargolanacak · Paketlendi) ── */
  {
    ad: "DURUM KUTUSU 52 PX DEGIL",
    yon: "KALDIRAN",
    dosya: EYLEM,
    bul: '"max-md:h-[52px] max-md:w-full max-md:min-w-0 max-md:flex-col',
    koy: '"max-md:w-full max-md:min-w-0 max-md:flex-col',
    bozdugu: "durum dugmeleri oteki eylemlerden kisa kalir - satir tutarsiz (Ilke #10)",
  },
  {
    ad: "DURUM SINIFI MASAUSTUNE SIZDI",
    yon: "FAZLADAN",
    dosya: EYLEM,
    bul: '"max-md:h-[52px] max-md:w-full max-md:min-w-0 max-md:flex-col',
    koy: '"h-[52px] max-md:w-full max-md:min-w-0 max-md:flex-col',
    bozdugu: "masaustu tablo satirlari 52 px'e buyur",
  },
  {
    ad: "PAKETLENDI ESKI DUGMEYE DONDU",
    yon: "KALDIRAN",
    dosya: PAKET,
    bul: "className={`md:h-8 ${DURUM_EYLEMI_SINIFI}`}",
    koy: 'className="h-11 md:h-8"',
    bozdugu: "Paketlendi dugmesi hucreden tasar, komsu dugmenin ustune biner",
  },
  {
    ad: "KARGO ASGARI GENISLIGI TELEFONA DONDU",
    yon: "KALDIRAN",
    dosya: KARGO,
    bul: "md:min-w-[8.75rem]",
    koy: "min-w-[8.75rem]",
    bozdugu: "kullanicinin 25.09 ekran goruntusu: Kargoya verildi Paketlendi'nin ustune biner",
  },
  {
    ad: "KARGO ETIKETI ESKIYE DONDU",
    yon: "KALDIRAN",
    dosya: KARGO,
    bul: '{t("kargolanacak")}',
    koy: '{t("kargoyaVerildi")}',
    bozdugu: "kullanici 'Kargoya verildi' yazisini durum sanir; istenen 'Kargolanacak'",
  },
  {
    ad: "ISARETLI TELEFON KUTUSU MASAUSTUNDE DE CIKIYOR",
    yon: "FAZLADAN",
    dosya: KARGO,
    bul: "className={`md:hidden ${DURUM_EYLEMI_SINIFI}`}",
    koy: "className={`${DURUM_EYLEMI_SINIFI}`}",
    bozdugu: "masaustunde tarih iki kez gorunur (kutu + eski satir)",
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
