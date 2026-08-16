/**
 * ============================================================================
 *  GEÇMİŞ EKSTRE OKUYUCU DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run gecmis:dogrula
 *
 *  Veritabanına ve DOSYAYA gitmez. Test verisi, gerçek dosyadan ÖLÇÜLEN
 *  yapının birebir küçültülmüş hâli (16.08.2026 incelemesi):
 *    · kart etiketleri satır 1'de, sütun 1/5/10/...
 *    · "Toplam" bloğu ilk sırada ve kartlara ait DEĞİL
 *    · yıl sütun 0'da, ay her bloğun kendi hücresinde
 *    · ay adları tutarsız: "Mayis" / "Mayıs" / "MAyıs"
 *    · "Yillik Toplam 2025" özet satırı
 *    · gelecek aylar sıfır
 * ============================================================================
 */

import { ayiCoz, donemTarihi, harfleriSadelestir } from "../src/lib/gecmis/ay";
import {
  cakisanOneriler,
  etiketiAyristir,
  kartOnerisi,
  type SistemKarti,
} from "../src/lib/gecmis/kart-eslesme";
import {
  ekstreleriOku,
  kartBloklariniBul,
  yillikToplamSatirimi,
  type OkunanEkstre,
} from "../src/lib/gecmis/okuyucu";
import { onizlemeKur } from "../src/lib/gecmis/onizleme";

let gecen = 0;
let kalan = 0;

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
console.log("1) AY ADI — TUTARSIZ YAZIMLAR");
console.log("=".repeat(70));
{
  kontrol("Mayis → 5", ayiCoz("Mayis") === 5);
  kontrol("Mayıs → 5", ayiCoz("Mayıs") === 5);
  kontrol("MAyıs → 5 (büyük harf karışık)", ayiCoz("MAyıs") === 5);
  kontrol("temmuz → 7 (küçük harf)", ayiCoz("temmuz") === 7);
  kontrol("Agustos → 8", ayiCoz("Agustos") === 8);
  kontrol("Ağustos → 8", ayiCoz("Ağustos") === 8);
  kontrol("Subat / Şubat → 2", ayiCoz("Subat") === 2 && ayiCoz("Şubat") === 2);
  kontrol("Kasim / Kasım → 11", ayiCoz("Kasim") === 11 && ayiCoz("Kasım") === 11);
  kontrol("Aralik / Aralık → 12", ayiCoz("Aralik") === 12 && ayiCoz("Aralık") === 12);
  kontrol("boşluklu yazım çözülüyor", ayiCoz("  Eylül  ") === 9);

  /**
   * TAHMİN YOK. Yakın bir ada zorlamak cazip ama yanlış aya yazılan ekstre
   * SESSİZ bir para hatasıdır. Çözülemeyen satır hata listesine düşer.
   */
  kontrol("bozuk ad çözülmez (tahmin edilmez)", ayiCoz("Mays") === null);
  kontrol("boş çözülmez", ayiCoz("") === null);
  kontrol("sayı çözülmez", ayiCoz(5) === null);
  kontrol("null çözülmez", ayiCoz(null) === null);

  /** Ortamdan bağımsız harf indirgeme — Türkçe i/I tuzağı. */
  kontrol("İ → i", harfleriSadelestir("İ") === "i");
  kontrol("I → i", harfleriSadelestir("I") === "i");
  kontrol("ı → i", harfleriSadelestir("ı") === "i");

  const d = donemTarihi(2025, 5);
  kontrol("dönem ayın 1'i, UTC", d.toISOString() === "2025-05-01T00:00:00.000Z", d.toISOString());
}

console.log("");
console.log("=".repeat(70));
console.log("2) ÇAPRAZ TABLO — BLOK BULMA");
console.log("=".repeat(70));
{
  const etiketSatiri = [
    null, "Toplam", null, null, null,
    "Yapıkredi ( Seyit Ahmet Akçalı Ayın 14 )", null, null, null, null,
    "Akbank ( Hasan Akçalı Ayın 7 )",
  ];
  const bloklar = kartBloklariniBul(etiketSatiri);
  kontrol("iki kart bloğu bulundu", bloklar.length === 2, bloklar.length);
  /**
   * "TOPLAM" BLOĞU ELENİR. Sayılsaydı bütün kartların toplamı 11. bir kart
   * gibi girerdi ve her ay iki kez sayılırdı.
   */
  kontrol("Toplam bloğu ELENDİ", !bloklar.some((b) => b.etiket === "Toplam"));
  kontrol("sütun konumları doğru", bloklar[0].sutun === 5 && bloklar[1].sutun === 10);

  kontrol("yıllık toplam satırı tanınıyor", yillikToplamSatirimi("Yillik Toplam 2025"));
  kontrol("  ...Türkçe yazımı da", yillikToplamSatirimi("Yıllık Toplam 2026"));
  kontrol("  ...normal satır tanınmıyor", !yillikToplamSatirimi(2025));
}

