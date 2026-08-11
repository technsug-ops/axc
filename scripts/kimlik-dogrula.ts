/**
 * ============================================================================
 *  KİMLİK STANDARDI DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run kimlik:dogrula
 *
 *  Veritabanına GİTMEZ. Beş bölüm:
 *  1) HARF KATLAMA — Türkçe harfler doğru karşılığa iniyor mu ("İ" tuzağı).
 *  2) KISALTMALAR — kategori / tedarikçi / ürün-marka kuralları.
 *  3) GÜN KODU — İŞ saat dilimi. Almanya'da 9 Temmuz gecesi Türkiye'de
 *     10 Temmuz'dur ve kod 260710 olmalıdır.
 *  4) SIRA VE BİRLEŞTİRME — aynı gün ikinci kayıt çakışmıyor mu.
 *  5) RAF KODU — desen denetimi ve "şunu mu demek istediniz" önerisi.
 *  6) KATEGORİ HAZIR LİSTESİ — kodlar tekil mi, kurulumla çakışıyor mu,
 *     addan sapan kodun gerekçesi yazılmış mı.
 *  7) BENZERLİK — mükerrer ürün sorusu doğru kaydı buluyor mu, alakasızı
 *     yakalamıyor mu.
 * ============================================================================
 */

import {
  alimNoUret,
  bastanKisalt,
  gunKodu,
  harfleriKatla,
  kategoriKoduOner,
  rafKoduDuzelt,
  rafKoduGecerliMi,
  siraKodu,
  skuOnEki,
  skuUret,
  sonrakiSira,
  tedarikciKoduOner,
  urunKisaltmasi,
} from "../src/lib/kimlik";

import { benzerleriBul } from "../src/lib/benzerlik";
import {
  KATEGORI_ONERILERI,
  KURULUM_KODLARI,
} from "../src/lib/kategori-onerileri";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 7;
const kosanBolumler: string[] = [];

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) {
    console.log(`  OK    ${ad}`);
  } else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

// ===========================================================================
console.log("\n1) HARF KATLAMA — Türkçe");
// ===========================================================================
{
  kontrol("İndirimli -> INDIRIMLI", harfleriKatla("İndirimli") === "INDIRIMLI");
  kontrol("ığdır -> IGDIR", harfleriKatla("ığdır") === "IGDIR");
  kontrol("Şişli -> SISLI", harfleriKatla("Şişli") === "SISLI");
  kontrol("Çağrı -> CAGRI", harfleriKatla("Çağrı") === "CAGRI");
  kontrol("Öztürk -> OZTURK", harfleriKatla("Öztürk") === "OZTURK");
  // Harf olmayan her şey düşer: boşluk, rakam, noktalama.
  kontrol("A-101 Mağaza -> AMAGAZA", harfleriKatla("A-101 Mağaza") === "AMAGAZA");
  kontrol("sadece rakam -> boş", harfleriKatla("12345") === "");
  // Aksanlı Latin harfleri de inmelidir (Café -> CAFE).
  kontrol("Café -> CAFE", harfleriKatla("Café") === "CAFE");
  kosanBolumler.push("harf");
}

// ===========================================================================
console.log("\n2) KISALTMALAR");
// ===========================================================================
{
  // --- kategori: baştan 3 harf ---
  kontrol("Oyuncak -> OYU", kategoriKoduOner("Oyuncak") === "OYU");
  kontrol("Elektronik -> ELE", kategoriKoduOner("Elektronik") === "ELE");
  kontrol("Genel -> GEN", kategoriKoduOner("Genel") === "GEN");
  kontrol("İndirimli -> IND", kategoriKoduOner("İndirimli") === "IND");
  kontrol("Süper İndirimli -> SUP", kategoriKoduOner("Süper İndirimli") === "SUP");
  // Kısa adda uydurma harf EKLENMEZ; elde ne varsa o döner.
  kontrol("TV -> TV (uydurma harf yok)", kategoriKoduOner("TV") === "TV");
  kontrol("harfsiz ad -> null", kategoriKoduOner("2026") === null);

  // --- tedarikçi: baştan 2 harf ---
  kontrol("Erdem -> ER", tedarikciKoduOner("Erdem") === "ER");
  kontrol("Trendyol -> TR", tedarikciKoduOner("Trendyol") === "TR");

  // --- ürün/marka: ilk harf + sessizler ---
  // Baştan kesme OLSAYDI "LE" çıkardı; markayı çağrıştıran "LG" isteniyor.
  kontrol("marka LEGO -> LG", urunKisaltmasi("LEGO Wicked Glinda", "LEGO") === "LG");
  kontrol("marka Karaca -> KR", urunKisaltmasi("Karaca Gusto Bıçak Seti", "Karaca") === "KR");
  // Marka yok + çok kelimeli ad -> kelimelerin baş harfleri
  kontrol("Kablosuz Kulaklık -> KK", urunKisaltmasi("Kablosuz Kulaklık", null) === "KK");
  // Marka yok + tek kelime -> sessiz kuralı
  kontrol("telefon -> TL", urunKisaltmasi("telefon", null) === "TL");
  // Sessiz harf yoksa sıradaki harflerle tamamlanır, hata vermez.
  kontrol("Ada (sessiz az) -> AD", urunKisaltmasi("Ada", null) === "AD");
  kontrol("harfsiz -> null", urunKisaltmasi("123", null) === null);

  kontrol("bastanKisalt uzunluğa uyar", bastanKisalt("Oyuncak", 5) === "OYUNC");
  kosanBolumler.push("kisaltma");
}

