import { hesaplananToplami, suzgecToplami } from "../src/lib/liste-toplami";
import { kalemToplamlari } from "../src/lib/tutar";

/**
 * ============================================================================
 *  SÜZGEÇ TOPLAMI — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Kullanıcı Kolaylığı #15. Senaryolar kullanıcının GERÇEK ekranından alındı
 *  (17.08.2026, /alimlar · Bugün): üç alım, 7.558,20 + 7.558,20 + 7.498,20 =
 *  22.614,60 ₺. Kullanıcı bu rakamı satırlardan kafadan topluyordu.
 *
 *  Kontroller DEĞERE bakar, kaynak metnine değil.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;

function esit(ad: string, bulunan: unknown, beklenen: unknown) {
  const a = JSON.stringify(bulunan);
  const b = JSON.stringify(beklenen);
  if (a === b) {
    gecen++;
  } else {
    kalan++;
    console.log(`  ✗ ${ad}\n      beklenen: ${b}\n      bulunan : ${a}`);
  }
}

type Alim = {
  kod: string;
  iptal: boolean;
  kalemler: { quantity: number; unitCostAmount: string; unitCostCurrency: string }[];
};

const tl = (tutar: string, adet = 1) => ({
  quantity: adet,
  unitCostAmount: tutar,
  unitCostCurrency: "TRY",
});

const hesapla = (alimlar: Alim[]) =>
  suzgecToplami(
    alimlar,
    (a) => kalemToplamlari(a.kalemler),
    (a) => a.iptal,
  );

console.log("\nSÜZGEÇ TOPLAMI — DOĞRULAMA\n");

// --- 1) Kullanıcının gerçek ekranı ------------------------------------------
const gercekEkran: Alim[] = [
  { kod: "ALM-NON-260817-03", iptal: false, kalemler: [tl("7558.20")] },
  { kod: "ALM-NON-260817-02", iptal: false, kalemler: [tl("7558.20")] },
  { kod: "ALM-NON-260817-01", iptal: false, kalemler: [tl("7498.20")] },
];
const a = hesapla(gercekEkran);
esit("gerçek ekran toplamı", a.toplam, [{ paraBirimi: "TRY", tutar: 22614.6 }]);
esit("gerçek ekran kayıt sayısı", a.sayi, 3);
esit("hariç yok", a.haricSayi, 0);

// --- 2) İPTAL TOPLAMA GİRMEZ — kuralın taşıyıcı senaryosu -------------------
/**
 * Bu senaryo kuralın YÜKÜNÜ taşır: iptal ayrımı kaldırılırsa toplam
 * 22.614,60 yerine 32.614,60 olur ve test kırmızı yanar. Ayrım "olsa iyi
 * olur" değil, KDV matrahını doğrudan bozan bir şeydir.
 */
const iptalliEkran: Alim[] = [
  ...gercekEkran,
  { kod: "ALM-NON-260817-04", iptal: true, kalemler: [tl("10000.00")] },
];
const b = hesapla(iptalliEkran);
esit("iptal toplama GİRMEZ", b.toplam, [{ paraBirimi: "TRY", tutar: 22614.6 }]);
esit("iptal ayrı toplanır", b.haric, [{ paraBirimi: "TRY", tutar: 10000 }]);
esit("iptal sayısı", b.haricSayi, 1);
esit("geçerli sayı iptali saymaz", b.sayi, 3);

// --- 3) Para birimleri ÇEVRİLMEZ --------------------------------------------
const karisik: Alim[] = [
  { kod: "A", iptal: false, kalemler: [tl("100.00")] },
  {
    kod: "B",
    iptal: false,
    kalemler: [{ quantity: 2, unitCostAmount: "50.00", unitCostCurrency: "EUR" }],
  },
];
esit("TRY ve EUR ayrı satır", hesapla(karisik).toplam, [
  { paraBirimi: "EUR", tutar: 100 },
  { paraBirimi: "TRY", tutar: 100 },
]);

// --- 4) Adet çarpımı toplama yansır ------------------------------------------
esit(
  "adet çarpılır",
  hesapla([{ kod: "C", iptal: false, kalemler: [tl("125.50", 4)] }]).toplam,
  [{ paraBirimi: "TRY", tutar: 502 }],
);

