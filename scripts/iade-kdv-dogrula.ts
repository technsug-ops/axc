import { readFileSync } from "node:fs";

import { iadeKdvEtkisi } from "../src/lib/iade-kdv";

/**
 * ============================================================================
 *  K172 — İADE KDV ETKİSİ: TÜRETİLİR, SAKLANMAZ
 * ----------------------------------------------------------------------------
 *  Spec: "iade KDV'si ayrı gösterilmeli". Motor formülü net2 = net1 −
 *  odenecekKdvDegisimi olduğu için iade KDV = net1 − net2 (iki mevcut alan).
 *  Şema açmadan türetilir. Bu bekçi hem türetmeyi hem "şema açılmadı"yı sabitler.
 * ============================================================================
 */

let hata = 0;
let gecen = 0;
function kontrol(ad: string, ok: boolean) {
  if (ok) {
    gecen++;
    console.log(`  ✓ ${ad}`);
  } else {
    hata++;
    console.log(`  ✗ ${ad}`);
  }
}

// ── SAF GÖVDE — DEĞER TESTİ ────────────────────────────────────────────────
kontrol("net1−net2 türetir (1000,800 → 200)", iadeKdvEtkisi(1000, 800) === 200);
kontrol(
  "olağan iade NEGATİF etki (satış KDV geri geldi)",
  iadeKdvEtkisi(-549.6, 357.62) === -907.22,
);
kontrol("net1 null → null (uydurma sıfır yok)", iadeKdvEtkisi(null, 200) === null);
kontrol("net2 null → null", iadeKdvEtkisi(200, null) === null);
kontrol("kuruşa yuvarlar", iadeKdvEtkisi(100.005, 0) === 100.01);

// ── GÖSTERİM — iade-blogu çağırıyor (davranışa bağlı) ──────────────────────
const blogu = readFileSync("src/components/iade-blogu.tsx", "utf8");
kontrol(
  "iade-blogu iadeKdvEtkisi'ni ÇAĞIRIYOR (net1,net2 ile)",
  /iadeKdvEtkisi\(iade\.net1, iade\.net2\)/.test(blogu),
);

// ── K52 — ŞEMA AÇILMADI (türetilebilen için sütun yok) ─────────────────────
const sema = readFileSync("prisma/schema.prisma", "utf8");
kontrol(
  "Return'e iadeKdvEtkisi SÜTUNU açılmadı (türetme, şema değil)",
  !/^\s*iadeKdvEtkisi\s+Decimal/m.test(sema),
);

console.log(`\n${hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ"} (${gecen}/${gecen + hata})\n`);
process.exit(hata === 0 ? 0 : 1);
