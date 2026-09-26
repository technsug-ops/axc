import { kaynakOku } from "./kaynak-oku";
import { SIRA_HANESI, skuKodu, skuOnizlemesi, type OnizlemeGirdisi } from "../src/lib/sku-onizleme";

/**
 * ============================================================================
 *  SKU ÖNİZLEMESİ BEKÇİSİ (K286) — `npm run sku-onizleme:dogrula`
 * ----------------------------------------------------------------------------
 *  ① KURAL — biçim, ön ek başına sıra, kod alamama sebepleri, çakışma atlama
 *     DEĞERLE (iki yakasıyla).
 *  ② ZİNCİR — ekran ve Excel tek gövdeden, KALICI sıra, çakışma kümesi
 *     pasifler dahil, önizleme HİÇBİR ŞEY YAZMIYOR.
 *  Kullanıcı kararı: model parçası addan tahmin edilmez → KAT-MRK-NNNN.
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

console.log("=".repeat(70));
console.log("SKU ÖNİZLEMESİ (K286)");
console.log("=".repeat(70));

// ── 1) KURAL ─────────────────────────────────────────────────────────────
console.log("\n1) kural — değerle");
{
  kontrol("biçim KAT-MRK-NNNN, 4 hane", skuKodu("OYU", "LEG", 7) === "OYU-LEG-0007" && SIRA_HANESI === 4);
  kontrol("  ...4 haneyi aşınca kısalmaz", skuKodu("OYU", "LEG", 12345) === "OYU-LEG-12345");

  const g = (kimlik: string, o: Partial<OnizlemeGirdisi> = {}): OnizlemeGirdisi => ({
    kimlik,
    eskiKod: `eski-${kimlik}`,
    kategoriVar: true,
    kategoriKodu: "OYU",
    markaKodu: "LEG",
    kendiKodlari: [`eski-${kimlik}`],
    ...o,
  });
  const s = skuOnizlemesi([g("a"), g("b"), g("c", { markaKodu: "MTL" }), g("d")], new Set());
  kontrol("aynı ön ekte sıra VERİLİŞ sırasıyla artar", s[0].yeniKod === "OYU-LEG-0001" && s[1].yeniKod === "OYU-LEG-0002" && s[3].yeniKod === "OYU-LEG-0003");
  kontrol("  ...başka ön ekin sayacı AYRI başlar", s[2].yeniKod === "OYU-MTL-0001");
  kontrol("aynı girdi her koşumda AYNI kodu verir", JSON.stringify(skuOnizlemesi([g("a"), g("b")], new Set())) === JSON.stringify(skuOnizlemesi([g("a"), g("b")], new Set())));

  const sebep = skuOnizlemesi([g("x", { kategoriVar: false, kategoriKodu: null }), g("y", { kategoriKodu: null }), g("z", { markaKodu: null })], new Set());
  kontrol("kategori yok → KATEGORI_YOK, kod UYDURULMAZ", sebep[0].durum === "KATEGORI_YOK" && sebep[0].yeniKod === null);
  kontrol("kategori var, kodu yok → KATEGORI_KODSUZ", sebep[1].durum === "KATEGORI_KODSUZ" && sebep[1].yeniKod === null);
  kontrol("marka bağı yok → MARKA_YOK", sebep[2].durum === "MARKA_YOK" && sebep[2].yeniKod === null);
  kontrol("  ...kod alamayan satır sıra numarası HARCAMAZ", skuOnizlemesi([g("z", { markaKodu: null }), g("a")], new Set())[1].yeniKod === "OYU-LEG-0001");

  const cak = skuOnizlemesi([g("a"), g("b")], new Set(["OYU-LEG-0001"]));
  kontrol("başka kayıttaki kod ATLANIR, sıradaki verilir", cak[0].yeniKod === "OYU-LEG-0002" && cak[1].yeniKod === "OYU-LEG-0003");
  const kendi = skuOnizlemesi([g("a", { eskiKod: "OYU-LEG-0001", kendiKodlari: ["OYU-LEG-0001"] })], new Set(["OYU-LEG-0001"]));
  kontrol("kaydın KENDİ kodu çakışma sayılmaz → AYNI", kendi[0].yeniKod === "OYU-LEG-0001" && kendi[0].durum === "AYNI");
  kontrol("çakışan kod hiçbir satıra VERİLMEZ", !skuOnizlemesi([g("a"), g("b"), g("c")], new Set(["OYU-LEG-0002"])).some((x) => x.yeniKod === "OYU-LEG-0002"));
}
kosanBolumler.push("kural");

// ── 2) ZİNCİR ────────────────────────────────────────────────────────────
console.log("\n2) zincir — tek gövde, kalıcı sıra, pasifler dahil çakışma, yazım yok");
{
  const veri = oku("src/lib/sku-onizleme-veri.ts");
  kontrol("KALICI sıra: ürün giriş anı → varyant giriş anı → kimlik", veri.includes('orderBy: [{ product: { createdAt: "asc" } }, { createdAt: "asc" }, { id: "asc" }],'));
  kontrol("çakışma kümesi BÜTÜN kayıtlar (aktiflik süzgeci YOK)", veri.includes("prisma.productVariant.findMany({ select: { sku: true, companySku: true, barcode: true } }),"));
  kontrol("  ...üç kod rolü de kümede", veri.includes("for (const d of [k.sku, k.companySku, k.barcode]) if (d) kullanilan.add(d.trim());"));
  kontrol("marka parçası TABLODAN (addan hesap yok)", veri.includes("markaKodu: v.product.brandKaydi?.code ?? null,") && !/urunKisaltmasi|modelAyirtEdici/.test(veri));
  kontrol("önizleme gövdesi HİÇBİR ŞEY YAZMAZ", !/\.(update|updateMany|create|createMany|delete|deleteMany|upsert)\(/.test(veri) && !veri.includes("izYaz("));

  const sayfa = oku("src/app/urunler/sku-onizleme/page.tsx");
  kontrol("ekran TEK gövdeden, izinli", adet(sayfa, "await skuOnizlemeSatirlari()") === 1 && sayfa.includes('await sayfaIzni("urun.gor");'));
  kontrol("  ...ekran da yazmıyor", !/\.(update|updateMany|create|createMany|delete|deleteMany|upsert)\(/.test(sayfa));
  kontrol("  ...her durum kutusu sıfırken de duruyor (süzgeç yok)", sayfa.includes("{DURUMLAR.map((d) => (") && !sayfa.includes("DURUMLAR.filter("));

  const liste = oku("src/lib/disa-aktarma/listeler.ts");
  const i = liste.indexOf("async function skuOnizlemeSayfasi()");
  const blok = i >= 0 ? liste.slice(i, i + 1400) : "";
  kontrol("Excel ekranla AYNI gövdeden", blok.includes("(await skuOnizlemeSatirlari()).map("));
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
