import { kaynakOku } from "./kaynak-oku";

import {
  degistirilebilirHedefler,
  partiDegisimPlani,
  type DegistirilecekCikis,
  type HedefParti,
} from "../src/lib/parti-bagi-degistirme";

/**
 * ============================================================================
 *  SATIŞIN PARTİ BAĞINI DEĞİŞTİRME BEKÇİSİ (K376, 10.11.2026)
 * ----------------------------------------------------------------------------
 *      npm run parti-bagi-degisimi:dogrula
 *
 *  ⛔ NİYE: bu yol LEDGER'IN BAĞ TARAFINA yazıyor. Yanlış kurulursa iki şey
 *  birden olur ve ikisi de SESSİZ: ① parti aşırı tüketilir (K91: 64 satırın
 *  her biri tek başına geçerliydi, yazıldığında 32 parti aşıldı) ② satış,
 *  kendisinden SONRA giren bir partiyi yer (29.08.2026: 809 bağ, stok
 *  kilitlendi, ekran 0 gösterdi).
 *
 *  ⭐ ÖLÇÜTLERİN ÇOĞU SAF GÖVDEYİ ÇAĞIRIP DEĞERİNİ SINIYOR — kaynak taraması
 *  yalnız ZİNCİR için (gövde doğru olup yanlış çağrılırsa hiçbir şey
 *  korunmaz: K121 dersi · "iki halka ayrı ayrı doğru olabilir, aradaki bağ
 *  yanlış").
 *
 *  ⚠ SAYAÇ, SIRA DEĞİL: her bölüm kendini kaydeder ve özet beklenen sayıyla
 *  karşılaştırır. Bir blok koşmazsa bekçi "geçti" DEMEZ, GEÇERSİZ der
 *  (30.08.2026: sonradan eklenen ölçütler özetin ALTINA düşmüştü).
 * ============================================================================
 */

const BOLUM_SAYISI = 4;
const kosanBolumler: string[] = [];
let gecen = 0;
let kalan = 0;

function yakin(ad: string, olculen: unknown, beklenen: unknown) {
  const a = JSON.stringify(olculen);
  const b = JSON.stringify(beklenen);
  if (a === b) gecen += 1;
  else {
    kalan += 1;
    console.log(`  HATA  ${ad}`);
    console.log(`      beklenen: ${b}`);
    console.log(`      ölçülen : ${a}`);
  }
}
const dogru = (ad: string, k: boolean) => yakin(ad, k, true);

/** Satış 10.11.2026 → FIFO sınırı 11.11.2026 00:00 (gün SONU, 29.08 kararı). */
const SINIR = new Date("2026-11-11T00:00:00.000Z");

const CIKIS: DegistirilecekCikis = {
  hareketId: "c1",
  adet: 1,
  variantId: "v1",
  mevcutPartiId: "p-yanlis",
  mevcutMaliyet: "1115.28",
  saleId: "s1",
};

function parti(ek: Partial<HedefParti> & { hareketId: string }): HedefParti {
  return {
    variantId: "v1",
    occurredAt: new Date("2026-02-01T00:00:00.000Z"),
    kalanAdet: 3,
    birimMaliyet: "900",
    birimMaliyetParaBirimi: "TRY",
    ...ek,
  };
}

console.log("\nPARTİ BAĞI DEĞİŞTİRME BEKÇİSİ");
console.log("=".repeat(62));

