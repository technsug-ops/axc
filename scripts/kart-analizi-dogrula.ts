import { kaynakOku } from "./kaynak-oku";
import { galeriAdresleri, galeriYazilirMi, GALERI_TAVANI, kartResimleri } from "../src/lib/urun-gorseli";
import {
  dagilim,
  degisimYuzdesi,
  gunAnahtari,
  gunListesi,
  gunlukSeri,
  gunlukStok,
  kanalFiyatSerileri,
  karMerdiveni,
  oran,
  stokYeterGun,
  type KartKalemi,
} from "../src/lib/urun-karti-seri";

/**
 * ============================================================================
 *  KÂRLILIK KARTI — ALGORİTMO SAYFASI BEKÇİSİ (K330, 10.10.2026)
 *      npm run kart-analizi:dogrula
 * ----------------------------------------------------------------------------
 *  ① SAF HESAP — gövdeler ÇAĞRILIR, değer sınanır (kaynak taranmaz): İstanbul
 *     günü · önceki dönem % (sıfır payda) · stok kaç gün · gün sonu stok ·
 *     kâr merdiveni (hesaplanamayan DIŞARIDA, sayısı ayrı) · günlük seri ·
 *     dağılım · kanal fiyatı (satışsız gün BOŞ).
 *  ② GALERİ KURALI — izinli sunucu, tekrarsız, tavan; öncelik ve «aynı liste
 *     yazılmaz»; kartta ana resim önce.
 *  ③ BAĞ — analiz kartın ölçütüyle AYNI kümeyi okur; kâr izinsize gitmez;
 *     yazıcı galeriyi tek işlemde yazar; TY/N11 okumaları galeriyi taşır;
 *     sayfa analizi ve galeriyi çağırır.
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
console.log("KARLILIK KARTI ANALIZI (K330, 10.10.2026)");
console.log("=".repeat(70));

/* ① SAF HESAP */
{
  /* İstanbul günü: 2026-10-09 21:30 UTC = 10.10 00:30 İstanbul → «2026-10-10». */
  kontrol("gün anahtarı İSTANBUL günüdür (UTC değil)", gunAnahtari(new Date("2026-10-09T21:30:00Z")) === "2026-10-10");
  kontrol("  ...gün sınırının öteki yakası", gunAnahtari(new Date("2026-10-09T20:59:00Z")) === "2026-10-09");
  const gunler = gunListesi(new Date("2026-10-01T00:00:00Z"), new Date("2026-10-03T00:00:00Z"));
  kontrol("gün listesi iki ucu DAHİL", JSON.stringify(gunler) === JSON.stringify(["2026-10-01", "2026-10-02", "2026-10-03"]), gunler);

  kontrol("değişim %: 10 → 15 = +50", degisimYuzdesi(15, 10) === 50);
  kontrol("değişim %: düşüş eksi", degisimYuzdesi(5, 10) === -50);
  kontrol("değişim %: önceki SIFIR → yok (uydurma %100 değil)", degisimYuzdesi(7, 0) === null);

  kontrol("stok kaç gün: 30 elde, 30 günde 15 satış → 60 gün", stokYeterGun(30, 15, 30) === 60);
  kontrol("stok kaç gün: satış yoksa ÖLÇÜLEMEZ (null, 0 değil)", stokYeterGun(30, 0, 30) === null);
  kontrol("stok kaç gün: stok yoksa 0", stokYeterGun(0, 15, 30) === 0);

  const stok = gunlukStok(10, [{ gun: "2026-10-02", delta: -3 }, { gun: "2026-10-02", delta: 5 }, { gun: "2026-09-30", delta: 99 }], gunler);
  kontrol(
    "gün sonu stok: başlangıç + o günün hareketleri; dönem dışı hareket SAYILMAZ",
    JSON.stringify(stok.map((s) => s.stok)) === JSON.stringify([10, 12, 12]),
    stok,
  );

  const k = (o: Partial<KartKalemi>): KartKalemi => ({ gun: "2026-10-01", ciro: 100, adet: 1, maliyet: 50, net1: 30, net2: 25, kanal: "Trendyol", hesap: "A", ...o });
  const m = karMerdiveni([k({}), k({ ciro: 200, maliyet: 120, net1: 50, net2: 40 }), k({ maliyet: null }), k({ net2: null })]);
  kontrol("merdiven: hesaplanamayan kalem DIŞARIDA ve sayılır", m.dahilKalem === 2 && m.haricKalem === 2, m);
  kontrol("merdiven: ciro/maliyet/NET yalnız dahil kalemlerden", m.ciro === 300 && m.maliyet === 170 && m.net1 === 80 && m.net2 === 65, m);
  kontrol("merdiven: kesinti = ciro − maliyet − NET-1 (kayıtla tutar)", m.kesinti === 50, m);
  kontrol("merdiven: KDV = NET-1 − NET-2", m.kdv === 15, m);

  const seri = gunlukSeri([k({}), k({ gun: "2026-10-02", net2: null }), k({ gun: "2026-10-02" })], [{ gun: "2026-10-03", adet: 2 }], gunler);
  kontrol("günlük seri: satışsız gün 0, iade kendi gününde", seri[2]!.ciro === 0 && seri[2]!.iade === 2, seri);
  kontrol("günlük seri: o gün hesaplanamayan kalem varsa NET-2 YOK (kısmi toplam tam gibi çizilmez)", seri[1]!.net2 === null && seri[0]!.net2 === 25, seri);
  kontrol("günlük seri: ciro ve adet tam toplanır", seri[1]!.ciro === 200 && seri[1]!.adet === 2, seri);

  const d = dagilim([k({ kanal: "N11", ciro: 100 }), k({ kanal: "Trendyol", ciro: 300 })], "kanal");
  kontrol("dağılım: büyükten küçüğe, pay toplam ciroya göre", d[0]!.ad === "Trendyol" && d[0]!.pay === 0.75 && d[1]!.pay === 0.25, d);

  const f = kanalFiyatSerileri([k({ gun: "2026-10-01", ciro: 200, adet: 2 }), k({ gun: "2026-10-03", ciro: 120, adet: 1 })], gunler);
  kontrol("kanal fiyatı: satışsız gün BOŞ (sıfır çizilmez)", f[0]!.noktalar[1] === null && f[0]!.noktalar[0] === 100, f);
  kontrol("kanal fiyatı: son = son satış günü, ortalama adet ağırlıklı", f[0]!.son === 120 && Math.abs(f[0]!.ortalama - 320 / 3) < 1e-9, f);
  kontrol("oran: payda sıfırsa yok", oran(3, 0) === null && oran(1, 4) === 0.25);
  kosanBolumler.push("saf");
}

