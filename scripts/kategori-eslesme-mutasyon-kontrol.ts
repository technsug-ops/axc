import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  TRENDYOL KATEGORİ EŞLEŞMESİ — MUTASYON HARNESS'I (K283, 26.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run kategori-eslesme-mutasyon:kontrol
 *  `kategori-eslesme:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/kategori-eslesme-dogrula.ts";
const BEKCI_BASLIGI = "TRENDYOL KATEGORİ EŞLEŞMESİ";
const KURAL = "src/lib/kategori-eslesme.ts";
const YAZICI = "src/lib/kategori-eslesme-yaz.ts";
const SENKRON = "scripts/canli-kanal-listeleme-yaz.ts";
const SAYFA = "src/app/ayarlar/kategoriler/trendyol/page.tsx";
const EYLEM = "src/app/ayarlar/kategoriler/trendyol/eylemler.ts";
const TOPLA = "src/lib/uyari/topla.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - kural yorumu degisti", yon: "ZARARSIZ", dosya: KURAL,
    bul: "/** Trendyol kategori adı — tablo anahtarı; boşluk kırpılır, içerik aynen. */", koy: "/** TY anahtari. */", bozdugu: "hicbir sey" },
  { ad: "KARSILIGI SECILMEMIS KATEGORI YAZILIYOR (tahmin)", yon: "FAZLADAN", dosya: KURAL,
    bul: '  if (g.hedefKategoriId === null) return { atla: "KARSILIK_YOK" };\n', koy: "", bozdugu: "karsiliksiz kategori icin karar verilir - tahmin yasagi kirilir" },
  { ad: "ELLE SECILEN KATEGORI EZILIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: '  if (g.mevcutKaynak === "ELLE") return { atla: "ELLE" };\n', koy: "", bozdugu: "kullanicinin elle sectigi kategori gece senkronunda ezilir" },
  { ad: "KAYNAGI BILINMEYEN DOLU KATEGORI EZILIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: '  if (g.mevcutKaynak === null && g.mevcutKategoriId !== null) return { atla: "ELLE" };\n', koy: "", bozdugu: "K283 oncesi kategoriler kullanici onayi olmadan degisir" },
  { ad: "KDV KAPISI KALKTI", yon: "FAZLADAN", dosya: KURAL,
    bul: '  if (once !== sonra) return { atla: "KDV_DEGISIR" };\n', koy: "", bozdugu: "kategori degisimi KDV oranini sessizce degistirir" },
  { ad: "KATEGORISIZ URUN VARSAYILAN %20 SAYILMIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: "  return istisna ?? kategoriKdv ?? VARSAYILAN_KDV;", koy: "  return istisna ?? kategoriKdv ?? 10;", bozdugu: "kategorisiz urun %10'luk kategoriye sessizce gecer" },
  { ad: "YAZICI KURALI ATLIYOR (hep yaz)", yon: "FAZLADAN", dosya: YAZICI,
    bul: '    const yeniKategori = "yaz" in karar ? karar.yaz : null;', koy: '    const yeniKategori = h?.categoryId ?? null;', bozdugu: "ELLE ve KDV kapilari yazicida islemez" },
  { ad: "GUNCELLEME SARTSIZ (araya giren elle degisiklik ezilir)", yon: "FAZLADAN", dosya: YAZICI,
    bul: "      where: { id: y.id, categoryId: y.eskiKategori },", koy: "      where: { id: y.id },", bozdugu: "okuma ile yazma arasinda elle degistirilen kategori ezilir" },
  { ad: "YENI TY KATEGORISINE KARSILIK UYDURULUYOR", yon: "FAZLADAN", dosya: YAZICI,
    bul: "data: yeni.map((tyKategori) => ({ tyKategori }))", koy: "data: yeni.map((tyKategori) => ({ tyKategori, categoryId: null }))", bozdugu: "tabloya giris satiri kategori alanina dokunur - tahminin kapisi aralanir" },
  { ad: "KATEGORI DEGISIMI IZE YAZILMIYOR", yon: "KALDIRAN", dosya: YAZICI,
    bul: "        detail: JSON.stringify({ eski: y.eskiKategori, yeni: y.yeniKategori, tyKategori: y.tyKategori }),", koy: "        detail: JSON.stringify({ tyKategori: y.tyKategori }),", bozdugu: "geri alma ve teshis icin eski deger kaybolur" },
  { ad: "SENKRON YAZICIYI CAGIRMIYOR", yon: "KALDIRAN", dosya: SENKRON,
    bul: "    kategori = await tyKategorileriniYaz(", koy: "    kategori = await (async (_a: unknown) => ({ aday: 0, yeniTyKategori: 0, eslesenUrun: 0, tyYazilan: 0, kategoriYazilan: 0, atlanan: { KARSILIK_YOK: 0, AYNI: 0, ELLE: 0, KDV_DEGISIR: 0, CAKISAN: 0 }, tavandaKalan: 0 }))(", bozdugu: "EAN gelen urun kategorisini hic almaz" },
  { ad: "EKRAN SAYILARI KURALDAN DEGIL", yon: "KALDIRAN", dosya: SAYFA,
    bul: "    const karar = kategoriKarari({", koy: "    const karar = ((_g: unknown) => ({ yaz: \"\" }) as { yaz: string } | { atla: string })({", bozdugu: "ekrandaki KDV bekleyen sayisi yazimla ayrisir" },
  { ad: "EYLEM IZIN SORMUYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: '    if (!baglam || !baglam.izinler.has("ayar.yaz")) return { hata: "YETKISIZ" };', koy: '    if (!baglam) return { hata: "YETKISIZ" };', bozdugu: "ayar yetkisi olmayan eslesmeyi degistirir" },
  { ad: "CAN UYARISI BASKA SAYACTAN", yon: "KALDIRAN", dosya: TOPLA,
    bul: "    tyKategoriKarsiliksiz: { sayi: await tyKategoriKarsiliksizSayisi() },", koy: "    tyKategoriKarsiliksiz: { sayi: 0 },", bozdugu: "karsiliksiz kategori varken can susar" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nTRENDYOL KATEGORI ESLESMESI - MUTASYON TURU (K283)\n");
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
else console.log("\n  OK  Kategori eslesmesi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