// --- 1) KAPILAR — NE YAZILAMAZ ------------------------------------------
console.log("\n1) kapılar — hangi durumda yazılmaz");
{
  const kur = (
    hedef: HedefParti | null,
    ek: Partial<typeof CIKIS> = {},
    sebep = "satış girilirken yanlış parti seçilmiş",
  ) =>
    partiDegisimPlani({
      cikis: { ...CIKIS, ...ek },
      hedef,
      sinir: SINIR,
      sebep,
    });

  /** ⛔ MUTLU YOL — ölçütlerin tabanı: doğru girdide YAZILABİLİR olmalı. */
  const mutlu = kur(parti({ hareketId: "p-dogru" }));
  yakin("doğru girdide yazılabilir", mutlu.yazilabilir, true);
  yakin("red yok", mutlu.redler, []);
  yakin("yeni parti plana giriyor", mutlu.yeniPartiId, "p-dogru");
  yakin("eski parti plana giriyor", mutlu.eskiPartiId, "p-yanlis");

  yakin("hedef seçilmedi → HEDEF_YOK", kur(null).redler, ["HEDEF_YOK"]);
  yakin(
    "sebep boş → SEBEP_BOS",
    kur(parti({ hareketId: "p-dogru" }), {}, "   ").redler,
    ["SEBEP_BOS"],
  );
  yakin(
    "aynı parti → AYNI_PARTI",
    kur(parti({ hareketId: "p-yanlis" })).redler,
    ["AYNI_PARTI"],
  );
  yakin(
    "başka varyant → FARKLI_VARYANT",
    kur(parti({ hareketId: "p-dogru", variantId: "v2" })).redler,
    ["FARKLI_VARYANT"],
  );
  /** ⛔ GİRİŞ DEĞİL ÇIKIŞ TAŞINIR — pozitif hareket reddedilir. */
  yakin(
    "hareket çıkış değil → CIKIS_DEGIL",
    kur(parti({ hareketId: "p-dogru" }), { adet: 0 }).redler,
    ["CIKIS_DEGIL"],
  );

  /**
   * ⛔ K91 — KAPASİTE. Hedefin kalanı çıkışın adedini karşılamıyorsa
   * yazılmaz; satır bazında "açık parti" olması YETMEZ.
   */
  yakin(
    "kalan adet yetmiyor → KAPASITE_YETERSIZ",
    kur(parti({ hareketId: "p-dogru", kalanAdet: 1 }), { adet: 2 }).redler,
    ["KAPASITE_YETERSIZ"],
  );
  /** ⚠ AYRIMIN ÖTEKİ YAKASI: tam yeten kapasite GEÇER (sınır dahil). */
  dogru(
    "kalan adet TAM yetiyorsa geçer",
    kur(parti({ hareketId: "p-dogru", kalanAdet: 2 }), { adet: 2 }).yazilabilir,
  );

  /**
   * ⛔ FIFO TARİH SINIRI — 29.08.2026. Sınırın DEĞERİ gün sonu, operatörü
   * `lt`. Üç ölçüt birlikte: öncesi GEÇER · aynı gün GEÇER · sonrası DÜŞER.
   * Yalnız biri yazılsaydı `lt`yi `lte` yapan ya da sınırı gün başına çeken
   * mutasyon ayakta kalırdı.
   */
  dogru(
    "satıştan ÖNCE giren parti geçer",
    kur(parti({ hareketId: "p-dogru", occurredAt: new Date("2026-02-01T00:00:00.000Z") }))
      .yazilabilir,
  );
  dogru(
    "AYNI GÜN giren parti geçer (sınır gün SONU)",
    kur(parti({ hareketId: "p-dogru", occurredAt: new Date("2026-11-10T21:00:00.000Z") }))
      .yazilabilir,
  );
  yakin(
    "satıştan SONRA giren parti → TARIH_SINIRI",
    kur(parti({ hareketId: "p-dogru", occurredAt: new Date("2026-11-11T00:00:00.000Z") }))
      .redler,
    ["TARIH_SINIRI"],
  );
}
kosanBolumler.push("kapılar");

