import { readFileSync } from "node:fs";

import {
  PAKETLEME_ADIMLARI,
  kalemBul,
  paketlenebilirMi,
  rafiEksikOlanlar,
  siradakiAdim,
  type PaketKalemi,
  type PaketSiparisi,
} from "../src/lib/paketleme/yonlendirme";

/**
 * ============================================================================
 *  YÖNLENDİRMELİ PAKETLEME BEKÇİSİ (K46)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE VAR: `yonlendirme.ts` kendi yorumunda _"`paketleme:dogrula`
 *  veritabanı olmadan sınayabiliyor"_ diyordu ve **öyle bir bekçi YOKTU.**
 *  Modül 146 satır, kimse import etmiyor, hiçbir kontrol koşmuyordu —
 *  ölçülmemiş bir söz. (Ölçüldü 25.08.2026.)
 *
 *  ⚠ VERİTABANI YOK. Kural saf; ekran çizer, kural karar verir.
 *
 *  ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİR. `kalemBul`un sırası
 *  (barkod → Firma SKU → SKU) ancak AYNI kodun iki farklı rolde iki farklı
 *  kaleme düştüğü bir örnekle sınanabilir; tek kalemli bir örnek sırayı
 *  değil tesadüfü sınar.
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

function kalem(ek: Partial<PaketKalemi> & { saleItemId: string }): PaketKalemi {
  return {
    variantId: `v-${ek.saleItemId}`,
    urunAdi: "Ürün",
    varyantAdi: null,
    sku: `SKU-${ek.saleItemId}`,
    companySku: `FSKU-${ek.saleItemId}`,
    barcode: `BAR-${ek.saleItemId}`,
    adet: 1,
    rafKodu: "A-01",
    teyitli: false,
    ...ek,
  };
}

function siparis(kalemler: PaketKalemi[]): PaketSiparisi {
  return {
    saleId: "s1",
    siparisKodu: "11535492766",
    gonderiKodu: "7260036314074719",
    kanal: "Trendyol — AXCALI",
    kalemler,
    hazirlaniyor: false,
    bulunanAlan: "shipmentCode",
  };
}

// --- 1) ADIM SEÇİMİ --------------------------------------------------------
{
  console.log("\n1) SIRADAKİ ADIM");
  kontrol("dört adım tanımlı", PAKETLEME_ADIMLARI.length === 4, PAKETLEME_ADIMLARI);

  kontrol(
    "sipariş yok → KARGO_KODU",
    siradakiAdim({ siparis: null, sonOkumaEslestiMi: null }) === "KARGO_KODU",
  );
  /** ⚠ SİPARİŞ YOKKEN OKUMA SONUCU ÖNEMSİZ — kargo kodu her hâlde ilk adım. */
  kontrol(
    "  ...okuma sonucu dolu olsa bile",
    siradakiAdim({ siparis: null, sonOkumaEslestiMi: true }) === "KARGO_KODU",
  );
  kontrol(
    "sipariş var, okuma yok → URUN_TEYIDI",
    siradakiAdim({ siparis: siparis([kalem({ saleItemId: "a" })]), sonOkumaEslestiMi: null }) ===
      "URUN_TEYIDI",
  );
  kontrol(
    "eşleşti → ESLESTI",
    siradakiAdim({ siparis: siparis([kalem({ saleItemId: "a" })]), sonOkumaEslestiMi: true }) ===
      "ESLESTI",
  );
  kontrol(
    "eşleşmedi → ESLESMEDI",
    siradakiAdim({ siparis: siparis([kalem({ saleItemId: "a" })]), sonOkumaEslestiMi: false }) ===
      "ESLESMEDI",
  );
}

