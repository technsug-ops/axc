import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  SKU ÖNİZLEMESİ — MUTASYON HARNESS'I (K286, 26.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run sku-onizleme-mutasyon:kontrol
 *  `sku-onizleme:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/sku-onizleme-dogrula.ts";
const BEKCI_BASLIGI = "SKU ÖNİZLEMESİ (K286)";
const KURAL = "src/lib/sku-onizleme.ts";
const VERI = "src/lib/sku-onizleme-veri.ts";
const SAYFA = "src/app/urunler/sku-onizleme/page.tsx";
const LISTE = "src/lib/disa-aktarma/listeler.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - kural yorumu degisti", yon: "ZARARSIZ", dosya: KURAL,
    bul: "export const SIRA_HANESI = 4;", koy: "export const SIRA_HANESI = 4; // hane", bozdugu: "hicbir sey" },
  { ad: "SIRA 3 HANEYE DUSTU", yon: "FAZLADAN", dosya: KURAL,
    bul: "export const SIRA_HANESI = 4;", koy: "export const SIRA_HANESI = 3;", bozdugu: "etiket bicimi degisir, 999 ustunde kod uzar" },
  { ad: "KATEGORISIZE KOD UYDURULUYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: '    if (!g.kategoriVar) return { ...g, yeniKod: null, durum: "KATEGORI_YOK" };\n', koy: "", bozdugu: "kategorisiz urun null kodla/yanlis sebeple duser" },
  { ad: "MARKASIZA KOD UYDURULUYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: '    if (!g.markaKodu) return { ...g, yeniKod: null, durum: "MARKA_YOK" };\n', koy: "", bozdugu: "marka parcasi bos kod uretilir" },
  { ad: "CAKISAN KOD ATLANMIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: "    while (dolu(kod) && deneme < 1000) {", koy: "    while (false && dolu(kod) && deneme < 1000) {", bozdugu: "baska urunun kodu yeni koda verilir" },
  { ad: "KENDI KODU CAKISMA SAYILIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: "const dolu = (k: string) => kullanilanKodlar.has(k) && !g.kendiKodlari.includes(k);", koy: "const dolu = (k: string) => kullanilanKodlar.has(k);", bozdugu: "zaten dogru kodu olan urun baska numaraya kayar" },
  { ad: "SAYAC ON EK BASINA DEGIL", yon: "FAZLADAN", dosya: KURAL,
    bul: "    const onEk = `${g.kategoriKodu}-${g.markaKodu}`;", koy: "    const onEk = \"TEK\";", bozdugu: "her markanin sirasi birbirine karisir" },
  { ad: "KALICI SIRA YOK", yon: "KALDIRAN", dosya: VERI,
    bul: '      orderBy: [{ product: { createdAt: "asc" } }, { createdAt: "asc" }, { id: "asc" }],\n', koy: "", bozdugu: "her koşumda farkli kod cikar" },
  { ad: "CAKISMA KUMESI YALNIZ AKTIFLER", yon: "FAZLADAN", dosya: VERI,
    bul: "prisma.productVariant.findMany({ select: { sku: true, companySku: true, barcode: true } }),", koy: "prisma.productVariant.findMany({ where: { isActive: true }, select: { sku: true, companySku: true, barcode: true } }),", bozdugu: "pasif urunun kodu yeni urune verilir" },
  { ad: "BARKOD CAKISMA KUMESINDE DEGIL", yon: "KALDIRAN", dosya: VERI,
    bul: "for (const d of [k.sku, k.companySku, k.barcode]) if (d) kullanilan.add(d.trim());", koy: "for (const d of [k.sku, k.companySku]) if (d) kullanilan.add(d.trim());", bozdugu: "yeni kod bir barkodla ayni olabilir" },
  { ad: "ONIZLEME YAZIYOR", yon: "FAZLADAN", dosya: VERI,
    bul: "  const bilgi = new Map(varyantlar.map((v) => [v.id, v]));", koy: "  await prisma.productVariant.updateMany({ where: { id: \"x\" }, data: {} });\n  const bilgi = new Map(varyantlar.map((v) => [v.id, v]));", bozdugu: "onizleme veriyi degistirir" },
  { ad: "SIFIR KUTU GIZLENIYOR", yon: "FAZLADAN", dosya: SAYFA,
    bul: "{DURUMLAR.map((d) => (", koy: "{DURUMLAR.filter((d) => satirlar.some((s) => s.durum === d)).map((d) => (", bozdugu: "temiz ile olculmemis ayni gorunur" },
  { ad: "EXCEL BASKA GOVDEDEN", yon: "KALDIRAN", dosya: LISTE,
    bul: "(await skuOnizlemeSatirlari()).map(", koy: "([] as Awaited<ReturnType<typeof skuOnizlemeSatirlari>>).map(", bozdugu: "Excel ekranla ayrisir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nSKU ONIZLEMESI - MUTASYON TURU (K286)\n");
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
else console.log("\n  OK  SKU onizlemesi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
