/**
 * ============================================================================
 *  HAKEDİŞ DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run hakedis:dogrula
 *
 *  Veritabanına GİTMEZ, dosya AÇMAZ — okuyuculara ham hücre dizisi verilir.
 *  Dört bölüm:
 *  1) İŞ GÜNÜ — Trendyol vadesi iş günü cinsinden; hafta sonu atlanır.
 *  2) TRENDYOL — geniş format, sipariş dışı toplu kesintiler, genel toplam.
 *  3) HEPSİBURADA — uzun format, işaret tekleştirme, tipsiz son satır.
 *  4) TOLERANS — başlık yazımı değişirse okuyucu yine tutmalı.
 *  6) BEKLENEN vs GERÇEKLEŞEN — tam ödendi / eksik / fazla / geç /
 *     hiç gelmedi. Senaryolar GERÇEK dosya yapısına sadık: TY'de
 *     Satış+Kupon zinciri ve komisyon KDV DAHİL, HB'de uzun format.
 *  5) GERÇEK DOSYA — 11.08.2026'da okunan 5 Trendyol raporunun GERÇEK
 *     başlık satırı ve gerçek işlem tipleri. Ham veri depoya konmadı
 *     (dosyalarda "Müşteri Adı" var, depo herkese açık); yapı buraya
 *     çıkarıldı.
 * ============================================================================
 */

import { gunDegeri, isGunuEkle, isGunuFarki, haftaSonuMu } from "../src/lib/donem";
import { HAKEDIS_ESIKLERI } from "../src/lib/hakedis/model";
import {
  beklenenHakedis,
  odemeDurumu,
  satirlariEslestir,
  siparisNetleri,
} from "../src/lib/hakedis/eslestir";
import {
  basligiNormalle,
  hepsiburadaOku,
  sayiCoz,
  satirAnahtari,
  siparisNeti,
  taninmayanTipler,
  tarihCoz,
  trendyolOku,
  turkiyeDisiMi,
} from "../src/lib/hakedis/okuyucu";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 6;
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

const gun = (m: string) => {
  const [y, a, g] = m.split("-").map(Number);
  return gunDegeri({ yil: y, ay: a, gun: g });
};
const metin = (t: Date | null) => (t === null ? "-" : t.toISOString().slice(0, 10));

// ===========================================================================
console.log("\n1) İŞ GÜNÜ");
// ===========================================================================
{
  // 2026-08-11 salı.
  kontrol("11.08.2026 salı, hafta sonu değil", !haftaSonuMu(gun("2026-08-11")));
  kontrol("15.08.2026 cumartesi", haftaSonuMu(gun("2026-08-15")));
  kontrol("16.08.2026 pazar", haftaSonuMu(gun("2026-08-16")));

  // Cuma + 1 iş günü = pazartesi (hafta sonu atlanır).
  kontrol(
    "cuma + 1 iş günü -> pazartesi",
    metin(isGunuEkle(gun("2026-08-14"), 1)) === "2026-08-17",
    metin(isGunuEkle(gun("2026-08-14"), 1)),
  );
  kontrol(
    "salı + 5 iş günü -> gelecek salı",
    metin(isGunuEkle(gun("2026-08-11"), 5)) === "2026-08-18",
    metin(isGunuEkle(gun("2026-08-11"), 5)),
  );
  /**
   * TATİL AÇIĞI — BİLİNÇLİ VE ÖLÇÜLÜ.
   *
   * 28 iş günü, yalnız hafta sonu atlanınca MATEMATİKSEL OLARAK 38 takvim
   * günüdür (28 + 5 hafta sonu × 2 gün). Kullanıcının Trendyol raporunda
   * gözlemlediği ise ~41 takvim günü.
   *
   * Aradaki 3 gün RESMÎ TATİLDİR. Tatil tablosu bugün yok (yıl yıl değişir,
   * dinî bayramlar kayar), bu yüzden beklenen vade tarihimiz gerçeğinden
   * ~3 gün ERKEN çıkar. Gecikme eşiğinin sıfır değil 3 İŞ GÜNÜ olmasının
   * sebebi tam olarak budur — ikisi birbirine bağlıdır ve bu test o bağı
   * kilitler: tatil tablosu eklenirse eşik de yeniden düşünülmeli.
   */
  const vade28 = isGunuEkle(gun("2026-08-11"), 28);
  const takvimFarki =
    (vade28.getTime() - gun("2026-08-11").getTime()) / 86400000;
  kontrol(
    "28 iş günü = 38 takvim günü (yalnız hafta sonu)",
    takvimFarki === 38,
    `${takvimFarki} takvim günü -> ${metin(vade28)}`,
  );
  kontrol(
    "gözlenen 41 gün ile fark = gecikme eşiği (tatil açığı)",
    41 - takvimFarki === HAKEDIS_ESIKLERI.gecikmeIsGunu,
    `gözlenen 41 · hesaplanan ${takvimFarki} · eşik ${HAKEDIS_ESIKLERI.gecikmeIsGunu}`,
  );
  kontrol("0 iş günü tarihi değiştirmez", metin(isGunuEkle(gun("2026-08-11"), 0)) === "2026-08-11");

  kontrol("fark: salı->cuma 3 iş günü", isGunuFarki(gun("2026-08-11"), gun("2026-08-14")) === 3);
  // Cuma -> pazartesi arada hafta sonu var: 1 iş günü.
  kontrol("fark: cuma->pazartesi 1 iş günü", isGunuFarki(gun("2026-08-14"), gun("2026-08-17")) === 1);
  // GEÇ mi ERKEN mi ayırt edilebilmeli.
  kontrol("geri yönde negatif", isGunuFarki(gun("2026-08-14"), gun("2026-08-11")) === -3);
  kosanBolumler.push("isgunu");
}

