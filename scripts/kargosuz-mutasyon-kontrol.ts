import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  K141 — KARGOSU DÜŞÜLMEMİŞ KÂR — MUTASYON HARNESS'İ (30.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run kargosuz-mutasyon:kontrol
 *
 *  ZARARSIZ yeşil kalmalı; öteki her mutasyon KIRMIZI yanmalı. Harness
 *  mutasyonun diske UYGULANDIĞINI doğrular, bekçinin başlığını görmeden
 *  «kırmızı» saymaz (çöken bekçi ölçüm değildir).
 * ============================================================================
 */

const BEKCI = "scripts/suzgec-dogrula.ts";
const BEKCI_BASLIGI = "K141) kargosu düşülmemiş kâr";
const KOSUL = "src/lib/kargo-kaynagi.ts";
const SUZGEC = "src/lib/liste-suzgeci.ts";
const LISTE = "src/app/satislar/page.tsx";
const NETKAR = "src/components/net-kar.tsx";
const PANEL = "src/app/page.tsx";
const RAPOR = "src/app/rapor/page.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: KOSUL,
    bul: " *  KARGOSU DÜŞÜLMEMİŞ KÂR — SORGU KOŞULU (K141, 30.09.2026)", koy: " *  KARGOSU DÜŞÜLMEMİŞ KÂR (K141)",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "SUZGEC DALI KALKTI", yon: "KALDIRAN", dosya: SUZGEC,
    bul: "  if (kar === \"kargosuz\") veKosullari.push(KARGO_DUSULMEMIS);", koy: "",
    bozdugu: "panel 7 der, tiklayinca butun satislar acilir" },
  { ad: "KALEM DUZEYI KARGO DA SAYILIYOR", yon: "FAZLADAN", dosya: KOSUL,
    bul: "  fees: { none: { code: \"KARGO\", saleItemId: null } },", koy: "  fees: { none: { code: \"KARGO\" } },",
    bozdugu: "detay ekrani ile liste farkli kumeyi gorur" },
  { ad: "HAZIR PENCEREDE ESKI ARALIK TASINIYOR", yon: "FAZLADAN", dosya: SUZGEC,
    bul: "    ...(p.pencere === \"OZEL\" ? { baslangic: p.baslangic, bitis: p.bitis } : {}),", koy: "    ...{ baslangic: p.baslangic, bitis: p.bitis },",
    bozdugu: "baglanti baska donemi acar, sayi ile liste ayrisir" },
  { ad: "TELEFON SATIRINDA ROZET YOK", yon: "KALDIRAN", dosya: LISTE,
    bul: "                              durum={satis.profitStatus}\n                              kargoDusulmedi={satis._count.fees === 0}", koy: "                              durum={satis.profitStatus}",
    bozdugu: "telefonda kargosuz kar kargolu gibi gorunur" },
  { ad: "RENKLI KARDA ROZET YOK", yon: "KALDIRAN", dosya: NETKAR,
    bul: "    </DurumRozeti>\n    {kargoRozeti}", koy: "    </DurumRozeti>",
    bozdugu: "kardaki/zarardaki satista rozet cizilmez" },
  { ad: "PANEL SAYISI ELLE", yon: "KALDIRAN", dosya: PANEL,
    bul: "    ? await prisma.sale.count({ where: satisKosulu(kargosuzParam, an).kosul })\n    : 0;\n  const kargosuzAdresi", koy: "    ? 0\n    : 0;\n  const kargosuzAdresi",
    bozdugu: "panel hic uyarmaz" },
  { ad: "PANEL IZIN KAPISI KALKTI", yon: "FAZLADAN", dosya: PANEL,
    bul: "  const kargosuzSayisi = karGorunur\n", koy: "  const kargosuzSayisi = true\n",
    bozdugu: "kar gormeyen rol kar bilgisi gorur" },
  { ad: "RAPOR BAGLANTISI DONEMSIZ", yon: "KALDIRAN", dosya: RAPOR,
    bul: "          href={suzgecAdresi(\"/satislar\", kargosuzParam, {})}", koy: "          href=\"/satislar?kar=kargosuz\"",
    bozdugu: "rapor 1 der, tiklayinca 1319 acilir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nK141 KARGOSUZ KÂR — MUTASYON TURU\n");

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
  console.log("  OK  kargosuz kâr İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
