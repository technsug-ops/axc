import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  TOPLU ICE AKTARMA KAPISI - MUTASYON HARNESS'I (21.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run toplu-kapi-mutasyon:kontrol
 *
 *  NIYE ZORUNLU: bu kapinin bozulmasi TAMAMEN SESSIZDIR. Excel yuklenir,
 *  "459 satir yazildi" der, ve bir kod iki varyanta birden uyar hale gelir.
 *  Ariza haftalar sonra, bir siparis stogu sifir olan ikize dusunce gorunur.
 *
 *  UC YON: zararsiz (yesil kalmali) - kaldiran (kapi dustu) - fazladan
 *  (kapi kendini de reddediyor). Yalniz kaldiran yazilsaydi, her seyi
 *  reddeden bir kapi "mukemmel" gorunurdu.
 * ============================================================================
 */

const BEKCI = "scripts/toplu-kapi-dogrula.ts";
const BEKCI_BASLIGI = "KOD ÇARPIŞMA KAPISI";
const DOGRULA = "src/lib/ice-aktarma/dogrula.ts";

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
    dosya: DOGRULA,
    bul: "  /** Bir kimlik kodunun (sku · firmaSku · barkod) sahibi — kanal kapısı için. */",
    koy: "  /** Kimlik kodunun sahibi. */",
    bozdugu: "hicbir sey - bu mutasyon YESIL kalmali",
  },
  {
    ad: "VARYANT KAPISI DUSTU - kimlik kodu kanal koduna karsi sinanmiyor",
    yon: "KALDIRAN",
    dosya: DOGRULA,
    bul: "    if (kanalCakismasi) {",
    koy: "    if (false) {",
    bozdugu:
      "HBCV kodu ikinci bir varyantin sku'su olarak Excel'den acilir - K231'in dogus yolu, toplu halde",
  },
  {
    ad: "KANAL KAPISI DUSTU - kanal kodu kimlige karsi sinanmiyor",
    yon: "KALDIRAN",
    dosya: DOGRULA,
    bul: "    if (kimlikSahibiId !== null && kimlikSahibiId !== varyantId) {",
    koy: "    if (false) {",
    bozdugu:
      "baskasinin barkodu bir varyanta kanal kodu olarak baglanir - muslugun oteki yarisi",
  },
  {
    ad: "DOSYA ICI KIMLIK DIZINI KOPTU - ayni dosyadaki yeni varyant gorunmez",
    yon: "KALDIRAN",
    dosya: DOGRULA,
    bul: "    dosyaKimlik.set(anahtarla(sku), varyantId);\n    dosyaKimlik.set(anahtarla(firmaSku), varyantId);\n    if (barkod) dosyaKimlik.set(anahtarla(barkod), varyantId);",
    koy: "",
    bozdugu:
      "tek dosyada bir satir kodu kimlik olarak acar, baska satir kanal kodu yapar - kapi yalniz veritabanina bakip kacirir",
  },
  {
    ad: "KANAL KAPISI KENDINI DE REDDEDIYOR - hedefin kendi barkodu suc sayiliyor",
    yon: "FAZLADAN",
    dosya: DOGRULA,
    bul: "    if (kimlikSahibiId !== null && kimlikSahibiId !== varyantId) {",
    koy: "    if (kimlikSahibiId !== null) {",
    bozdugu:
      "barkodu kanal kodu olarak kullanan HER eslestirme duser - en yaygin durum kilitlenir",
  },
  {
    ad: "VARYANT KAPISI KENDINI DE REDDEDIYOR - GUNCELLE kipinde mevcut kayit kilitlenir",
    yon: "FAZLADAN",
    dosya: DOGRULA,
    bul: "      if (sahip !== undefined && sahip !== mevcut?.id) {",
    koy: "      if (sahip !== undefined) {",
    bozdugu:
      "kendi kanal kodunu barkod olarak tasiyan hicbir urun guncellenemez",
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
console.log("TOPLU ICE AKTARMA KAPISI - MUTASYON TURU");
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
  console.log("\n  OK  Toplu kapi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
}
