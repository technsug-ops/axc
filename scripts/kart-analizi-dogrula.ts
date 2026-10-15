import { kaynakOku } from "./kaynak-oku";
import { galeriAdresleri, galeriYazilirMi, GALERI_TAVANI, kartResimleri } from "../src/lib/urun-gorseli";
import {
  adetBasinaKazanc,
  stoktaGunSayisi,
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
const BOLUM_SAYISI = 4;

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

  /* ⛔ 15.10.2026 kullanıcı vakası: payda DÖNEMİN günü değil, ürünün STOKTA olduğu gün. */
  {
    const otuzGun = gunListesi(new Date("2026-09-13T00:00:00Z"), new Date("2026-10-12T00:00:00Z"));
    /* Tefal: dönem öncesi stok 0 · 10.10 alım +2 · 12.10 satış −1 → eldeki 1. */
    const tefalSeri = gunlukStok(0, [{ gun: "2026-10-10", delta: 2 }, { gun: "2026-10-12", delta: -1 }], otuzGun);
    const tefalGun = stoktaGunSayisi(0, tefalSeri, new Set(["2026-10-12"]));
    kontrol("stokta olduğu gün: 30 günlük dönemde 10.10'da giren ürün → 3 gün (10 · 11 · 12)", tefalGun === 3, tefalGun);
    kontrol("  ...Tefal: eldeki 1, 3 günde 1 satış → 3 gün (eski hesap 30 gün diyordu)", stokYeterGun(1, 1, tefalGun) === 3, stokYeterGun(1, 1, tefalGun));
    /* İkinci vaka: 08.10'da 6 giriş, 13.10'da 1 satış, dönem 15.09–14.10 → eldeki 5. */
    const ikinciDonem = gunListesi(new Date("2026-09-15T00:00:00Z"), new Date("2026-10-14T00:00:00Z"));
    const ikinciSeri = gunlukStok(0, [{ gun: "2026-10-08", delta: 6 }, { gun: "2026-10-13", delta: -1 }], ikinciDonem);
    const ikinciGun = stoktaGunSayisi(0, ikinciSeri, new Set(["2026-10-13"]));
    kontrol("  ...eldeki 5, 7 günde 1 satış → 35 gün (eski hesap 150 gün diyordu)", ikinciGun === 7 && stokYeterGun(5, 1, ikinciGun) === 35, { ikinciGun, gun: stokYeterGun(5, 1, ikinciGun) });
    /* Ayrımın öteki yakası: dönem başında zaten stokta olan ürün → bütün günler sayılır. */
    kontrol("  ...dönem boyunca stoktaysa payda dönemin TAMAMI (30)", stoktaGunSayisi(4, gunlukStok(4, [], otuzGun), new Set()) === 30);
    /* Aynı gün girip aynı gün tükenen mal (gün sonu 0) o gün rafta DURMUŞTUR. */
    kontrol("  ...aynı gün girip tükenen gün SAYILIR (satış günü)",
      stoktaGunSayisi(0, gunlukStok(0, [{ gun: "2026-10-01", delta: 1 }, { gun: "2026-10-01", delta: -1 }], gunler), new Set(["2026-10-01"])) === 1);
    kontrol("  ...stoksuz ve satışsız gün SAYILMAZ (hiç stok yok → 0)", stoktaGunSayisi(0, gunlukStok(0, [], gunler), new Set()) === 0);
    /* Gün BAŞINDA rafta olan mal, gün içinde satış dışı düzeltmeyle sıfırlansa da o gün rafta durmuştur. */
    kontrol("  ...gün başında stoklu, gün içinde DÜZELTMEYLE sıfırlanan gün SAYILIR (satış yok)",
      stoktaGunSayisi(2, gunlukStok(2, [{ gun: "2026-10-01", delta: -2 }], gunler), new Set()) === 1);
  }

  /* ADET BAŞI KAZANÇ (15.10.2026): merdivenle AYNI kalemlerden. */
  {
    const k = (adet: number, net: number | null): KartKalemi =>
      ({ saleId: "s", siparisNo: "1", gun: "2026-10-01", ciro: 100 * adet, adet, maliyet: net === null ? null : 50 * adet, net1: net, net2: net === null ? null : net - 10, kanal: "TY", hesap: "A" }) as unknown as KartKalemi;
    const m = karMerdiveni([k(2, 60), k(1, 30), k(5, null)]);
    kontrol("merdivenin adedi YALNIZ hesaplanan kalemlerden (2+1=3; hesaplanamayan 5 adet DIŞARIDA)", m.dahilAdet === 3, m.dahilAdet);
    const a = adetBasinaKazanc(m);
    kontrol("adet başı: NET-1 90/3 = 30 · NET-2 70/3", a !== null && a.net1 === 30 && Math.abs(a.net2 - 70 / 3) < 1e-9, a);
    kontrol("  ...adet yoksa YOK (sıfıra bölünmez)", adetBasinaKazanc({ net1: 0, net2: 0, dahilAdet: 0 }) === null);
  }

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
  /* 15.10.2026: stok kaç gün yeter — payda STOKTA OLDUĞU gün, dönemin gün sayısı DEĞİL. */
  kontrol("stok kaç gün yeter: analiz STOKTA OLDUĞU günle çağırır (dönemin gün sayısıyla DEĞİL)",
    /stokYeterGun: stokYeterGun\(eldekiAdet, adet, stoktaGun\),/.test(analiz) && !/stokYeterGun\(eldekiAdet, adet, gunler\.length\)/.test(analiz));
  kontrol("  ...stokta olduğu gün, kartın ÇİZDİĞİ stok serisinden ve satış günlerinden",
    /const stoktaGun = stoktaGunSayisi\(\s*stokOnce\._sum\.quantityDelta \?\? 0,\s*stokSerisi,\s*new Set\(kalemler\.filter\(\(k\) => k\.adet > 0\)\.map\(\(k\) => k\.gun\)\),\s*\);/.test(analiz) && /^\s*stokSerisi,$/m.test(analiz));
  const panoK = oku("src/app/kart/[variantId]/kart-panosu.tsx");
  kontrol("  ...ekran rakamın TABANINI yazar (kaç günde kaç satış)", /:\s*t\("yeterTaban", \{ gun: a\.stoktaGun, adet: a\.adet \}\)/.test(panoK));
  kontrol("adet başı kazanç: kâr kutusunda merdivenle AYNI gövdeden çizilir",
    /const adetBasi = m === null \|\| m\.dahilKalem === 0 \? null : adetBasinaKazanc\(m\);/.test(panoK) && /\{karGorunur && adetBasi !== null \? \(/.test(panoK));
  kosanBolumler.push("bag");
}

/* ④ ÇİZİM (11.10.2026 kullanıcı bulguları): fiyat noktası rakamsızdı · küçük grafik geniş
   ekranda orantılı büyüyüp satırdan taşıyordu · özet kutularında içerik yukarı yapışıktı ·
   telefonda panel kutusunun 64 px sağ payı etiketi harf harf kırıyordu. */
{
  const grafik = oku("src/app/kart/[variantId]/kart-grafikleri.tsx");
  const blok = (m: string, bas: string, son: string) => {
    const i = m.indexOf(bas);
    const j = i >= 0 ? m.indexOf(son, i + bas.length) : -1;
    return i >= 0 && j > i ? m.slice(i, j) : "";
  };
  const mini = blok(grafik, "export function MiniCizgi(", "export function DurumHalkasi(");
  kontrol("küçük grafik bulundu", mini.length > 500, mini.length);
  kontrol("  ...SABİT yükseklikte (geniş ekranda büyümez)", /<div className="relative w-full" style=\{\{ height: yukseklik \}\}>/.test(mini) && !/className="h-auto w-full"/.test(mini));
  kontrol("  ...çizgi yatayda esner, kalınlık sabit", /preserveAspectRatio="none"/.test(mini) && /vectorEffect="non-scaling-stroke"/.test(mini));
  /* ⚠ ÖLÇÜT DEĞİŞTİ (12.10.2026, kullanıcı: «anlamsız işaretler»): değer artık noktanın
     üstünde YÜZEN etiketle değil, çizginin ALTINDA ilk/son satırıyla yazılıyor (yüzen
     etiketler üst üste biniyordu). Niyet aynı: ilk ve son değer OKUNUR. */
  kontrol("  ...ilk/son noktanın değeri (ve tarihi) çizginin ALTINDA yazılır",
    /<span>\{ucYazisi\(ilk\)\}<\/span>/.test(mini) && /\{ucYazisi\(son\)\}<\/span>/.test(mini) && !/\{bicimle!\(d\)\}/.test(mini));
  kontrol("  ...çizgi yalnız DOLU noktalardan geçer (seyrek satışta yüzen yuvarlak yok)",
    /const yol = dolular\.map\(\(n, j\) => `\$\{j === 0 \? "M" : "L"\}/.test(mini) && !/yollar\(/.test(mini));
  kontrol("  ...tek nokta ÇİZİLMEZ, metin olarak yazılır",
    /if \(dolular\.length === 1\) \{[\s\S]{0,200}?return metin === null \? null : <p /.test(mini));
  const pano = oku("src/app/kart/[variantId]/kart-panosu.tsx");
  /* Çağrılar artık çok satırlı olabilir — desen satır sonu da kapsar. */
  const cagrilar = pano.match(/<MiniCizgi\b[\s\S]*?\/>/g) ?? [];
  kontrol("küçük grafiğin her kullanımı değer biçimini ve TARİHLERİ verir",
    cagrilar.length >= 3 && cagrilar.every((c) => c.includes("bicimle={(n) => bicim.para(n, para)}") && /tarihler=\{/.test(c)), cagrilar.length);
  kontrol("  ...Fiyat kutusunda tek satış günü ve tek alım METİNLE yazılır",
    /tekMetni=\{tekSatis\.length === 1 \? t\("tekSatisGunu"/.test(pano) && /tekMetni=\{a\.alimFiyatlari\.length === 1 \? t\("tekAlim"/.test(pano));
  const stokFiyat = blok(grafik, "export function StokFiyatGrafigi(", "export function MiniCizgi(");
  kontrol("stok-fiyat grafiğinde fiyat noktası rakamlı", /\{fiyatEtiketli\.has\(i\) \? \(\s*<text[^>]*>\s*\{bicimlePara\(n\.fiyat\)\}/.test(stokFiyat));
  kontrol("  ...yan yana yazılar binmez (aralık kapısı)", /if \(x\(i\) - sonEtiketX < FIYAT_ETIKET_ARALIGI\) return;/.test(stokFiyat) && /const FIYAT_ETIKET_ARALIGI = \d+;/.test(grafik));
  const ozet = blok(pano, "export async function OzetKutulari(", "export async function SekmeCubugu(");
  kontrol("özet kutularında içerik ortada (üç kutu)", (ozet.match(/className="flex flex-col gap-2 rounded-lg border p-4"/g) ?? []).length === 3 && (ozet.match(/className="my-auto/g) ?? []).length === 3);
  const kutu = oku("src/components/istatistik-kutusu.tsx");
  const ist = blok(kutu, "export function IstatistikKutusu(", "export function MiniCubuklar(");
  kontrol("panel kutusu: telefonda sağ pay YOK", /\$\{miniVar \? "sm:pr-16" : ""\}/.test(ist) && !/"pr-16"/.test(ist));
  kontrol("  ...tek kovalık seride çubuk çizilmez", /const miniVar = mini !== undefined && mini\.length >= 2;/.test(ist));
  kontrol("  ...telefonda çubuklar yazının altına akar", /<MiniCubuklar degerler=\{mini\} telefondaAkista \/>/.test(ist) && /max-sm:static/.test(kutu));
  kosanBolumler.push("cizim");
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
