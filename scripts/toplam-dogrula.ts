import { readFileSync } from "node:fs";

import {
  adetToplami,
  hesaplananToplami,
  suzgecToplami,
} from "../src/lib/liste-toplami";
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

// --- 9) GÖSTERMEK ≠ SAYMAK — canlı bulgu 17.08.2026 ------------------------
{
  /**
   * ⚠ CANLI BULGU: `?iptal=1` açıkken iptalli satışlar listeye giriyordu ve
   * TOPLAMA DA giriyorlardı — ciro 105.184 → 106.618 sıçradı. Oysa iptal
   * edilen satış hiç doğmamış sayılır: GÖRÜNÜR olması SAYILDIĞI anlamına
   * gelmez.
   *
   * Kural: toplam kutuları HER ZAMAN iptal hariçtir; iptal edilenler kendi
   * kutusunda, kendi rakamıyla görünür.
   */
  type IptalliSatis = { kod: string; iptal: boolean; tutar: string };
  const satislar: IptalliSatis[] = [
    { kod: "S1", iptal: false, tutar: "105184.00" },
    { kod: "S2", iptal: true, tutar: "1434.00" },
  ];

  const c = suzgecToplami(
    satislar,
    (s) => kalemToplamlari([tl(s.tutar)]),
    (s) => s.iptal,
  );
  esit("iptalli satış GÖRÜNSE de toplama girmez", c.toplam, [
    { paraBirimi: "TRY", tutar: 105184 },
  ]);
  esit("iptal edilen ayrı kutuda görünür", c.haric, [
    { paraBirimi: "TRY", tutar: 1434 },
  ]);
  esit("kayıt sayısı da iptal hariç", c.sayi, 1);
  esit("iptal sayısı ayrı", c.haricSayi, 1);

  /**
   * SIÇRAMA TESTİ: süzgeç kaldırılsaydı toplam 106.618 olurdu — canlıda
   * görülen yanlış rakamın ta kendisi. Bu kontrol farkın BÜYÜKLÜĞÜNÜ
   * sabitliyor.
   */
  const suzgecsiz = suzgecToplami(
    satislar,
    (s) => kalemToplamlari([tl(s.tutar)]),
    () => false,
  );
  esit("süzgeçsiz olsaydı 106.618 çıkardı", suzgecsiz.toplam, [
    { paraBirimi: "TRY", tutar: 106618 },
  ]);
}

// ===========================================================================
console.log("\nADET TOPLAMI — 'kaç kayıt' değil 'kaç ürün'");
// ===========================================================================
{
  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERMELİ. Kayıt sayısı ile adet
   * FARKLI olmalı; her satır 1 adet olsaydı "adet döndürmek yerine kayıt
   * say" mutasyonu yeşil kalırdı. Burada 3 kayıt / 6 adet.
   *
   * Senaryo kullanıcının ekranından (21.08.2026, /satislar · Dün): 7 kayıt
   * başlıkta yazıyordu ama ilk satır 2 adet taşıyordu.
   */
  const satislar = [
    { adet: 2, iptal: false },
    { adet: 1, iptal: false },
    { adet: 3, iptal: false },
    { adet: 5, iptal: true },
  ];

  const a = adetToplami(
    satislar,
    (s) => s.adet,
    (s) => s.iptal,
  );
  esit("adet toplamı 6 (kayıt sayısı 3 DEĞİL)", a.toplam, 6);
  esit("kayıt sayısı ayrıca 3", a.sayi, 3);

  /**
   * İPTAL SESSİZCE DÜŞMEZ — para tarafındaki sözleşmeyle aynı. 5 adet
   * dışarıda kaldıysa bu ekranda yazılabilmeli.
   */
  esit("iptal edilen adet ayrı sayılıyor", a.haric, 5);
  esit("iptal kayıt sayısı ayrı", a.haricSayi, 1);

  /**
   * ⚠ HARİÇ SÜZGECİ GERÇEKTEN ÇALIŞIYOR MU: yüklem hep-false yapılsaydı
   * toplam 11 olurdu. Farkın BÜYÜKLÜĞÜNÜ sabitliyoruz.
   */
  const suzgecsiz = adetToplami(
    satislar,
    (s) => s.adet,
    () => false,
  );
  esit("süzgeçsiz olsaydı 11 çıkardı", suzgecsiz.toplam, 11);

  /** Boş liste sıfır döner — "—" ya da NaN değil. */
  const bos = adetToplami(
    [] as typeof satislar,
    (s) => s.adet,
    (s) => s.iptal,
  );
  esit("boş listede toplam 0", bos.toplam, 0);
  esit("boş listede hariç de 0", bos.haric, 0);
}

