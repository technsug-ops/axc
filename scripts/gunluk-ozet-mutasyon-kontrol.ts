import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  GÜNLÜK ÖZET — ANTİ-HALÜSİNASYON MUTASYON HARNESS'İ (K-OZET)
 * ----------------------------------------------------------------------------
 *      npm run gunluk-ozet-mutasyon:kontrol
 *
 *  ⛔ KORUDUĞU ŞEY: `ozetMetniDogrula`nın LLM'in uydurduğu ya da doğrudan
 *  yazdığı bir rakamı GEÇİRMEMESİ. Bu depodaki en güvenlik-kritik yeni
 *  mantık — kaçan bir mutasyon, ekranda kaynaksız bir rakamın görünmesi
 *  demektir (anayasa: "kaynağı yazılmayan sayı kullanılamaz").
 * ============================================================================
 */

const BEKCI = "scripts/gunluk-ozet-dogrula.ts";
const BEKCI_BASLIGI = "GÜNLÜK ÖZET BEKÇİSİ";
/** ⚠ 11.09.2026 K-TAVSIYE taşıması: eski `src/lib/ozet/dogrulama.ts` → `src/lib/llm/dogrulama.ts`. Gövde birebir aynı, yalnız konum/ad değişti. */
const GOVDE = "src/lib/llm/dogrulama.ts";

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
    ad: "ÇÖZÜLEMEYEN ANAHTAR KAPISI KALDIRILDI",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  if (cozulemeyenler.size > 0) {",
    koy: "  if (false) {",
    bozdugu:
      "model uydurma bir anahtar yazarsa hic yakalanmaz; sozluk.get(...) undefined doner ve ciktida 'undefined' gorunur",
  },
  {
    ad: "SERBEST SAYI KAPISI KALDIRILDI",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "  if (serbestSayilar.length > 0) {",
    koy: "  if (false) {",
    bozdugu:
      "model talimati yok sayip dogrudan rakam yazarsa yakalanmaz — kaynaksiz sayi ekrana cikar",
  },
  {
    ad: "MASKELEME KALDIRILDI — yer tutucunun kendi rakamı serbest sayı sanılır",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "  const maskelenmis = ham.replace(/\\{\\{[a-zA-Z0-9_]+\\}\\}/g, \"#\");",
    koy: "  const maskelenmis = ham;",
    bozdugu:
      "yer tutucunun ICINDEKI anahtar adinda rakam varsa (ornegin tarih iceren bir anahtar) yanlis pozitif — ama daha onemlisi, tasarimin niyetini bozar: maskeleme olmadan ilerideki bir degisiklik gercek deger enjekte edip kendi urettigi rakami serbest sanabilir",
  },
  {
    ad: "SERBEST SAYI DESENİ BOŞALTILDI — hiçbir rakamı yakalamaz",
    yon: "KALDIRAN",
    dosya: GOVDE,
    bul: "const SERBEST_SAYI_DESENI = /[₺€%]?-?\\d{1,3}(?:\\.\\d{3})*(?:,\\d+)?%?/g;",
    koy: "const SERBEST_SAYI_DESENI = /(?!)/g;",
    bozdugu:
      "desen hicbir seyle eslesmeyen bir olumsuz bakis haline gelir; model her rakami serbestce yazabilir",
  },
  {
    ad: "SÖZLÜKTEN DEĞİL, HAM DEĞERDEN DOLDURULUYOR (ham sayı sızabilir)",
    yon: "FAZLADAN",
    dosya: GOVDE,
    bul: "  const metin = ham.replace(\n    YER_TUTUCU_DESENI,\n    (_, anahtar: string) => sozluk.get(anahtar)!,\n  );",
    koy: "  const metin = ham.replace(\n    YER_TUTUCU_DESENI,\n    (_, anahtar: string) => String(sayilar.find((s) => s.anahtar === anahtar)?.ham ?? sozluk.get(anahtar)!),\n  );",
    bozdugu:
      "bicimlenmis goruntu yerine HAM sayi (ondalik/kurus ayraci olmadan, TL/tarih bicimlenmeden) ekrana basilir — 'bir sayi tabaniyla birlikte yazilir' ilkesini cigner",
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
console.log("GÜNLÜK ÖZET ANTİ-HALÜSİNASYON — MUTASYON TURU");
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
    bozuk.push(
      m.ad + "\n       desen " + adet + " kez geçiyor (1 olmalı) — " + m.dosya,
    );
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
  console.log(
    "  OK  anti-halüsinasyon kapısı İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n",
  );
}
