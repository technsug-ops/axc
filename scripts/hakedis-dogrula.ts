import { readFileSync } from "node:fs";
import { eslemeOzeti, yenidenEsle } from "../src/lib/hakedis/yeniden-esle";
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
import {
  gecmisOdemeAnahtari,
  gelecekOdemeAnahtari,
  gelecekOdemeBrutMu,
  gelecekOdemeleriGrupla,
  HAKEDIS_ESIKLERI,
  kalemTuruDokumu,
  odemeleriSuz,
  odemeToplamlari,
  SIPARIS_DISI_KODLAR,
  siparisDokumu,
  sonrakiOdemeGunu,
  type OdemeKalemi,
} from "../src/lib/hakedis/model";
import {
  beklenenHakedis,
  odemeDurumu,
  satirlariEslestir,
  siparisNetleri,
} from "../src/lib/hakedis/eslestir";
import {
  odemeEmriGunleriniCoz,
  TY_API_SIPARIS_DISI_TIPLERI,
  tyApiSatiriniOku,
  tyApiSatirlariniOku,
} from "../src/lib/hakedis/ty-api-oku";
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
  n11TarihCoz,
  n11TransferOku,
} from "../src/lib/hakedis/okuyucu";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 10;
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

// ===========================================================================
console.log("\n3b) N11 — transfer listesi (Excel'e Aktar, K233)");
// ===========================================================================
{
  /**
   * Ölçülen biçim (22.09.2026, `settlementHistories (5).xls`): başlıklar
   * birebir, tarih "27-Ağu-2026", tutar "5056.56", durum "Başarılı". Rakamlar
   * SENTETİK — gerçek transfer tutarları depoya girmez; IBAN da sahte ve
   * hiçbir alana sızmadığı AYRICA sınanır.
   */
  const N11 = [
    ["Transfer Tarihi", "Ödeme Türü", "İşlem Tarihi", "Transfer Durumu", "Transfer Tutarı", "Banka", "IBAN"],
    ["27-Ağu-2026", "Hakediş Ödemesi", "--", "Başarılı", "1234.56", "T.İŞ BANKASI", "TR000000000000000000000001"],
    ["10-Eyl-2026", "Hakediş Ödemesi", "--", "Başarılı", "2.840,42", "T.İŞ BANKASI", "TR000000000000000000000001"],
    ["17-Eyl-2026", "Hakediş Ödemesi", "--", "Beklemede", "99.9", "T.İŞ BANKASI", "TR000000000000000000000001"],
    ["17-Eyl-2026", "İade Kesintisi", "--", "Başarılı", "-5", "T.İŞ BANKASI", "TR000000000000000000000001"],
    ["", "", "", "", "", "", ""],
  ];
  const o = n11TransferOku(N11);
  kontrol("kanal N11", o.kanal === "N11");
  kontrol("eksik sütun yok", o.eksikSutunlar.length === 0, o.eksikSutunlar);
  kontrol("boş satır atlandı (4 satır)", o.satirlar.length === 4, o.satirlar.length);
  kontrol("Türkçe ay kısaltması çözüldü: 27-Ağu-2026", metin(o.satirlar[0].vadeTarihi) === "2026-08-27", metin(o.satirlar[0].vadeTarihi));
  kontrol("  ...Eyl → 09", metin(o.satirlar[1].vadeTarihi) === "2026-09-10");
  kontrol("n11TarihCoz tanımadığı ayda null (uydurmaz)", n11TarihCoz("27-Xyz-2026") === null);
  kontrol("n11TarihCoz ortak biçime düşer (10.08.2026)", metin(n11TarihCoz("10.08.2026")) === "2026-08-10");
  kontrol("nokta ondalık tutar: 1234.56", o.satirlar[0].tutar === 1234.56, o.satirlar[0].tutar);
  kontrol("TR biçimi tutar: 2.840,42", o.satirlar[1].tutar === 2840.42, o.satirlar[1].tutar);
  kontrol("Hakediş Ödemesi → HAKEDIS_TRANSFERI (sipariş dışı, sipariş no yok)", o.satirlar[0].kod === "HAKEDIS_TRANSFERI" && o.satirlar[0].siparisNo === null);
  kontrol("HAKEDIS_TRANSFERI sipariş dışı kodlarda", SIPARIS_DISI_KODLAR.includes("HAKEDIS_TRANSFERI"));
  kontrol("Başarılı → ödeme tarihi = transfer tarihi (GERÇEKLEŞMİŞ)", metin(o.satirlar[0].odemeTarihi) === "2026-08-27");
  kontrol("Beklemede → ödeme tarihi BOŞ (ölçülmeyen durum ödendi sayılmaz)", o.satirlar[2].odemeTarihi === null);
  kontrol("tanınmayan ödeme türü → DIGER (kalem yazılır, uyarıda görünür)", o.satirlar[3].kod === "DIGER" && o.satirlar[3].hamTip === "İade Kesintisi");
  kontrol("kimlik tarih|tutar (idempotent)", o.satirlar[0].externalId === "2026-08-27|1234.56", o.satirlar[0].externalId);
  /** ⛔ BANKA HESABI DEFTERE GİRMEZ — hiçbir alan IBAN ya da banka adı taşımaz. */
  const dokum = JSON.stringify(o.satirlar);
  kontrol("IBAN hiçbir alana sızmadı", !dokum.includes("TR0000"));
  kontrol("banka adı hiçbir alana sızmadı", !dokum.includes("BANKASI"));
  kontrol("eksik sütun dosyada söylenir", n11TransferOku([["Tarih", "Tutar"]]).eksikSutunlar.length > 0);
}
kosanBolumler.push("n11");
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
console.log("\nEŞİK BEYANI SABİTTEN GELİYOR MU");
// ===========================================================================
{
  /**
   * ⚠ 18.08.2026 — mimar şartı: "kuruş farkları ayrı sınıf, eşik BEYANLI."
   *
   * Beyan zaten vardı; kusur daha incedir: sayı sözlüğe ELLE yazılmıştı
   * ("Fark 1 ₺'yi aşarsa"). `HAKEDIS_ESIKLERI.tutarFarki` değişse metin
   * eski sayıyı söylemeye devam ederdi — beyan DOĞRU GÖRÜNÜR, YANLIŞ olur.
   * Bu, yakalanması en zor hata türü: ekranda bir cümle var ve güven veriyor.
   *
   * DEĞER TESTİ GÖREMEZ: eşiğin kendisi doğru çalışıyordu. Sınanan şey
   * metnin sabite BAĞLI olması.
   */
  const sozluk = JSON.parse(readFileSync("messages/tr.json", "utf8"));
  const not = sozluk.Hakedis?.karsilastirmaNotu ?? "";

  kontrol("karşılaştırma notu eşiği PARAMETREYLE söylüyor", not.includes("{tutar}"));
  kontrol(
    "  ...ve elle yazılmış sayı KALMADI",
    !/Fark \d/.test(not),
    not.slice(0, 80),
  );

  const ekran = readFileSync("src/app/hakedis/page.tsx", "utf8");
  kontrol(
    "ekran sabiti METNE geçiriyor",
    /karsilastirmaNotu"?,\s*\{[\s\S]{0,120}?HAKEDIS_ESIKLERI\.tutarFarki/.test(ekran),
  );
}

