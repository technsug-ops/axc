import {
  iceAktarmaDogrula,
  type HamVeri,
  type Referans,
} from "../src/lib/ice-aktarma/dogrula";

/**
 * ============================================================================
 *  TOPLU İÇE AKTARMA — KOD ÇARPIŞMA KAPISI (DEĞER TESTİ)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: SUREKLI — BEKCI. Hiçbir şey yazmaz, veritabanına gitmez.
 *
 *      npm run toplu-kapi:dogrula
 *
 *  ⛔ NİYE DOĞDU (21.09.2026). K231: bir pazaryeri kodu ikinci bir varyantın
 *  KİMLİK alanına yazılmıştı; arama iki kayıt bulup sessizce birini seçti,
 *  sipariş stoğu sıfır olan ikize düştü. Elle yollar aynı gün kapatıldı;
 *  toplu içe aktarma AÇIK kalmıştı — dördüncü rolü (kanal kodu) hiç
 *  indekslemiyordu, kanal eşleştirmesi de kodun kendisine bakmıyordu.
 *
 *  ⚠ BU BEKÇİ KAYNAK TARAMAZ, GÖVDEYİ ÇAĞIRIR. `iceAktarmaDogrula` saf:
 *  referansı dışarıdan alıyor. Sentetik referans + sentetik dosya ile
 *  kapının DEĞERİ sınanır; desen dosyada bulunup davranış yok olamaz.
 *  _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz".)_
 *
 *  İKİ YÖN AYRI SINANIR: kapının çarpışmayı YAKALADIĞI (yanlış susma) ve
 *  kaydın KENDİSİNİ çarpışma SAYMADIĞI (yanlış yanma). Yalnız ilki
 *  yazılsaydı, her şeyi reddeden bir kapı da "doğru" görünürdü.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log(`         ${JSON.stringify(gorulen)}`);
  }
}

/* ------------------------------------------------------------ SENTETİK -- */
const HESAP = { id: "hesap-hb", etiket: "Hepsiburada — AXCALI" };
const VARYANT_A = { id: "var-A", urunId: "urun-A", sku: "SKU-A", firmaSku: "F-A", barkod: "8710000000001" };
const VARYANT_B = { id: "var-B", urunId: "urun-B", sku: "SKU-B", firmaSku: "F-B", barkod: "8710000000002" };
/** A'nın Hepsiburada kodu — K231'deki `HBCV00000R0H0K` rolü. */
const KANAL_KODU_A = "HBCV-TEST-A";

function referans(ek: Partial<Referans> = {}): Referans {
  return {
    kategoriler: [],
    raflar: [],
    kanalHesaplari: [HESAP],
    mevcutVaryantlar: [VARYANT_A, VARYANT_B],
    mevcutUrunAdlari: [],
    mevcutKanalSkulari: [
      { kanalHesabiId: HESAP.id, varyantId: VARYANT_A.id, kod: KANAL_KODU_A },
    ],
    bugun: new Date("2026-09-21T00:00:00Z"),
    ...ek,
  };
}

function veri(ek: Partial<HamVeri> = {}): HamVeri {
  return { urunler: [], acilisStogu: [], kanalSku: [], ...ek };
}

/** Ürünler sayfasında tek satırlık yeni ürün. */
function urunSatiri(h: Record<string, string>, satirNo = 2) {
  return {
    satirNo,
    hucreler: { urunAdi: "Sentetik Ürün", marka: "", kategori: "", raf: "", varyantAdi: "", desi: "", ...h },
  };
}
/** Kanal SKU sayfasında tek satır. */
function kanalSatiri(h: Record<string, string>, satirNo = 2) {
  return { satirNo, hucreler: { kanalHesabi: HESAP.etiket, komisyonOrani: "", ...h } };
}

let sayac = 0;
const kimlik = () => `yeni-${++sayac}`;

console.log("\nTOPLU İÇE AKTARMA — KOD ÇARPIŞMA KAPISI");
console.log("=".repeat(70));