/* ② GALERİ KURALI */
{
  const TY = "https://cdn.dsmcdn.com/ty1/prod/a/1_org_zoom.jpg";
  const TY2 = "https://cdn.dsmcdn.com/ty1/prod/b/1_org_zoom.jpg";
  const g = galeriAdresleri([{ url: TY }, { url: TY }, { url: "https://kotu.example.com/x.jpg" }, { url: "http://cdn.dsmcdn.com/ty1/c.jpg" }, TY2, 42], "TRENDYOL");
  kontrol("galeri: izinli sunucu + https, tekrarsız, sıra korunur", JSON.stringify(g) === JSON.stringify([TY, TY2]), g);
  const cok = galeriAdresleri(Array.from({ length: 40 }, (_, i) => `https://cdn.dsmcdn.com/ty1/prod/${i}.jpg`), "TRENDYOL");
  kontrol("galeri: tavanda kesilir", cok.length === GALERI_TAVANI);
  kontrol("galeri: boş aday YAZMAZ (var olanı silmez)", !galeriYazilirMi({ kaynak: "TRENDYOL", adresler: [TY] }, { kaynak: "TRENDYOL", adresler: [] }));
  kontrol("galeri: aynı liste YAZILMAZ", !galeriYazilirMi({ kaynak: "TRENDYOL", adresler: [TY, TY2] }, { kaynak: "TRENDYOL", adresler: [TY, TY2] }));
  kontrol("galeri: sıra değişirse YAZILIR", galeriYazilirMi({ kaynak: "TRENDYOL", adresler: [TY, TY2] }, { kaynak: "TRENDYOL", adresler: [TY2, TY] }));
  kontrol("galeri: N11, Trendyol galerisini EZMEZ", !galeriYazilirMi({ kaynak: "TRENDYOL", adresler: [TY] }, { kaynak: "N11", adresler: ["https://n11scdn.akamaized.net/a.jpg"] }));
  kontrol("galeri: Trendyol, N11 galerisini geçer", galeriYazilirMi({ kaynak: "N11", adresler: ["https://n11scdn.akamaized.net/a.jpg"] }, { kaynak: "TRENDYOL", adresler: [TY] }));
  kontrol("galeri: boş galeriye yazılır", galeriYazilirMi({ kaynak: null, adresler: [] }, { kaynak: "N11", adresler: ["https://n11scdn.akamaized.net/a.jpg"] }));
  kontrol("kart resimleri: ana önce, tekrarsız", JSON.stringify(kartResimleri(TY2, [TY, TY2])) === JSON.stringify([TY2, TY]));
  kontrol("kart resimleri: ana yoksa galeri", JSON.stringify(kartResimleri(null, [TY])) === JSON.stringify([TY]));
  kosanBolumler.push("galeri");
}

