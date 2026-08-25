/**
 * ============================================================================
 *  EL KİTABI — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run el-kitabi:dogrula
 *
 *  ⚠ NİYE VAR. El kitabı ekran ADI ve menü YOLU iddia eder: "Sol menü →
 *  Fiyat denemesi". Bu bir İDDİADIR ve anayasanın kuralı nettir: gösterdiğin
 *  yol var olan bir ekrana mı gidiyor? Bir menü öğesi yeniden adlandırılırsa
 *  ya da bir sayfa taşınırsa kılavuz SESSİZCE yanlış olur — ve kılavuzu
 *  okuyan kişi, sistemin bozuk olduğunu sanır.
 *
 *  Veritabanına GİTMEZ; kaynak metni okur.
 * ============================================================================
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let gecen = 0;
let kalan = 0;

function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(
      `  HATA  ${ad}${gorulen === undefined ? "" : ` — ${JSON.stringify(gorulen)}`}`,
    );
  }
}

const KAYNAK = readFileSync("src/lib/el-kitabi/icerik.ts", "utf8");
const SOZLUK = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
  Menu: Record<string, string>;
};
const MENU_ADLARI = new Set(Object.values(SOZLUK.Menu));

console.log("\nEL KİTABI — DOĞRULAMA\n");

// --- 1) İÇİNDEKİLER ↔ BÖLÜM: her bağlantı bir yere gitmeli ------------------
{
  console.log("1) İÇİNDEKİLER ↔ BÖLÜM");
  /**
   * ⚠ İKİ YÖNLÜ. Yalnız "her bölümün başlığı var mı" diye bakmak yetmez:
   * içindekilerde olup gövdede olmayan bir kimlik, tıklayınca HİÇBİR YERE
   * gitmeyen bir bağlantı üretir — ve sayfa hata vermediği için fark edilmez.
   */
  const listedekiler = [
    ...KAYNAK.matchAll(/\{ kimlik: "([a-zA-Z]+)", ad: "/g),
  ].map((m) => m[1]!);
  const govdedekiler = [...KAYNAK.matchAll(/<section id="([a-zA-Z]+)">/g)].map(
    (m) => m[1]!,
  );
  kontrol("bölüm listesi okundu", listedekiler.length > 10, listedekiler.length);
  kontrol(
    "gövde bölümleri okundu",
    govdedekiler.length > 10,
    govdedekiler.length,
  );

  const eksikGovde = listedekiler.filter((k) => !govdedekiler.includes(k));
  const fazlaGovde = govdedekiler.filter((k) => !listedekiler.includes(k));
  kontrol(
    "içindekilerdeki her bölümün GÖVDESİ var",
    eksikGovde.length === 0,
    eksikGovde,
  );
  kontrol(
    "gövdedeki her bölüm İÇİNDEKİLERDE var",
    fazlaGovde.length === 0,
    fazlaGovde,
  );

  /** Sıra da aynı olmalı — numaralar `baslik()` içinde sıradan üretiliyor. */
  kontrol(
    "sıra aynı (kayarsa içindekiler yanlış numara gösterir)",
    listedekiler.join(",") === govdedekiler.join(","),
    { liste: listedekiler.slice(0, 3), govde: govdedekiler.slice(0, 3) },
  );

  /** Her bölüm kendi başlığını çağırmalı — yoksa numarasız bölüm doğar. */
  const basliklar = [...KAYNAK.matchAll(/\$\{baslik\("([a-zA-Z]+)"\)\}/g)].map(
    (m) => m[1]!,
  );
  const basliksiz = listedekiler.filter((k) => !basliklar.includes(k));
  kontrol("her bölüm baslik() çağırıyor", basliksiz.length === 0, basliksiz);
}

// --- 2) MENÜ ADLARI GERÇEK Mİ ----------------------------------------------
{
  console.log("");
  console.log("2) MENÜ ADLARI — kılavuz var olmayan ekrana yollamıyor");
  /**
   * ⚠ TESLİM EDİLEBİLİRLİK. "Sol menü → X" bir yol tarifidir; X sözlükteki
   * menü adlarından biri değilse kullanıcı o adı menüde ARAR ve bulamaz.
   * Bu deponun en pahalı derslerinden biri: kural doğru olabilir ama teslim
   * edilemez olabilir.
   */
  const gecenler = [...KAYNAK.matchAll(/menü → ([^<.,]+)/gu)].map((m) =>
    m[1]!.replace(/<\/?strong>|<\/?em>/g, "").trim(),
  );
  kontrol("menü göndermesi bulundu", gecenler.length > 0, gecenler.length);
  const bulunmayan = gecenler.filter((a) => !MENU_ADLARI.has(a));
  kontrol(
    "her menü göndermesi SÖZLÜKTEKİ bir menü adı",
    bulunmayan.length === 0,
    bulunmayan,
  );
}

// --- 2b) MENÜDEKİ HER SAYFA ANLATILIYOR MU ---------------------------------
{
  console.log("");
  console.log("2b) MENÜ KAPSAMI — menüdeki her sayfanın bölümü var mı");
  /**
   * ⚠ KULLANICI KARARI 22.08.2026: "el kitabında menü barda mevcut bulunan
   * TÜM sayfalar açıklanmalı."
   *
   * Bu kontrol olmadan kılavuz ekranın gerisinde SESSİZCE kalır — ve tam
   * bu oldu: son iki haftada eklenen on ekranın hiçbiri kitapta yoktu,
   * kimse fark etmedi. Menü kaynaktan okunuyor; elle tutulan bir liste
   * aynı hatayı tekrar üretirdi.
   */
  const KENAR = readFileSync("src/components/app-sidebar.tsx", "utf8");
  /**
   * ⚠ MENÜ ÖĞESİ = BİR YERE GİDEN ÖĞE. Desen 22.08.2026'da daraltıldı:
   * menü sıklığa göre gruplanınca grup BAŞLIKLARI da `anahtar:` taşımaya
   * başladı ("Para", "Tanımlar"…) ve bu kontrol onları da sayfa sanıp
   * "kılavuzda anlatılmamış" dedi. Başlık bir sayfa değildir; ölçüt
   * `href`in VARLIĞIDIR, adın biçimi değil.
   */
  const menuAnahtarlari = [
    ...KENAR.matchAll(/anahtar: "([a-zA-Z]+)",\s*href:/g),
  ].map((m) => m[1]!);
  kontrol(
    "menü kaynaktan okundu",
    menuAnahtarlari.length > 20,
    menuAnahtarlari.length,
  );

  /** İçerik modülündeki eşleme — `MENU_BOLUM`. */
  const eslemeBlok = KAYNAK.slice(
    KAYNAK.indexOf("export const MENU_BOLUM"),
    KAYNAK.indexOf("const iki = (n: number)"),
  );
  kontrol("MENU_BOLUM eşlemesi bulundu", eslemeBlok.length > 200, eslemeBlok.length);

  const eslenen = new Map<string, string | null>();
  for (const m of eslemeBlok.matchAll(/^\s{2}([a-zA-Z]+): (?:"([a-zA-Z]+)"|null),/gm)) {
    eslenen.set(m[1]!, m[2] ?? null);
  }

  /**
   * ⚠ ÜÇ AYRI KUSUR, ÜÇÜ AYRI SAYILIR — "kapsanmadı" tek kefeye konsaydı
   * en güçlü kanıt en zayıfla aynı ağırlığa inerdi.
   */
  const eslenmemis = menuAnahtarlari.filter((a) => !eslenen.has(a));
  kontrol(
    "menüdeki her sayfa MENU_BOLUM'de eşlenmiş",
    eslenmemis.length === 0,
    eslenmemis,
  );

  const govdedekiler = [...KAYNAK.matchAll(/<section id="([a-zA-Z]+)">/g)].map(
    (m) => m[1]!,
  );
  const hedefiYok = [...eslenen.entries()]
    .filter(([, b]) => b !== null && !govdedekiler.includes(b))
    .map(([a, b]) => `${a} -> ${b}`);
  kontrol(
    "her eşlemenin hedef bölümü GERÇEKTEN var",
    hedefiYok.length === 0,
    hedefiYok,
  );

  /** Menüde olmayan bir anahtar eşlemede duruyorsa eşleme bayatlamış. */
  const fazlalik = [...eslenen.keys()].filter(
    (a) => !menuAnahtarlari.includes(a),
  );
  kontrol("eşlemede menüde OLMAYAN anahtar yok", fazlalik.length === 0, fazlalik);
}

// --- 2c) ŞAHSİLEŞTİRME YOK -------------------------------------------------
{
  console.log("");
  console.log("2c) ŞAHSİLEŞTİRME — kitap kurulumun KİMLİĞİNİ yazmıyor");
  /**
   * ⚠ KULLANICI DÜZELTMESİ 22.08.2026: "el kitabı bu firmaya özel olmuş, bu
   * şekilde uygun değil. Şahsileştirmeden yapılmalı; firmanın kanal
   * hesapları var, raf sistemiyle ilgili bilgiler var."
   *
   * Anayasa: "firma adları yalnızca VERİ olabilir, YAPI olamaz." Belge
   * mağaza adlarını, kişi adlarını, raf kodlarını ve satış sayılarını
   * basıyordu; yani başkasına gösterilemez, ürün belgesi olarak
   * kullanılamaz hâldeydi.
   *
   * ⚠ TEK SEFERLİK TEMİZLİK YETMEZ. Bir kez çıkarmak, yarın birinin
   * "zaten veritabanında var" deyip geri koymasını engellemez. Kural
   * kapıya bağlandı: bu alanlar TİPTE olamaz, bu tablolar veri katmanında
   * SORGULANAMAZ. Sorgulanmayan veri yazılamaz.
   */
  const VERI = readFileSync("src/lib/el-kitabi/veri.ts", "utf8");

  /** Tipte bulunmaması gereken alanlar — hepsi kurulum kimliği taşır. */
  const YASAK_ALAN = [
    "raflar",
    "kanalHesaplari",
    "kdvKategorileri",
    "giderKategorileri",
    "kargoFirmalari",
    "kanalSkuOzeti",
    "eslenmemisVaryant",
    "sayimlar",
    "tedarikciler",
    "kullanicilar",
  ];
  const tiptekiler = YASAK_ALAN.filter((a) =>
    new RegExp(`^\\s{2}${a}[?]?:`, "m").test(VERI),
  );
  kontrol(
    "kurulum kimliği taşıyan alan TİPTE yok",
    tiptekiler.length === 0,
    tiptekiler,
  );

  /**
   * ⚠ VE SORGUSU DA YOK. Alanı tipten çıkarıp sorguyu bırakmak, veriyi
   * "az kalsın" hâlde tutar; biri onu yeniden bağlar. Okunmayan veri
   * okunmaz.
   */
  const YASAK_SORGU = [
    "prisma.location.",
    "prisma.channelAccount.",
    "prisma.category.",
    "prisma.expenseCategory.",
    "prisma.cargoCarrier.",
    "prisma.user.",
    "prisma.product.",
    "prisma.productVariant.",
    "prisma.sale.",
    "prisma.channelSku.",
  ];
  const sorgulanan = YASAK_SORGU.filter((q) => VERI.includes(q));
  kontrol(
    "kurulum kimliği veri katmanında SORGULANMIYOR",
    sorgulanan.length === 0,
    sorgulanan,
  );

  /**
   * İçerik tarafı da bu alanlara dokunmamalı — tip zaten engeller ama
   * hata mesajı burada ÇOK daha anlaşılır çıkar.
   */
  const icerikte = YASAK_ALAN.filter((a) => KAYNAK.includes(`veri.${a}`));
  kontrol("içerik bu alanları OKUMUYOR", icerikte.length === 0, icerikte);

  /**
   * Kalanın ne olduğu da yazılsın: pazaryeri kuralları KALIR, çünkü onlar
   * firma bilgisi değil — Trendyol'un 13,19 TL sabit gideri kimseye özel
   * değildir.
   */
  kontrol(
    "pazaryeri kesinti kuralları KALDI (bunlar firma bilgisi değil)",
    VERI.includes("kanalKesintileri") && VERI.includes("cezaTarifeleri"),
  );
}

// --- 3) BOŞ BÖLÜM YOK -------------------------------------------------------
{
  console.log("");
  console.log("3) BOŞ BÖLÜM YOK");
  /**
   * ⚠ Başlığı olup gövdesi olmayan bölüm, içindekilerde söz verip karşılığını
   * vermez. Okuyan "eksik mi kaldı" der ve belgeye güveni gider.
   */
  const bloklar = KAYNAK.split(/<section id="/).slice(1);
  const kisalar = bloklar
    .map((b) => ({ id: b.slice(0, b.indexOf(String.fromCharCode(34))), uzunluk: b.length }))
    .filter((b) => b.uzunluk < 400);
  kontrol(
    "her bölümün gövdesi var (>400 karakter)",
    kisalar.length === 0,
    kisalar,
  );
}

// --- 4) ANLATIM ÖĞELERİ KULLANILIYOR ----------------------------------------
{
  console.log("");
  console.log("4) ANLATIM ÖĞELERİ — 'bir aptalın anlayacağı' yapı");
  /**
   * Kullanıcı 21.08.2026: "kılavuzu derinleştir, bir aptalın anlayacağı şekle
   * getir, gerekirse ekran fotoğraflarıyla anlat." Fotoğraf ÜRETİLEMİYOR
   * (tarayıcı otomasyonu yok, karar 08.08.2026); yerine ekran ŞEMASI
   * çiziliyor. Öğeler kullanılmazsa yapı kâğıt üstünde kalır.
   */
  for (const [ad, desen] of [
    ["ekran şeması", "${ekranSemasi("],
    ["'ne zaman buraya gelirim'", "${neZaman("],
    ["'sık yapılan hata'", "${sikHata("],
  ] as const) {
    const sayi = KAYNAK.split(desen).length - 1;
    kontrol(`${ad} kullanılıyor`, sayi >= 3, sayi);
  }

  /**
   * ⚠ TOPLAM SAYI ZAYIF BİR ÖLÇÜTTÜR. "En az 3 tane olsun" keyfî bir eşik:
   * on bölümden yedisi boşalsa bile yeşil kalırdı ve mutasyon denemesinde
   * tam bu görüldü. Ölçüt sayıdan BÖLÜME çevrildi — günlük kullanılan her
   * ekranın "ne zaman buraya gelirim" cümlesi olmak zorunda, çünkü ilk kez
   * gören birinin ilk sorusu odur.
   *
   * Liste bilerek DAR: kılavuzun her bölümü günlük iş değildir (sözlük,
   * yol haritası, "sistem nasıl düşünür"). Kapsamı geniş tutmak, kuralı
   * anlamsız yere kırmızı yakan bir törene çevirirdi.
   */
  const GUNLUK_BOLUMLER = [
    "panel",
    "urun",
    "komisyon",
    "alim",
    "satis",
    "iade",
    "deneme",
    "kart",
    "gider",
    "hakedis",
    "talep",
  ];
  const bolumGovdesi = (kimlik: string): string => {
    const bas = KAYNAK.indexOf(`<section id="${kimlik}">`);
    if (bas < 0) return "";
    const son = KAYNAK.indexOf("<section id=", bas + 20);
    return KAYNAK.slice(bas, son < 0 ? undefined : son);
  };
  const nezamansiz = GUNLUK_BOLUMLER.filter(
    (k) => !bolumGovdesi(k).includes("${neZaman("),
  );
  kontrol(
    "günlük kullanılan her bölümde 'ne zaman buraya gelirim' var",
    nezamansiz.length === 0,
    nezamansiz,
  );
}

// --- 5) EKRAN ŞEMASI GERÇEK BİR SAYFAYI TARİF EDİYOR ------------------------
{
  console.log("");
  console.log("5) EKRAN ŞEMALARI — tarif edilen sayfa VAR mı");
  /**
   * ⚠ ŞEMANIN BAŞLIĞI DA BİR İDDİADIR. "Fiyat denemesi" diye bir şema çizip o
   * ekran yoksa, kılavuz olmayan bir yeri tarif eder.
   */
  const semaBasliklari = [
    ...KAYNAK.matchAll(/\$\{ekranSemasi\("([^"]+)"/g),
  ].map((m) => m[1]!);
  kontrol("şema bulundu", semaBasliklari.length >= 3, semaBasliklari.length);
  const tanimsiz = semaBasliklari.filter(
    (b) => !MENU_ADLARI.has(b.split("→")[0]!.trim()),
  );
  kontrol("her şemanın kökü bir MENÜ öğesi", tanimsiz.length === 0, tanimsiz);
}

// --- 6) ROTALAR --------------------------------------------------------------
{
  console.log("");
  console.log("6) ROTALAR — anlatılan ekran gerçekten var");
  const sayfalar: string[] = [];
  const gez = (yol: string) => {
    for (const ad of readdirSync(yol)) {
      const tam = join(yol, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (ad === "page.tsx") sayfalar.push(tam.replace(/\\/g, "/"));
    }
  };
  gez("src/app");
  kontrol("uygulama sayfaları tarandı", sayfalar.length > 20, sayfalar.length);
  for (const [ad, yol] of [
    ["El kitabının kendi sayfası", "src/app/el-kitabi/page.tsx"],
    ["Panel", "src/app/page.tsx"],
    ["Fiyat denemesi", "src/app/simulasyon/page.tsx"],
    ["Kârlılık kartı", "src/app/kart/page.tsx"],
    ["Kart Borcu", "src/app/kart-borcu/page.tsx"],
    ["Hakediş", "src/app/hakedis/page.tsx"],
    ["Tazminat", "src/app/tazminat/page.tsx"],
    ["Nakit takvimi", "src/app/nakit-takvimi/page.tsx"],
    ["Envanter değeri", "src/app/envanter-degeri/page.tsx"],
    ["Komisyon aktarma", "src/app/kanal-sku/komisyon-aktar/page.tsx"],
    ["Destek talepleri", "src/app/talepler/page.tsx"],
  ] as const) {
    kontrol(`  ${ad}`, sayfalar.includes(yol));
  }
}

// --- 7) ULAŞIM — kılavuza her ekrandan gidilebiliyor mu --------------------
{
  console.log("");
  console.log("7) ULAŞIM — üst çubuktaki kısayol");
  /**
   * ⚠ KULLANICI 22.08.2026: kılavuz üst çubuğa kısayol olarak konsun.
   * Gerekçe basit ama önemli: kılavuza tam olarak "bir şeyi bilmediğin
   * anda" ihtiyaç duyulur. O an sol menüyü açıp aramak, kılavuza hiç
   * bakmamakla aynı kapıya çıkar (İlke #9: az tıkla). Menüde de duruyor
   * ama menü mobilde kapalı.
   */
  const DUZEN = readFileSync("src/app/layout.tsx", "utf8");
  /**
   * ⚠ DESENİ KULLANIM BLOĞUNDA ARA. "el-kitabi" dizesi bu dosyada bir kez
   * geçiyor ama işaret bağlantının KENDİSİNE bağlandı; yorumda geçen bir
   * söz yeşil yakmasın.
   */
  kontrol(
    "üst çubukta /el-kitabi bağlantısı var",
    DUZEN.includes('href="/el-kitabi"'),
  );
  /**
   * ⚠ İKON TEK BAŞINA KONUŞMAZ. Anayasa kısıtı: renk ya da ikon tek başına
   * bilgi taşıyamaz — ekran okuyucu ve dokunmatik ipucu olmadan kitap
   * simgesi "bu ne" sorusunu cevapsız bırakır.
   */
  kontrol(
    "  ...ekran okuyucu etiketi var",
    /href="\/el-kitabi"[\s\S]{0,120}aria-label=/.test(DUZEN),
  );
  kontrol(
    "  ...etiket SÖZLÜKTEN geliyor (koda gömülü değil)",
    /aria-label=\{ortak\("elKitabiKisayolu"\)\}/.test(DUZEN),
  );
  const SOZ = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Ortak: Record<string, string>;
  };
  kontrol(
    "  ...sözlük anahtarı dolu",
    (SOZ.Ortak.elKitabiKisayolu ?? "").trim() !== "",
    SOZ.Ortak.elKitabiKisayolu,
  );
  /** Mobilde 44 px dokunma hedefi (İlke #8). */
  kontrol(
    "  ...mobilde 44 px dokunma hedefi",
    /href="\/el-kitabi"/.test(DUZEN) && DUZEN.includes("size-11 shrink-0 md:size-8"),
  );
}

// --- 8) GİDER BÖLÜMÜ — SORULAN SORULARIN CEVABI YAZILI MI ------------------
/**
 * ⚠ NİYE VAR: kullanıcı 25.08.2026'da sordu — _"KDV yazmayın diyor; KDV
 * çıkmadığı zaman ödenen damga vergisi var, 791 TL, onu yazıyor muyuz? Bir de
 * gelir vergisini yazıyor muyuz? Kitapta detay yok."_ Kitap gerçekten
 * susuyordu ve kullanıcı doğru soruyu sorup cevapsız kaldı.
 *
 * ⚠ ÖLÇÜT BÖLÜME DARALTILIYOR, dosyanın tamamına değil: "damga vergisi" gibi
 * bir ifade kitabın başka bir yerinde geçse bekçi yeşil yanardı ve gider
 * bölümü boş kalırdı. (Beş kez düşülen tuzak.)
 */
{
  console.log("");
  console.log("8) GİDER BÖLÜMÜ — vergi ve ödeme yöntemi anlatılıyor mu");
  const bas = KAYNAK.indexOf('<section id="gider">');
  const son = KAYNAK.indexOf("<section id=", bas + 20);
  const bolum = bas < 0 ? "" : KAYNAK.slice(bas, son < 0 ? undefined : son);
  kontrol("gider bölümü okundu", bolum.length > 500, bolum.length);

  /**
   * ⚠ HANGİ VERGİ NEREYE — kullanıcının sorduğu şey birebir bu.
   *
   * ⚠ VE İŞARET SATIRA BAĞLI, KELİMEYE DEĞİL — BU KONTROL BİR KEZ KÖR ÇIKTI
   * (25.08.2026). İlk hâli bölümde `"Damga vergisi"` arıyordu; ölçüldü ki
   * ifade bölümde ÜÇ KEZ geçiyor (tablo satırı · dikkat kutusu · sık hata).
   * Tablo satırını silen mutasyon YEŞİL geçti: desen ötekilerde ayaktaydı.
   * Anayasa tablosundaki ikinci bozulma biçimi — _"aynı desen birden çok
   * yerde geçer; birini bozan mutasyon ötekini ayakta bırakır."_
   *
   * Doğrusu: satırları AYIRIP her satırın KENDİ hükmünü sınamak.
   */
  const satirlar = [...bolum.matchAll(/<tr>([^]*?)<\/tr>/g)].map((m) =>
    [...m[1]!.matchAll(/<td>([^]*?)<\/td>/g)].map((h) => h[1]!),
  );
  /**
   * ⚠ ANAHTAR İLK HÜCREDE ARANIR, SATIRIN TAMAMINDA DEĞİL — VE BU KONTROL
   * ÜÇÜNCÜ DENEMEDE TUTTU. İkinci hâli satırın tamamında arıyordu; MTV
   * satırının GEREKÇE hücresinde _"Damga vergisiyle aynı mantık"_ yazıyor.
   * Damga satırını silen mutasyon MTV satırını buluyor, o da EVET/0 taşıdığı
   * için bekçi YEŞİL kalıyordu. Kalem adı satırın KİMLİĞİDİR; gerekçe metni
   * değil.
   */
  const satirBul = (anahtar: string) =>
    satirlar.find((h) => (h[0] ?? "").includes(anahtar)) ?? [];

  for (const [ad, anahtar, hukum] of [
    ["damga vergisi satırı YAZILIR diyor", "Damga vergisi", "EVET"],
    ["ödenen gelir vergisi satırı YAZILIR diyor", "Ödediğiniz gelir vergisi", "EVET"],
    ["ödenecek KDV satırı YAZILMAZ diyor", "Ödenecek KDV", "HAYIR"],
    ["stopaj satırı YAZILMAZ diyor", "Stopaj", "HAYIR"],
  ] as const) {
    const satir = satirBul(anahtar);
    /** ⚠ HÜKÜM İKİNCİ HÜCREDEDİR ("yazılır mı") — üçüncü, dördüncü değil. */
    kontrol(
      ad,
      satir.length >= 2 && satir[1]!.includes(`<strong>${hukum}</strong>`),
      satir[0]?.slice(0, 70),
    );
  }

  /**
   * ⚠ KDV ORANI 0 — ve bu, hükmün AYRILMAZ parçası. Damga vergisine %20
   * yazılırsa 791 TL'nin 131 TL'si "indirilecek KDV" sanılır ve net'ten
   * eksik düşer. Kontrol, oranı SATIRIN İÇİNDE arar.
   */
  {
    const satir = satirBul("Damga vergisi");
    /** ⚠ ORAN ÜÇÜNCÜ HÜCREDE — satırın herhangi bir yerinde değil. */
    kontrol(
      "  ...ve AYNI SATIRIN KDV hücresinde 0 yazıyor",
      satir.length >= 3 && satir[2]!.includes("<strong>0</strong>"),
      satir[2],
    );
  }

  /**
   * ⚠ FARK BLOĞU: kâr motorunun REDDEDİLMİŞ varsayımsal %15'i ile fiilen
   * ödenen gelir vergisi ayrı şeylerdir. Ayrım yazılmazsa kullanıcı ikisini
   * tek şey sanar ve ya gerçek vergiyi yazmaz ya olmayan bir kesinti arar.
   */
  kontrol(
    "varsayımsal %15 ile ÖDENEN vergi AYRIMI yazılı",
    bolum.includes("%15 gelir vergisi") && bolum.includes("kullanılmıyor"),
  );

  /** ⚠ KART + TAKSİT AKIŞI — kullanıcının kendi anlattığı sırayla. */
  kontrol(
    "kartla ödeme akışı yazılı (kart borcuna girer)",
    bolum.includes("Nasıl ödendi?") && bolum.includes("kart listesi"),
  );
  kontrol(
    "  ...ve 'bankada sonradan böldürme' akışı yazılı",
    bolum.includes("böldürürsünüz") && bolum.includes("taksit sayısını"),
  );
  /** ⚠ PARA BİRİMİ ÇEVRİLMEZ ve atlanan SAYILIR — sessizce düşmez. */
  kontrol(
    "para birimi kuralı yazılı (atlanan sayılır)",
    bolum.includes("kur çevirmez") && bolum.includes("atlanan"),
  );
  /** ⚠ "BELİRTİLMEDİ" NE DEMEK — boşluk hata değil, bilgi yokluğu. */
  kontrol(
    "'Belirtilmedi'nin anlamı yazılı",
    bolum.includes("Belirtilmedi") && bolum.includes("hata değil"),
  );
  kontrol(
    "  ...ve kartın varlığından yöntem ÇIKARILMADIĞI yazılı",
    bolum.includes("çıkarmaz"),
  );
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