/* ------------------------------------------------------- 1) VARYANT KAPISI */
console.log("\n1) YENİ VARYANT: kimlik kodu BAŞKASININ KANAL KODU olamaz");
{
  const s = iceAktarmaDogrula(
    veri({ urunler: [urunSatiri({ sku: KANAL_KODU_A, firmaSku: "F-NEW", barkod: "" })] }),
    referans(),
    "YALNIZ_YENI",
    kimlik,
  );
  const h = s.hatalar.find((x) => x.kod === "KOD_BASKANIN_KANAL_KODU");
  kontrol("sku = başkasının kanal kodu → KOD_BASKANIN_KANAL_KODU", h !== undefined, s.hatalar.map((x) => x.kod));
  kontrol("  ...hata alanı 'sku' ve değeri kodun kendisi", h?.alan === "sku" && h?.deger === KANAL_KODU_A, h);
  kontrol("  ...ve satır ATLANDI — plana varyant girmedi", s.plan.yeniVaryantlar.length === 0, s.plan.yeniVaryantlar.length);
}
{
  const s = iceAktarmaDogrula(
    veri({ urunler: [urunSatiri({ sku: "SKU-NEW", firmaSku: "F-NEW", barkod: KANAL_KODU_A })] }),
    referans(),
    "YALNIZ_YENI",
    kimlik,
  );
  const h = s.hatalar.find((x) => x.kod === "KOD_BASKANIN_KANAL_KODU");
  kontrol("barkod = başkasının kanal kodu → aynı hata, alan 'barkod'", h?.alan === "barkod", s.hatalar.map((x) => x.kod));
}
{
  /**
   * ⚠ YANLIŞ YANMA YÖNÜ: kod bir kanal koduysa ama sahibi BU varyantsa
   * (GUNCELLE kipinde mevcut kaydın kendisi) hata OLMAMALI. Yoksa var olan
   * hiçbir ürün güncellenemez.
   */
  const s = iceAktarmaDogrula(
    veri({ urunler: [urunSatiri({ sku: VARYANT_A.sku, firmaSku: VARYANT_A.firmaSku, barkod: KANAL_KODU_A })] }),
    referans(),
    "GUNCELLE",
    kimlik,
  );
  kontrol(
    "kod kendi kanal kodu ise (GUNCELLE) çarpışma SAYILMAZ",
    !s.hatalar.some((x) => x.kod === "KOD_BASKANIN_KANAL_KODU"),
    s.hatalar.map((x) => x.kod),
  );
}
{
  /** Temiz satır hiç hata almaz — kapı fazladan yanmıyor. */
  const s = iceAktarmaDogrula(
    veri({ urunler: [urunSatiri({ sku: "SKU-NEW", firmaSku: "F-NEW", barkod: "8710000000009" })] }),
    referans(),
    "YALNIZ_YENI",
    kimlik,
  );
  kontrol("temiz satır: çarpışma hatası YOK, plana girdi", !s.hatalar.some((x) => x.kod.startsWith("KOD_BASKANIN")) && s.plan.yeniVaryantlar.length === 1, s.hatalar.map((x) => x.kod));
}