// ===========================================================================
console.log("\n3) GÜN KODU — İŞ SAAT DİLİMİ (Europe/Istanbul)");
// ===========================================================================
{
  // Öğle vakti: her yerde aynı gün.
  kontrol("2026-07-07 12:00 UTC -> 260707", gunKodu(new Date("2026-07-07T12:00:00Z")) === "260707");

  // KRİTİK: Almanya'da 9 Temmuz 23:30 (21:30 UTC) — Türkiye'de artık 10 Temmuz.
  // Kod, çalışma ortamının saatinden DEĞİL, iş saat diliminden okunur.
  kontrol(
    "09.07 23:30 Almanya -> 260710 (Türkiye'de ertesi gün)",
    gunKodu(new Date("2026-07-09T21:30:00Z")) === "260710",
  );
  // UTC gününün bittiği an henüz İstanbul'da 03:00'tür — gün ATLAMAZ.
  kontrol(
    "09.07 23:00 UTC -> 260710",
    gunKodu(new Date("2026-07-09T23:00:00Z")) === "260710",
  );
  // İstanbul'da gün dönmeden hemen önce (20:59 UTC = 23:59 İstanbul).
  kontrol(
    "09.07 20:59 UTC -> 260709",
    gunKodu(new Date("2026-07-09T20:59:00Z")) === "260709",
  );
  // Yıl sınırı: 31.12 22:00 UTC = 01.01 01:00 İstanbul.
  kontrol(
    "31.12.2025 22:00 UTC -> 260101",
    gunKodu(new Date("2025-12-31T22:00:00Z")) === "260101",
  );
  // Tek haneli ay/gün sıfırla doldurulur.
  kontrol("05.03 -> 260305", gunKodu(new Date("2026-03-05T12:00:00Z")) === "260305");
  kosanBolumler.push("gun");
}

// ===========================================================================
console.log("\n4) SIRA VE BİRLEŞTİRME");
// ===========================================================================
{
  const onEk = skuOnEki({ kategoriKodu: "OYU", kisaltma: "LG", gun: "260707" });
  kontrol("ön ek OYU-LG-260707-", onEk === "OYU-LG-260707-");

  kontrol("hiç kayıt yoksa sıra 1", sonrakiSira([], onEk) === 1);
  kontrol(
    "aynı gün ikinci ürün sıra 2",
    sonrakiSira(["OYU-LG-260707-01"], onEk) === 2,
  );
  // Boşluk DOLDURULMAZ: silinen numara yeniden kullanılmaz, çünkü kod
  // basılıp etikete gitmiş olabilir.
  kontrol(
    "boşluklu dizide en büyük + 1",
    sonrakiSira(["OYU-LG-260707-01", "OYU-LG-260707-03"], onEk) === 4,
  );
  // Başka ön ekli kodlar sayıma karışmaz.
  kontrol(
    "başka ön ek sayıma karışmaz",
    sonrakiSira(["ELE-SM-260707-09", "OYU-LG-260707-01"], onEk) === 2,
  );

  kontrol("siraKodu(1) -> 01", siraKodu(1) === "01");
  kontrol("siraKodu(99) -> 99", siraKodu(99) === "99");
  kontrol("siraKodu(100) -> 100 (kısalmaz)", siraKodu(100) === "100");

  kontrol(
    "SKU OYU-LG-260707-01",
    skuUret({ kategoriKodu: "OYU", kisaltma: "LG", gun: "260707", sira: 1 }) ===
      "OYU-LG-260707-01",
  );
  kontrol(
    "Alım no ALM-ER-260810-01",
    alimNoUret({ tedarikciKodu: "ER", gun: "260810", sira: 1 }) ===
      "ALM-ER-260810-01",
  );
  // Aynı gün aynı kategoriden İKİNCİ ürün: çakışma olmamalı.
  const birinci = skuUret({ kategoriKodu: "OYU", kisaltma: "LG", gun: "260707", sira: 1 });
  const ikinci = skuUret({ kategoriKodu: "OYU", kisaltma: "LG", gun: "260707", sira: 2 });
  kontrol("aynı gün iki LEGO çakışmaz", birinci !== ikinci);
  kosanBolumler.push("sira");
}

