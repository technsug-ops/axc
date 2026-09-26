import { kaynakOku } from "./kaynak-oku";
import {
  KOD_BICIMI,
  OKUNAKLI_KODLAR,
  enSikYazim,
  kodAdaylari,
  kodDenetle,
  kodOner,
  markaAnahtari,
} from "../src/lib/marka-kodu";

/**
 * ============================================================================
 *  MARKA KOD TABLOSU BEKÇİSİ (K285) — `npm run marka-kodu:dogrula`
 * ----------------------------------------------------------------------------
 *  ① KURAL — yazım anahtarı, kod önerisi, kod kapısı DEĞERLE (iki yakasıyla).
 *  ② ZİNCİR — sayı = liste (tek gövde), yazım şartlı ve izli, kod benzersizliği
 *     yazımdan ÖNCE denetleniyor, ürün kaydı bağı yeniden hesaplıyor, izin
 *     eylemin kendi gövdesinde, yedek listesi tabloyu taşıyor.
 *  Kullanıcı kuralı: «tahmin yok» — öneri yoksa kod UYDURULMAZ, marka alanı
 *  boş ürüne marka yazılmaz (liste olarak verilir).
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
console.log("MARKA KOD TABLOSU (K285)");
console.log("=".repeat(70));

// ── 1) KURAL ─────────────────────────────────────────────────────────────
console.log("\n1) kural — değerle");
{
  kontrol("büyük/küçük harf aynı anahtar (ANKER = Anker)", markaAnahtari("ANKER") === markaAnahtari("Anker") && markaAnahtari("Anker") === "ANKER");
  kontrol("Türkçe harfler karşılığına (Arçelik → ARCELIK)", markaAnahtari("Arçelik") === "ARCELIK" && markaAnahtari("ŞIŞECAM") === "SISECAM");
  kontrol("boşluk ve işaret düşer (TP-Link = TPLINK)", markaAnahtari(" TP-Link ") === "TPLINK");
  kontrol("rakam KALIR (3M ≠ M)", markaAnahtari("3M") === "3M");
  kontrol("farklı ad AYRI anahtar (Philips ≠ Philips Avent) — birleştirme kullanıcının", markaAnahtari("Philips") !== markaAnahtari("Philips Avent"));
  kontrol("boş / yalnız boşluk / null → boş anahtar", markaAnahtari("   ") === "" && markaAnahtari(null) === "" && markaAnahtari("—") === "");

  kontrol("okunaklı kod ÖNCE (KARACA → KRC)", kodOner("KARACA", new Set()) === "KRC");
  kontrol("  ...Karaca ile Karcher ÇAKIŞMAZ", kodOner("KARCHER", new Set(["KRC"])) === "KRH");
  kontrol("okunaklı kod kullanımdaysa kurala düşer, kullanılanı vermez", (() => {
    const k = kodOner("KARACA", new Set(["KRC"]));
    return k !== null && k !== "KRC" && KOD_BICIMI.test(k);
  })());
  kontrol("kural: ilk harf + iki sessiz (ROBOROCK → RBR)", kodOner("ROBOROCK", new Set()) === "RBR");
  kontrol("  ...kullanılmışsa sıradaki aday", kodOner("ROBOROCK", new Set(["RBR"])) === kodAdaylari("ROBOROCK")[1]);
  kontrol("aday yoksa null — kod UYDURULMAZ (dolgu harfi eklenmez)", kodOner("AB", new Set()) === null && kodOner("12", new Set()) === null);
  kontrol("bütün adaylar kullanılmışsa null", kodOner("ABC", new Set(kodAdaylari("ABC"))) === null);
  kontrol("okunaklı kodların hepsi biçime uyuyor ve benzersiz", (() => {
    const k = Object.values(OKUNAKLI_KODLAR);
    return k.length >= 40 && k.every((x) => KOD_BICIMI.test(x)) && new Set(k).size === k.length;
  })());

  kontrol("kod kapısı: 3 harf/rakam geçer", kodDenetle("PH1", new Set()) === null);
  kontrol("  ...2 karakter → BICIM", kodDenetle("PH", new Set()) === "BICIM");
  kontrol("  ...küçük harf → BICIM (normalleştirme çağıranın işi)", kodDenetle("phl", new Set()) === "BICIM");
  kontrol("  ...başka markadaki kod → KULLANIMDA", kodDenetle("PHL", new Set(["PHL"])) === "KULLANIMDA");

  kontrol("en sık yazım ad olur", enSikYazim(new Map([["ANKER", 2], ["Anker", 5]])) === "Anker");
  kontrol("  ...eşitlikte alfabetik ilk (her koşumda AYNI ad)", enSikYazim(new Map([["TEFAL", 3], ["Tefal", 3]])) === ["TEFAL", "Tefal"].sort((a, b) => a.localeCompare(b, "tr"))[0]);
}
kosanBolumler.push("kural");

// ── 2) ZİNCİR ────────────────────────────────────────────────────────────
console.log("\n2) zincir — tek gövde, şartlı ve izli yazım, izin, yedek");
{
  const veri = oku("src/lib/marka-kodu-veri.ts");
  kontrol("öneriler SIRAYLA — verilen kod sonrakine verilmez", veri.includes("const oneri = varolan ? null : kodOner(anahtar, kullanilan);") && veri.includes("if (oneri) kullanilan.add(oneri);"));
  kontrol("markasız sayısı ve Excel listesi AYNI ölçütten", adet(veri, 'markaAnahtari(yazim);\n    if (a === "") markasiz++;') === 1 && adet(veri, '.filter((p) => markaAnahtari(p.brand) === "")') === 1);
  kontrol("  ...ikisi de yalnız BAĞSIZ ürüne bakıyor", veri.includes("if (u.brandId !== null) {") && veri.includes("where: { brandId: null },"));
  const liste = oku("src/lib/disa-aktarma/listeler.ts");
  const i = liste.indexOf("async function markasizSayfasi()");
  const blok = i >= 0 ? liste.slice(i, i + 1200) : "";
  kontrol("Excel ekranla AYNI gövdeden", blok.includes("(await markasizUrunler()).map("));

  const yaz = oku("src/lib/marka-kodu-yaz.ts");
  const ekle = yaz.slice(yaz.indexOf("export async function markaEkleVeBagla"), yaz.indexOf("export type KodDegistirSonucu"));
  const iKodsuz = ekle.indexOf('if (!secilen) return { durum: "KODSUZ" };');
  const iDenet = ekle.indexOf("const hata = kodDenetle(secilen, kodlar);");
  const iCreate = ekle.indexOf("prisma.brand.create(");
  kontrol("öneri yoksa kayıt AÇILMAZ, kod denetimi yazımdan ÖNCE", iKodsuz >= 0 && iDenet >= 0 && iCreate >= 0 && iKodsuz < iCreate && iDenet < iCreate);
  kontrol("bağ ŞARTLI (yalnız bağsız ürüne)", ekle.includes("where: { id: { in: urunler.map((u) => u.id) }, brandId: null },"));
  kontrol("ekleme ve bağ İZE", ekle.includes('action: "MARKA_EKLENDI"') && ekle.includes('action: "MARKA_BAGLANDI"'));
  const degis = yaz.slice(yaz.indexOf("export async function markaKoduDegistir"), yaz.indexOf("export async function markaBagiBul"));
  kontrol("kod değişimi ŞARTLI (okunan eski kod yerindeyse)", degis.includes("where: { id, code: marka.code }, data: { code: yeni }"));
  kontrol("  ...başka markaların koduna karşı denetleniyor", degis.includes("where: { NOT: { id } }") && degis.includes("const hata = kodDenetle(yeni, digerler);"));
  kontrol("  ...eski/yeni İZE", degis.includes('action: "MARKA_KODU_DEGISTI"') && degis.includes("JSON.stringify({ eski: marka.code, yeni })"));

  const urunEylem = oku("src/app/urunler/actions.ts");
  kontrol("yeni ürün kaydı marka bağını kuruyor", urunEylem.includes("brandId: await markaBagiBul(veri.marka),"));
  kontrol("ürün güncellemesi bağı YENİDEN hesaplıyor (marka değişince eski bağ kalmaz)", urunEylem.includes("const markaBagi = await markaBagiBul(veri.marka);") && urunEylem.includes("brandId: markaBagi,"));

  const eylem = oku("src/app/ayarlar/markalar/eylemler.ts");
  kontrol("üç eylem de izni KENDİ gövdesinde soruyor (ayar.yaz)", adet(eylem, 'if (!(await izinVarMi("ayar.yaz"))) return { tamam: false, hata: "YETKISIZ" };') === 3);
  const toplu = eylem.slice(eylem.indexOf("export async function hepsiniEkle"), eylem.indexOf("export async function markaKoduKaydet"));
  kontrol("toplu ekleme kodsuz markayı ATLIYOR ve SAYIYOR", toplu.includes("if (m.tabloId === null && m.oneri === null) {\n        kodsuz++;\n        continue;"));
  kontrol("  ...aynı çekirdekten yazıyor", adet(toplu, "await markaEkleVeBagla(m.anahtar, m.oneri ?? undefined)") === 1);

  const sayfa = oku("src/app/ayarlar/markalar/page.tsx");
  kontrol("ekran izin ve TEK gövde", sayfa.includes('await sayfaIzni("ayar.yaz");') && adet(sayfa, "await markaDurumu()") === 1);

  const yedek = oku("src/lib/yedek-bicim.ts");
  const iBrand = yedek.indexOf('"Brand",');
  const iProduct = yedek.indexOf('"Product",');
  kontrol("yedek tabloyu taşıyor ve ürünlerden ÖNCE geri yüklüyor", iBrand >= 0 && iProduct >= 0 && iBrand < iProduct);
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
