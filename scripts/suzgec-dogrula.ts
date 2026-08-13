/**
 * ============================================================================
 *  LİSTE SÜZGEÇLERİ DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run suzgec:dogrula
 *
 *  Veritabanına GİTMEZ, "şu an"ı kendi okumaz: sabit bir AN verilir.
 *
 *  DÖRT BÖLÜM:
 *  1) ADRES KURMA — süzgeç adresi, sayfa sıfırlama, boş değerin silinmesi.
 *  2) DÖNEM ÇÖZÜMÜ — varsayılan "tüm zamanlar", geçersiz değerin davranışı.
 *  3) SATIŞ KOŞULU — kanal/hesap/kâr/iade süzgeçleri ve birlikte kullanımı.
 *  4) ALIM KOŞULU — durum/hesap/tedarikçi/kart; aramasız çağrı DB'ye gitmez.
 *
 *  ODAK: SESSİZ SÜZGEÇ KAYBI. Bu modülün en tehlikeli hatası patlamak değil,
 *  bir süzgeci koşula HİÇ yazmamaktır — ekran daha fazla kayıt gösterir,
 *  kullanıcı süzdüğünü sanır ve inen Excel de aynı yanlışı taşır.
 * ============================================================================
 */

import { gunMetni } from "../src/lib/donem";
import {
  alimKosulu,
  pencereCoz,
  satisKosulu,
} from "../src/lib/liste-suzgeci";
import { aktifSuzgecler, suzgecAdresi } from "../src/lib/suzgec";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 4;
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

/** Sabit "şu an": 13 Ağustos 2026. Testler takvimden bağımsız. */
const AN = new Date("2026-08-13T09:00:00Z");

// ===========================================================================
console.log("\n1) ADRES KURMA");
// ===========================================================================
{
  kontrol(
    "boş süzgeç adresten SİLİNİR",
    suzgecAdresi("/satislar", { kanal: "TRENDYOL" }, { kanal: "" }) === "/satislar",
    suzgecAdresi("/satislar", { kanal: "TRENDYOL" }, { kanal: "" }),
  );
  kontrol(
    "mevcut süzgeç korunur, yenisi eklenir",
    suzgecAdresi("/satislar", { kanal: "TRENDYOL" }, { kar: "eksik" }) ===
      "/satislar?kanal=TRENDYOL&kar=eksik",
    suzgecAdresi("/satislar", { kanal: "TRENDYOL" }, { kar: "eksik" }),
  );
  /**
   * SAYFA NUMARASI HER ZAMAN DÜŞER. 7. sayfadayken süzgeç daraltılırsa
   * kullanıcı boş sayfaya düşer ve "kayıt yok" sanır.
   */
  kontrol(
    "sayfa parametresi düşürülür",
    !suzgecAdresi("/satislar", { sayfa: "7" }, { kanal: "TRENDYOL" }).includes("sayfa"),
  );

  const rozetler = aktifSuzgecler(
    { kanal: "TRENDYOL", hesap: "", kar: "eksik" },
    [
      { ad: "kanal", etiket: "Kanal" },
      { ad: "hesap", etiket: "Hesap" },
      { ad: "kar", etiket: "Kâr", cozumle: () => "Hesaplanamayanlar" },
    ],
  );
  kontrol("yalnız dolu süzgeçler rozetlenir", rozetler.length === 2, rozetler);
  kontrol(
    "rozet çözümleyicisi kullanılıyor",
    rozetler[1].degerEtiketi === "Hesaplanamayanlar",
  );
  kosanBolumler.push("adres");
}

