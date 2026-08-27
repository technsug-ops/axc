/**
 * ============================================================================
 *  DESTEK TALEBİ DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run talep:dogrula
 *
 *  Veritabanına GİTMEZ. Dört bölüm:
 *  1) GİRDİ — boş başlık/açıklama, uzun başlık, geçersiz tür.
 *  2) DURUM AKIŞI — hangi geçiş serbest, hangisi değil; son duraklar.
 *  3) KOD — sıra üretimi, hane sınırı, bozuk kayıtlara dayanıklılık.
 *  4) EKRAN BAĞI — yetki iki seviye, bağlam görünür, ek altyapısı tekrar
 *     yazılmamış. ("Kural teslim edilebilir mi" süzgeci.)
 * ============================================================================
 */

import { readFileSync } from "node:fs";

/**
 * ⚠ ŞEMA SATIR SONUNDAN BAĞIMSIZ OKUNUR (24.08.2026).
 *
 * `npx prisma format` dosyayı CRLF'e çevirdi ve enum ayrıştıran kontrol
 * SESSİZCE 0 değer buldu: `split("
")` sonrası satırlar `` ile
 * bitiyor, `/\/\/.*$/` deseni `$`i bulamadığı için yorum SİLİNMİYOR ve
 * `^[A-Z_]+$` testi düşüyor.
 *
 * Kontrol yanlış değildi — okuduğu METİN değişmişti. Windows'ta çalışan
 * her checkout'ta aynı tuzak var; bu yüzden düzeltme tek satırda değil,
 * OKUMA KAPISINDA yapılıyor.
 */
function semaMetni(): string {
  return readFileSync("prisma/schema.prisma", "utf8")
    .split("\r\n")
    .join("\n");
}

import {
  GECISLER,
  TALEP_DURUMLARI,
  acikMi,
  bagalamiKirp,
  gecisGecerliMi,
  kapanisZamani,
  sonrakiSira,
  talebiDogrula,
  talepKodu,
  talepSuzgeci,
  firmaSutunuGorunsunMu,
} from "../src/lib/talep/turler";

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
console.log("1) GİRDİ DENETİMİ");
console.log("=".repeat(70));
{
  const gecerli = { baslik: "Kargo seçilmiyor", aciklama: "Satış formunda", tur: "HATA" };
  kontrol("geçerli girdi hatasız", talebiDogrula(gecerli).length === 0);

  kontrol(
    "boş başlık reddedilir",
    talebiDogrula({ ...gecerli, baslik: "" }).includes("BASLIK_BOS"),
  );
  kontrol(
    "  ...yalnız boşluk da boş sayılır",
    talebiDogrula({ ...gecerli, baslik: "   " }).includes("BASLIK_BOS"),
  );
  kontrol(
    "boş açıklama reddedilir",
    talebiDogrula({ ...gecerli, aciklama: "  " }).includes("ACIKLAMA_BOS"),
  );
  kontrol(
    "geçersiz tür reddedilir",
    talebiDogrula({ ...gecerli, tur: "SORU" }).includes("TUR_GECERSIZ"),
  );
  kontrol("İSTEK türü geçerli", talebiDogrula({ ...gecerli, tur: "ISTEK" }).length === 0);

  /**
   * BAŞLIK KIRPILMAZ, REDDEDİLİR. Sessizce kırpılan başlık kullanıcının
   * yazdığından farklı olur ve o farkı kimse görmez.
   */
  kontrol(
    "191 karakter geçer",
    talebiDogrula({ ...gecerli, baslik: "a".repeat(191) }).length === 0,
  );
  kontrol(
    "192 karakter REDDEDİLİR (sessizce kırpılmaz)",
    talebiDogrula({ ...gecerli, baslik: "a".repeat(192) }).includes(
      "BASLIK_COK_UZUN",
    ),
  );

  /**
   * BAĞLAM İSE KIRPILIR. Bunu kullanıcı yazmıyor, tarayıcı üretiyor; uzun
   * user-agent yüzünden talebi reddetmek, bildirimi kullanıcının değil
   * TARAYICISININ hatası yüzünden engellemek olurdu.
   */
  kontrol("uzun tarayıcı bilgisi 500'e kırpılıyor", bagalamiKirp("x".repeat(900))?.length === 500);
  kontrol("boş bağlam null döner", bagalamiKirp("   ") === null);
  kontrol("tanımsız bağlam null döner", bagalamiKirp(undefined) === null);
}

