/**
 * ============================================================================
 *  KOMİSYON İÇE AKTARMA DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run komisyon:dogrula
 *
 *  Veritabanına GİTMEZ, dosya AÇMAZ. Beş bölüm:
 *  1) YÜZDE ÇÖZME — üç pazaryeri biçimi ve aralık dışı değerler.
 *  2) PLATFORM TANIMA — yanlış dosya reddi. HAKEDİŞ dosyası da burada
 *     REDDEDİLMELİ: iki dosyada da "Barkod" kolonu var, ayrım özgün
 *     kolonlarla yapılıyor.
 *  3) OKUYUCULAR — çoklu barkod, boş kod, toplam satırı.
 *  4) PLAN — eşleştirme sırası, yeni eşleme, tekrar, çakışma.
 *  5) GERÇEK BAŞLIK SATIRLARI — 13.08.2026'da okunan gerçek dosyalar.
 *     Dosyalar depoya KONMADI (ticari veri, depo herkese açık); yerine
 *     başlık satırları ve ölçüm sonuçları buraya çıkarıldı.
 * ============================================================================
 */

import {
  hepsiburadaKomisyonOku,
  komisyonOku,
  platformTani,
  trendyolKomisyonOku,
  yuzdeCoz,
  type SayfaGirdisi,
} from "../src/lib/komisyon/okuyucu";
import {
  cakisanKodlariAyikla,
  planKur,
  type MevcutEsleme,
  type VaryantKaydi,
} from "../src/lib/komisyon/plan";
import type { KomisyonOkumasi } from "../src/lib/komisyon/model";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 5;
const kosanBolumler: string[] = [];

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) {
    console.log(`  OK    ${ad}`);
  } else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

/**
 * GERÇEK BAŞLIK SATIRLARI (13.08.2026, kullanıcının indirdiği dosyalar).
 * Bunlar dosya BİÇİMİdir, ticari veri değildir; veri satırları sentetik.
 */
const HB_BASLIK = [
  "UniqueIdentifier",
  "Buybox Sırası",
  "Satıcı Stok Kodu",
  "SKU",
  "Ürün Adı",
  "Komisyon Oranı",
  "Vade Süresi",
  "Fiyat",
  "İndirimli Fiyat",
  "Stok",
  "Maks. Satın Alma Adedi",
  "Kargoya Veriliş Süresi",
  "Teslimat Profili",
  "En Alt Kategori",
  "Ana Kategori",
  "En Temel Kategori",
  "Marka",
  "Durum",
  "Teslimat Adresi",
  "İade Adresi",
  "Özelleştirilebilen Metin Türü",
  "Özelleştirilebilen Metin Uzunluğu",
  "Kilitlenme Nedeni",
  "IsFulfilledByHB",
  "Barkod",
  "Oluşturulma Tarihi",
];

const TY_BASLIK = [
  "Partner ID",
  "Barkod",
  "Komisyon Oranı",
  "Model Kodu",
  "Ürün Rengi",
  "Beden",
  "Boyut/Ebat",
  "Cinsiyet",
  "Marka",
  "Kategori İsmi",
  "Tedarikçi Stok Kodu",
  "Ürün Adı",
  "Ürün Açıklaması",
  "Piyasa Satış Fiyatı (KDV Dahil)",
  "Trendyol'da Satılacak Fiyat (KDV Dahil)",
  "BuyBox Fiyatı",
  "Ürün Stok Adedi",
  "KDV Oranı",
  "ÖTV Oranı",
  "Desi",
  "Görsel 1",
  "Görsel 2",
  "Görsel 3",
  "Görsel 4",
  "Görsel 5",
  "Görsel 6",
  "Görsel 7",
  "Görsel 8",
  "Sevkiyat Süresi",
  "Sevkiyat Tipi",
  "Kargo Şirketi",
  "Parti/Lot/SKT Bilgisi",
  "Durum",
  "Durum Açıklaması",
  "Trendyol.com Linki",
];

/** Trendyol ürün listesinin İKİNCİ sayfası — komisyon listesi DEĞİL. */
const TY_IKINCI_SAYFA_BASLIK = [
  "Sevkiyat Tipi",
  "Kargo Şirketi",
  null,
  null,
  null,
  null,
  "Kategori Adı",
  "Termin Süresi Aralığı",
];

