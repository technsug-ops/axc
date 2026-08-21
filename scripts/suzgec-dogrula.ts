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

import { alimAramaKosulu } from "../src/lib/alim-arama";
import { gunMetni } from "../src/lib/donem";
import { PurchaseStatus } from "../src/generated/prisma/enums";
import {
  ALIM_BEKLEYEN_KODU,
  ALIM_DURUM_KODLARI,
  alimKosulu,
  pencereCoz,
  satisKosulu,
} from "../src/lib/liste-suzgeci";
import { GOREV_ADRESLERI } from "../src/lib/panel/bugun-ne-yapmaliyim";
import { aktifSuzgecler, suzgecAdresi } from "../src/lib/suzgec";
import {
  donemRozetiCizilirMi,
  temizlemeDegisiklikleri,
} from "../src/lib/suzgec";
import {
  LISTE_PENCERELERI,
  PANEL_VARSAYILAN_PENCERE,
} from "../src/lib/donem";

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

  /**
   * ── DÜN — TEK GÜN, BUGÜNÜ İÇERMEZ (kullanıcı isteği 21.08.2026) ────────
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR: DÜN ile BUGUN yan yana
   * sınanıyor. Yalnız "dün 12 Ağustos'ta başlar" yazsaydım, `sonGun`u
   * bugünde bırakan bir hata (yani dünü İKİ GÜNE çeviren hata) yeşil
   * kalırdı — başlangıç yine doğru olurdu.
   */
  const dun = pencereCoz({ pencere: "DUN" }, AN);
  kontrol("DUN tanınır", dun.tur === "DUN" && dun.aralik !== undefined, dun.tur);
  kontrol(
    "DÜN 12 Ağustos'ta başlar (AN = 13 Ağustos)",
    dun.pencere !== null && gunMetni(dun.pencere.baslangic) === "2026-08-12",
    dun.pencere && gunMetni(dun.pencere.baslangic),
  );
  kontrol(
    "DÜN 12 Ağustos'ta BİTER — bugünü İÇERMEZ",
    dun.pencere !== null && gunMetni(dun.pencere.sonGun) === "2026-08-12",
    dun.pencere && gunMetni(dun.pencere.sonGun),
  );
  kontrol(
    "DÜN tek gündür (bitişHariç = bugün)",
    dun.pencere !== null && gunMetni(dun.pencere.bitisHaric) === "2026-08-13",
    dun.pencere && gunMetni(dun.pencere.bitisHaric),
  );
  const bugunP = pencereCoz({ pencere: "BUGUN" }, AN);
  kontrol(
    "DÜN ile BUGÜN çakışmıyor (dün biter, bugün başlar)",
    dun.pencere !== null &&
      bugunP.pencere !== null &&
      dun.pencere.bitisHaric.getTime() === bugunP.pencere.baslangic.getTime(),
    {
      dunBitis: dun.pencere && gunMetni(dun.pencere.bitisHaric),
      bugunBas: bugunP.pencere && gunMetni(bugunP.pencere.baslangic),
    },
  );

  /**
   * ⚠ DÜĞME SIRASI DA BİR SÖZDÜR — `LISTE_PENCERELERI`nin sırası ekrandaki
   * sıradır (`SuzgecCubugu` doğrudan bu diziyi geziyor). Kullanıcı kararı
   * 21.08.2026: DÜN önde. Sıra sessizce değişirse kimse fark etmez, o
   * yüzden testle sabitlendi.
   */
  kontrol(
    "süzgeç sırası DÜN ile başlar, sonra BUGÜN",
    LISTE_PENCERELERI[0] === "DUN" && LISTE_PENCERELERI[1] === "BUGUN",
    LISTE_PENCERELERI.slice(0, 3),
  );

  /**
   * ⚠ PANEL VARSAYILANI TESTE BAĞLI (21.08.2026 kullanıcı kararı: BUGUN).
   *
   * Varsayılan sessizce değişirse kimse fark etmez — panel açılır, rakamlar
   * başka bir dönemi gösterir ve "satışlarım azaldı" diye okunur. Sabit
   * burada mühürlü; değiştirmek isteyen testi de değiştirmek zorunda ve
   * o an gerekçeyi yazmak zorunda kalır.
   *
   * ⚠ LİSTELERİN VARSAYILANI AYRI VE DEĞİŞMEDİ: `pencereCoz` parametresiz
   * çağrıldığında hâlâ KAPALI dönüyor (yukarıdaki kontrol). İkisi aynı
   * testte yan yana duruyor ki biri ötekine "düzeltilmesin".
   */
  kontrol(
    "panel varsayılanı BUGUN",
    PANEL_VARSAYILAN_PENCERE === "BUGUN",
    PANEL_VARSAYILAN_PENCERE,
  );
  kontrol(
    "  ...ama listelerin varsayılanı hâlâ KAPALI (tüm zamanlar)",
    pencereCoz({}, AN).tur === "",
  );

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
  /**
   * ⚠ 17.08.2026'da DEĞİŞTİ: koşul artık boş değil, İPTAL SÜZGECİ taşıyor.
   * Test eski kararı kodluyordu. Amaç aynı kaldı — "kullanıcı süzgeç
   * seçmediyse fazladan daraltma OLMAMALI" — ama iptal süzgeci bilinçli bir
   * daraltmadır: iptal edilen satış ciroya girmez ve varsayılan olarak
   * gizlidir (`?iptal=1` ile görünür).
   */
  kontrol(
    "süzgeç yoksa YALNIZ iptal süzgeci var",
    Object.keys(bos).length === 1 && bos.iptalTarihi === null,
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

  /**
   * ⚠ YAPI DEĞİŞTİ 17.08.2026: arama artık tek alana değil ALTI alana bakıyor
   * ve `AND` içinde sarmalanmış bir `OR` olarak yazılıyor (kar süzgecinin
   * kendi OR'unu ezmemek için). Kontrol, kırpmanın hâlâ çalıştığını ve
   * sipariş kodunun aranan alanlar arasında olduğunu doğruluyor.
   */
  kontrol(
    "arama kırpılır ve sipariş kodu aranan alanlar arasında",
    JSON.stringify(satisKosulu({ q: " TY-123 " }, AN).kosul).includes(
      '{"code":{"contains":"TY-123"}}',
    ),
    satisKosulu({ q: " TY-123 " }, AN).kosul,
  );


  /**
   * KARGO SÜZGECİ (14.08.2026). Panelin "kargoya verilen / bekleyen" kutusu
   * bu koşula bağlanıyor; kaynağı `Sale.shippedAt`.
   */
  kontrol(
    "kargo verildi: shippedAt DOLU aranır",
    JSON.stringify(satisKosulu({ kargo: "verildi" }, AN).kosul.shippedAt) ===
      JSON.stringify({ not: null }),
    satisKosulu({ kargo: "verildi" }, AN).kosul.shippedAt,
  );
  kontrol(
    "kargo bekleyen: shippedAt BOŞ aranır",
    satisKosulu({ kargo: "bekleyen" }, AN).kosul.shippedAt === null,
    satisKosulu({ kargo: "bekleyen" }, AN).kosul.shippedAt,
  );
  kontrol(
    "tanınmayan kargo değeri süzgeç kurmaz",
    satisKosulu({ kargo: "yolda" }, AN).kosul.shippedAt === undefined,
  );

  /**
   * ════════════════════════════════════════════════════════════════════
   *  DÖNEM, KARGO SÜZGECİNDE TARİH EKSENİNİ DEĞİŞTİRİR (15.08.2026)
   * --------------------------------------------------------------------
   *  Panelin "kargoya verildi" sayacı `shippedAt`e göre sayıyor. Bu liste
   *  `soldAt`a göre süzülseydi, dün satılıp bugün kargolanan paket
   *  sayaçta VAR listede YOK olurdu — Halil testi maddesi (c) düşerdi.
   *
   *  ESKİ TEST BUNU GÖREMEZDİ: yalnız `shippedAt`in DOLU olup olmadığına
   *  bakıyordu, döneme hiç bakmıyordu. Dönem ekseni test edilmemiş bir
   *  boyuttu; test edilmeyen boyutta hata görünmez.
   * ════════════════════════════════════════════════════════════════════
   */
  const kargoDonemli = satisKosulu(
    { kargo: "verildi", pencere: "BU_AY" },
    AN,
  ).kosul;
  kontrol(
    "kargo verildi + dönem: dönem shippedAt'e uygulanır",
    typeof kargoDonemli.shippedAt === "object" &&
      kargoDonemli.shippedAt !== null &&
      "gte" in kargoDonemli.shippedAt,
    kargoDonemli.shippedAt,
  );
  kontrol(
    "  ...ve soldAt'e UYGULANMAZ (yoksa 'bu ay satılmış VE kargolanmış' olurdu)",
    kargoDonemli.soldAt === undefined,
    kargoDonemli.soldAt,
  );
  kontrol(
    "kargo süzgeci YOKKEN dönem yine soldAt'e uygulanır",
    (() => {
      const k = satisKosulu({ pencere: "BU_AY" }, AN).kosul;
      return k.soldAt !== undefined && k.shippedAt === undefined;
    })(),
  );
  kontrol(
    "kargo bekleyen + dönem: dönem SATIŞ tarihine uygulanır (elle seçim)",
    (() => {
      const k = satisKosulu({ kargo: "bekleyen", pencere: "BU_AY" }, AN).kosul;
      return k.shippedAt === null && k.soldAt !== undefined;
    })(),
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
      // Arama artık AND/OR içinde — kod alanı orada aranıyor.
      JSON.stringify(hepsi).includes('"code":{"contains"'),
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

  /**
   * ARAMA HANGİ ALANLARA BAKIYOR — 14.08.2026 KULLANICI BULGUSU.
   *
   * Kullanıcı alım listesinde `axcali1603` aradı, "0 kayıt" gördü. Kayıt
   * yoktu ama arama ürün alanlarına ZATEN BAKMIYORDU. "0 kayıt" cevabı,
   * aramanın o alana hiç bakmamasından geliyorsa yalandır ve kullanıcı
   * kaydın olmadığına inanır.
   *
   * İKİ KARAKTERLİK TERİM BİLEREK: sadeleştirilmiş tarama 3 karakterden
   * kısa terimlerde çalışmaz, yani bu kontrol VERİTABANINA GİTMEZ.
   */
  const aramaKosulu = await alimAramaKosulu("ab");
  const dallar = (aramaKosulu?.OR ?? []) as unknown[];
  const aramaMetni = JSON.stringify(aramaKosulu);
  const beklenenAlanlar: [string, string][] = [
    ["alım kodu", '{"code":{"contains":"ab"}}'],
    ["tedarikçi sipariş no", '{"supplierOrderNo":{"contains":"ab"}}'],
    ["tedarikçi adı (serbest metin)", '{"supplierName":{"contains":"ab"}}'],
    ["tedarikçi adı (kayıtlı)", '{"supplier":{"is":{"name":{"contains":"ab"}}}}'],
    ["ürün SKU", '{"items":{"some":{"variant":{"sku":{"contains":"ab"}}}}}'],
    [
      "ürün Firma SKU",
      '{"items":{"some":{"variant":{"companySku":{"contains":"ab"}}}}}',
    ],
    [
      "ürün barkod",
      '{"items":{"some":{"variant":{"barcode":{"contains":"ab"}}}}}',
    ],
    [
      "ürün adı",
      '{"items":{"some":{"variant":{"product":{"name":{"contains":"ab"}}}}}}',
    ],
  ];
  for (const [ad, parca] of beklenenAlanlar) {
    kontrol(`  alım araması ${ad} alanına bakıyor`, aramaMetni.includes(parca), parca);
  }
  kontrol("aranan alan sayısı beklenenle tutuyor", dallar.length === beklenenAlanlar.length, dallar.length);
  kontrol("boş arama süzgeç KURMAZ", (await alimAramaKosulu("")) === undefined);

  /* ==========================================================================
   *  SATIŞ ARAMASI — 17.08.2026 kullanıcı isteği
   * ------------------------------------------------------------------------
   *  Arama YALNIZ sipariş numarasına bakıyordu. "Bu ürünü hangi siparişte
   *  sattım", "şu pazaryeri SKU hangi satışlarda geçti" cevapsızdı.
   * ========================================================================*/
  const satisArama = satisKosulu({ q: "ab" }, AN).kosul;
  const satisMetni = JSON.stringify(satisArama);
  const satisAlanlari: [string, string][] = [
    ["sipariş no", '{"code":{"contains":"ab"}}'],
    ["ürün SKU", '{"items":{"some":{"variant":{"sku":{"contains":"ab"}}}}}'],
    ["ürün Firma SKU", '{"items":{"some":{"variant":{"companySku":{"contains":"ab"}}}}}'],
    ["ürün barkod", '{"items":{"some":{"variant":{"barcode":{"contains":"ab"}}}}}'],
    ["PAZARYERİ SKU", '{"channelSku":{"contains":"ab"}}'],
    ["ürün adı", '{"product":{"name":{"contains":"ab"}}}'],
  ];
  for (const [ad, parca] of satisAlanlari) {
    kontrol(`  satış araması ${ad} alanına bakıyor`, satisMetni.includes(parca), parca);
  }

  /**
   * ÇAKIŞMA TESTİ: `kar=eksik` kendi OR'unu yazıyor. Arama da OR yazsaydı
   * biri ötekini EZERDİ ve süzgeçlerden biri sessizce kaybolurdu.
   */
  const ikili = satisKosulu({ q: "ab", kar: "eksik" }, AN).kosul;
  const ikiliMetni = JSON.stringify(ikili);
  kontrol(
    "arama + kar=eksik BİRLİKTE çalışır (arama korunur)",
    ikiliMetni.includes('"code":{"contains":"ab"}'),
  );
  kontrol(
    "  ...kâr süzgeci de korunur",
    ikiliMetni.includes('"profitStatus":null'),
  );
  kontrol("boş aramada satış süzgeci kurulmaz", !JSON.stringify(satisKosulu({}, AN).kosul).includes("contains"));

  const hepsi = (
    await alimKosulu(
      {
        pencere: "BU_AY",
        durum: "PARTIALLY_RECEIVED",
        hesap: "h",
        tedarikci: "t",
        kart: "k",
      },
      AN,
    )
  ).kosul;
  kontrol(
    "beş süzgeç birlikte yaşar",
    hepsi.purchasedAt !== undefined &&
      // `status` tipi enum süzgeci de olabildiği için metne çevrilip
      // karşılaştırılıyor; koşul kurucusu düz enum değeri yazıyor.
      String(hepsi.status) === "PARTIALLY_RECEIVED" &&
      hepsi.channelAccountId === "h" &&
      hepsi.supplierId === "t" &&
      hepsi.creditCardId === "k",
    hepsi,
  );

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  SÜZGEÇ KODLARI ŞEMAYLA TUTUYOR MU — KÖR NOKTA KAPANIYOR
   * ----------------------------------------------------------------------
   *  15.08.2026: `ALIM_DURUM_KODLARI` içinde `PARTIAL` yazıyordu, şemadaki
   *  değer `PARTIALLY_RECEIVED`. Açılır liste doğru değeri gönderiyor,
   *  koşul kurucusu onu TANIMIYOR ve süzgeç SESSİZCE DÜŞÜYORDU: kullanıcı
   *  "Kısmen teslim alındı"yı seçiyor, liste bütün alımları gösteriyordu.
   *
   *  TESTLER BUNU NEDEN YAKALAMADI: yukarıdaki kontrol de `PARTIAL`
   *  kullanıyordu. Kod ve test AYNI yanlış sabiti paylaşıyordu; birbirleriyle
   *  uyuşuyor, ŞEMAYLA uyuşmuyorlardı. Sabiti sabitle karşılaştırmak hiçbir
   *  şey kanıtlamaz — DIŞ KAYNAKLA karşılaştırmak gerekiyordu.
   *
   *  Aşağıdaki kontrol listeyi Prisma'nın ürettiği enum ile karşılaştırıyor:
   *  şemaya yeni bir durum eklenir ya da adı değişirse burada kırılır.
   */
  const semaDurumlari = Object.keys(PurchaseStatus).sort();
  const suzgecDurumlari = [...ALIM_DURUM_KODLARI].sort();
  kontrol(
    "alım durum kodları ŞEMA enum'uyla birebir",
    JSON.stringify(semaDurumlari) === JSON.stringify(suzgecDurumlari),
    { sema: semaDurumlari, suzgec: suzgecDurumlari },
  );

  /** Bileşik "bekleyen" kodu: iki durumu birlikte süzer. */
  const bekleyen = (await alimKosulu({ durum: ALIM_BEKLEYEN_KODU }, AN)).kosul;
  kontrol(
    "BEKLEYEN kodu ORDERED + PARTIALLY_RECEIVED süzüyor",
    JSON.stringify(bekleyen.status) ===
      JSON.stringify({ in: ["ORDERED", "PARTIALLY_RECEIVED"] }),
    bekleyen.status,
  );
  /**
   * PANELİN SÖZÜ: sayı = liste. Görev kutusunun adresi, sayıyı üreten
   * koşulun AYNISINI taşımalı. Adres tek bir duruma gitseydi panel 5 der,
   * liste 4 gösterirdi.
   */
  kontrol(
    "görev kutusu 'mal kabul bekleyen' adresi BEKLEYEN kodunu taşıyor",
    GOREV_ADRESLERI.malKabulBekleyen.includes(`durum=${ALIM_BEKLEYEN_KODU}`),
    GOREV_ADRESLERI.malKabulBekleyen,
  );
  kontrol(
    "  ...ve 'bekleyen iade bildirimi' adresi süzgeçli",
    GOREV_ADRESLERI.iadeBildirimi.includes("bekleyen=1"),
    GOREV_ADRESLERI.iadeBildirimi,
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

/**
 * ============================================================================
 *  SABİT DÖNEM — ROZET ÇİZİLMEZ, "TEMİZLE" DÖNEMİ ELLEMEZ
 * ----------------------------------------------------------------------------
 *  ⚠ BU TEST BİR MUTASYON BULGUSUNDAN DOĞDU (21.08.2026): kural önce
 *  doğrudan `SuzgecCubugu` bileşenine yazılmıştı ve devre dışı bırakılması
 *  HİÇBİR testi kırmadı. Yeşil test, sınanmış kural demek değil.
 *
 *  ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR: aynı dönem (`BU_AY`) bir
 *  kez sabit, bir kez serbest veriliyor. Tek yakayla sınansaydı "sabiti
 *  görmezden gel" mutasyonu yeşil kalırdı.
 * ============================================================================
 */
// ===========================================================================
console.log("\n5) SABİT DÖNEM — ROZET VE TEMİZLE");
// ===========================================================================
{
  kontrol(
    "serbest dönemde rozet ÇİZİLİR",
    donemRozetiCizilirMi("BU_AY", false),
  );
  kontrol(
    "SABİT dönemde rozet çizilmez (mavi düğmenin tekrarı olurdu)",
    !donemRozetiCizilirMi("BU_AY", true),
  );
  kontrol(
    "dönem hiç seçilmemişse serbestte de rozet yok",
    !donemRozetiCizilirMi("", false),
  );

  const serbest = temizlemeDegisiklikleri(["kanal", "hesap"], false);
  kontrol(
    "serbest dönemde Temizle DÖNEMİ de sıfırlar",
    serbest.pencere === "" &&
      serbest.baslangic === "" &&
      serbest.bitis === "" &&
      serbest.kanal === "",
    serbest,
  );

  const sabit = temizlemeDegisiklikleri(["kanal", "hesap"], true);
  kontrol(
    "SABİT dönemde Temizle dönemi ELLEMEZ",
    !("pencere" in sabit) && !("baslangic" in sabit) && !("bitis" in sabit),
    sabit,
  );
  kontrol(
    "  ...ama öteki süzgeçleri yine temizler",
    sabit.kanal === "" && sabit.hesap === "",
    sabit,
  );
  kosanBolumler.push("sabit dönem");
}