// --- 2) FARK VE BİLİNMEZLİK ---------------------------------------------
console.log("\n2) maliyet farkı — null ile 0 ayrı şey");
{
  const kur = (hedef: HedefParti | null, ek: Partial<typeof CIKIS> = {}) =>
    partiDegisimPlani({
      cikis: { ...CIKIS, ...ek },
      hedef,
      sinir: SINIR,
      sebep: "yanlış parti",
    });

  /** Maliyet düşüyor → kâr ARTACAK; işaret NEGATİF. */
  yakin(
    "maliyet düşüyor → fark negatif",
    kur(parti({ hareketId: "p-dogru", birimMaliyet: "900" })).maliyetFarkiToplam,
    -215.28,
  );
  /** Maliyet artıyor → kâr DÜŞECEK; işaret POZİTİF. */
  yakin(
    "maliyet artıyor → fark pozitif",
    kur(parti({ hareketId: "p-dogru", birimMaliyet: "1200" })).maliyetFarkiToplam,
    84.72,
  );
  /** ⚠ ADETLE ÇARPILIR — tek adetle sınanan bir ölçüt bunu göremezdi. */
  yakin(
    "fark adetle çarpılır",
    kur(parti({ hareketId: "p-dogru", birimMaliyet: "900", kalanAdet: 5 }), {
      adet: 3,
    }).maliyetFarkiToplam,
    -645.84,
  );
  /**
   * ⛔ `null` ≠ `0`. Bir taraf bilinmiyorsa fark HESAPLANAMAZ ve `0`
   * "fark yok" diye okunurdu. İki yön ayrı sınanır.
   */
  yakin(
    "hedefin maliyeti yok → fark null",
    kur(parti({ hareketId: "p-dogru", birimMaliyet: null })).maliyetFarkiToplam,
    null,
  );
  yakin(
    "mevcut maliyet yok → fark null",
    kur(parti({ hareketId: "p-dogru" }), { mevcutMaliyet: null })
      .maliyetFarkiToplam,
    null,
  );
  /** Eşit maliyette fark `0` — ve bu `null` DEĞİL. */
  yakin(
    "eşit maliyette fark 0 (null değil)",
    kur(parti({ hareketId: "p-dogru", birimMaliyet: "1115.28" }))
      .maliyetFarkiToplam,
    0,
  );

  /** ⛔ MALİYETSİZ HEDEF ENGEL DEĞİL AMA SÖYLENİR — iki yön ayrı. */
  dogru(
    "maliyetsiz hedef yazılabilir (bedava mal meşru)",
    kur(parti({ hareketId: "p-dogru", birimMaliyet: null })).yazilabilir,
  );
  dogru(
    "maliyetsiz hedef BEYAN ediliyor",
    kur(parti({ hareketId: "p-dogru", birimMaliyet: null }))
      .maliyetBilinmezOlacak,
  );
  dogru(
    "maliyetli hedefte beyan YANMIYOR (yanlış yanma)",
    kur(parti({ hareketId: "p-dogru" })).maliyetBilinmezOlacak === false,
  );

  /** Tazelenecek satış — satışa bağlı olmayan çıkış tazelenmez. */
  yakin(
    "satış tazelenecek listede",
    kur(parti({ hareketId: "p-dogru" })).tazelenecekSatislar,
    ["s1"],
  );
  yakin(
    "satışa bağlı olmayan çıkış tazelenmez",
    kur(parti({ hareketId: "p-dogru" }), { saleId: null }).tazelenecekSatislar,
    [],
  );
}
kosanBolumler.push("fark");