// --- 2) KALEM BULMA — ÜÇ ROL, SABİT SIRA -----------------------------------
{
  console.log("\n2) KALEM BULMA");
  const a = kalem({ saleItemId: "a", barcode: "111", companySku: "F-A", sku: "S-A" });
  const b = kalem({ saleItemId: "b", barcode: "222", companySku: "F-B", sku: "S-B" });

  kontrol("barkodla bulunur", kalemBul([a, b], "222")?.kalem.saleItemId === "b");
  kontrol("  ...alan adı döner", kalemBul([a, b], "222")?.alan === "barcode");
  kontrol("Firma SKU ile bulunur", kalemBul([a, b], "F-A")?.alan === "companySku");
  kontrol("SKU ile bulunur", kalemBul([a, b], "S-B")?.alan === "sku");

  /**
   * ⚠ ASIL AYRIM — SIRA. Aynı kod `a`nın SKU'su ve `b`nin BARKODU olsun:
   * sıra doğruysa BARKOD kazanır ve `b` döner. Sıra bozulursa `a` döner.
   * Tek kalemli bir örnek bu ayrımı HİÇ göstermezdi.
   */
  const c = kalem({ saleItemId: "c", barcode: "BAR-C", companySku: "F-C", sku: "ORTAK" });
  const d = kalem({ saleItemId: "d", barcode: "ORTAK", companySku: "F-D", sku: "S-D" });
  const sirali = kalemBul([c, d], "ORTAK");
  kontrol("SIRA: barkod, SKU'dan önce gelir", sirali?.kalem.saleItemId === "d", sirali);
  kontrol("  ...ve alan barcode yazar", sirali?.alan === "barcode");

  /**
   * ⚠ AYNI ROLDE İKİ KALEME UYUYORSA SEÇİM YAPILMAZ. Belirsizken ilkini
   * seçmek, yanlış kutuyu paketletir.
   */
  const e = kalem({ saleItemId: "e", barcode: "AYNI" });
  const f = kalem({ saleItemId: "f", barcode: "AYNI" });
  kontrol("aynı rolde iki uyan → null (tahmin yok)", kalemBul([e, f], "AYNI") === null);

  kontrol("bulunamayan kod → null", kalemBul([a, b], "YOK") === null);
  kontrol("boş kod → null", kalemBul([a, b], "   ") === null);
  kontrol("kod kırpılır", kalemBul([a, b], "  222  ")?.kalem.saleItemId === "b");
  /** ⚠ BARKODU BOŞ KALEM, boş okumayla eşleşmemeli. */
  const g = kalem({ saleItemId: "g", barcode: null });
  kontrol("barkodu null olan kalem null ile eşleşmez", kalemBul([g], "") === null);
}

// --- 3) PAKETLENDİ İŞARETİ — TEYİT ŞART ------------------------------------
{
  console.log("\n3) PAKETLENEBİLİR Mİ");
  kontrol("sipariş yok → basılamaz", paketlenebilirMi(null) === false);
  kontrol(
    "teyit yok → basılamaz",
    paketlenebilirMi(siparis([kalem({ saleItemId: "a" })])) === false,
  );
  kontrol(
    "bir kalem teyitli → basılabilir",
    paketlenebilirMi(siparis([kalem({ saleItemId: "a", teyitli: true })])) === true,
  );
  /**
   * ⚠ BUGÜN TEK KALEM YETER — ölçülmüş karar, tercih değil: canlıda çok
   * kalemli sipariş YOK. Çok kalemli ilk sipariş girdiğinde bu kontrol
   * "hepsi teyitli" olarak SIKILAŞTIRILIR ve bu satır kırmızı yanarak
   * hatırlatır.
   */
  kontrol(
    "çok kalemlide bir teyit BUGÜN yeter (ölçülmüş karar)",
    paketlenebilirMi(
      siparis([kalem({ saleItemId: "a", teyitli: true }), kalem({ saleItemId: "b" })]),
    ) === true,
  );
}

// --- 4) RAF EKSİKLİĞİ — AKIŞ DURMAZ, SÖYLER --------------------------------
{
  console.log("\n4) RAF EKSİKLİĞİ");
  const rafli = kalem({ saleItemId: "a", rafKodu: "B-12" });
  const rafsiz = kalem({ saleItemId: "b", rafKodu: null });
  kontrol("rafsız kalem sayılır", rafiEksikOlanlar(siparis([rafli, rafsiz])).length === 1);
  kontrol("hepsi raflıysa boş", rafiEksikOlanlar(siparis([rafli])).length === 0);
  /** ⚠ RAF EKSİKLİĞİ PAKETLEMEYİ ENGELLEMEZ — bilgi, kapı değil. */
  kontrol(
    "rafsız kalem paketlemeyi ENGELLEMEZ",
    paketlenebilirMi(siparis([kalem({ saleItemId: "b", rafKodu: null, teyitli: true })])) ===
      true,
  );
}

