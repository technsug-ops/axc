import { kaynakOku } from "./kaynak-oku";
import {
  eanGecerliMi,
  eanHucresi,
  kontrolHanesiDogruMu,
  sizinMiCoz,
  supheSebebi,
  yuklemePlani,
  type Dunya,
  type YuklenenSatir,
} from "../src/lib/supheli-urun";

/**
 * ============================================================================
 *  ŞÜPHELİ ÜRÜN BEKÇİSİ (K284) — `npm run supheli-urun:dogrula`
 * ----------------------------------------------------------------------------
 *  ① KURAL — saf gövde DEĞERLE: kontrol hanesi, Excel sayı hücresi, cevap
 *     çözümü ve geri yükleme planının HER hata dalı (iki yakasıyla).
 *  ② ZİNCİR — sayı = liste (tek aday koşulu), Excel ekranla aynı gövdeden,
 *     eylem tek okuma kapısından okur, izni yazımdan ÖNCE sorar, yazım
 *     ŞARTLI ve İZLİ.
 *  Kullanıcı kuralı: «tahmin yok» — geçersiz EAN düzeltilerek YAZILMAZ,
 *  hatalı satır sebebiyle gösterilir.
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
console.log("ŞÜPHELİ ÜRÜN LİSTESİ (K284)");
console.log("=".repeat(70));

// ── 1) KURAL ─────────────────────────────────────────────────────────────
console.log("\n1) kural — değerle");
{
  kontrol("gerçek EAN-13 kontrol hanesi tutar", kontrolHanesiDogruMu("4006381333931"));
  kontrol("  ...son hane bir oynayınca TUTMAZ", !kontrolHanesiDogruMu("4006381333932"));
  kontrol("gerçek EAN-8 ve UPC-A geçerli", eanGecerliMi("73513537") && eanGecerliMi("036000291452"));
  kontrol("11 haneli kod (hanesi tutsa bile) EAN değil", !eanGecerliMi("12345678905"));
  kontrol("harfli kod EAN değil", !eanGecerliMi("HBCV00001ABC"));

  kontrol("barkod boş → BARKOD_YOK", supheSebebi("  ", true) === "BARKOD_YOK" && supheSebebi(null, true) === "BARKOD_YOK");
  kontrol("biçimi/kontrol hanesi bozuk → EAN_DEGIL", supheSebebi("4006381333932", true) === "EAN_DEGIL");
  kontrol("geçerli EAN ama TY kategorisi yok → TY_BULUNAMADI", supheSebebi("4006381333931", false) === "TY_BULUNAMADI");
  kontrol("geçerli EAN + TY kategorisi → ŞÜPHELİ DEĞİL", supheSebebi("4006381333931", true) === null);

  kontrol("sayı hücresi: kaybolan baştaki sıfır kontrol hanesi TUTARSA eklenir (13 haneye)", eanHucresi(36000291452) === "0036000291452");
  kontrol("  ...tutmuyorsa UYDURULMAZ, olduğu gibi döner", eanHucresi(12345) === "12345");
  kontrol("  ...zaten geçerli sayı dokunulmadan", eanHucresi(4006381333931) === "4006381333931");
  kontrol("metin hücresinde boşluklar silinir", eanHucresi(" 4006 3813 33931 ") === "4006381333931");

  kontrol("cevap: evet/Evet/E → EVET", ["evet", "Evet", "E"].every((c) => sizinMiCoz(c) === "EVET"));
  kontrol("cevap: Hayır/HAYIR/h → HAYIR", ["Hayır", "HAYIR", "h"].every((c) => sizinMiCoz(c) === "HAYIR"));
  kontrol("cevap: boş → BOS · anlamsız → GECERSIZ", sizinMiCoz("") === "BOS" && sizinMiCoz("belki") === "GECERSIZ");

  const dunya: Dunya = {
    varyantlar: new Map([
      ["A", { barkod: null, aktif: true }],
      ["B", { barkod: "HB1", aktif: true }],
      ["C", { barkod: null, aktif: false }],
      ["D", { barkod: "4006381333931", aktif: true }],
      ["E", { barkod: null, aktif: true }],
      ["F", { barkod: null, aktif: true }],
    ]),
    barkodSahibi: new Map([
      ["4006381333931", "D"],
      ["73513537", "Z"],
    ]),
  };
  const s = (satir: number, kimlik: string, ean: string, sizinMi: YuklenenSatir["sizinMi"]): YuklenenSatir => ({ satir, kimlik, ean, sizinMi });
  const tek = (r: YuklenenSatir, d: Dunya = dunya) => yuklemePlani([r], d);
  const hataKodu = (r: YuklenenSatir) => tek(r).hatalar.map((h) => h.kod).join(",");

  const iyi = tek(s(2, "A", "036000291452", "BOS"));
  kontrol("geçerli yeni EAN → yazılacak (eski değer taşınır)", iyi.ean.length === 1 && iyi.ean[0].yeni === "036000291452" && iyi.ean[0].eski === null && iyi.hatalar.length === 0);
  kontrol("  ...«evet» ile birlikte de yazılır", tek(s(2, "A", "036000291452", "EVET")).ean.length === 1);
  kontrol("bilinmeyen kimlik → BILINMEYEN_URUN", hataKodu(s(2, "YOK", "036000291452", "BOS")) === "BILINMEYEN_URUN");
  kontrol("aynı kimlik iki satırda → KIMLIK_TEKRAR (ikisi de yazılmaz)", (() => {
    const p = yuklemePlani([s(2, "A", "036000291452", "BOS"), s(3, "A", "", "HAYIR")], dunya);
    return p.hatalar.length === 2 && p.hatalar.every((h) => h.kod === "KIMLIK_TEKRAR") && p.ean.length === 0 && p.pasif.length === 0;
  })());
  kontrol("anlamsız cevap → GECERSIZ_CEVAP", hataKodu(s(2, "A", "", "GECERSIZ")) === "GECERSIZ_CEVAP");
  kontrol("«hayır» + EAN birlikte → CELISKI", hataKodu(s(2, "A", "036000291452", "HAYIR")) === "CELISKI");
  kontrol("kontrol hanesi tutmayan EAN → GECERSIZ_EAN (düzeltilmez)", hataKodu(s(2, "A", "4006381333932", "BOS")) === "GECERSIZ_EAN");
  kontrol("aynı EAN iki farklı ürüne → EAN_TEKRAR", (() => {
    const p = yuklemePlani([s(2, "A", "036000291452", "BOS"), s(3, "E", "036000291452", "BOS")], dunya);
    return p.hatalar.length === 2 && p.hatalar.every((h) => h.kod === "EAN_TEKRAR") && p.ean.length === 0;
  })());
  kontrol("EAN başka ürünün üstünde → EAN_BASKA_URUNDE", hataKodu(s(2, "A", "73513537", "BOS")) === "EAN_BASKA_URUNDE");
  kontrol("  ...ürünün KENDİ barkoduysa hata değil, «değişiklik yok»", (() => {
    const p = tek(s(2, "D", "4006381333931", "EVET"));
    return p.hatalar.length === 0 && p.ean.length === 0 && p.degisiklikYok === 1;
  })());
  kontrol("«hayır» → pasif listesine", tek(s(2, "B", "", "HAYIR")).pasif.length === 1);
  kontrol("  ...zaten pasifse «değişiklik yok»", (() => {
    const p = tek(s(2, "C", "", "HAYIR"));
    return p.pasif.length === 0 && p.degisiklikYok === 1;
  })());
  kontrol("boş satır → sayılır, yazılmaz", (() => {
    const p = tek(s(2, "F", "", "BOS"));
    return p.bos === 1 && p.ean.length === 0 && p.pasif.length === 0 && p.hatalar.length === 0;
  })());
  kontrol("  ...yalnız «evet» (EAN'sız) da boş sayılır", tek(s(2, "F", "", "EVET")).bos === 1);
}
kosanBolumler.push("kural");

// ── 2) ZİNCİR ────────────────────────────────────────────────────────────
console.log("\n2) zincir — sayı = liste, okuma kapısı, şartlı ve izli yazım");
{
  const veri = oku("src/lib/supheli-urun-veri.ts");
  kontrol("liste ve sayı AYNI aday koşulundan", adet(veri, "where: SUPHELI_ADAY_KOSULU,") === 2);
  kontrol("  ...ikisi de AYNI kuraldan (supheSebebi)", adet(veri, "supheSebebi(x.barcode, x.product.tyKategori !== null)") === 2);
  kontrol("  ...iptal edilmiş satış «işlem görüyor» saymaz", veri.includes("WHERE s.iptalTarihi IS NULL"));

  const liste = oku("src/lib/disa-aktarma/listeler.ts");
  const i = liste.indexOf("async function supheliSayfasi()");
  const blok = i >= 0 ? liste.slice(i, i + 1600) : "";
  kontrol("Excel ekranla AYNI gövdeden", blok.includes("(await supheliSatirlari()).map("));
  kontrol("  ...ilk sütun Kimlik, son iki sütun doldurulacak", blok.includes("basliklar: [\n      tSupheli(\"sutunKimlik\"),") && blok.includes("tSupheli(\"sutunDogruEan\"),\n      tSupheli(\"sutunSizinMi\"),\n    ],"));

  const eylem = oku("src/app/urunler/supheli/eylemler.ts");
  kontrol("dosya TEK okuma kapısından (tabloOku)", adet(eylem, "await tabloOku(Buffer.from(") === 1);
  kontrol("plan saf gövdeden", adet(eylem, "return yuklemePlani(satirlar, dunya);") === 1);
  const uygula = eylem.slice(eylem.indexOf("export async function supheliUygula"));
  const iIzin = uygula.indexOf("if (!(await yetkiliMi()))");
  const iYaz = uygula.indexOf("prisma.productVariant.updateMany(");
  kontrol("uygula: izin YAZIMDAN ÖNCE", iIzin >= 0 && iYaz >= 0 && iIzin < iYaz);
  kontrol("  ...izin urun.yaz", eylem.includes('b.izinler.has("urun.yaz")'));
  kontrol("EAN yazımı ŞARTLI (okunan eski değer değişmediyse)", uygula.includes("where: { id: e.kimlik, barcode: e.eski },"));
  kontrol("  ...eski/yeni İZE", uygula.includes('action: "SUPHELI_EAN_YAZILDI"') && uygula.includes("JSON.stringify({ eski: e.eski, yeni: e.yeni })"));
  kontrol("pasif yazımı ŞARTLI ve İZLİ", uygula.includes("where: { id: p.kimlik, isActive: true }, data: { isActive: false }") && uygula.includes('action: "SUPHELI_PASIF"'));
  kontrol("aktif varyantı kalmayan ürün de pasif + iz", uygula.includes("if (aktif > 0) continue;") && uygula.includes('action: "SUPHELI_URUN_PASIF"'));
  const onizle = eylem.slice(eylem.indexOf("export async function supheliOnizle"), eylem.indexOf("export async function supheliUygula"));
  kontrol("önizleme HİÇBİR ŞEY YAZMAZ", !/\.(update|updateMany|create|createMany|delete|deleteMany|upsert)\(/.test(onizle) && !onizle.includes("izYaz("));

  const sayfa = oku("src/app/urunler/supheli/page.tsx");
  kontrol("ekran sayıları listeyle AYNI gövdeden", adet(sayfa, "await supheliSatirlari()") === 1 && sayfa.includes('await sayfaIzni("urun.yaz");'));
  const urunler = oku("src/app/urunler/page.tsx");
  kontrol("Ürünler bağlantısı AYNI sayaçtan ve izinle", urunler.includes("resimEkleyebilir ? await supheliSayisi() : null") && urunler.includes('href="/urunler/supheli"'));
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