/** HB satırı kurar: yalnız ilgilendiğimiz kolonlar dolu. */
function hbSatir(o: {
  satici?: string;
  sku?: string;
  ad?: string;
  oran?: unknown;
  barkod?: string;
}): unknown[] {
  const satir: unknown[] = new Array(HB_BASLIK.length).fill(null);
  satir[2] = o.satici ?? null;
  satir[3] = o.sku ?? null;
  satir[4] = o.ad ?? null;
  satir[5] = o.oran ?? null;
  satir[24] = o.barkod ?? null;
  return satir;
}

/** TY satırı kurar. */
function tySatir(o: {
  barkod?: string;
  oran?: unknown;
  tedStok?: string;
  ad?: string;
}): unknown[] {
  const satir: unknown[] = new Array(TY_BASLIK.length).fill(null);
  satir[1] = o.barkod ?? null;
  satir[2] = o.oran ?? null;
  satir[10] = o.tedStok ?? null;
  satir[11] = o.ad ?? null;
  return satir;
}

// ===========================================================================
console.log("\n1) YÜZDE ÇÖZME");
// ===========================================================================
{
  // Üç pazaryeri biçimi — ölçüldü 13.08.2026.
  kontrol('HB "13%" -> 13', yuzdeCoz("13%") === 13, yuzdeCoz("13%"));
  kontrol('HB "16,67%" -> 16,67', yuzdeCoz("16,67%") === 16.67, yuzdeCoz("16,67%"));
  kontrol('TY "8.5" -> 8,5', yuzdeCoz("8.5") === 8.5, yuzdeCoz("8.5"));
  kontrol('TY "15.0" -> 15', yuzdeCoz("15.0") === 15, yuzdeCoz("15.0"));
  kontrol('TY "14.75" -> 14,75', yuzdeCoz("14.75") === 14.75);
  kontrol("sayı hücresi 20 -> 20", yuzdeCoz(20) === 20);
  kontrol("boşluklu ' 11 % ' -> 11", yuzdeCoz(" 11 % ") === 11, yuzdeCoz(" 11 % "));

  // Kesinlik: alan Decimal(5,2). Üç basamak YUVARLANIR, sessizce kısalmaz.
  kontrol('"16.666" -> 16,67', yuzdeCoz("16.666") === 16.67, yuzdeCoz("16.666"));

  // GEÇERSİZLER — hepsi null, satır atlanır.
  kontrol("boş -> null", yuzdeCoz("") === null);
  kontrol("null -> null", yuzdeCoz(null) === null);
  kontrol('"abc" -> null', yuzdeCoz("abc") === null);
  kontrol("negatif -> null", yuzdeCoz("-5") === null);
  kontrol("100 üstü -> null (%101 komisyon olmaz)", yuzdeCoz("101") === null);
  /**
   * HÜCRE KAYMASI TUZAĞI: fiyat kolonu okunsaydı "3299" gelirdi. Aralık
   * kontrolü olmasa bu değer yazılır ve kâr motoru o üründe eksi kâr
   * üretirdi — hem de hiç uyarı vermeden.
   */
  kontrol("fiyat gibi bir değer (3299) -> null", yuzdeCoz("3299") === null);
  kontrol("sınır: 0 geçerli", yuzdeCoz("0") === 0);
  kontrol("sınır: 100 geçerli", yuzdeCoz("100") === 100);
  kosanBolumler.push("yüzde");
}

