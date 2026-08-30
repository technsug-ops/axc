import { readFileSync } from "node:fs";

import {
  KOD_SABLONU,
  RAF_ONEKI,
  UST_SINIR,
  KOVA_KODU,
  kodSablonaUyuyorMu,
  kodlariUret,
  tarifiDenetle,
  yeriBilinmeyenOzeti,
  uretimPlani,
  type BolumTarifi,
} from "../src/lib/depo/sablon";
import QRCode from "qrcode";

import { code128B, code128Genisligi, code128Yol } from "../src/lib/depo/code128";
import { rafEtiketiSvg } from "../src/lib/depo/etiket";
import { yerlestirmeKarari } from "../src/lib/depo/yerlestirme";
import {
  eskiRaflar,
  gocPlani,
  kisaltmaCakismalari,
  sayimTutuyorMu,
  yeniRaflar,
  type HedefRaf,
  type KaynakRaf,
} from "../src/lib/depo/goc";

/**
 * ============================================================================
 *  DEPO ŞABLONU BEKÇİSİ (K50 ①)
 * ----------------------------------------------------------------------------
 *  ⚠ VERİTABANI YOK. Kural saf; ekran çizer, kural karar verir.
 *
 *  Komuttaki asgari mutasyon seti burada karşılanıyor:
 *  şablon dışı kod · içerik-adlı raf · göz numarasını üstten saydırma ·
 *  onaysız yazma · mevcudun üstüne yazma.
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
    console.log(
      `  HATA  ${ad}${gorulen === undefined ? "" : ` — ${JSON.stringify(gorulen)}`}`,
    );
  }
}

const TARIF: BolumTarifi = { ad: "Salon", kisaltma: "SLN", uniteSayisi: 2, gozSayisi: 3 };

// --- 1) TARİF DOĞRULAMA ----------------------------------------------------
{
  console.log("\n1) TARİF DOĞRULAMA");
  kontrol("geçerli tarif temiz", tarifiDenetle(TARIF).length === 0);
  kontrol("ad boş → hata", tarifiDenetle({ ...TARIF, ad: "  " }).includes("AD_BOS"));
  kontrol(
    "kısaltma boş → hata",
    tarifiDenetle({ ...TARIF, kisaltma: "" }).includes("KISALTMA_BOS"),
  );

  /**
   * ⚠ BARKOD GÜVENLİĞİ — SÜS DEĞİL. Bu dize basılı etiketin İÇİNE giriyor;
   * `Code128` Türkçe karakter taşıyamaz, boşluk okuma sırasında bölünme
   * riski üretir.
   */
  for (const kotu of ["sln", "SL N", "SLÇ", "SLN-", "ÇOKUZUNKISALTMA"]) {
    kontrol(
      `  kısaltma "${kotu}" REDDEDİLİR`,
      tarifiDenetle({ ...TARIF, kisaltma: kotu }).includes("KISALTMA_KURALSIZ"),
    );
  }

  kontrol("ünite 0 → hata", tarifiDenetle({ ...TARIF, uniteSayisi: 0 }).includes("UNITE_GECERSIZ"));
  kontrol("göz 0 → hata", tarifiDenetle({ ...TARIF, gozSayisi: 0 }).includes("GOZ_GECERSIZ"));
  kontrol(
    "ondalık ünite → hata",
    tarifiDenetle({ ...TARIF, uniteSayisi: 2.5 }).includes("UNITE_GECERSIZ"),
  );
}

// --- 2) KOD ÜRETİMİ --------------------------------------------------------
{
  console.log("\n2) KOD ÜRETİMİ");
  const kodlar = kodlariUret(TARIF);
  kontrol("2 ünite × 3 göz = 6 kod", kodlar.length === 6, kodlar);
  kontrol("hepsi ÖNEKLİ", kodlar.every((k) => k.startsWith(RAF_ONEKI)));
  kontrol("hepsi şablona uyuyor", kodlar.every(kodSablonaUyuyorMu), kodlar);

  /**
   * ⚠ GÖZ NUMARASI YERDEN YUKARI — 1 = EN ALT, SABİT KURAL.
   * Bu kontrol o kuralın kendisini sınıyor: ilk üretilen kod 1. ünitenin
   * 1. gözü olmalı. Üstten saysaydık `-3` ile başlardı ve üste kat eklenen
   * gün bütün etiketler kayardı.
   */
  kontrol("ilk kod 1. ünitenin 1. gözü (yerden yukarı)", kodlar[0] === "RAF-SLN1-1", kodlar[0]);
  kontrol("  ...ve son kod son ünitenin en üst gözü", kodlar[5] === "RAF-SLN2-3", kodlar[5]);
  /** ⚠ SIRA ÜNİTE→GÖZ: aynı ünitenin gözleri yan yana çıksın (A4 dizilimi). */
  kontrol(
    "  ...sıra ünite→göz",
    kodlar.slice(0, 3).every((k) => k.startsWith("RAF-SLN1-")),
    kodlar.slice(0, 3),
  );
}

// --- 3) İÇERİKTEN AD TÜRETME YASAĞI ----------------------------------------
/**
 * ⚠ KOD KONUMDAN TÜRER, İÇERİKTEN DEĞİL. `RAF-LEGO` bugün doğru görünür ve
 * raf boşaldığı gün yalan söyler. Şablon bunu yapısal olarak engelliyor:
 * kısaltmadan sonra ÜNİTE numarası ve tireli GÖZ zorunlu.
 */
{
  console.log("\n3) İÇERİK-ADLI RAF REDDEDİLİR");
  for (const kotu of ["RAF-LEGO", "RAF-OYUNCAK", "RAF-SLN", "SLN1-1", "RAF-SLN1", "raf-sln1-1"]) {
    kontrol(`  "${kotu}" şablona UYMUYOR`, !kodSablonaUyuyorMu(kotu));
  }
  kontrol('"RAF-SLN1-1" şablona uyuyor', kodSablonaUyuyorMu("RAF-SLN1-1"));
  /** ⚠ Sayı içeren kısaltma meşru — "DEPO2" bir bölüm adı olabilir. */
  kontrol('"RAF-DEPO21-4" şablona uyuyor', kodSablonaUyuyorMu("RAF-DEPO21-4"));
}

