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

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 5;
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
  kontrol("A-01 geçerli", rafKoduGecerliMi("A-01"));
  kontrol("A-01-3 geçerli (gözlü)", rafKoduGecerliMi("A-01-3"));
  kontrol("a-01 geçersiz (küçük harf)", !rafKoduGecerliMi("a-01"));
  kontrol("a02 geçersiz (tiresiz)", !rafKoduGecerliMi("a02"));
  kontrol("A-1 geçersiz (tek rakam)", !rafKoduGecerliMi("A-1"));
  kontrol("AB-01 geçersiz (iki bölge harfi)", !rafKoduGecerliMi("AB-01"));
  kontrol("A-01-33 geçersiz (iki haneli göz)", !rafKoduGecerliMi("A-01-33"));

  kontrol("a02 -> A-02 önerisi", rafKoduDuzelt("a02") === "A-02");
  kontrol("a-01-3 -> A-01-3 önerisi", rafKoduDuzelt("a-01-3") === "A-01-3");
  kontrol("A 01 -> A-01 önerisi", rafKoduDuzelt("A 01") === "A-01");
  kontrol("kapi yani -> öneri yok", rafKoduDuzelt("kapi yani") === null);
  kontrol("a0123 -> öneri yok (çok rakam)", rafKoduDuzelt("a0123") === null);

  // CANLI VERİDEKİ İKİZ: "a-01" ve "a02" aynı rafın iki kaydı ("kapi yani").
  // Düzeltici bunları BİRLEŞTİRMEZ — hangisinin doğru olduğu bilinemez.
  // Sessizce tahmin etmek yanlış rafa yönlendirir; birleştirme kullanıcının
  // onayıyla ayrı araçta yapılır.
  kontrol(
    "ikizler ayrı kalır (a-01 != a02)",
    rafKoduDuzelt("a-01") !== rafKoduDuzelt("a02"),
    `${rafKoduDuzelt("a-01")} / ${rafKoduDuzelt("a02")}`,
  );
  kosanBolumler.push("raf");
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
