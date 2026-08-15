import {
  faizGecerliMi,
  faizTutari,
  kalanHesapla,
  mukerrerUyarisi,
  odemeOnizlemesi,
  oncekiOdenen,
  tersKayit,
} from "../src/lib/kart-odeme/hesap";

/**
 * ============================================================================
 *  KART ÖDEME DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run kart-odeme:dogrula
 *
 *  EN KRİTİK KİLİT: ana borç ödemesi kâra KARIŞMAMALI. Karışırsa kâr iki kez
 *  düşer ve rakam "makul" göründüğü için kimse fark etmez — bu, yanlış bir
 *  toplam göstermekten daha sinsidir.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;

function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen += 1;
    console.log(`  OK    ${ad}`);
  } else {
    kalan += 1;
    console.log(
      `  HATA  ${ad}${gorulen === undefined ? "" : ` — ${JSON.stringify(gorulen)}`}`,
    );
  }
}

console.log("=".repeat(70));
console.log("1) FAİZ — İKİ GİRİŞ YOLU");
console.log("=".repeat(70));

{
  /** SÖZLEŞMEDEKİ KİLİT ÖRNEK: 1.000 gecikmiş, günlük %3, 2 gün → 60. */
  const hesaplanan = faizTutari({
    yol: "hesapla",
    matrah: 1000,
    oran: 3,
    gun: 2,
  });
  kontrol("1.000 × %3 × 2 gün = 60", hesaplanan === 60, hesaplanan);

  const elle = faizTutari({ yol: "elle", tutar: 60 });
  kontrol("elle girilen 60 aynen döner", elle === 60, elle);
  kontrol("iki yol AYNI sonucu verebiliyor", hesaplanan === elle);

  kontrol("faiz yoksa 0", faizTutari({ yol: "yok" }) === 0);
  kontrol(
    "gün 0 ise faiz 0 (gecikme yok)",
    faizTutari({ yol: "hesapla", matrah: 1000, oran: 3, gun: 0 }) === 0,
  );
  kontrol(
    "oran 0 ise faiz 0",
    faizTutari({ yol: "hesapla", matrah: 1000, oran: 0, gun: 5 }) === 0,
  );

  /** Ondalık oran: %0,15 günlük, 10 gün, 5.000 → 75. */
  kontrol(
    "ondalık oran doğru çarpılıyor (%0,15 × 10 gün × 5.000 = 75)",
    faizTutari({ yol: "hesapla", matrah: 5000, oran: 0.15, gun: 10 }) === 75,
    faizTutari({ yol: "hesapla", matrah: 5000, oran: 0.15, gun: 10 }),
  );

  /** GEÇERLİLİK — eksi değer sessizce düzeltilmez, REDDEDİLİR. */
  kontrol("eksi elle tutar geçersiz", !faizGecerliMi({ yol: "elle", tutar: -5 }));
  kontrol(
    "eksi oran geçersiz",
    !faizGecerliMi({ yol: "hesapla", matrah: 1000, oran: -1, gun: 2 }),
  );
  kontrol(
    "ondalık gün geçersiz (gün tam sayıdır)",
    !faizGecerliMi({ yol: "hesapla", matrah: 1000, oran: 3, gun: 1.5 }),
  );
  kontrol("faiz yok her zaman geçerli", faizGecerliMi({ yol: "yok" }));
  kontrol("sıfır faiz geçerli (açıkça 0)", faizGecerliMi({ yol: "elle", tutar: 0 }));
}

console.log("");
console.log("=".repeat(70));
console.log("2) KALAN — TÜRETİLİR");
console.log("=".repeat(70));

{
  kontrol("1.000 borç, 400 ödendi → kalan 600", kalanHesapla(1000, 400) === 600);
  kontrol("tam ödemede kalan 0", kalanHesapla(1000, 1000) === 0);
  /**
   * FAZLA ÖDEME KIRPILMAZ. Banka fazla çekmiş olabilir; sıfıra çekmek o
   * parayı ekrandan silmek olurdu.
   */
  kontrol(
    "fazla ödemede kalan EKSİ (kırpılmıyor)",
    kalanHesapla(1000, 1200) === -200,
    kalanHesapla(1000, 1200),
  );
  kontrol("hiç ödenmemişse kalan = borç", kalanHesapla(1000, 0) === 1000);
}

console.log("");
console.log("=".repeat(70));
console.log("3) MÜKERRER ÖDEME — ÖNİZLEMEDE YAKALANIR");
console.log("=".repeat(70));