// --- 4) MEVCUDUN ÜSTÜNE YAZILMAZ -------------------------------------------
{
  console.log("\n4) MEVCUDUN ÜSTÜNE YAZILMAZ");
  const plan = uretimPlani(TARIF, ["RAF-SLN1-1", "RAF-SLN1-2"]);
  kontrol("mevcut sayılıyor", plan.mevcut.length === 2, plan.mevcut);
  kontrol("yalnız yeniler açılacak", plan.yeni.length === 4, plan.yeni);
  kontrol("  ...ve mevcut YENİ listesinde YOK", !plan.yeni.includes("RAF-SLN1-1"));
  /** ⚠ Hepsi varsa açılacak bir şey kalmaz — "kapasite artırma = EKLEME". */
  kontrol(
    "hepsi varsa yeni YOK",
    uretimPlani(TARIF, kodlariUret(TARIF)).yeni.length === 0,
  );

  /** ⚠ ÜST SINIR: kazayla 10.000 raf üretilmesin. */
  const buyuk = uretimPlani({ ...TARIF, uniteSayisi: 99, gozSayisi: 99 }, []);
  kontrol("üst sınır aşılınca işaretleniyor", buyuk.sinirAsildi, buyuk.toplam);
  kontrol("  ...normal düzende aşılmıyor", !uretimPlani(TARIF, []).sinirAsildi);
  kontrol("üst sınır sabiti makul", UST_SINIR.toplam === 2000);
}

// --- 5) EKRAN — ONAYSIZ YAZMA YOK ------------------------------------------
/**
 * ⚠ İKİ ADIM, TEK YAZMA. "Önce göster" hiçbir şey yazmaz; yazma ancak plan
 * GÖRÜLDÜKTEN sonra. Tarife yükleme ekranında (K47) sınanmış disiplin.
 */
{
  console.log("\n5) EKRAN — ONAYSIZ YAZMA YOK");
  const eylem = readFileSync("src/app/ayarlar/depo/eylemler.ts", "utf8");
  const eY = eylem.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  /** Önizleme dalı yazma çağrısı içermemeli. */
  const onizleBas = eY.indexOf("export async function depoOnizle");
  const kurBas = eY.indexOf("export async function depoyuKur");
  kontrol("iki adım da tanımlı", onizleBas >= 0 && kurBas > onizleBas);
  const onizleBlok = eY.slice(onizleBas, kurBas);
  kontrol(
    "  önizleme HİÇBİR ŞEY YAZMIYOR",
    !onizleBlok.includes("createMany") && !onizleBlok.includes(".create("),
    onizleBlok.length,
  );

  const kurBlok = eY.slice(kurBas);
  kontrol("  kurma adımı yazıyor", kurBlok.includes("createMany"));
  /** ⚠ VE YARIŞ HÂLİNDE DE ÜSTÜNE YAZMAZ. */
  kontrol("  ...skipDuplicates ile (üstüne yazmaz)", kurBlok.includes("skipDuplicates: true"));
  kontrol("  ...yalnız `yeni` listesi yazılıyor", /ozet\.yeni\.map/.test(kurBlok));
  kontrol("  izin isteniyor", /yetkiIste\("ayar\.yaz"\)/.test(eY));

  /**
   * ⚠ EKRAN KURALI KENDİ YAZMIYOR, ÇAĞIRIYOR — aynı kural iki yerde
   * yaşarsa biri gün gelip ötekinden ayrışır.
   */
  for (const cagri of ["tarifiDenetle(", "uretimPlani("]) {
    kontrol(`  ${cagri} çağrılıyor`, eY.includes(cagri));
  }

  /**
   * ⚠ "KISALTMA SONRADAN DEĞİŞMEZ" BAŞTAN SÖYLENİR (mimar şartı).
   * Kullanıcı bunu kurarken bilmeli, basılı etiketle karşılaşınca değil.
   */
  const sozluk = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Depo: Record<string, string>;
  };
  kontrol(
    "kısaltmanın DEĞİŞMEZ olduğu ekranda yazıyor",
    (sozluk.Depo.kisaltmaNotu ?? "").toUpperCase().includes("DEĞİŞ"),
  );
  /** ⚠ Göz yönünün GEREKÇESİ de ekranda — kural değil, sebebi taşınır. */
  kontrol(
    "göz yönünün SEBEBİ ekranda yazıyor",
    (sozluk.Depo.gozNotu ?? "").toLowerCase().includes("etiket"),
  );
}

// --- 6) ŞABLON SABİTİ DEĞİŞTİRİLEMEZ HÂLDE Mİ -------------------------------
{
  console.log("\n6) ŞABLON SABİTİ");
  kontrol("önek RAF-", RAF_ONEKI === "RAF-");
  kontrol("şablon deseni tanımlı", KOD_SABLONU.source.length > 10);
  /** ⚠ Şablon önek İSTİYOR — öneksiz kod raf modunu tetikleyemez. */
  kontrol("şablon öneksiz kodu reddediyor", !KOD_SABLONU.test("SLN1-1"));
}