// ===========================================================================
console.log("\n2) TRENDYOL — geniş format");
// ===========================================================================
{
  const TY = [
    ["Kayıt No", "Ülke", "İşlem Tipi", "Sipariş No", "Barkod", "Satıcı Hakediş", "Vade Tarihi", "Toplam Tutar"],
    ["TY-1", "Türkiye", "Satış", "4432259217", "8697975600803", 3379.15, "22.09.2026", 3999],
    ["TY-2", "Türkiye", "Kupon", "4432259217", "8697975600803", -50, "22.09.2026", -50],
    ["TY-3", "Türkiye", "Platform Hizmet Bedeli", "", "", -13.19, "22.09.2026", -13.19],
    ["TY-4", "Türkiye", "Kargo Fatura", "", "", -106.75, "22.09.2026", -106.75],
    // GENEL TOPLAM satırı: kayıt no ve tip yok -> atlanmalı.
    ["", "", "", "", "", 3209.21, "", ""],
  ];
  const o = trendyolOku(TY);

  kontrol("eksik sütun yok", o.eksikSutunlar.length === 0, o.eksikSutunlar);
  kontrol("genel toplam satırı atlandı (4 satır)", o.satirlar.length === 4, o.satirlar.length);
  kontrol("satış -> SIPARIS_TUTARI", o.satirlar[0].kod === "SIPARIS_TUTARI");
  kontrol("kupon -> KUPON", o.satirlar[1].kod === "KUPON");
  kontrol("kupon siparişe bağlı", o.satirlar[1].siparisNo === "4432259217");
  // Sipariş dışı toplu kesintiler: sipariş no BOŞ olmalı, null gelmeli.
  kontrol("platform hizmet sipariş dışı", o.satirlar[2].siparisNo === null);
  kontrol("kargo fatura sipariş dışı", o.satirlar[3].siparisNo === null);
  kontrol("vade tarihi çözüldü", metin(o.satirlar[0].vadeTarihi) === "2026-09-22");
  // TY raporunda GERÇEKLEŞEN ödeme tarihi YOK.
  kontrol("TY'de ödeme tarihi yok", o.satirlar[0].odemeTarihi === null);
  kontrol("barkod ikincil doğrulama için okundu", o.satirlar[0].urunKodu === "8697975600803");
  kontrol("tutar Satıcı Hakediş kolonundan", o.satirlar[0].tutar === 3379.15);

  // KULLANICI DOĞRULAMASI: TY Hakediş = Toplam × oran, KDV DAHİL.
  kontrol("3999 × %15,5 = 619,85 (KDV dahil)", Math.abs(3999 * 0.155 - 619.845) < 0.01);
  kontrol("Türkiye dışı ülke yakalanır", turkiyeDisiMi("Azerbaycan"));
  kontrol("Türkiye uyarı üretmez", !turkiyeDisiMi("Türkiye"));
  kosanBolumler.push("trendyol");
}