// --- 5) EKRAN — KURALI KENDİ YAZMIYOR, ÇAĞIRIYOR ---------------------------
/**
 * ⚠ DESEN KULLANIM BLOĞUNDA ARANIR, DOSYANIN TAMAMINDA DEĞİL. Aynı kelime
 * import satırında da geçiyor; `indexOf` onu bulur ve kontrol hep yanlış
 * yere bakar (anayasa: beş kez düşülen tuzak).
 */
{
  console.log("\n5) EKRAN KURALI ÇAĞIRIYOR");
  const ekran = readFileSync("src/app/paketle/paketleyici.tsx", "utf8");
  const yorumsuz = ekran
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  for (const cagri of ["kalemBul(", "paketlenebilirMi(", "siradakiAdim(", "rafiEksikOlanlar("]) {
    kontrol(`  ${cagri} çağrılıyor`, yorumsuz.includes(cagri));
  }

  /**
   * ⚠ KAMERA HER YERDE (İlke #7). Ölçüt SAYIM DEĞİL DESEN YASAĞI: çıplak
   * `<input` hiçbir yerde kalamaz — yarın eklenen kutu da yakalansın.
   */
  kontrol("çıplak <input yok — ortak bileşen kullanılıyor", !/<input[\s>]/i.test(yorumsuz));
  kontrol("BarkodGirisi iki kez kullanılıyor", (yorumsuz.match(/<BarkodGirisi/g) ?? []).length === 2);

  /**
   * ⚠ EŞLEŞMEME KIRMIZI OLAMAZ. Bu bir tercih değil, K34'ün kilitli olma
   * sebebi: eksik defterin üstünde çalışan kırmızı uyarı çoğunlukla HAKLI
   * OLARAK çalar ve kullanıcı okumadan geçmeyi öğrenir. Desen KULLANIM
   * BLOĞUNA daraltılıyor — "ESLESMEDI" kelimesi başka yerlerde de geçiyor.
   */
  const bas = yorumsuz.indexOf('adim === "ESLESMEDI"');
  const blok = bas < 0 ? "" : yorumsuz.slice(bas, bas + 400);
  kontrol("eşleşmedi dalı var", bas >= 0);
  kontrol("  ...ve NÖTR (olumsuz/uyarı değil)", blok.includes("DURUM_KUTUSU.notr"), blok.slice(0, 120));
  kontrol(
    "  ...kırmızı ya da uyarı tonu KULLANMIYOR",
    !blok.includes("DURUM_KUTUSU.olumsuz") && !blok.includes("DURUM_KUTUSU.uyari"),
  );

  /**
   * ⚠ KİLİTLİ DÜĞME SESSİZ KALMAZ (İlke #5). Koşul VE sonucu aynı desende
   * aranıyor — koşulu bırakıp metni silmek yakalanmalı.
   */
  kontrol(
    "kilitli Paketlendi düğmesi SEBEBİNİ yazıyor",
    /!paketlenebilirMi\(siparis\)[\s\S]{0,200}paketlendiKilitli/.test(yorumsuz),
  );

  /** ⚠ RAF AKIŞIN ÇIKTISI — ekranda görünmek ZORUNDA. */
  kontrol("raf kodu ekrana basılıyor", yorumsuz.includes("kalem.rafKodu"));
  kontrol("rafsız kalem ayrıca söyleniyor", yorumsuz.includes("rafGirilmemis"));
  /**
   * ⚠ "BULUNAMADI" ÜÇE AYRILIR (canlı vaka 25.08.2026, HB kargo etiketi).
   * Ekran tek cümle basıyordu ve üç apayrı sebebi yutuyordu; kullanıcı
   * hangi işi yapacağını bilemiyordu. Üç ayrı anahtar ÜÇÜ DE çizilmeli.
   */
  for (const anahtar of [
    "bulunamadiHicYok",
    "bulunamadiKargoyaVerilmis",
    "bulunamadiIptal",
  ]) {
    kontrol(`  ekran ${anahtar} çiziyor`, yorumsuz.includes(anahtar));
  }

  /**
   * ⚠ SESLİ ONAY — Halil tarifinin parçası, sessizce düşmemeli.
   *
   * ⚠ DESEN ÇAĞRI YERİNE BAĞLI, ADA DEĞİL. İlk yazımda `tonCal(` dosyanın
   * tamamında aranıyordu ve TANIM SATIRI (`function tonCal(eslesti…`) deseni
   * ayakta tutuyordu: `tonCal(true)` mutasyonu YEŞİL KALDI. Kontrol artık
   * teyit fonksiyonunun gövdesine daraltılıp ARGÜMANI okuyor.
   */
  const teyitBasi = yorumsuz.indexOf("const urunTeyitEt");
  const teyitBloku = teyitBasi < 0 ? "" : yorumsuz.slice(teyitBasi, teyitBasi + 900);
  kontrol("teyit fonksiyonu bulundu", teyitBasi >= 0);
  const sesCagrisi = teyitBloku.match(/tonCal\(([^)]*)\)/);
  kontrol("sesli onay teyit anında çağrılıyor", sesCagrisi !== null);
  kontrol(
    "  ...argümanı SABİT DEĞİL (eşleşme sonucuna bağlı)",
    sesCagrisi !== null && !/^(true|false)$/.test(sesCagrisi[1].trim()),
    sesCagrisi?.[1],
  );
}