// ===========================================================================
console.log("\nYENİDEN EŞLEŞTİRME — BAĞSIZ KALEMLER");
// ===========================================================================
{
  /**
   * ⚠ Bağ yalnız YÜKLEME anında kuruluyordu ve "önce rapor sonra satış"
   * sırası kalemi SONSUZA DEK bağsız bırakıyordu. Üç ölçüm, üçü de sıfır:
   * 13.08 651/0 · 15.08 110/0 · 18.08 651/0.
   *
   * Kural saf fonksiyonda (`lib/hakedis/yeniden-esle.ts`) çünkü betiğe
   * gömülseydi eşleşme sistemde İKİ yerde yaşardı.
   */
  const kalem = (
    id: string,
    siparisNo: string,
    channelAccountId = "h1",
  ) => ({ id, siparisNo, channelAccountId });
  const satis = (id: string, kod: string, channelAccountId = "h1") => ({
    id,
    kod,
    channelAccountId,
  });

  // --- düz eşleşme ---
  {
    const k = yenidenEsle([kalem("k1", "11471381662")], [satis("s1", "11471381662")]);
    kontrol("kod tutuyorsa BAĞLANIR", k[0].olur === true);
    kontrol("  ...doğru satışa", k[0].olur && k[0].saleId === "s1");
  }

  // --- karşılık yok ---
  {
    const k = yenidenEsle([kalem("k1", "99999")], [satis("s1", "11471381662")]);
    kontrol("karşılık yoksa BAĞLANMAZ", k[0].olur === false);
    kontrol(
      "  ...sebep KARSILIK_YOK",
      !k[0].olur && k[0].sebep === "KARSILIK_YOK",
    );
  }

  // --- çift eşleşme REDDEDİLİR ---
  {
    /**
     * Aynı kod iki satışta: hangisi olduğu BİLİNMEZ. Tahmin edip bağlamak
     * yanlış satışa para yazmaktır.
     */
    const k = yenidenEsle(
      [kalem("k1", "11471381662")],
      [satis("s1", "11471381662"), satis("s2", "11471381662")],
    );
    kontrol("çift eşleşme REDDEDİLİR", k[0].olur === false);
    kontrol("  ...sebep CIFT_ESLESME", !k[0].olur && k[0].sebep === "CIFT_ESLESME");
  }

  // --- kanal uyuşmazlığı ---
  {
    /**
     * Toplu tazeleme bütün kanalları aynı anda tarar; çapraz eşleşme ilk
     * kez MÜMKÜN olur. Yükleme yolunda bu risk yok (tek kanalın raporu).
     */
    const k = yenidenEsle(
      [kalem("k1", "11471381662", "hepsiburada")],
      [satis("s1", "11471381662", "trendyol")],
    );
    kontrol("kanal tutmuyorsa BAĞLANMAZ", k[0].olur === false);
    kontrol(
      "  ...sebep KANAL_UYUSMUYOR",
      !k[0].olur && k[0].sebep === "KANAL_UYUSMUYOR",
    );
  }

  // --- boşluk kırpılır ---
  {
    /** Rapordan gelen değerde boşluk olabiliyor; iki taraf da kırpılır. */
    const k = yenidenEsle([kalem("k1", " 11471381662 ")], [satis("s1", "11471381662 ")]);
    kontrol("baştaki/sondaki boşluk eşleşmeyi BOZMAZ", k[0].olur === true);
  }

  // --- özet ---
  {
    const kararlar = yenidenEsle(
      [
        kalem("k1", "A"),
        kalem("k2", "YOK"),
        kalem("k3", "CIFT"),
        kalem("k4", "A", "baska"),
      ],
      [satis("s1", "A"), satis("s2", "CIFT"), satis("s3", "CIFT")],
    );
    const o = eslemeOzeti(kararlar);
    kontrol("özet: 1 bağlanacak", o.baglanacak === 1, o);
    kontrol("özet: 1 karşılıksız", o.karsiligiYok === 1, o);
    kontrol("özet: 1 çift", o.ciftEslesme === 1, o);
    kontrol("özet: 1 kanal uyuşmaz", o.kanalUyusmaz === 1, o);
    kontrol(
      "özet TOPLAMI kalem sayısına eşit",
      o.baglanacak + o.karsiligiYok + o.ciftEslesme + o.kanalUyusmaz === 4,
    );
  }

  /**
   * TEKRARLANABİLİRLİK: aynı girdi iki kez koşunca aynı kararlar. Betik
   * bağlıya dokunmadığı için ikinci koşu boş geçer; saf katmanda karşılığı
   * kararların DEĞİŞMEMESİDİR.
   */
  {
    const g = [kalem("k1", "A")];
    const h = [satis("s1", "A")];
    kontrol(
      "aynı girdi → aynı karar (tekrarlanabilir)",
      JSON.stringify(yenidenEsle(g, h)) === JSON.stringify(yenidenEsle(g, h)),
    );
  }
}