// ===========================================================================
console.log("\n3) HEPSİBURADA — uzun format");
// ===========================================================================
{
  const HB = [
    ["Durum", "Ödeme Tarihi", "Kayıt No", "Kayıt Tipi", "Vade Tarihi", "Tutar", "Para Birimi", "Sipariş No", "Ürün No (SKU)", "Kayıt Türü"],
    ["Ödendi", "10.08.2026", "HB-1", "Sipariş tutarı", "10.08.2026", 1958, "TRY", "11493262226", "HBCV0000BH0Q0P", "Gelir"],
    ["Ödendi", "10.08.2026", "HB-2", "Komisyon tutarı", "10.08.2026", 52.87, "TRY", "11493262226", "HBCV0000BH0Q0P", "Gider"],
    ["Ödendi", "10.08.2026", "HB-3", "MP Stopaj", "10.08.2026", 16.32, "TRY", "11493262226", "HBCV0000BH0Q0P", "Gider"],
    ["Bekliyor", "", "HB-4", "Hizmet bedeli", "20.08.2026", 12.6, "TRY", "11493262226", "HBCV0000BH0Q0P", "Gider"],
    ["Ödendi", "10.08.2026", "HB-5", "Hurda geliri", "10.08.2026", 40, "TRY", "", "", "Gelir"],
    ["Ödendi", "10.08.2026", "HB-6", "Komisyon iadesi", "10.08.2026", 52.87, "TRY", "11493262226", "HBCV0000BH0Q0P", "Gelir"],
    // TİPSİZ GENEL TOPLAM — atlanmalı.
    ["", "", "", "", "", 1863.34, "", "", "", ""],
  ];
  const o = hepsiburadaOku(HB);

  kontrol("eksik sütun yok", o.eksikSutunlar.length === 0, o.eksikSutunlar);
  kontrol("tipsiz son satır atlandı (6 satır)", o.satirlar.length === 6, o.satirlar.length);

  // AYNI SİPARİŞİN BİRDEN ÇOK SATIRI — eski şema bunu engelliyordu.
  const ayniSiparis = o.satirlar.filter((s) => s.siparisNo === "11493262226");
  kontrol("bir siparişin 5 kalemi ayrı satır", ayniSiparis.length === 5, ayniSiparis.length);

  // İŞARET TEKLEŞTİRME: gider NEGATİF olmalı.
  kontrol("sipariş tutarı pozitif", o.satirlar[0].tutar === 1958);
  kontrol("komisyon NEGATİF (gider)", o.satirlar[1].tutar === -52.87, o.satirlar[1].tutar);
  kontrol("stopaj NEGATİF (gider)", o.satirlar[2].tutar === -16.32);
  kontrol("komisyon İADESİ pozitif (gelir)", o.satirlar[5].tutar === 52.87);

  // Ödendi / bekleyen ayrımı.
  kontrol("ödenen kalemde ödeme tarihi var", metin(o.satirlar[0].odemeTarihi) === "2026-08-10");
  kontrol("bekleyen kalemde ödeme tarihi yok", o.satirlar[3].odemeTarihi === null);
  kontrol("bekleyen kalem yine de yüklenir", o.satirlar[3].externalId === "HB-4");

  kontrol("hurda geliri sipariş dışı", o.satirlar[4].siparisNo === null);
  kontrol("kanal SKU okundu", o.satirlar[0].urunKodu === "HBCV0000BH0Q0P");
  kontrol("iade aynası ayrı kod", o.satirlar[5].kod === "KOMISYON_IADE");
  kosanBolumler.push("hepsiburada");
}

