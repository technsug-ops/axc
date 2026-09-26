import { kaynakOku } from "./kaynak-oku";
import {
  VARSAYILAN_KDV,
  etkinKdv,
  kategoriKarari,
  tyKategoriAnahtari,
  type KategoriKararGirdisi,
} from "../src/lib/kategori-eslesme";

/**
 * ============================================================================
 *  TRENDYOL KATEGORİ EŞLEŞMESİ BEKÇİSİ (K283) — `npm run kategori-eslesme:dogrula`
 * ----------------------------------------------------------------------------
 *  ① KURAL — saf karar DEĞERLE, her dalın iki yakası.
 *  ② ZİNCİR — senkron → yazıcı → ekran → uyarı aynı kurala/gövdeye bağlı mı
 *     (yorumsuz kaynak, kullanım bloğuna daraltılmış).
 *  Kullanıcı kuralı: «tahmin yok» — karşılığı seçilmemiş kategori YAZILMAZ,
 *  yeni görülen TY kategorisi tabloya KARŞILIKSIZ girer.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 2;
function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log("        ", gorulen);
  }
}
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const oku = (y: string) => yorumsuz(kaynakOku(y));
const adet = (m: string, d: string) => m.split(d).length - 1;
const esit = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

console.log("=".repeat(70));
console.log("TRENDYOL KATEGORİ EŞLEŞMESİ (K283)");
console.log("=".repeat(70));

// ── 1) KURAL ─────────────────────────────────────────────────────────────
console.log("\n1) karar kuralı — değerle");
{
  const temel: KategoriKararGirdisi = {
    mevcutKategoriId: "KUC",
    mevcutKaynak: "TRENDYOL",
    mevcutKategoriKdv: 20,
    urunIstisnasi: null,
    hedefKategoriId: "OYU",
    hedefKategoriKdv: 20,
  };
  kontrol("Trendyol kaynaklı ürün, aynı KDV'li hedefe YAZILIR", esit(kategoriKarari(temel), { yaz: "OYU" }));
  kontrol("karşılık SEÇİLMEMİŞ → yazılmaz (tahmin yok)", esit(kategoriKarari({ ...temel, hedefKategoriId: null, hedefKategoriKdv: null }), { atla: "KARSILIK_YOK" }));
  kontrol("hedef zaten mevcut → AYNI", esit(kategoriKarari({ ...temel, hedefKategoriId: "KUC" }), { atla: "AYNI" }));
  kontrol("ELLE seçilmiş kategoriye DOKUNULMAZ", esit(kategoriKarari({ ...temel, mevcutKaynak: "ELLE" }), { atla: "ELLE" }));
  kontrol("  ...kaynağı bilinmeyen ama kategorisi DOLU → elle sayılır", esit(kategoriKarari({ ...temel, mevcutKaynak: null }), { atla: "ELLE" }));
  kontrol("  ...kaynağı bilinmeyen ve kategorisi BOŞ → yazılır", esit(kategoriKarari({ ...temel, mevcutKaynak: null, mevcutKategoriId: null, mevcutKategoriKdv: null }), { yaz: "OYU" }));
  kontrol("KDV değişecekse YAZILMAZ (%20 → %10)", esit(kategoriKarari({ ...temel, hedefKategoriKdv: 10 }), { atla: "KDV_DEGISIR" }));
  kontrol("  ...kategorisiz ürün varsayılan %20 sayılır → %10'a geçemez", esit(kategoriKarari({ ...temel, mevcutKaynak: null, mevcutKategoriId: null, mevcutKategoriKdv: null, hedefKategoriKdv: 10 }), { atla: "KDV_DEGISIR" }));
  kontrol("  ...ürün İSTİSNASI varsa KDV değişmez → yazılır", esit(kategoriKarari({ ...temel, urunIstisnasi: 10, hedefKategoriKdv: 10 }), { yaz: "OYU" }));
  kontrol("etkin KDV sırası: istisna > kategori > varsayılan", etkinKdv(1, 20) === 1 && etkinKdv(null, 10) === 10 && etkinKdv(null, null) === VARSAYILAN_KDV && VARSAYILAN_KDV === 20);
  kontrol("TY kategori anahtarı: boşluk sadeleşir, içerik aynen", tyKategoriAnahtari("  Lego  &  Yapı ") === "Lego & Yapı" && tyKategoriAnahtari("x".repeat(300)).length === 191);
}
kosanBolumler.push("kural");

// ── 2) ZİNCİR ────────────────────────────────────────────────────────────
console.log("\n2) zincir — aynı kurala bağlı mı");
{
  const yazici = oku("src/lib/kategori-eslesme-yaz.ts");
  kontrol("yazıcı kararı SAF kuraldan alıyor (tek çağrı)", adet(yazici, "const karar = kategoriKarari({") === 1);
  /* Kuralı ÇAĞIRMAK yetmez — yazılacak kategori KARARDAN gelmeli (mutasyonla bulundu:
     `yeniKategori = h?.categoryId` yazan yazıcı kuralı çağırıp sonucunu yok sayıyordu). */
  kontrol("  ...yazılacak kategori KARARIN sonucu", adet(yazici, 'const yeniKategori = "yaz" in karar ? karar.yaz : null;') === 1 && !/yeniKategori = h\??\.categoryId/.test(yazici));
  kontrol("  ...güncelleme ŞARTLI (arada elle değişen ezilmez)", adet(yazici, "where: { id: y.id, categoryId: y.eskiKategori },") === 1);
  kontrol("  ...koşum başına tavan", adet(yazici, "yazilacak.slice(0, KATEGORI_YAZIM_TAVANI)") === 1);
  kontrol("  ...kategori değişince eski ve yeni değer İZE", /kategoriYazilan\+\+;\s*await izYaz\(\{[\s\S]{0,200}eski: y\.eskiKategori, yeni: y\.yeniKategori/.test(yazici));
  const yeniBlok = yazici.slice(yazici.indexOf("tyKategoriEslesme.createMany("), yazici.indexOf("tyKategoriEslesme.createMany(") + 160);
  kontrol("  ...YENİ TY kategorisi tabloya KARŞILIKSIZ girer (categoryId yazılmaz)", yeniBlok.includes("data: yeni.map((tyKategori) => ({ tyKategori }))") && !/categoryId/.test(yeniBlok));
  kontrol("  ...varyantları farklı TY kategorisindeki ürüne karar verilmez", /if \(s\.size === 1\) urunTy\.set\(id, \[\.\.\.s\]\[0\]\);\s*else cakisan\+\+;/.test(yazici));

  const senkron = oku("scripts/canli-kanal-listeleme-yaz.ts");
  kontrol("Trendyol senkronu yazıcıyı çağırıyor (TY kategorisiyle)", adet(senkron, "kategori = await tyKategorileriniYaz(") === 1 && senkron.includes("tyKategori: String(u.kategori ?? \"\")"));
  kontrol("  ...özet sonuca giriyor", /yazdiMi: true,\s*gorsel,\s*kategori,/.test(senkron));

  const sayfa = oku("src/app/ayarlar/kategoriler/trendyol/page.tsx");
  kontrol("ekran sayıları AYNI kuraldan (kategoriKarari)", adet(sayfa, "const karar = kategoriKarari({") === 1);
  kontrol("  ...karşılıksız satırlar EN ÜSTTE", sayfa.includes("Number(a.categoryId !== null) - Number(b.categoryId !== null)"));
  kontrol("  ...sayfa izni ayar.yaz", sayfa.includes('await sayfaIzni("ayar.yaz");'));

  const eylem = oku("src/app/ayarlar/kategoriler/trendyol/eylemler.ts");
  const iIzin = eylem.indexOf('baglam.izinler.has("ayar.yaz")');
  const iYaz = eylem.indexOf("tyKategoriEslesme.update(");
  kontrol("eylem: izin YAZIMDAN ÖNCE", iIzin >= 0 && iYaz >= 0 && iIzin < iYaz);
  kontrol("  ...eşleşme değişikliği İZE (eski/yeni)", eylem.includes('action: "TY_KATEGORI_ESLESMESI"') && eylem.includes("eski: satir.categoryId, yeni: categoryId"));
  kontrol("  ...ürünlere AYNI çekirdekle uygulanıyor", adet(eylem, "await eslesmeyiUrunlereUygula(tyKategori)") === 1);

  const topla = oku("src/lib/uyari/topla.ts");
  const kart = oku("src/app/ayarlar/kategoriler/page.tsx");
  kontrol("çan uyarısı ve kategori kartı AYNI sayaçtan", topla.includes("tyKategoriKarsiliksiz: { sayi: await tyKategoriKarsiliksizSayisi() }") && kart.includes("tyKategoriKarsiliksizSayisi(),"));
  const turler = oku("src/lib/uyari/turler.ts");
  kontrol("  ...uyarı eşleşme ekranına götürüyor", turler.includes('tyKategoriKarsiliksiz: "/ayarlar/kategoriler/trendyol",'));
}
kosanBolumler.push("zincir");

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
  process.exit(1);
} else if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