// ===========================================================================
console.log("\n5) RAF KODU");
// ===========================================================================
{
  /**
   * CANLI DEPONUN GERÇEK RAF KODLARI (11.08.2026, 40 kayıt).
   * Kural bu listeye uyduruldu, liste kurala değil: desen bunlardan birini
   * bile geçersiz sayarsa depoda etiket değiştirmek gerekirdi.
   */
  const CANLI_RAFLAR = [
    ...Array.from({ length: 27 }, (_, i) => `A${i + 1}`), // A1 … A27  (ofis)
    "B3", "B4", "B5", "B6",
    ...Array.from({ length: 8 }, (_, i) => `R${i + 1}`), // R1 … R8   (depo)
    "DEPO",
  ];

  const gecersizler = CANLI_RAFLAR.filter((k) => !rafKoduGecerliMi(k));
  kontrol(
    `canlıdaki ${CANLI_RAFLAR.length} rafın hepsi geçerli`,
    gecersizler.length === 0,
    gecersizler,
  );

  kontrol("A5 geçerli", rafKoduGecerliMi("A5"));
  kontrol("A27 geçerli (iki haneli)", rafKoduGecerliMi("A27"));
  kontrol("DEPO geçerli (isimli alan)", rafKoduGecerliMi("DEPO"));
  kontrol("A5-3 geçerli (göz eki)", rafKoduGecerliMi("A5-3"));
  // Eski tireli biçim de kabul: geçmişte öyle yazılmış kayıt varsa kırılmasın.
  kontrol("A-01 geçerli (eski biçim de kabul)", rafKoduGecerliMi("A-01"));

  kontrol("a5 geçersiz (küçük harf)", !rafKoduGecerliMi("a5"));
  kontrol("KAPIYANI geçersiz (4 harften uzun)", !rafKoduGecerliMi("KAPIYANI"));
  kontrol("A 5 geçersiz (boşluk)", !rafKoduGecerliMi("A 5"));
  kontrol("A12345 geçersiz (çok rakam)", !rafKoduGecerliMi("A12345"));
  kontrol("boş geçersiz", !rafKoduGecerliMi(""));

  kontrol("a5 -> A5 önerisi", rafKoduDuzelt("a5") === "A5");
  kontrol("a 5 -> A5 önerisi", rafKoduDuzelt("a 5") === "A5");
  kontrol("depo -> DEPO önerisi", rafKoduDuzelt("depo") === "DEPO");
  kontrol("r1 -> R1 önerisi", rafKoduDuzelt(" r1 ") === "R1");
  kontrol("kapi yani -> öneri yok", rafKoduDuzelt("kapi yani") === null);

  // YAPI DEĞİŞTİRİLMEZ: "A-01" -> "A1" yapılmaz. Sıfırın anlamlı olup
  // olmadığı bilinemez; yanlış rafa yönlendirmek hiç düzeltmemekten kötüdür.
  kontrol("A-01 yapısı korunur (A1'e çevrilmez)", rafKoduDuzelt("a-01") === "A-01");
  kosanBolumler.push("raf");
}