// --- 6) SUNUCU EYLEMİ — SÜZGEÇ ÇAĞRI YERİNDE -------------------------------
{
  console.log("\n6) SUNUCU EYLEMİ");
  const eylem = readFileSync("src/app/paketle/actions.ts", "utf8");
  const yorumsuz = eylem.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  /**
   * ⚠ İPTALLİ VE KARGOYA VERİLMİŞ SATIŞ PAKETLENMEZ — ve süzgeç SORGUNUN
   * YANINDA yazılı olmalı: sabite saklanmış bir süzgeci `iptal:bekci`
   * göremiyor, ve bir bekçinin göremediği süzgeç silindiğinde de görünmez.
   */
  kontrol("shippedAt süzgeci sorguda", /shippedAt:\s*null/.test(yorumsuz));
  kontrol("iptalTarihi süzgeci sorguda", /iptalTarihi:\s*null/.test(yorumsuz));
  kontrol("izin isteniyor", /yetkiIste\("stok\.gor"\)/.test(yorumsuz));
  /** ⚠ RAF OKUNMADAN bu ekranın varlık sebebi kalmaz. */
  kontrol("raf (location) seçiliyor", /location:\s*\{\s*select/.test(yorumsuz));
  /** ⚠ TEYİT SUNUCUDAN GELMEZ — okutularak kurulur. */
  kontrol("kalemler teyitsiz doğar", /teyitli:\s*false/.test(yorumsuz));
  /** ⚠ İKİNCİ YAZMA YOLU AÇILMADI: paketlendi izi tek yerde. */
  kontrol(
    "paketlendi izi BURADA yazılmıyor (tek kapı korunuyor)",
    !yorumsuz.includes("auditLog.create"),
  );
  /**
   * ⚠ SEBEP ÖLÇÜLÜR, TAHMİN EDİLMEZ. "Hiç yok" ile "var ama listede değil"
   * ancak SÜZGEÇSİZ ikinci bir aramayla ayrılır. Desen TİPE değil DÖNÜŞE
   * bağlı: birlik tanımı (${"durum: HIC_YOK"} gibi) dosyada zaten geçiyor
   * ve dönüş silinse bile ayakta kalırdı.
   */
  for (const donus of [
    `return { durum: "HIC_YOK" }`,
    `return { durum: "KARGOYA_VERILMIS"`,
    `return { durum: "IPTAL"`,
  ]) {
    kontrol(`  sunucu ${donus.slice(9, 40)} döndürüyor`, yorumsuz.includes(donus));
  }
  kontrol(
    "sebep ÖLÇÜLÜYOR — süzgeçsiz ikinci arama var",
    yorumsuz.includes("const disarida = await prisma.sale.findFirst"),
  );
  /**
   * ⚠ DESEN "where" BLOĞUNA DARALTILIYOR. İlk yazımda 240 karakterlik bir
   * pencereye bakıyordu ve KIRMIZI yandı — çünkü ikinci sorgu o alanları
   * SEÇİYOR (sebebi ayırt etmek için), SÜZMÜYOR. Kontrol doğru şeye
   * bakmıyordu; ölçüt düzeltildi, kod değil.
   */
  kontrol(
    "  ...ve o aramanın WHERE bloğu süzgeçsiz",
    (() => {
      const bas = yorumsuz.indexOf("const disarida");
      if (bas < 0) return false;
      const wBas = yorumsuz.indexOf("where:", bas);
      const sSon = yorumsuz.indexOf("select:", wBas);
      if (wBas < 0 || sSon < 0) return false;
      const wBlok = yorumsuz.slice(wBas, sSon);
      return !wBlok.includes("shippedAt") && !wBlok.includes("iptalTarihi");
    })(),
  );

  /** ⚠ MESAJ, KULLANICININ YAPACAĞI İŞİ ADIYLA SÖYLEMELİ (İlke #5). */
  const paketSozluk = (
    JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
      Paketle: Record<string, string>;
    }
  ).Paketle;
  for (const anahtar of [
    "bulunamadiHicYok",
    "bulunamadiKargoyaVerilmis",
    "bulunamadiIptal",
  ]) {
    kontrol(
      `  ${anahtar} sözlükte ve dolu`,
      typeof paketSozluk[anahtar] === "string" && paketSozluk[anahtar].length > 20,
    );
  }
  kontrol(
    "HIC_YOK mesajı GÖNDERİ NUMARASI eksikliğini adıyla anıyor",
    (paketSozluk.bulunamadiHicYok ?? "").toLowerCase().includes("gönderi numarası"),
  );
  /** ⚠ ÜÇ SEBEBİ YUTAN ESKİ TEK CÜMLE GERİ GELMEMELİ. */
  kontrol(
    "eski tek cümle sözlükten kalktı",
    !("siparisBulunamadi" in paketSozluk),
  );
}