// ===========================================================================
console.log("\nÖDEME GÜNÜ SNAP'LEME — İSTANBUL TAKVİMİ (K222-④, 20.09.2026 canlı bulgusu)");
{
  /**
   * ⛔ CANLI VAKA: Hepsiburada API'sinden gelen `dueDate`
   * `2026-09-15T22:00:00.000Z` idi — UTC'de SALI, ama İSTANBUL'DA
   * ÇARŞAMBA (16'sının 01:00'ı). Eski gövde `vade.getUTCDay()`ye bakıp
   * bunu zaten "Salı" sanıyor ve HİÇ KAYDIRMIYORDU; ekran (İstanbul
   * takviminde basan `bicim.tarih`) ise Çarşamba gösteriyordu — kanalın
   * kendi paneli "22 Eylül Salı" derken bizimki "23 Eylül" diyordu.
   */
  const hamVadeGecKalmisUtc = new Date("2026-09-15T22:00:00.000Z");
  const sonuc = sonrakiOdemeGunu(hamVadeGecKalmisUtc, "Hepsiburada");
  kontrol(
    "UTC'de Salı ama İstanbul'da Çarşamba olan vade, GERÇEK bir sonraki Salıya gidiyor (22 Eylül)",
    sonuc.toISOString().slice(0, 10) === "2026-09-22",
    sonuc.toISOString(),
  );

  /** Zaten tam İstanbul Salı gece yarısıysa aynı gün kalır — fazladan kaydırma yok. */
  const tamIstanbulSalisi = new Date("2026-09-14T21:00:00.000Z"); // İstanbul: 15 Eylül 00:00, Salı
  kontrol(
    "zaten İstanbul Salısıysa AYNI gün kalıyor (gereksiz kaydırma yok)",
    sonrakiOdemeGunu(tamIstanbulSalisi, "Hepsiburada").toISOString().slice(0, 10) ===
      "2026-09-15",
  );

  kontrol(
    "haritada olmayan kanal İSTANBUL gününe normalize edilip AYNEN döner (uydurma gün eklenmez)",
    sonrakiOdemeGunu(hamVadeGecKalmisUtc, "Amazon").toISOString().slice(0, 10) ===
      "2026-09-16",
  );

  /**
   * ⛔ KULLANICI DÜZELTMESİ 20.09.2026: ilk beyan "Trendyol Salı+Perşembe"
   * idi; kanalın kendi ekranına bakılınca gerçeğin "Pazartesi + Perşembe"
   * olduğu görüldü. Yanlış beyanla yazılmış bir eşiğin canlıya sessizce
   * gitmemesi için GERÇEK gün burada kilitleniyor.
   *
   * ⛔ VE YÖN DE ÖLÇÜLDÜ (aynı gün, GEÇMİŞ ödeme emirlerinden): TY, vadesi
   * o güne DÜŞEN kalemi o gün öder — ödeme günü vadeden SONRAKİ değil,
   * vadeden ÖNCEKİ (ya da aynı) Pazartesi/Perşembe'dir. Gerçek veri:
   *   ödeme 17.09 Per → kalemlerin vadesi 17.09 Per … 20.09 Paz
   *   ödeme 14.09 Pzt → kalemlerin vadesi 14.09 Pzt … 16.09 Çar
   * Dört ödeme emrinin dördü de bu aralığa birebir oturdu.
   */
  const istanbulPazar = new Date("2026-09-19T21:00:00.000Z"); // İstanbul: 20 Eylül 00:00, Pazar
  kontrol(
    "Trendyol GERİYE kaydırır: Pazar vadesi bir ÖNCEKİ Perşembe'ye (17 Eylül) düşer",
    sonrakiOdemeGunu(istanbulPazar, "Trendyol").toISOString().slice(0, 10) ===
      "2026-09-17",
  );
  const istanbulCarsamba = new Date("2026-09-15T21:00:00.000Z"); // İstanbul: 16 Eylül, Çarşamba
  kontrol(
    "  ...Çarşamba vadesi bir ÖNCEKİ Pazartesi'ye (14 Eylül) düşer",
    sonrakiOdemeGunu(istanbulCarsamba, "Trendyol").toISOString().slice(0, 10) ===
      "2026-09-14",
  );
  const istanbulPazartesi = new Date("2026-09-20T21:00:00.000Z"); // İstanbul: 21 Eylül, Pazartesi
  kontrol(
    "  ...ödeme gününün KENDİSİ kaymaz (Pazartesi → Pazartesi)",
    sonrakiOdemeGunu(istanbulPazartesi, "Trendyol").toISOString().slice(0, 10) ===
      "2026-09-21",
  );
  /**
   * ⚠ İKİ KANAL İKİ YÖN — ve bu bilerek. HB'nin kendi paneli "22 Eylül
   * Salı · 84.680,85" diyor ve İLERİ kaydırma bu rakamı kuruşuna
   * tutturuyor. Yön kanala göre değişmeseydi biri mutlaka bozulurdu.
   */
  kontrol(
    "Hepsiburada İLERİ kaydırmada KALIYOR (yön kanala göre)",
    sonrakiOdemeGunu(istanbulCarsamba, "Hepsiburada").toISOString().slice(0, 10) ===
      "2026-09-22",
  );

  /**
   * ⛔ K222-⑨ (20.09.2026): gelecek ödemede kesinti YALNIZ Trendyol'a
   * düşülür. HB kalemleri kesintileri ZATEN içeriyor ve toplamımız HB'nin
   * kendi paneliyle kuruşuna tutuyor (84.680,85) — oraya ikinci kez kesinti
   * düşmek, DOĞRU olan tek rakamı bozardı. Bilinmeyen kanalda da düşülmez:
   * ölçülmemiş bir kanaldan para düşmek uydurma kesinti yazmaktır.
   */
  kontrol(
    "gelecek ödemede kesinti YALNIZ Trendyol'a düşülür",
    gelecekOdemeBrutMu("Trendyol"),
  );
  kontrol(
    "  ...Hepsiburada'ya DÜŞÜLMEZ (zaten kesintili geliyor)",
    !gelecekOdemeBrutMu("Hepsiburada"),
  );
  kontrol(
    "  ...bilinmeyen kanala da DÜŞÜLMEZ (uydurma kesinti yok)",
    !gelecekOdemeBrutMu("N11") && !gelecekOdemeBrutMu("Amazon"),
  );

  /**
   * GELECEK ÖDEME GRUPLAMASI — para taşıyan kural, değerle sınanır.
   *
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİR: aynı satışın İKİ kalemi var
   * (Satış + Kupon). Kesinti kalem başına sayılsaydı 2× düşerdi; satış başına
   * bir kez sayıldığı için 1× düşer. Tek kalemli bir örnek bu ayrımı
   * gösteremezdi — iki okuma da aynı sonucu verirdi.
   */
  const kesintiHaritasi = new Map<string, number>([
    ["satis-A", 100],
    ["satis-B", 40],
  ]);
  /** 18.09.2026 Cuma — TY GERİYE kaydırır, 17 Eylül Perşembe'ye düşer. */
  const vadeCuma = gun("2026-09-18");
  const tyGruplar = gelecekOdemeleriGrupla(
    [
      { kanalAdi: "Trendyol", vade: vadeCuma, tutar: 1000, paraBirimi: "TRY", saleId: "satis-A" },
      { kanalAdi: "Trendyol", vade: vadeCuma, tutar: -50, paraBirimi: "TRY", saleId: "satis-A" },
      { kanalAdi: "Trendyol", vade: vadeCuma, tutar: 500, paraBirimi: "TRY", saleId: "satis-B" },
    ],
    kesintiHaritasi,
  );
  kontrol("gelecek ödemeler tek güne gruplanır", tyGruplar.length === 1, tyGruplar.length);
  kontrol(
    "  brüt ham toplamdır (1000 − 50 + 500 = 1450)",
    tyGruplar[0]?.brut === 1450,
    tyGruplar[0]?.brut,
  );
  kontrol(
    "  KESİNTİ SATIŞ BAŞINA BİR KEZ: A(100) + B(40) = 140, 240 DEĞİL",
    tyGruplar[0]?.kesinti === 140,
    tyGruplar[0]?.kesinti,
  );
  kontrol(
    "  gösterilen toplam = brüt − kesinti (1450 − 140 = 1310)",
    tyGruplar[0]?.toplam === 1310,
    tyGruplar[0]?.toplam,
  );
  kontrol("  kalem sayısı kalem başına artar (3)", tyGruplar[0]?.sayi === 3, tyGruplar[0]?.sayi);
  kontrol(
    "  grup tarihi kanalın ödeme gününe kaydırılmış (17 Eylül Perşembe)",
    metin(tyGruplar[0]?.tarih ?? null) === "2026-09-17",
    metin(tyGruplar[0]?.tarih ?? null),
  );

  /** Kesintisi OLMAYAN satış grubu düşürmez — "bulunamadı" 0 sayılır. */
  const kesintisiz = gelecekOdemeleriGrupla(
    [{ kanalAdi: "Trendyol", vade: vadeCuma, tutar: 300, paraBirimi: "TRY", saleId: "satis-YOK" }],
    kesintiHaritasi,
  );
  kontrol(
    "haritada olmayan satış için kesinti 0 (uydurulmaz)",
    kesintisiz[0]?.kesinti === 0 && kesintisiz[0]?.toplam === 300,
    kesintisiz[0],
  );

  /**
   * ⛔ HEPSİBURADA AYNI ÇAĞRIDA KESİNTİ ALMAZ. Kanal ölçütü KALEM KALEM
   * sorulmalı; grubun kanalına bakan bir yazım karışık çağrıda yanılırdı.
   */
  const hbGruplar = gelecekOdemeleriGrupla(
    [{ kanalAdi: "Hepsiburada", vade: gun("2026-09-20"), tutar: 800, paraBirimi: "TRY", saleId: "satis-A" }],
    kesintiHaritasi,
  );
  kontrol(
    "Hepsiburada grubundan kesinti DÜŞÜLMEZ (brüt = toplam)",
    hbGruplar[0]?.kesinti === 0 && hbGruplar[0]?.toplam === 800,
    hbGruplar[0],
  );
  kontrol(
    "  ...ve HB İLERİ kayar (Pazar vadesi → 22 Eylül Salı)",
    metin(hbGruplar[0]?.tarih ?? null) === "2026-09-22",
    metin(hbGruplar[0]?.tarih ?? null),
  );

  /** İki kanal aynı listede: ayrı gruplara düşer, biri ötekini kirletmez. */
  const karisik = gelecekOdemeleriGrupla(
    [
      { kanalAdi: "Trendyol", vade: vadeCuma, tutar: 1000, paraBirimi: "TRY", saleId: "satis-A" },
      { kanalAdi: "Hepsiburada", vade: vadeCuma, tutar: 1000, paraBirimi: "TRY", saleId: "satis-A" },
    ],
    kesintiHaritasi,
  );
  kontrol("karışık kanal listesi iki gruba ayrılır", karisik.length === 2, karisik.length);
  kontrol(
    "  aynı satış iki kanalda: TY düşer (900), HB düşmez (1000)",
    karisik.find((g) => g.kanalAdi === "Trendyol")?.toplam === 900 &&
      karisik.find((g) => g.kanalAdi === "Hepsiburada")?.toplam === 1000,
    karisik.map((g) => `${g.kanalAdi}=${g.toplam}`),
  );
  kontrol("boş liste boş dizi döner (çökmez)", gelecekOdemeleriGrupla([], kesintiHaritasi).length === 0);
}
kosanBolumler.push("odeme-gunu");

