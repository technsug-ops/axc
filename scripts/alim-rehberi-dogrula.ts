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
  eksikAdet,
  esikleriKur,
  gecenYilKapsami,
  gecenYilListesi,
  gecenYilPenceresi,
  ileriCoz,
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
const BOLUM_SAYISI = 8;
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
  /* Faz 2-b (24.10): sekme sayısı tek gövdeden (`sekmeSayisi`) — özel gün sekmesinde GÜN sayısı, ötekilerde
     yine tam liste uzunluğu. Ölçüt iki halkayı birlikte sınar: çizim o gövdeyi çağırıyor VE gövde aramasız listeyi sayıyor. */
  /* Faz 2-d (24.10): yedinci sekme kendi listesini sayar (`iyiAlim.length` — aramasız tam liste). */
  kontrol(
    "sayfa: sekme sayısı ARAMADAN BAĞIMSIZ (tam liste uzunluğu; özel günlerde gün sayısı; iyi alımda kendi tam listesi)",
    /* 30.10.2026: sayı parantez yerine rozette (`sekmeSayaciSinifi`) — ölçüt çizimin aynı gövdeyi çağırdığını arar. */
    /\{t\(`liste_\$\{l\}`\)\} <span className=\{sekmeSayaciSinifi\(aktif\)\}>\{sekmeSayisi\(l\)\}<\/span>/.test(sayfa) &&
      /* Faz 3-d (30.10): fiyat takibi sekmesi BÜTÜN hedefleri sayar (sekme süzgeçsiz «Hepsi» açılır) — ölçüt o dalı da kapsar. */
      /const sekmeSayisi = \(l: RehberSekmesi\) =>\s*l === "ozelGun" \? yaklasan\.length : l === "iyiAlim" \? iyiAlim\.length : l === "fiyatTakibi" \? hedefler\.length : listeler\[l\]\.length;/.test(sayfa) &&
      /const iyiAlim = iyiAlimListesi\(veri\.satirlar, hafizalar\);/.test(sayfa),
  );
  kontrol("sayfa: toplam EKRANDAKİ listeden (aramadan sonra)", /const gorunen = rehberAra\(tamListe, arama\);\s*const toplam = rehberToplami\(gorunen\);/.test(sayfa));
  kontrol("sayfa: arama ortak bileşenle (kamera dahil)", /<KodAramaKutusu[\s\S]{0,80}temelAdres=\{REHBER_YOLU\}/.test(sayfa));
  kontrol("Excel: iki izin birden", /apiIzni\("rapor\.gor"\)\)\s*\?\?\s*\(await apiIzni\("satis\.kar\.gor"\)\)/.test(excel));
  kontrol(
    "Excel: ekrandakiyle aynı liste (aynı gövdeler, aynı arama; geçen yıl sekmesi kendi gövdesinden)",
    /rehberAra\(\s*gy \? gecenYilListesi\(veri\.gecenYil\.satirlar\) : rehberListesi\(liste, veri\.satirlar, esik, azStok\),\s*arama,?\s*\)/.test(excel),
  );
  kontrol("sayfa: geçen yıl listesi geçen yılın satırlarından", /gecenYil: gecenYilListesi\(veri\.gecenYil\.satirlar\)/.test(sayfa));
  kontrol("sayfa: beş sekme de çizilir (REHBER_SEKMELERI)", /\{REHBER_SEKMELERI\.map\(\(l\) =>/.test(sayfa));
  /* Faz 2-b (24.10): koşul `oz ? null : gy ? (` oldu — özel gün sekmesi kendi uyarısını kendi bileşeninde çizer. */
  /* Faz 2-d (24.10): koşul `oz || ia ? null : gy ? (` — iyi alım sekmesi de kendi notunu kendi bileşeninde çizer. */
  /* Faz 3-d (30.10): koşula `ft` eklendi — fiyat takibi sekmesi de kendi notunu kendi bileşeninde çizer. */
  kontrol("sayfa: geçen yıl sekmesinde uyarı (tahmin değil hatırlatma) çizilir", /\{oz \|\| ia \|\| ft \? null : gy \? \(\s*<div[^>]*>[\s\S]{0,260}t\("gecenYilUyari"\)/.test(sayfa));
  kontrol("sayfa: veri yoksa boş liste «temiz» değil «bakılamadı» der", /gy && veri\.gecenYil\.kapsam === "YOK" \? t\("gecenYilVeriYok"/.test(sayfa));
  const verisi = yorumsuz(kaynakOku("src/lib/rapor/alim-rehberi-verisi.ts"));
  kontrol("veri: geçen yıl satışı BUGÜNÜN stoğuyla birleşir (aynı stok, pencere uzunluğu gün)", /rehberKur\(gecenYilSatis, stok, ileri\)/.test(verisi));
  kontrol("veri: geçen yıl penceresi İstanbul gününden kurulur", /gecenYilPenceresi\(isTakvimGunu\(an\), ileri\)/.test(verisi));
  kontrol("Excel: sütun türleri verildi (sayılar sayı)", /turler,/.test(excel) && /"para"/.test(excel));
  kontrol("menü: adres ve katalog kaydı", MENU_ADRESLERI.alimRehberi === "/rapor/alim-rehberi" && MENU_KATALOGU.some((k) => k.anahtar === "alimRehberi" && k.varsayilanGrup === "grupFiyatAnaliz"));
}
kosanBolumler.push("baglar");

// ── ⑦ GEÇEN YIL BU DÖNEM (Faz 2-a) ──────────────────────────────────────
console.log("\n⑦ geçen yıl bu dönem — pencere · kapsam · liste");
{
  const p = gecenYilPenceresi({ yil: 2026, ay: 10, gun: 23 }, 30);
  kontrol("pencere: YARINDAN başlar, N gün, takvim tarihiyle bir yıl geri (2025-10-24 – 2025-11-22)", p.baslangic === "2025-10-24" && p.bitis === "2025-11-22", p);
  const s = gecenYilPenceresi({ yil: 2028, ay: 2, gun: 28 }, 1);
  kontrol("pencere: 29 Şubat geçen yılda yoksa 28 Şubat (mart DEĞİL)", s.baslangic === "2027-02-28" && s.bitis === "2027-02-28", s);
  const y = gecenYilPenceresi({ yil: 2026, ay: 12, gun: 31 }, 1);
  kontrol("pencere: yıl sınırını doğru geçer (31.12 → yarın 01.01 → geçen yıl 01.01)", y.baslangic === "2026-01-01" && y.bitis === "2026-01-01", y);

  const bas = new Date("2025-10-24T00:00:00Z");
  const bit = new Date("2025-11-23T00:00:00Z");
  kontrol("kapsam: defter boşsa YOK", gecenYilKapsami(null, bas, bit) === "YOK");
  kontrol("kapsam: ilk satış pencere bittikten sonra → YOK", gecenYilKapsami(new Date("2025-11-23T00:00:00Z"), bas, bit) === "YOK");
  kontrol("kapsam: ilk satış pencerenin İÇİNDE → KISMI", gecenYilKapsami(new Date("2025-11-01T00:00:00Z"), bas, bit) === "KISMI");
  kontrol("kapsam: ilk satış tam pencere başında → TAM (KISMI değil)", gecenYilKapsami(bas, bas, bit) === "TAM");
  kontrol("kapsam: ilk satış pencereden önce → TAM", gecenYilKapsami(new Date("2024-08-01T00:00:00Z"), bas, bit) === "TAM");

  const r = rehberKur(
    [
      sat("G1", 10, 1000, 100), // raf 2 → eksik 8 → GİRER
      sat("G2", 5, 500, 50), // raf yok → eksik 5 → GİRER
      sat("G7", 5, 500, 70), // eksik 5, NET-2 G2'den büyük → G2'den ÖNCE
      sat("G3", 6, 600, 60), // raf 6 → eksik 0 → GİRMEZ (tam sınır)
      sat("G4", 2, 200, 40), // 2 adet → GİRMEZ (en az 3)
      sat("G5", 8, 800, -10), // zarar → GİRMEZ
      satir("G6", { adet: 4, ciro: 400, net2: 0, hesaplananCiro: 0, kalemSayisi: 4, hesaplanamayanKalem: 4 }), // kâr hesaplanamadı → GİRMEZ
      sat("G8", 3, 300, 30), // tam 3 adet, raf 0 → GİRER (alt sınır dahil)
    ],
    [stk("G1", 2, 200), stk("G3", 6, 600), stk("R1", 9, 900)],
    30,
  );
  const liste = gecenYilListesi(r);
  const ad = liste.map((x) => x.variantId).join(",");
  kontrol("liste: eksiğe göre, eşitse NET-2'ye göre (G1 8 · G7 5/70 · G2 5/50 · G8 3)", ad === "G1,G7,G2,G8", ad);
  kontrol("liste: geçen yıl hiç satmamış raftaki ürün (R1) girmez", !ad.includes("R1"));
  kontrol("eksik: raf satıştan fazlaysa 0 (eksi değil)", eksikAdet(r.find((x) => x.variantId === "R1")!) === 0);
  kontrol("toplam: eksik adet listenin eksiklerinin toplamı (8+5+5+3)", rehberToplami(liste).eksik === 21, rehberToplami(liste));
  kontrol("adres: geçen yıl sekmesi ve ileri gün ayrıştırılır, bozuksa 30", listeCoz("gecenYil") === "gecenYil" && ileriCoz("60") === 60 && ileriCoz("45") === 30 && ileriCoz("x") === 30);
}
kosanBolumler.push("gecen-yil");

/* ── NET-2 SÜTUNU DÖNEM TOPLAMI (kullanıcı kararı 31.10.2026: «Günlük NET-2
   hiçbir işime yaramaz, orada toplam NET-2 olması daha sağlıklı»). Günlük
   ortalama satışsız günleri de bölüyordu; ₺51/gün aslında 3 ayda ₺4.653'tü. */
{
  const yorumsuz = (m: string) => m.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  const sayfa = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/page.tsx"));
  const excel = yorumsuz(kaynakOku("src/app/rapor/alim-rehberi/excel/route.ts"));
  kontrol("tablo + telefon kartı NET-2'yi dönem TOPLAMI gösteriyor (2 yer)", (sayfa.match(/bicim\.para\(s\.net2, "TRY"\)/g) ?? []).length === 2);
  kontrol("  ...sayfada günlük NET-2 hiçbir yerde yok", !sayfa.includes("gunlukNet2"));
  kontrol("  ...başlık «NET-2 (dönem)»", (sayfa.match(/gy \? t\("sutunGecenYilNet2"\) : t\("toplamNet2"\)/g) ?? []).length === 2);
  kontrol("Excel'de günlük NET-2 sütunu yok", !excel.includes("gunlukNet2"));
}
kosanBolumler.push("donem-net2");

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