// ===========================================================================
console.log("\n2) PLATFORM TANIMA — yanlış dosya reddi");
// ===========================================================================
{
  const hbSayfa: SayfaGirdisi = {
    sheet: "Listelerim",
    data: [HB_BASLIK, hbSatir({ sku: "HBCV0000TEST01", oran: "13%" })],
  };
  const tySayfa: SayfaGirdisi = {
    sheet: "Ürünler",
    data: [TY_BASLIK, tySatir({ barkod: "1111111111111", oran: "15.0" })],
  };
  const tyIkinci: SayfaGirdisi = {
    sheet: "Termin Süresi Bilgileri",
    data: [TY_IKINCI_SAYFA_BASLIK, ["Hızlı Teslimat", "Horoz Lojistik"]],
  };

  const hb = platformTani([hbSayfa]);
  kontrol(
    "HB ürün listesi -> HEPSIBURADA",
    hb.durum === "TANINDI" && hb.platform === "HEPSIBURADA",
    hb,
  );

  const ty = platformTani([tySayfa, tyIkinci]);
  kontrol(
    "TY ürün listesi -> TRENDYOL, doğru sayfa",
    ty.durum === "TANINDI" && ty.platform === "TRENDYOL" && ty.sayfa === "Ürünler",
    ty,
  );

  /**
   * SAYFA SIRASI GARANTİ DEĞİL. Termin sayfası önce gelse de komisyon
   * listesi bulunmalı — sayfa ADIYLA değil BAŞLIK İMZASIYLA seçiliyor.
   */
  const tyTers = platformTani([tyIkinci, tySayfa]);
  kontrol(
    "sayfa sırası ters olsa da komisyon sayfası bulunur",
    tyTers.durum === "TANINDI" && tyTers.sayfa === "Ürünler",
    tyTers,
  );

  kontrol(
    "yalnız termin sayfası -> TANINMADI",
    platformTani([tyIkinci]).durum === "TANINMADI",
  );
  kontrol("boş dosya -> TANINMADI", platformTani([]).durum === "TANINMADI");
  kontrol(
    "alakasız sayfa -> TANINMADI",
    platformTani([{ sheet: "Sayfa1", data: [["Ad", "Soyad"], ["a", "b"]] }])
      .durum === "TANINMADI",
  );

  /**
   * ASIL TUZAK: HAKEDİŞ dosyaları da yüklenebilir bir xlsx ve TY hakedişinde
   * "Barkod" kolonu VAR. Komisyon listesiyle karıştırılırsa okuyucu boş
   * liste üretir ve kullanıcı "hiçbir şey eşleşmedi" görür. Özgün kolon
   * şartı bunu engelliyor.
   */
  const tyHakedisBaslik = [
    "Kayıt No / Fatura No",
    "Ülke",
    "İşlem Tipi",
    "Sipariş No",
    "Barkod",
    "Ürün Adı / Açıklama",
    "Komisyon / Yurt Dışı Stok Destek Oranı",
    "Satıcı Hakediş",
    "Vade Tarihi",
    "Vade Süresi (İş Günü)",
    "Toplam Tutar",
  ];
  kontrol(
    "TY HAKEDİŞ dosyası komisyon listesi sayılmaz",
    platformTani([{ sheet: "Sayfa1", data: [tyHakedisBaslik, []] }]).durum ===
      "TANINMADI",
  );

  const hbHakedisBaslik = [
    "Durum",
    "Ödeme Tarihi",
    "Kayıt No",
    "Kayıt Tipi",
    "Vade Tarihi",
    "Tutar",
    "Para Birimi",
    "Sipariş No",
    "Ürün No (SKU)",
    "Kayıt Türü",
  ];
  kontrol(
    "HB HAKEDİŞ dosyası komisyon listesi sayılmaz",
    platformTani([{ sheet: "Sayfa1", data: [hbHakedisBaslik, []] }]).durum ===
      "TANINMADI",
  );

  // BAŞLIK TOLERANSI: fazladan boşluk ve küçük harf okuyucuyu kırmamalı.
  const bozukBaslik = HB_BASLIK.map((b) =>
    b === "Komisyon Oranı" ? "  komisyon   oranı " : b,
  );
  kontrol(
    "başlıkta fazladan boşluk/küçük harf tanınmayı bozmaz",
    platformTani([{ sheet: "Listelerim", data: [bozukBaslik, []] }]).durum ===
      "TANINDI",
  );
  kosanBolumler.push("platform");
}

