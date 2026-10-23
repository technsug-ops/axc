/**
 * ============================================================================
 *  ALIM REHBERİ BEKÇİSİ (K363 Faz 1)
 * ----------------------------------------------------------------------------
 *  Saf gövde ÇAĞRILIR, değeri sınanır (anayasa: «saf hesap katmanı desen
 *  tarayan bekçiye muhtaç olmaz»). Her kural için ayrımın İKİ yakası örnekte.
 *  Kaynak taraması yalnız bağlar için (sayfa/Excel aynı gövdeyi mi çağırıyor).
 * ============================================================================
 */
import { kaynakOku } from "./kaynak-oku";
import {
  azStokCoz,
  donemCoz,
  donemGunu,
  esikleriKur,
  listeCoz,
  ortanca,
  rehberAra,
  rehberKur,
  rehberListesi,
  rehberToplami,
  type RehberSatiri,
} from "../src/lib/rapor/alim-rehberi";
import { hucre } from "../src/lib/disa-aktarma/xlsx";
import { MENU_ADRESLERI, MENU_KATALOGU } from "../src/lib/menu/katalog";
import type { AnalizSatiri } from "../src/lib/rapor/urun-analizi";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 6;
const kosanBolumler: string[] = [];
function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

/** Satış ve stok gövdelerinin döndürdüğü satır biçimi — yalnız kullanılan alanlar anlamlı. */
function satir(id: string, o: Partial<AnalizSatiri>): AnalizSatiri {
  return {
    variantId: id, urunAdi: `Ürün ${id}`, sku: `SKU-${id}`, adet: 0, ciro: 0, net1: 0, net2: 0,
    hesaplananCiro: 0, hesaplananAdet: 0, hesaplanamayanKalem: 0, kalemSayisi: 0,
    urunId: `u-${id}`, marka: null, kategori: null, yasGun: null, bagliSermaye: null, rafAdedi: null,
    barkod: null, firmaSku: null, kanalKodlari: [], isFavorite: false, needsReview: false, season: null, ...o,
  } as AnalizSatiri;
}
/** adet, ciro, net2 → satış satırı (hepsi hesaplanmış). */
const sat = (id: string, adet: number, ciro: number, net2: number) =>
  satir(id, { adet, ciro, net2, hesaplananCiro: ciro, hesaplananAdet: adet, kalemSayisi: adet });
const stk = (id: string, raf: number, sermaye: number | null) => satir(id, { rafAdedi: raf, bagliSermaye: sermaye });

// ── ① BİRLEŞTİRME ───────────────────────────────────────────────────────
console.log("\n① satış + stok tek satır");
{
  const r = rehberKur(
    [sat("A", 9, 900, 90), sat("B", 4, 400, 20)],
    [stk("A", 3, 150), stk("C", 5, 500), stk("D", 0, null)],
    90,
  );
  const id = (x: string) => r.find((s) => s.variantId === x);
  kontrol("satan + rafta olan birleşti (A: adet 9, raf 3, sermaye 150)", id("A")?.adet === 9 && id("A")?.raf === 3 && id("A")?.bagliSermaye === 150);
  kontrol("satan ama rafta yok → raf 0 (B)", id("B")?.raf === 0);
  kontrol("rafta duran ama satmayan GİRER (C, fazla stok için)", id("C")?.adet === 0 && id("C")?.raf === 5 && id("C")?.stokGunu === null);
  kontrol("ne satan ne rafta olan GİRMEZ (D)", id("D") === undefined);
  kontrol("marj = NET-2 ÷ hesaplanmış ciro × 100 (A %10)", Math.abs((id("A")?.marj ?? 0) - 10) < 1e-9);
  kontrol("günlük satış ve kaç günlük stok (A: 0,1/gün · 30 gün)", Math.abs((id("A")?.gunlukSatis ?? 0) - 0.1) < 1e-9 && Math.abs((id("A")?.stokGunu ?? 0) - 30) < 1e-9);
  const hesapsiz = rehberKur([satir("E", { adet: 5, ciro: 500, net2: 0, hesaplananCiro: 0, kalemSayisi: 5, hesaplanamayanKalem: 5 })], [], 90);
  kontrol("kârı hesaplanamayan ürünün marjı null (sıfır değil)", hesapsiz[0].marj === null);
}
kosanBolumler.push("birlestirme");

