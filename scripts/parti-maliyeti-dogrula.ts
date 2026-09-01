import { readFileSync } from "node:fs";

import { maliyetDuzeltmePlani } from "../src/lib/parti-maliyeti";

/**
 * ============================================================================
 *  PARTİ MALİYETİ DÜZELTME BEKÇİSİ (K127, 01.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run parti-maliyeti:dogrula
 *
 *  ⛔ NİYE: bu yol DEFTERİN MALİYET TARAFINA yazıyor ve geçmiş satışların
 *  NET'ini değiştiriyor. Sessizce bozulursa kâr yanlışa döner ve ekranda
 *  "makul" görünür.
 *
 *  ⭐ ÇOĞU ÖLÇÜT SAF GÖVDEYİ ÇAĞIRIP DEĞERİNİ SINIYOR; kaynak taraması
 *  yalnız zincir için (gövde doğru olup ekrana bağlanmazsa hiçbir şey
 *  değişmez — K121 dersi).
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

const PARTI = {
  hareketId: "p1",
  birimMaliyet: "340",
  birimMaliyetParaBirimi: "TRY" as const,
  girenAdet: 15,
};
const CIKISLAR = [
  { hareketId: "c1", adet: 1, birimMaliyet: "340", saleItemId: "k1", saleId: "s1" },
  { hareketId: "c2", adet: 1, birimMaliyet: "340", saleItemId: "k2", saleId: "s1" },
  { hareketId: "c3", adet: 2, birimMaliyet: "340", saleItemId: "k3", saleId: "s2" },
  /** ⚠ SATIŞA BAĞLI OLMAYAN ÇIKIŞ — iade/düzeltme. Damgalanır ama tazelenmez. */
  { hareketId: "c4", adet: 1, birimMaliyet: "340", saleItemId: null, saleId: null },
];

console.log("\nPARTİ MALİYETİ DÜZELTME BEKÇİSİ");
console.log("=".repeat(62));

// --- 1) KAPILAR — NE YAZILAMAZ ------------------------------------------
console.log("\n1) kapılar — hangi durumda yazılmaz");
{
  const kur = (maliyet: string, sebep = "fatura 759,90") =>
    maliyetDuzeltmePlani({
      parti: PARTI,
      yeniMaliyetMetni: maliyet,
      paraBirimi: "TRY",
      sebep,
      cikislar: CIKISLAR,
    });

  /**
   * ⛔ SIFIR DA GEÇERSİZ. "Maliyeti bilmiyorum" demek `0` değil `null`dır;
   * bu ekranın işi düzeltmek, bilinmezliğe çevirmek başka bir karar.
   * _(Anayasa: varsayılan değer alanın anlamından türetilir.)_
   */
  yakin("boş maliyet reddedilir", kur("").redler, ["MALIYET_GECERSIZ"]);
  yakin("sıfır reddedilir", kur("0").redler, ["MALIYET_GECERSIZ"]);
  yakin("negatif reddedilir", kur("-5").redler, ["MALIYET_GECERSIZ"]);
  yakin("harf reddedilir", kur("abc").redler, ["MALIYET_GECERSIZ"]);
  /** ⛔ SEBEPSİZ DÜZELTME İZİ ANLAMSIZ KILAR — üç ay sonra "niye" sorusu. */
  yakin("sebepsiz reddedilir", kur("759,90", "  ").redler, ["SEBEP_BOS"]);
  /**
   * ⛔ AYNI DEĞER YAZILMAZ — VE KARŞILAŞTIRMA KURUŞUNA. `Decimal` → float
   * kuyruğu boş bir yazım turu başlatırdı. Tolerans değil, BİRİM SEÇİMİ.
   */
  yakin("aynı maliyet reddedilir", kur("340").redler, ["MALIYET_AYNI"]);
  yakin("kuruş kuyruğu aynı sayılır", kur("340,001").redler, ["MALIYET_AYNI"]);
  yakin("bir kuruş fark YAZILABİLİR", kur("340,01").yazilabilir, true);
  /** ⛔ PARA BİRİMİ OLMADAN "kuruşuna eşit" karşılaştırması anlamsız. */
  yakin(
    "para birimsiz parti reddedilir",
    maliyetDuzeltmePlani({
      parti: { ...PARTI, birimMaliyetParaBirimi: null },
      yeniMaliyetMetni: "759,90",
      paraBirimi: null,
      sebep: "x",
      cikislar: CIKISLAR,
    }).redler,
    ["PARA_BIRIMI_YOK"],
  );
  /** ⚠ İKİ HATA BİRDEN SAYILIR — kullanıcı ikisini de görsün, tek tek değil. */
  yakin("iki hata birlikte döner", kur("", "  ").redler, [
    "MALIYET_GECERSIZ",
    "SEBEP_BOS",
  ]);
}
kosanBolumler.push("kapılar");