// --- 3) LİSTE SÜZGECİ — YAZMA KAPISIYLA AYNI ÖLÇÜT ----------------------
console.log("\n3) hedef listesi — süzgeç yazma kapısıyla aynı ölçütten");
{
  const HEPSI = [
    parti({ hareketId: "p-dogru" }),
    /** aynı parti — listede olmaz */
    parti({ hareketId: "p-yanlis" }),
    /** başka varyant */
    parti({ hareketId: "p-baska-urun", variantId: "v2" }),
    /** satıştan SONRA girmiş */
    parti({ hareketId: "p-gelecek", occurredAt: new Date("2026-11-12T00:00:00.000Z") }),
    /** kalanı yetmiyor */
    parti({ hareketId: "p-tukenmis", kalanAdet: 0 }),
  ];
  /** ⚠ TABAN DOLULUĞU BEYAN EDİLİR — boş küme her koşulu sağlar. */
  dogru("taban dolu (≥5 aday)", HEPSI.length >= 5);

  const hedefler = degistirilebilirHedefler({
    cikis: CIKIS,
    partiler: HEPSI,
    sinir: SINIR,
  });
  yakin(
    "yalnız uygun parti listelenir",
    hedefler.map((h) => h.hareketId),
    ["p-dogru"],
  );

  /**
   * ⛔ İKİ YERDE İKİ ÖLÇÜT OLMAZ: listede görünen her parti yazma kapısından
   * da GEÇMELİ, listede görünmeyen hiçbiri geçmemeli. Ölçüt bunu TÜM küme
   * üstünde ölçüyor — tek örnekle sınanan bir eşitlik tesadüf olabilirdi.
   */
  const listede = new Set(hedefler.map((h) => h.hareketId));
  const ayrisan = HEPSI.filter(
    (p) =>
      listede.has(p.hareketId) !==
      partiDegisimPlani({
        cikis: CIKIS,
        hedef: p,
        sinir: SINIR,
        sebep: "yanlış parti",
      }).yazilabilir,
  ).map((p) => p.hareketId);
  yakin("liste ile yazma kapısı AYRIŞMIYOR", ayrisan, []);
}
kosanBolumler.push("liste");

