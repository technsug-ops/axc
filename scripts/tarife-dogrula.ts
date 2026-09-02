import { readFileSync } from "node:fs";

import { ENGEL_ANAHTARI } from "../src/lib/komisyon/tarife-engeli";
import { teklifDosyasiMi } from "../src/lib/komisyon/tarife-okuyucu";
import {
  dilimBul,
  pencereCoz,
  tarifeOku,
  type TarifeDilimi,
} from "../src/lib/komisyon/tarife-okuyucu";
import {
  raporMetni,
  tarifePlaniKur,
  yazilabilirMi,
} from "../src/lib/komisyon/tarife-plan";
import {
  BOSLUK_OLCUMU,
  DIKIS_TAVANI_SAAT,
  bosluklariBul,
  gorusSiniriMi,
} from "../src/lib/komisyon/kapsam-boslugu";
import {
  tarifeKapsami,
  tarifeUyarisiVarMi,
} from "../src/lib/panel/tarife-penceresi";

/**
 * ============================================================================
 *  KOMİSYON TARİFESİ OKUYUCUSU — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Saf katman sınanır; veritabanına gidilmez. Kontroller DEĞERE bakar,
 *  kaynak metnine değil.
 *
 *  Gerçek dosyayla da denendi (18.08.2026): 161 satır → 160 kalem +
 *  1 mükerrer, 0 atlanan, pencere 14 Ağu 08:00 → 18 Ağu 07:59 (İstanbul).
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

const BUGUN = new Date("2026-08-18T09:00:00Z");

/** Gerçek dosyanın başlık satırı — ölçülmüş sıra ve tekrarlarla. */
const BASLIK = [
  "ÜRÜN İSMİ",
  "BARKOD",
  "SATICI STOK KODU",
  "1.Fiyat Alt Limit",
  "2.Fiyat Üst Limiti",
  "2.Fiyat Alt Limit",
  "3.Fiyat Üst Limiti",
  "3.Fiyat Alt Limit",
  "4.Fiyat Üst Limiti",
  "Tarih aralığı (3 Gün)",
  "1.KOMİSYON",
  "2.KOMİSYON",
  "3.KOMİSYON",
  "4.KOMİSYON",
  "Tarih aralığı (4 Gün)",
  "1.KOMİSYON",
  "2.KOMİSYON",
  "3.KOMİSYON",
  "4.KOMİSYON",
  "GÜNCEL KOMİSYON",
  "TARİFE GRUBU",
];

/** Bir satır kurar. `blok` hangi pencere yuvasının dolu olduğunu söyler. */
function satir(
  barkod: string,
  limitler: (number | null)[] = [769.99, 769.98, 701.29, 701.28, 641.09, 641.08],
  oranlar: number[] = [18, 12.8, 11.1, 9.3],
  blok: 3 | 4 = 4,
  guncel: number | null = 18,
) {
  const bosDort = [null, null, null, null];
  return [
    "Manuel Rondo 500 ml",
    barkod,
    "EN10000283784",
    ...limitler,
    blok === 3 ? "14 Ağustos 08.00-18 Ağustos 07.59" : null,
    ...(blok === 3 ? oranlar : bosDort),
    blok === 4 ? "14 Ağustos 08.00-18 Ağustos 07.59" : null,
    ...(blok === 4 ? oranlar : bosDort),
    guncel,
    "034bd9e6cfa495614d55675a24b6b6f9",
  ];
}

console.log("\nKOMİSYON TARİFESİ — DOĞRULAMA\n");

// --- 1) PENCERE ÇÖZÜMÜ -------------------------------------------------------
{
  console.log("1) PENCERE ÇÖZÜMÜ");
  const p = pencereCoz("14 Ağustos 08.00-18 Ağustos 07.59", BUGUN);
  kontrol("pencere çözüldü", p !== null);
  /**
   * İŞ SAAT DİLİMİ: dosyadaki 08.00 Türkiye saatidir. Ağustosta İstanbul
   * UTC+3, yani 05:00Z. Ortamın saat dilimi kullanılsaydı bu rakam
   * çalıştığın makineye göre değişirdi.
   */
  kontrol(
    "08.00 İstanbul → 05:00Z",
    p?.baslangic.toISOString() === "2026-08-14T05:00:00.000Z",
    p?.baslangic.toISOString(),
  );
  kontrol(
    "07.59 İstanbul → 04:59Z",
    p?.bitis.toISOString() === "2026-08-18T04:59:00.000Z",
    p?.bitis.toISOString(),
  );

  /**
   * ⚠ YIL DÖNÜMÜ — metinde YIL YOK. Aralıkta başlayıp Ocakta biten
   * pencere yılda BİR kez oluşur; ele alınmasaydı bitiş başlangıçtan
   * önce çıkar, tarife "zaten bitmiş" görünür ve hiç geçerli sayılmazdı.
   */
  const yilbasi = pencereCoz(
    "30 Aralık 08.00-2 Ocak 07.59",
    new Date("2026-12-30T09:00:00Z"),
  );
  kontrol("yıl dönümü: bitiş SONRAKİ yıl", yilbasi !== null && yilbasi.bitis > yilbasi.baslangic);
  kontrol(
    "  ...bitiş 2027'de",
    yilbasi?.bitis.getUTCFullYear() === 2027,
    yilbasi?.bitis.toISOString(),
  );

  /**
   * ⚠ OFSET ÖLÇÜLÜR, SABİT YAZILMAZ — ve bu test onu KANITLAR.
   *
   * İlk yazılışında mutasyon (`ofset = +3 saat` sabiti) YEŞİL kalmıştı:
   * Türkiye 2016'dan beri kalıcı UTC+3 olduğu için bugünkü tarihlerde
   * sabit ile ölçülen aynı sonucu veriyor. Yani "yaz saati dönerse korur"
   * iddiam korumasızdı — yalancı yeşil.
   *
   * 2015 Ocak'ta İstanbul UTC+2 idi. Aynı "08.00" o tarihte 06:00Z eder.
   * Sabit ofset bu satırı 05:00Z yazar ve test kırmızı yanar.
   */
  const eski = pencereCoz(
    "14 Ocak 08.00-18 Ocak 07.59",
    new Date("2015-01-15T09:00:00Z"),
  );
  kontrol(
    "2015 Ocak: 08.00 İstanbul → 06:00Z (o tarihte UTC+2)",
    eski?.baslangic.toISOString() === "2015-01-14T06:00:00.000Z",
    eski?.baslangic.toISOString(),
  );

  kontrol("boş metin → null", pencereCoz("", BUGUN) === null);
  kontrol("tanınmayan metin → null", pencereCoz("bir ara", BUGUN) === null);
  kontrol("bilinmeyen ay → null", pencereCoz("14 Fizmert 08.00-18 Fizmert 07.59", BUGUN) === null);
  /** Nokta yerine iki nokta da kabul — biçim değişirse okuma düşmesin. */
  kontrol("saat ayracı ':' de çözülür", pencereCoz("14 Ağustos 08:00-18 Ağustos 07:59", BUGUN) !== null);
}

