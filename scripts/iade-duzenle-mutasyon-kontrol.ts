import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  İADE DÜZENLEME — MUTASYON HARNESS'İ (K44)
 * ----------------------------------------------------------------------------
 *      npm run iade-duzenle-mutasyon:kontrol
 *
 *  ZARARSIZ yeşil kalmalı; öteki her mutasyon KIRMIZI yanmalı. Harness
 *  mutasyonun diske UYGULANDIĞINI doğrular, bekçinin başlığını görmeden
 *  «kırmızı» saymaz (çöken bekçi ölçüm değildir).
 * ============================================================================
 */

const BEKCI = "scripts/iade-duzenle-dogrula.ts";
const BEKCI_BASLIGI = "İADE DÜZENLEME BEKÇİSİ";
const IADE = "src/lib/iade.ts";
const DUZENLE = "src/lib/iade-duzenle.ts";
const BLOK = "src/components/iade-blogu.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: DUZENLE,
    bul: " *  İADE DÜZENLEME — STOĞA DOKUNMAYAN ALANLAR (K44 · 1. adım, 30.09.2026)", koy: " *  İADE DÜZENLEME — STOĞA DOKUNMAYAN ALANLAR (K44 · 1. adım, 30.09.2026) zararsiz",
    bozdugu: "" },
  { ad: "KARGO KDV FARKI NET-2'YE YANSIMIYOR", yon: "KALDIRAN", dosya: IADE,
    bul: "    net2Farki: net1Farki + (y.kargoKdvIndirimi - e.kargoKdvIndirimi),", koy: "    net2Farki: net1Farki,",
    bozdugu: "kargo degisince NET-2 kargonun KDV'si kadar yanlis kalir" },
  { ad: "CEZA KDV'LI SAYILIYOR", yon: "FAZLADAN", dosya: IADE,
    bul: '    satirlar.push({ code: "CEZA", tutar: -g.ceza });', koy: '    satirlar.push({ code: "CEZA", tutar: -g.ceza });\n    kargoKdvIndirimi += kdvAyir(g.ceza, GENEL_KDV_ORANI);',
    bozdugu: "pazaryeri cezasindan KDV indirilir, NET-2 sisar" },
  { ad: "DUZENLEME STOK DEFTERINE DOKUNUYOR", yon: "FAZLADAN", dosya: DUZENLE,
    bul: "    if (r.count !== 1) return { durum: \"DEGISMIS\" as const };", koy: "    if (r.count !== 1) return { durum: \"DEGISMIS\" as const };\n    await tx.stockMovement.count({ where: { returnItemId: { in: iade.items.map((k) => k.id) } } });",
    bozdugu: "stoga dokunmuyor sozu bekcisiz kalir" },
  { ad: "SARTLI YAZIM KALKTI", yon: "KALDIRAN", dosya: DUZENLE,
    bul: "      where: { id: girdi.returnId, updatedAt: iade.updatedAt },", koy: "      where: { id: girdi.returnId },",
    bozdugu: "arada yapilan baska bir duzeltme sessizce ezilir" },
  { ad: "KALEM SATIRLARI DA SILINIYOR", yon: "FAZLADAN", dosya: DUZENLE,
    bul: "where: { returnId: girdi.returnId, returnItemId: null, code: { in: [...IADE_PARA_KODLARI] } },", koy: "where: { returnId: girdi.returnId, code: { in: [...IADE_PARA_KODLARI] } },",
    bozdugu: "kalem kesinti satirlari (komisyon iadesi vb.) kaybolabilir" },
  { ad: "DONEM KAPISI HER ZAMAN SORULUYOR", yon: "FAZLADAN", dosya: DUZENLE,
    bul: "    if (paraDegisti) {\n      const kapi = await donemKapisi(", koy: "    if (true) {\n      const kapi = await donemKapisi(",
    bozdugu: "yalniz not duzeltmek icin bile kapali donem israri istenir" },
  { ad: "HASAR NOTU ZORUNLULUGU KALKTI", yon: "KALDIRAN", dosya: DUZENLE,
    bul: "      if (k.damagedQuantity > 0 && yeniNot === null) {", koy: "      if (false) {",
    bozdugu: "hasarli malin gerekcesi duzenlemeyle silinebilir" },
  { ad: "DUZENLE DUGMESI YOK", yon: "KALDIRAN", dosya: BLOK,
    bul: "                {duzenlenebilir ? (", koy: "                {false ? (",
    bozdugu: "duzenleme ekrani var ama kimse ulasamaz" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nİADE DÜZENLEME — MUTASYON TURU\n");

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
  console.log("  OK  iade düzenleme İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