// ===========================================================================
console.log("\n8) GERÇEK ÖDEME GÜNÜ — K223 (21.09.2026)");
// ===========================================================================
{
  /**
   * ⛔ VAKA — KANALIN KENDİ KAYDIYLA ÖLÇÜLDÜ (21.09.2026):
   *
   *     emir 76313675 · 112 kalem · ₺205.691,63
   *       GERÇEK ödeme günü   2026-08-11   (PaymentOrder kaydı, TEK gün)
   *       `paymentDate`ten    10·11·17·18·19·20·22·23·24·25 Ağu + 3 Eyl
   *
   * Bir ödeme emri = BİR ödeme günü. Kalem başına `paymentDate` yazılınca tek
   * bir ödeme nakit takviminde on bir güne dağıldı. 91 emrin 91'i de yanlıştı.
   */
  const EMIR = 76313675;
  const GERCEK_GUN = Date.UTC(2026, 7, 11);
  const odemeGunleri = odemeEmriGunleriniCoz([
    {
      id: "58309195",
      transactionType: "Ödeme",
      paymentOrderId: EMIR,
      paymentDate: GERCEK_GUN,
      transactionDate: GERCEK_GUN,
    },
  ]);
  kontrol("PaymentOrder kaydından emir → gün haritası kuruluyor", odemeGunleri.size === 1);
  kontrol(
    "  anahtar `paymentOrderId` (kaydın kendi `id`si DEĞİL)",
    odemeGunleri.has(String(EMIR)) && !odemeGunleri.has("58309195"),
    [...odemeGunleri.keys()],
  );

  /** `paymentDate` yoksa `transactionDate` kurtarır (alan hep gelmeyebilir). */
  const yedekAlan = odemeEmriGunleriniCoz([
    { id: "x", transactionType: "Ödeme", paymentOrderId: 99, transactionDate: GERCEK_GUN },
  ]);
  kontrol(
    "`paymentDate` boşsa `transactionDate` okunur",
    yedekAlan.get("99")?.getTime() === GERCEK_GUN,
    yedekAlan.get("99"),
  );

  /**
   * ⛔ GEÇERSİZ TARİH KAPIDAN GEÇMEZ. `new Date(bozuk)` `Invalid Date` üretir
   * ve sessizce veritabanına kadar giderdi (anayasa: "kütüphanenin geçerlisi,
   * iş kuralımızın geçerlisi değildir").
   */
  const bozuk = odemeEmriGunleriniCoz([
    { id: "y", transactionType: "Ödeme", paymentOrderId: 7, paymentDate: NaN },
    { id: "z", transactionType: "Ödeme", paymentDate: GERCEK_GUN },
  ]);
  kontrol("geçersiz tarih haritaya GİRMEZ", !bozuk.has("7"), [...bozuk.keys()]);
  kontrol("emir no'suz kayıt kaydın `id`siyle girer", bozuk.get("z")?.getTime() === GERCEK_GUN);

  /**
   * ⭐ AYIRT EDİCİ TEST — HATANIN TA KENDİSİ.
   * Aynı emrin İKİ kalemi, İKİ FARKLI `paymentDate` taşıyor. Eski kod ikisini
   * kendi vadesine yazıyordu; doğrusu ikisinin de AYNI güne düşmesi.
   * ⚠ Tek kalemli bir örnek bu ayrımı GÖSTEREMEZDİ — iki okuma da aynı sonucu
   * verirdi ("örnek veri ayrımın iki yakasını göstermeli").
   */
  const kalemA: Parameters<typeof tyApiSatiriniOku>[0] = {
    id: "16067173",
    transactionType: "Sale",
    orderNumber: "11111111111",
    credit: 1000,
    sellerRevenue: 820,
    paymentOrderId: EMIR,
    paymentDate: Date.UTC(2026, 7, 10),
  };
  const kalemB: Parameters<typeof tyApiSatiriniOku>[0] = {
    ...kalemA,
    id: "16067174",
    paymentDate: Date.UTC(2026, 8, 3),
  };
  const a = tyApiSatiriniOku(kalemA, odemeGunleri);
  const b = tyApiSatiriniOku(kalemB, odemeGunleri);

  kontrol(
    "aynı emrin İKİ kalemi AYNI ödeme gününe düşer (vadeye DEĞİL)",
    a.odemeTarihi?.getTime() === GERCEK_GUN && b.odemeTarihi?.getTime() === GERCEK_GUN,
    [metin(a.odemeTarihi), metin(b.odemeTarihi)],
  );
  kontrol(
    "  ...ve ödeme günü kalemin KENDİ `paymentDate`i DEĞİL",
    a.odemeTarihi?.getTime() !== kalemA.paymentDate &&
      b.odemeTarihi?.getTime() !== kalemB.paymentDate,
  );
  kontrol(
    "VADE ayrı alandır ve kalemin kendi `paymentDate`ini KORUR",
    a.vadeTarihi?.getTime() === kalemA.paymentDate &&
      b.vadeTarihi?.getTime() === kalemB.paymentDate,
    [metin(a.vadeTarihi), metin(b.vadeTarihi)],
  );

  /**
   * ⛔ GÜN BİLİNMİYORSA ÖDENMİŞ YAZILMAZ — vade ödeme günü diye YAZILMAZ.
   * `null` bir eksiklik değil BEYANDIR: "ödendi ama gününü bilmiyorum".
   */
  const bilinmeyenEmir = tyApiSatiriniOku(
    { ...kalemA, paymentOrderId: 999999 },
    odemeGunleri,
  );
  kontrol(
    "emri bilinmeyen ÖDENMİŞ kalem: ödeme günü null (vade UYDURULMAZ)",
    bilinmeyenEmir.odemeTarihi === null,
    metin(bilinmeyenEmir.odemeTarihi),
  );
  kontrol(
    "  ...ama vadesi yerinde durur (bilgi kaybolmaz)",
    bilinmeyenEmir.vadeTarihi?.getTime() === kalemA.paymentDate,
  );

  /** Harita HİÇ verilmezse de kimse ödenmiş sayılmaz. */
  kontrol(
    "harita verilmezse hiçbir kalem ödenmiş yazılmaz",
    tyApiSatiriniOku(kalemA).odemeTarihi === null,
  );

  /** Ödenmemiş kalem: emir no yok → ödeme günü yok, vade var. */
  const odenmemis = tyApiSatiriniOku(
    { ...kalemA, paymentOrderId: null },
    odemeGunleri,
  );
  kontrol(
    "ödenmemiş kalem: ödeme günü null, vade dolu",
    odenmemis.odemeTarihi === null && odenmemis.vadeTarihi?.getTime() === kalemA.paymentDate,
  );

  /**
   * ═══════════════════════════════════════════════════════════════════════
   *  İKİ KAPI, AYNI ŞEYİ KORUYOR — HER BİRİ AYRI SINANIR
   * -----------------------------------------------------------------------
   *  "Ödenmemiş kaleme ödeme günü yazılmasın" kuralını İKİ kapı birden
   *  koruyor ve biri ötekini gizliyor:
   *
   *    ① OKUYUCU KAPISI   `odendi && odemeGunleri` — emir no yoksa hiç bakma
   *    ② HARİTA KAPISI    `odemeEmriGunleriniCoz` "null"/"undefined"/""
   *                       anahtarını haritaya HİÇ koymaz
   *
   *  ⛔ ÖLÇÜLDÜ 21.09.2026: ①'i kaldıran mutasyon YEŞİL geçti — çünkü ②
   *  zaten `String(null)` = "null" anahtarını haritada bulundurmuyor ve
   *  arama boş dönüyor. Yani ① kaldırılsa bugün davranış DEĞİŞMİYOR; ama
   *  yarın ② gevşerse ① tek savunma olur ve o gün kimse haberdar olmaz.
   *
   *  ⭐ ÇARE: her kapı ÖTEKİNİ BYPASS EDEN bir örnekle sınanır.
   * ═══════════════════════════════════════════════════════════════════════
   */

  /** ① OKUYUCU KAPISI — haritaya "null" anahtarı ELLE konur (②'yi atlar). */
  const kirliHarita = new Map<string, Date>([
    ["null", new Date(Date.UTC(2026, 0, 1))],
    ["undefined", new Date(Date.UTC(2026, 0, 1))],
  ]);
  kontrol(
    "① okuyucu kapısı: harita 'null' anahtarı TAŞISA BİLE ödenmemiş kalem ödenmiş yazılmaz",
    tyApiSatiriniOku({ ...kalemA, paymentOrderId: null }, kirliHarita).odemeTarihi === null,
    metin(tyApiSatiriniOku({ ...kalemA, paymentOrderId: null }, kirliHarita).odemeTarihi),
  );
  kontrol(
    "  ...aynısı `paymentOrderId` HİÇ YOKKEN de geçerli",
    tyApiSatiriniOku(
      { id: "q", transactionType: "Sale", credit: 1, sellerRevenue: 1 },
      kirliHarita,
    ).odemeTarihi === null,
  );

  /** ② HARİTA KAPISI — sahte anahtarlar haritaya hiç girmemeli. */
  const sahteAnahtarlar = odemeEmriGunleriniCoz([
    { id: "", transactionType: "Ödeme", paymentOrderId: null, paymentDate: GERCEK_GUN },
    { id: "gecerli", transactionType: "Ödeme", paymentDate: GERCEK_GUN },
  ]);
  kontrol(
    "② harita kapısı: 'null'/'undefined'/'' anahtarı haritaya GİRMEZ",
    !sahteAnahtarlar.has("null") &&
      !sahteAnahtarlar.has("undefined") &&
      !sahteAnahtarlar.has(""),
    [...sahteAnahtarlar.keys()],
  );
  kontrol(
    "  ...ama geçerli kayıt GİRER (taban doluluğu — boş harita her şeyi geçirir)",
    sahteAnahtarlar.size === 1 && sahteAnahtarlar.has("gecerli"),
    [...sahteAnahtarlar.keys()],
  );

  /**
   * ⚠ `.map(tyApiSatiriniOku)` YAZILAMAZ — `.map` ikinci parametreye İNDEKSİ
   * geçirir ve harita yerine sayı düşerdi. Çoğul sarmalayıcı haritayı
   * gerçekten taşıyor mu, ölçülür.
   */
  const coklu = tyApiSatirlariniOku([kalemA, kalemB], odemeGunleri);
  kontrol(
    "çoğul okuyucu haritayı HER kaleme taşır (indeks tuzağı yok)",
    coklu.length === 2 &&
      coklu.every((s) => s.odemeTarihi?.getTime() === GERCEK_GUN),
    coklu.map((s) => metin(s.odemeTarihi)),
  );

  /**
   * ⛔ PaymentOrder KALEM OLARAK YAZILMAZ — emrin TOPLAMINI taşır, kalem
   * sayılsaydı aynı para İKİNCİ KEZ sayılırdı. Tip listesinde olmadığı
   * ölçülür; listeye eklenmesi sessiz bir mükerrer para hatası olurdu.
   */
  kontrol(
    "`PaymentOrder` sipariş dışı YAZILAN tipler listesinde DEĞİL",
    !(TY_API_SIPARIS_DISI_TIPLERI as readonly string[]).includes("PaymentOrder"),
    TY_API_SIPARIS_DISI_TIPLERI,
  );
  kontrol(
    "  ...ve o liste BOŞ DEĞİL (taban doluluğu)",
    TY_API_SIPARIS_DISI_TIPLERI.length >= 2,
    TY_API_SIPARIS_DISI_TIPLERI.length,
  );
}
kosanBolumler.push("gercek-odeme-gunu");