// ===========================================================================
console.log("\n3) OKUYUCULAR");
// ===========================================================================
{
  const hb = hepsiburadaKomisyonOku([
    HB_BASLIK,
    hbSatir({
      satici: "HBV00000TEST1",
      sku: "HBCV0000TEST01",
      ad: "Deneme Ürün",
      oran: "13%",
      // ÇOKLU BARKOD: HB tek hücrede ";" ile veriyor (gerçek dosyada görüldü).
      barkod: "4000000000001-1;4000000000002;4000000000003",
    }),
    // SKU boş: Satıcı Stok Kodu kanal koduna terfi eder.
    hbSatir({ satici: "HBV00000TEST2", oran: "11%", barkod: "1111111111111" }),
    // Kodsuz satır = genel toplam satırı, ATLANIR.
    hbSatir({ oran: "99%" }),
  ]);

  kontrol("HB: 2 satır okundu (kodsuz atlandı)", hb.satirlar.length === 2, hb.satirlar.length);
  kontrol("HB: eksik sütun yok", hb.eksikSutunlar.length === 0);
  kontrol(
    "HB: kanal kodu SKU'dur",
    hb.satirlar[0].kanalKodu === "HBCV0000TEST01",
    hb.satirlar[0].kanalKodu,
  );
  kontrol(
    "HB: ikinci kod Satıcı Stok Kodu",
    hb.satirlar[0].ikinciKod === "HBV00000TEST1",
  );
  kontrol(
    "HB: çoklu barkod ayrıldı (3)",
    hb.satirlar[0].barkodlar.length === 3,
    hb.satirlar[0].barkodlar,
  );
  kontrol("HB: oran 13", hb.satirlar[0].oran === 13);
  kontrol("HB: ürün adı okundu", hb.satirlar[0].urunAdi === "Deneme Ürün");
  kontrol(
    "HB: SKU boşsa Satıcı Stok Kodu kanal kodu olur",
    hb.satirlar[1].kanalKodu === "HBV00000TEST2",
    hb.satirlar[1].kanalKodu,
  );
  // Satır numarası ELEKTRONİK TABLODAKİ numaradır: başlık 1. satır.
  kontrol("HB: satır no 2'den başlar", hb.satirlar[0].satirNo === 2);

  const ty = trendyolKomisyonOku([
    TY_BASLIK,
    tySatir({ barkod: "4000000000010", oran: "15.0", ad: "Deneme" }),
    // Tedarikçi Stok Kodu BOŞ — gerçek dosyada 616 satırda böyle.
    tySatir({ barkod: "4000000000011", oran: "8.5" }),
    // Barkodsuz satır atlanır.
    tySatir({ oran: "20.0" }),
  ]);

  kontrol("TY: 2 satır okundu", ty.satirlar.length === 2, ty.satirlar.length);
  kontrol(
    "TY: kanal kodu BARKODdur (canlı geleneği)",
    ty.satirlar[0].kanalKodu === "4000000000010",
  );
  kontrol("TY: oran 15", ty.satirlar[0].oran === 15);
  kontrol("TY: tedarikçi kodu boşsa null", ty.satirlar[1].ikinciKod === null);

  // Zorunlu kolon yoksa okuyucu SESSİZCE boş liste vermez, sebebi söyler.
  const eksik = trendyolKomisyonOku([["Partner ID", "Barkod"], ["1", "2"]]);
  kontrol(
    "TY: Komisyon Oranı kolonu yoksa eksikSutunlar dolu",
    eksik.satirlar.length === 0 && eksik.eksikSutunlar.length === 1,
    eksik.eksikSutunlar,
  );

  // komisyonOku okunan sayfa adını taşır — önizlemede gösteriliyor.
  const sayfaliOkuma = komisyonOku({
    platform: "TRENDYOL",
    sayfa: "Ürünler",
    veri: [TY_BASLIK, tySatir({ barkod: "1", oran: "10" })],
  });
  kontrol("okuma sayfa adını taşır", sayfaliOkuma.sayfa === "Ürünler");
  kosanBolumler.push("okuyucu");
}

