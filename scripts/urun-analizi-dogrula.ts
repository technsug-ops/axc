import { readFileSync } from "node:fs";

import {
  analizAdresi,
  BOS_SUZGEC,
  analizToplami,
  coklucoz,
  eksenCoz,
  kovaCoz,
  EKSEN_VARSAYILAN_SIRA,
  sayiCoz,
  satirSayisiCoz,
  sirala,
  siralamaCoz,
  suzgectenGecir,
  VARSAYILAN_SATIR,
  yogunlasmaAdresi,
  yonCoz,
  type AnalizSatiri,
} from "../src/lib/rapor/urun-analizi";
import {
  kovaBul,
  YAS_BANTLARI,
  YAS_KOVALARI,
  yasBandi,
  yasSeciminiCoz,
} from "../src/lib/yaslanma";

/**
 * ============================================================================
 *  ÜRÜN ANALİZİ BEKÇİSİ
 * ----------------------------------------------------------------------------
 *  ⭐ ÇOĞU ÖLÇÜT DEĞER TESTİ — kaynak TARANMIYOR. Gövde saf olduğu için
 *  doğrudan ÇAĞRILIYOR ve DEĞERİ sınanıyor; desen yanlış yerde bulunamaz,
 *  çünkü desen aranmıyor. _(Anayasa: "saf hesap katmanı, desen tarayan
 *  bekçiye muhtaç olmaz".)_
 *
 *  Kaynak taraması yalnız ekran çizimi için var (sunucu bileşeni saf gövdeye
 *  taşınamaz) ve orada kullanım BLOĞUNA daraltılmış durumda.
 *
 *  ⚠ BÖLÜM SAYACI: bir blok koşmazsa (sıra bozulsa, `return` düşse) bekçi
 *  "geçti" DEMEZ, GEÇERSİZ der. Blok sırasını doğru tutmak insan
 *  disiplinidir; sayaç mekanizmadır.
 * ============================================================================
 */

const BOLUM_SAYISI = 10;
const kosanBolumler: string[] = [];

let gecen = 0;
let kalan = 0;

function yakin(ad: string, bulunan: unknown, beklenen: unknown): void {
  const a = JSON.stringify(bulunan);
  const b = JSON.stringify(beklenen);
  if (a === b) {
    gecen++;
  } else {
    kalan++;
    console.log(`  ⛔ ${ad}\n     bulunan : ${a}\n     beklenen: ${b}`);
  }
}

function dogru(ad: string, kosul: boolean): void {
  yakin(ad, kosul, true);
}

