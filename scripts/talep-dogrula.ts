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
console.log("4) EKRAN BAĞI VE YETKİ");
console.log("=".repeat(70));
{
  const yorumsuz = (m: string) =>
    m.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const eylem = yorumsuz(readFileSync("src/app/talepler/eylemler.ts", "utf8"));
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
  kontrol(
    "yetkisizde durum kontrolü HİÇ çizilmiyor (pasif düğme yok)",
    sayfa.includes("yonetebilir ? (") && sayfa.includes('izinVarMi("destek.yonet")'),
  );

  /** YETKİ İKİ BACAKLIDIR: kod + veritabanı. */
  kontrol("destek.yonet izin listesinde", izinler.includes('anahtar: "destek.yonet"'));
  kontrol(
    "  ...SONRADAN_DOGAN'a da yazılmış (canlıda sessizce kaybolmasın)",
    seed.includes('"destek.yonet"'),
  );

  /**
   * BAĞLAM OTOMATİK AMA GİZLİ DEĞİL. Sessizce toplanan bilgi, toplandığı
   * öğrenildiği gün güveni bitirir.
   */
  kontrol("bildir düğmesi üst çubukta", duzen.includes("<BildirButonu />"));
  kontrol(
    "yakalanan bağlam FORMDA görünüyor",
    buton.includes('t("baglamBaslik")') &&
      buton.includes('t("baglamSayfa")') &&
      buton.includes('t("baglamTarayici")'),
  );
  kontrol(
    "  ...başka bir şey toplanmadığı YAZILI",
    (tr.Talep?.baglamNotu ?? "").length > 0,
  );
  kontrol(
    "yakalanan bağlam LİSTEDE de görünüyor",
    sayfa.includes('t("baglamBaslik")'),
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
