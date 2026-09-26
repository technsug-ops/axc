import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  MARKA KOD TABLOSU — MUTASYON HARNESS'I (K285, 26.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run marka-kodu-mutasyon:kontrol
 *  `marka-kodu:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/marka-kodu-dogrula.ts";
const BEKCI_BASLIGI = "MARKA KOD TABLOSU (K285)";
const KURAL = "src/lib/marka-kodu.ts";
const VERI = "src/lib/marka-kodu-veri.ts";
const YAZ = "src/lib/marka-kodu-yaz.ts";
const EYLEM = "src/app/ayarlar/markalar/eylemler.ts";
const URUN = "src/app/urunler/actions.ts";
const LISTE = "src/lib/disa-aktarma/listeler.ts";
const YEDEK = "src/lib/yedek-bicim.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - kural yorumu degisti", yon: "ZARARSIZ", dosya: KURAL,
    bul: "/** Kod biçimi: tam 3 karakter, büyük harf ya da rakam. */", koy: "/** Kod bicimi. */", bozdugu: "hicbir sey" },
  { ad: "ANAHTAR BUYUK/KUCUK HARF AYIRIYOR", yon: "KALDIRAN", dosya: KURAL,
    bul: '    .toUpperCase()\n    .replace(/[^A-Z0-9]/g, "");', koy: '    .replace(/[^A-Za-z0-9]/g, "");', bozdugu: "ANKER ve Anker iki ayri marka olur" },
  { ad: "ANAHTAR RAKAMI ATIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: '    .replace(/[^A-Z0-9]/g, "");', koy: '    .replace(/[^A-Z]/g, "");', bozdugu: "3M ile M ayni marka sayilir" },
  { ad: "OKUNAKLI KOD KULLANIMDAYKEN DE VERILIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: "  if (sabit && !kullanilan.has(sabit)) return sabit;", koy: "  if (sabit) return sabit;", bozdugu: "iki markaya ayni kod onerilir" },
  { ad: "ADAY YOKSA KOD UYDURULUYOR (dolgu)", yon: "FAZLADAN", dosya: KURAL,
    bul: "  return kodAdaylari(anahtar).find((k) => !kullanilan.has(k)) ?? null;",
    koy: '  return kodAdaylari(anahtar).find((k) => !kullanilan.has(k)) ?? anahtar.padEnd(3, "X").slice(0, 3);', bozdugu: "anlamsiz kod uydurulur" },
  { ad: "KOD KAPISI KULLANIMDAKI KODU KABUL EDIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: '  if (digerKodlar.has(kod)) return "KULLANIMDA";\n', koy: "", bozdugu: "Karaca/Karcher cakismasi geri gelir" },
  { ad: "ONERILER SIRALI DEGIL (ayni kod iki oneriye)", yon: "FAZLADAN", dosya: VERI,
    bul: "      if (oneri) kullanilan.add(oneri);\n", koy: "", bozdugu: "toplu eklemede ikinci marka ayni kodu ister" },
  { ad: "MARKASIZ LISTESI SAYIDAN FARKLI OLCUTLE", yon: "FAZLADAN", dosya: VERI,
    bul: '    .filter((p) => markaAnahtari(p.brand) === "")', koy: "    .filter((p) => p.brand === null)", bozdugu: "ekrandaki sayi ile Excel ayrisir" },
  { ad: "EXCEL BASKA GOVDEDEN", yon: "KALDIRAN", dosya: LISTE,
    bul: "(await markasizUrunler()).map(", koy: "([] as Awaited<ReturnType<typeof markasizUrunler>>).map(", bozdugu: "indirilen liste bos gelir" },
  { ad: "KOD DENETIMI YOK", yon: "FAZLADAN", dosya: YAZ,
    bul: '    const hata = kodDenetle(secilen, kodlar);\n    if (hata) return { durum: "KOD_HATASI", hata };\n', koy: "", bozdugu: "bicimsiz kod tabloya yazilir" },
  { ad: "BAG SARTSIZ (elle baglanmis urun ezilir)", yon: "FAZLADAN", dosya: YAZ,
    bul: "where: { id: { in: urunler.map((u) => u.id) }, brandId: null },", koy: "where: { id: { in: urunler.map((u) => u.id) } },", bozdugu: "arada baska markaya baglanan urun ezilir" },
  { ad: "KOD DEGISIMI SARTSIZ", yon: "FAZLADAN", dosya: YAZ,
    bul: "where: { id, code: marka.code }, data: { code: yeni }", koy: "where: { id }, data: { code: yeni }", bozdugu: "arada degisen kod ezilir" },
  { ad: "KOD DEGISIMI IZE YAZILMIYOR", yon: "KALDIRAN", dosya: YAZ,
    bul: "JSON.stringify({ eski: marka.code, yeni })", koy: "JSON.stringify({ yeni })", bozdugu: "eski kod kaybolur" },
  { ad: "URUN GUNCELLEMESI BAGI YENILEMIYOR", yon: "KALDIRAN", dosya: URUN,
    bul: "          brandId: markaBagi,\n", koy: "", bozdugu: "marka degisen urun eski markaya bagli kalir" },
  { ad: "YENI URUN BAGLANMIYOR", yon: "KALDIRAN", dosya: URUN,
    bul: "        brandId: await markaBagiBul(veri.marka),\n", koy: "", bozdugu: "yeni urun hep baglanmayi bekler" },
  { ad: "KOD KAYDETME IZIN SORMUYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: 'Promise<EylemSonucu> {\n  try {\n    if (!(await izinVarMi("ayar.yaz"))) return { tamam: false, hata: "YETKISIZ" };\n    const s = await markaKoduDegistir',
    koy: "Promise<EylemSonucu> {\n  try {\n    const s = await markaKoduDegistir", bozdugu: "yetkisiz kullanici marka kodunu degistirir" },
  { ad: "TOPLU EKLEME KODSUZU ATLAMIYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: "      if (m.tabloId === null && m.oneri === null) {\n        kodsuz++;\n        continue;\n      }\n", koy: "", bozdugu: "elle girilmesi gereken kodsuz marka sayidan kaybolur" },
  { ad: "YEDEK MARKA TABLOSUNU TASIMIYOR", yon: "KALDIRAN", dosya: YEDEK,
    bul: '  "Brand",\n', koy: "", bozdugu: "geri yuklemede marka kodlari kaybolur" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nMARKA KOD TABLOSU - MUTASYON TURU (K285)\n");
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
else console.log("\n  OK  Marka kod tablosu UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
