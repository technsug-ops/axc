import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  TESLİM DURUMU — MUTASYON HARNESS'İ (K199)
 * ----------------------------------------------------------------------------
 *      npm run teslim-durumu-mutasyon:kontrol
 *
 *  ⛔ KORUDUĞU ŞEY BİR RAKAMIN DÜRÜSTLÜĞÜ. Ölçüldü 09.09.2026:
 *      ham "yolda" 337 = gerçekten yolda 24 + BİLİNMİYOR 313
 *  Kovalar birleşirse kutu %93 şişer — ve hiçbir şey hata vermez, hiçbir
 *  test kırmızı yanmaz, operatör her sabah var olmayan 313 pakete bakar.
 * ============================================================================
 */

const BEKCI = "scripts/teslim-durumu-dogrula.ts";
const BEKCI_BASLIGI = "TESLİM DURUMU BEKÇİSİ";
const GOVDE = "src/lib/teslim-durumu.ts";

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
    ad: "EŞİK AYRIMI KALKTI — her şey YOLDA",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: '  return satis.shippedAt >= TESLIM_IZI_DOGDU ? "YOLDA" : "BILINMIYOR";',
    koy: '  return "YOLDA";',
    bozdugu:
      "313 'bilinmiyor' siparis YOLDA gorunur; kutu %93 siser ve operator olmayan pakete bakar",
  },
  {
    ad: "TESLİM DAMGASI SIRASI BOZULDU — eşik önce sorulur",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: '  if (satis.deliveredAt !== null) return "TESLIM_EDILDI";',
    koy: "",
    bozdugu:
      "kanaldan teslim damgasi ALMIS eski siparis 'bilinmiyor'a duser — bildigimiz sey bilinmiyor sayilir",
  },
  {
    ad: "SINIR DIŞARI KAYDI (>= yerine >)",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  return satis.shippedAt >= TESLIM_IZI_DOGDU ? ",
    koy: "  return satis.shippedAt > TESLIM_IZI_DOGDU ? ",
    bozdugu:
      "esigin TAM ustunde kargolanan siparis bilinmiyora duser; sinir gunu sessizce disari cikar",
  },
  {
    /**
     * ⛔ SABİTİN KAYMASI EN SESSİZ BOZULMA: hiçbir değer testi görmez,
     * yalnız migration çaprazı yakalar. Elle tutulan bir tarih olsaydı
     * bu mutasyon YEŞİL geçerdi.
     */
    ad: "DOĞUM ANI SABİTİ KAYDI (bir ay geri)",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "export const TESLIM_IZI_DOGDU = new Date(Date.UTC(2026, 8, 9));",
    koy: "export const TESLIM_IZI_DOGDU = new Date(Date.UTC(2026, 7, 9));",
    bozdugu:
      "esik bir ay geri kayar; agustos siparisleri YOLDA sayilir ve kutu yine siser",
  },
  {
    ad: "KOŞUL GÖVDESİ EŞİĞİ DÜŞÜRDÜ — sayı ile liste ayrışır",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "    return { deliveredAt: null, shippedAt: { gte: TESLIM_IZI_DOGDU } };",
    koy: "    return { deliveredAt: null };",
    bozdugu:
      "kutu bir kumeyi sayar, tiklanan liste BASKA kumeyi gosterir — panelin 'sayi = liste' sozu duser",
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
console.log("TESLİM DURUMU — MUTASYON TURU");
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
    /** ⛔ "uygulanamadı" YEŞİL DEĞİLDİR — desen tutmazsa bekçi DOĞRU kodu ölçer. */
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    /** ⛔ `git checkout` ile geri alınmaz — commit edilmemiş çalışmayı siler. */
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
  console.log("  OK  teslim kovaları İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
