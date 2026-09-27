import { kaynakOku } from "./kaynak-oku";
import { markaYuklemePlani, type MarkaDunyasi, type MarkaYuklemeSatiri } from "../src/lib/marka-yukleme";

/**
 * ============================================================================
 *  MARKA LİSTESİ YÜKLEME + ARAMA BEKÇİSİ (K288) — `npm run marka-yukleme:dogrula`
 * ----------------------------------------------------------------------------
 *  ① KURAL — yükleme planı her dalıyla DEĞERLE (tablodaki marka tablonun
 *     adıyla + bağlı; yeni marka bağsız; dolu marka EZİLMEZ; hatalı satır yazılmaz).
 *  ② ZİNCİR — eylemler tek okuma kapısı + izin + şartlı + izli; Markalar ve SKU
 *     önizlemesi ekranında ARAMA (İlke #17) ve sayılar aramadan bağımsız.
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
console.log("MARKA LİSTESİ YÜKLEME + ARAMA (K288)");
console.log("=".repeat(70));

// ── 1) KURAL ─────────────────────────────────────────────────────────────
console.log("\n1) yükleme planı — değerle");
{
  const d: MarkaDunyasi = {
    urunler: new Map([
      ["A", { brand: null, brandId: null }],
      ["B", { brand: "", brandId: null }],
      ["C", { brand: "Tefal", brandId: "t1" }],
      ["D", { brand: null, brandId: null }],
    ]),
    tablo: new Map([["PHILIPS", { id: "p1", name: "Philips" }]]),
  };
  const s = (satir: number, kimlik: string, marka: string): MarkaYuklemeSatiri => ({ satir, kimlik, marka });
  const tek = (r: MarkaYuklemeSatiri) => markaYuklemePlani([r], d);

  const p1 = tek(s(2, "A", "PHİLİPS"));
  kontrol("tablodaki marka tablonun ADIYLA yazılır ve BAĞLANIR", p1.yaz.length === 1 && p1.yaz[0].yazim === "Philips" && p1.yaz[0].brandId === "p1");
  const p2 = tek(s(2, "B", "Russell Hobbs"));
  kontrol("yeni marka kullanıcının yazımıyla, BAĞSIZ", p2.yaz.length === 1 && p2.yaz[0].yazim === "Russell Hobbs" && p2.yaz[0].brandId === null);
  kontrol("dolu marka EZİLMEZ → MARKA_DOLU", tek(s(2, "C", "Philips")).hatalar[0]?.kod === "MARKA_DOLU" && tek(s(2, "C", "Philips")).yaz.length === 0);
  kontrol("  ...aynı marka yazılmışsa hata değil «değişiklik yok»", tek(s(2, "C", "TEFAL")).degisiklikYok === 1 && tek(s(2, "C", "TEFAL")).hatalar.length === 0);
  kontrol("bilinmeyen kimlik → BILINMEYEN_URUN", tek(s(2, "YOK", "Philips")).hatalar[0]?.kod === "BILINMEYEN_URUN");
  kontrol("aynı ürün iki satırda → KIMLIK_TEKRAR, ikisi de yazılmaz", (() => {
    const p = markaYuklemePlani([s(2, "D", "Philips"), s(3, "D", "Braun")], d);
    return p.hatalar.length === 2 && p.hatalar.every((h) => h.kod === "KIMLIK_TEKRAR") && p.yaz.length === 0;
  })());
  kontrol("harfsiz marka → GECERSIZ_MARKA", tek(s(2, "A", "—")).hatalar[0]?.kod === "GECERSIZ_MARKA");
  kontrol("boş hücre sayılır, yazılmaz", tek(s(2, "A", "  ")).bos === 1 && tek(s(2, "A", "  ")).yaz.length === 0);
}
kosanBolumler.push("kural");

// ── 2) ZİNCİR ────────────────────────────────────────────────────────────
console.log("\n2) zincir — eylemler, arama (İlke #17)");
{
  const e = oku("src/app/ayarlar/markalar/yukleme-eylemleri.ts");
  kontrol("dosya TEK okuma kapısından", adet(e, "await tabloOku(Buffer.from(") === 1);
  kontrol("plan saf gövdeden", e.includes("return markaYuklemePlani(satirlar, {"));
  kontrol("iki eylem de izni KENDİ gövdesinde soruyor (urun.yaz)", adet(e, 'if (!(await izinVarMi("urun.yaz"))) return { tamam: false, hata: "YETKISIZ" };') === 2);
  const uygula = e.slice(e.indexOf("export async function markaListesiUygula"));
  kontrol("yazım ŞARTLI (marka hâlâ boş + bağ yok)", uygula.includes("where: { id: y.kimlik, brandId: null, OR: [{ brand: null }, { brand: \"\" }] },"));
  kontrol("  ...her yazım İZE", uygula.includes('action: "MARKA_LISTE_YUKLENDI"') && uygula.includes("eski: null, yeni: y.yazim"));
  const onizle = e.slice(e.indexOf("export async function markaListesiOnizle"), e.indexOf("export async function markaListesiUygula"));
  kontrol("önizleme HİÇBİR ŞEY YAZMAZ", !/\.(update|updateMany|create|createMany|delete|upsert)\(/.test(onizle) && !onizle.includes("izYaz("));

  const mp = oku("src/app/ayarlar/markalar/page.tsx");
  kontrol("Markalar: arama kutusu var ve adrese yazıyor", mp.includes('<KodAramaKutusu temelAdres="/ayarlar/markalar" baslangic={arama}'));
  kontrol("  ...arama katlanmış (philips = PHİLİPS)", mp.includes("const k = markaAnahtari(q);"));
  kontrol("  ...kutular TÜM kümeden", mp.includes("cocuk={tumTablo.length}") && mp.includes("cocuk={tumBagsiz.length}"));
  kontrol("  ...«hepsini ekle» sayıları TÜM kümeden", mp.includes("const eklenecek = tumBagsiz.filter("));
  kontrol("  ...yükleme kartı izinli", mp.includes('const yukleyebilir = await izinVarMi("urun.yaz");') && mp.includes("<MarkaYukleyici />"));

  const sp = oku("src/app/urunler/sku-onizleme/page.tsx");
  kontrol("SKU önizlemesi: arama kutusu var", sp.includes('<KodAramaKutusu temelAdres="/urunler/sku-onizleme" baslangic={arama}'));
  kontrol("  ...ad + eski kod + SKU + yeni kod + marka aranıyor", sp.includes("[s.urunAdi, s.eskiFirmaSku, s.sku, s.yeniKod ?? \"\", s.marka].some("));
  kontrol("  ...durum kutuları TÜM kümeden", sp.includes("cocuk={satirlar.filter((s) => s.durum === d).length}"));

  const tp = oku("src/app/ayarlar/kategoriler/trendyol/page.tsx");
  kontrol("Trendyol eşleşmesi (208 satır): arama kutusu var", tp.includes('<KodAramaKutusu temelAdres="/ayarlar/kategoriler/trendyol" baslangic={arama}'));
  kontrol("  ...liste aramadan, karşılıksız sayısı TÜM kümeden", tp.includes("{gorunen.map((s) => (") && tp.includes("const karsiliksiz = satirlar.filter("));
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