console.log("");
console.log("=".repeat(70));
console.log("2) DURUM AKIŞI");
console.log("=".repeat(70));
{
  kontrol("ACIK → INCELENIYOR serbest", gecisGecerliMi("ACIK", "INCELENIYOR"));
  kontrol("INCELENIYOR → YAPILIYOR serbest", gecisGecerliMi("INCELENIYOR", "YAPILIYOR"));
  kontrol("YAPILIYOR → COZULDU serbest", gecisGecerliMi("YAPILIYOR", "COZULDU"));
  kontrol("COZULDU → KAPANDI serbest", gecisGecerliMi("COZULDU", "KAPANDI"));

  /**
   * ÇÖZÜLDÜ'DEN GERİ DÖNÜLEBİLİR. "Çözdüm" denip çözülmediği anlaşılan
   * talep gerçek bir durumdur; yeni talep açmaya zorlamak geçmişi böler.
   */
  kontrol("COZULDU → YAPILIYOR serbest (yanlış çözüm geri alınabilir)",
    gecisGecerliMi("COZULDU", "YAPILIYOR"));

  /**
   * KAPANDI SON DURAK. Kapanmış talep bir tık kazayla yeniden açılamamalı;
   * yeni bir durum varsa yeni talep açılır ve geçmiş bozulmaz.
   */
  kontrol("KAPANDI son durak — hiçbir yere gitmez", GECISLER.KAPANDI.length === 0);
  kontrol("  ...KAPANDI → ACIK YASAK", !gecisGecerliMi("KAPANDI", "ACIK"));
  kontrol("  ...KAPANDI → YAPILIYOR YASAK", !gecisGecerliMi("KAPANDI", "YAPILIYOR"));
  kontrol("REDDEDILDI son durak", GECISLER.REDDEDILDI.length === 0);

  /** Erteleme bir SON değil duraklamadır: geri dönebilir. */
  kontrol("ERTELENDI → ACIK serbest", gecisGecerliMi("ERTELENDI", "ACIK"));
  kontrol("ACIK → ERTELENDI serbest", gecisGecerliMi("ACIK", "ERTELENDI"));

  /** Aynı duruma "geçmek" değişiklik değildir — sessizce geçerli sayılmaz. */
  for (const d of TALEP_DURUMLARI) {
    if (gecisGecerliMi(d, d)) {
      kontrol(`${d} → ${d} kendine geçiş REDDEDİLMELİ`, false);
      break;
    }
  }
  kontrol("hiçbir durum kendine geçemiyor", TALEP_DURUMLARI.every((d) => !gecisGecerliMi(d, d)));

  /** ACIK bir talep atlayarak KAPANDI olamaz — önce çözülmeli/reddedilmeli. */
  kontrol("ACIK → KAPANDI YASAK (adım atlanmaz)", !gecisGecerliMi("ACIK", "KAPANDI"));

  kontrol("açık sayacı KAPANDI'yı saymaz", !acikMi("KAPANDI"));
  kontrol("  ...REDDEDILDI'yi de saymaz", !acikMi("REDDEDILDI"));
  kontrol("  ...ERTELENDI hâlâ AÇIK (iş bitmedi)", acikMi("ERTELENDI"));
  kontrol("  ...COZULDU hâlâ açık (kapatılmadı)", acikMi("COZULDU"));

  /**
   * KAPANIŞ ZAMANI İLK ÇÖZÜMDE DONAR. Ölçmek istediğimiz "kullanıcının
   * derdi ne zaman bitti", "kayıt ne zaman arşivlendi" değil.
   */
  const ilk = new Date("2026-08-16T10:00:00.000Z");
  const sonra = new Date("2026-08-20T10:00:00.000Z");
  kontrol("COZULDU kapanış zamanını yazar", kapanisZamani(null, "COZULDU", ilk) === ilk);
  kontrol(
    "  ...KAPANDI onu EZMEZ (ilk çözüm anı korunur)",
    kapanisZamani(ilk, "KAPANDI", sonra) === ilk,
  );
  kontrol("açık duruma dönünce kapanış zamanı silinir",
    kapanisZamani(ilk, "YAPILIYOR", sonra) === null);
}