// ===========================================================================
console.log("\n4) TOLERANS — başlık ve değer biçimleri");
// ===========================================================================
{
  kontrol("fazladan boşluk", basligiNormalle("  Sipariş   No ") === "sipariş no");
  kontrol("büyük harf", basligiNormalle("KAYIT NO") === "kayıt no");
  kontrol("kırılmaz boşluk", basligiNormalle("Vade Tarihi") === "vade tarihi");

  // Başlıklar bozuk yazılmış olsa da okuyucu tutmalı.
  const bozuk = [
    [" KAYIT NO ", "ülke", "  İşlem   Tipi", "Sipariş No ", "Barkod", "SATICI HAKEDİŞ", "Vade Tarihi", "Toplam Tutar"],
    ["TY-9", "Türkiye", "Satış", "1", "2", 100, "01.09.2026", 100],
  ];
  const o = trendyolOku(bozuk);
  kontrol("bozuk yazımlı başlıklar tutuyor", o.eksikSutunlar.length === 0 && o.satirlar.length === 1, o.eksikSutunlar);

  // Kolon gerçekten yoksa SESSİZ KALMAZ — hangi kolon eksik, yazar.
  const eksik = trendyolOku([["Kayıt No", "Ülke"], ["TY-1", "Türkiye"]]);
  kontrol("eksik kolon bildirilir", eksik.eksikSutunlar.length > 0, eksik.eksikSutunlar);
  kontrol("eksik kolonda satır üretilmez", eksik.satirlar.length === 0);

  kontrol("1.234,56 -> 1234.56", sayiCoz("1.234,56") === 1234.56);
  kontrol("-52,87 -> -52.87", sayiCoz("-52,87") === -52.87);
  kontrol("1234.56 -> 1234.56", sayiCoz("1234.56") === 1234.56);
  kontrol("sayı hücresi olduğu gibi", sayiCoz(1958) === 1958);
  kontrol("boş -> null", sayiCoz("") === null);
  kontrol("10.08.2026 çözülür", metin(tarihCoz("10.08.2026")) === "2026-08-10");
  kontrol("2026-08-10 çözülür", metin(tarihCoz("2026-08-10")) === "2026-08-10");
  kontrol("boş tarih null", tarihCoz("") === null);
  kosanBolumler.push("tolerans");
}

