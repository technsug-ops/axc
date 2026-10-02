import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ÜRÜN AKTİFLİĞİ — MUTASYON HARNESS'İ (02.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run urun-aktiflik-mutasyon:kontrol
 * ============================================================================
 */

const BEKCI = "scripts/urun-aktiflik-dogrula.ts";
const BEKCI_BASLIGI = "ÜRÜN AKTİFLİĞİ BEKÇİSİ";
const KURAL = "src/lib/urun-aktiflik.ts";
const EYLEM = "src/app/urunler/actions.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: KURAL,
    bul: "toplu temizliğin kuralıyla aynı yön.", koy: "aynı yön.",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "KURAL HEP AKTIF", yon: "FAZLADAN", dosya: KURAL,
    bul: "  return varyantlar.some((v) => v.aktif);", koy: "  return true || varyantlar.length > 0;",
    bozdugu: "butun varyantlari pasif urun aktif gorunur" },
  { ad: "KURAL HEPSI AKTIF ISTIYOR", yon: "KALDIRAN", dosya: KURAL,
    bul: "  return varyantlar.some((v) => v.aktif);", koy: "  return varyantlar.length > 0 && varyantlar.every((v) => v.aktif);",
    bozdugu: "tek varyanti aktif urun pasif kalir (olculen vaka)" },
  { ad: "GUNCELLEME URUNU YAZMIYOR", yon: "KALDIRAN", dosya: EYLEM,
    bul: "          isActive: urunAktifMi(veri.varyantlar),", koy: "",
    bozdugu: "varyant aktif edilince urun pasif kalir (eski kusur)" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nÜRÜN AKTİFLİĞİ — MUTASYON TURU\n");

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
  console.log("  OK  Ürün aktifliği İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
