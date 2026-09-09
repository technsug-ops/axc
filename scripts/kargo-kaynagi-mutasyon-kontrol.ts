import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KARGO KAYNAK SIRASI — MUTASYON HARNESS'İ (K201)
 * ----------------------------------------------------------------------------
 *      npm run kargo-kaynagi-mutasyon:kontrol
 *
 *  ⛔ KORUDUĞU ŞEY: bir sıranın TERSİNE dönmesi. Sıra bozulduğunda hiçbir
 *  şey hata vermez — NET yine bir rakam basar, yalnız yanlış kaynaktan.
 *  En pahalı hâli: tahmin, kanalın FİİLEN kestiği tutarı ezer ve defter
 *  kendi hesabını gerçeğe tercih eder.
 * ============================================================================
 */

const BEKCI = "scripts/kargo-kaynagi-dogrula.ts";
const BEKCI_BASLIGI = "KARGO KAYNAK SIRASI BEKÇİSİ";
const GOVDE = "src/lib/kargo-kaynagi.ts";
const N11 = "scripts/canli-n11-ice-aktar.ts";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "TUTAR SIRASI TERSİNE DÖNDÜ — tahmin gerçeği eziyor",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "  if (satis.cargoAmount !== null) {",
    koy: "  if (satis.cargoAmount !== null && satis.tahminiKargo === null) {",
    bozdugu:
      "kanalin FIILEN kestigi tutar dururken defter KENDI tahminini kullanir",
  },
  {
    ad: "SIFIR TUTAR 'YOK' SAYILIYOR",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  if (satis.cargoAmount !== null) {",
    koy: "  if (satis.cargoAmount !== null && satis.cargoAmount > 0) {",
    bozdugu:
      "kargosu BEDAVA olan gonderi 'bilinmiyor'a duser ve tahmine kayar — olculmus sifir kaybolur",
  },
  {
    ad: "ÜRÜNE-ÖZEL BASAMAK KALKTI — hepsi küresele düşüyor",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  if (satis.cargoDesi !== null && satis.cargoDesi > 0) {",
    koy: "  if (false) {",
    bozdugu:
      "urun ayrimi kaybolur; 1 desilik de 19 desilik de ayni kuresel sayiyla hesaplanir",
  },
  {
    /**
     * ⛔ EN SESSİZ BOZULMA: sabit kayar, hiçbir davranış testi görmez.
     * Yalnız "ölçülen ortanca" ölçütü yakalar — ve o ölçüt olmasaydı
     * metodoloji kararı sessizce çevrilebilirdi.
     */
    ad: "KÜRESEL SAYI ORTALAMAYA DÖNDÜ (3 → 4)",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "export const KURESEL_DESI_ORTANCASI = 3;",
    koy: "export const KURESEL_DESI_ORTANCASI = 4;",
    bozdugu:
      "kuyruklu dagilimin ortalamasi kullanilir; tek 19 desilik gonderi her tahmini sisirir",
  },
  {
    ad: "TAHMİNİ ETİKETİ DÜŞTÜ — tahmin gerçek gibi görünür",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: '  return s.kaynak === "TAHMINI";',
    koy: "  return false;",
    bozdugu:
      "tahmini rakam ekranda etiketsiz cikar; sistem bilmedigi seyi biliyormus gibi sunar",
  },
  {
    ad: "N11 TAHMİN YAZMAYI BIRAKTI (taban düşer)",
    yon: "KALDIRAN",
    dosya: N11,
    bul: '        (veri as { tahminiKargo?: number }).tahminiKargo = hesap.tutar;',
    koy: "        void hesap;",
    bozdugu:
      "N11 satislari kargoyu HIC gormez ve NET oldugundan YUKSEK cikar — sessizce",
  },
  {
    /**
     * ⛔ HALİL'İN ŞARTI: tahmin `cargoAmount`a DOKUNMAZ. Dokunan bir
     * mutasyon kırmızı yanmadıkça bu bir beyandır, koruma değil.
     */
    ad: "N11 DEFTERDEKİ KARGO TUTARINA DOKUNUYOR",
    yon: "FAZLADAN",
    dosya: N11,
    bul: '        (veri as { tahminiKargo?: number }).tahminiKargo = hesap.tutar;',
    koy:
      '        (veri as { tahminiKargo?: number }).tahminiKargo = hesap.tutar;\n' +
      "        (veri as { cargoAmount?: number }).cargoAmount = hesap.tutar;",
    bozdugu:
      "ice aktarma GERCEKLESEN kesinti alanini yazmaya baslar; tahmin gercegi ezer",
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
console.log("KARGO KAYNAK SIRASI — MUTASYON TURU");
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
    bozuk.push(m.ad + "\n       desen " + adet + " kez geçiyor (1 olmalı) — " + m.dosya);
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    writeFileSync(m.dosya, mutant, "utf8");
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    writeFileSync(m.dosya, asil, "utf8");
  }

  const isaret = m.yon === "KALDIRAN" ? "-" : "+";
  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log("  OK  " + isaret + " " + m.ad);
  } else if (sonuc.kod !== 0) {
    bozuk.push(m.ad + "\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz");
  } else {
    kacan.push(m.ad + "\n       KORUMASIZ: " + m.bozdugu);
  }
}

console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:\n");
  for (const k of kacan) console.log("  X  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI:\n");
  for (const b of bozuk) console.log("  !! " + b);
  console.log("");
}

const toplam = MUTASYONLAR.length;
const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
console.log(
  "  " +
    yakalanan +
    "/" +
    toplam +
    " mutasyon yakalandı   (- kaldıran " +
    kaldiran +
    " · + fazladan " +
    (toplam - kaldiran) +
    ")",
);
if (kacan.length || bozuk.length) {
  console.log("\n  Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  OK  kaynak sıraları İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