// --- 2) PLANIN İÇERİĞİ ---------------------------------------------------
console.log("\n2) plan — neyi kapsıyor, ne kadar etkiliyor");
{
  const p = maliyetDuzeltmePlani({
    parti: PARTI,
    yeniMaliyetMetni: "759,90",
    paraBirimi: "TRY",
    sebep: "alım faturası",
    cikislar: CIKISLAR,
  });
  dogru("plan yazılabilir", p.yazilabilir);
  yakin("virgüllü giriş okunur", p.yeniMaliyet, "759.9");
  yakin("eski değer korunur", p.eskiMaliyet, "340");
  /**
   * ⛔ ÇIKIŞLARIN HEPSİ DAMGALANIR — yalnız satışa bağlı olanlar değil.
   * İade/düzeltme çıkışı da o partinin maliyetini taşıyor; biri güncellenip
   * öteki bırakılsaydı aynı parti iki farklı maliyetle okunurdu.
   */
  yakin("dört çıkışın DÖRDÜ de damgalanır", p.damgalanacakCikislar, [
    "c1",
    "c2",
    "c3",
    "c4",
  ]);
  /** ⚠ SATIŞLAR TEKİL: bir satışın iki kalemi aynı partiden çekebilir. */
  yakin("satışlar tekilleşir", p.tazelenecekSatislar, ["s1", "s2"]);
  yakin("etkilenen adet toplanır", p.etkilenenAdet, 5);
  /**
   * ⛔ İŞARET ANLAMLI: pozitif = maliyet arttı = kâr DÜŞECEK. Ekran bunu
   * açıkça yazmak zorunda; "düzelttim" deyip NET'in sessizce düşmesi
   * sürpriz olurdu.
   */
  yakin("fark = (yeni − eski) × adet", p.maliyetFarkiToplam, 2099.5);
  const dusen = maliyetDuzeltmePlani({
    parti: PARTI,
    yeniMaliyetMetni: "100",
    paraBirimi: "TRY",
    sebep: "x",
    cikislar: CIKISLAR,
  });
  dogru("maliyet düşerse fark NEGATİF", dusen.maliyetFarkiToplam < 0);
  /** ⚠ HİÇ ÇIKIŞI OLMAYAN PARTİ DE DÜZELTİLEBİLİR — stokta bekleyenler. */
  const cikissiz = maliyetDuzeltmePlani({
    parti: PARTI,
    yeniMaliyetMetni: "759,90",
    paraBirimi: "TRY",
    sebep: "x",
    cikislar: [],
  });
  dogru("çıkışsız parti yazılabilir", cikissiz.yazilabilir);
  yakin("çıkışsızda tazelenecek satış yok", cikissiz.tazelenecekSatislar, []);
  yakin("çıkışsızda fark sıfır", cikissiz.maliyetFarkiToplam, 0);
}
kosanBolumler.push("plan");

