import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  İADEYİ GERİ AL — MUTASYON HARNESS'İ (K44 ②)
 * ----------------------------------------------------------------------------
 *      npm run iade-gecerli-mutasyon:kontrol
 *
 *  ZARARSIZ yeşil kalmalı; öteki her mutasyon KIRMIZI yanmalı. Harness
 *  mutasyonun diske UYGULANDIĞINI doğrular, bekçinin başlığını görmeden
 *  «kırmızı» saymaz (çöken bekçi ölçüm değildir).
 * ============================================================================
 */

const BEKCI = "scripts/iade-gecerli-dogrula.ts";
const BEKCI_BASLIGI = "GEÇERLİ İADE BEKÇİSİ";
const KURAL = "src/lib/iade-geri-alma.ts";
const VERI = "src/lib/iade-geri-alma-veri.ts";
const RAPOR = "src/app/rapor/page.tsx";
const IADE = "src/lib/iade.ts";
const YEDEK = "src/lib/yedek.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: KURAL,
    bul: " *  İADEYİ GERİ AL — SAF KURALLAR (K44 · 2. adım, 30.09.2026)", koy: " *  İADEYİ GERİ AL — SAF KURALLAR (K44 · 2. adım, 30.09.2026) zararsiz",
    bozdugu: "" },
  { ad: "TUKENMIS PARTI KILIDI KALKTI", yon: "KALDIRAN", dosya: KURAL,
    bul: "(h) => h.quantityDelta > 0 && h.kalanAdet < h.quantityDelta", koy: "(h) => false && h.kalanAdet < h.quantityDelta",
    bozdugu: "satilmis mal icin ters cikis yazilir, stok eksiye duser, hayalet adet dogar" },
  { ad: "YENI PARTIYE KAYNAK BAGI YAZILIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: "            sourceMovementId: null,", koy: "            sourceMovementId: h.hareketId,",
    bozdugu: "hayalet parti hatasi: ledger ile FIFO ayrisir" },
  { ad: "SATIS KARI TAZELENMIYOR", yon: "KALDIRAN", dosya: KURAL,
    bul: "    satisKariTazelenir: hareketler.some((h) => h.saleItemId !== null),", koy: "    satisKariTazelenir: false,",
    bozdugu: "degisim geri alinca satisin NET'i eski maliyetle kalir" },
  { ad: "IMZA KONTROLU KALKTI", yon: "KALDIRAN", dosya: VERI,
    bul: "      if (iadeGeriAlmaImzasi(plan) !== girdi.onaylananImza) return { durum: \"PLAN_DEGISTI\" as const };", koy: "",
    bozdugu: "kullanici gormedigi bir plana onay vermis sayilir" },
  { ad: "SARTLI ISARET KALKTI", yon: "KALDIRAN", dosya: VERI,
    bul: "        where: { id: o.id, geriAlindiAt: null },", koy: "        where: { id: o.id },",
    bozdugu: "iki sekme ayni iadeyi iki kez geri alir, stok iki kez oynar" },
  { ad: "RAPOR GERI ALINMIS IADEYI SAYIYOR", yon: "FAZLADAN", dosya: RAPOR,
    bul: "        where: { sale: ikiAralik(\"soldAt\"), ...IADE_GECERLI },", koy: "        where: { sale: ikiAralik(\"soldAt\") },",
    bozdugu: "geri alinmis iade donemin NET'ini dusurmeye devam eder" },
  { ad: "IADE KAYDI ONCEKI ADEDE GERI ALINANI KATIYOR", yon: "FAZLADAN", dosya: IADE,
    bul: "            returnItems: { where: { return: IADE_GECERLI }, select: { quantity: true } },", koy: "            returnItems: { select: { quantity: true } },",
    bozdugu: "geri alinan iade yeniden girilemez - fazla iade hatasi verir" },
  { ad: "MUAFIYET BEYANI SILINDI", yon: "KALDIRAN", dosya: YEDEK,
    bul: "    /* IADE_SUZGECI MUAF: yedek HER kaydı alır — geri alınmış iade de verinin parçası. */\n", koy: "",
    bozdugu: "gerekcesiz suzgecsiz okuma sessizce kabul edilir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nİADEYİ GERİ AL — MUTASYON TURU\n");

let dogru = 0;
const yanlis: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(`${m.ad}\n       desen ${adet} kez geçiyor (1 olmalı) — ${m.dosya}`);
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
  }
  const isaret = m.yon === "KALDIRAN" ? "-" : m.yon === "FAZLADAN" ? "+" : "o";
  if (!sonuc.ciktiVar) {
    bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
  } else if ((m.yon === "ZARARSIZ") === (sonuc.kod === 0)) {
    dogru++;
    console.log(`  OK  ${isaret} ${m.ad}`);
  } else {
    yanlis.push(m.yon === "ZARARSIZ" ? `${m.ad}\n       zararsız mutasyon KIRMIZI yandı — bekçi yalancı kırmızı üretiyor` : `${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
  }
}

console.log("");
for (const k of yanlis) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(`\n  ${dogru}/${MUTASYONLAR.length} mutasyon beklendiği gibi davrandı`);
if (yanlis.length || bozuk.length) {
  console.log("\n  Beklenmeyen ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  OK  iadeyi geri alma İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