// ===========================================================================
console.log("\nADET EKRANA VARIYOR MU — kaynak taraması");
// ===========================================================================
{
  /**
   * ⚠ DESEN ÖNCE SAYILDI. `adetToplami` satış sayfasında İKİ kez geçiyor
   * (import satırı + çağrı). Import tek başına hiçbir kutu çizmez, bu yüzden
   * işaret ÇAĞRIYA bağlanıyor.
   *
   * ⚠ ÖLÇÜT 27.08.2026'DA GÜNCELLENDİ — SUSTURULMADI, ESKİDİĞİ İÇİN.
   * Eskiden `adetToplami(` aranıyordu; o gövde ÇEKİLEN DİZİYİ topluyor ve
   * iki ekran o gün SAYFALANDI (5778 satır · 10,1 MB · 1600 ms). Toplamlar
   * veritabanına taşındı; sayfalanmış diziden toplamak artık YASAK, çünkü
   * "görünen sayfanın toplamı" olurdu (İlke #15).
   *
   * ⛔ ÖLÇÜT GEVŞEMEDİ, YER DEĞİŞTİRDİ: adet toplamının EKRANA vardığı hâlâ
   * ölçülüyor — kaynağı artık veritabanı gövdesi. Kaynağın kendisini
   * `sayfalama-toplami:dogrula` ayrıca sınıyor (sayfadan hesaplayan her
   * ifade orada kırmızı yanıyor).
   */
  for (const [ad, yol, etiket] of [
    ["satışlar", "src/app/satislar/page.tsx", 'etiket: t("adetToplami")'],
    ["alımlar", "src/app/alimlar/page.tsx", 'etiket: t("adetToplami")'],
  ] as const) {
    const kaynak = readFileSync(yol, "utf8");
    esit(
      `${ad} — süzgeç adedini HESAPLIYOR (veritabanı gövdesinden)`,
      /const adetToplam = toplam(lar|Verisi)\.adet;/.test(kaynak),
      true,
    );
    /**
     * ⚠ VE KUTUYA BAĞLANIYOR. Hesabın var olması ekranda göründüğü anlamına
     * gelmez — "muafiyetin uygulanması ve beyanı ayrı sınanır" dersinin
     * aynısı: doğru çalışan bir hesabın görünmezliği de yalancı yeşildir.
     */
    esit(`${ad} — kutu ÇİZİLİYOR (oncekiler)`, kaynak.includes("oncekiler={["), true);
    esit(`${ad} — kutunun etiketi sözlükten`, kaynak.includes(etiket), true);
    /**
     * ⚠ VE HARİÇ YÜKLEMİ TEK GÖVDEDE: tutar ile adet aynı `iptalliMi`yi
     * kullanmalı. İki ayrı yüklem yazılırsa biri gün gelip ötekinden ayrışır
     * ve ekranda yan yana iki çelişen rakam durur.
     */
    esit(`${ad} — tutar ve adet AYNI hariç yüklemini kullanıyor`, kaynak.includes("iptalliMi"), true);
  }

  /**
   * ⚠ SAYI ELLE BİÇİMLENDİRİLMİYOR (anayasa: biçimler dil altyapısından).
   * `String(...)` ya da şablon içinde çıplak sayı, binlik ayracını kaybeder
   * ve 1284 adet "1284" görünür.
   */
  const bilesen = readFileSync("src/components/liste-toplami.tsx", "utf8");
  esit("ek kutular tek gövdeden çiziliyor", bilesen.includes("function ekKutulari("), true);
  esit(
    "öncekiler ve ekler AYNI çiziciyi kullanıyor",
    bilesen.includes("ekKutulari(ekler, bicim)") &&
      bilesen.includes("ekKutulari(oncekiler, bicim)"),
    true,
  );
}

console.log(`\n${gecen} geçti · ${kalan} kaldı\n`);
if (kalan > 0) process.exitCode = 1;