{
  /** İlk ödeme sıradan iştir: uyarı YOK. */
  const ilk = mukerrerUyarisi({
    ekstreBorcu: 1000,
    mevcutKayitlar: [],
    yeniOdeme: 1000,
  });
  kontrol("ilk ödemede uyarı YOK", ilk.uyar === false);
  kontrol("  ...kalan borç tam borç", ilk.kalanBorc === 1000);
  kontrol("  ...aşma yok", ilk.asiyorMu === false);

  /** KISMİ ÖDEME MEŞRU: uyarı çıkar ama yol kapanmaz. */
  const kismi = mukerrerUyarisi({
    ekstreBorcu: 1000,
    mevcutKayitlar: [{ odenenAnaBorc: 400 }],
    yeniOdeme: 600,
  });
  kontrol("ikinci ödemede UYARI var", kismi.uyar === true);
  kontrol("  ...önceki toplam 400", kismi.oncekiToplam === 400);
  kontrol("  ...kalan borç 600", kismi.kalanBorc === 600);
  kontrol("  ...tam kalanı ödemek AŞMA değil", kismi.asiyorMu === false);

  /** MÜKERRER TAM ÖDEME KAZASI — asıl yakalanmak istenen. */
  const kaza = mukerrerUyarisi({
    ekstreBorcu: 1000,
    mevcutKayitlar: [{ odenenAnaBorc: 1000 }],
    yeniOdeme: 1000,
  });
  kontrol("tam ödenmişken ikinci tam ödeme UYARIYOR", kaza.uyar === true);
  kontrol("  ...kalan borç 0", kaza.kalanBorc === 0);
  kontrol("  ...ve AŞIYOR olarak işaretleniyor", kaza.asiyorMu === true);

  /**
   * ⚠ TERS KAYIT HESABA GİRER. Ters kayıt aynı tutarı ters işaretle taşır;
   * düz toplam net sonucu verir. `isReversal` ile ayıklanmaya kalkılsaydı,
   * ters alınmış bir ödeme hâlâ "ödenmiş" sayılır ve kullanıcı gerçek
   * ödemeyi yapamazdı.
   */
  const tersli = mukerrerUyarisi({
    ekstreBorcu: 1000,
    mevcutKayitlar: [{ odenenAnaBorc: 1000 }, { odenenAnaBorc: -1000 }],
    yeniOdeme: 1000,
  });
  kontrol("ters alınmış ödeme net 0 sayılıyor", tersli.oncekiToplam === 0);
  kontrol("  ...kalan borç yine 1.000", tersli.kalanBorc === 1000);
  kontrol("  ...yeni tam ödeme AŞMA değil", tersli.asiyorMu === false);
  kontrol(
    "  ...ama kayıt VAR olduğu için uyarı yine çıkıyor (geçmiş görünsün)",
    tersli.uyar === true,
  );

  kontrol("önceki ödenen toplamı düz toplam", oncekiOdenen([
    { odenenAnaBorc: 300 },
    { odenenAnaBorc: 200 },
    { odenenAnaBorc: -100 },
  ]) === 400);
}

console.log("");
console.log("=".repeat(70));
console.log("4) ÖNİZLEME — ANA BORÇ KÂRA KARIŞMAZ (EN KRİTİK KİLİT)");
console.log("=".repeat(70));

{
  const on = odemeOnizlemesi({
    ekstreBorcu: 1000,
    odenenAnaBorc: 1000,
    faiz: { yol: "hesapla", matrah: 1000, oran: 3, gun: 2 },
    mevcutKayitlar: [],
  });

  kontrol("faiz 60", on.faiz === 60, on.faiz);
  kontrol("kalan 0", on.kalan === 0);
  /**
   * ⚠ ASIL KİLİT: kâra etki YALNIZ faiz kadar. Ana borç girseydi −1.060
   * çıkardı; maliyet alımda zaten sayıldığı için kâr İKİ KEZ düşerdi ve
   * rakam "makul" göründüğü için kimse fark etmezdi.
   */
  kontrol("kâra etki −60 (ana borç GİRMİYOR)", on.karaEtki === -60, on.karaEtki);
  kontrol("  ...ana borç kadar DEĞİL", on.karaEtki !== -1000);
  kontrol("  ...toplam kadar da DEĞİL", on.karaEtki !== -1060);
  kontrol("faiz varsa gider yazılacak", on.giderYazilacakMi === true);

  /** FAİZ YOKSA GİDER DE YOK — sıfır tutarlı gider kaydı yaratılmaz. */
  const faizsiz = odemeOnizlemesi({
    ekstreBorcu: 1000,
    odenenAnaBorc: 1000,
    faiz: { yol: "yok" },
    mevcutKayitlar: [],
  });
  kontrol("faiz yoksa kâra etki 0", faizsiz.karaEtki === 0);
  kontrol("  ...gider YAZILMIYOR", faizsiz.giderYazilacakMi === false);

  /** Kısmi ödeme önizlemesi: kalan görünür, uyarı taşınır. */
  const kismi = odemeOnizlemesi({
    ekstreBorcu: 1000,
    odenenAnaBorc: 400,
    faiz: { yol: "yok" },
    mevcutKayitlar: [],
  });
  kontrol("kısmi ödemede kalan 600 GÖRÜNÜYOR", kismi.kalan === 600);
  kontrol("  ...ekstre borcu snapshot olarak taşınıyor", kismi.ekstreBorcu === 1000);
}

console.log("");
console.log("=".repeat(70));
console.log("5) TERS KAYIT — SİLME YOK");
console.log("=".repeat(70));

{
  const ters = tersKayit({ ekstreBorcu: 1000, odenenAnaBorc: 1000, faizTutar: 60 });
  kontrol("ana borç ters işaretli", ters.odenenAnaBorc === -1000, ters.odenenAnaBorc);
  /**
   * FAİZ DE TERSLENİR. Yanlış kaydın gideri geri alınmazsa kâr KALICI
   * olarak eksik kalır — düzeltme yarım olur.
   */
  kontrol("faiz de ters işaretli", ters.faizTutar === -60, ters.faizTutar);
  kontrol("ters kayıt olarak işaretli", ters.isReversal === true);
  /** Ekstre borcu SNAPSHOT: hangi borç üzerinden ters alındığı görülsün. */
  kontrol("ekstre borcu AYNI kalıyor (snapshot)", ters.ekstreBorcu === 1000);

  /** Asıl + ters = net sıfır. */
  const net = oncekiOdenen([{ odenenAnaBorc: 1000 }, { odenenAnaBorc: ters.odenenAnaBorc }]);
  kontrol("asıl + ters = 0 (defter nötrleniyor)", net === 0, net);
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