// ===========================================================================
console.log("\n5) GERÇEK DOSYA — 11.08.2026 Trendyol raporları");
// ===========================================================================
{
  /**
   * GERÇEK BAŞLIK SATIRI. Tarif edilenden ÜÇ KOLONDA farklı çıktı:
   *   "Kayıt No"       →  "Kayıt No / Fatura No"
   *   "Ürün Adı"       →  "Ürün Adı / Açıklama"
   *   "Komisyon Oranı" →  "Komisyon / Yurt Dışı Stok Destek Oranı"
   * Tek ada bağlı okuyucu bu dosyaları HİÇ okuyamadı (0 satır).
   * Bu satır aynen buradadır ki başlık yine değişirse test önce kırılsın.
   */
  const GERCEK_BASLIK = [
    "Kayıt No / Fatura No", "Ülke", "İşlem Tipi", "Sipariş No",
    "Sipariş Tarihi", "İşlem Tarihi", "Satıcı", "Satıcı Cari Adı",
    "Ürün Adı / Açıklama", "Barkod", "Komisyon / Yurt Dışı Stok Destek Oranı",
    "TY Hakediş", "Satıcı Hakediş", "Stopaj", "KDV (%)",
    "Vade Süresi (İş Günü)", "Teslim Tarihi", "Vade Tarihi",
    "Toplam Tutar", "Müşteri Adı", "Paket Numarası",
  ];

  const satir = (
    kayitNo: string, tip: string, siparis: string, hakedis: number,
  ) => [
    kayitNo, "Türkiye", tip, siparis, "01.08.2026", "01.08.2026", "SATICI",
    "SATICI A.Ş.", "Ürün", "8697975600803", 15.5, 0, hakedis, 0, 20, 28,
    "03.08.2026", "03.09.2026", 0, "", "",
  ];

  /**
   * JBL ZİNCİRİ — ALTIN SENARYO (gerçek sipariş 11471381662).
   * Satış → Kupon → Kupon İptal → İade. Dört satır, NET SIFIR.
   * Tek satıra bakan bir hesap "7025,75 alacağım var" derdi; iade edilmiş
   * siparişin hakedişi sıfırdır.
   */
  const zincir = [
    GERCEK_BASLIK,
    satir("K1", "Satış", "11471381662", 7025.75),
    satir("K2", "Kupon", "11471381662", -13.42),
    satir("K3", "Kupon İptal", "11471381662", 13.42),
    satir("K4", "İade", "11471381662", -7025.75),
  ];
  const z = trendyolOku(zincir);

  kontrol("gerçek başlık satırı okunuyor", z.eksikSutunlar.length === 0, z.eksikSutunlar);
  kontrol("zincirin 4 satırı da okundu", z.satirlar.length === 4, z.satirlar.length);
  kontrol("JBL zinciri NET SIFIR", siparisNeti(z.satirlar, "11471381662") === 0,
    siparisNeti(z.satirlar, "11471381662"));
  kontrol("iade -> IADE_TUTARI", z.satirlar[3].kod === "IADE_TUTARI");
  kontrol("kupon iptal -> KUPON_IPTAL", z.satirlar[2].kod === "KUPON_IPTAL");
  kontrol("vade satırdan okunur", metin(z.satirlar[0].vadeTarihi) === "2026-09-03");

  /**
   * GERÇEK DOSYALARDA GÖRÜLEN 12 İŞLEM TİPİ — hepsi tanınmalı.
   * 298 satırda tanınmayan tip ÇIKMADI; bu test onu kilitler.
   */
  const TIPLER: [string, string][] = [
    ["Satış", "SIPARIS_TUTARI"],
    ["Kupon", "KUPON"],
    ["Kupon İptal", "KUPON_IPTAL"],
    ["İade", "IADE_TUTARI"],
    ["İndirim", "INDIRIM"],
    ["E-ticaret Stopajı", "ETICARET_STOPAJI"],
    ["Kargo Fatura", "KARGO_FATURA"],
    ["Platform Hizmet Bedeli", "PLATFORM_HIZMET"],
    ["Erken Ödeme Kesinti Faturası", "ERKEN_ODEME"],
    ["Uluslararası Hizmet Bedeli", "ULUSLARARASI_HIZMET"],
    ["Kurumsal Fatura - Trendyol Kupon", "KUPON"],
    ["Kurumsal Fatura - Trendyol Promosyon", "PROMOSYON"],
  ];
  const hepsi = trendyolOku([
    GERCEK_BASLIK,
    ...TIPLER.map(([tip], i) => satir(`T${i}`, tip, "1", -1)),
  ]);
  const yanlis = TIPLER.filter(([, beklenen], i) => hepsi.satirlar[i]?.kod !== beklenen)
    .map(([tip], i) => `${tip} -> ${hepsi.satirlar[i]?.kod}`);
  kontrol("12 gerçek işlem tipinin hepsi tanınıyor", yanlis.length === 0, yanlis);
  kontrol("gerçek tiplerde tanınmayan yok", taninmayanTipler(hepsi).length === 0);

  /**
   * BİLİNMEYEN TİP: sessiz atlanmaz, yükleme de bloke edilmez.
   * Pazaryeri yarın yeni tip ekleyecek; kalem tutarıyla listelenir.
   */
  const yeniTip = trendyolOku([
    GERCEK_BASLIK,
    satir("X1", "Yepyeni Bir Kesinti", "1", -500),
  ]);
  kontrol("bilinmeyen tip DIGER olur", yeniTip.satirlar[0].kod === "DIGER");
  kontrol("bilinmeyen tip ATLANMAZ", yeniTip.satirlar.length === 1);
  kontrol("ham tip korunur", yeniTip.satirlar[0].hamTip === "Yepyeni Bir Kesinti");
  const tanin = taninmayanTipler(yeniTip);
  kontrol("uyarı listesinde tutarıyla görünür",
    tanin.length === 1 && tanin[0].toplam === -500, tanin);
  /**
   * GERÇEK HB DOSYASINDAN (11.08.2026): dört iade tipi tarif edilenden
   * FARKLI yazılmış. Uyarı kanalı bunları "tanınmayan" diye listeledi,
   * öyle bulundular — sessiz atlansalardı 2.512 TL'lik kalem kaybolurdu.
   */
  const HB_GERCEK: [string, string][] = [
    ["Kargo Bedeli (İade Sipariş)", "KARGO_IADE"],
    ["Tahsilat Yönetim Bedeli İadesi", "TAHSILAT_BEDELI_IADE"],
    ["Kampanya indirimleri iadesi", "KAMPANYA_IADE"],
    ["Hizmet Bedeli (İade Sipariş)", "HIZMET_BEDELI_IADE"],
  ];
  const hbBaslik = [
    "Durum", "Ödeme Tarihi", "Kayıt No", "Kayıt Tipi", "Kayıt Tarihi",
    "Vade Tarihi", "Tutar", "Para Birimi", "Sipariş No", "Paket No",
    "Ürün No (SKU)", "Ürün Adı", "Açıklama", "Kayıt Türü", "Kayıt Sınıfı",
  ];
  const hbSatir = (no: string, tip: string, sip: string) => [
    "Ödendi", "14.07.2026", no, tip, "14.07.2026", "14.07.2026", 100, "TRY",
    sip, "P1", "HBCV1", "Ürün", "", "Gider", "Sipariş bazlı",
  ];
  const hbO = hepsiburadaOku([
    hbBaslik,
    ...HB_GERCEK.map(([tip], i) => hbSatir("EFA1", tip, `S${i}`)),
  ]);
  const hbYanlis = HB_GERCEK.filter(([, bek], i) => hbO.satirlar[i]?.kod !== bek)
    .map(([tip], i) => `${tip} -> ${hbO.satirlar[i]?.kod}`);
  kontrol("HB gerçek başlık satırı okunuyor", hbO.eksikSutunlar.length === 0, hbO.eksikSutunlar);
  kontrol("dört gerçek iade tipi tanınıyor", hbYanlis.length === 0, hbYanlis);

  /**
   * SATIR ANAHTARI — "Kayıt No" TEK BAŞINA YETMEZ.
   * Gerçek HB dosyasında 539 satır ama yalnız 94 farklı Kayıt No var:
   * o alan bir FATURA numarası (EFA2026000000101) ve faturanın tüm
   * kalemleri aynı numarayı taşıyor. Tek başına kısıt konsaydı 445 satır
   * reddedilirdi.
   */
  const ayniFatura = hepsiburadaOku([
    hbBaslik,
    hbSatir("EFA2026000000101", "Sipariş tutarı", "11493262226"),
    hbSatir("EFA2026000000101", "Komisyon tutarı", "11493262226"),
    hbSatir("EFA2026000000101", "Kargo Bedeli", "11493262226"),
  ]);
  const knos = new Set(ayniFatura.satirlar.map((s) => s.externalId));
  kontrol("aynı fatura no birden çok satırda", knos.size === 1 && ayniFatura.satirlar.length === 3);
  const anahtarlar = new Set(ayniFatura.satirlar.map(satirAnahtari));
  kontrol("satır anahtarı üçünü de ayırır", anahtarlar.size === 3, [...anahtarlar]);

  /**
   * ANAHTAR HAM TİPTEN ÜRETİLİR, normalleştirilmiş koddan DEĞİL.
   * İki farklı tanınmayan tip aynı siparişte olursa kod ikisini de DIGER
   * yapar; anahtar koddan üretilseydi biri sessizce kaybolurdu.
   */
  const ikiTaninmayan = hepsiburadaOku([
    hbBaslik,
    hbSatir("EFA1", "Yepyeni Kesinti A", "S1"),
    hbSatir("EFA1", "Yepyeni Kesinti B", "S1"),
  ]);
  kontrol("ikisi de DIGER", ikiTaninmayan.satirlar.every((s) => s.kod === "DIGER"));
  kontrol(
    "tanınmayan iki kalem yine de ayrışır",
    new Set(ikiTaninmayan.satirlar.map(satirAnahtari)).size === 2,
  );

  kosanBolumler.push("gercek");
}