// --- 2) DİLİM YAPISI ---------------------------------------------------------
{
  console.log("\n2) DİLİM YAPISI");
  const o = tarifeOku([BASLIK, satir("111")], BUGUN);
  kontrol("eksik sütun YOK", o.eksikSutunlar.length === 0, o.eksikSutunlar);
  kontrol("bir satır okundu", o.satirlar.length === 1);
  const d = o.satirlar[0].dilimler;
  kontrol("dört dilim", d.length === 4);
  /** UÇLAR AÇIK: en pahalı dilimin üstü, en ucuzunun altı sınırsız. */
  kontrol("1. dilimin ÜSTÜ açık", d[0].ustLimit === null);
  kontrol("4. dilimin ALTI açık", d[3].altLimit === null);
  kontrol("1. dilim alt sınır 769,99", d[0].altLimit === 769.99);
  kontrol("2. dilim 701,29–769,98", d[1].altLimit === 701.29 && d[1].ustLimit === 769.98);
  kontrol("4. dilim üst sınır 641,08", d[3].ustLimit === 641.08);
  kontrol("oranlar sırayla", d.map((x) => x.oran).join(",") === "18,12.8,11.1,9.3");
  /** Oran fiyat düştükçe UCUZLAR — Trendyol'un mekanizması budur. */
  kontrol(
    "oran fiyat düştükçe AZALIYOR",
    d[0].oran > d[1].oran && d[1].oran > d[2].oran && d[2].oran > d[3].oran,
  );
  kontrol("pencere okundu", o.pencere !== null);
  kontrol("tarife grubu okundu", o.tarifeGrubu === "034bd9e6cfa495614d55675a24b6b6f9");
}

// --- 3) DOLU BLOK SEÇİMİ — EN KRİTİK ----------------------------------------
{
  console.log("\n3) DOLU KOMİSYON BLOĞU SEÇİLİR");
  /**
   * ⚠ Dosyada `1.KOMİSYON`…`4.KOMİSYON` başlıkları İKİ KEZ geçiyor: iki
   * pencere yuvası için. O hafta hangisi yayımlandıysa YALNIZ O dolu
   * geliyor (ölçüldü: 3 Gün bloğu 161/161 boş, 4 Gün bloğu dolu).
   *
   * "İlk bloğu al" deseydik gerçek dosyada TAMAMEN BOŞ bloğu okur ve
   * tarifeyi oransız yazardık — üstelik sessizce.
   */
  const dorduncuDolu = tarifeOku([BASLIK, satir("111", undefined, undefined, 4)], BUGUN);
  kontrol("2. blok doluysa ONDAN okur", dorduncuDolu.satirlar[0]?.dilimler[0].oran === 18);

  const ucuncuDolu = tarifeOku(
    [BASLIK, satir("111", undefined, [7, 6, 5, 4], 3)],
    BUGUN,
  );
  kontrol("1. blok doluysa ONDAN okur", ucuncuDolu.satirlar[0]?.dilimler[0].oran === 7);

  /** Her iki blok da boşsa tarife yazılmaz — oransız tarife yalan olurdu. */
  const ikisiDeBos = tarifeOku(
    [BASLIK, ["x", "111", "s", 1, 2, 3, 4, 5, 6, null, null, null, null, null, null, null, null, null, null, 18, "g"]],
    BUGUN,
  );
  kontrol("iki blok da boşsa REDDEDİLİR", ikisiDeBos.eksikSutunlar.length > 0, ikisiDeBos.eksikSutunlar);
}

// --- 4) MÜKERRER ELEME -------------------------------------------------------
{
  console.log("\n4) MÜKERRER SATIR");
  /**
   * Ölçüldü: gerçek dosyada bir barkod iki kez geçiyor ve iki satır
   * BİREBİR aynı. "İki dilim seti" sanılmamalı.
   */
  const ayni = tarifeOku([BASLIK, satir("111"), satir("111")], BUGUN);
  kontrol("birebir aynı satır ELENİR", ayni.satirlar.length === 1);
  kontrol("  ...ve SAYILIR", ayni.mukerrerElenen === 1);

  /**
   * ⚠ AMA AYNI BARKOD FARKLI TARİFEYLE GELİRSE O MÜKERRER DEĞİLDİR —
   * gerçek bir çelişkidir ve elenirse veri sessizce kaybolur. İmza
   * dilimleri de kapsadığı için ikisi ayrışır.
   */
  const farkli = tarifeOku(
    [BASLIK, satir("111"), satir("111", undefined, [20, 15, 12, 10])],
    BUGUN,
  );
  kontrol("aynı barkod FARKLI tarife → elenmez", farkli.satirlar.length === 2, farkli.satirlar.length);
  kontrol("  ...mükerrer sayılmaz", farkli.mukerrerElenen === 0);
}

// --- 5) ATLANAN SATIRLAR SESSİZ DEĞİL ---------------------------------------
{
  console.log("\n5) ATLANAN SATIRLAR");
  const barkodsuz = tarifeOku([BASLIK, satir(""), satir("111")], BUGUN);
  kontrol("barkodsuz satır atlanır", barkodsuz.satirlar.length === 1);
  kontrol("  ...ve sebebiyle SAYILIR", barkodsuz.atlananlar[0]?.sebep === "barkod boş");
  kontrol("  ...satır numarası verilir", barkodsuz.atlananlar[0]?.satirNo === 2);

  /**
   * ⚠ SAĞLAM SATIR DA OLMALI. İlk yazılışında dosyada YALNIZ bozuk satır
   * vardı ve okuyucu haklı olarak "bu blok tamamen boş" deyip tarifeyi
   * reddetti — testin sınamak istediği "tek satır atlanır" yolu hiç
   * koşmadı. İki davranış da doğru ama AYRI; testin hangisini sınadığı
   * belli olmalı.
   */
  const oransiz = tarifeOku(
    [
      BASLIK,
      satir("111"),
      ["x", "222", "s", 1, 2, 3, 4, 5, 6, null, null, null, null, null, "p", 18, null, 11, 9, 18, "g"],
    ],
    BUGUN,
  );
  kontrol("sağlam satır okunur", oransiz.satirlar.length === 1);
  kontrol("dilim oranı eksik satır atlanır", oransiz.atlananlar.length === 1);
  kontrol("  ...sebep yazılı", oransiz.atlananlar[0]?.sebep === "dilim oranı eksik");

  /** TÜM satırlar bozuksa blok boş sayılır — ayrı ve doğru bir yol. */
  const hepsiBozuk = tarifeOku(
    [BASLIK, ["x", "222", "s", 1, 2, 3, 4, 5, 6, null, null, null, null, null, "p", 18, null, 11, 9, 18, "g"]],
    BUGUN,
  );
  kontrol(
    "tüm satırlar bozuksa TARİFE REDDEDİLİR",
    hepsiBozuk.eksikSutunlar.length > 0,
    hepsiBozuk.eksikSutunlar,
  );
}

// --- 6) EKSİK KOLON ----------------------------------------------------------
{
  console.log("\n6) EKSİK KOLON");
  const barkodsuzBaslik = BASLIK.filter((b) => b !== "BARKOD");
  const o = tarifeOku([barkodsuzBaslik, []], BUGUN);
  kontrol("BARKOD yoksa bildirilir", o.eksikSutunlar.includes("BARKOD"));
  const limitsiz = BASLIK.filter((b) => b !== "3.Fiyat Alt Limit");
  const o2 = tarifeOku([limitsiz, []], BUGUN);
  kontrol("limit kolonu yoksa bildirilir", o2.eksikSutunlar.includes("fiyat limit kolonları"));
  kontrol("boş dosya bildirilir", tarifeOku([], BUGUN).eksikSutunlar.includes("(dosya boş)"));
}