// ── ② EŞİKLER ───────────────────────────────────────────────────────────
console.log("\n② eşikler veriden");
{
  kontrol("ortanca tek sayıda orta değer", ortanca([5, 1, 3]) === 3);
  kontrol("ortanca çift sayıda iki ortanın ortalaması", ortanca([1, 2, 3, 4]) === 2.5);
  kontrol("ortanca boş → null (uydurulmaz)", ortanca([]) === null);
  const r = rehberKur([sat("A", 9, 900, 90), sat("B", 3, 300, 60), sat("C", 2, 200, 100)], [], 30);
  const e = esikleriKur(r);
  kontrol("aday: en az 3 adet (C 2 adetle dışarıda)", e.adaySayisi === 2, e);
  kontrol("marj ortancası adaylardan (%10 ve %20 → %15)", e.marjOrtancasi === 15, e);
  kontrol("aday yoksa eşik null", esikleriKur(rehberKur([sat("X", 1, 10, 1)], [], 30)).marjOrtancasi === null);
}
kosanBolumler.push("esikler");

// ── ③ DÖRT LİSTE ────────────────────────────────────────────────────────
console.log("\n③ dört liste — her kuralın iki yakası");
{
  // gün 100. Adaylar (≥3 adet): Y1 Y2 Y3 Y4 K1 K2 Y5 — hız ve marj ortancaları aşağıda.
  const satislar = [
    sat("Y1", 20, 2000, 400), // hızlı + kârlı (%20), rafta 0 → tükenen
    sat("Y2", 30, 3000, 600), // hızlı + kârlı, raf 1 → 1/0,3 = 3,3 gün → azalan (rafta 1: «tükenen» DEĞİL — iki yaka)
    sat("Y3", 25, 2500, 500), // hızlı + kârlı, raf 10 → 40 gün → az değil
    sat("Y4", 22, 2200, 440), // hızlı + kârlı, raf 0 → tükenen (günlük NET-2 4,4 < Y1? hayır 4,4 > 4)
    sat("K1", 40, 4000, 40), // hızlı ama marj %1 → kârsız
    sat("K2", 3, 300, 90), // yavaş (0,03/gün) + kârlı %30 → hiçbir yıldız listesinde değil
    sat("Y5", 3, 300, 3), // yavaş + kârsız
    /* İki yavaş aday daha — 9 adayla ortancalar: hız 0,20 (Y1 tam eşikte, ≥ dahil) · marj %20. */
    sat("Z1", 3, 300, 30), // yavaş, %10
    sat("Z2", 4, 400, 20), // yavaş, %5
  ];
  const stoklar = [stk("Y2", 1, 100), stk("Y3", 10, 1000), stk("S1", 7, 700), stk("K2", 30, 3000), stk("Y5", 1, 50)];
  const r = rehberKur(satislar, stoklar, 100);
  const e = esikleriKur(r);
  const ad = (l: RehberSatiri[]) => l.map((s) => s.variantId).join(",");
  const tuk = rehberListesi("tukenen", r, e, 30);
  kontrol("tükenen: hızlı + kârlı + raf 0, günlük NET-2'ye göre (Y4 4,4 > Y1 4,0)", ad(tuk) === "Y4,Y1", { tuk: ad(tuk), e });
  const az = rehberListesi("azalan", r, e, 30);
  kontrol("azalan: stok < 30 gün (Y2 3,3 gün) — Y3 40 gün dışarıda", ad(az) === "Y2", ad(az));
  kontrol("azalan sınırı KATI: tam sınırda (3,3 < 3,3 değil) girmez", ad(rehberListesi("azalan", r, e, 1 / 0.3)) === "", ad(rehberListesi("azalan", r, e, 1 / 0.3)));
  const fz = rehberListesi("fazla", r, e, 30);
  kontrol("fazla: satmayan S1 + en yavaş çeyrek (K2 1000 gün), sermayeye göre (K2 3000 > S1 700)", ad(fz).startsWith("K2,S1"), { fz: ad(fz), esik: e.fazlaStokGunu });
  kontrol("fazla: hızlı eriyen Y2 (3,3 gün) girmez", !ad(fz).split(",").includes("Y2"));
  const ks = rehberListesi("karsiz", r, e, 30);
  kontrol("kârsız: hızlı ama marj ortancanın altında (K1) — yavaş Y5 girmez", ad(ks) === "K1", ad(ks));
}
kosanBolumler.push("listeler");

