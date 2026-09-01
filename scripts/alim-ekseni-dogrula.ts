import { readFileSync } from "node:fs";
import {
  ALIM_EKSENLERI,
  VARSAYILAN_EKSEN,
  alimEkseniCoz,
  eksenAlani,
  eksenAnahtari,
  otekiEksen,
} from "../src/lib/alim-ekseni";

/**
 * ============================================================================
 *  ALIM TARİH EKSENİ BEKÇİSİ (K114, 01.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run alim-ekseni:dogrula
 *
 *  ⛔ NİYE: bu seçici, ekranın HANGİ SORUYA baktığını değiştiriyor. Sessizce
 *  bozulursa kullanıcı doğru listeyi yanlış eksende arar — 31.08.2026'da tam
 *  bu yaşandı ve "bugün teslim aldıklarım çıkmıyor" diye bildirildi.
 *
 *  ⭐ SAF GÖVDE ÇAĞRILIYOR; kaynak taraması yalnız ZİNCİR için — ve o bölüm
 *  K121'de bir Halil testi düştüğü için var (gövdeler çalışıyordu, kimse
 *  onları çağırmıyordu).
 * ============================================================================
 */

const BOLUM_SAYISI = 3;
const kosanBolumler: string[] = [];
let gecen = 0;
let kalan = 0;

function yakin(ad: string, olculen: unknown, beklenen: unknown) {
  const a = JSON.stringify(olculen);
  const b = JSON.stringify(beklenen);
  if (a === b) gecen += 1;
  else {
    kalan += 1;
    console.log(`  HATA  ${ad}`);
    console.log(`      beklenen: ${b}`);
    console.log(`      ölçülen : ${a}`);
  }
}
const dogru = (ad: string, k: boolean) => yakin(ad, k, true);

console.log("\nALIM TARİH EKSENİ BEKÇİSİ");
console.log("=".repeat(60));

// --- 1) EKSEN ÇÖZÜMÜ ----------------------------------------------------
console.log("\n1) eksen çözümü — varsayılan mevcut davranışı korur");
{
  /**
   * ⛔ VARSAYILAN `siparis` OLMAK ZORUNDA. Ekran bugüne kadar `purchasedAt`e
   * bakıyordu; varsayılan `kabul` yapılsaydı eski bağlantılar ve alışkanlıklar
   * SESSİZCE başka bir küme gösterirdi.
   */
  yakin("varsayılan sipariş", VARSAYILAN_EKSEN, "siparis");
  yakin("boş değer varsayılana düşer", alimEkseniCoz(null), "siparis");
  yakin("tanınmayan değer varsayılana düşer", alimEkseniCoz("saçma"), "siparis");
  yakin("geçerli değer aynen döner", alimEkseniCoz("kabul"), "kabul");
  yakin("iki eksen tanımlı", [...ALIM_EKSENLERI], ["siparis", "kabul"]);
}
kosanBolumler.push("çözüm");

// --- 2) ALAN VE ÖTEKİ EKSEN ---------------------------------------------
console.log("\n2) alan eşlemesi ve öteki eksen");
{
  /**
   * ⛔ ALAN ADI TEK GÖVDEDEN: süzgeç `receivedAt`e bakıp sıralama
   * `purchasedAt`te kalsaydı liste DOĞRU kümeyi YANLIŞ sırada gösterir ve
   * "mal kabul sırasına bak" cümlesi sessizce yalan olurdu.
   */
  yakin("sipariş → purchasedAt", eksenAlani("siparis"), "purchasedAt");
  yakin("kabul → receivedAt", eksenAlani("kabul"), "receivedAt");
  /** ⚠ İKİ ALAN AYRI OLMAK ZORUNDA — aynı olsalardı seçici hiçbir şey yapmaz. */
  dogru(
    "iki eksen FARKLI alana bakıyor",
    eksenAlani("siparis") !== eksenAlani("kabul"),
  );
  yakin("öteki eksen — sipariş", otekiEksen("siparis"), "kabul");
  yakin("öteki eksen — kabul", otekiEksen("kabul"), "siparis");
  /** ⚠ Öteki eksenin ötekisi KENDİSİ olmalı; yoksa boş sonuç açıklaması döner. */
  yakin("ötekinin ötekisi kendisi", otekiEksen(otekiEksen("kabul")), "kabul");
  yakin("sözlük anahtarı — sipariş", eksenAnahtari("siparis"), "eksenSiparis");
  yakin("sözlük anahtarı — kabul", eksenAnahtari("kabul"), "eksenKabul");
  /** ⛔ İKİ EKSEN AYNI ANAHTARI KULLANAMAZ — ekranda ikisi de aynı yazardı. */
  dogru(
    "iki eksenin sözlük anahtarı FARKLI",
    eksenAnahtari("siparis") !== eksenAnahtari("kabul"),
  );
}
kosanBolumler.push("alan");