console.log("");
console.log("=".repeat(70));
console.log("3) OKUMA — GERÇEK YAPININ KÜÇÜLTÜLMÜŞÜ");
console.log("=".repeat(70));
{
  const satirlar: unknown[][] = [
    [], // 0: özet
    [null, "Toplam", null, null, null, "Yapıkredi ( Seyit Ahmet Akçalı Ayın 14 )", null, null, null, null, "Akbank ( Hasan Akçalı Ayın 7 )"],
    [null, "Dönem", "Borç", "Ödenen miktar", null, "Dönem", "Borç", "Ödenen miktar", "Tarih", null, "Dönem", "Borç", "Ödenen miktar", "Tarih"],
    // 3: normal satır — iki kart, tutarsız ay yazımı
    [2025, "Mayis", 324233, 324233, null, "Mayıs", 92274, 92274, new Date("2025-05-15T00:00:00.000Z"), null, "MAyıs", 70260, 70260, new Date("2025-05-20T00:00:00.000Z")],
    // 4: yalnız ilk kart dolu
    [2025, "Haziran", 606434.9, 606435, null, "Haziran", 128422, 128422, new Date("2025-06-16T00:00:00.000Z"), null, null, null, null, null],
    // 5: YILLIK TOPLAM — atlanmalı
    ["Yillik Toplam 2025", null, 5713427.7, 5713430.5, null, null, 906258.99, 906260, null, null, null, 496665.86, 496666],
    // 6: gelecek ay, sıfır — İKİ kart bloğunda da alınmamalı
    [2026, "Eylül", 0, 0, null, "Eylül", 0, 0, null, null, "Eylül", 0, 0, null],
    /**
     * 7: BİR blokta çözülemeyen ay, DİĞERİ sağlam.
     *
     * ⚠ Test verisi ilk yazıldığında "sağlam kart" verisi TOPLAM bloğuna
     * konmuştu ve kod onu doğru şekilde eliyordu — yani test KODU değil
     * KENDİ VERİSİNİ sınıyordu. Sağlam kayıt artık gerçek bir kart
     * bloğunda (Akbank, sütun 10).
     */
    [2026, "Ocak", 100, 100, null, "Mays", 200, 200, null, null, "Ocak", 300, 300, null],
  ];

  const sonuc = ekstreleriOku({ satirlar, etiketSatiriNo: 1, veriBaslangici: 3 });

  kontrol("iki kart bloğu tanındı", sonuc.kartlar.length === 2, sonuc.kartlar.length);

  /**
   * Satır 3 → 2 kart · satır 4 → 1 kart · satır 7 → 1 kart (Akbank) = 4.
   * Toplam bloğu SAYILMAZ; sayılsaydı 7 çıkardı ve her ay iki kez girerdi.
   */
  kontrol("dört ekstre okundu", sonuc.ekstreler.length === 4, sonuc.ekstreler.length);

  const mayis = sonuc.ekstreler.filter((e) => e.ay === 5);
  kontrol("Mayıs iki kart için de okundu", mayis.length === 2);
  kontrol(
    "  ...tutarsız yazımlar AYNI aya çözüldü",
    mayis.every((e) => e.ay === 5),
  );
  /** HAM METİN KORUNUR — "bu satır neydi" sorusu sonradan cevaplanabilsin. */
  kontrol(
    "  ...ham dönem metni korunuyor",
    mayis.some((e) => e.hamDonemMetni === "Mayıs") &&
      mayis.some((e) => e.hamDonemMetni === "MAyıs"),
    mayis.map((e) => e.hamDonemMetni),
  );
  kontrol(
    "  ...ödeme tarihi okunuyor",
    mayis.every((e) => e.odemeTarihi instanceof Date),
  );

  /** ÇİFT SAYIM: yıllık toplam satırı ekstreye girmemeli. */
  kontrol(
    "yıllık toplam ekstreye GİRMEDİ",
    !sonuc.ekstreler.some((e) => e.borc === 5713427.7),
  );
  kontrol(
    "  ...atlandığı RAPORLANDI (sessiz atlama yok)",
    sonuc.atlananlar.some((a) => a.sebep === "YILLIK_TOPLAM"),
  );

  kontrol(
    "gelecek/sıfır satırı alınmadı",
    !sonuc.ekstreler.some((e) => e.borc === 0),
  );
  kontrol(
    "  ...atlandığı raporlandı",
    sonuc.atlananlar.filter((a) => a.sebep === "GELECEK_YA_DA_SIFIR").length === 2,
    sonuc.atlananlar.filter((a) => a.sebep === "GELECEK_YA_DA_SIFIR").length,
  );

  kontrol(
    "çözülemeyen ay ekstreye girmedi",
    !sonuc.ekstreler.some((e) => e.borc === 200),
  );
  kontrol(
    "  ...hangi kart ve hangi metin olduğu raporlandı",
    sonuc.atlananlar.some(
      (a) => a.sebep === "AY_COZULEMEDI" && a.ayrinti === "Mays" && a.kartEtiketi !== null,
    ),
  );
  /** Çözülemeyen ay, AYNI SATIRDAKİ diğer kartı etkilemez. */
  kontrol(
    "  ...aynı satırdaki sağlam kart yine okundu",
    sonuc.ekstreler.some((e) => e.yil === 2026 && e.ay === 1 && e.borc === 300),
  );
  /** TOPLAM bloğu hiçbir koşulda ekstreye girmez. */
  kontrol(
    "Toplam bloğu ekstreye hiç girmedi",
    !sonuc.ekstreler.some((e) => e.borc === 100 || e.borc === 324233),
  );

  /** Boş blok hata değildir — her kartın her ay satırı olmak zorunda değil. */
  kontrol(
    "boş blok hata olarak raporlanmıyor",
    !sonuc.atlananlar.some((a) => a.satir === 4 && a.kartEtiketi !== null),
  );
}

