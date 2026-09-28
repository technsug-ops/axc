import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  OKUYUCU KLAVYE DÜZENİ — MUTASYON HARNESS'I (K300, 28.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run okuyucu-duzeltme-mutasyon:kontrol
 *  `arama:dogrula`nın K300 bölümünün dişini sınar. ÜÇ YÖN: zararsız ·
 *  kaldıran (düzeltme sessizce düştü) · fazladan (ürün adı araması genişledi).
 *  Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/arama-dogrula.ts";
const BEKCI_BASLIGI = "K300 — OKUYUCU KLAVYE DÜZENİ";
const KURAL = "src/lib/varyant-arama-kurali.ts";
const OKUT = "src/app/okut/actions.ts";
const YERLESTIR = "src/app/yerlestir/actions.ts";
const RAF = "src/lib/raf-arama.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - kural yorumu", yon: "ZARARSIZ", dosya: KURAL,
    bul: " *  ⚠ BEYAN EDİLEN SINIR: yalnız `*`→`-` ve `ı`→`i`.", koy: " *  ⚠ BEYAN EDİLEN SINIR: yalnız iki dönüşüm.", bozdugu: "hicbir sey" },
  { ad: "DUZELTME HICBIR SEY YAPMIYOR", yon: "KALDIRAN", dosya: KURAL,
    bul: "  return kod.replace(/\\*/g, \"-\").replace(/ı/g, \"i\");", koy: "  return kod;",
    bozdugu: "OYU*LEG*0020 yine «bulunamadı»" },
  { ad: "ESDEGERLER DUZELTMEYI CAGIRMIYOR", yon: "KALDIRAN", dosya: KURAL,
    bul: "  for (const k of new Set([ham, okuyucuDuzeltmesi(ham)])) {", koy: "  for (const k of new Set([ham])) {",
    bozdugu: "urun okutmasi, sayim, ice aktarma duzeltmesiz" },
  { ad: "KOD BICIMI KAPISI KALKTI (ad aramasi genisler)", yon: "FAZLADAN", dosya: KURAL,
    bul: "  if (/\\s/.test(kod) || !/\\d/.test(kod)) return kod;\n", koy: "",
    bozdugu: "«bıçak» araması «biçak»ı da getirir" },
  { ad: "RAKAM SARTI KALKTI (yalniz bosluk)", yon: "FAZLADAN", dosya: KURAL,
    bul: "  if (/\\s/.test(kod) || !/\\d/.test(kod)) return kod;", koy: "  if (/\\s/.test(kod)) return kod;",
    bozdugu: "tek kelimelik urun adi duzeltilir" },
  { ad: "okunanKodlar DUZELTMIYOR", yon: "KALDIRAN", dosya: KURAL,
    bul: "  return [...new Set([ham, okuyucuDuzeltmesi(ham)])];", koy: "  return [ham];",
    bozdugu: "raf ve siparis okutmasi duzeltmesiz" },
  { ad: "SIPARIS NO DUZELTMESIZ", yon: "KALDIRAN", dosya: KURAL,
    bul: "  const kodlar = okunanKodlar(kod);\n  return [{ shipmentCode", koy: "  const kodlar = [kod.trim()];\n  return [{ shipmentCode",
    bozdugu: "Amazon siparis no 403*… bulunmaz" },
  { ad: "/okut RAF CIPLAK KOSULA DONDU", yon: "KALDIRAN", dosya: OKUT,
    bul: "      where: { code: { in: okunanKodlar(temiz) } },", koy: "      where: { code: temiz },",
    bozdugu: "A1*01 okutulunca raf bulunmaz" },
  { ad: "/yerlestir IKINCI RAF ARAMASI CIPLAK", yon: "KALDIRAN", dosya: YERLESTIR,
    bul: "        where: { code: { in: okunanKodlar(temiz) } },", koy: "        where: { code: temiz },",
    bozdugu: "yerlestirmede raf bulunmaz" },
  { ad: "RAF LISTESI ARAMASI DUZELTMESIZ", yon: "KALDIRAN", dosya: RAF,
    bul: "  const q = kucuk(okuyucuDuzeltmesi(arama.trim()));", koy: "  const q = kucuk(arama.trim());",
    bozdugu: "Raf Konumlari arama kutusu A1*01'i bulmaz" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nOKUYUCU KLAVYE DUZENI - MUTASYON TURU (K300)\n");
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
else console.log("\n  OK  Okuyucu duzeltmesi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