/* ③ BAĞ */
{
  const analiz = oku("src/lib/urun-karti-analiz.ts");
  const kalemBasi = analiz.indexOf("async function donemKalemleri(");
  const kalemSonu = analiz.indexOf("export async function kartAnalizi(");
  const kalemGovdesi = kalemBasi >= 0 && kalemSonu > kalemBasi ? analiz.slice(kalemBasi, kalemSonu) : "";
  kontrol("dönem kalemleri gövdesi bulundu", kalemGovdesi.length > 500);
  kontrol("kaldırılmış kalem SAYILMAZ (KALEM_GECERLI)", /\.\.\.KALEM_GECERLI,\s*sale: \{ iptalTarihi: null, soldAt: \{ gte: bas, lt: bitHaric \} \}/.test(kalemGovdesi));
  kontrol("maliyet kâr motorunun ortak gövdesinden (kalemMaliyeti)", /\? kalemMaliyeti\(/.test(kalemGovdesi));
  kontrol("kâr izni yoksa NET-1 gitmez", /net1: karGorunur \? s\(r\.net1Amount\) : null,/.test(kalemGovdesi));
  kontrol("kâr izni yoksa NET-2 gitmez", /net2: karGorunur \? s\(r\.net2Amount\) : null,/.test(kalemGovdesi));
  kontrol("kâr izni yoksa maliyet hareketi okunmaz", /stockMovements: karGorunur \? \{/.test(kalemGovdesi));
  kontrol("geri alınmış iade SAYILMAZ (IADE_GECERLI)", /return: \{ \.\.\.IADE_GECERLI, occurredAt: \{ gte: pencere\.baslangic, lt: pencere\.bitisHaric \} \}/.test(analiz));
  kontrol("izinsizde günlük NET-2 boşaltılır", /gunluk: gunlukSeri\(kalemler, iadeler, gunler\)\.map\(\(n\) => \(karGorunur \? n : \{ \.\.\.n, net2: null \}\)\),/.test(analiz));
  kontrol("merdiven yalnız izinliye", /const merdiven = karGorunur \? karMerdiveni\(kalemler\) : null;/.test(analiz));
  kontrol("kırık ana resim kartta gösterilmez", /varyant\.gorselUrl && varyant\.gorselUrl !== varyant\.gorselKirikUrl \? varyant\.gorselUrl : null/.test(analiz));

  const yazici = oku("src/lib/urun-gorseli-yaz.ts");
  kontrol("yazıcı galeriyi TEK işlemde (sil + yaz) yazar", /await prisma\.\$transaction\(\[\s*prisma\.varyantGorseli\.deleteMany\(\{ where: \{ variantId: g\.id \} \}\),\s*prisma\.varyantGorseli\.createMany\(/.test(yazici));
  kontrol("yazıcı galeri kuralını çağırır", /galeriYazilirMi\(\s*\{ kaynak: mevcutKaynak, adresler: v\.gorselGalerisi\.map\(\(g\) => g\.url\) \},\s*\{ kaynak: aday\.kaynak, adresler: aday\.galeri \},/.test(yazici));
  kontrol("yazıcı KURU koşumda galeriye yazmaz", /for \(const g of kuru \? \[\] : galeriBu\)/.test(yazici));
  kontrol("TY okuması bütün resimleri taşır", /galeri: galeriAdresleri\(Array\.isArray\(ham\.images\) \? ham\.images : \[\], "TRENDYOL"\),/.test(oku("scripts/ty/urun-v2.ts")));
  kontrol("TY senkronu galeriyi yazıcıya verir", /galeri: Array\.isArray\(u\.galeri\) \? \(u\.galeri as string\[\]\) : \[\],/.test(oku("scripts/canli-kanal-listeleme-yaz.ts")));
  kontrol("N11 senkronu galeriyi yazıcıya verir", /galeri: galeriAdresleri\(Array\.isArray\(r\.imageUrls\) \? r\.imageUrls : \[\], "N11"\),/.test(oku("scripts/canli-n11-listeleme-yaz.ts")));

  const sayfa = oku("src/app/kart/[variantId]/page.tsx");
  kontrol("sayfa analizi kartın izniyle çağırır", /const analiz = await kartAnalizi\(variantId, pencere, karGorunur\);/.test(sayfa));
  kontrol("sayfa galeriyi çizer", /<UrunGalerisi\s+resimler=\{analiz\.resimler\}/.test(sayfa));
  kontrol("kâr sekmesi izinsize açılmaz", /const sekme = istenenSekme === "kar" && !karGorunur \? "genel" : istenenSekme;/.test(sayfa));
  kontrol("varsayılan dönem son 30 gün", /donemCozumu\.pencere \?\? pencereOlustur\("SON_30_GUN", new Date\(\)\)/.test(sayfa));
  const pano = oku("src/app/kart/[variantId]/kart-panosu.tsx");
  kontrol("sekme adrese yazılır (dönem korunur)", /href=\{suzgecAdresi\(temel, mevcut, \{ sekme: s === "genel" \? undefined : s \}\)\}/.test(pano));
  kontrol("kâr sekmesi izinsizde menüde de yok", /KART_SEKMELERI\.filter\(\(s\) => karGorunur \|\| s !== "kar"\)/.test(pano));
  kontrol("sipariş toplamı DÖNEMİN tamamı (İlke #15)", /siparisToplam: \{ satir: kalemler\.length, adet, ciro,/.test(analiz));
  kosanBolumler.push("bag");
}

console.log("=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
  process.exit(1);
}
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrol içinde)`);
  process.exitCode = 1;
}