// --- 7) DİLİM BULMA — SINIRLAR -----------------------------------------------
{
  console.log("\n7) DİLİM BULMA (fiyatlama aracının hesabı)");
  const d: TarifeDilimi[] = [
    { sira: 1, altLimit: 769.99, ustLimit: null, oran: 18 },
    { sira: 2, altLimit: 701.29, ustLimit: 769.98, oran: 12.8 },
    { sira: 3, altLimit: 641.09, ustLimit: 701.28, oran: 11.1 },
    { sira: 4, altLimit: null, ustLimit: 641.08, oran: 9.3 },
  ];
  kontrol("1999 → 1. dilim", dilimBul(d, 1999)?.sira === 1);
  /** SINIR DEĞERLER: kuruşu kayan bir karşılaştırma yanlış dilim seçtirir. */
  kontrol("769,99 (tam sınır) → 1. dilim", dilimBul(d, 769.99)?.sira === 1);
  kontrol("769,98 → 2. dilim", dilimBul(d, 769.98)?.sira === 2);
  kontrol("701,29 → 2. dilim", dilimBul(d, 701.29)?.sira === 2);
  kontrol("701,28 → 3. dilim", dilimBul(d, 701.28)?.sira === 3);
  kontrol("641,08 → 4. dilim", dilimBul(d, 641.08)?.sira === 4);
  kontrol("1 TL → 4. dilim (alt uç açık)", dilimBul(d, 1)?.sira === 4);
  kontrol("999999 → 1. dilim (üst uç açık)", dilimBul(d, 999999)?.sira === 1);

  /**
   * FİYAT DÜŞÜRMENİN KAZANCI — aracın cevaplayacağı asıl soru.
   * 769,99'dan 769,98'e bir kuruş inmek komisyonu %18'den %12,8'e
   * düşürüyor: bir kuruş fiyat kaybına karşılık ciro başına %5,2 komisyon.
   */
  const ust = dilimBul(d, 769.99)!;
  const alt = dilimBul(d, 769.98)!;
  kontrol("bir kuruş inince oran 5,2 puan düşer", Math.abs(ust.oran - alt.oran - 5.2) < 0.001);
}

// --- 8) GÜNCEL KOMİSYON = KANAL BEYANI --------------------------------------
{
  console.log("\n8) GÜNCEL KOMİSYON — KANALIN BEYANI");
  /**
   * ⚠ Mimar kararı 18.08.2026: `ChannelSku.commissionRate` dosyadaki
   * `GÜNCEL KOMİSYON`dan gelir; sistem fiyattan dilim çözerek TÜRETMEZ.
   * İki kaynak ayrışabilir ve tek doğru kanalın beyanıdır.
   */
  const o = tarifeOku([BASLIK, satir("111", undefined, undefined, 4, 18)], BUGUN);
  kontrol("beyan okunur", o.satirlar[0].guncelKomisyon === 18);

  /** Beyan dilimle ÇELİŞSE bile okuyucu beyanı DEĞİŞTİRMEZ. */
  const celiskili = tarifeOku([BASLIK, satir("111", undefined, undefined, 4, 9.3)], BUGUN);
  kontrol("beyan dilimle çelişse bile KORUNUR", celiskili.satirlar[0].guncelKomisyon === 9.3);
  kontrol(
    "  ...türetme ayrı sonuç verir (simülasyon)",
    dilimBul(celiskili.satirlar[0].dilimler, 1999)?.oran === 18,
  );
}


// --- 9) YAZIM PLANI — BAĞSIZLIK SESSİZ KALMAZ -------------------------------
{
  console.log("\n9) YAZIM PLANI");
  const okuma = tarifeOku([BASLIK, satir("111"), satir("222"), satir("333")], BUGUN);
  /** Üç üründen ikisinin katalogda karşılığı var. */
  const plan = tarifePlaniKur(okuma, [
    { id: "v1", barkod: "111" },
    { id: "v2", barkod: "222" },
  ]);

  kontrol("her ürün 4 kalem üretir", plan.kalemler.length === 12, plan.kalemler.length);
  kontrol("eşleşen ürün 2", plan.rapor.eslesenUrun === 2);
  kontrol("BAĞSIZ ürün 1", plan.rapor.bagsizUrun === 1);
  kontrol("bağsız KALEM 4", plan.rapor.bagsizKalem === 4);

  /**
   * ⚠ BAĞSIZ KALEM ATILMAZ, YAZILIR. Atsaydık tarife eksik olurdu ve
   * eksikliği de bilinmezdi — hakediş 648 dersinin tam tekrarı.
   */
  const bagsizlar = plan.kalemler.filter((k) => k.variantId === null);
  kontrol("bağsız kalemler PLANDA duruyor", bagsizlar.length === 4);
  kontrol("  ...barkodunu koruyor", bagsizlar[0]?.barkod === "333");
  kontrol("örnekleri raporlanıyor", plan.bagsizOrnekler[0]?.barkod === "333");

  kontrol("eşleşen kalem doğru varyanta bağlanır",
    plan.kalemler.filter((k) => k.variantId === "v1").length === 4);

  /**
   * BARKOD KIRPILARAK EŞLEŞİR — İKİ TARAFTA DA.
   *
   * ⚠ İlk yazılışında bu testi `tarifeOku` üzerinden kurmuştum ve
   * mutasyon (satır tarafındaki `.trim()` kaldırıldı) YEŞİL kaldı:
   * okuyucu barkodu zaten kırpıyor, dolayısıyla o yolda plan katmanının
   * kırpması hiç iş yapmıyor. `tarifePlaniKur` dışa açık saf bir
   * fonksiyon ve doğrudan da çağrılabilir; test o yolu sınamalı ki
   * kırpma gerçekten korunsun.
   */
  const bosluklu = tarifePlaniKur(
    tarifeOku([BASLIK, satir(" 111 ")], BUGUN),
    [{ id: "v1", barkod: "111 " }],
  );
  kontrol("KATALOG tarafında boşluk eşleşmeyi bozmaz", bosluklu.rapor.eslesenUrun === 1);

  /** SATIR tarafı: plan doğrudan çağrılıyor, okuyucunun kırpması devrede değil. */
  const dogrudan = tarifePlaniKur(
    {
      pencere: { baslangic: BUGUN, bitis: BUGUN },
      tarifeGrubu: null,
      mukerrerElenen: 0,
      atlananlar: [],
      eksikSutunlar: [],
      satirlar: [
        {
          barkod: " 111 ",
          saticiStokKodu: null,
          urunAdi: null,
          guncelKomisyon: 18,
          satirNo: 2,
          dilimler: [{ sira: 1, altLimit: null, ustLimit: null, oran: 18 }],
        },
      ],
    },
    [{ id: "v1", barkod: "111" }],
  );
  kontrol("SATIR tarafında boşluk eşleşmeyi bozmaz", dogrudan.rapor.eslesenUrun === 1);

  /** Katalogda barkodu boş varyant dizine girmez — "" ile eşleşme olmaz. */
  const bosBarkod = tarifePlaniKur(
    tarifeOku([BASLIK, satir("111")], BUGUN),
    [{ id: "v9", barkod: null }, { id: "v8", barkod: "" }],
  );
  kontrol("barkodu boş varyantla eşleşme OLMAZ", bosBarkod.rapor.bagsizUrun === 1);
}