console.log("");
console.log("=".repeat(70));
console.log("4) KART EŞLEŞTİRME — GÜN KULLANILMAZ");
console.log("=".repeat(70));
{
  /** Sistemdeki gerçek kartların ölçülmüş hâli (16.08.2026 canlı). */
  const kartlar: SistemKarti[] = [
    { id: "k-ibrahim", label: "İbrahim Ziraat", bankName: "Ziraat Bankası", holderName: "Halil İbrahim Akçalı" },
    { id: "k-garanti", label: "S.ahmet Garanti", bankName: "Garanti", holderName: "Seyit Ahmet Akçalı" },
    { id: "k-akbank", label: "Hasan Akbank", bankName: "Akbank", holderName: "Hasan Akçalı" },
    { id: "k-enpara", label: "S.ahmet Enpara", bankName: "Enpara", holderName: "Seyit Ahmet Akçalı" },
    { id: "k-yapikredi", label: "S.ahmet Yapıkredi", bankName: "Yapıkredi", holderName: "Seyit Ahmet Akçalı" },
    { id: "k-vakif", label: "S.ahmet Vakıf", bankName: "Vakıf", holderName: "Seyit Ahmet Akçalı" },
    { id: "k-kayin", label: "Kayınpeder Ziraat", bankName: "Ziraat", holderName: "Süleyman Erdaş" },
    { id: "k-murat", label: "Murat Garanti", bankName: "Garanti", holderName: "Murat Çindemir" },
    { id: "k-isbank", label: "S.ahmet İşbank", bankName: "İşbank", holderName: "Seyit Ahmet Akçalı" },
    { id: "k-saban", label: "Şaban Akçalı Bonus", bankName: "Garanti", holderName: "Şaban Akçalı" },
  ];

  const ayristir = etiketiAyristir("Akbank ( Hasan Akçalı Ayın 7 )");
  kontrol("etiket ayrışıyor: banka", ayristir.banka === "Akbank", ayristir.banka);
  kontrol("  ...sahip", ayristir.sahip === "Hasan Akçalı", ayristir.sahip);
  /**
   * GÜN İFADESİ SAHİPTEN ATILIR: eşleştirmede kullanılmıyor ve isim
   * benzerliğini bozardı.
   */
  kontrol("  ...'Ayın 7' sahibe karışmıyor", !ayristir.sahip.includes("7"));

  /**
   * ════════════════════════════════════════════════════════════════════
   *  ASIL KİLİT: GÜN EŞLEŞTİRMESİ SESSİZCE YANLIŞTI (ölçüldü 16.08.2026)
   * --------------------------------------------------------------------
   *  Excel "Akbank ( Hasan Akçalı Ayın 7 )" → sistemde ayın 7'si
   *  "S.ahmet Garanti". Gün anahtarı kullanılsaydı Akbank'ın 16 aylık
   *  geçmişi Garanti kartına yazılırdı, HATA VERMEDEN.
   *  Banka + sahip eşleşmesi doğruyu buluyor.
   * ════════════════════════════════════════════════════════════════════
   */
  const akbank = kartOnerisi("Akbank ( Hasan Akçalı Ayın 7 )", kartlar);
  kontrol("Akbank → Hasan Akbank (gün tuzağına düşmüyor)", akbank.onerilenKartId === "k-akbank", akbank);
  kontrol("  ...gün eşleşmesi olan Garanti'ye GİTMİYOR", akbank.onerilenKartId !== "k-garanti");

  /** Aynı sahibin beş kartı var — banka ayırt etmeli. */
  const yk = kartOnerisi("Yapıkredi ( Seyit Ahmet Akçalı Ayın 14 )", kartlar);
  kontrol("Yapıkredi → S.ahmet Yapıkredi", yk.onerilenKartId === "k-yapikredi", yk);
  const isb = kartOnerisi("İş Bankası ( Seyit Ahmet Akçalı Ayın 25 )", kartlar);
  kontrol("İş Bankası → S.ahmet İşbank", isb.onerilenKartId === "k-isbank", isb);
  const vakif = kartOnerisi("VakifBank ( Seyit Ahmet Ayın 13 )", kartlar);
  kontrol("VakifBank → S.ahmet Vakıf", vakif.onerilenKartId === "k-vakif", vakif);

  /** İki "Garanti Bankası" kartı var — sahip ayırt etmeli. */
  const murat = kartOnerisi("Garanti Bankası ( Murat Çindemir Ayın 24 )", kartlar);
  kontrol("Garanti + Murat → Murat Garanti", murat.onerilenKartId === "k-murat", murat);
  const saban = kartOnerisi("Garanti Bankası ( Şaban Akçalı Ayın 30 )", kartlar);
  kontrol("Garanti + Şaban → Şaban Akçalı Bonus", saban.onerilenKartId === "k-saban", saban);
  const troy = kartOnerisi("Garanti TROY ( Seyit Ahmet Akçalı Ayın 8 )", kartlar);
  kontrol("Garanti TROY + S.Ahmet → S.ahmet Garanti", troy.onerilenKartId === "k-garanti", troy);

  /** İki "Ziraat" kartı var — sahip ayırt etmeli. */
  const kayin = kartOnerisi("Ziraat Bankası ( Süleyman Erdaş Ayın 18 )", kartlar);
  kontrol("Ziraat + Süleyman → Kayınpeder Ziraat", kayin.onerilenKartId === "k-kayin", kayin);
  const ibr = kartOnerisi("Ziraat Bankası ( İbrahim Akçalı Ayın 2 )", kartlar);
  kontrol("Ziraat + İbrahim → İbrahim Ziraat (kısmi ad)", ibr.onerilenKartId === "k-ibrahim", ibr);

  const enpara = kartOnerisi("En Para ( Seyit Ahmet Ayın 10 )", kartlar);
  kontrol("En Para → S.ahmet Enpara", enpara.onerilenKartId === "k-enpara", enpara);

  /**
   * ZAYIF ÖNERİ YOK. Bir öneri onay ekranında "herhalde doğrudur" diye
   * geçirilir; boş bırakmak kullanıcıyı DÜŞÜNMEYE zorlar.
   */
  const yabanci = kartOnerisi("Deutsche Bank ( Hans Mueller )", kartlar);
  kontrol("alakasız kart için öneri YOK", yabanci.onerilenKartId === null, yabanci);
  kontrol("  ...gerekçe bildiriliyor", yabanci.gerekce === "eslesmeYok");

  /**
   * ════════════════════════════════════════════════════════════════════
   *  JENERİK KELİME ELENMEZSE YANLIŞ KARTA GİDER
   * --------------------------------------------------------------------
   *  "Halk Bankası" ile "Ziraat Bankası"nın ortak yanı "bankası"dır ve bu
   *  hiçbir şey söylemez. Elenmezse iki aday da aynı puanı alır, kazananı
   *  LİSTE SIRASI belirler — yani sonuç tesadüf olur.
   *
   *  Bu kilit ayrıca yazıldı çünkü mutasyon denemesi elemeyi kaldırınca
   *  hiçbir test kırmızı yanmıyordu: kural vardı ama YÜK TAŞIMIYORDU.
   *  Yük taşımayan kural, bir gün sessizce silinir.
   * ════════════════════════════════════════════════════════════════════
   */
  const jenerikTuzagi: SistemKarti[] = [
    { id: "k-ziraat", label: "Ali Ziraat", bankName: "Ziraat Bankası", holderName: "Ali Veli" },
    { id: "k-halk", label: "Ali Halkbank", bankName: "Halkbank", holderName: "Ali Veli" },
  ];
  const halk = kartOnerisi("Halk Bankası ( Ali Veli )", jenerikTuzagi);
  kontrol(
    "jenerik 'Bankası' kelimesi kararı taşımıyor",
    halk.onerilenKartId === "k-halk",
    halk,
  );

  /** Her önerinin güven yüzdesi ekranda gösterilir. */
  kontrol("güven yüzdesi üretiliyor", akbank.guven > 0 && akbank.guven <= 100, akbank.guven);

  /**
   * ÇAKIŞMA ONAY EKRANINDA GÖRÜNMELİ. İki Excel kartı aynı sisteme
   * bağlanırsa biri MUTLAKA yanlıştır ve `@@unique([cardId, donem])`
   * yüzünden aktarım yarıda patlar — kullanıcı bunu hata mesajında değil
   * ÖNCEDEN görmeli.
   */
  const cakisma = cakisanOneriler([
    { excelEtiketi: "a", onerilenKartId: "k-akbank", guven: 90, gerekce: "bankaVeSahip" },
    { excelEtiketi: "b", onerilenKartId: "k-akbank", guven: 80, gerekce: "bankaVeSahip" },
    { excelEtiketi: "c", onerilenKartId: "k-murat", guven: 90, gerekce: "bankaVeSahip" },
  ]);
  kontrol("çakışan öneri yakalanıyor", cakisma.length === 1 && cakisma[0] === "k-akbank", cakisma);
  kontrol(
    "  ...çakışma yoksa boş",
    cakisanOneriler([
      { excelEtiketi: "a", onerilenKartId: "k-akbank", guven: 90, gerekce: "bankaVeSahip" },
      { excelEtiketi: "b", onerilenKartId: "k-murat", guven: 90, gerekce: "bankaVeSahip" },
    ]).length === 0,
  );
  kontrol(
    "  ...önerisiz kartlar çakışma sayılmıyor",
    cakisanOneriler([
      { excelEtiketi: "a", onerilenKartId: null, guven: 0, gerekce: "eslesmeYok" },
      { excelEtiketi: "b", onerilenKartId: null, guven: 0, gerekce: "eslesmeYok" },
    ]).length === 0,
  );
}


