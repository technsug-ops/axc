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
  /**
   * ⚠ ÖLÇÜT TAŞINDI (K301, 28.09.2026) — ESKİ GEREKÇE: «kaydın KENDİ kodu
   * çakışma sayılmaz → AYNI» (Firma SKU'su OYU-LEG-0001 olan kayıt). K301'den
   * sonra doğru biçimdeki Firma SKU `dolu` kontrolüne HİÇ varmadan korunuyor;
   * eski örnek bu kuralı artık sınamıyordu (mutasyon kaçardı). Kendi kodu ayrımı
   * hâlâ gerçek: biçim dışı Firma SKU'lu bir kaydın BARKODU/SKU'su üretilecek
   * koda eşitse o kod ona verilebilir — başkasınınki gibi atlanmaz.
   */
  const kendi = skuOnizlemesi([g("a", { eskiKod: "eski-a", kendiKodlari: ["eski-a", "OYU-LEG-0001"] })], new Set(["OYU-LEG-0001"]));
  kontrol("kaydın KENDİ kodu (barkod/SKU) çakışma sayılmaz → o kod ona verilir", kendi[0].yeniKod === "OYU-LEG-0001" && kendi[0].durum === "HAZIR", kendi[0]);
  kontrol("çakışan kod hiçbir satıra VERİLMEZ", !skuOnizlemesi([g("a"), g("b"), g("c")], new Set(["OYU-LEG-0002"])).some((x) => x.yeniKod === "OYU-LEG-0002"));

  /* K301 — doğru biçimdeki kod korunur ve sıra harcamaz (ProMix vakası). */
  const kod = (k: string, eski: string, o: Partial<OnizlemeGirdisi> = {}) => g(k, { eskiKod: eski, kendiKodlari: [eski], ...o });
  const promix = skuOnizlemesi(
    [kod("bhd", "KUC-PHL-0045", { kategoriKodu: "KUC", markaKodu: "PHL" }), kod("promix", "KUC-PHL-0044", { kategoriKodu: "KUC", markaKodu: "PHL" })],
    new Set(["KUC-PHL-0044", "KUC-PHL-0045"]),
  );
  kontrol("K301 ProMix: KUC-PHL-0044 kendi kodunu KORUR → AYNI", promix[1].yeniKod === "KUC-PHL-0044" && promix[1].durum === "AYNI", promix[1]);
  kontrol("K301 BHD500: KUC-PHL-0045 kendi kodunu KORUR → AYNI", promix[0].yeniKod === "KUC-PHL-0045" && promix[0].durum === "AYNI", promix[0]);
  const harcamaz = skuOnizlemesi([kod("a", "OYU-LEG-0005"), g("b")], new Set(["OYU-LEG-0005"]));
  kontrol("K301 korunan kod sıra HARCAMAZ: sonraki kodsuz kayıt 0001 alır", harcamaz[1].yeniKod === "OYU-LEG-0001", harcamaz[1]);
  const onEkDegisti = skuOnizlemesi([kod("a", "OYU-MTL-0003")], new Set(["OYU-MTL-0003"]));
  kontrol("K301 ön eki DEĞİŞMİŞ kod korunmaz → yeni kod önerilir", onEkDegisti[0].durum === "HAZIR" && onEkDegisti[0].yeniKod === "OYU-LEG-0001", onEkDegisti[0]);
  for (const [ad, eski] of [["5 hane", "OYU-LEG-00012"], ["3 hane", "OYU-LEG-012"], ["harfli", "OYU-LEG-00A1"], ["ön ek kısmen", "OYU-LEGO-0001"]] as const) {
    const r = skuOnizlemesi([kod("a", eski)], new Set([eski]));
    kontrol(`K301 biçimi farklı (${ad}: ${eski}) korunmaz → HAZIR`, r[0].durum === "HAZIR" && r[0].yeniKod === "OYU-LEG-0001", r[0]);
  }
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