// --- 10) YAZIM İZNİ ---------------------------------------------------------
{
  console.log("\n10) YAZIM İZNİ");
  const saglam = tarifeOku([BASLIK, satir("111")], BUGUN);
  kontrol("sağlam okuma yazılabilir", yazilabilirMi(saglam).olur === true);

  /**
   * ⚠ PENCERESİZ TARİFE YAZILMAZ: hangi aralığa ait olduğu bilinmeyen
   * oran "güncel mi bayat mı" sorusunu cevaplayamaz ve tablonun varlık
   * sebebini boşa çıkarır. Tekillik anahtarı da penceresiz kurulamaz.
   */
  const penceresiz = { ...saglam, pencere: null };
  const p = yazilabilirMi(penceresiz);
  kontrol("penceresiz REDDEDİLİR", !p.olur && p.engel === "PENCERE_YOK");

  const satirsiz = { ...saglam, satirlar: [] };
  const t = yazilabilirMi(satirsiz);
  kontrol("satırsız REDDEDİLİR", !t.olur && t.engel === "SATIR_YOK");

  const eksikli = { ...saglam, eksikSutunlar: ["BARKOD"] };
  const e = yazilabilirMi(eksikli);
  kontrol("eksik sütun REDDEDİLİR", !e.olur && e.engel === "SUTUN_EKSIK");
}

// --- 10b) ENGEL KODU EKRANA HAM ÇIKMAZ -------------------------------------
/**
 * ⚠ CANLI HATA 25.08.2026: kullanıcı Hepsiburada teklif dosyasını yükledi ve
 * ekranda yalnız `SUTUN_EKSIK` yazdı. Teşhis doğruydu, mesaj okunamazdı.
 * Bu blok o sınıfı kapatıyor: her engel kodunun bir SÖZLÜK CÜMLESİ olmalı ve
 * o cümle kodun KENDİSİ olmamalı.
 */
{
  console.log("\n10b) ENGEL KODU → TÜRKÇE CÜMLE");
  const sozluk = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Tarife: Record<string, string>;
  };
  const kodlar = Object.keys(ENGEL_ANAHTARI);
  /**
   * ⚠ SABİT SAYI KALDIRILDI (02.09.2026, K-HB-TEKLIF). Eskiden "=== 4"
   * yazıyordu ve beşinci kod eklenince bekçi KIRMIZI yanıyordu — oysa kod
   * doğruydu, ÖLÇÜT eskimişti. Ölçüt artık sayıya değil KAPSAMAYA bakıyor:
   * tip birliğindeki her kodun eşlemesi var mı. Yeni kod eklendiğinde
   * TypeScript zaten `Record`ta derlemeyi durduruyor; bekçinin işi sözlük
   * tarafını sınamak.
   */
  kontrol("en az beş engel kodu eşlenmiş", kodlar.length >= 5, kodlar);
  kontrol(
    "  ...ve TEKLIF_DOSYASI eşlemede (K-HB-TEKLIF)",
    kodlar.includes("TEKLIF_DOSYASI"),
  );

  for (const [kod, anahtar] of Object.entries(ENGEL_ANAHTARI)) {
    const metin = sozluk.Tarife[anahtar];
    kontrol(`  ${kod} → sözlükte var`, typeof metin === "string" && metin.length > 0, anahtar);
    /* ⚠ ASIL KONTROL: cümle kodun KENDİSİ olmamalı — "SUTUN_EKSIK" yazan bir
       sözlük girdisi bugünkü hatayı aynen üretirdi. */
    kontrol(
      `  ${kod} → cümle, kod DEĞİL`,
      typeof metin === "string" && !metin.includes(kod),
      metin?.slice(0, 40),
    );
    kontrol(`  ${kod} → en az üç kelime`, (metin ?? "").trim().split(/\s+/).length >= 3);
  }

  /* ⚠ VE EKRAN BU KAPIDAN GEÇMELİ. Desen ADA değil KULLANIMA bağlanıyor:
     "ENGEL_ANAHTARI" kelimesi import satırında da geçiyor. */
  const eylem = readFileSync("src/app/ayarlar/tarife/eylemler.ts", "utf8");
  kontrol(
    "ekran engeli ENGEL_ANAHTARI üzerinden çeviriyor",
    eylem.includes("ENGEL_ANAHTARI[engel.kod]"),
  );
  kontrol(
    "ham `engel` alanı ekrana geçirilmiyor",
    !/engel:\s*sonuc\.engel/.test(eylem),
  );
}

// --- 11) RAPOR METNİ — BAĞSIZ SAYISI HER ZAMAN YAZAR ------------------------
{
  console.log("\n11) RAPOR METNİ");
  const okuma = tarifeOku([BASLIK, satir("111"), satir("222")], BUGUN);
  const plan = tarifePlaniKur(okuma, [{ id: "v1", barkod: "111" }]);
  const metin = raporMetni(plan, okuma.pencere!, (d) => d.toISOString().slice(0, 10));

  kontrol("pencere raporda", metin.some((m) => m.includes("pencere")));
  kontrol("okunan satır raporda", metin.some((m) => m.includes("okunan satır")));
  kontrol("yazılan kalem raporda", metin.some((m) => m.includes("yazılan kalem")));
  /**
   * BAĞSIZ SATIRI KOŞULSUZDUR — sıfır olsa bile yazar. "Sorun yoksa
   * susalım" deseydik, bağsızlığın olmadığı ile bakılmadığı ayırt
   * edilemezdi.
   */
  kontrol("BAĞSIZ satırı raporda", metin.some((m) => m.includes("BAĞSIZ")));

  const hepsiEsli = tarifePlaniKur(okuma, [
    { id: "v1", barkod: "111" },
    { id: "v2", barkod: "222" },
  ]);
  const metin2 = raporMetni(hepsiEsli, okuma.pencere!, (d) => d.toISOString());
  kontrol("bağsız SIFIRKEN de yazar", metin2.some((m) => m.includes("BAĞSIZ")));
}

// --- 12) KANAL SKU ÖNCELİĞİ — GERÇEK VERİ DÜZELTMESİ ------------------------
{
  console.log("\n12) KANAL SKU İLE EŞLEŞME");
  /**
   * ⚠ 19.08.2026 GERÇEK DOSYA BULGUSU. İlk hâlde yalnız katalog barkoduna
   * bakılıyordu ve `Soundcore Q21i` bağsız çıkmıştı — oysa ürün sistemde
   * VARDI (`axcali2755`). Katalog barkodu `194644037819`, ama o ürünün
   * Trendyol kanal SKU'su `194645027819`, yani tarife dosyasındaki
   * barkodun ta kendisi.
   *
   * Sebep: dosya PAZARYERİNİN kendi kodunu taşıyor, bizim katalog
   * barkodumuzu değil. İkisi çoğu üründe aynı ama aynı olmak ZORUNDA değil.
   */
  const okuma = tarifeOku([BASLIK, satir("194645027819")], BUGUN);

  const yalnizBarkod = tarifePlaniKur(okuma, [
    { id: "v1", barkod: "194644037819" },
  ]);
  kontrol("katalog barkodu tutmuyorsa BAĞSIZ", yalnizBarkod.rapor.bagsizUrun === 1);

  const kanalIle = tarifePlaniKur(
    okuma,
    [{ id: "v1", barkod: "194644037819" }],
    [{ kanalKodu: "194645027819", variantId: "v1" }],
  );
  kontrol("kanal SKU'suyla EŞLEŞİR", kanalIle.rapor.eslesenUrun === 1);
  kontrol("  ...doğru varyanta", kanalIle.kalemler[0].variantId === "v1");

  /** Kanal kodu yoksa katalog barkodu YEDEK yol olarak çalışır. */
  const barkodYedegi = tarifePlaniKur(
    tarifeOku([BASLIK, satir("194644037819")], BUGUN),
    [{ id: "v2", barkod: "194644037819" }],
    [{ kanalKodu: "baska-kod", variantId: "v9" }],
  );
  kontrol("kanal kodu tutmazsa BARKOD yedeği çalışır", barkodYedegi.rapor.eslesenUrun === 1);
  kontrol("  ...barkodun varyantına", barkodYedegi.kalemler[0].variantId === "v2");

  /**
   * SIRA ÖNEMLİ: aynı kod hem kanal SKU'su hem başka bir ürünün katalog
   * barkodu olabilir. Dosya pazaryerinin dilinde konuştuğu için KANAL
   * KODU kazanır.
   */
  const catisma = tarifePlaniKur(
    tarifeOku([BASLIK, satir("AYNI")], BUGUN),
    [{ id: "barkod-urunu", barkod: "AYNI" }],
    [{ kanalKodu: "AYNI", variantId: "kanal-urunu" }],
  );
  kontrol("çatışmada KANAL SKU kazanır", catisma.kalemler[0].variantId === "kanal-urunu");

  /** Kanal kodu listesi verilmezse eski davranış korunur. */
  const eskiCagri = tarifePlaniKur(okuma, [{ id: "v1", barkod: "194645027819" }]);
  kontrol("kanal listesi verilmezse barkodla çalışır", eskiCagri.rapor.eslesenUrun === 1);
}

