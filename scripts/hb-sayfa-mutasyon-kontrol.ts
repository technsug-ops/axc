import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  HB SAYFA GEZİCİSİ — MUTASYON HARNESS'İ (02.10.2026, K195-② ön şartı)
 * ----------------------------------------------------------------------------
 *      npm run hb-sayfa-mutasyon:kontrol
 *
 *  ZARARSIZ yeşil kalmalı; öteki her mutasyon KIRMIZI yanmalı. Harness
 *  mutasyonun diske UYGULANDIĞINI doğrular, bekçinin başlığını görmeden
 *  «kırmızı» saymaz (çöken bekçi ölçüm değildir).
 * ============================================================================
 */

const BEKCI = "scripts/hb-sayfa-dogrula.ts";
const BEKCI_BASLIGI = "HB SAYFA GEZİCİSİ BEKÇİSİ";
const GEZICI = "scripts/hb/istemci.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GEZICI,
    bul: "/** Kanalın beyan ettiği sayfa tavanı — istediğimizden küçükse o geçerli. */", koy: "/** Sayfa tavanı. */",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "OFSET ISTENEN KADAR ILERLIYOR (eski kusur)", yon: "KALDIRAN", dosya: GEZICI,
    bul: "const s = await apiGet(yolKur(ofset, limit), baslik);", koy: "const s = await apiGet(yolKur(turSayisi * limit, limit), baslik);",
    bozdugu: "kanal tavani 50 iken 50-99 arasi atlanir" },
  { ad: "KANAL TAVANI YOK SAYILIYOR", yon: "KALDIRAN", dosya: GEZICI,
    bul: "Math.min(limit, g.limit) : limit;", koy: "limit : limit;",
    bozdugu: "zarfli ama beyansiz listede 50'lik sayfa 'son sayfa' sanilir" },
  { ad: "KISA SAYFA BEYANA RAGMEN BITIRIYOR (eski kusur)", yon: "KALDIRAN", dosya: GEZICI,
    bul: "        ? kayitlar.length >= beyanToplam" + "\n" + "        : z.kayitlar.length < sayfaTavani);", koy: "        ? z.kayitlar.length < limit || kayitlar.length >= beyanToplam" + "\n" + "        : z.kayitlar.length < sayfaTavani);",
    bozdugu: "122 kayitlik teslim listesi 50'de kesilir (olculen vaka)" },
  { ad: "BOS SAYFA DURDURMUYOR", yon: "KALDIRAN", dosya: GEZICI,
    bul: "      z.kayitlar.length === 0 ||" + "\n", koy: "",
    bozdugu: "kanal yalan beyan verirse tavan turu kadar bos istek atilir" },
  { ad: "BEYANA ULASINCA DURMUYOR", yon: "FAZLADAN", dosya: GEZICI,
    bul: "        ? kayitlar.length >= beyanToplam", koy: "        ? kayitlar.length > beyanToplam",
    bozdugu: "tam katta gereksiz bos sayfa istenir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nHB SAYFA GEZİCİSİ — MUTASYON TURU\n");

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
  console.log("  OK  HB sayfa gezicisi İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
