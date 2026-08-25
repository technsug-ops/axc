import { readFileSync } from "node:fs";

import {
  KOD_SABLONU,
  RAF_ONEKI,
  UST_SINIR,
  kodSablonaUyuyorMu,
  kodlariUret,
  tarifiDenetle,
  uretimPlani,
  type BolumTarifi,
} from "../src/lib/depo/sablon";

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

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
