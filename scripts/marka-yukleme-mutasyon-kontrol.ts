import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  MARKA LİSTESİ YÜKLEME + ARAMA — MUTASYON HARNESS'I (K288, 27.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run marka-yukleme-mutasyon:kontrol
 *  `marka-yukleme:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/marka-yukleme-dogrula.ts";
const BEKCI_BASLIGI = "MARKA LİSTESİ YÜKLEME + ARAMA (K288)";
const KURAL = "src/lib/marka-yukleme.ts";
const EYLEM = "src/app/ayarlar/markalar/yukleme-eylemleri.ts";
const MARKALAR = "src/app/ayarlar/markalar/page.tsx";
const SKU = "src/app/urunler/sku-onizleme/page.tsx";
const TY = "src/app/ayarlar/kategoriler/trendyol/page.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - kural yorumu degisti", yon: "ZARARSIZ", dosya: KURAL,
    bul: "  /** Marka hücresi boş bırakılan satır. */", koy: "  /** Bos satir. */", bozdugu: "hicbir sey" },
  { ad: "DOLU MARKA EZILIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: "    if (mevcut !== \"\" || u.brandId !== null) {", koy: "    if (false && (mevcut !== \"\" || u.brandId !== null)) {", bozdugu: "kullanicinin markasi listeyle ezilir" },
  { ad: "TABLODAKI MARKAYA BAGLANMIYOR", yon: "KALDIRAN", dosya: KURAL,
    bul: "yazim: b ? b.name : yazim, brandId: b?.id ?? null", koy: "yazim, brandId: null", bozdugu: "marka yazilir ama koda baglanmaz" },
  { ad: "KIMLIK TEKRAR KAPISI KALKTI", yon: "FAZLADAN", dosya: KURAL,
    bul: '    if ((say.get(s.kimlik) ?? 0) > 1) { hata("KIMLIK_TEKRAR"); continue; }\n', koy: "", bozdugu: "celisen iki satirdan biri sessizce kazanir" },
  { ad: "YAZIM SARTSIZ", yon: "FAZLADAN", dosya: EYLEM,
    bul: "where: { id: y.kimlik, brandId: null, OR: [{ brand: null }, { brand: \"\" }] },", koy: "where: { id: y.kimlik },", bozdugu: "arada girilen marka ezilir" },
  { ad: "UYGULA IZIN SORMUYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: 'Promise<MarkaUygulama> {\n  try {\n    if (!(await izinVarMi("urun.yaz"))) return { tamam: false, hata: "YETKISIZ" };\n', koy: "Promise<MarkaUygulama> {\n  try {\n", bozdugu: "yetkisiz kullanici toplu marka yazar" },
  { ad: "IZ YAZILMIYOR", yon: "KALDIRAN", dosya: EYLEM,
    bul: 'action: "MARKA_LISTE_YUKLENDI"', koy: 'action: "X"', bozdugu: "toplu yazimin izi kaybolur" },
  { ad: "MARKALAR ARAMA KUTUSU YOK", yon: "KALDIRAN", dosya: MARKALAR,
    bul: '<KodAramaKutusu temelAdres="/ayarlar/markalar" baslangic={arama} tasinanlar={{}} ipucu={t("aramaIpucu")} />', koy: "", bozdugu: "109 marka arasinda arama yapilamaz (Ilke #17)" },
  { ad: "MARKA ARAMASI BUYUK/KUCUK HARFE DUYARLI", yon: "FAZLADAN", dosya: MARKALAR,
    bul: "  const k = markaAnahtari(q);", koy: "  const k = q;", bozdugu: "«philips» yazan Philips'i bulamaz" },
  { ad: "HEPSINI EKLE SAYISI ARAMAYA BAGLANDI", yon: "FAZLADAN", dosya: MARKALAR,
    bul: "  const eklenecek = tumBagsiz.filter(", koy: "  const eklenecek = bagsiz.filter(", bozdugu: "onay metni aramadaki sayiyi soyler, eylem hepsine isler" },
  { ad: "SKU ONIZLEME ARAMA KUTUSU YOK", yon: "KALDIRAN", dosya: SKU,
    bul: '<KodAramaKutusu temelAdres="/urunler/sku-onizleme" baslangic={arama} tasinanlar={{}} ipucu={t("aramaIpucu")} />', koy: "", bozdugu: "1255 satirda arama yapilamaz (Ilke #17)" },
  { ad: "SKU ARAMASI YENI KODU ARAMIYOR", yon: "KALDIRAN", dosya: SKU,
    bul: "[s.urunAdi, s.eskiFirmaSku, s.sku, s.yeniKod ?? \"\", s.marka].some(", koy: "[s.urunAdi, s.eskiFirmaSku, s.sku, s.marka].some(", bozdugu: "etiketteki yeni kodla urun bulunamaz" },
  { ad: "TY ESLESME ARAMA KUTUSU YOK", yon: "KALDIRAN", dosya: TY,
    bul: '<KodAramaKutusu temelAdres="/ayarlar/kategoriler/trendyol" baslangic={arama} tasinanlar={{}} ipucu={t("aramaIpucu")} />', koy: "", bozdugu: "208 kategori arasinda arama yapilamaz (Ilke #17)" },
  { ad: "TY LISTESI ARAMAYI YOK SAYIYOR", yon: "KALDIRAN", dosya: TY,
    bul: "{gorunen.map((s) => (", koy: "{satirlar.map((s) => (", bozdugu: "arama yazilir ama liste suzulmez" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nMARKA LISTESI YUKLEME + ARAMA - MUTASYON TURU (K288)\n");
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
else console.log("\n  OK  Marka yukleme + arama UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