// --- 13) İKİ BLOK BİRDEN DOLU — PENCERE KENDİ BLOĞUNDAN ---------------------
{
  console.log("");
  console.log("13) İKİ BLOK BİRDEN DOLU — pencere KENDİ bloğundan okunur");

  /**
   * ⚠ BU DOSYA HENÜZ GÖRÜLMEDİ ama Trendyol'un biçimi onu AÇIKÇA öngörüyor:
   * iki pencere yuvası var ("3 Gün" ve "4 Gün"). Elimizdeki iki dosyada da
   * bloklardan biri tamamen boştu ve okuyucu doğru pencereyi bulmuştu —
   * ama KURAL sayesinde değil, TESADÜF sayesinde: boş bloğun tarihi zaten
   * çözülemiyordu.
   *
   * İkisi birden dolu gelseydi oranlar DOLU bloktan, pencere ise kolon
   * sırasına göre İLK çözülebilen tarihten gelirdi. Sonuç sessizce yanlış
   * olurdu: rakamlar makul, tarih makul, ikisi birbirine AİT DEĞİL.
   *
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR: iki blok FARKLI pencere
   * ve FARKLI oran taşıyor. Aynı tarih yazılsaydı test tesadüfen geçerdi.
   */
  const ikiBlok = [
    "Manuel Rondo 500 ml",
    "111",
    "EN10000283784",
    769.99,
    769.98,
    701.29,
    701.28,
    641.09,
    641.08,
    /* 3 Gün penceresi — DOLU ama daha AZ satırda geçerli olacak */
    "11 Ağustos 08.00-14 Ağustos 07.59",
    9,
    8,
    7,
    6,
    /* 4 Gün penceresi — DOLU */
    "14 Ağustos 08.00-18 Ağustos 07.59",
    18,
    12.8,
    11.1,
    9.3,
    18,
    "034bd9e6cfa495614d55675a24b6b6f9",
  ];
  /**
   * İkinci satırda YALNIZ 4 Gün bloğu dolu → doluluk 4 Gün lehine (2'ye 1),
   * yani seçilen blok 4 Gün. Pencere de ONUN tarihini göstermeli.
   */
  const okuma = tarifeOku(
    [BASLIK, ikiBlok, satir("222", undefined, undefined, 4)],
    BUGUN,
  );

  kontrol("iki blok dolu dosya okunabildi", okuma.eksikSutunlar.length === 0, okuma.eksikSutunlar);
  kontrol(
    "oranlar DOLU bloktan (4 Gün → %18)",
    okuma.satirlar[0]?.dilimler[0]?.oran === 18,
    okuma.satirlar[0]?.dilimler[0]?.oran,
  );
  /**
   * ⚠ ASIL KONTROL: pencere 14 Ağustos olmalı, 11 Ağustos DEĞİL. Eski kod
   * kolon sırasına baktığı için 11 Ağustos'u yazardı — oranlar 4 Gün
   * bloğundan gelirken etiket 3 Gün bloğundan.
   */
  kontrol(
    "pencere SEÇİLEN bloğun tarihi (14 Ağustos)",
    okuma.pencere?.baslangic.toISOString() === "2026-08-14T05:00:00.000Z",
    okuma.pencere?.baslangic.toISOString(),
  );
  kontrol(
    "  ...öteki bloğun tarihi (11 Ağustos) KULLANILMADI",
    okuma.pencere?.baslangic.toISOString() !== "2026-08-11T05:00:00.000Z",
  );

  /** Tek blok dolu olan eski dosyalar aynen çalışmaya devam etmeli. */
  const ucuncuTek = tarifeOku([BASLIK, satir("333", undefined, undefined, 3)], BUGUN);
  kontrol(
    "tek blok (3 Gün) dosyası hâlâ okunuyor",
    ucuncuTek.pencere?.baslangic.toISOString() === "2026-08-14T05:00:00.000Z",
    ucuncuTek.pencere?.baslangic.toISOString(),
  );
}

console.log("");
console.log("=".repeat(70));
console.log("K49) KAPSAM BOŞLUĞU — PENCERELER ARASINDAKİ DELİK");
console.log("=".repeat(70));