// --- 8) KÖPRÜ: /okut → /paketle, TEK YÖNLÜ ---------------------------------
/**
 * ⚠ KÖPRÜ YALNIZ SİPARİŞ DALINDA. Kod bir ÜRÜN çıktığında yönlendirmeli
 * paketlemeye geçmek anlamsız: bir ürünün üç açık siparişi olabilir ve
 * hangisinin paketleneceğini sistem BİLEMEZ. Ürün dalında düğme göstermek,
 * sistemin bilmediği bir seçimi kendi yapması olurdu.
 *
 * ⚠ VE TEK YÖNLÜ. /paketle içinden /okut a dönüş düğmesi açılmaz — akışın
 * ortasında ölçüm ekranına düşen bir teyit okuması, kova karışmasını arka
 * kapıdan geri getirirdi (mimar kararı 25.08.2026).
 */
{
  console.log("");
  console.log("8) KÖPRÜ — TEK YÖNLÜ, YALNIZ SİPARİŞ DALINDA");
  const okuyucu = readFileSync("src/app/okut/okuyucu.tsx", "utf8");
  const oY = okuyucu
    .replace(/[/][*][^]*?[*][/]/g, "")
    .replace(/[{][/][*][^]*?[*][/][}]/g, "");

  const kopruSayisi = oY.split("/paketle?kod=").length - 1;
  kontrol("köprü düğmesi var", kopruSayisi >= 1);
  /** ⚠ TEK YERDE: ikinci bir kopya, biri bozulunca ötekini ayakta bırakır. */
  kontrol("  ...ve TEK yerde", kopruSayisi === 1, kopruSayisi);

  /**
   * ⚠ KONUM SINANIYOR, VARLIK DEĞİL. Desen dosyanın herhangi bir yerinde
   * olabilir; asıl soru HANGİ DALDA olduğu. Sipariş dalı
   * "siparisBulundu" ile başlıyor, ürünsüz dal "siparistteYokBaslik" ile.
   */
  const satisDali = oY.indexOf("t(" + JSON.stringify("siparisBulundu") + ")");
  const urunsuzDal = oY.indexOf("siparistteYokBaslik");
  const kopru = oY.indexOf("/paketle?kod=");
  kontrol("sipariş dalı bulundu", satisDali >= 0);
  kontrol("ürünsüz dal bulundu", urunsuzDal >= 0);
  kontrol(
    "köprü SİPARİŞ dalının İÇİNDE",
    satisDali >= 0 && urunsuzDal > satisDali && kopru > satisDali && kopru < urunsuzDal,
    { satisDali, kopru, urunsuzDal },
  );

  /** ⚠ ADRESLE GELEN KOD, ELLE OKUTULANLA AYNI KAPIDAN GİRER. */
  const sayfa = readFileSync("src/app/paketle/page.tsx", "utf8");
  const sY = sayfa.replace(/[/][*][^]*?[*][/]/g, "");
  kontrol("?kod= aynı arama işlevinden geçiyor", sY.includes("paketlemeIcinAra("));
  kontrol("  ...ve searchParams okunuyor", sY.includes("searchParams"));

  /** ⚠ TERS YÖN AÇILMAMALI. */
  const ekranY = readFileSync("src/app/paketle/paketleyici.tsx", "utf8")
    .replace(/[/][*][^]*?[*][/]/g, "")
    .replace(/[{][/][*][^]*?[*][/][}]/g, "");
  kontrol(
    "KÖPRÜ TEK YÖNLÜ — /paketle içinden /okut a bağlantı YOK",
    !ekranY.includes("href=" + JSON.stringify("/okut")) &&
      !ekranY.includes(`href={` + JSON.stringify("/okut")),
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