// ===========================================================================
console.log("\n2) DÖNEM ÇÖZÜMÜ");
// ===========================================================================
{
  /**
   * VARSAYILAN "TÜM ZAMANLAR" — bilinçli karar 13.08.2026. Satışlar ve
   * Alımlar bugüne kadar dönemsiz çalışıyordu; varsayılanı "son 30 gün"
   * yapmak eski kayıtları hiç uyarı vermeden ekrandan kaldırırdı.
   */
  const bos = pencereCoz({}, AN);
  kontrol("parametre yoksa zaman süzgeci KAPALI", bos.tur === "" && bos.aralik === undefined, bos);

  const buAy = pencereCoz({ pencere: "BU_AY" }, AN);
  kontrol("BU_AY tanınır", buAy.tur === "BU_AY" && buAy.aralik !== undefined);
  kontrol(
    "BU_AY 1 Ağustos'ta başlar",
    buAy.pencere !== null && gunMetni(buAy.pencere.baslangic) === "2026-08-01",
    buAy.pencere && gunMetni(buAy.pencere.baslangic),
  );
  /**
   * "BU AY" AYIN BAŞINDAN BUGÜNE DEMEK, takvim ayının tamamı değil.
   * 13 Ağustos'ta seçilirse aralık 01–13 Ağustos'tur; ayın kalanı henüz
   * yaşanmadı ve gelecek günleri aralığa katmak "bu ay 0 satış daha var"
   * gibi bir boşluk üretirdi.
   *
   * PANELLE AYNI TANIM: panel bloğu da `pencereOlustur("BU_AY", …)`
   * kullanıyor. Paneldeki kanal adına tıklayınca satış listesine
   * `pencere=BU_AY` taşınıyor; iki ekran aynı günleri sayar, rakamlar tutar.
   */
  kontrol(
    "aralık YARI AÇIK: bitişHariç yarın (14 Ağustos)",
    buAy.aralik !== undefined && gunMetni(buAy.aralik.lt) === "2026-08-14",
    buAy.aralik && gunMetni(buAy.aralik.lt),
  );
  kontrol(
    "ekranda yazılan son gün BUGÜN (13 Ağustos)",
    buAy.pencere !== null && gunMetni(buAy.pencere.sonGun) === "2026-08-13",
    buAy.pencere && gunMetni(buAy.pencere.sonGun),
  );

  const ozel = pencereCoz(
    { pencere: "OZEL", baslangic: "2026-07-01", bitis: "2026-07-15" },
    AN,
  );
  kontrol(
    "özel aralık uçları dahil çözülür",
    ozel.pencere !== null &&
      gunMetni(ozel.pencere.baslangic) === "2026-07-01" &&
      gunMetni(ozel.pencere.sonGun) === "2026-07-15",
    ozel.pencere && [gunMetni(ozel.pencere.baslangic), gunMetni(ozel.pencere.sonGun)],
  );

  /**
   * BOZUK GİRDİ BOŞ LİSTE ÜRETMEZ. Kullanıcı adresi elle kurcalayabilir ya
   * da eski bir yer imi açabilir; "0 kayıt" göstermek yanlış cevabı
   * kendinden emin vermektir.
   */
  kontrol(
    "tanınmayan pencere -> süzgeç kapalı",
    pencereCoz({ pencere: "GECEN_YUZYIL" }, AN).tur === "",
  );
  kontrol(
    "ters özel aralık -> süzgeç kapalı",
    pencereCoz(
      { pencere: "OZEL", baslangic: "2026-08-20", bitis: "2026-08-01" },
      AN,
    ).tur === "",
  );
  kontrol(
    "özel seçili ama tarih eksik -> süzgeç kapalı",
    pencereCoz({ pencere: "OZEL" }, AN).tur === "",
  );
  kosanBolumler.push("dönem");
}

// ===========================================================================
console.log("\n3) SATIŞ KOŞULU");
// ===========================================================================
{
  const bos = satisKosulu({}, AN).kosul;
  kontrol(
    "süzgeç yoksa koşul BOŞ (tüm satışlar)",
    Object.keys(bos).length === 0,
    bos,
  );

  const zamanli = satisKosulu({ pencere: "BU_AY" }, AN).kosul;
  kontrol("dönem seçilince soldAt yazılır", zamanli.soldAt !== undefined);

  const kanal = satisKosulu({ kanal: "TRENDYOL" }, AN).kosul;
  kontrol(
    "kanal kodu ilişkiden süzülür",
    JSON.stringify(kanal.channelAccount) === JSON.stringify({ channel: { code: "TRENDYOL" } }),
    kanal.channelAccount,
  );

  const hesap = satisKosulu({ hesap: "hsp1" }, AN).kosul;
  kontrol(
    "hesap kimliği doğrudan süzülür",
    JSON.stringify(hesap.channelAccount) === JSON.stringify({ id: "hsp1" }),
    hesap.channelAccount,
  );

  /**
   * KANAL + HESAP BİRLİKTE: panelden gelen bağlantı kanal verir, kullanıcı
   * sonra hesabı daraltır. İkisi ayrı bloklara yazılsaydı biri diğerini
   * ezerdi ve süzgeç sessizce kaybolurdu.
   */
  const ikisi = satisKosulu({ kanal: "TRENDYOL", hesap: "hsp1" }, AN).kosul;
  kontrol(
    "kanal ve hesap AYNI blokta birleşir",
    JSON.stringify(ikisi.channelAccount) ===
      JSON.stringify({ id: "hsp1", channel: { code: "TRENDYOL" } }),
    ikisi.channelAccount,
  );

  const karEksik = satisKosulu({ kar: "eksik" }, AN).kosul;
  kontrol("kâr eksik: OR dalı kurulur", Array.isArray(karEksik.OR) && karEksik.OR.length === 2, karEksik.OR);
  kontrol(
    "kâr tam: CALCULATED aranır",
    satisKosulu({ kar: "tam" }, AN).kosul.profitStatus === "CALCULATED",
  );
  kontrol(
    "tanınmayan kâr değeri süzgeç kurmaz",
    satisKosulu({ kar: "belki" }, AN).kosul.profitStatus === undefined,
  );

  kontrol(
    "iade var: some",
    JSON.stringify(satisKosulu({ iade: "var" }, AN).kosul.returns) === JSON.stringify({ some: {} }),
  );
  kontrol(
    "iade yok: none",
    JSON.stringify(satisKosulu({ iade: "yok" }, AN).kosul.returns) === JSON.stringify({ none: {} }),
  );

  kontrol(
    "arama sipariş kodunda süzülür",
    JSON.stringify(satisKosulu({ q: " TY-123 " }, AN).kosul.code) ===
      JSON.stringify({ contains: "TY-123" }),
    satisKosulu({ q: " TY-123 " }, AN).kosul.code,
  );

  // HEPSİ BİR ARADA: hiçbiri diğerini düşürmemeli.
  const hepsi = satisKosulu(
    { pencere: "BU_AY", kanal: "TRENDYOL", hesap: "hsp1", kar: "tam", iade: "var", q: "X" },
    AN,
  ).kosul;
  kontrol(
    "altı süzgeç birlikte yaşar",
    hepsi.soldAt !== undefined &&
      hepsi.channelAccount !== undefined &&
      hepsi.profitStatus === "CALCULATED" &&
      hepsi.returns !== undefined &&
      hepsi.code !== undefined,
    hepsi,
  );
  kosanBolumler.push("satış");
}

