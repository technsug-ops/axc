import {
  faizGecerliMi,
  faizTutari,
  kalanHesapla,
  kurusaYuvarla,
  mukerrerUyarisi,
  odemeOnizlemesi,
  oncekiOdenen,
  tersKayit,
} from "../src/lib/kart-odeme/hesap";
import { readFileSync } from "node:fs";

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

/**
 * EKRAN BAĞI KAYNAKLARI — MODÜL DÜZEYİNDE.
 *
 * Bunlar önce bir bloğun içinde okunuyordu; ikinci bölümde aynı adlara
 * ulaşılamayınca betik "sayfa is not defined" diye ÇÖKTÜ (16.08.2026).
 * Çökme sessiz geçmedi — ama blok kapsamlı bir tanım aynı sessizlikle
 * yanlış dosyayı da okuyabilirdi. Kaynaklar tek yerde durur.
 */
const form = readFileSync("src/app/kart-borcu/odeme-formu.tsx", "utf8");
const sayfa = readFileSync("src/app/kart-borcu/page.tsx", "utf8");
const satir = readFileSync("src/app/kart-borcu/odeme-satiri.tsx", "utf8");
const eylem = readFileSync("src/app/kart-borcu/eylemler.ts", "utf8");
const tr = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
  KartOdeme?: Record<string, string>;
  KartBorcu?: Record<string, string>;
};

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

  /**
   * ════════════════════════════════════════════════════════════════════
   *  CANLIDA YAŞANAN SENARYO (16.08.2026) — MÜKERRER TAM ÖDEME
   * --------------------------------------------------------------------
   *  Hasan Akbank / 09.08.2026 ekstresi, borç 1.199,66. Kullanıcı AYNI
   *  ekstreye İKİ KEZ tam ödeme girdi; kalan −1.199,66 oldu, faiz iki kez
   *  yazıldı.
   *
   *  İLK TURDA NEDEN YAKALANMADI: saf kuralın "ikinci ödemede uyarı var"
   *  testi VARDI ve geçiyordu. Eksik olan İKİ ŞEYDİ:
   *   1. "Ekstre zaten KAPALI" hâli ayrı bir seviye olarak yoktu — kısmi
   *      ödeme ile mükerrer tam ödeme aynı tonda uyarıyordu.
   *   2. Uyarının EKRANDA ne kadar görünür olduğu hiç sınanmamıştı; test
   *      bayrağı doğruluyordu, sunumu değil.
   *  Bayrak doğru olsa da kullanıcı görmüyorsa uyarı çalışmıyordur.
   * ════════════════════════════════════════════════════════════════════
   */
  const canliSenaryo = mukerrerUyarisi({
    ekstreBorcu: 1199.66,
    mevcutKayitlar: [{ odenenAnaBorc: 1199.66 }],
    yeniOdeme: 1199.66,
  });
  kontrol("canlı senaryo: ikinci tam ödeme UYARIYOR", canliSenaryo.uyar === true);
  kontrol(
    "  ...ve 'ekstre ZATEN KAPALI' olarak işaretleniyor",
    canliSenaryo.zatenKapali === true,
  );
  kontrol("  ...kalan borç 0", canliSenaryo.kalanBorc === 0);
  kontrol("  ...aşıyor olarak da işaretli", canliSenaryo.asiyorMu === true);

  /** KISMİ ÖDEME KAPALI DEĞİLDİR — iki seviye karışmasın. */
  const kismiKapali = mukerrerUyarisi({
    ekstreBorcu: 1000,
    mevcutKayitlar: [{ odenenAnaBorc: 400 }],
    yeniOdeme: 600,
  });
  kontrol("kısmi ödemede ekstre KAPALI DEĞİL", kismiKapali.zatenKapali === false);
  kontrol("  ...ama uyarı yine de var", kismiKapali.uyar === true);

  /** Fazla ödenmişse de kapalı sayılır (kalan eksi). */
  const fazla = mukerrerUyarisi({
    ekstreBorcu: 1000,
    mevcutKayitlar: [{ odenenAnaBorc: 1200 }],
    yeniOdeme: 100,
  });
  kontrol("fazla ödenmişse de KAPALI", fazla.zatenKapali === true);

  /** İlk ödemede kapalı bayrağı ASLA yanmaz. */
  kontrol(
    "ilk ödemede kapalı bayrağı yanmıyor",
    mukerrerUyarisi({ ekstreBorcu: 1000, mevcutKayitlar: [], yeniOdeme: 1000 })
      .zatenKapali === false,
  );

  /**
   * EKRAN BAĞI — bayrak doğru olsa da kullanıcı görmüyorsa uyarı
   * çalışmıyordur. Bu kontrol "kural teslim edilebilir mi" süzgecidir
   * (anayasa notu 16.08.2026).
   */
  /**
   * ════════════════════════════════════════════════════════════════════
   *  ÖN-DOLU TUTAR = KALAN BORÇ (16.08.2026 canlı bulgusu)
   * --------------------------------------------------------------------
   *  S.ahmet Garanti / 07.08.2026 ekstresi, borç 9.097,66. İlk ödeme
   *  5.097,66 → kalan 4.000,00. İkinci ödemede form yine EKSTRENİN
   *  TAMAMINI ön-dolu getirdi; kullanıcı 5.097,66 girdi ve kalan
   *  −1.097,66'ya düştü.
   *
   *  Form fazla ödemeyi BİZZAT ÖNERİYORDU. "Sistemin hesabı ön-dolu gelir"
   *  demek, ikinci ödemede KALAN demektir — mimar tanımı yarım
   *  uygulanmıştı.
   * ════════════════════════════════════════════════════════════════════
   */
  kontrol(
    "form ön-doluyu KALAN borçtan alıyor (ekstrenin tamamından değil)",
    form.includes("ekstreBorcu - oncekiOdenen(mevcutKayitlar)") &&
      form.includes("useState(kalanBorc.toFixed(2))"),
  );
  kontrol(
    "  ...ön-doluda eksi öneri yok (kapalı ekstrede 0)",
    form.includes("Math.max(0, ekstreBorcu - oncekiOdenen"),
  );
  kontrol(
    "  ...kısmen ödenmişse NEDEN o tutar önerildiği yazılı",
    form.includes("onDoluKalanNotu"),
  );
  /**
   * ════════════════════════════════════════════════════════════════════
   *  FAİZ MATRAHI = ÖDEME ÖNCESİ KALAN BORÇ (16.08.2026)
   * --------------------------------------------------------------------
   *  Matrah `ekstreBorcu − buÖdeme` idi; geciken bir ekstreyi TAM ödeyince
   *  matrah 0 çıkıyor ve FAİZ SIFIRLANIYORDU. Oysa gecikme faizi ödeme
   *  anında borçlu olunan tutar üzerinden işler — bugün ödemek, geçmiş
   *  günleri geriye dönük silmez.
   *
   *  Sessiz ve pahalı bir hataydı: kullanıcı faizi girdiğini sanır, ekranda
   *  ₺0,00 görür ve gider hiç yazılmazdı.
   * ════════════════════════════════════════════════════════════════════
   */
  /**
   * ════════════════════════════════════════════════════════════════════
   *  KURUŞA YUVARLAMA — KAYAN NOKTA ARTIĞI EKRANA ÇIKMAZ (16.08.2026)
   * --------------------------------------------------------------------
   *  Canlıda ön-dolu alanda "283.33000000000004" görüldü: 583,33 − 300
   *  JavaScript'te tam çıkmıyor. Veritabanı Decimal(18,4) olduğu için
   *  KAYIT tamdı; sapma yalnız JS aritmetiğindeydi. Ham hâliyle para
   *  alanına yazılınca kullanıcı sistemin bozuk olduğunu düşünür.
   * ════════════════════════════════════════════════════════════════════
   */
  /**
   * ════════════════════════════════════════════════════════════════════
   *  KAYIT SONRASI FORM BAYAT KALMAZ (16.08.2026 canlı bulgusu)
   * --------------------------------------------------------------------
   *  Ödeme kaydedilince "Kalan ₺0,00"a düştü ama form içindeki tutar
   *  "283,33" olarak kaldı ve not satırı hâlâ "bir kısmı zaten ödenmiş"
   *  diyordu. useState ilk değeri yalnız kurulum anında okur.
   *
   *  İki kontrol: (1) sayfa formu ödeme kümesini taşıyan bir key ile
   *  kuruyor, (2) kapalı ekstrenin AYRI cümlesi var.
   * ════════════════════════════════════════════════════════════════════
   */
  kontrol(
    "kayıt değişince form yeniden kuruluyor (key ödeme kümesini taşıyor)",
    /**
     * BURADA REGEX KULLANILMAZ. İlk hâli `<OdemeFormu\s+key=\{[^}]*...\}`
     * idi ve DOĞRU kodda kırmızı yandı: key'in değeri `${anahtar}` gibi
     * süslü parantez taşıyor, desen daha ilk değişkende kırılıyor. Kaçış
     * karakterleri de araç zincirinde eriyip deseni sessizce anlamsız
     * bırakabiliyor (bkz. "yalancı yeşil", 15.08.2026). Düz metin araması
     * hem okunur hem kırılmaz.
     */
    (() => {
      const yer = sayfa.indexOf("<OdemeFormu");
      if (yer === -1) return false;
      const bas = sayfa.slice(yer, yer + 200);
      return (
        bas.includes("key=") &&
        bas.includes("donemOdemeleri.length") &&
        bas.includes("netOdenen")
      );
    })(),
  );
  kontrol(
    "kapalı ekstrenin ayrı not cümlesi var (kısmi ödeme cümlesi kullanılmıyor)",
    form.includes("kalanBorc === 0") && form.includes("onDoluKapaliNotu"),
  );
  kontrol(
    "  ...kapalı cümlesi sözlükte dolu",
    typeof tr.KartOdeme?.onDoluKapaliNotu === "string" &&
      tr.KartOdeme.onDoluKapaliNotu.length > 0,
  );
  kontrol(
    "  ...kapalı cümlesi 'bir kısmı ödenmiş' demiyor",
    !String(tr.KartOdeme?.onDoluKapaliNotu ?? "").includes("bir kısmı"),
  );

  kontrol(
    "583,33 − 300 kuruşa yuvarlanıyor (283.33000000000004 değil)",
    kurusaYuvarla(583.33 - 300) === 283.33,
    583.33 - 300,
  );
  kontrol("  ...yuvarlama tutarı bozmuyor", kurusaYuvarla(1199.66) === 1199.66);
  kontrol("  ...yukarı yuvarlama doğru", kurusaYuvarla(0.005) === 0.01);
  kontrol("  ...eksi tutarlarda da çalışıyor", kurusaYuvarla(-283.33000000000004) === -283.33);
  kontrol(
    "form ön-doluyu kuruşa yuvarlayarak yazıyor",
    form.includes("kurusaYuvarla(") && form.includes("kalanBorc.toFixed(2)"),
  );

  kontrol(
    "faiz matrahı ödeme ÖNCESİ kalan borçtan (tam ödemede sıfırlanmıyor)",
    form.includes("matrah: kalanBorc") &&
      !form.includes("matrah: ekstreBorcu - sayi(odenen)"),
  );
  kontrol(
    "  ...ekrandaki matrah notu da aynı değeri gösteriyor",
    form.includes('t("faizHesapNotu", { matrah: para(kalanBorc) })'),
  );

  /**
   * ONAY KAPISI ÜÇ HÂLİ DE TUTAR. Kontrol önce tek bir metin parçasına
   * bakıyordu (`asiyorMu) && !kapaliOnay`) ve ifadeye üçüncü bir hâl
   * eklenip satır sarınca kırmızı yandı — kod DOĞRUYKEN. Biçime değil,
   * ifadenin içeriğine bakılır.
   */
  const engelIfadesi = (() => {
    const bas = form.indexOf("const kapaliEngeli =");
    return bas === -1 ? "" : form.slice(bas, bas + 260);
  })();
  kontrol(
    "kalanı AŞAN ödeme de açık onay istiyor (kaza ihtimali)",
    engelIfadesi.includes("asiyorMu") && engelIfadesi.includes("!kapaliOnay"),
  );
  kontrol(
    "  ...zaten kapalı ekstre de aynı kapıdan geçiyor",
    engelIfadesi.includes("zatenKapali"),
  );
  /**
   * ════════════════════════════════════════════════════════════════════
   *  KESİLMEMİŞ EKSTREYE ÖDEME — ₺163.782,83'LÜK KAZA (16.08.2026)
   * --------------------------------------------------------------------
   *  Kullanıcı geçmiş ekstreleri kapatırken sekiz kartta HENÜZ KESİLMEMİŞ
   *  ekstrelere de ödeme kaydetti. Ekran hiç sormadı: her ekstrenin
   *  altında aynı "Ödendi işaretle" düğmesi vardı ve gelecek bir ekstre
   *  ile geçmiş bir ekstre ayırt edilemiyordu.
   *
   *  Yasak değil (banka erken çekebilir) ama olağan iş de değil — uyarı
   *  ve onay kapısı. Bu, "zaten kapalı"dan da ÖNCE gelen seviyedir:
   *  ödenen şey henüz var olmayan bir borçtur.
   * ════════════════════════════════════════════════════════════════════
   */
  const kesilmemisOnizleme = odemeOnizlemesi({
    ekstreBorcu: 5000,
    odenenAnaBorc: 5000,
    faiz: { yol: "yok" },
    mevcutKayitlar: [],
    kesilmisMi: false,
  });
  kontrol(
    "kesilmemiş ekstreye ödeme UYARI üretiyor",
    kesilmemisOnizleme.mukerrer.kesilmemis === true &&
      kesilmemisOnizleme.mukerrer.uyar === true,
  );
  kontrol(
    "  ...kesilmiş ekstrede ilk ödeme sessiz geçiyor",
    odemeOnizlemesi({
      ekstreBorcu: 5000,
      odenenAnaBorc: 5000,
      faiz: { yol: "yok" },
      mevcutKayitlar: [],
      kesilmisMi: true,
    }).mukerrer.uyar === false,
  );
  kontrol(
    "  ...bilgi verilmezse eski davranış korunuyor",
    odemeOnizlemesi({
      ekstreBorcu: 5000,
      odenenAnaBorc: 5000,
      faiz: { yol: "yok" },
      mevcutKayitlar: [],
    }).mukerrer.kesilmemis === false,
  );
  kontrol(
    "  ...onay kapısı kesilmemişi de tutuyor",
    engelIfadesi.includes("kesilmemis"),
  );
  kontrol(
    "  ...uyarı EN ÜSTTE (zaten kapalıdan önce)",
    form.indexOf("kesilmemisBaslik") !== -1 &&
      form.indexOf("kesilmemisBaslik") < form.indexOf("zatenKapaliBaslik"),
  );
  kontrol(
    "  ...sayfa kesim durumunu forma veriyor",
    sayfa.includes("kesilmisMi={ekstre.gecmisMi}"),
  );
  kontrol(
    "  ...aşma kendi başlığıyla KIRMIZI kartta",
    form.includes('t("asiyorBaslik"'),
  );
  kontrol(
    "ekranda mükerrer uyarısı ÜÇ KATMANLI kartla gösteriliyor",
    form.includes("<UyariKarti") && form.includes("zatenKapaliBaslik"),
  );
  kontrol(
    "  ...uyarı önizleme RAKAMLARINDAN ÖNCE geliyor",
    form.indexOf("zatenKapaliBaslik") < form.indexOf('t("onizlemeBaslik")'),
  );
  kontrol(
    "  ...ekstre kapalıyken AÇIK ONAY olmadan kaydedilemiyor",
    form.includes("kapaliEngeli") && form.includes("|| kapaliEngeli"),
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

  /**
   * ════════════════════════════════════════════════════════════════════
   *  ANA BORÇ ÖDEMESİ GİDER DEĞİLDİR — EYLEM DE BUNA UYUYOR MU
   * --------------------------------------------------------------------
   *  Yukarıdaki iki kontrol SAF KURALI sınıyor. Ama kural doğru olup
   *  eylem ona uymayabilir; oturumun dersi tam olarak bu (anayasa notu
   *  16.08.2026). Bu yüzden `odemeKaydet` içinde `expense.create`in
   *  faiz kapısının ARDINDA durduğu ayrıca doğrulanır.
   *
   *  Neden ana borç gider değil: o para ALIM maliyetinde zaten sayıldı.
   *  Ödeme anında ikinci kez gider yazılsa aynı lira iki kez kârdan
   *  düşerdi. Karta ödeme yapmak bir gider değil, borcun kapanmasıdır.
   * ════════════════════════════════════════════════════════════════════
   */
  /**
   * ════════════════════════════════════════════════════════════════════
   *  K19 — SAYFA İZNİ ÖDEME İZNİNİ KAPSAMAZ (16.08.2026)
   * --------------------------------------------------------------------
   *  Sayfayı `kart.gor` açıyordu, eylemler ise `satis.kar.gor` istiyordu.
   *  Aradaki boşlukta kullanıcı formu görüp dolduruyor, ancak KAYDET'te
   *  duvara çarpıyordu. Yazma güvendeydi; davet yanlıştı.
   *
   *  Bu kontrol iki bacağı da tutar: sayfa izni SORUYOR mu, ve sorduğu
   *  şey formu ve ters alma düğmesini gerçekten GİZLİYOR mu.
   * ════════════════════════════════════════════════════════════════════
   */
  /**
   * ════════════════════════════════════════════════════════════════════
   *  GEÇMİŞ TARİH "YAKLAŞAN" DİYE GÖSTERİLMEZ (16.08.2026)
   * --------------------------------------------------------------------
   *  Varsayım kalkınca "en yakın son ödeme" kutusu 02.02.2026 gösterdi —
   *  bugünden altı ay ÖNCE. Rakam doğruydu (sıradaki kapanmamış ekstre),
   *  ADI yanlıştı. Değer anlam değiştirince etiketin de değişmesi gerekir;
   *  aksi hâlde doğru rakam bozuk sistem izlenimi verir.
   * ════════════════════════════════════════════════════════════════════
   */
  /**
   * ════════════════════════════════════════════════════════════════════
   *  ÖDENMEMİŞ ARANMAZ, GÖRÜNÜR (16.08.2026)
   * --------------------------------------------------------------------
   *  Kullanıcı: "ödenmeyenler belli olsun, hangisinin ödenmediğini
   *  devamlı aramak zorundayım."
   *
   *  İki ayrı kusur vardı:
   *  1) Ekstre kartı GEÇMİŞ olduğu için soluklaştırılıyordu (opacity).
   *     Ölçüt yanlıştı — dikkat isteyen kayıt tam da silikleşendi.
   *     Solukluk artık KAPANMIŞ olanı takip eder.
   *  2) On kart, on sekme: hangisinde açık ekstre kaldığını görmek için
   *     hepsini tek tek açmak gerekiyordu. Artık sekmelerin ÜSTÜNDE tek
   *     liste var.
   * ════════════════════════════════════════════════════════════════════
   */
  kontrol(
    "solukluk KAPANMIŞ ekstreyi takip ediyor, geçmişi değil",
    sayfa.includes("const kapali = ekstre.kalan <= 0;") &&
      !sayfa.includes("ekstre.gecmisMi\n                                ? \"bg-muted"),
  );
  kontrol(
    "  ...durum KELİMEYLE de söyleniyor (renk tek başına yetmez)",
    sayfa.includes('t("durumOdenmedi")') &&
      sayfa.includes('t("durumKismen")') &&
      sayfa.includes('t("durumOdendi")'),
  );
  kontrol(
    "ödenmemişler kartlar arası TEK listede toplanıyor",
    sayfa.includes("const odenmemisEkstreler = kartHesaplari"),
  );
  kontrol(
    "  ...liste sekmelerin ÜSTÜNDE (aramadan görünür)",
    /**
     * VARLIK ÖNCE, SIRA SONRA. İlk hâli yalnız
     * `indexOf(a) < indexOf(b)` idi ve bu YALANCI YEŞİLDİ: metin hiç
     * yoksa `indexOf` −1 döner, −1 her şeyden küçüktür, kontrol geçer.
     * Mutasyon denemesi tam bunu gösterdi — anahtarı silmek testi
     * kırmızıya çevirmedi (16.08.2026).
     */
    (() => {
      const liste = sayfa.indexOf("odenmemisBaslik");
      const sekme = sayfa.indexOf("<SekmeliBolum");
      return liste !== -1 && sekme !== -1 && liste < sekme;
    })(),
  );
  kontrol(
    "  ...en ESKİ borç başta",
    sayfa.includes(".sort((a, b) => a.kesim.getTime() - b.kesim.getTime())"),
  );
  kontrol(
    "  ...satır kartına gidiyor (rakam çıkmaz değil)",
    sayfa.includes("href={`/kart-borcu?kart=${e.kartId}`}"),
  );
  kontrol(
    "  ...hiç ödenmemiş yoksa bölüm de yok",
    sayfa.includes("odenmemisEkstreler.length > 0 ?"),
  );

  kontrol(
    "sıradaki ödeme kutusu vadesi geçmişi İŞARETLİYOR",
    sayfa.includes("gecikmisMi:") && sayfa.includes('t("vadesiGecti")'),
  );
  kontrol(
    "  ...eski 'yaklaşan' adı kalmamış (etiket değerle uyumlu)",
    !sayfa.includes("yaklasanOdeme"),
  );
  kontrol(
    "  ...uyarı metni sözlükte dolu",
    typeof tr.KartBorcu?.vadesiGecti === "string" &&
      tr.KartBorcu.vadesiGecti.length > 0,
  );

  kontrol(
    "sayfa ödeme yetkisini ayrıca soruyor (kart.gor yetmez)",
    sayfa.includes('izinVarMi("satis.kar.gor")'),
  );
  kontrol(
    "  ...yetki yoksa form çizilmiyor",
    sayfa.includes("!odemeYetkisi ?") && sayfa.includes('tOdeme("yetkiYok")'),
  );
  kontrol(
    "  ...NEDEN çizilmediği yazıyor (sessiz kaybolma yok)",
    typeof tr.KartOdeme?.yetkiYok === "string" &&
      tr.KartOdeme.yetkiYok.length > 0,
  );
  kontrol(
    "  ...ters alma düğmesi de yetkiye bağlı",
    sayfa.includes("yetkiVar={odemeYetkisi}") &&
      satir.includes("{yetkiVar && !tersMi"),
  );

  const kapi = eylem.indexOf("if (faiz > 0 && kategoriId)");
  const yazim = eylem.indexOf("tx.expense.create");
  kontrol("odemeKaydet gideri faiz kapısının ARDINDA yazıyor", kapi !== -1);
  kontrol(
    "  ...ilk expense.create kapıdan SONRA geliyor",
    kapi !== -1 && yazim > kapi && yazim - kapi < 200,
  );

  /**
   * ════════════════════════════════════════════════════════════════════
   *  ÖNİZLEMEDEKİ "KALAN" ÖNCEKİ ÖDEMELERİ SAYAR (16.08.2026)
   * --------------------------------------------------------------------
   *  Ekranda iki farklı "kalan" görünüyordu: üstteki not "kalan borç
   *  ₺0,00" derken önizleme kutusu "Kalan ₺1.199,66" yazıyordu. İkisi de
   *  kendi tanımınca doğruydu ama aynı kelimeyle iki hesap, kullanıcıya
   *  hangisine inanacağını bıraktı.
   * ════════════════════════════════════════════════════════════════════
   */
  const oncekiliOn = odemeOnizlemesi({
    ekstreBorcu: 1199.66,
    odenenAnaBorc: 0,
    faiz: { yol: "yok" },
    mevcutKayitlar: [{ odenenAnaBorc: 1199.66 }],
  });
  kontrol(
    "kapalı ekstrede önizleme kalanı 0 (önceki ödeme sayılıyor)",
    oncekiliOn.kalan === 0,
    oncekiliOn.kalan,
  );
  kontrol(
    "  ...önceki toplam ayrı alan olarak taşınıyor",
    Math.abs(oncekiliOn.oncekiToplam - 1199.66) < 0.001,
  );

  const yarimOn = odemeOnizlemesi({
    ekstreBorcu: 1000,
    odenenAnaBorc: 300,
    faiz: { yol: "yok" },
    mevcutKayitlar: [{ odenenAnaBorc: 400 }],
  });
  kontrol(
    "400 ödenmiş ekstreye 300 daha: kalan 300 (1.000 − 400 − 300)",
    yarimOn.kalan === 300,
    yarimOn.kalan,
  );
  kontrol(
    "  ...önceki ödeme olmadan davranış değişmiyor",
    odemeOnizlemesi({
      ekstreBorcu: 1000,
      odenenAnaBorc: 300,
      faiz: { yol: "yok" },
      mevcutKayitlar: [],
    }).kalan === 700,
  );
  kontrol(
    "ekranda önceki ödeme satırı ve 'bu ödemeden sonra kalan' etiketi var",
    readFileSync("src/app/kart-borcu/odeme-formu.tsx", "utf8").includes(
      't("oncekiOdenen")',
    ) &&
      readFileSync("src/app/kart-borcu/odeme-formu.tsx", "utf8").includes(
        't("kalanSonra")',
      ),
  );

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
