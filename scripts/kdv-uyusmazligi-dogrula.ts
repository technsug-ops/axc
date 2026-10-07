import { kaynakOku } from "./kaynak-oku";
import { onayliUrunuNormallestir, onaysizUrunuNormallestir } from "./ty/urun-v2";
import { KDV_SUZGEC_DEGERI, KDV_UYUSMAZLIGI_ADRESI, kdvUyusmuyorMu } from "../src/lib/kdv-uyusmazligi-kurali";

/**
 * ============================================================================
 *  KANAL KDV ORANI UYUŞMAZLIĞI — BEKÇİ (30.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run kdv-uyusmazligi:dogrula
 *  Zincir halka halka: TY ilanı oranı OKUNUR → deftere YAZILIR → bizim
 *  oranla KIYASLANIR → çan SAYAR → liste AYNI kümeyi AÇAR.
 *  ⛔ Kanal oranı boşsa hüküm YOK — «ölçülmedi» ile «uyuşuyor» ayrı.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 3;
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

console.log("=".repeat(70));
console.log("KANAL KDV ORANI UYUŞMAZLIĞI BEKÇİSİ");
console.log("=".repeat(70));

// ── 1) KURAL — değerle ───────────────────────────────────────────────────
console.log("\n1) kıyas kuralı");
{
  kontrol("kanal oranı bilinmiyor → hüküm YOK (null)", kdvUyusmuyorMu(null, 20) === null);
  kontrol("aynı oran → uyuşuyor (false)", kdvUyusmuyorMu(20, 20) === false);
  kontrol("farklı oran → uyuşmuyor (true)", kdvUyusmuyorMu(10, 20) === true);
  kontrol("%0 gerçek bir orandır — «yok» sayılmaz", kdvUyusmuyorMu(0, 20) === true);
  kontrol("kayan nokta kuyruğu ayrışma sayılmaz (iki hane)", kdvUyusmuyorMu(20.0000001, 20) === false);
  kontrol("adres süzgeç değerinden üretilir", KDV_UYUSMAZLIGI_ADRESI === `/kanal-sku?kdv=${KDV_SUZGEC_DEGERI}`);
}
kosanBolumler.push("kural");

// ── 2) OKUMA + YAZMA ─────────────────────────────────────────────────────
console.log("\n2) TY ilanından deftere");
{
  const onayli = onayliUrunuNormallestir({
    productMainId: "P1",
    title: "Ürün",
    variants: [
      { barcode: "A", vatRate: 10, stock: { quantity: 1 }, price: { salePrice: 100 } },
      { barcode: "B", stock: { quantity: 1 }, price: { salePrice: 100 } },
    ],
  });
  kontrol("onaylı ilanın varyant oranı okunur", onayli[0]?.kdvOrani === 10, onayli[0]);
  kontrol("oranı olmayan varyant → undefined (0 uydurulmaz)", onayli[1]?.kdvOrani === undefined, onayli[1]);
  const onaysiz = onaysizUrunuNormallestir({ barcode: "C", vatRate: 20, status: "pendingApproval" });
  kontrol("onaysız uç ölçülmedi → undefined", onaysiz.kdvOrani === undefined, onaysiz);

  const yaz = oku("src/lib/kanal-listeleme-yaz.ts");
  kontrol("tarama oranı kimlik haritasına girer", /const kdv = kanalAdedi\(u\.kdvOrani\);/.test(yaz));
  kontrol("iki ilan farklı oran söylerse hüküm yok", /const ortakKdv = mevcut\.kdv === kdv \? kdv : null;/.test(yaz));
  kontrol("oran değişince satır yazılır (koşul + veri aynı blokta)", /kayitliKdv !== k\.kdv \|\| s\.externalListingId !== k\.ilan\) \{[\s\S]{0,300}kanalKdvOrani: k\.kdv,/.test(yaz));
  kontrol("ilan kalkınca oran da boşalır", /listelemeDurumu: "YOK", kanalAdet: null, kanalKdvOrani: null,/.test(yaz));
}
kosanBolumler.push("okuma-yazma");

// ── 3) SAYI = LİSTE ──────────────────────────────────────────────────────
console.log("\n3) çan sayısı ile liste aynı gövdeden");
{
  const govde = oku("src/lib/kdv-uyusmazligi.ts");
  kontrol("yalnız ÖLÇÜLMÜŞ (dolu) oranlar okunur", /where: \{ isActive: true, kanalKdvOrani: \{ not: null \} \}/.test(govde));
  kontrol("bizim oran TEK çözücüden", /kdvUyusmuyorMu\(kanal, kdvOraniniCoz\(s\.variant\.product\)\.oran\) === true\) kimlikler\.push\(s\.id\)/.test(govde));
  const topla = oku("src/lib/uyari/topla.ts");
  kontrol("çan sayısı ortak gövdeden", topla.includes("kdvOraniUyusmuyor: { sayi: (await kdvUyusmayanKanalSkulari()).kimlikler.length },"));
  const turler = oku("src/lib/uyari/turler.ts");
  kontrol("çan adresi sözleşme sahibinden", turler.includes("kdvOraniUyusmuyor: KDV_UYUSMAZLIGI_ADRESI,"));
  const sayfa = oku("src/app/kanal-sku/page.tsx");
  kontrol("liste süzgeci adres değerini okur", sayfa.includes("const kdvSuzgeci = kdv === KDV_SUZGEC_DEGERI;"));
  kontrol("liste AYNI gövdeyi çağırır", sayfa.includes("const kdvUyusmazligi = kdvSuzgeci ? await kdvUyusmayanKanalSkulari() : null;"));
  kontrol("liste kümesi gövdenin kimlikleriyle süzülür", sayfa.includes("...(kdvUyusmazligi ? { id: { in: kdvUyusmazligi.kimlikler } } : {}),"));
  kontrol("sayfalama süzgeci taşır", /kdv: kdvSuzgeci \? KDV_SUZGEC_DEGERI : undefined/.test(sayfa));
}
kosanBolumler.push("sayi-liste");

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