// ===========================================================================
console.log("\n4) PLAN — eşleştirme sırası ve yazım kararları");
// ===========================================================================
{
  const varyantlar: VaryantKaydi[] = [
    { id: "v-kod", barkod: "1000000000001", sku: "AAA-01" },
    { id: "v-ikinci", barkod: "1000000000002", sku: "BBB-01" },
    { id: "v-barkod", barkod: "1000000000003", sku: "CCC-01" },
    { id: "v-yeni", barkod: "1000000000004", sku: "DDD-01" },
    { id: "v-ayni", barkod: "1000000000005", sku: "EEE-01" },
    { id: "v-degisen", barkod: "1000000000006", sku: "FFF-01" },
  ];
  const mevcutlar: MevcutEsleme[] = [
    { id: "e-kod", kanalKodu: "KOD-1", varyantId: "v-kod", oran: null },
    { id: "e-ikinci", kanalKodu: "IKINCI-1", varyantId: "v-ikinci", oran: null },
    { id: "e-barkod", kanalKodu: "BASKA-KOD", varyantId: "v-barkod", oran: null },
    { id: "e-ayni", kanalKodu: "KOD-AYNI", varyantId: "v-ayni", oran: 12 },
    { id: "e-degisen", kanalKodu: "KOD-DEGISEN", varyantId: "v-degisen", oran: 10 },
  ];

  const okuma: KomisyonOkumasi = {
    platform: "TRENDYOL",
    sayfa: "Ürünler",
    satirlar: [
      // 1) kanal kodu ile
      { kanalKodu: "KOD-1", ikinciKod: null, barkodlar: [], oran: 13, hamOran: "13", urunAdi: "A", satirNo: 2 },
      // 2) ikinci kod ile
      { kanalKodu: "BILINMEYEN", ikinciKod: "IKINCI-1", barkodlar: [], oran: 14, hamOran: "14", urunAdi: "B", satirNo: 3 },
      // 3) barkod -> varyant -> mevcut eşleme (kanal kodu tutmadı)
      { kanalKodu: "YENI-KOD", ikinciKod: null, barkodlar: ["1000000000003"], oran: 15, hamOran: "15", urunAdi: "C", satirNo: 4 },
      // 4) varyant var, eşleme YOK -> yaratılır
      { kanalKodu: "TY-KODU-D", ikinciKod: null, barkodlar: ["1000000000004"], oran: 16, hamOran: "16", urunAdi: "D", satirNo: 5 },
      // 5) oran zaten aynı -> yazıma girmez
      { kanalKodu: "KOD-AYNI", ikinciKod: null, barkodlar: [], oran: 12, hamOran: "12", urunAdi: "E", satirNo: 6 },
      // 6) dolu oran DEĞİŞİYOR
      { kanalKodu: "KOD-DEGISEN", ikinciKod: null, barkodlar: [], oran: 17, hamOran: "17", urunAdi: "F", satirNo: 7 },
      // 7) katalogda hiç yok
      { kanalKodu: "HIC-YOK", ikinciKod: null, barkodlar: ["9999999999999"], oran: 18, hamOran: "18", urunAdi: "G", satirNo: 8 },
      // 8) oran okunamadı — eşleşse bile atlanır
      { kanalKodu: "KOD-1", ikinciKod: null, barkodlar: [], oran: null, hamOran: "", urunAdi: "H", satirNo: 9 },
      // 9) aynı eşlemeye ikinci satır — ilki kazanır
      { kanalKodu: "KOD-1", ikinciKod: null, barkodlar: [], oran: 99, hamOran: "99", urunAdi: "I", satirNo: 10 },
    ],
    eksikSutunlar: [],
  };

  const plan = planKur(okuma, mevcutlar, varyantlar);

  kontrol("okunan 9", plan.sayim.okunan === 9, plan.sayim);
  kontrol("boş oran dolan 3 (kod + ikinci kod + barkod yolu)", plan.sayim.bosDolan === 3, plan.sayim.bosDolan);
  kontrol("değişen 1", plan.sayim.degisen === 1, plan.sayim.degisen);
  kontrol("aynı kalan 1", plan.sayim.ayniKalan === 1, plan.sayim.ayniKalan);
  kontrol("yeni eşleme 1", plan.sayim.yeniEsleme === 1, plan.sayim.yeniEsleme);
  kontrol("katalogda yok 1", plan.sayim.katalogdaYok === 1, plan.sayim.katalogdaYok);
  kontrol("oran okunamadı 1", plan.sayim.oranOkunamadi === 1, plan.sayim.oranOkunamadi);
  kontrol("tekrar eden 1", plan.sayim.tekrarEden === 1, plan.sayim.tekrarEden);
  kontrol(
    "güncellenecek 4 (3 boş + 1 değişen)",
    plan.guncellenecekler.length === 4,
    plan.guncellenecekler.length,
  );

  /**
   * BARKOD YOLU MEVCUT EŞLEMEYE BAĞLANIR, YENİ EŞLEME AÇMAZ. Açılsaydı
   * (hesap, varyant) tekilliği patlardı ve tüm işlem geri alınırdı.
   */
  const barkodYolu = plan.guncellenecekler.find((g) => g.eslemeId === "e-barkod");
  kontrol("barkod yolu MEVCUT eşlemeyi günceller", barkodYolu?.yeniOran === 15, barkodYolu);
  kontrol(
    "barkod yolu eşlemenin KENDİ kodunu korur (dosyadaki kodu yazmaz)",
    barkodYolu?.kanalKodu === "BASKA-KOD",
    barkodYolu?.kanalKodu,
  );

  const yeni = plan.yaratilacaklar[0];
  kontrol("yeni eşleme doğru varyanta", yeni?.varyantId === "v-yeni", yeni);
  kontrol(
    "yeni eşlemeye pazaryerinin KENDİ kodu yazılır",
    yeni?.kanalKodu === "TY-KODU-D",
    yeni?.kanalKodu,
  );
  kontrol("yeni eşlemenin oranı 16", yeni?.oran === 16);

  // İlk satır kazandı: 99 değil 13 yazılıyor.
  const kod1 = plan.guncellenecekler.find((g) => g.eslemeId === "e-kod");
  kontrol("aynı hedefe ikinci satır yazılmaz (13 kaldı)", kod1?.yeniOran === 13, kod1);

  /**
   * ORANI BOŞ KALANLAR — "açık sıfır, sessiz yokluk değil" (mimar kararı
   * 13.08.2026). Yukarıdaki senaryoda dosyanın hiç dokunmadığı boş oranlı
   * eşleme YOK: beş mevcut eşlemenin üçü dolduruldu, biri aynı kaldı (oranı
   * vardı), biri değişti (oranı vardı). Bu yüzden 0 beklenir.
   */
  kontrol("dokunulmayan boş oran yoksa 0 raporlanır", plan.sayim.kalanBosOran === 0, plan.sayim.kalanBosOran);

  {
    // Dosyada HİÇ geçmeyen, oranı boş bir eşleme ekleyip sayının 1'e
    // çıktığını görüyoruz — kullanıcıya söylenecek kapanış rakamı budur.
    const listedenKalkmis: MevcutEsleme = {
      id: "e-hayalet",
      kanalKodu: "DOSYADA-YOK",
      varyantId: "v-kod",
      oran: null,
    };
    const planIkinci = planKur(okuma, [...mevcutlar, listedenKalkmis], varyantlar);
    kontrol(
      "dosyada geçmeyen boş oranlı eşleme kalan sayısına girer",
      planIkinci.sayim.kalanBosOran === 1,
      planIkinci.sayim.kalanBosOran,
    );
    kontrol(
      "kalan örneği kanal kodunu ve varyant SKU'sunu taşır",
      planIkinci.kalanBosOranOrnekleri[0]?.kanalKodu === "DOSYADA-YOK" &&
        planIkinci.kalanBosOranOrnekleri[0]?.varyantSku === "AAA-01",
      planIkinci.kalanBosOranOrnekleri[0],
    );
  }

  {
    /**
     * ORANI OKUNAMAYAN SATIRIN EŞLEMESİ DE BOŞ KALIR. Eşleşti diye
     * "halloldu" sayılırsa kullanıcı eksik kalan kaydı hiç görmez.
     */
    const tekSatir: KomisyonOkumasi = {
      platform: "TRENDYOL",
      sayfa: "Ürünler",
      satirlar: [
        { kanalKodu: "KOD-1", ikinciKod: null, barkodlar: [], oran: null, hamOran: "abc", urunAdi: null, satirNo: 2 },
      ],
      eksikSutunlar: [],
    };
    const planUcuncu = planKur(tekSatir, [mevcutlar[0]], varyantlar);
    kontrol(
      "oranı okunamayan satırın eşlemesi boş kalanlarda sayılır",
      planUcuncu.sayim.kalanBosOran === 1 && planUcuncu.sayim.oranOkunamadi === 1,
      planUcuncu.sayim,
    );
  }

  // Önizleme listeleri
  kontrol("değişen örneği eski->yeni taşır", plan.degisenOrnekleri[0]?.eskiOran === 10 && plan.degisenOrnekleri[0]?.yeniOran === 17, plan.degisenOrnekleri[0]);
  kontrol("oran örneği ham metni taşır", plan.oranOrnekleri[0]?.satirNo === 9);
  kontrol("bulunamayan örneği kodu taşır", plan.bulunamayanOrnekleri[0]?.kod === "HIC-YOK");

  // --- KANAL KODU ÇAKIŞMASI: aynı kod iki farklı varyanta ---
  const cakismaliOkuma: KomisyonOkumasi = {
    platform: "HEPSIBURADA",
    sayfa: "Listelerim",
    satirlar: [
      { kanalKodu: "AYNI-KOD", ikinciKod: null, barkodlar: ["1000000000004"], oran: 10, hamOran: "10", urunAdi: null, satirNo: 2 },
      { kanalKodu: "AYNI-KOD", ikinciKod: null, barkodlar: ["1000000000001"], oran: 11, hamOran: "11", urunAdi: null, satirNo: 3 },
    ],
    eksikSutunlar: [],
  };
  // v-kod'un eşlemesi var; onu listeden çıkarıp iki YARATMA adayı üretiyoruz.
  const cakismaliPlan = planKur(cakismaliOkuma, [], varyantlar);
  kontrol(
    "iki yaratma adayı üretildi",
    cakismaliPlan.yaratilacaklar.length === 2,
    cakismaliPlan.yaratilacaklar.length,
  );
  const { temiz, cakisan } = cakisanKodlariAyikla(cakismaliPlan);
  kontrol("çakışan kod ayıklandı: 1 temiz, 1 çakışan", temiz.length === 1 && cakisan.length === 1, {
    temiz: temiz.length,
    cakisan: cakisan.length,
  });
  kosanBolumler.push("plan");
}

