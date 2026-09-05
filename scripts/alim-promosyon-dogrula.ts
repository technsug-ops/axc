import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  K171 — PROMOSYON (BEDAVA ALIM) BEKÇİSİ
 * ----------------------------------------------------------------------------
 *  Halil 05.09.2026: promosyon ürünü alımda "maliyet 0'lı parti" olarak
 *  girilir; FIFO/stok/kâr o partiyi takip eder → satış "maliyet yok" değil
 *  CALCULATED olur. İşaret bir BEYANDIR (İlke #11 sessiz sıfır):
 *  · promosyon İŞARETLİ → maliyet 0 ZORUNLU
 *  · promosyon İŞARETSİZ → maliyet 0 YASAK (belirsizlik üretirdi)
 *
 *  ⚠ ZOD "use server" dosyasında (senkron export edilemez) → kaynak tarama;
 *  desenler KULLANIM BLOĞUNA daraltılmış ve mutasyonla sınanmış.
 * ============================================================================
 */

let hata = 0;
let gecen = 0;
function kontrol(ad: string, sonuc: boolean) {
  if (sonuc) {
    gecen++;
    console.log(`  ✓ ${ad}`);
  } else {
    hata++;
    console.log(`  ✗ ${ad}`);
  }
}
function yorumsuz(kaynak: string): string {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

const actions = yorumsuz(readFileSync("src/app/alimlar/actions.ts", "utf8"));
const form = yorumsuz(readFileSync("src/app/alimlar/alim-formu.tsx", "utf8"));

// ── ZOD: iki yönlü kapı — superRefine bloğuna daraltılmış ──────────────────
const refBasi = actions.indexOf(".superRefine((k, ctx) =>");
kontrol("zod superRefine kapısı VAR", refBasi >= 0);
const refB = refBasi >= 0 ? actions.slice(refBasi, refBasi + 900) : "";
kontrol(
  "promosyon İŞARETLİ + maliyet≠0 → hata (path unitCostAmount)",
  /if \(k\.promosyon && k\.unitCostAmount !== 0\)/.test(refB) &&
    refB.includes('message: t("promosyonMaliyetSifir")'),
);
kontrol(
  "promosyon İŞARETSİZ + maliyet==0 → hata (sessiz sıfır yasak)",
  /if \(!k\.promosyon && k\.unitCostAmount === 0\)/.test(refB) &&
    refB.includes('message: t("maliyetSifirPromosyonIsaretle")'),
);
kontrol(
  "zod kalem şemasında promosyon alanı VAR",
  /promosyon: z\.boolean\(\)/.test(actions),
);

// ── ACTIONS: üç yazma noktası da promosyon taşıyor ─────────────────────────
kontrol(
  "yeni alım create promosyon yazıyor",
  /unitCostCurrency: k\.unitCostCurrency,\s*promosyon: k\.promosyon,/.test(actions),
);
kontrol(
  "güncelleme create+update promosyon yazıyor (2 yer)",
  (actions.match(/promosyon: yeni\.promosyon,/g) ?? []).length === 2,
);

// ── FORM: checkbox + kilit + gönderim ──────────────────────────────────────
kontrol(
  "form maliyet input promosyonda KİLİTLİ (disabled + value 0)",
  /disabled=\{kalem\.promosyon\}/.test(form) &&
    /value=\{kalem\.promosyon \? "0" : kalem\.unitCostAmount\}/.test(form),
);
kontrol(
  "form promosyon checkbox VAR (kalemGuncelle promosyon)",
  /checked=\{kalem\.promosyon\}/.test(form) &&
    /promosyon: e\.target\.checked/.test(form),
);
kontrol(
  "gönderim: promosyonda maliyet KESİN 0",
  /unitCostAmount: k\.promosyon\s*\?\s*0/.test(form),
);
kontrol(
  "gönderim map promosyon taşıyor",
  /promosyon: k\.promosyon,/.test(form),
);

console.log(`\n${hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ"} (${gecen}/${gecen + hata})\n`);
process.exit(hata === 0 ? 0 : 1);
