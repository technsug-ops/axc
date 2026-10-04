import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  SAĞLAYICI İZNİ — MUTASYON HARNESS'İ (K303 4c-2, 04.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run saglayici-izni-mutasyon:kontrol
 * ============================================================================
 */

const BEKCI = "scripts/saglayici-izni-dogrula.ts";
const BEKCI_BASLIGI = "SAĞLAYICI İZNİ BEKÇİSİ";
const TOHUM = "prisma/seed-yetki.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: TOHUM,
    bul: "// --- 2) SAHİP: sistem rolü, bütün FİRMA izinleri ---", koy: "// --- 2) SAHİP: sistem rolü, firma izinleri ---",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "SAHIP SAGLAYICI IZNI DE ALIYOR (eski TUM_IZINLER)", yon: "FAZLADAN", dosya: TOHUM,
    bul: "    data: FIRMA_IZINLERI.map((permissionKey) => ({\n      roleId: sahip.id,",
    koy: "    data: [...FIRMA_IZINLERI, \"destek.yonet\"].map((permissionKey) => ({\n      roleId: sahip.id,",
    bozdugu: "her yeni firmanin Sahibi butun firmalarin destek taleplerini cozer" },
  { ad: "SAHIP FIRMA IZINLERININ BIR KISMINI ALIYOR", yon: "KALDIRAN", dosya: TOHUM,
    bul: "    data: FIRMA_IZINLERI.map((permissionKey) => ({\n      roleId: sahip.id,",
    koy: "    data: FIRMA_IZINLERI.slice(1).map((permissionKey) => ({\n      roleId: sahip.id,",
    bozdugu: "yeni firmanin sahibi bir ekrani goremez" },
  { ad: "VERILEN FIRMADA UYELIKSIZLER SAHIP YAPILIYOR", yon: "FAZLADAN", dosya: TOHUM,
    bul: "  if (verilenFirma) {\n    console.log(\"Üyelik ", koy: "  if (false) {\n    console.log(\"Üyelik ",
    bozdugu: "yeni acilan her firmada uyeligi olmayan herkes Sahip olur" },
  /* `izinler.ts`teki «saglayici: true» işaretini kaldıran mutasyon BİLEREK burada
     değil: o dosyayı ~50 harness okuyor ve çakışma bekçisi onu sıralı gruba
     zorlardı; aynı korumayı `yetki:dogrula` («destek.yonet SAĞLAYICI izni olarak
     işaretli») zaten veriyor. */
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nSAĞLAYICI İZNİ — MUTASYON TURU\n");
let dogru = 0;
const yanlis: string[] = [];
const bozuk: string[] = [];
for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const adet = asil.split(bul).length - 1;
  if (adet !== 1) { bozuk.push(`${m.ad}\n       desen ${adet} kez geçiyor (1 olmalı) — ${m.dosya}`); continue; }
  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) { bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`); continue; }
    sonuc = bekciyiKostur();
  } finally {
    dayanikliYaz(m.dosya, asil);
  }
  const isaret = m.yon === "KALDIRAN" ? "-" : m.yon === "FAZLADAN" ? "+" : "o";
  if (!sonuc.ciktiVar) bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
  else if ((m.yon === "ZARARSIZ") === (sonuc.kod === 0)) { dogru++; console.log(`  OK  ${isaret} ${m.ad}`); }
  else yanlis.push(m.yon === "ZARARSIZ" ? `${m.ad}\n       zararsız mutasyon KIRMIZI yandı` : `${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
}
console.log("");
for (const k of yanlis) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(`\n  ${dogru}/${MUTASYONLAR.length} mutasyon beklendiği gibi davrandı`);
if (yanlis.length || bozuk.length) { console.log("\n  Beklenmeyen ya da ölçülemeyen mutasyon var — bekçi eksik.\n"); process.exitCode = 1; }
else console.log("  OK  Sağlayıcı izni İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
