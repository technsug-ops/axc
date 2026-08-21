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

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