/**
 * ⚠ NİYE VAR: ekran üç pencereyi de AYRI AYRI doğru gösteriyordu ama
 * aralarındaki 72 saatlik deliği hiç söylemiyordu. Delik ancak
 * veritabanına ELLE bakınca göründü — yani ekran, olmayan bir şeyi
 * göstermiyor değildi; VAR OLAN bir eksiği göstermiyordu.
 */
{
  /** ⚠ CANLI ÖLÇÜMÜN KENDİSİ — uydurma örnek değil (25.08.2026). */
  const HESAP = "hesap-ty";
  const AD = "Trendyol — AXCALI";
  const P = (bas: string, bit: string, hesapId = HESAP, hesapAdi = AD) => ({
    hesapId,
    hesapAdi,
    baslangic: new Date(bas),
    bitis: new Date(bit),
  });

  const canli = [
    P("2026-08-14T05:00:00Z", "2026-08-18T04:59:00Z"),
    P("2026-08-21T05:00:00Z", "2026-08-25T04:59:00Z"),
    P("2026-08-25T05:00:00Z", "2026-09-01T04:59:00Z"),
  ];

  const b = bosluklariBul(canli);
  kontrol("canlı veride TAM 1 boşluk bulunuyor", b.length === 1, b.length);
  /**
   * ⚠ TAM DEĞER 72 SAAT 1 DAKİKA (72,0167), 72 DEĞİL — ve bu doğru:
   * boşluk `04:59:00`da başlayıp `05:00:00`da bittiği için kaynak
   * dosyanın 60 saniyelik dikişi de boşluğun İÇİNDE kalıyor. Ekran
   * `toFixed(1)` ile "72,0" yazıyor; test HAM değeri sınıyor ki
   * yuvarlamanın arkasına bir hata saklanmasın.
   */
  kontrol(
    "  ...süresi 72 saat 1 dakika (ekranda 72,0)",
    b[0] !== undefined && Math.abs(b[0].saat - 72 - 1 / 60) < 1e-9,
    b[0]?.saat,
  );
  /**
   * ⚠ GÜN SAYIMI EŞİKSİZ VE UÇLAR SAYILMAZ: 18.08 saat 07:59'a kadar,
   * 21.08 saat 08:00'den sonra KAPSANIYOR. Onları da saysaydık "4 gün
   * tarifesiz" derdik ve iki günü haksız yere kayıp ilan ederdik.
   */
  kontrol(
    "  ...TAM kapsamsız günler yalnız 19 ve 20 Ağustos",
    JSON.stringify(b[0]?.tamGunler) === JSON.stringify(["2026-08-19", "2026-08-20"]),
    b[0]?.tamGunler,
  );
  kontrol(
    "  ...boşluğun ucunda SAAT var (07:59 / 08:00 ayrımı korunuyor)",
    b[0]?.baslar.toISOString() === "2026-08-18T04:59:00.000Z" &&
      b[0]?.biter.toISOString() === "2026-08-21T05:00:00.000Z",
  );

  /**
   * ⚠ 60 SANİYELİK DİKİŞ DELİK DEĞİL. Kaynak dosya pencereyi 07:59
   * bitirip 08:00 başlatıyor; bu biçim artefaktı delik sayılsaydı ekran
   * HER HAFTA kırmızı yanar ve gerçek delik gürültüde kaybolurdu.
   */
  const dikis = bosluklariBul([
    P("2026-08-21T05:00:00Z", "2026-08-25T04:59:00Z"),
    P("2026-08-25T05:00:00Z", "2026-09-01T04:59:00Z"),
  ]);
  kontrol("60 saniyelik DİKİŞ delik sayılmıyor", dikis.length === 0, dikis.length);

  /** ⚠ Ama eşiğin ÜSTÜ delik sayılır — eşik iki yönden de sınanır. */
  const ikiSaat = bosluklariBul([
    P("2026-08-21T05:00:00Z", "2026-08-25T04:00:00Z"),
    P("2026-08-25T06:01:00Z", "2026-09-01T04:59:00Z"),
  ]);
  kontrol("  ...ama 2 saatlik ara DELİK sayılıyor", ikiSaat.length === 1, ikiSaat.length);
  kontrol(
    "  ...ve tam gün yoksa 0 yazıyor (uydurulmuyor)",
    ikiSaat[0]?.tamGunler.length === 0,
    ikiSaat[0]?.tamGunler,
  );

  /**
   * ⚠ HESAPLAR BİRBİRİNİN BOŞLUĞUNU KAPATMAZ. Karıştırılsaydı Trendyol'un
   * deliği Hepsiburada'nın penceresiyle dolmuş görünürdü; oysa her hesabın
   * tarifesi kendine ait ve biri ötekinin komisyonunu söylemez.
   */
  const ikiHesap = bosluklariBul([
    P("2026-08-14T05:00:00Z", "2026-08-18T04:59:00Z", "ty", "Trendyol"),
    P("2026-08-21T05:00:00Z", "2026-08-25T04:59:00Z", "ty", "Trendyol"),
    /** HB penceresi tam TY'nin deliğini kaplıyor — yine de kapatmamalı. */
    P("2026-08-18T05:00:00Z", "2026-08-21T04:59:00Z", "hb", "Hepsiburada"),
  ]);
  kontrol(
    "başka hesabın penceresi boşluğu KAPATMIYOR",
    ikiHesap.length === 1 && ikiHesap[0]!.hesapId === "ty",
    ikiHesap.map((x) => x.hesapId),
  );

  /** ⚠ ÖRTÜŞME DELİK DEĞİL — aynı güne iki dosya yüklenmiş olabilir. */
  const ortusen = bosluklariBul([
    P("2026-08-14T05:00:00Z", "2026-08-20T04:59:00Z"),
    P("2026-08-18T05:00:00Z", "2026-08-25T04:59:00Z"),
  ]);
  kontrol("örtüşen pencereler delik üretmiyor", ortusen.length === 0, ortusen.length);

  /**
   * ⚠ KAPSANAN PENCERE SAHTE DELİK ÜRETMEZ. Kısa bir düzeltme yüklemesi
   * uzun bir pencerenin İÇİNDE kalabilir; düz "önceki.bitiş" kıyası
   * yapılsaydı ondan sonraki pencere delik gibi görünürdü.
   */
  const kapsanan = bosluklariBul([
    P("2026-08-14T05:00:00Z", "2026-08-25T04:59:00Z"),
    P("2026-08-16T05:00:00Z", "2026-08-17T04:59:00Z"),
    P("2026-08-25T05:00:00Z", "2026-09-01T04:59:00Z"),
  ]);
  kontrol(
    "içine gömülü pencere SAHTE delik üretmiyor",
    kapsanan.length === 0,
    kapsanan.map((x) => x.saat),
  );

  /** ⚠ TEK PENCERE ve BOŞ LİSTE çökmez, delik de üretmez. */
  kontrol("tek pencere -> 0 boşluk", bosluklariBul([canli[0]!]).length === 0);
  kontrol("boş liste -> 0 boşluk", bosluklariBul([]).length === 0);

  /** ⚠ SIRALAMA GİRDİYE BAĞLI OLMAMALI — ekran desc, kural asc bekliyor. */
  const tersSira = bosluklariBul([...canli].reverse());
  kontrol(
    "girdi ters sırada gelse de aynı sonuç",
    tersSira.length === 1 &&
      Math.abs(tersSira[0]!.saat - b[0]!.saat) < 1e-9 &&
      JSON.stringify(tersSira[0]!.tamGunler) === JSON.stringify(b[0]!.tamGunler),
    tersSira.map((x) => x.saat),
  );

  /**
   * ═══ GÖRÜŞ SINIRI MI, KAÇIRILMIŞ İNDİRME Mİ ═══════════════════════════
   * ⚠ TUTANAK KUSUR İLE SINIRI AYIRT ETTİRMEK ZORUNDA. Kayıt ilk hâlinde
   * kullanıcıya _"ara verdin"_ diye okundu; kronoloji bunun TERSİNİ söylüyor.
   *
   * ÖLÇÜLEN (canlı): sistemin ilk tarife kaydı **18.08.2026 14:36** ve o
   * kayıt bile GERİYE DÖNÜK (yüklenen pencere o sabah 07:59'da bitmişti).
   * Delik penceresi **18.08 08:00**'de açıldı — yani sistemde henüz TEK BİR
   * TARİFE BİLE YOKKEN, 6,6 saat önce.
   */
  const ILK_KAYIT = new Date("2026-08-18T11:36:00Z");
  kontrol(
    "sistem doğmadan açılan boşluk GÖRÜŞ SINIRI sayılıyor",
    gorusSiniriMi(b[0]!, ILK_KAYIT) === true,
  );
  /**
   * ⚠ VE MUAFİYET SINIRSIZ DEĞİL: rutin kurulduktan SONRA kaçan bir pencere
   * hâlâ kusurdur. Ölçüt "hepsini affet" olsaydı ileride gerçek bir kaçış
   * da sınır diye etiketlenir ve uyarı işlevsizleşirdi.
   */
  const sonraki = bosluklariBul([
    P("2026-09-01T05:00:00Z", "2026-09-08T04:59:00Z"),
    P("2026-09-15T05:00:00Z", "2026-09-22T04:59:00Z"),
  ]);
  kontrol(
    "  ...ama rutinden SONRAKİ kaçış sınır SAYILMIYOR (kusur kalır)",
    sonraki.length === 1 && gorusSiniriMi(sonraki[0]!, ILK_KAYIT) === false,
  );
  /** ⚠ HİÇ KAYIT YOKKEN hüküm verilmez — sınır da iddia edilmez. */
  kontrol(
    "  ...ilk kayıt bilinmiyorsa sınır İDDİA EDİLMİYOR",
    gorusSiniriMi(b[0]!, null) === false,
  );

  /** ⚠ EŞİK KAYNAĞIYLA ANILIR — sayı ölçümünden koparılmasın. */
  kontrol(
    "eşik ölçümüyle birlikte beyan edilmiş",
    BOSLUK_OLCUMU.dikisSaat < DIKIS_TAVANI_SAAT &&
      DIKIS_TAVANI_SAAT < BOSLUK_OLCUMU.delikSaat,
    { dikis: BOSLUK_OLCUMU.dikisSaat, esik: DIKIS_TAVANI_SAAT, delik: BOSLUK_OLCUMU.delikSaat },
  );
}