// --- 7) RAF GÖÇÜ (K50 ⑦) ---------------------------------------------------
/**
 * ⚠ BU BİR VERİ TAŞIMA İŞİ — 1090 ürünün konum bağı söz konusu. Yanlış
 * eşleme sessizce yanlış konum üretir ve kimse fark etmez: ürün depoda
 * aranır, bulunmaz.
 */
{
  console.log("\n7) RAF GÖÇÜ");
  const KAYNAK: KaynakRaf[] = [
    { id: "e1", kod: "A5", ad: "OFİS", varyant: 6 },
    { id: "e2", kod: "A10", ad: "OFİS", varyant: 3 },
  ];
  const HEDEF: HedefRaf[] = [
    { id: "y1", kod: "RAF-OFIS1-1" },
    { id: "y2", kod: "RAF-OFIS1-2" },
  ];

  /** ⚠ ESKİ/YENİ AYRIMI ŞABLONLA — göz kararıyla değil. */
  const karisik = [...KAYNAK, ...HEDEF.map((h) => ({ ...h, ad: null, varyant: 0 }))];
  kontrol("eski raflar şablonla ayrılıyor", eskiRaflar(karisik).length === 2);
  kontrol("yeni raflar şablonla ayrılıyor", yeniRaflar(karisik).length === 2);

  const plan = gocPlani(KAYNAK, HEDEF, [
    { kaynakId: "e1", hedefId: "y1" },
    { kaynakId: "e2", hedefId: null },
  ]);
  kontrol("eşleşen taşınacak", plan.tasinacak.length === 1, plan.tasinacak);
  /** ⚠ EŞLEŞTİRİLMEYEN DOKUNULMADAN KALIR — "taşıma" varsayılan olamaz. */
  kontrol("  ...eşleştirilmeyen ATLANIR", plan.atlanacak.length === 1);
  kontrol("  ...varyant toplamı doğru", plan.varyantToplami === 6, plan.varyantToplami);

  /**
   * ⚠ İKİ KAYNAK AYNI HEDEFE GÖNDERİLEMEZ. Neredeyse her zaman yazım
   * hatasıdır ve iki fiziksel raf tek rafa çökerse ürünler karışır —
   * geri almanın yolu yoktur.
   */
  const cakisan = gocPlani(KAYNAK, HEDEF, [
    { kaynakId: "e1", hedefId: "y1" },
    { kaynakId: "e2", hedefId: "y1" },
  ]);
  kontrol(
    "iki kaynak aynı hedefe → HATA",
    cakisan.hatalar.some((h) => h.tur === "HEDEF_TEKRAR"),
    cakisan.hatalar,
  );

  /** ⚠ HEDEF ŞABLONA UYMAK ZORUNDA — eski rafa taşımak göçü anlamsız kılar. */
  const kotuHedef = gocPlani(KAYNAK, [{ id: "e2", kod: "A10" }], [
    { kaynakId: "e1", hedefId: "e2" },
  ]);
  kontrol(
    "şablona uymayan hedef → HATA",
    kotuHedef.hatalar.some((h) => h.tur === "HEDEF_SABLONA_UYMUYOR"),
    kotuHedef.hatalar,
  );

  /** ⚠ ÖNCE/SONRA SAYIM — bağ kaybı VARSAYILMAZ, ölçülür. */
  kontrol("sayım tutuyorsa geçer", sayimTutuyorMu(6, 6));
  kontrol("sayım tutmuyorsa düşer", !sayimTutuyorMu(6, 5));

  // ── SUNUCU EYLEMİ ──────────────────────────────────────────────────
  const gocEylem = readFileSync("src/app/ayarlar/depo/goc/eylemler.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  const onizleBas = gocEylem.indexOf("export async function gocuOnizle");
  const uygulaBas = gocEylem.indexOf("export async function gocuUygula");
  kontrol("iki adım da tanımlı", onizleBas >= 0 && uygulaBas > onizleBas);
  kontrol(
    "  önizleme HİÇBİR ŞEY TAŞIMIYOR",
    !gocEylem.slice(onizleBas, uygulaBas).includes("updateMany"),
  );

  const uygulaBlok = gocEylem.slice(uygulaBas);
  /** ⚠ TEK İŞLEM: yarıda kalırsa bazı ürün yeni, bazısı eski rafta olur. */
  kontrol("taşıma TEK İŞLEMDE ($transaction)", uygulaBlok.includes("$transaction"));
  /** ⚠ SAYIM TUTMAZSA GERİ ALINIR — `throw` işlemi geri sarar. */
  kontrol(
    "sayım tutmazsa GERİ ALINIYOR",
    /sayimTutuyorMu\([\s\S]{0,120}throw new Error/.test(uygulaBlok),
  );
  /** ⚠ BOŞALAN RAF SİLİNMEZ, PASİFE ALINIR. */
  kontrol("boşalan raf PASİFE alınıyor", /isActive:\s*false/.test(uygulaBlok));
  kontrol(
    "  ...ve SİLİNMİYOR",
    !uygulaBlok.includes("location.delete") && !uygulaBlok.includes("deleteMany"),
  );
  kontrol("izin isteniyor", /yetkiIste\("ayar\.yaz"\)/.test(gocEylem));
}

/**
 * ============================================================================
 *  ⑨ BÖLÜM BAĞI — ŞEMA BİR VAAT DEĞİL, YAZICISI VAR
 * ----------------------------------------------------------------------------
 *  ⛔ 30.08.2026'da `DepoBolumu` + `Location.bolumId/unite/goz` açıldı ve
 *  AYNI GÜN ölçüldü: kurulum eylemi bu sütunları YAZMIYORDU. Şema bir şey
 *  vaat ediyor, kod tutmuyordu — K52 sınıfı ("şemadaki alan da bir iddiadır;
 *  yazıcısı yoksa vaat boştur").
 *
 *  ⚠ VE PRATİK SONUCU: bölüm `Location.name` METNİYLE taşınmaya devam
 *  ediyordu, yani canlıdaki `OFİS`/`Ofis` iki-kimlik ayrışması AÇIK kalıyordu.
 *  `kisaltma @unique` ancak bu bağ kurulunca fiilen devreye giriyor.
 * ============================================================================
 */
{
  /**
   * ⚠ YORUMSUZ KODDA ARANIR — bir kuralı ANLATAN yorum, o kuralı
   * UYGULAMIŞ sayılmaz. Bu dosyada yorumlar çok uzun; desen yorumda
   * bulunsaydı ölçüt sessizce yeşil yanardı.
   */
  const yorumsuzla = (m: string) =>
    m
      .replace(/\/\*[\s\S]*?\*\//g, (x) => x.replace(/[^\n]/g, " "))
      .replace(/\/\/[^\n]*/g, (x) => x.replace(/[^\n]/g, " "));
  const kurulum = yorumsuzla(readFileSync("src/app/ayarlar/depo/eylemler.ts", "utf8"));
  const ekran = yorumsuzla(readFileSync("src/app/ayarlar/depo/page.tsx", "utf8"));

  kontrol("bölüm `DepoBolumu`ya yazılıyor", /depoBolumu\.upsert\s*\(/.test(kurulum));
  /**
   * ⚠ `upsert` ADI GÜNCELLEMEZ: aynı bölüme ikinci kez raf eklemek meşru
   * (üniteye kat eklendi) ama ad değişikliği AYRI bir karardır ve buradan
   * sessizce yapılmamalı.
   */
  kontrol("  ...ve mevcut bölümün ADI güncellenmiyor", /update:\s*\{\}/.test(kurulum));
  kontrol("raf bölüme KİMLİKLE bağlanıyor", /bolumId:\s*bolum\.id/.test(kurulum));
  kontrol(
    "ünite/göz SÜTUNA yazılıyor (sıralama/gruplama)",
    /unite:\s*Number\(m\[1\]\)/.test(kurulum) && /goz:\s*Number\(m\[2\]\)/.test(kurulum),
  );
  /** ⚠ Eşleşmezse UYDURMA SAYI değil `null` — sistem bilmediğini yazmaz. */
  kontrol(
    "  ...eşleşmezse `null` (uydurma sayı YOK)",
    /\{ unite: null, goz: null \}/.test(kurulum),
  );
  /**
   * ⭐ NORMALLEŞTİRME GİRİŞ KAPISINDA — `toUpperCase()` YETMİYORDU.
   * Türkçe `İ` `i`ye inmez; eski hâlde kullanıcı `Ofis` yazınca kısaltma
   * `OFİS` oluyor ve `KISALTMA_KURALI` onu REDDEDİYORDU.
   */
  kontrol(
    "kısaltma GİRİŞ kapısında normalleştiriliyor",
    /kisaltma:\s*kisaltmaNormalle\(/.test(kurulum),
  );
  kontrol("  ...ve `toUpperCase()` TEK BAŞINA kullanılmıyor",
    !/kisaltma:\s*String\([^)]*\)\.trim\(\)\.toUpperCase\(\)/.test(kurulum));
  /** ⚠ MEVCUT DAVRANIŞ KORUNDU — ezme yok. */
  kontrol("mevcut raf ATLANIYOR (kapasite artırma = ekleme)",
    /skipDuplicates:\s*true/.test(kurulum));

  kontrol("kurulum İZ bırakıyor", /action:\s*"DEPO_BOLUMU_KURULDU"/.test(kurulum));
  kontrol("  ...izde KULLANICI var", /userId:\s*kullaniciId/.test(kurulum));
  /**
   * ⚠ ATLANAN DA YAZILIR: "12 raf açıldı" ile "12 açıldı, 8 zaten vardı"
   * farklı hikâyelerdir; yalnız açılanı yazmak ikinci kurulumu ilk kurulum
   * gibi gösterirdi.
   */
  kontrol("  ...izde ATLANAN da var", /atlanan:\s*ozet\.mevcut\.length/.test(kurulum));

  /**
   * ⭐ İKİ HÂL BİR ARADA — VE EKRAN SÖYLÜYOR.
   * Mevcut 41 rafın `bolumId`si boş kalıyor (göç onaylanana kadar). Ekran
   * ayırmazsa bakan kişi hepsinin bağlı olduğunu sanar.
   */
  kontrol(
    "ekran BÖLÜMLÜ ve BÖLÜMSÜZ rafı AYRI gösteriyor",
    /t\("bolumeBagli"\)/.test(ekran) && /t\("bolumsuz"\)/.test(ekran),
  );
  /** ⚠ Sıfırsa çıkmaz — sönmeyen not okunmaz olur. */
  kontrol("  ...bölümsüz notu SIFIRSA çıkmıyor", /bolumsuzRaf > 0 \?/.test(ekran));
}

/**
 * ============================================================================
 *  ⑩ KISALTMA ÇAKIŞMASI — İŞARET VAR, SESSİZ BİRLEŞTİRME YOK
 * ----------------------------------------------------------------------------
 *  ⛔ CANLI ÖLÇÜM 30.08.2026: `OFİS` (13 raf) ve `Ofis` (1 raf) AYRI kayıt —
 *  aynı bölüm İKİ KİMLİK. Türkçe `İ` `i`ye inmediği için fark gözle bile
 *  zor görülüyordu.
 *
 *  ⚠ SESSİZ BİRLEŞTİRME ZATEN YOKTU (eşleme elle kuruluyor); eksik olan
 *  UYARIYDI. Bu ölçüt onun KAYBOLMAMASINI sağlıyor.
 * ============================================================================
 */
{
  console.log("\n10) KISALTMA ÇAKIŞMASI");
  /** ⭐ SAF GÖVDE ÇAĞRILIR — desen taranmaz. */
  kontrol(
    "OFİS + Ofis AYNI kısaltmaya iniyor ve ÇAKIŞMA sayılıyor",
    JSON.stringify(kisaltmaCakismalari([{ ad: "OFİS" }, { ad: "Ofis" }])) ===
      JSON.stringify([{ kisaltma: "OFIS", adlar: ["OFİS", "Ofis"] }]),
  );
  /** ⚠ TEK AD ÇAKIŞMA DEĞİLDİR — yoksa her bölüm uyarı üretirdi. */
  kontrol("tek ad → çakışma YOK", kisaltmaCakismalari([{ ad: "OFİS" }]).length === 0);
  kontrol(
    "aynı ad iki kez → çakışma DEĞİL",
    kisaltmaCakismalari([{ ad: "OFİS" }, { ad: "OFİS" }]).length === 0,
  );
  /**
   * ⚠ ADSIZ RAF KAPSAM DIŞI: adı boş olan raf bölüm iddiası TAŞIMIYOR.
   * Kod önekinden türetip çakışma saymak, olmayan bir çelişki üretirdi.
   * _(Anayasa: "sıfır üç farklı şey olabilir".)_
   */
  /**
   * ⚠ `—` VERİDE BİLEREK VAR: adsız raf ile "yalnız noktalama" ayrı hâllerdir
   * ve ikisi de kısaltmasız kalır. Bu satır olmadan kapıyı kaldıran mutasyon
   * YEŞİL kaçıyordu — eksik olan bekçi değil, örnek veriydi.
   * _(Anayasa: "mutasyon kaçıyorsa önce test verisi sorgulanır".)_
   */
  kontrol(
    "adsız VE yalnız noktalamadan ibaret adlar kapsam DIŞI",
    kisaltmaCakismalari([{ ad: null }, { ad: "  " }, { ad: "—" }, { ad: "Salon" }])
      .length === 0,
  );
  kontrol(
    "farklı bölümler çakışmaz",
    kisaltmaCakismalari([{ ad: "Salon" }, { ad: "Depo" }]).length === 0,
  );

  const gocEkran = readFileSync("src/app/ayarlar/depo/goc/page.tsx", "utf8");
  kontrol("göç ekranı ölçütü SAF GÖVDEDEN çağırıyor",
    /kisaltmaCakismalari\(hepsi\)/.test(gocEkran));
  kontrol("  ...ve çakışmayı EKRANDA gösteriyor",
    /t\("cakismaSatiri"/.test(gocEkran));
  /** ⚠ Çakışma yoksa hiç çıkmaz — sönmeyen uyarı okunmaz olur. */
  kontrol("  ...çakışma YOKSA hiç çıkmıyor", /cakismalar\.length > 0 \?/.test(gocEkran));
  /**
   * ⭐ VE METİN "SİZ SEÇİN" DİYOR — sistem hükmetmiyor.
   * `gocPlani`nin kendi gerekçesiyle aynı ilke: eşleştirmeyi depoyu bilen
   * yapar. Metin "birleştirildi" deseydi kullanıcı işin bittiğini sanardı.
   */
  const sozluk2 = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Goc: Record<string, string>;
  };
  kontrol(
    "metin HÜKMÜ KULLANICIYA bırakıyor",
    (sozluk2.Goc.cakismaSatiri ?? "").includes("siz seçin"),
  );
  kontrol(
    "  ...ve sistemin birleştirmediğini SÖYLÜYOR",
    (sozluk2.Goc.cakismaSatiri ?? "").toLowerCase().includes("birleştirmez"),
  );
}

/**
 * ============================================================================
 *  ⑪ ETİKET — ÜÇ GÖSTERİM, TEK DEĞER (K50 ②)
 * ----------------------------------------------------------------------------
 *  ⛔ ASIL RİSK: iki kodun AYRIŞMASI. Telefonla okuyan bir raf bulur, el
 *  terminaliyle okuyan başka bir raf bulur — ve ikisi de "okudu" der.
 *  Sessiz, çünkü her iki okuma da kendi içinde başarılıdır.
 *
 *  ⭐ ÖLÇÜM ÜÇ GÖSTERİMİ AYRI AYRI KAYNAĞINA BAĞLIYOR; "kodda `kod` yazıyor"
 *  diye bakmıyor. Barkod yolu bağımsız kodlanıp karşılaştırılıyor, QR gövdesi
 *  bağımsız üretilip karşılaştırılıyor, yazı birebir sınanıyor.
 * ============================================================================
 */
/**
 * ⚠ ASENKRON — `qrcode` paketi öyle çalışıyor. Bekçi CJS koştuğu için üst
 * düzey `await` YOK; özet de bu gövdenin İÇİNDE kalıyor ki ölçütler çıkış
 * kodu hesaplanmadan ÖNCE koşsun (K93).
 */
async function etiketKontrolleri() {
  console.log("\n11) ETİKET — ÜÇ GÖSTERİM, TEK DEĞER");

  const A = "RAF-SLN3-2";
  const B = "RAF-OFIS12-4";

  /**
   * ⭐ ALTIN DEĞER — DIŞ OKUYUCUYLA ÇAPRAZLANMIŞ.
   * Bu modül dizisi 30.08.2026'da `zxing-wasm` okuyucusuna verildi ve
   * `RAF-SLN3-2` olarak birebir okundu. Yani sabit, kendi kodlayıcımızın
   * beyanı değil — BAĞIMSIZ bir çözücünün onayladığı çıktı.
   * _(Anayasa: "kendi kendini doğrulayan ölçüm ölçüm değildir".)_
   */
  const ALTIN_A =
    "2112142311311113231323111221322131131321311133212211321221322232113221122331112";
  const sonucA = code128B(A);
  kontrol(
    "Code128 çıktısı DIŞ OKUYUCUYLA doğrulanmış altın değerde",
    sonucA.olur && sonucA.moduller.join("") === ALTIN_A,
  );
  /** ⚠ Sağlama basamağı kodun İÇİNDE — dizeyi bozan mutasyon çıktıyı değiştirir. */
  kontrol(
    "farklı kod → farklı barkod (sabit çizim yok)",
    (() => {
      const b = code128B(B);
      return sonucA.olur && b.olur && sonucA.moduller.join("") !== b.moduller.join("");
    })(),
  );
  /** ⛔ Geçersiz karakter SESSİZCE ATLANMAZ. */
  kontrol(
    "ASCII dışı karakter REDDEDİLİYOR",
    (() => {
      const s = code128B("RAF-ŞUBE-1");
      return !s.olur && s.sebep === "GECERSIZ_KARAKTER";
    })(),
  );
  kontrol("boş kod REDDEDİLİYOR", (() => {
    const s = code128B("");
    return !s.olur && s.sebep === "BOS";
  })());

  const etiketA = await rafEtiketiSvg(A);
  const etiketB = await rafEtiketiSvg(B);

  /**
   * ═══ BAĞ ① — BARKOD, ETİKETİN KODUNU TAŞIYOR ═══════════════════════════
   * Etiketin içindeki `<path>`, `A` için BAĞIMSIZ kodlanan yolla birebir
   * aynı olmalı. `code128B(kod + "X")` gibi bir mutasyon buradan kaçamaz.
   */
  const yolA = /<path d="([^"]+)"/.exec(etiketA)?.[1] ?? "";
  const modulSayisiA = sonucA.olur ? code128Genisligi(sonucA.moduller) : 1;
  const beklenenYolA = sonucA.olur
    ? code128Yol(sonucA.moduller, (50 * 0.56) / modulSayisiA)
    : "";
  kontrol("BARKOD etiketin KENDİ kodunu taşıyor", yolA !== "" && yolA === beklenenYolA);

  /**
   * ═══ BAĞ ② — QR, AYNI DİZEYİ TAŞIYOR ══════════════════════════════════
   * QR gövdesi, `A` için BAĞIMSIZ üretilen QR ile birebir aynı olmalı.
   * ⚠ Buradaki ölçüt "QR var mı" DEĞİL: `QRCode.toString(kod + "-QR")` gibi
   * bir mutasyon "QR var" ölçütünden geçerdi ve iki kod sessizce ayrışırdı.
   */
  const qrBagimsiz = await QRCode.toString(A, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
  });
  const qrGovdeBagimsiz =
    /<svg[^>]*viewBox="[^"]+"[^>]*>([\s\S]*)<\/svg>/.exec(qrBagimsiz)?.[1] ?? "";
  kontrol(
    "QR etiketin KENDİ kodunu taşıyor (zengin veri YOK)",
    qrGovdeBagimsiz !== "" && etiketA.includes(qrGovdeBagimsiz),
  );

  /** ═══ BAĞ ③ — OKUNABİLİR YAZI AYNI DİZE ══════════════════════════════ */
  const yaziA = /<text[^>]*>([^<]+)<\/text>/.exec(
    etiketA.slice(etiketA.indexOf("<text")),
  )?.[1];
  kontrol("okunabilir YAZI aynı dize", yaziA === A);

  /** ⚠ ÜÇÜ DE DEĞİŞMELİ: biri sabit çizilse ötekiler onu örterdi. */
  kontrol(
    "farklı kod → ÜÇ gösterim de değişiyor",
    (() => {
      const yolB = /<path d="([^"]+)"/.exec(etiketB)?.[1] ?? "";
      return yolA !== yolB && !etiketB.includes(qrGovdeBagimsiz) && etiketB.includes(B);
    })(),
  );

  /**
   * ⛔ BOŞ KÂĞIT YASAK (İlke #5): basılamayan kod NİYE basılamadığını yazar.
   * Yoksa operatör eksik etiketi ancak duvarda fark eder.
   */
  const bozuk = await rafEtiketiSvg("RAF-ŞUBE-1");
  kontrol("basılamayan kod SEBEBİNİ yazıyor", /BASILAMADI/.test(bozuk));
  kontrol("  ...ve sebebi de basıyor", /GECERSIZ_KARAKTER/.test(bozuk));

  /**
   * ═══ DIŞ SERVİS YASAĞI ════════════════════════════════════════════════
   * ⚠ ÖLÇÜT YORUMSUZ KODDA ARANIR: yasağı ANLATAN yorum, yasağı ÇİĞNEMİŞ
   * sayılmaz. `code128.ts` başlığındaki "DIŞ SERVİS YOK" cümlesi `http`
   * içermiyor ama ileride içerebilir.
   */
  const yorumsuz = (m: string) =>
    m.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  for (const yol of [
    "src/lib/depo/code128.ts",
    "src/lib/depo/etiket.ts",
    "src/app/ayarlar/konumlar/etiketler/page.tsx",
  ]) {
    const m = yorumsuz(readFileSync(yol, "utf8"));
    kontrol(
      `dış servis çağrısı YOK — ${yol.split("/").pop()}`,
      !/\bfetch\s*\(|https?:\/\/(?!www\.w3\.org)/.test(m),
    );
  }
  /** ⭐ Kodlayıcı BAĞIMSIZ: hiçbir şey içeri almıyor, dolayısıyla hiçbir şeye bağlı değil. */
  kontrol(
    "Code128 kodlayıcısının HİÇ içe aktarması yok",
    !/^\s*import\s/m.test(readFileSync("src/lib/depo/code128.ts", "utf8")),
  );

  /** ═══ EKRAN GERÇEKTEN BU GÖVDEYİ ÇAĞIRIYOR MU ════════════════════════ */
  const etiketEkran = readFileSync(
    "src/app/ayarlar/konumlar/etiketler/page.tsx",
    "utf8",
  );
  kontrol(
    "etiket ekranı ORTAK gövdeyi çağırıyor",
    /await rafEtiketiSvg\(konum\.code\)/.test(etiketEkran),
  );
  /**
   * ⛔ EKRAN KENDİ QR'INI ÜRETEMEZ. Eskiden `QRCode.toString` doğrudan
   * buradaydı; kalsaydı etiket iki ayrı yerden çizilir ve biri Code128
   * öğrenirken öteki öğrenmezdi.
   */
  kontrol(
    "  ...ve kendi QR'ını ÜRETMİYOR",
    !/QRCode\.toString/.test(etiketEkran),
  );
  /** ⚠ Bölüm adı ETİKETE basılmaz — kimlik koddur, ad değişebilir. */
  kontrol("bölüm adı etikete DEĞİL, yalnız ekrana basılıyor",
    /print:hidden[\s\S]{0,120}etiket\.name|etiket\.name[\s\S]{0,200}print:hidden/.test(
      etiketEkran,
    ));

  /**
   * ==========================================================================
   *  ⑫ YERİ BİLİNMEYEN ÜRÜNLER — TUTANAK, SAYI CANLI (K50 ③)
   * --------------------------------------------------------------------------
   *  ⛔ CANLI 30.08.2026: 969 varyant `DEPO` kovasında, 1'i konumsuz —
   *  katalogun ~%88'i. Hiçbir ekranda yazmıyordu.
   *
   *  ⚠ KULLANICI ŞARTI: sayı SABİT YAZILMAZ, canlı ölçülür. Sabit bir "969"
   *  ilk yerleştirmede yalan söylerdi ve ilerleme görünmezdi.
   * ==========================================================================
   */
  console.log("\n12) YERİ BİLİNMEYEN — TUTANAK");

  /** ⭐ SAF GÖVDE ÇAĞRILIR. */
  const o1 = yeriBilinmeyenOzeti(969, 1, 1103);
  kontrol("kovadaki + konumsuz TEK rakama toplanıyor", o1.bilinmeyen === 970);
  kontrol("  ...ve bileşim KAYBOLMUYOR", o1.kovada === 969 && o1.konumsuz === 1);
  kontrol("oran katalogun tamamına göre", o1.yuzde === 87.9, o1.yuzde);
  /**
   * ⚠ KONUMSUZ ARM'I DÜŞÜREN MUTASYON BURADAN KAÇAMAZ: 969 ile 970 farklı.
   * Örnek veride konumsuz 1 OLMASI şart — 0 olsaydı iki hâl ayrışmazdı.
   * _(Anayasa: "örnek veri ayrımın iki yakasını göstermeli".)_
   */
  kontrol(
    "konumsuz kayıt SAYIYA GİRİYOR",
    yeriBilinmeyenOzeti(5, 3, 100).bilinmeyen === 8,
  );
  /** ⛔ `NaN%` ekranda "sistem bozuk" demektir. */
  kontrol("boş katalogda oran 0 — NaN DEĞİL", yeriBilinmeyenOzeti(0, 0, 0).yuzde === 0);
  kontrol("hepsi biliniyorsa 0", yeriBilinmeyenOzeti(0, 0, 500).bilinmeyen === 0);
  kontrol("kova kodu sabiti", KOVA_KODU === "DEPO");

  const depoEkran = readFileSync("src/app/ayarlar/depo/page.tsx", "utf8");
  const depoY = depoEkran
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  kontrol("ekran SAF gövdeyi çağırıyor", /yeriBilinmeyenOzeti\(/.test(depoY));
  /**
   * ⛔ SAYI CANLI SORGUDAN GELİR. Ölçüt `count(` çağrısına bağlı — kovadaki
   * ürünü SAYAN sorgu silinip yerine sabit konsaydı ekran ilerlemeyi hiç
   * göstermezdi.
   */
  kontrol(
    "  ...kovadaki ürün CANLI sayılıyor",
    /locationId: kova\.id/.test(depoY) && /productVariant\.count\(/.test(depoY),
  );
  kontrol(
    "  ...konumsuz ürün de CANLI sayılıyor",
    /locationId: null/.test(depoY),
  );
  kontrol("  ...kova KODLA bulunuyor", /code: KOVA_KODU/.test(depoY));
  /** ⛔ SABİT SAYI YASAK — bugünkü rakamlardan biri koda gömülemez. */
  kontrol(
    "ekranda SABİT sayı yok (969 · 970 · 1103)",
    !/\b(969|970|1103)\b/.test(depoY),
  );
  /** ⚠ Sıfırsa hiç çıkmaz — sönmeyen tutanak okunmaz olur. */
  kontrol(
    "sıfırsa tutanak HİÇ çıkmıyor",
    /yerSiz\.bilinmeyen > 0 \?/.test(depoEkran),
  );
  /** ⭐ Ve bileşim EKRANDA — tek rakam kalsaydı konumsuz kayıt kaybolurdu. */
  kontrol(
    "bileşim ekranda yazıyor",
    /t\("yeriBilinmeyenBilesim"/.test(depoEkran),
  );
  const sozluk3 = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Depo: Record<string, string>;
  };
  /**
   * ⚠ METİN AZALACAĞINI SÖYLER: kullanıcı bunu kapatılamaz bir borç
   * sanmamalı. Kapatma yolu olmayan madde, kutunun tamamına olan güveni
   * eritir (K49).
   */
  kontrol(
    "metin sayının AZALACAĞINI söylüyor",
    (sozluk3.Depo.yeriBilinmeyen ?? "").toLowerCase().includes("azalır"),
  );
  kontrol(
    "  ...ve oranı katalogla ilişkilendiriyor",
    (sozluk3.Depo.yeriBilinmeyen ?? "").includes("{yuzde}"),
  );

  /**
   * ==========================================================================
   *  ⑬ YERLEŞTİRME — OKUT-KOY (K50 ④)
   * --------------------------------------------------------------------------
   *  ⭐ KARAR SAF GÖVDEDE; bekçi onu ÇAĞIRIYOR, kaynak taramıyor.
   *  (Anayasa: "saf hesap katmanı desen tarayan bekçiye muhtaç olmaz".)
   * ==========================================================================
   */
  console.log("\n13) YERLEŞTİRME — OKUT-KOY");

  const RAF_A = "raf-a";
  const RAF_B = "raf-b";

  /** ⭐ ÜRÜN ÖNCE — sıra ölçüldü (çakışma 0/41 canlıda). */
  kontrol(
    "kod hem ürün hem raf ise ÜRÜN kazanır",
    yerlestirmeKarari({
      varyantVar: true,
      varyantKonumId: null,
      rafVar: true,
      seciliRafId: RAF_A,
    }).tur === "URUN_YERLESTIR",
  );
  /**
   * ⛔ RAF SEÇİLMEDEN ÜRÜN SESSİZ GEÇMEZ. Yutulsaydı operatör okutur, hiçbir
   * şey olmaz ve "sistem bozuk" derdi — kullanıcının menü vakasında tam
   * olarak bu yaşandı.
   */
  kontrol(
    "raf seçilmeden ürün okunursa SEBEBİ söylenir",
    yerlestirmeKarari({
      varyantVar: true,
      varyantKonumId: RAF_A,
      rafVar: false,
      seciliRafId: null,
    }).tur === "RAF_SECILMEDI",
  );
  /** ⭐ AYNI RAF AYRI SÖYLENİR — "taşındı" demek yanlış bilgi olurdu. */
  kontrol(
    "zaten o rafta olan ürün AYNI RAF işaretleniyor",
    (() => {
      const k = yerlestirmeKarari({
        varyantVar: true,
        varyantKonumId: RAF_A,
        rafVar: false,
        seciliRafId: RAF_A,
      });
      return k.tur === "URUN_YERLESTIR" && k.ayniRaf;
    })(),
  );
  kontrol(
    "başka raftaki ürün AYNI RAF sayılmıyor",
    (() => {
      const k = yerlestirmeKarari({
        varyantVar: true,
        varyantKonumId: RAF_B,
        rafVar: false,
        seciliRafId: RAF_A,
      });
      return k.tur === "URUN_YERLESTIR" && !k.ayniRaf;
    })(),
  );
  /** ⚠ HİÇ KONUMU OLMAYAN ÜRÜN "AYNI RAF" DEĞİLDİR — `null` bir raf değil. */
  kontrol(
    "konumsuz ürün AYNI RAF sayılmıyor",
    (() => {
      const k = yerlestirmeKarari({
        varyantVar: true,
        varyantKonumId: null,
        rafVar: false,
        seciliRafId: RAF_A,
      });
      return k.tur === "URUN_YERLESTIR" && !k.ayniRaf;
    })(),
  );
  /** ⭐ RAF ETİKETİ OKUNUNCA RAF DEĞİŞİR (İlke #9). */
  kontrol(
    "raf etiketi okunursa SEÇİLİ RAF değişir",
    yerlestirmeKarari({
      varyantVar: false,
      varyantKonumId: null,
      rafVar: true,
      seciliRafId: RAF_A,
    }).tur === "RAF_DEGISTIR",
  );
  kontrol(
    "ne ürün ne raf → BULUNAMADI",
    yerlestirmeKarari({
      varyantVar: false,
      varyantKonumId: null,
      rafVar: false,
      seciliRafId: RAF_A,
    }).tur === "BULUNAMADI",
  );

  /* ═══ SUNUCU EYLEMİ ══════════════════════════════════════════════════ */
  const yEylem = readFileSync("src/app/yerlestir/actions.ts", "utf8");
  const yY = yEylem
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  kontrol("eylem KURALI ÇAĞIRIYOR, kendi yazmıyor", /yerlestirmeKarari\(\{/.test(yY));
  /**
   * ⛔ İZİN HER EYLEMDE AYRI SORULUR — SAYIM DEĞİL, BLOK BAZINDA.
   *
   * ⚠ İLK YAZIMDA DOSYA GENELİNDE ARANIYORDU VE MUTASYON KAÇTI: desen İKİ
   * yerde geçiyor (`rafiSec` ve `koduIsle`); birini `stok.gor`a çeviren
   * mutasyon ötekini buldu ve bekçi yeşil kaldı. Yazma yolu korumasız
   * kalırdı ve kimse görmezdi.
   * _(Anayasa: "aynı desen birden çok yerde geçiyorsa her yeri ayrı sına".)_
   */
  const eylemBloku = (ad: string) => {
    const bas = yY.indexOf(`export async function ${ad}(`);
    if (bas < 0) return "";
    const son = yY.indexOf("\nexport ", bas + 10);
    return yY.slice(bas, son < 0 ? yY.length : son);
  };
  for (const ad of ["rafiSec", "koduIsle"]) {
    const blok = eylemBloku(ad);
    kontrol(`${ad} tanımlı`, blok.length > 0);
    kontrol(
      `  ...ve KENDİ içinde izin istiyor`,
      /yetkiIste\("stok\.duzelt"\)/.test(blok),
    );
  }
  /** ⚠ ARAMA KURALI ORTAK KAYNAKTAN — ayrı liste yazılsa kural ayrışırdı. */
  kontrol("arama ORTAK kuraldan (`kodKosulu`)", /OR: kodKosulu\(temiz\)/.test(yY));
  /**
   * ⛔ STOK DEFTERİNE DOKUNULMAZ. Bu ekran konum yazar, adet yazmaz —
   * `StockMovement` yazsaydı sayım koruması kapsamına girerdi ve sayılmış
   * bir rafı sessizce düşürebilirdi.
   */
  kontrol(
    "stok hareketi YAZILMIYOR",
    !/stockMovement\.(create|createMany|update)/.test(yY),
  );
  /**
   * ⭐ İZ — ESKİ VE YENİ BİRLİKTE (kullanıcı şartı).
   *
   * ⛔ ÖLÇÜT ÇAĞRININ SATIRINA BAĞLI, ADINA DEĞİL. İlk yazımda
   * `/auditLog\.create\(\{/` aranıyordu ve mutasyon KAÇTI: çağrıyı
   * `if (false) await …` yapan senaryoda dal hiç çalışmıyor ama desen
   * dosyada duruyor. Satır başına bağlanınca kırmızı yandı.
   * _(Anayasa: "koşul öldürülür, desen kalır".)_
   */
  kontrol(
    "iz KOŞULSUZ yazılıyor (ölü dalda değil)",
    /^\s*await prisma\.auditLog\.create\(\{$/m.test(yY),
  );
  /**
   * ⛔ ALANLAR İZİN KENDİ BLOĞUNDA ARANIR. Dosya genelinde arandığında
   * mutasyon kaçtı: `oncekiKod:` cevap TİPİNDE de geçiyor, izden silinse
   * bile desen ayakta kalıyordu.
   *
   * ⚠ PENCERE ÖLÇÜLDÜ (30.08.2026): iz bloğu **458** karakter, pencere 700.
   * Gövde büyürse dar pencere sessizce körelir; bu yüzden ölçü yazılıyor ve
   * blok uzarsa buradan güncellenir.
   */
  const izBas = yY.indexOf("await prisma.auditLog.create({");
  const izBloku = izBas < 0 ? "" : yY.slice(izBas, izBas + 700);
  for (const alan of ["oncekiKonumId:", "oncekiKod:", "yeniKonumId:", "yeniKod:"]) {
    kontrol(`  ...iz \`${alan}\` taşıyor`, izBloku.includes(alan));
  }
  /**
   * ⛔ HEDEF RAF SUNUCUDA DOĞRULANIR. İstemciden gelen kimliğe güvenilseydi
   * ekran açıkken pasife alınmış bir rafa ürün yazılır ve kaybolurdu.
   */
  kontrol(
    "hedef raf sunucuda YENİDEN okunuyor",
    /location\.findUnique\(\{[\s\S]{0,120}where: \{ id: seciliRafId \}/.test(yY),
  );
  kontrol("  ...ve pasif raf REDDEDİLİYOR", /if \(!hedef\.isActive\)/.test(yY));

  /* ═══ EKRAN ══════════════════════════════════════════════════════════ */
  const yEkran = readFileSync("src/app/yerlestir/yerlestirici.tsx", "utf8");
  /**
   * ⛔ OKUNAN DEĞER DURUMDAN OKUNMAZ. Kamera `setKod` çağırıp hemen işlemi
   * tetiklerse durum HENÜZ ESKİ değeri taşır ve yanlış ürün yanlış rafa
   * gider. Ölçüt: işleyen gövdeler PARAMETRE alıyor.
   */
  for (const gövde of ["rafOkut", "urunOkut"]) {
    kontrol(
      `${gövde} okunan değeri PARAMETRE alıyor`,
      new RegExp(`const ${gövde} = \\(okunan\\?: string\\)`).test(yEkran),
    );
    kontrol(
      `  ...ve durumu yalnız YEDEK olarak kullanıyor`,
      new RegExp(`const aranacak = \\(okunan \\?\\? \\w+\\)\\.trim\\(\\)`).test(yEkran),
    );
  }
  /** ⚠ Raf kimliği de yazımdan ÖNCE yakalanır — ardışık okumada kaymasın. */
  kontrol(
    "raf kimliği çağrı ÖNCESİ yakalanıyor",
    /const hedefId = raf\?\.id \?\? null;\s*\n\s*basla\(/.test(yEkran),
  );
  /** ⛔ ÇIPLAK `<input>` YASAK — kamera ortak bileşenden gelir (İlke #7). */
  kontrol("kod kutuları ORTAK okuyucuyu kullanıyor",
    (yEkran.match(/<BarkodGirisi/g) ?? []).length === 2);
  kontrol("  ...çıplak input YOK", !/<input\b/i.test(yEkran));
  /** ⚠ ESKİ YER EKRANDA — yanlış rafa okutulduğu fark edilebilsin. */
  kontrol("geçmişte ÖNCEKİ yer yazıyor", /t\("tasindi", \{ onceki:/.test(yEkran));
  kontrol("  ...ve `zaten bu rafta` ayrı söyleniyor", /t\("zatenBuRafta"\)/.test(yEkran));

  /* ═══ ULAŞILABİLİRLİK — EKRAN MENÜDE ═════════════════════════════════ */
  /**
   * ⛔ MENÜDE OLMAYAN EKRAN TESLİM EDİLMİŞ SAYILMAZ. Adres var, sayfa
   * çiziliyor, kimse bulamıyor.
   * _(Anayasa: "kural doğru mu değil, kural teslim edilebilir mi".)_
   */
  const katalog = readFileSync("src/lib/menu/katalog.ts", "utf8");
  kontrol("menü katalogunda adresi var", /yerlestir: "\/yerlestir"/.test(katalog));
  kontrol("  ...ve katalog kalemi var", /anahtar: "yerlestir"/.test(katalog));
  kontrol(
    "  ...GÜNLÜK grupta (ayarlara gömülmemiş)",
    /\{ anahtar: "yerlestir", varsayilanGrup: null \}/.test(katalog),
  );
  kontrol(
    "  ...ikonu var",
    /yerlestir: \w+,/.test(readFileSync("src/components/app-sidebar.tsx", "utf8")),
  );
  const sozluk4 = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Menu: Record<string, string>;
  };
  kontrol("  ...menü metni var", (sozluk4.Menu.yerlestir ?? "").length > 0);
  console.log("");
  console.log("=".repeat(70));
  if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
  else {
    console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
    process.exitCode = 1;
  }
  console.log("");
}

/**
 * ⛔ REDDEDİLEN SÖZ DE KIRMIZI YANAR: gövde patlarsa çıkış kodu hiç yazılmaz
 * ve bekçi SESSİZCE yeşil görünürdü — ölçmediğini bilmeden.
 */
etiketKontrolleri().catch((e: unknown) => {
  console.log(`
⛔ BEKÇİ KOŞAMADI — ${String(e instanceof Error ? e.stack : e)}`);
  process.exitCode = 1;
});
