import { kaynakOku } from "./kaynak-oku";
import { bulunanAlan } from "../src/lib/okuma/kayit";
import { aramaKosulu, kapsananRoller, kodKosulu, kodKosuluToplu } from "../src/lib/varyant-arama-kurali";

/**
 * ============================================================================
 *  ESKİ KOD BEKÇİSİ (K287) — `npm run eski-kod:dogrula`
 * ----------------------------------------------------------------------------
 *  Yeniden kodlamada Firma SKU değişince ESKİ kod silinmez (`EskiKod`) ve
 *  rafta eski etiketi olan ürün yine bulunur (kullanıcı kararı 26–27.09).
 *  ① KURAL — arama/okutma/toplu çözüm eski kod rolünü DEĞERLE kapsıyor;
 *     «hangi alanda bulundu» güncel kodu önce söylüyor.
 *  ② ZİNCİR — okutma seçimi eski kodu okuyor; önizleme ve «SKU öner» eski
 *     kodu DOLU sayıyor; öneri marka TABLOSUNDAN ve Firma SKU'ya; yedek.
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

console.log("=".repeat(70));
console.log("ESKİ KOD (K287)");
console.log("=".repeat(70));

// ── 1) KURAL ─────────────────────────────────────────────────────────────
console.log("\n1) kural — değerle");
{
  kontrol("okutma (kodKosulu) eski kodu arıyor", kapsananRoller(kodKosulu("OYU-LEG-0001")).includes("eskiKodlar"));
  kontrol("  ...TAM eşleşme (in), kısmi değil", JSON.stringify(kodKosulu("X-1")).includes('"eskiKodlar":{"some":{"kod":{"in":["X-1"]}}}'));
  kontrol("toplu çözüm (sipariş aktarımı) eski kodu arıyor", kapsananRoller(kodKosuluToplu(["a", "b"])).includes("eskiKodlar"));
  kontrol("serbest arama eski kodu arıyor", kapsananRoller(aramaKosulu("axcali1665")).includes("eskiKodlar"));
  const v = { sku: "S", companySku: "YENI", barcode: "B", channelSkus: [], eskiKodlar: [{ kod: "ESKI" }] };
  kontrol("eski etiket okutulunca «eski kod» denir", bulunanAlan("ESKI", v) === "eskiKodlar");
  kontrol("  ...güncel kod okutulunca güncel alan denir", bulunanAlan("YENI", v) === "companySku");
  kontrol("  ...aynı değer ikisinde birden varsa GÜNCEL önce", bulunanAlan("YENI", { ...v, eskiKodlar: [{ kod: "YENI" }] }) === "companySku");
}
kosanBolumler.push("kural");

// ── 2) ZİNCİR ────────────────────────────────────────────────────────────
console.log("\n2) zincir — okutma seçimi, önizleme, öneri, form, yedek");
{
  const ozet = oku("src/lib/varyant-ozet.ts");
  kontrol("okutma seçimi eski kodları okuyor", ozet.includes("eskiKodlar: { select: { kod: true } },"));

  const onizleme = oku("src/lib/sku-onizleme-veri.ts");
  kontrol("SKU önizlemesi eski kodu DOLU sayıyor", onizleme.includes("prisma.eskiKod.findMany({ select: { kod: true } }),") && onizleme.includes("for (const e of eskiKodlar) kullanilan.add(e.kod.trim());"));

  const oner = oku("src/app/urunler/sku-oner.ts");
  kontrol("öneri marka kodunu TABLODAN alıyor (addan hesap yok)", oner.includes("const brandId = await markaBagiBul(girdi.marka);") && !/urunKisaltmasi|modelAyirtEdici/.test(oner));
  kontrol("  ...biçim ortak gövdeden (skuKodu)", oner.includes("const kod = skuKodu(kategori.code, marka.code, sira);"));
  kontrol("  ...sıra eski kodları da görüyor", oner.includes("prisma.eskiKod.findMany({ where: { kod: { startsWith: onEk } }, select: { kod: true } }),") && oner.includes("...eskiler.map((e) => e.kod),"));
  kontrol("  ...çakışma eski kod + barkod dahil", oner.includes("(await prisma.eskiKod.count({ where: { kod } })) > 0") && oner.includes("{ barcode: kod }"));
  kontrol("  ...marka tabloda yoksa sebebi söylüyor", oner.includes('if (!marka) return { hata: "MARKA_TABLODA_YOK", ad: girdi.marka.trim() };'));

  const form = oku("src/app/urunler/urun-formu.tsx");
  kontrol("form öneriyi Firma SKU'ya yazıyor, SKU'yu yalnız BOŞSA", form.includes("companySku: kod,") && form.includes('...(varyant.sku.trim() === "" ? { sku: kod } : {}),') && !form.includes("varyantGuncelle(sira, { sku: kod, companySku: kod })"));

  const yedek = oku("src/lib/yedek-bicim.ts");
  const iV = yedek.indexOf('"ProductVariant",');
  const iE = yedek.indexOf('"EskiKod",');
  kontrol("yedek eski kodları taşıyor, varyantlardan SONRA", iV >= 0 && iE > iV);
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