// ===========================================================================
console.log("\n4) ALIM KOŞULU");
// ===========================================================================
// Alım koşulu async (arama yolu için); üst düzey `await` tsx'in cjs kipinde
// desteklenmiyor, bu yüzden bölüm bir async fonksiyonda koşuyor.
async function alimBolumu() {
  /**
   * ARAMASIZ ÇAĞRI VERİTABANINA GİTMEZ: `alimAramaKosulu("")` sorgu
   * atmadan `undefined` döner. Bu yüzden bu bölüm de DB'siz koşabiliyor.
   */
  const bos = (await alimKosulu({}, AN)).kosul;
  kontrol("süzgeç yoksa koşul BOŞ (tüm alımlar)", Object.keys(bos).length === 0, bos);

  const zamanli = (await alimKosulu({ pencere: "SON_30_GUN" }, AN)).kosul;
  kontrol("dönem seçilince purchasedAt yazılır", zamanli.purchasedAt !== undefined);

  kontrol(
    "geçerli durum süzülür",
    (await alimKosulu({ durum: "RECEIVED" }, AN)).kosul.status === "RECEIVED",
  );
  /**
   * GEÇERSİZ DURUM SÜZGEÇ KURMAZ. Kurulsaydı Prisma bilinmeyen enum
   * değeriyle patlar ve kullanıcı "sistem çöktü" görürdü.
   */
  kontrol(
    "tanınmayan durum süzgeç kurmaz",
    (await alimKosulu({ durum: "YOLDA" }, AN)).kosul.status === undefined,
  );

  kontrol(
    "hesap süzülür",
    (await alimKosulu({ hesap: "hsp9" }, AN)).kosul.channelAccountId === "hsp9",
  );
  kontrol(
    "tedarikçi süzülür",
    (await alimKosulu({ tedarikci: "ted1" }, AN)).kosul.supplierId === "ted1",
  );
  kontrol(
    "kart süzülür",
    (await alimKosulu({ kart: "krt1" }, AN)).kosul.creditCardId === "krt1",
  );

  const hepsi = (
    await alimKosulu(
      { pencere: "BU_AY", durum: "PARTIAL", hesap: "h", tedarikci: "t", kart: "k" },
      AN,
    )
  ).kosul;
  kontrol(
    "beş süzgeç birlikte yaşar",
    hepsi.purchasedAt !== undefined &&
      // `status` tipi enum süzgeci de olabildiği için metne çevrilip
      // karşılaştırılıyor; koşul kurucusu düz enum değeri yazıyor.
      String(hepsi.status) === "PARTIAL" &&
      hepsi.channelAccountId === "h" &&
      hepsi.supplierId === "t" &&
      hepsi.creditCardId === "k",
    hepsi,
  );
  kosanBolumler.push("alım");
}

// ===========================================================================
/**
 * ÖZET ASYNC BÖLÜMDEN SONRA YAZILIR. Beklenmezse özet "hepsi geçti" der ve
 * 4. bölümün kontrolleri hiç sayılmaz — yeşil yanan ama bir şeyi ölçmeyen
 * doğrulayıcı, olmayandan tehlikelidir. Bölüm sayacı da bunu kilitliyor.
 */
alimBolumu().then(() => {
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
});