// ===========================================================================
console.log("\n6) KATEGORİ HAZIR LİSTESİ");
// ===========================================================================
{
  const kodlar = KATEGORI_ONERILERI.map((k) => k.kod);

  // Liste elle bakımı yapılan VERİDİR; yarın bir satır eklenirken sessizce
  // aynı kod ikinci kez yazılabilir. Bekçi her koşumda bakar.
  const tekrarlar = kodlar.filter((k, i) => kodlar.indexOf(k) !== i);
  kontrol("liste içinde tekrar eden kod yok", tekrarlar.length === 0, tekrarlar);

  const kurulumlaCakisan = kodlar.filter((k) =>
    (KURULUM_KODLARI as readonly string[]).includes(k),
  );
  kontrol(
    "kurulum kodlarıyla (GEN/IND/SUP) çakışma yok",
    kurulumlaCakisan.length === 0,
    kurulumlaCakisan,
  );

  const bicimsiz = KATEGORI_ONERILERI.filter(
    (k) => !/^[A-Z]{2,4}$/.test(k.kod),
  ).map((k) => `${k.ad}=${k.kod}`);
  kontrol("her kod 2-4 büyük harf", bicimsiz.length === 0, bicimsiz);

  // Addan sapan kod GEREKÇESİZ kalmasın: "neden OYU değil KNS?" sorusunun
  // cevabı kodun yanında dursun, arkeoloji gerekmesin.
  const gerekcesizSapma = KATEGORI_ONERILERI.filter(
    (k) => kategoriKoduOner(k.ad) !== k.kod && !k.kodNedeni,
  ).map((k) => `${k.ad}: ${kategoriKoduOner(k.ad)} -> ${k.kod}`);
  kontrol(
    "addan sapan her kodun gerekçesi yazılı",
    gerekcesizSapma.length === 0,
    gerekcesizSapma,
  );

  // Gerekçe yazılmış ama aslında sapma YOKSA da yanıltıcıdır.
  const bosGerekce = KATEGORI_ONERILERI.filter(
    (k) => k.kodNedeni && kategoriKoduOner(k.ad) === k.kod,
  ).map((k) => k.ad);
  kontrol("gereksiz gerekçe yok", bosGerekce.length === 0, bosGerekce);

  const kdvDisi = KATEGORI_ONERILERI.filter(
    (k) => !Number.isFinite(k.kdv) || k.kdv < 0 || k.kdv > 100,
  ).map((k) => k.ad);
  kontrol("KDV oranları 0-100 aralığında", kdvDisi.length === 0, kdvDisi);

  const adTekrari = KATEGORI_ONERILERI.map((k) => k.ad).filter(
    (a, i, d) => d.indexOf(a) !== i,
  );
  kontrol("tekrar eden ad yok", adTekrari.length === 0, adTekrari);

  console.log(`        (${KATEGORI_ONERILERI.length} kategori önerisi)`);
  kosanBolumler.push("hazirListe");
}

// ===========================================================================
console.log("\n7) BENZERLİK — mükerrer ürün sorusu");
// ===========================================================================
{
  const MEVCUT = [
    "LEGO Technic NASA Artemis Uzay Fırlatma Sistemi Roketi 42221",
    "TEFAL Easyblend 1000 W Beyaz Blender Seti - 0.7 L",
    "Anker 322 PowerLine USB-C to USB-C Örgülü Kablo",
    "Karaca Gusto Bıçak Seti",
  ];
  const bul = (aranan: string) => benzerleriBul(aranan, MEVCUT, (a) => a);

  // Aynı ürünün ikinci kez, biraz farklı yazımla açılması — YAKALANMALI.
  kontrol(
    "aynı ürün farklı yazımla yakalanır",
    bul("LEGO Technic NASA Artemis Uzay Fırlatma Sistemi Roket 42221").length > 0,
  );
  kontrol(
    "büyük/küçük harf farkı yakalanır",
    bul("tefal easyblend 1000 w beyaz blender seti - 0.7 l").length > 0,
  );

  // Alakasız ürün — YAKALANMAMALI. Yanlış alarm, uyarıyı değersizleştirir.
  kontrol("alakasız ürün yakalanmaz", bul("Ütü Masası").length === 0);
  kontrol(
    "aynı markanın farklı ürünü yakalanmaz",
    bul("LEGO City İtfaiye Aracı 60375").length === 0,
  );

  // Çok kısa aranan: eşik anlamsızlaşır, hiç uyarma.
  kontrol("çok kısa ad uyarı üretmez", bul("ab").length === 0);
  kontrol("aday yoksa boş döner", benzerleriBul("LEGO", [], (a) => a).length === 0);
  kosanBolumler.push("benzerlik");
}

// ===========================================================================
console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`,
  );
  process.exit(1);
} else if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