// --- 3) ZİNCİR — SEÇİCİ EKRANA GERÇEKTEN BAĞLI MI -----------------------
console.log("\n3) zincir — seçici ekrana ve süzgece BAĞLI mı");
{
  /**
   * ⛔ BU BÖLÜM K121'DE BİR HALİL TESTİ DÜŞTÜĞÜ İÇİN VAR. Orada tur 98/98
   * yeşildi ve kutu ekranda YOKTU: bütün ölçütler saf gövdeyi sınıyordu,
   * gövdeler kusursuz çalışıyordu ve kimse onları ÇAĞIRMIYORDU.
   * _(Anayasa: "sınanmamış ekran, ekran değildir"; "zincir halkalarının
   * varlığıyla değil BAĞLANTISIYLA sınanır".)_
   *
   * ⚠ YORUMSUZ KODDA ARANIR: bir davranışı ANLATAN yorum, o davranışın
   * gerçekleştiğini göstermez.
   */
  const yorumsuz = (m: string) =>
    m.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  const suzgec = yorumsuz(readFileSync("src/lib/liste-suzgeci.ts", "utf8"));
  dogru("süzgeç ekseni ÇÖZÜYOR", suzgec.includes("alimEkseniCoz("));
  /** ⛔ SABİT ALAN ADI KALMAMALI: `purchasedAt:` çıplak yazılıysa eksen etkisiz. */
  dogru(
    "süzgeçte ÇIPLAK purchasedAt koşulu YOK",
    !/purchasedAt:\s*pencere\.aralik/.test(suzgec),
  );
  dogru("süzgeç alanı GÖVDEDEN alıyor", suzgec.includes("eksenAlani(eksen)"));
  dogru("süzgeç ekseni DÖNDÜRÜYOR", /return \{ kosul, pencere, eksen \}/.test(suzgec));

  const ekran = yorumsuz(readFileSync("src/app/alimlar/page.tsx", "utf8"));
  dogru("ekran ekseni ALIYOR", /const \{ kosul, pencere, eksen \}/.test(ekran));
  /**
   * ⛔ SIRALAMA DA EKSENİ İZLEMELİ — ve bu AYRI sınanıyor: süzgeç doğru,
   * sıralama sabit kalsaydı liste doğru kümeyi yanlış sırada gösterirdi.
   */
  dogru(
    "sıralama ekseni İZLİYOR",
    /orderBy: \{ \[eksenAlani\(eksen\)\]: "desc" \}/.test(ekran),
  );
  /** ⛔ SEÇİCİ SÜZGEÇ ÇUBUĞUNDA — gövde varken ekranda yoksa kullanılamaz. */
  dogru("seçici süzgeç çubuğunda ÇİZİLİYOR", /ad: "eksen"/.test(ekran));
  /** ⛔ BOŞ SONUÇ KENDİNİ ANLATIYOR — kullanıcı şartı. */
  dogru(
    "boş sonuç ÖTEKİ EKSENİ söylüyor",
    ekran.includes("bosEksenAciklamasi"),
  );
  dogru(
    "boş sonuç kabulsüz alımları BEYAN ediyor",
    ekran.includes("bosKabulsuzUyarisi"),
  );
  /** ⚠ VE EKSEN ARAMADA/EXCEL'DE KAYBOLMAMALI. */
  dogru("eksen form parametrelerinde TAŞINIYOR", /eksen: p\.eksen/.test(ekran));
}
kosanBolumler.push("zincir");

console.log("\n" + "=".repeat(60));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — ${kosanBolumler.length}/${BOLUM_SAYISI} bölüm. Sonuç GEÇERSİZ.`,
  );
  process.exit(1);
}
if (kalan === 0) {
  console.log(`OK  ${gecen}/${gecen} ölçüt geçti (${BOLUM_SAYISI} bölüm)`);
  process.exit(0);
}
console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
process.exit(1);