console.log("");
console.log("=".repeat(70));
console.log("5) ÖNİZLEME — ÇAKIŞMA VE ÖZET");
console.log("=".repeat(70));
{
  const ek = (kart: string, yil: number, ay: number, borc: number): OkunanEkstre => ({
    kartEtiketi: kart,
    yil,
    ay,
    donem: donemTarihi(yil, ay),
    hamDonemMetni: "x",
    borc,
    odenenTutar: null,
    odemeTarihi: null,
  });

  const ekstreler = [
    ek("Akbank ( Hasan )", 2025, 5, 100),
    ek("Akbank ( Hasan )", 2025, 6, 200),
    ek("Akbank ( Hasan )", 2026, 7, 300), // TÜRETİLEN var — atlanmalı
    ek("Vakıf ( S.Ahmet )", 2025, 5, 50),
    ek("Bilinmeyen ( X )", 2025, 5, 999), // eşleştirilmedi — atlanmalı
  ];

  const sonuc = onizlemeKur({
    ekstreler,
    atlananlar: [],
    eslesmeler: [
      { excelEtiketi: "Akbank ( Hasan )", kartId: "k-akbank" },
      { excelEtiketi: "Vakıf ( S.Ahmet )", kartId: "k-vakif" },
      { excelEtiketi: "Bilinmeyen ( X )", kartId: null },
    ],
    mevcutDonemler: [
      { kartId: "k-akbank", donemAnahtari: "2026-07-01", kaynak: "TURETILEN" },
    ],
  });

  kontrol("üç satır yazılacak", sonuc.yazilacaklar.length === 3, sonuc.yazilacaklar.length);

  /**
   * ════════════════════════════════════════════════════════════════════
   *  TÜRETİLEN KAZANIR — ÇİFT SAYIM GİRİŞTE ENGELLENİR
   * --------------------------------------------------------------------
   *  Türetilmiş ekstre gerçek alım kayıtlarından çıkar ve güncellenir;
   *  beyan bir insanın tabloya yazdığı özettir. İkisi toplanırsa aynı ay
   *  iki kez borç yazar — raporda düzelttiğimiz çift sayımın kart
   *  versiyonu, ama bu sefer yazmadan ÖNCE durduruluyor.
   * ════════════════════════════════════════════════════════════════════
   */
  kontrol(
    "TÜRETİLEN olan dönem yazılmıyor",
    !sonuc.yazilacaklar.some((y) => y.donemAnahtari === "2026-07-01"),
  );
  kontrol(
    "  ...sebebiyle raporlanıyor (sessiz atlama yok)",
    sonuc.cakismalar.some((c) => c.sebep === "TURETILEN_VAR" && c.borc === 300),
  );

  kontrol(
    "eşleştirilmeyen kart yazılmıyor",
    !sonuc.yazilacaklar.some((y) => y.borc === 999),
  );
  kontrol(
    "  ...sebebi KART_ATLANDI",
    sonuc.cakismalar.some((c) => c.sebep === "KART_ATLANDI" && c.borc === 999),
  );

  /** Aynı dosyada aynı kart+ay iki kez geçerse ikincisi atlanır. */
  const tekrar = onizlemeKur({
    ekstreler: [ek("A", 2025, 5, 10), ek("A", 2025, 5, 20)],
    atlananlar: [],
    eslesmeler: [{ excelEtiketi: "A", kartId: "k1" }],
    mevcutDonemler: [],
  });
  kontrol("aynı dosyada tekrarlanan dönem bir kez yazılır", tekrar.yazilacaklar.length === 1);
  kontrol("  ...ilki kazanır", tekrar.yazilacaklar[0].borc === 10);
  kontrol(
    "  ...ikincisi sebebiyle raporlanır",
    tekrar.cakismalar.some((c) => c.sebep === "ZATEN_BEYAN_VAR" && c.borc === 20),
  );

  /** Daha önce beyan edilmiş dönem tekrar yazılmaz. */
  const ikinciYukleme = onizlemeKur({
    ekstreler: [ek("A", 2025, 5, 10)],
    atlananlar: [],
    eslesmeler: [{ excelEtiketi: "A", kartId: "k1" }],
    mevcutDonemler: [{ kartId: "k1", donemAnahtari: "2025-05-01", kaynak: "GECMIS_EXCEL" }],
  });
  kontrol("aynı dosya ikinci kez yüklenirse yazılmaz", ikinciYukleme.yazilacaklar.length === 0);
  kontrol(
    "  ...kullanıcı SEBEBİ görür, veritabanı hatasını değil",
    ikinciYukleme.cakismalar[0]?.sebep === "ZATEN_BEYAN_VAR",
  );

  // --- özet ---
  const akbankOzet = sonuc.kartOzetleri.find((o) => o.excelEtiketi === "Akbank ( Hasan )");
  kontrol("kart özeti satır sayısı doğru", akbankOzet?.satir === 2, akbankOzet);
  kontrol("  ...toplam borç doğru", akbankOzet?.toplamBorc === 300);
  kontrol("  ...dönem aralığı doğru", akbankOzet?.ilkDonem === "2025-05-01" && akbankOzet?.sonDonem === "2025-06-01");
  kontrol("atlanan kartın özeti de var (sıfır satırla)", sonuc.kartOzetleri.some((o) => o.kartId === null && o.satir === 0));
  kontrol("genel toplam borç", sonuc.toplamBorc === 350, sonuc.toplamBorc);
  kontrol("genel dönem aralığı", sonuc.ilkDonem === "2025-05-01" && sonuc.sonDonem === "2025-06-01");

  /** Okuyucunun atlananları önizlemede AYNEN taşınır — tek rapor. */
  const tasima = onizlemeKur({
    ekstreler: [],
    atlananlar: [{ sebep: "YILLIK_TOPLAM", satir: 5, kartEtiketi: null, ayrinti: "Yillik Toplam 2025" }],
    eslesmeler: [],
    mevcutDonemler: [],
  });
  kontrol("okuyucunun atlananları önizlemede taşınıyor", tasima.atlananlar.length === 1);
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