// --- 3) ZİNCİR — GÖVDE EKRANA VE YAZIMA BAĞLI MI ------------------------
console.log("\n3) zincir — gövde yazıma ve ekrana BAĞLI mı");
{
  /**
   * ⛔ K121 DERSİ: tur 98/98 yeşilken kutu ekranda YOKTU. Gövdeler kusursuz
   * çalışıyordu ve kimse onları ÇAĞIRMIYORDU.
   * ⚠ YORUMSUZ KODDA ARANIR: bir davranışı ANLATAN yorum, o davranışın
   * gerçekleştiğini göstermez.
   */
  const yorumsuz = (m: string) =>
    m.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  const eylem = yorumsuz(
    readFileSync("src/app/stok/parti-maliyet-actions.ts", "utf8"),
  );
  dogru("eylem saf planı ÇAĞIRIYOR", eylem.includes("maliyetDuzeltmePlani({"));
  /** ⛔ KAPI: bu iş defterin maliyet tarafına yazıyor. */
  dogru("yetki isteniyor", eylem.includes('yetkiIste("stok.duzelt")'));
  /** ⛔ ONAY KUTUSU OLMADAN YAZILMAZ — kullanıcı şartı, sürpriz olmasın. */
  dogru(
    "onay kutusu aranıyor",
    /formData\.get\("onay"\)[\s\S]{0,40}!== "evet"/.test(eylem),
  );
  /**
   * ⛔ ASIL DEĞİŞMEZ: ÇIKIŞLAR DA DAMGALANIR. Yalnız parti güncellenseydi
   * 19.08 hatası aynen tekrarlanırdı — ekran doğru görünür, NET eski
   * maliyetle kalırdı.
   */
  dogru(
    "çıkışlar `sourceMovementId` ile bulunuyor",
    /where: \{ sourceMovementId: hareketId \}/.test(eylem),
  );
  dogru(
    "çıkışlar döngüyle DAMGALANIYOR",
    /for \(const cikisId of plan\.damgalanacakCikislar\)/.test(eylem),
  );
  /** ⛔ VE KÂR TAZELENİYOR — damga düzelip NET eski kalırsa iş yarım. */
  dogru("etkilenen satışların kârı tazeleniyor", eylem.includes("satisKarTazele(saleId)"));
  /** ⛔ İZ ESKİ DEĞERİ TAŞIR — sonradan doğan fark kime ait diye sorulabilsin. */
  dogru("iz eski VE yeni değeri yazıyor", /eskiMaliyet: plan\.eskiMaliyet/.test(eylem));
  dogru("iz sebebi yazıyor", /sebep,\n/.test(eylem));
  /** ⛔ ZAMAN AŞIMI AÇIKÇA AYARLI — varsayılan 5000 ms'e bel bağlanmaz. */
  dogru("işlem zaman aşımı açık", /timeout: 120_000/.test(eylem));
  /** ⛔ ADEDE DOKUNULMAZ: ledger dokunulmazlığı yerinde. */
  dogru(
    "quantityDelta'ya YAZILMIYOR",
    !/data: \{[^}]*quantityDelta/.test(eylem),
  );

  const ekran = yorumsuz(readFileSync("src/app/satislar/[id]/page.tsx", "utf8"));
  dogru("satış detayı diyaloğu ÇİZİYOR", ekran.includes("<PartiMaliyetDuzelt"));
  /**
   * ⛔ DÜZELTİLEN ŞEY PARTİ, ÇIKIŞ DEĞİL. `dusum.id` geçilseydi eylem
   * "bu bir giriş değil" deyip reddederdi — sessiz değil ama boş bir yol.
   */
  dogru(
    "diyaloğa PARTİNİN kimliği geçiyor",
    /hareketId=\{dusum\.sourceMovement\.id\}/.test(ekran),
  );
  /** ⛔ İLKE #8 — telefonda da var; iki yerde çiziliyor. */
  yakin(
    "diyalog iki yerde (masaüstü + telefon)",
    (ekran.match(/<PartiMaliyetDuzelt/g) ?? []).length,
    2,
  );
  /** ⛔ İZİNSİZ KULLANICIYA BUTON ÇİZİLMEZ — kapı sunucuda, görünürlük burada. */
  dogru("buton izne bağlı", ekran.includes("maliyetDuzeltebilir"));

  const diyalog = yorumsuz(
    readFileSync("src/app/satislar/[id]/parti-maliyet-duzelt.tsx", "utf8"),
  );
  /** ⛔ İKİ ADIM: önce göster, sonra yaz. Onay GÖRDÜĞÜ şeye verilir. */
  dogru("önizleme eylemi bağlı", diyalog.includes("partiMaliyetiOnizle"));
  dogru("yazım eylemi bağlı", diyalog.includes("partiMaliyetiniDuzelt"));
  dogru(
    "yazım formu YALNIZ önizlemeden sonra çiziliyor",
    /\{ozet \? \(/.test(diyalog),
  );
  /**
   * ⛔ YEREL DURUM GERÇEĞİN KAYNAĞI — 26.08 canlı arızası: kontrollü girdi
   * durumu olmadan DOLDURULAMAZ hâle gelir.
   */
  dogru("alanlar yerel durumdan besleniyor", /value=\{yeniMaliyet\}/.test(diyalog));
}
kosanBolumler.push("zincir");

console.log("\n" + "=".repeat(62));
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