console.log("");
console.log("K49b) EKRAN — DELİK GERÇEKTEN ÇİZİLİYOR MU");
{
  const EKRAN = readFileSync("src/app/ayarlar/tarife/page.tsx", "utf8");

  /**
   * ⚠ İŞARET RENDER YERİNE BAĞLI, IMPORT'A DEĞİL. `bosluklariBul` kelimesi
   * import satırında da geçiyor; onu aramak, çağrı silinse bile yeşil
   * kalırdı. (Anayasa tablosu, 5. vaka: `revalidatePath` import satırında.)
   */
  kontrol(
    "ekran boşluk kuralını ÇAĞIRIYOR (import değil, çağrı)",
    EKRAN.includes("const bosluklar = bosluklariBul("),
  );

  /**
   * ⚠ BOŞLUK BÜTÜN GEÇMİŞTEN HESAPLANIR. Kesilmiş listeden (take:10)
   * hesaplansaydı 11. pencerenin öncesindeki delik hiç doğmaz ve ekran
   * "kapsam kesintisiz" derdi — sayfalamanın ürettiği yalancı yeşil.
   */
  {
    const bas = EKRAN.indexOf("const bosluklar = bosluklariBul(");
    const blok = EKRAN.slice(bas, bas + 400);
    kontrol(
      "  ...ve BÜTÜN pencerelerden (take:10'dan DEĞİL)",
      blok.includes("tumPencereler"),
    );
    /** ⚠ O sorgunun kendisinde `take` OLMAMALI. */
    const sorguBas = EKRAN.indexOf("prisma.komisyonTarifesi.findMany", EKRAN.indexOf("LISTE_TAVANI,"));
    const sorgu = sorguBas < 0 ? "" : EKRAN.slice(sorguBas, sorguBas + 500);
    kontrol("  ...ve o sorgu SINIRSIZ (take yok)", sorgu !== "" && !sorgu.includes("take:"));
  }

  /** ⚠ DELİK SATIRI GERÇEKTEN ÇİZİLİYOR — koşul öldürülürse kırmızı yanar. */
  {
    const bas = EKRAN.indexOf("{onundeki.map((b) => (");
    const blok = bas < 0 ? "" : EKRAN.slice(bas, bas + 700);
    kontrol("delik SATIRI listenin içinde çiziliyor", blok.includes("boslukMetni("));
    kontrol(
      "  ...ve renk sisteminden geliyor (ham Tailwind değil)",
      blok.includes("DURUM_KUTUSU.olumsuz"),
    );
  }

  /** ⚠ ÖZET KUTUSU — hüküm önce (İlke #13). */
  {
    const bas = EKRAN.indexOf("bosluklar.length === 0 ? (");
    const blok = bas < 0 ? "" : EKRAN.slice(bas, bas + 900);
    /** AÇIK SIFIR: boşluk yokken de satır var, sessiz kalmıyor. */
    kontrol("boşluk YOKKEN de yazıyor (açık sıfır)", blok.includes("boslukYok"));
    kontrol("  ...boşluk VARKEN özet sayıyı basıyor", blok.includes("boslukOzet"));
    /**
     * ⚠ "KAPANMAZ" AÇIKÇA YAZAR: dosya arşivden inmiyor. Yazmasaydı
     * kullanıcı bunu bir GÖREV sanıp yapamayacağı bir işe girişirdi —
     * anayasa: "kural doğru mu değil, teslim edilebilir mi".
     */
    /**
     * ⚠ AYRI DİLİM: "kapanmaz" cümlesi özet kutusunun İÇİNDE ama araya
     * uzun bir yorum giriyor; 900 karakterlik dilim onu kaçırdı ve kontrol
     * kırmızı yandı. Kelimeyi dosyanın tamamında aramak yerine ÖZET
     * SAYISINDAN ileriye bakılıyor — böylece cümle özet kutusundan
     * çıkarılırsa kontrol yine kırmızı yanar.
     */
    const ozetBas = EKRAN.indexOf('t("boslukOzet"');
    const ozetBlok = ozetBas < 0 ? "" : EKRAN.slice(ozetBas, ozetBas + 900);
    kontrol("  ...ve KAPATILAMAZ olduğunu söylüyor", ozetBlok.includes("boslukKapanmaz"));
  }

  /**
   * ⚠ SINIR CÜMLESİ GERÇEKTEN ÇİZİLİYOR MU — render koşuluna bağlı.
   * Kayıt kusur ile sınırı ayırt ettirmezse okuyan kendini suçlar; hata
   * mesajının yanlış tarafı göstermesiyle aynı sınıf.
   */
  {
    const bas = EKRAN.indexOf("{gorusSiniriMi(b, ilkKayitAni) ? (");
    const blok = bas < 0 ? "" : EKRAN.slice(bas, bas + 500);
    kontrol(
      "görüş sınırı cümlesi ÇİZİLİYOR (kusur ile sınır ayrılıyor)",
      blok.includes("boslukGorusSiniri"),
    );
  }
  /**
   * ⚠ SINIR VERİDEN GELİR, TARİH GÖMÜLEREK DEĞİL. Ekranda "21.08" gibi bir
   * sabit tarih arasaydık bugün doğru, altı ay sonra anlamsız bir muafiyet
   * olurdu. Ölçüt ilk YÜKLEME anı — ve `pencereBaslangic` DEĞİL: ilk yükleme
   * geriye dönüktü, pencere tarihine bakan ölçüt bunu görmez.
   */
  kontrol(
    "  ...ve sınır VERİDEN okunuyor (_min.yuklendiAt)",
    EKRAN.includes("_min: { yuklendiAt: true }") &&
      EKRAN.includes("ilkKayit._min.yuklendiAt"),
  );

  /** ⚠ KESİLEN LİSTENİN SINIRI YAZILIR — özet ile döküm ayrışmasın. */
  kontrol(
    "listelenemeyen boşluk SAYISI yazılıyor",
    EKRAN.includes("boslukGizlenen") && EKRAN.includes("gizlenen > 0"),
  );

  /**
   * ⚠ UÇ DAMGASINDA SAAT VAR. `.slice(0,10)` yapılsaydı 72 saatlik delik
   * "18→21, arada bir şey yok" diye okunurdu — ekranın zaten bir kez
   * düştüğü tuzağın aynısı, ters yönde.
   */
  {
    const bas = EKRAN.indexOf("function damga(");
    const govde = bas < 0 ? "" : EKRAN.slice(bas, bas + 500);
    kontrol("boşluk ucu SAAT taşıyor (tarih kırpması değil)", govde.includes("minute:"));
    kontrol(
      "  ...ve saat İSTANBUL'dan okunuyor (ortamdan değil)",
      govde.includes('"Europe/Istanbul"'),
    );
  }
}