// --- 4) ZİNCİR — GÖVDE DOĞRU OLUP YANLIŞ ÇAĞRILABİLİR -------------------
console.log("\n4) zincir — eylem ve ekran gövdeye bağlı mı");
{
  const eylem = kaynakOku("src/app/satislar/[id]/parti-bagi-actions.ts");
  const yorumsuz = eylem
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

  dogru("izin kapısı stok.duzelt", yorumsuz.includes('yetkiIste("stok.duzelt")'));
  dogru("saf gövde çağrılıyor", yorumsuz.includes("partiDegisimPlani({"));
  dogru("liste süzgeci saf gövdeden", yorumsuz.includes("degistirilebilirHedefler({"));

  /**
   * ⛔ KAPASİTE ÖMÜR BOYU OKUNUR — `tuketilecekPartiler`e ÜÇÜNCÜ argüman
   * (sinir) GEÇİLEMEZ. Geçilirse tüketim sorgusu da süzülür, sınırdan
   * SONRAKİ çıkışlar sayılmaz ve hedefin kalanı OLDUĞUNDAN FAZLA görünür —
   * K91'in ta kendisi. Ölçüt çağrının KENDİSİNE bağlı, ada değil.
   */
  const cagrilar = yorumsuz.match(/tuketilecekPartiler\([^)]*\)/g) ?? [];
  dogru("kapasite okuması var (taban)", cagrilar.length >= 2);
  yakin(
    "hiçbir kapasite okumasına sınır geçilmiyor",
    cagrilar.filter((c) => c.split(",").length !== 2),
    [],
  );
  /** ⚠ VE TARİH SINIRI YİNE UYGULANIYOR — bellekte, ayrı gövdeyle. */
  dogru(
    "tarih sınırı bellekte uygulanıyor",
    yorumsuz.includes("partileriSinirla(hepsi, sinir)"),
  );
  dogru("sınır satışın kendi zamanından", yorumsuz.includes("satisStokZamani("));

  /**
   * ⛔ PLAN İŞLEMİN İÇİNDE KURULUR. Dışarıda kurulup içeride yazılsaydı
   * araya giren bir satış hedefi tüketebilirdi ve kapasite kapısı kâğıt
   * üstünde kalırdı. Ölçüt `$transaction` BLOĞUNA daraltılır — `planiKur(`
   * dosyada beş yerde geçiyor, adı aramak hiçbir şey ölçmezdi.
   */
  const i = yorumsuz.indexOf("prisma.$transaction(");
  dogru("işlem bloğu bulundu", i >= 0);
  const islem = i >= 0 ? yorumsuz.slice(i, i + 2600) : "";
  dogru("plan işlem İÇİNDE kuruluyor", islem.includes("planiKur(tx,"));
  dogru("yazım işlem içinde", islem.includes("tx.stockMovement.update("));
  dogru("bağ yeni partiye yazılıyor", islem.includes("sourceMovementId: hedef.hareketId"));
  /**
   * ⛔ MALİYET DAMGASI YENİ PARTİDEN. Alınmazsa çıkış yeni partiye bağlı
   * görünür ama ESKİ maliyeti taşır — ekran doğru, NET yanlış (19.08.2026).
   */
  dogru(
    "maliyet damgası yeni partiden alınıyor",
    islem.includes("unitCostAmount: hedef.birimMaliyet"),
  );
  dogru(
    "para birimi de yeni partiden",
    islem.includes("unitCostCurrency: hedef.birimMaliyetParaBirimi"),
  );
  dogru("iz aynı işlemde yazılıyor", islem.includes("PARTI_BAGI_DEGISIM_EYLEMI"));
  /** ⛔ İZDE ESKİ VE YENİ DEĞER BİRLİKTE — teşhis içindir. */
  dogru("izde eski parti", islem.includes("eskiPartiId: plan.eskiPartiId"));
  dogru("izde yeni parti", islem.includes("yeniPartiId: plan.yeniPartiId"));
  dogru("izde sebep", /detail: JSON\.stringify\(\{\s*sebep,/.test(islem));

  /** ⛔ ONAY KUTUSU AÇIK OLMADAN YAZILMAZ. */
  dogru(
    "onay kapısı var",
    /formData\.get\("onay"\)[^)]*\)\s*!==\s*"evet"/.test(yorumsuz),
  );
  /** ⛔ KÂR TAZELEME — yazım sonrası, ve düşen SÖYLENİR. */
  dogru("kâr tazeleniyor", yorumsuz.includes("await satisKarTazele(saleId)"));
  dogru("tazelenemeyen sayılıyor", yorumsuz.includes("dusen += 1"));

  const diyalog = kaynakOku("src/app/satislar/[id]/parti-bagi-degistir.tsx");
  dogru("önizleme eylemi bağlı", diyalog.includes("partiBagiOnizle"));
  dogru("yazım eylemi bağlı", diyalog.includes("partiBaginiDegistir"));
  dogru(
    "yazım formu YALNIZ önizlemeden sonra çiziliyor",
    /\{ozet \? \(/.test(diyalog),
  );
  /**
   * ⛔ K375 — ALANLAR YEREL DURUMDAN. `action={fn}` formu sıfırlıyor; ikinci
   * adım formu yeniden okusaydı BOŞ veri okurdu.
   */
  dogru("seçim yerel durumdan", diyalog.includes('value={hedefId}'));
  dogru(
    "ikinci adım formu YENİDEN OKUMUYOR",
    !diyalog.includes('closest("form")'),
  );
  /** ⛔ HEDEFSİZ ÖNİZLEME DÜĞMESİ KİLİTLİ, VE SEBEBİ YAZIYOR (İlke #5). */
  dogru("hedef seçilmeden önizlenemez", diyalog.includes('hedefId === ""'));
  dogru("kilidin sebebi ekranda", diyalog.includes('t("secimGerekli")'));
  /** ⛔ BOŞ LİSTE SESSİZ KALMAZ — neden boş olduğu yazar. */
  dogru("boş liste açıklanıyor", diyalog.includes('t("hedefYokAciklama")'));
  /** ⛔ MALİYETSİZ HEDEF UYARISI EKRANDA ÇİZİLİYOR. */
  dogru(
    "maliyetsizlik uyarısı çiziliyor",
    /ozet\.maliyetBilinmezOlacak \?[\s\S]{0,200}t\("maliyetBilinmezOlacak"\)/.test(
      diyalog,
    ),
  );
  /** ⛔ `null` FARK AYRI CÜMLE — "fark yok" diye gösterilmez. */
  dogru(
    "hesaplanamayan fark ayrı cümle",
    /ozet\.fark === null \?[\s\S]{0,200}t\("farkHesaplanamadi"\)/.test(diyalog),
  );

  /**
   * ⛔ EKRAN EYLEMİ ÇİZİYOR MU — gövde doğru olup çağrılmazsa boş (K121).
   *
   * ⚠ VE DESEN SAYMAK YETMEZ: `cikisId={dusum.id}` kaç kez geçiyor diye
   * saymak, render KOŞULUNU `{false ? (` yapan mutasyonu GÖREMEZ — dal hiç
   * çizilmez, desen dosyada kalır. İlk yazımda tam bu oldu ve mutasyon
   * KAÇTI. Ölçüt koşulu SONUCUYLA BİRLİKTE ölçüyor: her `<PartiBagiDegistir`
   * çağrısının ÖNÜNDE `maliyetDuzeltebilir ? (` durmalı.
   * _(Anayasa: "kaynak tarayan kontrol, deseni dosyada değil KULLANIM
   * BLOĞUNDA arar".)_
   */
  const sayfa = kaynakOku("src/app/satislar/[id]/page.tsx");
  /** Yorumlar silinir — bir davranışı ANLATAN yorum onu çizmiş sayılmaz. */
  const sayfaYorumsuz = sayfa
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");

  /**
   * ⚠ PENCERE ÖLÇÜLDÜ (10.11.2026, yorumsuz hâlde): masaüstü çağrısı ile
   * koşulu arası **573** karakter, telefonda **54**. 900 seçildi — ikisini
   * kapsar, bir önceki alakasız koşula UZANMAZ. Gövde büyüyünce dar pencere
   * sessizce kör kalır, bu yüzden sayı burada YAZILI: ölçüt kırmızı yanarsa
   * pencere YENİDEN ÖLÇÜLÜR, körü körüne büyütülmez.
   */
  const PENCERE = 900;
  const yerler: number[] = [];
  for (let i = sayfaYorumsuz.indexOf("<PartiBagiDegistir"); i >= 0; ) {
    yerler.push(i);
    i = sayfaYorumsuz.indexOf("<PartiBagiDegistir", i + 1);
  }
  /** ⚠ TABAN: iki görünüm (masaüstü tablo + telefon kartı) — İlke #8. */
  yakin("iki görünümde de çiziliyor", yerler.length, 2);
  yakin(
    "her çağrı izin koşulunun İÇİNDE",
    yerler.filter(
      (y) =>
        !sayfaYorumsuz
          .slice(Math.max(0, y - PENCERE), y)
          .includes("maliyetDuzeltebilir ? ("),
    ).length,
    0,
  );
  /** ⚠ ÇIKIŞIN kimliği geçilir, partinin DEĞİL — taşınan şey çıkış. */
  yakin(
    "iki görünümde de çıkışın kimliği geçiyor",
    yerler.filter((y) =>
      sayfaYorumsuz.slice(y, y + 200).includes("cikisId={dusum.id}"),
    ).length,
    2,
  );
}
kosanBolumler.push("zincir");

console.log("\n" + "=".repeat(62));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — ${kosanBolumler.length}/${BOLUM_SAYISI} bölüm. Sonuç GEÇERSİZ.`,
  );
  process.exit(1);
}
if (kalan === 0) {
  console.log(`OK  ${gecen}/${gecen} ölçüt geçti (${BOLUM_SAYISI} bölüm)`);
  process.exit(0);
}
console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
process.exit(1);