/* ------------------------------------------------------ 2) KANAL SKU KAPISI */
console.log("\n2) YENİ KANAL SKU: kanal kodu BAŞKASININ KİMLİĞİ olamaz");
{
  /** A'ya, B'nin barkodunu kanal kodu olarak bağlamaya çalış. */
  const s = iceAktarmaDogrula(
    veri({ kanalSku: [kanalSatiri({ sku: VARYANT_A.sku, kanalKodu: VARYANT_B.barkod! })] }),
    referans({ mevcutKanalSkulari: [] }),
    "YALNIZ_YENI",
    kimlik,
  );
  const h = s.hatalar.find((x) => x.kod === "KOD_BASKANIN_KIMLIGI");
  kontrol("kanal kodu = başka varyantın barkodu → KOD_BASKANIN_KIMLIGI", h !== undefined, s.hatalar.map((x) => x.kod));
  kontrol("  ...hata alanı 'kanalKodu'", h?.alan === "kanalKodu", h);
  kontrol("  ...ve satır ATLANDI — plana kanal SKU girmedi", s.plan.yeniKanalSkulari.length === 0, s.plan.yeniKanalSkulari.length);
}
{
  /** B'nin sku'su da kimliktir. */
  const s = iceAktarmaDogrula(
    veri({ kanalSku: [kanalSatiri({ sku: VARYANT_A.sku, kanalKodu: VARYANT_B.sku })] }),
    referans({ mevcutKanalSkulari: [] }),
    "YALNIZ_YENI",
    kimlik,
  );
  kontrol("kanal kodu = başka varyantın sku'su → aynı hata", s.hatalar.some((x) => x.kod === "KOD_BASKANIN_KIMLIGI"), s.hatalar.map((x) => x.kod));
}
{
  /**
   * ⚠ YANLIŞ YANMA YÖNÜ: kod, hedef varyantın KENDİ barkoduysa meşrudur —
   * pazaryerinde barkodu kod olarak kullanmak en yaygın durum. Kapı bunu
   * reddetseydi kanal eşleştirmelerinin çoğu düşerdi.
   */
  const s = iceAktarmaDogrula(
    veri({ kanalSku: [kanalSatiri({ sku: VARYANT_B.sku, kanalKodu: VARYANT_B.barkod! })] }),
    referans({ mevcutKanalSkulari: [] }),
    "YALNIZ_YENI",
    kimlik,
  );
  kontrol(
    "kanal kodu hedefin KENDİ barkodu ise çarpışma SAYILMAZ, plana girdi",
    !s.hatalar.some((x) => x.kod === "KOD_BASKANIN_KIMLIGI") && s.plan.yeniKanalSkulari.length === 1,
    s.hatalar.map((x) => x.kod),
  );
}
{
  /**
   * DOSYA İÇİ ÇARPIŞMA: aynı dosyada bir satır `8710000000077` barkoduyla
   * yeni varyant açıyor, başka satır aynı kodu A'ya kanal kodu yapıyor.
   * Kapı yalnız veritabanına bakarsa bunu KAÇIRIR.
   */
  const s = iceAktarmaDogrula(
    veri({
      urunler: [urunSatiri({ sku: "SKU-NEW", firmaSku: "F-NEW", barkod: "8710000000077" })],
      kanalSku: [kanalSatiri({ sku: VARYANT_A.sku, kanalKodu: "8710000000077" }, 3)],
    }),
    referans({ mevcutKanalSkulari: [] }),
    "YALNIZ_YENI",
    kimlik,
  );
  kontrol(
    "aynı dosyada açılan varyantın kodu da kimliktir → KOD_BASKANIN_KIMLIGI",
    s.hatalar.some((x) => x.kod === "KOD_BASKANIN_KIMLIGI" && x.satir === 3),
    s.hatalar.map((x) => [x.kod, x.satir]),
  );
}

/* ------------------------------------------------- 3) ÇAKIŞAN DİZİN BEYANI */
console.log("\n3) REFERANSTA ZATEN ÇAKIŞAN KANAL KODU dizinden atılır (beyan)");
{
  /**
   * Aynı kanal kodu referansta İKİ farklı varyanta bağlıysa bu geçmiş bir
   * çarpışmadır; dizin onu ATAR ve bu satırı o yüzden suçlamaz. Bilinçli
   * karar: "son gelen kazanır" bir seçim olurdu. Test bu tercihi
   * SABİTLİYOR ki biri sessizce değiştirmesin.
   */
  const s = iceAktarmaDogrula(
    veri({ urunler: [urunSatiri({ sku: "CAKISIK", firmaSku: "F-NEW", barkod: "" })] }),
    referans({
      mevcutKanalSkulari: [
        { kanalHesabiId: HESAP.id, varyantId: VARYANT_A.id, kod: "CAKISIK" },
        { kanalHesabiId: "hesap-ty", varyantId: VARYANT_B.id, kod: "CAKISIK" },
      ],
    }),
    "YALNIZ_YENI",
    kimlik,
  );
  kontrol(
    "iki varyanta bağlı kanal kodu dizinden atılır — bu satır suçlanmaz",
    !s.hatalar.some((x) => x.kod === "KOD_BASKANIN_KANAL_KODU"),
    s.hatalar.map((x) => x.kod),
  );
}

console.log("\n" + "=".repeat(70));
if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