console.log("");
console.log("K49c) PANEL — GEÇMİŞ DELİK ROZETİ YAKMAZ, BİTEN PENCERE YAKAR");
/**
 * ⚠ İKİ YÖN DE SINANIR — komut birebir bunu istedi.
 *
 * YANLIŞ YANMA: kapanamayacak bir delik görev kutusunda sonsuza kadar
 * yanardı ve rozetin tamamına olan güveni götürürdü ("sonsuza kadar yanan
 * uyarı olmaz").
 *
 * YANLIŞ SUSMA: delik görünür olsun diye rozet gevşetilseydi, asıl iş —
 * bu haftanın dosyasını indirmek — sessizce kaçardı.
 */
{
  const PANEL = readFileSync("src/lib/panel/gorev-verisi.ts", "utf8");
  kontrol(
    "panel görev verisi boşluk kuralını ÇAĞIRMIYOR (delik görev değil)",
    !PANEL.includes("bosluklariBul"),
  );

  const bugun = new Date("2026-08-25T09:00:00Z");

  /**
   * ⚠ DELİKLİ AMA GÜNCEL: 72 saatlik boşluk VAR, ama bugünü kapsayan
   * pencere de var. Rozet YANMAMALI — yapılacak iş yok.
   */
  const delikliAmaGuncel = tarifeKapsami(
    [{ kanalAdi: "Trendyol", sonBitis: new Date("2026-09-01T04:59:00Z") }],
    bugun,
  );
  kontrol(
    "geçmişte delik VAR + pencere güncel -> rozet YANMIYOR",
    tarifeUyarisiVarMi(delikliAmaGuncel) === false,
    delikliAmaGuncel,
  );

  /** ⚠ VE ROZET SAĞIR DEĞİL: pencere bitmişse yine yanıyor. */
  const bitmis = tarifeKapsami(
    [{ kanalAdi: "Trendyol", sonBitis: new Date("2026-08-18T04:59:00Z") }],
    bugun,
  );
  kontrol(
    "  ...ama pencere BİTMİŞSE yanıyor (yanlış susma yok)",
    tarifeUyarisiVarMi(bitmis) === true,
    bitmis,
  );

  /** ⚠ VE bitmeye 3 gün kala da yanıyor — eşiğin kendisi sınanır. */
  const yaklasan = tarifeKapsami(
    [{ kanalAdi: "Trendyol", sonBitis: new Date("2026-08-28T04:59:00Z") }],
    bugun,
  );
  kontrol(
    "  ...ve bitişe 3 gün kala yanıyor",
    tarifeUyarisiVarMi(yaklasan) === true,
    yaklasan,
  );
}

/**
 * ---------------------------------------------------------------------------
 *  10c) TEKLİF DOSYASI TANIMA (K-HB-TEKLIF, 02.09.2026)
 * ---------------------------------------------------------------------------
 *  ⛔ KORUMA SINIFI: HB "Avantajlı Teklifler" dosyası KOŞULLU bir kampanya
 *  teklifidir; tarife tablosuna girerse `dilimBul` bugünkü fiyata indirimli
 *  oranı uygular ve NET olduğundan YÜKSEK çıkar. Trendyol'un "İndirimli
 *  Komisyon Tarifeleri" dosyası için 20.08.2026'da verilen kararla aynı sınıf.
 *
 *  ⭐ ÖLÇÜT DEĞER TESTİ — gövde ÇAĞRILIYOR, kaynak taranmıyor.
 *  Kurgu, kullanıcının 02.09.2026'da yüklediği GERÇEK dosyanın başlık
 *  yapısıdır (iki satırlı: `Teklif N` üstte, `Üst Fiyat`/`Komisyon` altta).
 * ---------------------------------------------------------------------------
 */
{
  console.log("");
  console.log("10c) TEKLİF DOSYASI TANIMA");

  /** Gerçek dosyanın yapısı — "Açıklama" sayfası ÖNCE geliyor (tuzak buydu). */
  const teklifDosyasi = [
    {
      sheet: "Açıklama",
      data: [
        ["Excel Kolon Adı", "Karşılığı", "Örnek"],
        ["Ürün Adı", "Ürünün adını belirtir.", "Phazz Brand Ayakkabı"],
      ] as unknown[][],
    },
    {
      sheet: "Teklifler",
      data: [
        ["Ürün Adı", "Satıcı Stok Kodu", "SKU", "Mevcut Fiyat", "Mevcut Komisyon", "Teklif 1", null, "Teklif 2", null],
        [null, null, null, null, null, "Üst Fiyat", "Komisyon", "Üst Fiyat", "Komisyon"],
        ["Delonghi Dedica", "HBV00000A3BP9", "HBV00000A3BP9", 15269, "13,00 %", 8886, "4,7 %", 8442, "4,2 %"],
      ] as unknown[][],
    },
  ];

  kontrol(
    "gerçek teklif dosyası TANINIYOR (yapıdan, adsız)",
    teklifDosyasiMi(teklifDosyasi) === true,
  );
  /** ⛔ İLK SAYFA "Açıklama" — yalnız ona bakan bir tanıma dosyayı kaçırırdı. */
  kontrol(
    "  ...ilk sayfa Açıklama olsa da BÜTÜN sayfalar taranıyor",
    teklifDosyasiMi([teklifDosyasi[0]]) === false &&
      teklifDosyasiMi(teklifDosyasi) === true,
  );
  kontrol(
    "  ...dosya adı da tanıtıyor (ikinci onay)",
    teklifDosyasiMi([], "Avantajlı_Teklifler-02-09-2026-10_00.xlsx") === true,
  );

  /**
   * ⛔ YANLIŞ YANMA YÖNÜ: gerçek bir tarife dosyası teklif SAYILMAMALI.
   * Sayılsaydı geçerli bir yükleme "bu tarife değil" diye reddedilirdi.
   */
  const tarifeDosyasi = [
    {
      sheet: "Sayfa1",
      data: [
        ["BARKOD", "ÜRÜN İSMİ", "1.Fiyat Alt Limit", "1.KOMİSYON", "2.Fiyat Üst Limiti", "2.KOMİSYON"],
        ["8697975600803", "Tefal Blender", 0, 21, 1000, 8.4],
      ] as unknown[][],
    },
  ];
  kontrol(
    "gerçek TARİFE dosyası teklif SAYILMIYOR",
    teklifDosyasiMi(tarifeDosyasi) === false,
  );
  /** İçinde "Teklif" kelimesi geçen ama yapısı tarife olan dosya da geçmemeli. */
  kontrol(
    "  ...yalnız 'Teklif' kelimesi yetmiyor (alt başlık da aranıyor)",
    teklifDosyasiMi([
      {
        sheet: "S",
        data: [
          ["BARKOD", "Teklif 1", "Açıklama"],
          ["8697975600803", "x", "y"],
        ] as unknown[][],
      },
    ]) === false,
  );
  kontrol("boş dosya teklif sayılmıyor", teklifDosyasiMi([]) === false);
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
