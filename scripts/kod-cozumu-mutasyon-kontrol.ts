import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KOD COZUMU - MUTASYON HARNESS'I (21.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run kod-cozumu-mutasyon:kontrol
 *
 *  NIYE ZORUNLU: bu katmanin bozulmasi TAMAMEN SESSIZDIR. Bir kod iki aktif
 *  varyanta uydugunda `findFirst` birini seciyordu ve kaybeden hicbir yerde
 *  gorunmuyordu - ne hata, ne uyari. Canli vaka 21.09.2026: HB siparisi stogu
 *  SIFIR olan ikize dustu, "Stok yetersiz (0/1)" yazdi ve rakam DOGRU oldugu
 *  icin ariza gunlerce urun kartinda arandi.
 *
 *  UC YON AYRI SINANIR: zararsiz (yesil kalmali) - kaldiran - fazladan.
 *  Yalniz "kaldiran" yazilirsa, hicbir seyi kosmayan bir harness "mukemmel"
 *  gorunur.
 * ============================================================================
 */

const BEKCI = "scripts/kod-cozumu-dogrula.ts";
const BEKCI_BASLIGI = "KOD ÇÖZÜMÜ";

const GOVDE = "src/lib/varyant-kod-cozumu.ts";
const SATIS = "src/app/satislar/satis-formu.tsx";
const OKUYUCU = "src/app/okut/okuyucu.tsx";

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
    bul: "/** Adayı TANITMAYA yeten alanlar — operatör hangisi olduğunu ayırt edebilmeli. */",
    koy: "/** Adayi tanitan alanlar. */",
    bozdugu: "hicbir sey - bu mutasyon YESIL kalmali",
  },
  {
    ad: "GOVDE YINE SESSIZCE SECIYOR - findFirst geri geldi",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  const satirlar = await prisma.productVariant.findMany({",
    koy: "  const satirlar = await prisma.productVariant.findFirst({",
    bozdugu:
      "arizanin ta kendisi: iki aday varken biri sessizce secilir, kaybeden gorunmez",
  },
  {
    ad: "TAVAN SORGUDAN DUSTU - cakisma hic gorunmez",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "    take: ADAY_TAVANI,",
    koy: "",
    bozdugu:
      "tavan olmadan sorgu TUM adaylari ceker; sayim calisir ama olcut 'tavan sorguya bagli' gucunu kaybeder ve gelecekte tek sonuca dusuren bir degisiklik yakalanamaz",
  },
  {
    ad: "COK ESLESME 'YOK' SAYILDI - iki sonuc tek kefeye kondu",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: '  return { durum: "COK", adaylar, tavandaMi: adaylar.length === ADAY_TAVANI };',
    koy: '  return { durum: "YOK" };',
    bozdugu:
      "operatore 'boyle bir urun yok' denir; var olan urunu YENIDEN TANIMLAMAYA kalkar ve ikiz sayisi ARTAR - ariza kendini besler",
  },
  {
    ad: "PASIF SUZGECI KOSULSUZ KALKTI - temizlenen ikizler geri geldi",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "      ...(secenek.pasifDahil ? {} : { isActive: true }),",
    koy: "      ...{},",
    bozdugu:
      "pasife alinan uc ikiz aramaya geri girer; 21.09'da kapatilan carpisma sessizce yeniden acilir",
  },
  {
    ad: "SATIS FORMU YINE SESSIZCE ILERLIYOR",
    yon: "KALDIRAN",
    dosya: SATIS,
    bul: '      if (sonuc.durum === "COK") {',
    koy: "      if (false) {",
    bozdugu:
      "form cok eslesmeyi soylemez; operatore hangi urun oldugu sorulmaz ve yanlis urune satis girilir",
  },
  {
    ad: "OKUMA EKRANI CAKISMADA ESLESTIRME TEKLIF EDIYOR",
    yon: "FAZLADAN",
    dosya: OKUYUCU,
    bul: "          ) : sonuc.cokEslesme > 0 ? (",
    koy: "          ) : false ? (",
    bozdugu:
      "cakisan kodda 'bu urune baglayalim mi' teklifi cikar; zaten fazla olan baglara bir tane daha eklenir - ekran arizayi BESLER",
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
console.log("KOD COZUMU - SESSIZ SECIM MUTASYON TURU");
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
    /** Mutasyonun UYGULANDIGI dogrulanir - uygulanmayan mutasyon "yesil" degil, OLCULEMEDI. */
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
  console.log("\n  OK  Sessiz secim yasagi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