console.log("");
console.log("=".repeat(70));
console.log("3) TALEP KODU");
console.log("=".repeat(70));
{
  kontrol("ilk kod TLP-0001", talepKodu(sonrakiSira([])) === "TLP-0001");
  kontrol("sıradaki kod artıyor", talepKodu(sonrakiSira(["TLP-0001"])) === "TLP-0002");

  /**
   * SAYIYA GÖRE, METNE GÖRE DEĞİL. Metin sıralamasında "TLP-0009" >
   * "TLP-0010" olurdu; sabit hanede bugün çalışır ama hane sayısı değişince
   * SESSİZCE bozulurdu.
   */
  kontrol(
    "9 → 10 geçişi doğru (metin karşılaştırması değil)",
    talepKodu(sonrakiSira(["TLP-0009", "TLP-0008"])) === "TLP-0010",
  );
  kontrol(
    "en büyük kod bulunur (sıra karışık olsa da)",
    talepKodu(sonrakiSira(["TLP-0003", "TLP-0017", "TLP-0009"])) === "TLP-0018",
  );
  kontrol(
    "bozuk kod sırayı bozmaz",
    talepKodu(sonrakiSira(["TLP-0002", "elle-yazilmis", ""])) === "TLP-0003",
  );
  kontrol("9999 aşılınca hane büyür, kesilmez", talepKodu(10000) === "TLP-10000");
}

console.log("");
console.log("=".repeat(70));
console.log("3b) KİM HANGİ TALEBİ GÖRÜR — FİRMA İZOLASYONU");
console.log("=".repeat(70));
{
  /**
   * ════════════════════════════════════════════════════════════════════
   *  KURGU DÜZELTMESİ (mimar, 16.08.2026)
   * --------------------------------------------------------------------
   *  İlk teslim yanlış kurulmuştu: sanki talebi açan da çözen de aynı
   *  firmadaymış gibi, herkes herkesin talebini görüyordu.
   *
   *  DOĞRU KURGU:
   *    TALEP AÇAN  → müşteri firma (AXCALI, ileride başkaları)
   *    TALEP ÇÖZEN → geliştirici (`destek.yonet`)
   *
   *  ⚠ BU KURAL BUGÜN GÖRÜNMEZ. Tek firma varken iki dal da aynı sonucu
   *  verir; fark ancak ikinci firma geldiğinde ortaya çıkar — ve o gün
   *  eksikse AXCALI başka firmanın talebini okumuş olur. Sonradan eklenen
   *  izolasyon, sızıntı yaşandıktan SONRA eklenen izolasyondur.
   * ════════════════════════════════════════════════════════════════════
   */
  kontrol(
    "müşteri YALNIZ kendi firmasının taleplerini görür",
    talepSuzgeci({ companyId: "AXC", destekVerir: false }).companyId === "AXC",
  );
  kontrol(
    "  ...başka firmanın kimliğiyle süzülmüyor",
    talepSuzgeci({ companyId: "BSK", destekVerir: false }).companyId !== "AXC",
  );
  kontrol(
    "geliştirici BÜTÜN firmaları görür (süzgeç yok)",
    talepSuzgeci({ companyId: "AXC", destekVerir: true }).companyId === undefined,
  );
  kontrol(
    "  ...süzgeç nesnesi boş (yanlışlıkla daraltmıyor)",
    Object.keys(talepSuzgeci({ companyId: "AXC", destekVerir: true })).length === 0,
  );
  kontrol("firma sütunu yalnız destek verende", firmaSutunuGorunsunMu(true));
  kontrol("  ...müşteride gizli (kendi adını görmek gürültü)", !firmaSutunuGorunsunMu(false));
}

