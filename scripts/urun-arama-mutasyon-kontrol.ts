import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ÜRÜNLER ARAMASI (EKRAN + EXCEL) — MUTASYON HARNESS'I (K302, 28.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run urun-arama-mutasyon:kontrol
 *  `arama:dogrula`nın K302 ölçütlerinin dişini sınar. ÜÇ YÖN: zararsız ·
 *  kaldıran (Excel/ekran dalı düştü) · fazladan (boş kümede dal eklendi).
 *  Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/arama-dogrula.ts";
const BEKCI_BASLIGI = "K300 — OKUYUCU KLAVYE DÜZENİ"; // arama:dogrula sonuna kadar koştuğunun işareti
const GOVDE = "src/lib/urun-arama.ts";
const EKRAN = "src/app/urunler/page.tsx";
const LISTE = "src/lib/disa-aktarma/listeler.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - govde yorumu", yon: "ZARARSIZ", dosya: GOVDE,
    bul: " * Boş arama → `undefined` (süzgeç yok).", koy: " * Boş arama → süzgeç yok.", bozdugu: "hicbir sey" },
  { ad: "EXCEL ESKI DAR KOSULA DONDU", yon: "KALDIRAN", dosya: LISTE,
    bul: "(await urunAramaKosulu(arama)) ?? {}] },", koy: "(arama ? { OR: [{ name: { contains: arama } }, { variants: { some: { companySku: { contains: arama } } } }] } : {})] },",
    bozdugu: "kanal SKU'suyla aranan urun Excel'e dusmez" },
  { ad: "EXCEL ARAMAYI YOK SAYIYOR", yon: "KALDIRAN", dosya: LISTE,
    bul: "(await urunAramaKosulu(arama)) ?? {}] },", koy: "{}] },", bozdugu: "Excel aramadan bagimsiz butun urunleri indirir" },
  { ad: "EKRAN GOVDEYI CAGIRMIYOR", yon: "KALDIRAN", dosya: EKRAN,
    bul: "  const suzgecArama = await urunAramaKosulu(arama);", koy: "  const suzgecArama = arama ? { OR: [{ name: { contains: arama } }] } : undefined;",
    bozdugu: "ekran ile Excel ayrisir" },
  { ad: "KANAL SKU DALI DUSTU", yon: "KALDIRAN", dosya: GOVDE,
    bul: "      ...aramaKosulu(arama).map((k) => ({ variants: { some: k } })),", koy: "",
    bozdugu: "kanal kodu / eski kod / barkodla urun bulunmaz" },
  { ad: "SATIS KIMLIGI DALI DUSTU", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  return satisVaryantIdleri.length > 0", koy: "  return false && satisVaryantIdleri.length > 0",
    bozdugu: "siparis no ile arama bos doner" },
  { ad: "BOS KUMEDE ID DALI EKLENIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  return satisVaryantIdleri.length > 0", koy: "  return true",
    bozdugu: "bos kume dali sorguyu sessizce degistirir" },
  { ad: "BOS ARAMA SUZGEC KURUYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  if (!arama) return undefined;", koy: "",
    bozdugu: "arama yokken bile kosul uretilir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nURUNLER ARAMASI - MUTASYON TURU (K302)\n");
let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];
for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const n = asil.split(bul).length - 1;
  if (n !== 1) { bozuk.push(`${m.ad}\n       desen ${m.dosya} icinde ${n} kez geciyor (1 olmali) - OLCULEMEDI`); continue; }
  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) { bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`); continue; }
    sonuc = bekciyiKostur();
  } finally {
    dayanikliYaz(m.dosya, asil);
    if (readFileSync(m.dosya, "utf8") !== asil) bozuk.push(`${m.ad}\n       GERI ALMA BASARISIZ - dosya mutasyonlu kaldi`);
  }
  const isaret = m.yon === "ZARARSIZ" ? "o" : m.yon === "KALDIRAN" ? "-" : "+";
  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0 && sonuc.ciktiVar) { yakalanan++; console.log(`  OK  ${isaret} ${m.ad}`); }
    else if (!sonuc.ciktiVar) bozuk.push(`${m.ad}\n       bekci COKTU - olcum gecersiz`);
    else kacan.push(`${m.ad}\n       YALANCI KIRMIZI`);
    continue;
  }
  if (sonuc.kod !== 0 && sonuc.ciktiVar) { yakalanan++; console.log(`  OK  ${isaret} ${m.ad}`); }
  else if (sonuc.kod !== 0) bozuk.push(`${m.ad}\n       bekci COKTU (baslik basilmadi) - olcum gecersiz`);
  else kacan.push(`${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
}
console.log("");
for (const k of kacan) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(`\n  ${yakalanan}/${MUTASYONLAR.length} mutasyon beklendigi gibi davrandi`);
if (kacan.length || bozuk.length) { console.log("\n  Kacan ya da olculemeyen mutasyon var - bekci eksik.\n"); process.exitCode = 1; }
else console.log("\n  OK  Urunler aramasi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