/** Test satırı — yalnız ölçülen alanlar anlamlı, ötekiler nötr. */
function satir(x: Partial<AnalizSatiri> & { variantId: string }): AnalizSatiri {
  return {
    variantId: x.variantId,
    urunAdi: x.urunAdi ?? x.variantId,
    sku: x.sku ?? x.variantId,
    urunId: x.urunId ?? null,
    marka: x.marka ?? null,
    kategori: x.kategori ?? null,
    adet: x.adet ?? 0,
    ciro: x.ciro ?? 0,
    net1: x.net1 ?? 0,
    net2: x.net2 ?? 0,
    hesaplananCiro: x.hesaplananCiro ?? 0,
    hesaplananAdet: x.hesaplananAdet ?? 0,
    hesaplanamayanKalem: x.hesaplanamayanKalem ?? 0,
    kalemSayisi: x.kalemSayisi ?? 1,
    yasGun: x.yasGun ?? null,
    bagliSermaye: x.bagliSermaye ?? null,
    rafAdedi: x.rafAdedi ?? null,
    barkod: x.barkod ?? null,
    firmaSku: x.firmaSku ?? null,
    kanalKodlari: x.kanalKodlari ?? [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1) TOPLAM SÜZGECİN TAMAMINDAN — TAVANDAN BAĞIMSIZ (İlke #15)
// ═══════════════════════════════════════════════════════════════════════════
{
  /**
   * ⛔ BU DEPONUN EN PAHALI SESSİZ HATASI. Tavana düşürülmüş bir liste
   * toplanırsa rakam hiçbir hata vermeden yanlış olur: ekran "₺X" der,
   * kullanıcı ona güvenir, kimse bakmaz.
   *
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR: 3 satır var ve tavan 2.
   * Tavan kümeden BÜYÜK olsaydı iki toplam eşit çıkar ve mutasyon yeşil
   * kalırdı — test kuralı değil TESADÜFÜ sınardı.
   */
  const kume = [
    satir({ variantId: "a", ciro: 100, net2: 30, adet: 1 }),
    satir({ variantId: "b", ciro: 200, net2: 20, adet: 2 }),
    satir({ variantId: "c", ciro: 400, net2: 10, adet: 4 }),
  ];
  const tamami = analizToplami(kume);
  const kirpik = analizToplami(kume.slice(0, 2));

  yakin("toplam: süzgecin TAMAMININ cirosu", tamami.ciro, 700);
  yakin("toplam: süzgecin TAMAMININ adedi", tamami.adet, 7);
  yakin("toplam: ürün sayısı tavandan bağımsız", tamami.urun, 3);
  dogru(
    "toplam: KIRPILMIŞ liste FARKLI sonuç verir (ayrım gerçek)",
    kirpik.ciro !== tamami.ciro && kirpik.urun !== tamami.urun,
  );

  /** Marj payda = hesaplanabilmiş ciro; hepsi 0 ise null (sıfır DEĞİL). */
  yakin("toplam: hesaplanabilir ciro yoksa marj null", tamami.marj, null);
  const marjli = analizToplami([
    satir({ variantId: "m", ciro: 100, hesaplananCiro: 100, net2: 25 }),
  ]);
  yakin("toplam: marj = NET-2 / hesaplanan ciro", marjli.marj, 25);

  kosanBolumler.push("toplam");
}

// ═══════════════════════════════════════════════════════════════════════════
// 2) HESAPLANAMAYAN KÜME AYRI SAYILIR — SIFIR SAYILMAZ
// ═══════════════════════════════════════════════════════════════════════════
{
  const kume = [
    satir({ variantId: "iyi", ciro: 100, hesaplananCiro: 100, net2: 20, kalemSayisi: 1 }),
    /** Bütün kalemleri hesaplanamayan ürün — NET'e girmez, AYRI sayılır. */
    satir({ variantId: "kor", ciro: 500, kalemSayisi: 2, hesaplanamayanKalem: 2 }),
  ];
  const t = analizToplami(kume);
  yakin("hesaplanamayan ÜRÜN ayrı sayılıyor", t.hesaplanamayanUrun, 1);
  yakin("hesaplanamayan KALEM ayrı sayılıyor", t.hesaplanamayanKalem, 2);
  yakin("hesaplanamayan NET-2'ye girmiyor", t.net2, 20);
  /** ⚠ Ciro GİRER: satış gerçekleşti, kârı bilinmiyor — ikisi ayrı soru. */
  yakin("hesaplanamayanın CİROSU yine de sayılıyor", t.ciro, 600);

  /** Sermayesi bilinmeyen: null sıfır sayılmaz. */
  const s = analizToplami([
    satir({ variantId: "x", bagliSermaye: 100 }),
    satir({ variantId: "y", bagliSermaye: null }),
  ]);
  yakin("sermaye: null toplama girmiyor", s.bagliSermaye, 100);
  yakin("sermaye: bilinmeyen AYRI sayılıyor", s.sermayesiBilinmeyen, 1);

  kosanBolumler.push("hesaplanamayan");
}

// ═══════════════════════════════════════════════════════════════════════════
// 3) SIRALAMA — HESAPLANAMAYAN HER İKİ YÖNDE DE SONA DÜŞER
// ═══════════════════════════════════════════════════════════════════════════
{
  /**
   * ⛔ `null`u sıfır saymak, marjı BİLİNMEYEN ürünü "en düşük marjlı"
   * listesinin BAŞINA oturturdu. Olmayan bir bulgu, gerçek bir bulgudan
   * daha zararlıdır: peşine düşülür.
   *
   * ⚠ İKİ YÖN DE SINANIYOR — yalnız biri yazılsaydı öteki yön serbest
   * kalırdı ve `artan` sıralamada null başa gelirdi.
   */
  const kume = [
    satir({ variantId: "yok", hesaplananAdet: 0, hesaplananCiro: 0, net2: 0 }),
    satir({ variantId: "dusuk", hesaplananCiro: 100, hesaplananAdet: 1, net2: 5, ciro: 100 }),
    satir({ variantId: "yuksek", hesaplananCiro: 100, hesaplananAdet: 1, net2: 40, ciro: 100 }),
  ];
  yakin(
    "sıralama: marj AZALAN — null sonda",
    sirala(kume, "marj", "azalan").map((s) => s.variantId),
    ["yuksek", "dusuk", "yok"],
  );
  yakin(
    "sıralama: marj ARTAN — null YİNE sonda",
    sirala(kume, "marj", "artan").map((s) => s.variantId),
    ["dusuk", "yuksek", "yok"],
  );

  /** Yaş sıralaması — stok ekseninin ölçütü. */
  const raf = [
    satir({ variantId: "eski", yasGun: 300 }),
    satir({ variantId: "yeni", yasGun: 5 }),
    satir({ variantId: "bos", yasGun: null }),
  ];
  yakin(
    "sıralama: yaş AZALAN — en eski üstte, null sonda",
    sirala(raf, "yas", "azalan").map((s) => s.variantId),
    ["eski", "yeni", "bos"],
  );

  /** Ad sıralaması Türkçe harf sırasına göre. */
  const adlar = [
    satir({ variantId: "1", urunAdi: "Zeytin" }),
    satir({ variantId: "2", urunAdi: "Çilek" }),
    satir({ variantId: "3", urunAdi: "Armut" }),
  ];
  yakin(
    "sıralama: ad ARTAN Türkçe sıraya göre",
    sirala(adlar, "ad", "artan").map((s) => s.urunAdi),
    ["Armut", "Çilek", "Zeytin"],
  );

  /** Sıralama GİRDİYİ BOZMAZ — aynı dizi başka yerde de kullanılıyor. */
  const once = kume.map((s) => s.variantId);
  sirala(kume, "marj", "artan");
  yakin("sıralama: girdi dizisi bozulmuyor", kume.map((s) => s.variantId), once);

  kosanBolumler.push("siralama");
}

// ═══════════════════════════════════════════════════════════════════════════
// 4) SÜZGEÇ — MARKASI OLMAYAN SATIR, MARKA SEÇİLİYKEN ELENİR
// ═══════════════════════════════════════════════════════════════════════════
{
  const kume = [
    satir({ variantId: "lego", marka: "LEGO", adet: 5, ciro: 500 }),
    satir({ variantId: "karaca", marka: "Karaca", adet: 1, ciro: 100 }),
    satir({ variantId: "marka-yok", marka: null, adet: 9, ciro: 900 }),
  ];
  yakin(
    "süzgeç: marka seçiliyken markasız satır ELENİR",
    suzgectenGecir(kume, {
      ...BOS_SUZGEC,
      markalar: ["LEGO"],
      kategoriler: [],
      minAdet: null,
      minCiro: null,
    }).map((s) => s.variantId),
    ["lego"],
  );
  yakin(
    "süzgeç: iki marka birden seçilebilir",
    suzgectenGecir(kume, {
      ...BOS_SUZGEC,
      markalar: ["LEGO", "Karaca"],
      kategoriler: [],
      minAdet: null,
      minCiro: null,
    }).map((s) => s.variantId),
    ["lego", "karaca"],
  );
  yakin(
    "süzgeç: marka seçili DEĞİLSE markasız satır KALIR",
    suzgectenGecir(kume, {
      ...BOS_SUZGEC,
      markalar: [],
      kategoriler: [],
      minAdet: null,
      minCiro: null,
    }).length,
    3,
  );
  yakin(
    "süzgeç: en az adet sınırı",
    suzgectenGecir(kume, {
      ...BOS_SUZGEC,
      markalar: [],
      kategoriler: [],
      minAdet: 5,
      minCiro: null,
    }).map((s) => s.variantId),
    ["lego", "marka-yok"],
  );
  yakin(
    "süzgeç: en az ciro sınırı",
    suzgectenGecir(kume, {
      ...BOS_SUZGEC,
      markalar: [],
      kategoriler: [],
      minAdet: null,
      minCiro: 500,
    }).map((s) => s.variantId),
    ["lego", "marka-yok"],
  );

  kosanBolumler.push("suzgec");
}

// ═══════════════════════════════════════════════════════════════════════════
// 5) ADRES ÇÖZÜMÜ — BOZUK GİRDİ SESSİZCE BAŞKA ANLAMA GELMEZ
// ═══════════════════════════════════════════════════════════════════════════
{
  yakin("satır: 100 geçerli", satirSayisiCoz("100"), 100);
  yakin("satır: 25 geçerli", satirSayisiCoz("25"), 25);
  yakin("satır: bozuk → varsayılan", satirSayisiCoz("999"), VARSAYILAN_SATIR);
  yakin("satır: boş → varsayılan", satirSayisiCoz(undefined), VARSAYILAN_SATIR);
  /** ⚠ Kullanıcı şartı: varsayılan 50, istekle 100'e çıkar. */
  yakin("satır: VARSAYILAN 50 (kullanıcı şartı)", VARSAYILAN_SATIR, 50);

  yakin("eksen: bozuk → dagilim", eksenCoz("olmayan"), "dagilim");
  yakin("eksen: stok geçerli", eksenCoz("stok"), "stok");

  /** ⛔ Eksenin KENDİ varsayılanı — hepsine net2 vermek stoku boş gösterirdi. */
  yakin("sıra: stok ekseni varsayılanı yaş", siralamaCoz(undefined, "stok"), "yas");
  yakin("sıra: marj ekseni varsayılanı marj", siralamaCoz(undefined, "marj"), "marj");
  yakin("sıra: hacim ekseni varsayılanı adet", siralamaCoz(undefined, "hacim"), "adet");
  yakin("sıra: dagilim ekseni varsayılanı net2", siralamaCoz(undefined, "dagilim"), "net2");
  yakin("sıra: açık seçim varsayılanı EZER", siralamaCoz("ciro", "stok"), "ciro");
  dogru(
    "sıra: her eksenin varsayılanı TANIMLI (boş taban değil)",
    Object.keys(EKSEN_VARSAYILAN_SIRA).length === 4,
  );

  yakin("yön: artan geçerli", yonCoz("artan"), "artan");
  yakin("yön: bozuk → azalan", yonCoz("zart"), "azalan");

  yakin("sayı: negatif → null", sayiCoz("-5"), null);
  yakin("sayı: sıfır → null", sayiCoz("0"), null);
  yakin("sayı: metin → null", sayiCoz("abc"), null);
  yakin("sayı: geçerli", sayiCoz("12"), 12);

  /** Çoklu değer: tekrarlı parametre — tek değer de dizi de kabul. */
  yakin("çoklu: tek değer", coklucoz("LEGO"), ["LEGO"]);
  yakin("çoklu: dizi", coklucoz(["LEGO", "Karaca"]), ["LEGO", "Karaca"]);
  yakin("çoklu: boş", coklucoz(undefined), []);
  /** ⚠ Ayıraç YOK: içinde `~` geçen marka BÖLÜNMEZ. */
  yakin("çoklu: marka adı bölünmüyor", coklucoz("A~B"), ["A~B"]);

  kosanBolumler.push("cozum");
}

// ═══════════════════════════════════════════════════════════════════════════
// 6) ADRES ÜRETİMİ — TEKRARLI PARAMETRE VE YOĞUNLAŞMA SÖZLEŞMESİ
// ═══════════════════════════════════════════════════════════════════════════
{
  const adres = analizAdresi({
    eksen: "marj",
    markalar: ["LEGO", "Karaca"],
    kategoriler: ["Oyuncak"],
  });
  dogru(
    "adres: iki marka TEKRARLI parametre olarak yazılıyor",
    adres.includes("marka=LEGO") && adres.includes("marka=Karaca"),
  );
  yakin(
    "adres: ikinci marka birinciyi EZMİYOR",
    (adres.match(/marka=/g) ?? []).length,
    2,
  );
  dogru("adres: eksen taşınıyor", adres.includes("eksen=marj"));

  /**
   * ⛔ YOĞUNLAŞMA SÖZLEŞMESİ — "SAYI = LİSTE".
   * Panel "39 üründen" diyorsa açılan liste TAM O 39 ürün olmalı: sıra
   * NET-2 azalan olmak ZORUNDA (pareto öyle kuruldu) ve tavan sayıyı
   * KAPSAMALI, yoksa 39'un yalnız 25'i görünür.
   */
  const y39 = yogunlasmaAdresi(39, { pencere: "BU_AY" });
  dogru("yoğunlaşma: sıra net2", y39.includes("sirala=net2"));
  dogru("yoğunlaşma: yön azalan", y39.includes("yon=azalan"));
  dogru("yoğunlaşma: eksen dagilim", y39.includes("eksen=dagilim"));
  yakin("yoğunlaşma: 39 ürün → tavan 50 (25 KAPSAMAZDI)", y39.includes("satir=50"), true);
  dogru("yoğunlaşma: dönem taşınıyor", y39.includes("pencere=BU_AY"));

  yakin("yoğunlaşma: 10 ürün → tavan 25", yogunlasmaAdresi(10, {}).includes("satir=25"), true);
  /** Tavandan büyük hedefte en büyük tavan seçilir — sessizce 25'e düşmez. */
  yakin(
    "yoğunlaşma: 500 ürün → en büyük tavan 100",
    yogunlasmaAdresi(500, {}).includes("satir=100"),
    true,
  );

  kosanBolumler.push("adres");
}

// ═══════════════════════════════════════════════════════════════════════════
// 7) EKRAN — TOPLAM SÜZÜLMÜŞ KÜMEDEN, GÖRÜNENDEN DEĞİL
// ═══════════════════════════════════════════════════════════════════════════
{
  /**
   * Bu ölçüt saf gövdeye taşınamaz (sunucu bileşeni), o yüzden kaynak
   * taranıyor — ve desen KULLANIM YERİNE bağlı, ada değil.
   */
  const sayfa = readFileSync("src/app/rapor/urunler/page.tsx", "utf8");

  dogru(
    "ekran: toplam SÜZÜLMÜŞ kümeden hesaplanıyor",
    /const toplam = analizToplami\(suzulmus\)/.test(sayfa),
  );
  dogru(
    "ekran: toplam GÖRÜNEN listeden hesaplanmıyor",
    !/analizToplami\(\s*gorunen\s*\)/.test(sayfa) &&
      !/analizToplami\(\s*sirali\.slice/.test(sayfa),
  );
  dogru(
    "ekran: tavan yalnız GÖRÜNENE uygulanıyor",
    /const gorunen = sirali\.slice\(0, satirSayisi\)/.test(sayfa),
  );
  /** Süzgeç seçenekleri SÜZÜLMEMİŞ kümeden — yoksa geri dönülemez. */
  dogru(
    "ekran: marka seçenekleri süzülmemiş kümeden",
    /secenekSay\(\(s\) => s\.marka\)/.test(sayfa) &&
      /for \(const s of hamSatirlar\)/.test(sayfa),
  );

  kosanBolumler.push("ekran-toplam");
}

// ═══════════════════════════════════════════════════════════════════════════
// 8) EKRAN — PARETO YALNIZ KENDİ SIRASINDA; PANEL ADRESİ GÖVDEDEN
// ═══════════════════════════════════════════════════════════════════════════
{
  const sayfa = readFileSync("src/app/rapor/urunler/page.tsx", "utf8");
  const panel = readFileSync("src/app/page.tsx", "utf8");

  /**
   * ⛔ Kümülatif pay yalnız NET-2 AZALAN sırada anlamlı. Başka sırada
   * çizmek, anlamsız bir eğriye "Pareto" demek olurdu.
   */
  dogru(
    "ekran: pay koşulu SONUCUYLA birlikte (üç şart birden)",
    /payGosterilir =\s*eksen === "dagilim" && sira === "net2" && yon === "azalan"/.test(
      sayfa,
    ),
  );

  /**
   * ⛔ PANEL KENDİ ADRESİNİ KURAMAZ — sözleşmenin sahibi gövdeden üretir.
   * İşaret ÇAĞRIYA bağlı (`yogunlasmaAdresi(`), ada değil: import satırında
   * da geçiyor ve ada bağlansaydı kontrol hep yanlış yere bakardı.
   */
  dogru(
    "panel: yoğunlaşma cümlesi gövdeden üretilen adrese bağlı",
    /href=\{yogunlasmaAdresi\(/.test(panel),
  );
  dogru(
    "panel: yoğunlaşma cümlesi elle kurulmuş adres KULLANMIYOR",
    !/href=\{`\/rapor\/urunler/.test(panel) &&
      !/href="\/rapor\/urunler/.test(panel),
  );
  dogru(
    "panel: tam liste düğmesi gövdeden üretiliyor",
    /href=\{urunAnaliziAdresi\(/.test(panel),
  );

  /** Menü kaydı — ekran menüde YOKSA kimse ulaşamaz. */
  const katalog = readFileSync("src/lib/menu/katalog.ts", "utf8");
  dogru(
    "menü: adres kayıtlı",
    /urunAnalizi: "\/rapor\/urunler"/.test(katalog),
  );
  dogru(
    "menü: katalogda yeri var",
    /\{ anahtar: "urunAnalizi", varsayilanGrup: "grupPara" \}/.test(katalog),
  );

  kosanBolumler.push("ekran-pareto");
}

// ═══════════════════════════════════════════════════════════════════════════
// 9) RAF YAŞI KOVALARI (K131) — KAPSAMA TAM, SINIRLAR YARI AÇIK
// ═══════════════════════════════════════════════════════════════════════════
{
  /**
   * ⛔ KAPSAMA KANITI: bitişik kovalar ne ÇAKIŞIR ne BOŞLUK bırakır.
   * Çakışsaydı bir kalem iki kovada birden sayılırdı; boşluk olsaydı
   * bir kalem HİÇBİR kovaya girmez ve süzgeçlerin toplamı rafın
   * tamamını vermezdi — ikisi de sessiz.
   */
  for (let i = 0; i < YAS_KOVALARI.length - 1; i++) {
    /** ⚠ KAPALI aralık: bitişik kova `ust + 1`den başlar (üst sınır DAHİL). */
    yakin(
      `kova sınırı bitişik: ${YAS_KOVALARI[i].kod} → ${YAS_KOVALARI[i + 1].kod}`,
      (YAS_KOVALARI[i].ust ?? -1) + 1,
      YAS_KOVALARI[i + 1].alt,
    );
  }
  yakin("kova: ilk kova 0'dan başlıyor", YAS_KOVALARI[0].alt, 0);
  yakin(
    "kova: son kova AÇIK UÇLU (üstü yok)",
    YAS_KOVALARI[YAS_KOVALARI.length - 1].ust,
    null,
  );

  /** Sınır günleri — KAPALI aralık: üst sınır KENDİ kovasına ait. */
  yakin("kova: 0 gün → 0-15", kovaBul(0), "0-15");
  yakin("kova: 15 gün → 0-15 (üst sınır KENDİ kovasında)", kovaBul(15), "0-15");
  yakin("kova: 16 gün → 16-30", kovaBul(16), "16-30");
  yakin("kova: 30 gün → 16-30", kovaBul(30), "16-30");
  yakin("kova: 31 gün → 31-45", kovaBul(31), "31-45");
  yakin("kova: 60 gün → 46-60", kovaBul(60), "46-60");
  yakin("kova: 61 gün → 61-90", kovaBul(61), "61-90");
  yakin("kova: 180 gün → 91-180", kovaBul(180), "91-180");
  yakin("kova: 181 gün → 181+", kovaBul(181), "181+");
  yakin("kova: 536 gün (canlı max) → 181+", kovaBul(536), "181+");

  /** Kullanıcının verdiği yedi aralık — sayı da sınırlar da birebir. */
  yakin("kova: yedi kova var (kullanıcı şartı)", YAS_KOVALARI.length, 7);
  yakin(
    "kova: sınırlar kullanıcının verdiği aralıklar",
    YAS_KOVALARI.map((k) => k.alt),
    [0, 16, 31, 46, 61, 91, 181],
  );

  /**
   * ⛔ ROZET BANTLARINA DOKUNULMADI (31/61) — ölçülmüş mimar kararı.
   * Kovalar bantlara UYDURULDU, bantlar kovalara değil: kullanıcının
   * süzgeci taşınabilir, ölçülmüş bir eşik taşınamaz.
   */
  dogru(
    "bant eşikleri yerinde (31/61)",
    YAS_BANTLARI.amberGun === 31 && YAS_BANTLARI.kirmiziGun === 61,
  );

  /**
   * ⭐ EN DEĞERLİ ÖLÇÜT — KULLANICI 02.09.2026'DA BULDURDU.
   * Hiçbir kova bir rozet bandını KESMEZ: kova ya tamamen NÖTR, ya tamamen
   * AMBER, ya tamamen KIRMIZI olur. Kesseydi tek bir kovada iki farklı
   * renkte satır çıkardı ve kullanıcı "niye bazıları kırmızı" diye sorardı.
   *
   * ⚠ Ölçüt sınır SAYILARINA değil DAVRANIŞA bağlı: `kovaBul` ve `yasBandi`
   * gövdeleri gerçekten çağrılıyor. Sayılara bağlansaydı, gövdelerden biri
   * değişince ölçüt yine yeşil kalırdı.
   */
  for (const k of YAS_KOVALARI) {
    const son = k.ust ?? 400;
    const bantlar = new Set<string>();
    for (let g = k.alt; g <= son; g++) {
      if (kovaBul(g) === k.kod) bantlar.add(yasBandi(g));
    }
    yakin(`kova ${k.kod} TEK bandın içinde`, [...bantlar].length, 1);
  }

  /** Ve bantlar kovalarla TAM örtülüyor — artık ne eksik ne fazla. */
  const bandinKovalari = (b: string) =>
    YAS_KOVALARI.filter((k) => yasBandi(k.alt) === b).map((k) => k.kod);
  yakin("NÖTR bandı = 0-15 + 16-30", bandinKovalari("NOTR"), ["0-15", "16-30"]);
  yakin("AMBER bandı = 31-45 + 46-60", bandinKovalari("AMBER"), [
    "31-45",
    "46-60",
  ]);
  yakin("KIRMIZI bandı = 61-90 + 91-180 + 181+", bandinKovalari("KIRMIZI"), [
    "61-90",
    "91-180",
    "181+",
  ]);

  /** Adres çözümü — tanımadığını sessizce bir kovaya düşürmez. */
  yakin("kova çözümü: geçerli kod", kovaCoz("91-180"), "91-180");
  yakin("kova çözümü: bozuk kod null", kovaCoz("100-200"), null);
  yakin("kova çözümü: boş null", kovaCoz(undefined), null);
  /** ⚠ Bant kodu kova DEĞİLDİR — iki dağarcık karışmamalı. */
  yakin("kova çözümü: bant kodu kova sayılmıyor", kovaCoz("kirmizi"), null);

  /**
   * ⛔ TEK KAPI İKİ DAĞARCIĞI DA TANIR — panelin `/stok?yas=kirmizi`
   * bağlantısı (ölçüldü 02.09.2026: 110 kalem) kırılmamalı.
   */
  yakin(
    "tek kapı: eski bant kodu HÂLÂ tanınıyor",
    yasSeciminiCoz("kirmizi"),
    { tur: "bant", bant: "KIRMIZI" },
  );
  yakin(
    "tek kapı: kova kodu tanınıyor",
    yasSeciminiCoz("61-90"),
    { tur: "kova", kova: "61-90" },
  );
  yakin("tek kapı: bozuk değer null", yasSeciminiCoz("zart"), null);

  /** Süzgeç: yaşı olmayan satır kovadan GEÇMEZ (null sıfır sayılmaz). */
  const raf = [
    satir({ variantId: "genc", yasGun: 3 }),
    satir({ variantId: "yasli", yasGun: 200 }),
    satir({ variantId: "yassiz", yasGun: null }),
  ];
  yakin(
    "süzgeç: kova seçiliyken yaşı OLMAYAN satır elenir",
    suzgectenGecir(raf, { ...BOS_SUZGEC, kova: "181+" }).map((s) => s.variantId),
    ["yasli"],
  );
  yakin(
    "süzgeç: kova seçili DEĞİLSE yaşsız satır KALIR",
    suzgectenGecir(raf, BOS_SUZGEC).length,
    3,
  );

  /** Adres: kova taşınıyor. */
  dogru(
    "adres: kova parametresi yazılıyor",
    analizAdresi({ eksen: "stok", kova: "91-180" }).includes("kova=91-180"),
  );

  kosanBolumler.push("kova");
}

// ═══════════════════════════════════════════════════════════════════════════
// 10) KİMLİK KODLARI LİSTEDE (İlke #3 + #4) — kullanıcı isteği 02.09.2026
// ═══════════════════════════════════════════════════════════════════════════
{
  const sayfa = readFileSync("src/app/rapor/urunler/page.tsx", "utf8");
  /** Bileşen gövdesine daralt — desen dosyanın başka yerinde de geçebilir. */
  const bas = sayfa.indexOf("async function KimlikSatiri");
  const blok = bas < 0 ? "" : sayfa.slice(bas);

  dogru("kimlik: ayrı bir bileşende (tek gövde)", bas >= 0);
  /**
   * ⛔ MASAÜSTÜ VE TELEFON AYNI BİLEŞENİ ÇAĞIRIR (İlke #10).
   * İki ayrı düzen yazılsaydı biri güncellenip öteki unutulurdu.
   */
  yakin(
    "kimlik: tablo VE kart listesi aynı bileşeni çağırıyor",
    (sayfa.match(/<KimlikSatiri satir=\{s\} \/>/g) ?? []).length,
    2,
  );

  dogru("kimlik: SKU basılıyor", /deger=\{satir\.sku\}/.test(blok));
  dogru("kimlik: barkod basılıyor", /deger=\{satir\.barkod\}/.test(blok));
  dogru(
    "kimlik: kanal kodları basılıyor",
    /satir\.kanalKodlari\.map\(/.test(blok),
  );
  /** ⛔ Kanal ADI kodun yanında — etiketsiz kod okuyana soru bıraktırır. */
  dogru(
    "kimlik: kanal ADI kodun yanında yazıyor",
    /\{k\.kanal\}/.test(blok) && /deger=\{k\.kod\}/.test(blok),
  );
  /**
   * ⛔ FİRMA SKU YALNIZ FARKLIYSA — ölçüldü: 1110 varyantın 1084'ünde
   * (%97,7) `companySku === sku`. Koşulsuz basılsaydı satırların
   * neredeyse tamamında aynı değer İKİ KEZ görünürdü.
   * ⚠ Koşul SONUCUYLA birlikte aranıyor: yalnız `firmaSku === null` demek
   * dalın çizilip çizilmediğini söylemez.
   */
  dogru(
    "kimlik: Firma SKU yalnız SKU'dan FARKLIYSA çiziliyor",
    /satir\.firmaSku === null \? null : \(/.test(blok),
  );

  /** Gövde tarafı: aynıysa `null` yazılıyor mu — DEĞER testi. */
  const veri = readFileSync("src/lib/rapor/urun-analizi-verisi.ts", "utf8");
  dogru(
    "gövde: companySku === sku ise firmaSku null",
    /firmaSku: v\.companySku === v\.sku \? null : v\.companySku/.test(veri),
  );
  /** Aynı kanalda iki hesap varsa kod TEKİLLEŞİR — yoksa satır şişer. */
  dogru(
    "gövde: kanal kodları tekilleştiriliyor",
    /new Map\(\s*v\.channelSkus\.map/.test(veri),
  );
  /** ⛔ İKİ EKSEN AYNI GÖVDEDEN — ayrışırsa iki ekran farklı kod gösterir. */
  yakin(
    "gövde: iki eksen de kimlikCoz çağırıyor",
    (veri.match(/kimlikCoz\(/g) ?? []).length >= 3,
    true,
  );

  kosanBolumler.push("kimlik");
}

// ═══════════════════════════════════════════════════════════════════════════
//  ÖZET — ⚠ BÜTÜN ÖLÇÜT BLOKLARINDAN SONRA
// ═══════════════════════════════════════════════════════════════════════════
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `\n⛔ KOŞUM YARIM KALDI — sonuç GEÇERSİZ.` +
      `\n   beklenen bölüm: ${BOLUM_SAYISI} · koşan: ${kosanBolumler.length}` +
      `\n   koşanlar: ${kosanBolumler.join(", ")}`,
  );
  process.exit(1);
}

if (kalan === 0) {
  console.log(
    `✓  ${gecen}/${gecen} ölçüt geçti (${BOLUM_SAYISI} bölüm) — ` +
      `çoğu DEĞER testi, kaynak taraması yalnız ekran çizimi için`,
  );
} else {
  console.log(`\n⛔ ${kalan} ölçüt DÜŞTÜ (${gecen} geçti)`);
  process.exit(1);
}
