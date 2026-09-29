import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  TY SAYFA GEZİCİ — MUTASYON HARNESS'İ (K112b)
 * ----------------------------------------------------------------------------
 *      npm run ty-sayfa-gezici-mutasyon:kontrol
 *
 *  ZARARSIZ yeşil kalmalı; öteki her mutasyon KIRMIZI yanmalı. Harness
 *  mutasyonun diske UYGULANDIĞINI doğrular, bekçinin başlığını görmeden
 *  «kırmızı» saymaz (çöken bekçi ölçüm değildir).
 * ============================================================================
 */

const BEKCI = "scripts/ty-sayfa-gezici-dogrula.ts";
const BEKCI_BASLIGI = "TY SAYFA GEZİCİ BEKÇİSİ";
const ISTEMCI = "scripts/ty/istemci.ts";
const ICE_AKTAR = "scripts/canli-ty-ice-aktar.ts";
const LISTELEME = "scripts/canli-kanal-listeleme-yaz.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: ISTEMCI,
    bul: " *  GEÇİCİ HATADA AYNI SAYFA YENİDEN DENENİR (K112b, 30.09.2026)", koy: " *  GEÇİCİ HATADA AYNI SAYFA YENİDEN DENENİR (K112b, 30.09.2026) zararsiz",
    bozdugu: "" },
  { ad: "YENIDEN DENEME KALKTI", yon: "KALDIRAN", dosya: ISTEMCI,
    bul: 's.tur === "ULASILAMADI" && deneme < GECICI_HATA_DENEME;', koy: 'false && deneme < GECICI_HATA_DENEME;',
    bozdugu: "tek gecici 500 tam taramayi yine yarida birakir" },
  { ad: "KALICI HATA DA TEKRARLANIYOR", yon: "FAZLADAN", dosya: ISTEMCI,
    bul: 's.tur === "ULASILAMADI" && deneme < GECICI_HATA_DENEME;', koy: 's.tur !== "VERI" && deneme < GECICI_HATA_DENEME;',
    bozdugu: "401/400 gibi kalici cevaplar bosuna tekrar sorulur, kosum uzar" },
  { ad: "DENEME SINIRI GENISLEDI", yon: "FAZLADAN", dosya: ISTEMCI,
    bul: 's.tur === "ULASILAMADI" && deneme < GECICI_HATA_DENEME;', koy: 's.tur === "ULASILAMADI" && deneme < GECICI_HATA_DENEME + 3;',
    bozdugu: "kesinti uzarsa cron 300 sn tavanini asar" },
  { ad: "HATA YINE TAVAN DIYE RAPORLANIYOR", yon: "KALDIRAN", dosya: ISTEMCI,
    bul: 'kesilme: { tur: "HATA", sayfa, sonuc: s }, tekrar', koy: 'kesilme: { tur: "TAVAN" }, tekrar',
    bozdugu: "sebep yine kaybolur - uc kez yasanan teshis korlugu" },
  { ad: "ICE AKTARMA YARIM DILIMI SAYMIYOR", yon: "KALDIRAN", dosya: ICE_AKTAR,
    bul: "    if (d.kesildiMi) dilimHata++;", koy: "",
    bozdugu: "siparis cekimi eksik okudugunu soylemez" },
  { ad: "LISTELEME SEBEBI YAZMIYOR", yon: "KALDIRAN", dosya: LISTELEME,
    bul: "${kesilmeMetni(s2.kesilme)}", koy: "sayfa tavanina carpildi",
    bozdugu: "senkron dustugunde neden dustugu gorunmez" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nTY SAYFA GEZİCİ — MUTASYON TURU\n");

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
  console.log("  OK  sayfa gezici İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