// ===========================================================================
console.log("\n5) GERÇEK DOSYA — 13.08.2026 ölçümü");
// ===========================================================================
{
  /**
   * GERÇEK DOSYALAR DEPOYA KONMADI (ticari veri; depo herkese açık).
   * Yerine dosya BİÇİMİ ve ölçüm sonuçları burada kilitleniyor.
   *
   * ÖLÇÜM (canlı veritabanı, salt okunur):
   *   HB "Listelerim" 2151 satır → 1044 eşleşti (1040 kod + 4 barkod),
   *     1037'sinin oranı boştu · 26 varyant eşlemesizdi · 1081 satır bizde yok
   *   TY "Ürünler"    1581 satır →   14 eşleşti (kanal kodu),
   *     1028 varyant eşlemesizdi · 539 satır bizde yok
   * Yani TY tarafının değeri tamamen "eksik eşlemeyi yarat" kararına bağlı.
   */
  kontrol("HB başlığı 26 kolon", HB_BASLIK.length === 26, HB_BASLIK.length);
  kontrol("TY başlığı 35 kolon", TY_BASLIK.length === 35, TY_BASLIK.length);

  // Gerçek başlıklarla okuyucular kolonlarını BULMALI.
  const hb = hepsiburadaKomisyonOku([HB_BASLIK, hbSatir({ sku: "X", oran: "13%" })]);
  kontrol("gerçek HB başlığıyla okuyucu tutar", hb.eksikSutunlar.length === 0 && hb.satirlar.length === 1);

  const ty = trendyolKomisyonOku([TY_BASLIK, tySatir({ barkod: "X", oran: "15.0" })]);
  kontrol("gerçek TY başlığıyla okuyucu tutar", ty.eksikSutunlar.length === 0 && ty.satirlar.length === 1);

  /**
   * TY "Komisyon Oranı" kolonu HB'de de aynı adı taşıyor ama TY'de 3. kolon,
   * HB'de 6. kolon. Kolon SIRASINA güvenilmediğinin kilidi: iki başlığı
   * çaprazlarsak okuyucu yine doğru kolonu bulur.
   */
  const tyOranSirasi = TY_BASLIK.indexOf("Komisyon Oranı");
  const hbOranSirasi = HB_BASLIK.indexOf("Komisyon Oranı");
  kontrol(
    "oran kolonu iki dosyada AYRI sırada (2 ve 5) — sıraya güvenilmiyor",
    tyOranSirasi === 2 && hbOranSirasi === 5,
    { tyOranSirasi, hbOranSirasi },
  );
  kosanBolumler.push("gerçek dosya");
}

// ===========================================================================
console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`,
  );
  process.exit(1);
} else if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