// ===========================================================================
console.log("\n9) ÖDEME ÖZETİ — pazaryeri paneli düzeni (22.09.2026)");
// ===========================================================================
{
  /**
   * Kullanıcı: "müşteri alışık olduğu arayüzde hakedişlerini görsün." Bir
   * satır bir ÖDEME; satırın rakamı ile açılan kalem listesi AYNI anahtar
   * gövdesinden gelmek zorunda (anayasa: sayı = liste). Ölçüldü 22.09: TY
   * ödeme emirleri panelle kuruşuna tutuyor (14.09 → 61.958,33). Buradaki
   * ölçütler o bağı, aramayı ve toplam/sayfa SIRASINI kilitler.
   *
   * ⚠ Ekran/bileşen ölçütleri kaynak tarar (sunucu bileşeni, saf gövde
   * değil) — yorumsuz metinde, KULLANIMA bağlı; mutasyon harness'i
   * `hakedis-ozeti-mutasyon:kontrol`.
   */
  const yorumsuz = (yol: string) =>
    readFileSync(yol, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

  /* -- GEÇMİŞ ANAHTAR: TY emir · HB gün (İstanbul) ------------------- */
  const ty = gecmisOdemeAnahtari({
    kanalAdi: "Trendyol",
    paymentOrderId: "77398614",
    paidAt: new Date("2026-09-21T10:00:00.000Z"),
  });
  kontrol("TY ödenmiş kalem gerçek ödeme EMRİNE gruplanır (EMIR:)", ty.anahtar === "EMIR:77398614", ty.anahtar);
  const hb = gecmisOdemeAnahtari({
    kanalAdi: "Hepsiburada",
    paymentOrderId: null,
    paidAt: new Date("2026-09-15T22:00:00.000Z"),
  });
  kontrol("emri olmayan kanal ödeme GÜNÜNE gruplanır (kanal|GUN)", hb.anahtar === "Hepsiburada|GUN:2026-09-16", hb.anahtar);
  kontrol("  ...gün İSTANBUL takvimine göre (UTC 15'i 22:00 → İstanbul 16'sı)", metin(hb.odemeGunu) === "2026-09-16", metin(hb.odemeGunu));
  kontrol("  ...gösterilen tarih anahtardaki günle AYNI (ayrışamaz)", hb.anahtar.endsWith(metin(hb.odemeGunu)));

  /* -- ZİNCİR: kalemin anahtarı = grubun anahtarı (tek gövde) --------- */
  const vade = gun("2026-09-18");
  const grup = gelecekOdemeleriGrupla(
    [{ kanalAdi: "Trendyol", vade, tutar: 1, paraBirimi: "TRY", saleId: null }],
    new Map(),
  )[0];
  kontrol(
    "ZİNCİR: kalemin gelecek anahtarı = grubun anahtarı (iki formül yok)",
    grup?.anahtar === gelecekOdemeAnahtari("Trendyol", vade).anahtar,
    [grup?.anahtar, gelecekOdemeAnahtari("Trendyol", vade).anahtar],
  );

  /* -- ARAMA: sipariş · kayıt/fatura · ödeme emri -------------------- */
  const kalem = (siparisNo: string | null, kayitNo: string, tutar = 1, tur = "Satış"): OdemeKalemi => ({
    id: `${siparisNo}${kayitNo}`,
    tur,
    siparisNo,
    saleId: null,
    kayitNo,
    tutar,
    paraBirimi: "TRY",
  });
  const odemeler = [
    { anahtar: "a", odemeEmriNo: "77398614", toplam: 100, paraBirimi: "TRY", kalemler: [kalem("11530120067", "14019800732")] },
    { anahtar: "b", odemeEmriNo: null, toplam: 50, paraBirimi: "TRY", kalemler: [kalem("4748270482", "EFA2026000000101")] },
  ];
  const bulunan = (q: string) => odemeleriSuz(odemeler, q).map((o) => o.anahtar).join(",");
  kontrol("boş arama hepsini bırakır", bulunan("  ") === "a,b", bulunan("  "));
  kontrol("sipariş no ile bulur", bulunan("4748270482") === "b", bulunan("4748270482"));
  kontrol("fatura/kayıt no ile bulur (büyük-küçük harf duyarsız)", bulunan("efa2026") === "b", bulunan("efa2026"));
  kontrol("ödeme emri no ile bulur", bulunan("77398614") === "a", bulunan("77398614"));
  kontrol("uymayan metin BOŞ döner (uydurma eşleşme yok)", bulunan("yok") === "", bulunan("yok"));

  /* -- TOPLAM: süzgecin tamamı, sayfa değil (İlke #15) ---------------- */
  const hepsi = odemeToplamlari(odemeleriSuz(odemeler, ""));
  kontrol("toplam süzülmüş kümenin TAMAMI (100 + 50)", hepsi.length === 1 && hepsi[0]!.tutar === 150, hepsi);
  kontrol("  ...arama daraltınca toplam da daralır (50)", odemeToplamlari(odemeleriSuz(odemeler, "4748"))[0]?.tutar === 50);

  /* -- DÖKÜMLER: tür · sipariş -------------------------------------- */
  const k2 = [kalem("S1", "K1", 100), kalem("S1", "K2", -5, "Kupon"), kalem(null, "K3", -20, "Kargo Faturası")];
  const tur = kalemTuruDokumu(k2);
  kontrol("tür dökümü kanalın kendi adıyla; toplamı kalemlerin toplamına eşit (75)", tur.length === 3 && tur.reduce((a, b) => a + b.tutar, 0) === 75, tur);
  const sip = siparisDokumu(k2);
  kontrol("sipariş dökümü sipariş no'su olmayanı ALMAZ (kargo faturası dışarıda)", sip.length === 1 && sip[0]!.tutar === 95 && sip[0]!.adet === 2, sip);

  /* -- EKRAN / BİLEŞEN (kaynak, kullanıma bağlı) -------------------- */
  const sayfa = yorumsuz("src/app/hakedis/page.tsx");
  kontrol("EKRAN: toplam SÜZÜLMÜŞ kümenin tamamından (sayfa diliminden değil)", /odemeToplamlari\(odemelerSuzulmus\)/.test(sayfa));
  kontrol("EKRAN: sayfa dilimi süzülmüş kümeden kesiliyor", /odemelerSuzulmus\.slice\(/.test(sayfa));
  kontrol("EKRAN: geçmiş grup anahtarı ortak gövdeden (kendi formülü yok)", /gecmisOdemeAnahtari\(\{/.test(sayfa) && !/EMIR:\$\{/.test(sayfa));
  const bilesen = yorumsuz("src/app/hakedis/odeme-ozeti.tsx");
  kontrol(
    "BİLEŞEN: arama ortak kod kutusundan, sayfanın okuduğu parametreyle (kamera — İlke #7); çıplak input yok",
    /<KodAramaKutusu[\s\S]{0,300}?parametre=\{ODEME_ARAMA_PARAMETRESI\}/.test(bilesen) && !/<input\b/.test(bilesen),
  );
  /*
   * ⚠ ÖLÇÜT TAŞINDI, GEVŞETİLMEDİ (K235, 22.09.2026): açılır satırın anatomisi
   * ortak gövdeye (`components/satir-karti.tsx`) çıktı; ekran artık `<details>`
   * yazmıyor, `SatirKarti`ye `acilir` veriyor. Ölçülen şey aynı: BİR SATIR BİR
   * ÖDEME ve satır açılabiliyor. Ham `<details>` aranması, ortak gövdeyi
   * kullanan doğru kodu kırmızı yakardı.
   * ⚠ PENCERE ÖLÇÜLDÜ (22.09.2026): çağrı ile acilir arası yorumsuz metinde
   * 973 karakter; pencere 1400'e kuruldu. Gövde büyürse dar pencere SESSİZCE
   * körelir — sayı bu yüzden gerekçesiyle burada duruyor.
   */
  kontrol(
    "BİLEŞEN: bir satır bir ödeme — ortak SatirKarti, açılır döküm",
    /<SatirKarti[\s\S]{0,1400}?acilir=\{dokum\}/.test(bilesen) && !/<details/.test(bilesen),
  );
  kontrol(
    "BİLEŞEN: ödenmiş satır 'Ödeme yapıldı', gelecek 'Tahmini' rozeti (koşul + sonuç)",
    /kip === "gecmis" \? \(\s*<Badge className=\{DURUM_KUTUSU\.olumlu\}>[\s\S]{0,120}?t\("odemeYapildi"\)/.test(bilesen) &&
      /t\("tahminiHesaplanmistir"\)/.test(bilesen),
  );
}
kosanBolumler.push("odeme-ozeti");

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