// ── ④ ARAMA · TOPLAM · AYRIŞTIRICILAR ───────────────────────────────────
console.log("\n④ arama · toplam · adres ayrıştırıcıları");
{
  const r = rehberKur([satir("A", { adet: 1, urunAdi: "İnci Kek Kalıbı", sku: "MUT-1", barkod: "869000" })], [stk("A", 2, null), stk("B", 3, 300)], 30);
  kontrol("arama Türkçe büyük/küçük harf duyarsız («inci» → İnci)", rehberAra(r, "inci").length === 1);
  kontrol("arama barkodda da arar", rehberAra(r, "86900").length === 1);
  kontrol("boş arama hepsini döndürür", rehberAra(r, " ").length === r.length);
  const t = rehberToplami(r);
  kontrol("toplam: sermaye yalnız rafta olandan, bilinmeyen AYRI sayılır", t.bagliSermaye === 300 && t.sermayesiBilinmeyen === 1 && t.raf === 5, t);
  kontrol("dönem gelecek günleri saymaz (ay sonuna uzanan pencere)", donemGunu(new Date("2026-10-01T00:00:00Z"), new Date("2026-11-01T00:00:00Z"), new Date("2026-10-23T00:00:00Z")) === 22);
  kontrol("az stok 1–365 tam gün, değilse 30", azStokCoz("45") === 45 && azStokCoz("0") === 30 && azStokCoz("abc") === 30 && azStokCoz("2.5") === 30);
  kontrol("bilinmeyen dönem/liste varsayılana döner", donemCoz("XX") === "SON_3_AY" && listeCoz("yok") === "tukenen");
}
kosanBolumler.push("arama-toplam");

// ── ⑤ EXCEL HÜCRE TÜRÜ ──────────────────────────────────────────────────
console.log("\n⑤ Excel: sayılar sayı, kodlar metin, tür verilmezse metin (geriye uyum)");
{
  const s = hucre(1234.5, "para");
  kontrol("para sütununda sayı → SAYI hücresi, biçimli", s.type === Number && s.value === 1234.5 && "format" in s);
  kontrol("sayı sütununa metin gelirse METİN («satmıyor» kaybolmaz)", hucre("satmıyor", "tamsayi").type === String);
  kontrol("tür verilmeyen sütun METİN (mevcut indirmeler değişmez)", hucre(42).type === String && hucre(42).value === "42");
  kontrol("barkod metin sütununda metin kalır (baştaki sıfır)", hucre("0012345", "metin").value === "0012345");
  kontrol("NaN/null sayı sütununda boş metin", hucre(Number.NaN, "para").type === String && hucre(null, "oran").value === "");
}
kosanBolumler.push("excel");

// ── ⑥ BAĞLAR — sayfa, Excel ve menü aynı gövdeyi kullanır ────────────────
console.log("\n⑥ bağlar");
{
  const yorumsuz = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  const sayfa = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/page.tsx"));
  const excel = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/excel/route.ts"));
  kontrol("sayfa: izinler (rapor.gor sayfa + satis.kar.gor)", /await sayfaIzni\("rapor\.gor"\)/.test(sayfa) && /izinVarMi\("satis\.kar\.gor"\)/.test(sayfa));
  kontrol("sayfa: sekme sayısı ARAMADAN BAĞIMSIZ (tam liste uzunluğu)", /\{t\(`liste_\$\{l\}`\)\} \(\{listeler\[l\]\.length\}\)/.test(sayfa));
  kontrol("sayfa: toplam EKRANDAKİ listeden (aramadan sonra)", /const gorunen = rehberAra\(tamListe, arama\);\s*const toplam = rehberToplami\(gorunen\);/.test(sayfa));
  kontrol("sayfa: arama ortak bileşenle (kamera dahil)", /<KodAramaKutusu[\s\S]{0,80}temelAdres=\{REHBER_YOLU\}/.test(sayfa));
  kontrol("Excel: iki izin birden", /apiIzni\("rapor\.gor"\)\)\s*\?\?\s*\(await apiIzni\("satis\.kar\.gor"\)\)/.test(excel));
  kontrol("Excel: ekrandakiyle aynı liste (aynı gövdeler, aynı arama)", /rehberAra\(rehberListesi\(liste, veri\.satirlar, esik, azStok\), arama\)/.test(excel));
  kontrol("Excel: sütun türleri verildi (sayılar sayı)", /turler,/.test(excel) && /"para"/.test(excel));
  kontrol("menü: adres ve katalog kaydı", MENU_ADRESLERI.alimRehberi === "/rapor/alim-rehberi" && MENU_KATALOGU.some((k) => k.anahtar === "alimRehberi" && k.varsayilanGrup === "grupFiyatAnaliz"));
}
kosanBolumler.push("baglar");

console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
  process.exit(1);
} else if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