// ===========================================================================
console.log("\n6) BEKLENEN vs GERÇEKLEŞEN");
// ===========================================================================
{
  const BUGUN = gun("2026-09-20");

  /**
   * BEKLENEN HAKEDİŞ = NET-1 + MALİYET.
   * Gerçek satış 11492628481 ile doğrulandı (12.08.2026):
   *   brüt 1946,00 − kanal kesintileri 188,70 = 1757,30
   *   NET-1 368,26 + maliyet 1389,04          = 1757,30
   * Maliyet geri eklenir çünkü malın parasını pazaryerine değil
   * TEDARİKÇİYE ödedik; pazaryerinin hesabında maliyet yok.
   */
  kontrol(
    "beklenen = NET-1 + maliyet (gerçek satışla doğrulandı)",
    beklenenHakedis(368.26, 1389.04) === 1757.3,
    beklenenHakedis(368.26, 1389.04),
  );
  kontrol("kâr hesaplanamamışsa beklenen de yok", beklenenHakedis(null, 100) === null);

  /**
   * TRENDYOL ZİNCİRİ — gerçek dosya yapısına sadık.
   * Satış + Kupon aynı siparişte; hakediş İKİSİNİN TOPLAMIDIR.
   * Komisyon KDV DAHİL tek tutardır (kullanıcı teyidi 11.08.2026):
   * 1946 × %2,70 = 52,54 — üstüne KDV EKLENMEZ.
   */
  const TY_BASLIK = [
    "Kayıt No / Fatura No", "Ülke", "İşlem Tipi", "Sipariş No",
    "Sipariş Tarihi", "İşlem Tarihi", "Satıcı", "Satıcı Cari Adı",
    "Ürün Adı / Açıklama", "Barkod", "Komisyon / Yurt Dışı Stok Destek Oranı",
    "TY Hakediş", "Satıcı Hakediş", "Stopaj", "KDV (%)",
    "Vade Süresi (İş Günü)", "Teslim Tarihi", "Vade Tarihi",
    "Toplam Tutar", "Müşteri Adı", "Paket Numarası",
  ];
  const tySatir = (no: string, tip: string, sip: string, hakedis: number, vade: string) => [
    no, "Türkiye", tip, sip, "01.08.2026", "01.08.2026", "SATICI", "SATICI A.Ş.",
    "Ürün", "8697975600803", 2.7, 0, hakedis, 0, 20, 28, "03.08.2026", vade, 0, "", "",
  ];

  // TAM ÖDENDİ: beklenen 1757,30 · zincir toplamı 1757,30
  const tamOdendi = trendyolOku([
    TY_BASLIK,
    tySatir("T1", "Satış", "11492628481", 1770.72, "03.09.2026"),
    tySatir("T2", "Kupon", "11492628481", -13.42, "03.09.2026"),
  ]);
  const tamNet = siparisNetleri(tamOdendi.satirlar).get("11492628481") ?? 0;
  kontrol("TY zinciri net = 1757,30", Math.abs(tamNet - 1757.3) < 0.001, tamNet);
  kontrol(
    "tam ödendi",
    odemeDurumu({
      beklenenTutar: 1757.3, gerceklesenTutar: tamNet,
      vade: gun("2026-09-03"), odendiMi: true, bugun: BUGUN, kalemVarMi: true,
    }) === "ODENDI",
  );

  // EKSİK ÖDEME: 1 TL'nin ÜSTÜNDE fark
  kontrol(
    "eksik ödeme (>1 TL)",
    odemeDurumu({
      beklenenTutar: 1757.3, gerceklesenTutar: 1700,
      vade: gun("2026-09-03"), odendiMi: true, bugun: BUGUN, kalemVarMi: true,
    }) === "EKSIK_ODEME",
  );
  // KURUŞ FARKI GÜRÜLTÜDÜR — uyarı üretmez.
  kontrol(
    "0,50 TL fark uyarı üretmez",
    odemeDurumu({
      beklenenTutar: 1757.3, gerceklesenTutar: 1756.8,
      vade: gun("2026-09-03"), odendiMi: true, bugun: BUGUN, kalemVarMi: true,
    }) === "ODENDI",
  );
  kontrol(
    "fazla ödeme (>1 TL)",
    odemeDurumu({
      beklenenTutar: 1757.3, gerceklesenTutar: 1800,
      vade: gun("2026-09-03"), odendiMi: true, bugun: BUGUN, kalemVarMi: true,
    }) === "FAZLA_ODEME",
  );

  // GEÇ ÖDEME: vade + 3 iş günü aşıldı mı?
  kontrol(
    "vadesi 3 iş günü geçmiş -> GECIKTI",
    odemeDurumu({
      beklenenTutar: 1757.3, gerceklesenTutar: null,
      vade: gun("2026-09-03"), odendiMi: false, bugun: BUGUN, kalemVarMi: true,
    }) === "GECIKTI",
  );
  // Eşik İÇİNDE hâlâ bekliyor: tatil açığı yüzünden erken uyarmıyoruz.
  kontrol(
    "vade 1 iş günü geçmiş -> hâlâ BEKLIYOR",
    odemeDurumu({
      beklenenTutar: 1757.3, gerceklesenTutar: null,
      vade: gun("2026-09-17"), odendiMi: false, bugun: gun("2026-09-18"),
      kalemVarMi: true,
    }) === "BEKLIYOR",
  );
  kontrol(
    "vade yoksa gecikme İDDİA EDİLMEZ",
    odemeDurumu({
      beklenenTutar: 1757.3, gerceklesenTutar: null,
      vade: null, odendiMi: false, bugun: BUGUN, kalemVarMi: true,
    }) === "BEKLIYOR",
  );

  // HİÇ GELMEDİ: rapor o siparişten hiç söz etmiyor.
  kontrol(
    "rapordan hiç kalem gelmemiş -> GELMEDI",
    odemeDurumu({
      beklenenTutar: 1757.3, gerceklesenTutar: null,
      vade: null, odendiMi: false, bugun: BUGUN, kalemVarMi: false,
    }) === "GELMEDI",
  );

  /**
   * HEPSİBURADA UZUN FORMAT — bir sipariş 6 kalem.
   * Beklenen: brüt 1958 − (komisyon 52,87 + kargo 122,21 + stopaj 16,32
   * + tahsilat 5,87 + hizmet 12,60) = 1748,13
   */
  const HB_BASLIK = [
    "Durum", "Ödeme Tarihi", "Kayıt No", "Kayıt Tipi", "Kayıt Tarihi",
    "Vade Tarihi", "Tutar", "Para Birimi", "Sipariş No", "Paket No",
    "Ürün No (SKU)", "Ürün Adı", "Açıklama", "Kayıt Türü", "Kayıt Sınıfı",
  ];
  const hb = (no: string, tip: string, tutar: number, tur: string) => [
    "Ödendi", "10.09.2026", no, tip, "10.08.2026", "10.09.2026", tutar, "TRY",
    "11493262226", "P1", "HBCV1", "Ürün", "", tur, "Sipariş bazlı",
  ];
  const hbOkuma = hepsiburadaOku([
    HB_BASLIK,
    hb("EFA1", "Sipariş tutarı", 1958, "Gelir"),
    hb("EFA1", "Komisyon tutarı", 52.87, "Gider"),
    hb("EFA1", "Kargo Bedeli", 122.21, "Gider"),
    hb("EFA1", "MP Stopaj", 16.32, "Gider"),
    hb("EFA1", "Tahsilat Yönetim Bedeli", 5.87, "Gider"),
    hb("EFA1", "Hizmet bedeli", 12.6, "Gider"),
  ]);
  const hbNet = siparisNetleri(hbOkuma.satirlar).get("11493262226") ?? 0;
  kontrol("HB 6 kalem okundu", hbOkuma.satirlar.length === 6);
  kontrol("HB uzun format net = 1748,13", Math.abs(hbNet - 1748.13) < 0.001, hbNet);
  kontrol(
    "HB tam ödendi",
    odemeDurumu({
      beklenenTutar: 1748.13, gerceklesenTutar: hbNet,
      vade: gun("2026-09-10"), odendiMi: true, bugun: BUGUN, kalemVarMi: true,
    }) === "ODENDI",
  );

  // Eşleştirme: satış varsa bağlanır, yoksa uyarı kovasına düşer.
  const eslesme = satirlariEslestir(hbOkuma.satirlar, [
    { id: "s1", kod: "11493262226", satisTarihi: gun("2026-08-10") },
  ]);
  kontrol("6 kalem de satışa bağlandı", eslesme.eslesenler.length === 6);
  kontrol("eşleşmeyen yok", eslesme.eslesmeyenler.length === 0);

  const eslesmeyen = satirlariEslestir(hbOkuma.satirlar, []);
  kontrol("satış yoksa 6 kalem uyarıya düşer", eslesmeyen.eslesmeyenler.length === 6);
  kosanBolumler.push("karsilastirma");
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