// --- 5) Çok kalemli tek alım -------------------------------------------------
esit(
  "bir alımın kalemleri toplanır",
  hesapla([
    { kod: "D", iptal: false, kalemler: [tl("10.25"), tl("20.75"), tl("5.00")] },
  ]).toplam,
  [{ paraBirimi: "TRY", tutar: 36 }],
);

// --- 6) Boş liste — "0" değil, BOŞ ------------------------------------------
/**
 * Boş listede toplam dizisi BOŞ döner; bileşen o hâlde hiç çizilmez.
 * "Toplam ₺0,00" satırı boş ekranda bilgi taşımaz, yalnız yer kaplar (#12).
 */
const bos = hesapla([]);
esit("boş listede toplam yok", bos.toplam, []);
esit("boş listede sayı sıfır", bos.sayi, 0);

// --- 7) Hepsi iptalse toplam BOŞ, hariç DOLU --------------------------------
const hepsiIptal = hesapla([
  { kod: "E", iptal: true, kalemler: [tl("500.00")] },
]);
esit("hepsi iptalse toplam boş", hepsiIptal.toplam, []);
esit("hepsi iptalse hariç dolu", hepsiIptal.haric, [
  { paraBirimi: "TRY", tutar: 500 },
]);

// --- 8) NET TOPLAMI: hesaplanamayan SIFIR SAYILMAZ -------------------------
/**
 * Kuralın taşıyıcı senaryosu — ve YÜKÜ SAYIMDA.
 *
 * Gerçekte hesaplanamayan satışın `net2Amount`i NULL'dır; toplama girerse
 * 0 olarak girer ve TOPLAMI DEĞİŞTİRMEZ. Tehlike tam da bu sessizlikte:
 * kullanıcı "3 satıştan ₺1.500" sanır, oysa rakam 2 satışın. Bu yüzden
 * kontrol edilmesi gereken şey toplam değil, DIŞARIDA KALAN SAYISIDIR —
 * ekranda "1 satışın kârı hesaplanamadı" yazmasını sağlayan odur.
 *
 * Aşağıdaki `net: 0` bilinçli: NULL'ın gerçek davranışını taklit ediyor.
 */
type Satis = { kod: string; hesaplandi: boolean; net: number; para: string };
const satislar: Satis[] = [
  { kod: "S1", hesaplandi: true, net: 1000, para: "TRY" },
  { kod: "S2", hesaplandi: true, net: 500, para: "TRY" },
  { kod: "S3", hesaplandi: false, net: 0, para: "TRY" }, // NO_COST → NULL
];
const n = hesaplananToplami(
  satislar,
  (s) => s.hesaplandi,
  (s) => ({ paraBirimi: s.para, tutar: s.net }),
);
esit("NET toplamı hesaplananlardan", n.toplam, [
  { paraBirimi: "TRY", tutar: 1500 },
]);
esit("hesaplanamayan SAYILIR ve bildirilir", n.eksikSayi, 1);

// Hepsi hesaplanamazsa toplam BOŞ döner — kutu hiç çizilmez, "₺0,00" yazmaz.
const hicbiri = hesaplananToplami(
  [{ kod: "S9", hesaplandi: false, net: 0, para: "TRY" }],
  (s) => s.hesaplandi,
  (s) => ({ paraBirimi: s.para, tutar: s.net }),
);
esit("hiçbiri hesaplanmadıysa toplam boş", hicbiri.toplam, []);
esit("hepsi eksik sayılır", hicbiri.eksikSayi, 1);

// Zarar eden satış toplamı DÜŞÜRÜR — mutlak değer alınmaz.
esit(
  "zarar negatif katkı yapar",
  hesaplananToplami(
    [
      { kod: "K", hesaplandi: true, net: 300, para: "TRY" },
      { kod: "Z", hesaplandi: true, net: -100, para: "TRY" },
    ],
    (s) => s.hesaplandi,
    (s) => ({ paraBirimi: s.para, tutar: s.net }),
  ).toplam,
  [{ paraBirimi: "TRY", tutar: 200 }],
);

console.log(`\n${gecen} geçti · ${kalan} kaldı\n`);
if (kalan > 0) process.exitCode = 1;