console.log("");
console.log("=".repeat(70));
console.log("4) EKRAN BAĞI VE YETKİ");
console.log("=".repeat(70));
{
  const yorumsuz = (m: string) =>
    m.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const eylem = yorumsuz(readFileSync("src/app/talepler/eylemler.ts", "utf8"));
  const durumKontrolu = readFileSync(
    "src/app/talepler/durum-kontrolu.tsx",
    "utf8",
  );
  const sayfa = readFileSync("src/app/talepler/page.tsx", "utf8");
  const buton = readFileSync("src/components/bildir-butonu.tsx", "utf8");
  const duzen = readFileSync("src/app/layout.tsx", "utf8");
  const ekler = readFileSync("src/lib/ekler.ts", "utf8");
  const izinler = readFileSync("src/lib/yetki/izinler.ts", "utf8");
  const seed = readFileSync("prisma/seed-yetki.ts", "utf8");
  const tr = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Talep?: Record<string, string>;
  };

  /**
   * ════════════════════════════════════════════════════════════════════
   *  YETKİ İKİ SEVİYE — AÇMAK SERBEST, YÖNETMEK İZİNLİ
   * --------------------------------------------------------------------
   *  Talep açmak izne bağlansaydı bildirim yine Telegram'a kaçardı ve
   *  modül varlık sebebini kaybederdi. Ama durumu ilerletmek geliştiricinin
   *  işi: kullanıcı kendi talebinin nerede olduğunu GÖRÜR, ilerletemez.
   * ════════════════════════════════════════════════════════════════════
   */
  kontrol(
    "talep AÇMAK izin istemiyor (yalnız giriş)",
    !eylem.includes('yetkiIste("destek.yonet")\n') ||
      eylem.indexOf("talepOlustur") < eylem.indexOf('yetkiIste("destek.yonet")'),
  );
  kontrol(
    "  ...ama oturum ŞART (bildireni bilinmeyen talep cevaplanamaz)",
    eylem.includes("await yetkiBaglami()") && eylem.includes("girisGerekli"),
  );
  kontrol(
    "durum değiştirmek destek.yonet İSTİYOR",
    eylem.includes('yetkiIste("destek.yonet")'),
  );
  kontrol(
    "  ...geçiş SUNUCUDA da doğrulanıyor (ekran süzgeci güvenlik değil)",
    eylem.includes("gecisGecerliMi(mevcut.durum, yeniDurum)"),
  );
  kontrol(
    "sayfa izin değil GİRİŞ istiyor (herkes kendi talebini görür)",
    sayfa.includes("sayfaGirisi()") && !sayfa.includes("sayfaIzni("),
  );
  /**
   * ════════════════════════════════════════════════════════════════════
   *  EYLEM DÜĞMESİ EN SONDA — 17.08.2026 canlı bulgusu
   * --------------------------------------------------------------------
   *  Çözüm notu kutusu "Güncelle" düğmesinin ALTINDAYDI. Kullanıcı
   *  yukarıdan aşağı okuyup durumu seçti, düğmeye bastı ve notu HİÇ
   *  görmedi: TLP-0001 "Çözüldü"ye geçti, çözüm notu boş kaldı.
   *
   *  Kayıp SESSİZDİ — hata yok, uyarı yok, yalnız boş bir alan. Göç
   *  provası bunu ortaya çıkardı: GELISTIRICI mesajı hiç doğmadı.
   *  Bir formda düğmeden SONRA gelen alan doldurulmaz.
   * ════════════════════════════════════════════════════════════════════
   */
  /**
   * ════════════════════════════════════════════════════════════════════
   *  NOT TEK BAŞINA KAYDEDİLEBİLİR (17.08.2026 canlı bulgusu)
   * --------------------------------------------------------------------
   *  Durum ZORUNLUYDU: not yazmak için mutlaka bir geçiş seçmek
   *  gerekiyordu. TLP-0001 `COZULDU` idi ve oradan yalnız `KAPANDI` ya da
   *  `YAPILIYOR`a gidilebiliyor — ikisi de talebin ANLAMINI değiştirir.
   *  "Çözdüm, açıklamasını da yazayım" demek imkânsızdı.
   *
   *  Mimar şartı zaten söylüyordu: durum "NEREDE" der, not "NE KONUŞULDU"
   *  der. İkisi ayrı şeyse biri diğerini ZORUNLU KILMAMALI. Kural
   *  yazılıydı, uygulama onu tutmuyordu.
   * ════════════════════════════════════════════════════════════════════
   */
  kontrol(
    "durum İSTEĞE BAĞLI (yalnız not yazılabilir)",
    eylem.includes("yeniDurum: TalepDurumu | null"),
  );
  kontrol(
    "  ...durum yoksa geçiş doğrulaması atlanıyor",
    eylem.includes("if (yeniDurum !== null && !gecisGecerliMi("),
  );
  kontrol(
    "  ...durum yoksa kapanış zamanına DOKUNULMUYOR",
    eylem.includes("yeniDurum === null") &&
      eylem.includes("kapatilmaZamani: kapanisZamani("),
  );
  kontrol(
    "  ...ne durum ne not varsa açıkça reddediliyor (sessiz 'tamam' yok)",
    eylem.includes("degisiklikYok"),
  );
  kontrol(
    "  ...düğme yalnız notla da açılıyor",
    durumKontrolu.includes('hedef === "" && not.trim() === ""'),
  );
  kontrol(
    "  ...düğme yazısı duruma göre değişiyor",
    durumKontrolu.includes('t("notuKaydet")'),
  );

  kontrol(
    "çözüm notu alanı EYLEM DÜĞMESİNDEN ÖNCE",
    (() => {
      const not = durumKontrolu.indexOf("<Textarea");
      const dugme = durumKontrolu.indexOf("<Button");
      return not !== -1 && dugme !== -1 && not < dugme;
    })(),
  );

  kontrol(
    "yetkisizde durum kontrolü HİÇ çizilmiyor (pasif düğme yok)",
    sayfa.includes("yonetebilir ? (") && sayfa.includes('izinVarMi("destek.yonet")'),
  );

  /** YETKİ İKİ BACAKLIDIR: kod + veritabanı. */
  kontrol("destek.yonet izin listesinde", izinler.includes('anahtar: "destek.yonet"'));
  /**
   * ════════════════════════════════════════════════════════════════════
   *  BU KONTROL TERSİNE ÇEVRİLDİ (mimar kararı 16.08.2026)
   * --------------------------------------------------------------------
   *  İlk hâli `destek.yonet`in SONRADAN_DOGAN'a YAZILDIĞINI arıyordu ve
   *  yazıldığı gün doğruydu: yetki iki bacaklıdır, kod deploy olur ama
   *  veritabanı satırı unutulursa ekran canlıda sessizce 404 döner.
   *
   *  Sonra teşhis raporu çıktı: `destek.yonet` bir SAĞLAYICI iznidir —
   *  talebi AÇAN müşteri firmadır, ÇÖZEN ürünü sağlayandır. Otomatik
   *  dağıtım açık kalsaydı, yarın açılacak tam yetkili herhangi bir rol
   *  (ikinci firmanın sahibi dahil) onu kendiliğinden alır ve AXCALI'nin
   *  talepleri başka firmaya açılırdı.
   *
   *  ESKİ ENDİŞE HÂLÂ GEÇERLİ ama başka türlü karşılanıyor: izin elle
   *  verildi ve bekçi onu "+ SAĞLAYICI" diye ayrıca raporluyor — yani
   *  sessizce kaybolmuyor, ölçüt dışı olduğu EKRANDA yazıyor.
   * ════════════════════════════════════════════════════════════════════
   */
  kontrol(
    "  ...SONRADAN_DOGAN'a YAZILMAMIŞ (sağlayıcı izni otomatik dağıtılmaz)",
    (() => {
      const bas = seed.indexOf("const SONRADAN_DOGAN");
      if (bas === -1) return false;
      const son = seed.indexOf("];", bas);
      if (son === -1) return false;
      return !seed.slice(bas, son).includes('"destek.yonet"');
    })(),
  );
  kontrol(
    "  ...bunun yerine SAĞLAYICI izni olarak işaretli",
    izinler.includes('anahtar: "destek.yonet", grup: "yonetim", saglayici: true'),
  );

  /**
   * BAĞLAM OTOMATİK AMA GİZLİ DEĞİL. Sessizce toplanan bilgi, toplandığı
   * öğrenildiği gün güveni bitirir.
   */
  kontrol("bildir düğmesi üst çubukta", duzen.includes("<BildirButonu />"));
  /**
   * ── BAĞLAM: GÖRÜNÜR AMA KATLANMIŞ (16.08.2026 kullanıcı sorusu) ────────
   *  "Otomatik bilgiler kullanıcı tarafından neden görünsün, gerek var mı?"
   *
   *  İlk hâli üç satırlık ham user-agent metnini formun ortasına seriyordu.
   *  Kullanıcı haklıydı: onun işi hata bildirmek, tarayıcı sürümü okumak
   *  değil. Ama tamamen gizlemek de olmaz — sessizce toplanan bilgi,
   *  toplandığı öğrenildiği gün güveni bitirir.
   *
   *  ÇÖZÜM İKİSİNİ BİRDEN TUTAR: tek satır özet HER ZAMAN görünür, ayrıntı
   *  tıklayınca açılır. Bilgi ULAŞILABİLİR olmalı, DAYATILAN değil.
   */
  kontrol(
    "yakalanan bağlam formda GÖRÜNÜR (tek satır özet)",
    buton.includes('t("baglamOzet")'),
  );
  kontrol(
    "  ...ayrıntı açılabiliyor, gizlenmiyor",
    buton.includes("<details") &&
      buton.includes('t("baglamSayfa")') &&
      buton.includes('t("baglamTarayici")'),
  );
  kontrol(
    "  ...varsayılan KAPALI (open özniteliği yok)",
    !/<details[^>]*\bopen\b/.test(buton),
    /* ⚠ 28.08.2026: burada `\b` GÖRÜNMEZ backspace (0x08) olarak duruyordu —
       desen hiçbir şeyle eşleşmiyor, `!` ile birlikte ölçüt HER ZAMAN yeşil
       yanıyordu. `kontrol-karakteri:dogrula` bulup çıkardı. */
  );
  kontrol(
    "  ...başka bir şey toplanmadığı YAZILI",
    (tr.Talep?.baglamNotu ?? "").length > 0,
  );
  kontrol(
    "yakalanan bağlam LİSTEDE de görünüyor",
    sayfa.includes('t("baglamOzet")'),
  );

  /** İKİNCİ EK ALTYAPISI YOK — mevcut Attachment kullanılıyor. */
  kontrol('ek hedefine "Talep" eklenmiş', ekler.includes('"Talep",'));
  kontrol(
    "  ...liste mevcut Ekler bileşenini kullanıyor (yeni altyapı yok)",
    sayfa.includes('hedefTipi="Talep"') && sayfa.includes("<Ekler"),
  );
  kontrol(
    "  ...ek sınırları RMA ile AYNI kaynaktan",
    sayfa.includes("EK_SINIRLARI"),
  );

  /** AÇIK SIFIR: boş liste sessiz bırakılmaz. */
  kontrol(
    "boş listede NEDEN boş olduğu yazıyor",
    sayfa.includes('t("hicTalepYok")') && sayfa.includes('t("suzgecBos")'),
  );
  kontrol(
    "  ...süzgeçli boş ile hiç talep yok AYRI mesaj",
    (tr.Talep?.hicTalepYok ?? "") !== (tr.Talep?.suzgecBos ?? ""),
  );

  /**
   * ── ÇANA DÜŞEN "CEVAPSIZ TALEP" YALNIZ *ACIK* SAYAR ───────────────────
   *  Kullanıcı sordu: "bu talepler bir developer paneline düşmeli, o
   *  nerede?" Panel /talepler'in kendisiydi ama oraya BAKMAK İÇİN BİR SEBEP
   *  yoktu. Çan o boşluğu kapatıyor.
   *
   *  INCELENIYOR/YAPILIYOR sayılsaydı uyarı iş bitene kadar yanar kalırdı;
   *  sönmeyen uyarı bir süre sonra okunmayan uyarıdır (aynı gerekçe
   *  maliyetsiz stokta "tükenmiş parti sayılmaz" kuralında da var).
   */
  const toplayici = yorumsuz(readFileSync("src/lib/uyari/topla.ts", "utf8"));
  kontrol(
    "çan yalnız ACIK talepleri sayıyor",
    toplayici.includes('prisma.talep.count({ where: { durum: "ACIK" } })'),
  );

  /** FİRMA SÜZGECİ SORGUYA GERÇEKTEN BAĞLANMIŞ MI — hesaplamak yetmez. */
  kontrol(
    "liste firma süzgecini sorguya uyguluyor",
    sayfa.includes("talepSuzgeci(") && sayfa.includes("...firmaSuzgeci,"),
  );
  kontrol(
    "  ...firma OTURUMDAN geliyor, formdan değil",
    sayfa.includes("companyId: baglam.companyId") &&
      eylem.includes("companyId: baglam.companyId"),
  );
  kontrol(
    "  ...talep açılırken firma yazılıyor",
    eylem.includes("companyId: baglam.companyId"),
  );

  /**
   * ════════════════════════════════════════════════════════════════════
   *  FAZ 2'YE EVRİLEBİLİRLİK — MESAJ DİZİSİNE GEÇİŞ (mimar vizyonu)
   * --------------------------------------------------------------------
   *  Talep Faz 2'de bir MESAJ DİZİSİ taşıyacak (TalepMesaj). Geçişin
   *  YENİDEN YAZIM değil temiz bir göç olması isteniyor:
   *
   *    INSERT INTO TalepMesaj (talepId, gonderenId, gonderenTipi, metin, createdAt)
   *    SELECT id, bildirenId,       'MUSTERI',     aciklama,  createdAt       FROM Talep;
   *    SELECT id, cozumNotuYazanId, 'GELISTIRICI', cozumNotu, cozumNotuZamani FROM Talep
   *      WHERE cozumNotu IS NOT NULL;
   *
   *  Bu SELECT'in çalışması için notun YAZARI ve ZAMANI bugünden
   *  tutulmalı. İlk teslimde ikisi de YOKTU — o hâliyle göç yeniden yazım
   *  olurdu. `updatedAt` işe yaramaz: her durum değişikliğinde ezilir ve
   *  notun yazıldığı anı değil kaydın en son dokunulduğu anı söyler.
   * ════════════════════════════════════════════════════════════════════
   */
  const sema = semaMetni();
  kontrol(
    "çözüm notunun YAZARI tutuluyor (Faz 2 göçü için)",
    sema.includes("cozumNotuYazanId String?"),
  );
  kontrol(
    "  ...ZAMANI da tutuluyor (updatedAt yeterli değil)",
    sema.includes("cozumNotuZamani DateTime?"),
  );
  kontrol(
    "  ...not yazılırken ikisi de KAYDEDİLİYOR",
    eylem.includes("cozumNotuYazanId: baglam.kullaniciId") &&
      eylem.includes("cozumNotuZamani: new Date()"),
  );
  kontrol(
    "  ...ikisi de NULL olabiliyor (geçmiş kayıt bozulmuyor, yazar uydurulmuyor)",
    sema.includes("cozumNotuYazanId String?") &&
      sema.includes("cozumNotuZamani DateTime?"),
  );
  kontrol(
    "  ...ekranda kim/ne zaman görünüyor",
    sayfa.includes("x.cozumNotuYazan") && sayfa.includes("x.cozumNotuZamani"),
  );
  /**
   * DURUM İLE MESAJ AYRI KALIR (mimar şartı): durum "nerede" der
   * (YAPILIYOR), not "ne konuşuldu" der. Karışırlarsa Faz 2'de mesaj
   * eklemek durumu değiştirmek zorunda bırakırdı.
   */
  kontrol(
    "not YAZMAK durumu değiştirmiyor (ikisi ayrı alan)",
    !eylem.includes("durum: cozumNotu"),
  );

  /** Süzgeç ADRESTE yaşar — geri tuşu çalışsın, link paylaşılabilsin. */
  kontrol("süzgeç adreste", sayfa.includes("/talepler?"));

  /** Metinler sözlükte DOLU — koda gömülü metin yasak. */
  const zorunluAnahtarlar = [
    "bildirBaslik", "turHATA", "turISTEK", "baslikEtiketi", "aciklamaEtiketi",
    "gonder", "kaydedildi", "listeBaslik", "durumIlerlet", "cozumNotu",
  ];
  kontrol(
    "arayüz metinleri sözlükte dolu",
    zorunluAnahtarlar.every((k) => (tr.Talep?.[k] ?? "").length > 0),
  );
  kontrol(
    "her durumun Türkçe karşılığı var",
    TALEP_DURUMLARI.every((d) => (tr.Talep?.[`durum${d}`] ?? "").length > 0),
  );

  /** Mobil eşit vatandaş — 44px dokunma hedefi. */
  kontrol("bildir düğmesi mobilde 44px", buton.includes("size-11"));
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
