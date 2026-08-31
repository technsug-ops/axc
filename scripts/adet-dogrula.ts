import { acikCikislar, kalemMaliyeti, type MaliyetHareketi } from "../src/lib/kalem-maliyeti";
import { adetPlani, type KalemAdetDegisimi } from "../src/lib/satis-adet";
import type { Parti } from "../src/lib/stok";

/**
 * ============================================================================
 *  SATIŞ ADEDİ DÜZENLEME — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Düzenleme paketinin son dilimi. Fiyat/kargo stok defterine dokunmuyordu;
 *  adet dokunuyor.
 *
 *  Sınanan kurallar:
 *    · artış FIFO'dan çıkar (satış girişiyle AYNI fonksiyon)
 *    · azalış çıkış maliyetinin AYNASI ile geri döner
 *    · ayna girişte KAYNAK BAĞI YOK (hayalet parti dersi 17.08.2026)
 *    · stok yetmiyorsa ENGELLENİR ve kaç adet olduğu söylenir
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

const parti = (
  id: string,
  kalanAdet: number,
  maliyet: string,
  gun = 10,
): Parti => ({
  hareketId: id,
  occurredAt: new Date(Date.UTC(2026, 7, gun)),
  girenAdet: kalanAdet,
  kalanAdet,
  birimMaliyet: maliyet,
  birimMaliyetParaBirimi: "TRY",
  locationId: "raf-A",
});

const kalem = (
  eskiAdet: number,
  yeniAdet: number,
  partiler: Parti[] = [parti("p1", 5, "100.00")],
  cikislar = [
    {
      birimMaliyet: "100.00",
      birimMaliyetParaBirimi: "TRY",
      locationId: "raf-A",
      adet: eskiAdet,
    },
  ],
): KalemAdetDegisimi => ({
  saleItemId: "k1",
  /** K110: önceki parti YOK — bu ölçütler FIFO varsayılanını sınıyor. */
  oncekiPartiId: null,
  variantId: "v1",
  urunAdi: "Soundcore Q21i",
  eskiAdet,
  yeniAdet,
  cikislar,
  partiler,
});

console.log("\nSATIŞ ADEDİ — DOĞRULAMA\n");

// --- 1) DEĞİŞİKLİK YOK -------------------------------------------------------
{
  console.log("1) DEĞİŞİKLİK YOK");
  const p = adetPlani([kalem(2, 2)]);
  kontrol("hareket yazılmaz", p.olur && p.cikislar.length === 0 && p.girisler.length === 0);
}

// --- 2) ARTIŞ — FIFO'dan çıkar ----------------------------------------------
{
  console.log("\n2) ARTIŞ (1 → 3)");
  const p = adetPlani([kalem(1, 3)]);
  kontrol("plan olur", p.olur === true);
  kontrol("2 adet stoktan düşer", p.olur && p.stoktanDusen === 2, p);
  kontrol("çıkış NEGATİF", p.olur && p.cikislar[0].quantityDelta === -2);
  /**
   * ÇIKIŞ PARTİYE BAĞLANIR — hangi partiden düştüğü kayıtta durmalı;
   * kârlılık kartındaki "alımdan satışa gün" hesabı buna bakıyor.
   */
  kontrol("çıkış partiye BAĞLANIR", p.olur && p.cikislar[0].sourceMovementId === "p1");
  kontrol("partinin maliyetini taşır", p.olur && p.cikislar[0].birimMaliyet === "100.00");
  kontrol("ayna giriş YOK", p.olur && p.girisler.length === 0);
}

// --- 3) ARTIŞ, ÇOK PARTİ — FIFO sırası --------------------------------------
{
  console.log("\n3) ARTIŞ, İKİ PARTİ (FIFO sırası)");
  /**
   * En eski parti önce tüketilir ve HER PARTİ KENDİ MALİYETİNİ taşır.
   * Tek maliyetle yazılsaydı envanter değeri kayardı.
   */
  const p = adetPlani([
    kalem(0 + 1, 4, [parti("eski", 2, "80.00", 5), parti("yeni", 5, "120.00", 12)]),
  ]);
  kontrol("iki ayrı çıkış satırı", p.olur && p.cikislar.length === 2, p);
  kontrol("  ...önce ESKİ parti", p.olur && p.cikislar[0].sourceMovementId === "eski");
  kontrol("  ...eski partiden 2 adet", p.olur && p.cikislar[0].quantityDelta === -2);
  kontrol("  ...eski maliyet 80", p.olur && p.cikislar[0].birimMaliyet === "80.00");
  kontrol("  ...kalan 1 adet YENİ partiden", p.olur && p.cikislar[1].quantityDelta === -1);
  kontrol("  ...yeni maliyet 120", p.olur && p.cikislar[1].birimMaliyet === "120.00");
  kontrol("toplam 3 adet düşer", p.olur && p.stoktanDusen === 3);
}

// --- 4) STOK YETMİYOR — ENGEL + RAKAM ---------------------------------------
{
  console.log("\n4) STOK YETMİYOR");
  /**
   * Satış girişi ne yapıyorsa o: yazılmaz. "Eksi stok" defteri bozar.
   * Ekran KAÇ ADET olduğunu söyler — "yapamazsın" demek yetmez.
   */
  const p = adetPlani([kalem(1, 10, [parti("p1", 3, "100.00")])]);
  kontrol("stok yetmezse ENGEL", !p.olur && p.engel === "STOK_YETMIYOR");
  kontrol("  ...gereken adet bildirilir", !p.olur && p.ayrinti.gereken === 9, p);
  kontrol("  ...MEVCUT adet bildirilir", !p.olur && p.ayrinti.mevcut === 3);
  kontrol("  ...hangi ürün olduğu bildirilir", !p.olur && p.ayrinti.urunAdi === "Soundcore Q21i");

  // Tam sınırda geçer: 3 adet var, 3 adet isteniyor.
  const sinir = adetPlani([kalem(1, 4, [parti("p1", 3, "100.00")])]);
  kontrol("tam sınırda GEÇER", sinir.olur === true);
}

// --- 5) AZALIŞ — ayna giriş, maliyet aynası ---------------------------------
{
  console.log("\n5) AZALIŞ (3 → 1)");
  const p = adetPlani([
    kalem(3, 1, [parti("p1", 5, "100.00")], [
      {
        birimMaliyet: "27.16",
        birimMaliyetParaBirimi: "TRY",
        locationId: "raf-A3",
        adet: 3,
      },
    ]),
  ]);
  kontrol("plan olur", p.olur === true);
  kontrol("2 adet stoğa döner", p.olur && p.stogaDonen === 2, p);
  kontrol("giriş POZİTİF", p.olur && p.girisler[0].quantityDelta === 2);
  /**
   * MALİYET ÇIKIŞIN AYNASI — yeni maliyet uydurulmaz, partiden de okunmaz.
   * Mal hangi maliyetle çıktıysa o maliyetle döner.
   */
  kontrol("maliyet ÇIKIŞTAN gelir (27,16)", p.olur && p.girisler[0].birimMaliyet === "27.16");
  kontrol("  ...partinin maliyeti (100) DEĞİL", p.olur && p.girisler[0].birimMaliyet !== "100.00");
  kontrol("raf korunur", p.olur && p.girisler[0].locationId === "raf-A3");
  kontrol("yeni çıkış YOK", p.olur && p.cikislar.length === 0);

  /**
   * ⚠ AYNA GİRİŞTE KAYNAK BAĞI YOK — 17.08.2026 hayalet parti dersi.
   * Bağ yazılsaydı hareket hem yeni parti sayılır hem eski partinin
   * tüketimini sıfırlardı; ledger ile FIFO ayrışırdı.
   */
  kontrol(
    "ayna girişte KAYNAK BAĞI ALANI YOK",
    p.olur && !("sourceMovementId" in p.girisler[0]),
  );
}

// --- 6) AZALIŞ, ÇOK ÇIKIŞ — son çıkan ilk döner -----------------------------
{
  console.log("\n6) AZALIŞ, İKİ ÇIKIŞ");
  /**
   * Kalem iki partiden düşmüşse geri dönüş SON çıkıştan başlar: en son
   * düşen ilk döner (FIFO'nun tersi). Böylece eski parti mümkün olduğunca
   * tüketilmiş kalır.
   */
  const p = adetPlani([
    kalem(3, 1, [parti("p1", 5, "100.00")], [
      { birimMaliyet: "80.00", birimMaliyetParaBirimi: "TRY", locationId: "raf-A", adet: 2 },
      { birimMaliyet: "120.00", birimMaliyetParaBirimi: "TRY", locationId: "raf-B", adet: 1 },
    ]),
  ]);
  kontrol("iki giriş satırı", p.olur && p.girisler.length === 2, p);
  kontrol("  ...önce SON çıkış (120)", p.olur && p.girisler[0].birimMaliyet === "120.00");
  kontrol("  ...1 adet", p.olur && p.girisler[0].quantityDelta === 1);
  kontrol("  ...sonra eski çıkış (80)", p.olur && p.girisler[1].birimMaliyet === "80.00");
  kontrol("  ...1 adet", p.olur && p.girisler[1].quantityDelta === 1);
  kontrol("toplam 2 adet döner", p.olur && p.stogaDonen === 2);
}

// --- 7) ÇOK KALEMLİ SATIŞ — biri artar biri azalır --------------------------
{
  console.log("\n7) ÇOK KALEMLİ (biri artar, biri azalır)");
  const p = adetPlani([
    { ...kalem(1, 3), saleItemId: "k1", variantId: "v1" },
    { ...kalem(3, 1), saleItemId: "k2", variantId: "v2" },
  ]);
  kontrol("hem çıkış hem giriş üretilir", p.olur && p.cikislar.length > 0 && p.girisler.length > 0);
  kontrol("  ...2 düşer", p.olur && p.stoktanDusen === 2);
  kontrol("  ...2 döner", p.olur && p.stogaDonen === 2);
  kontrol("  ...çıkış k1'e ait", p.olur && p.cikislar[0].saleItemId === "k1");
  kontrol("  ...giriş k2'ye ait", p.olur && p.girisler[0].saleItemId === "k2");

  /**
   * BİR KALEMDE STOK YETMEZSE TÜM PLAN DÜŞER: yarım yazılan bir düzenleme,
   * bir kalemi güncellenmiş öteki güncellenmemiş bir satış bırakırdı.
   */
  const yetersiz = adetPlani([
    { ...kalem(3, 1), saleItemId: "k1", variantId: "v1" },
    { ...kalem(1, 9, [parti("p2", 2, "100.00")]), saleItemId: "k2", variantId: "v2" },
  ]);
  kontrol("bir kalem yetersizse TÜM plan düşer", yetersiz.olur === false, yetersiz);
}


// --- 8) GİDİŞ-DÖNÜŞ SİMETRİSİ — İKİ DEFTER BİRDEN ---------------------------
{
  console.log("\n8) GİDİŞ-DÖNÜŞ SİMETRİSİ (1 → 2 → 1)");
  /**
   * ⚠ 17.08.2026 CANLI HATASI — BU TEST YOKTU.
   *
   * Satış 11513025054 (LEGO Mario Kart, ₺3.733) 1→2 çıkarıldı, sonra 2→1
   * indirildi. STOK doğru döndü — ve stok simetrisi zaten test ediliyordu.
   * Ama KÂR dönmedi: NET-2 +₺695'ten −₺1.304'e düştü, çünkü kâr motoru
   * maliyeti yalnız `SALE_OUT` satırlarından topluyor, ayna girişi
   * görmüyordu.
   *
   * DERS: ÖLÇÜM İKİ DEFTERİ DE ÖLÇMELİ. Bir işlem stok defterine ve kâr
   * defterine birlikte yazıyorsa, testi de ikisini birlikte sınamalı.
   * Tek defteri ölçen test, öbürü sessizce ayrışırken yeşil yanar.
   */
  const BIRIM = 2018.63;

  // 1 → 2: bir adet daha çıkar.
  const artis = adetPlani([
    kalem(1, 2, [parti("p1", 5, String(BIRIM))], [
      { birimMaliyet: String(BIRIM), birimMaliyetParaBirimi: "TRY", locationId: "raf-A", adet: 1 },
    ]),
  ]);
  kontrol("artış planı olur", artis.olur === true);

  // Defterin 1→2 sonrası hâli: iki çıkış satırı.
  const ikiAdet: MaliyetHareketi[] = [
    { quantityDelta: -1, birimMaliyet: String(BIRIM), birimMaliyetParaBirimi: "TRY" },
    { quantityDelta: -1, birimMaliyet: String(BIRIM), birimMaliyetParaBirimi: "TRY" },
  ];
  kontrol(
    "2 adetken maliyet = 2 × 2018,63",
    kalemMaliyeti(ikiAdet).maliyet === 4037.26,
    kalemMaliyeti(ikiAdet).maliyet,
  );

  // 2 → 1: ayna giriş.
  const azalis = adetPlani([
    kalem(2, 1, [parti("p1", 5, String(BIRIM))], [
      { birimMaliyet: String(BIRIM), birimMaliyetParaBirimi: "TRY", locationId: "raf-A", adet: 1 },
      { birimMaliyet: String(BIRIM), birimMaliyetParaBirimi: "TRY", locationId: "raf-A", adet: 1 },
    ]),
  ]);
  kontrol("azalış planı olur", azalis.olur === true);
  kontrol("1 adet stoğa döner", azalis.olur && azalis.stogaDonen === 1);

  // Defterin 1→2→1 sonrası hâli: iki çıkış + bir ayna giriş.
  const donusSonrasi: MaliyetHareketi[] = [
    ...ikiAdet,
    { quantityDelta: 1, birimMaliyet: String(BIRIM), birimMaliyetParaBirimi: "TRY" },
  ];

  /**
   * ASIL KONTROL: başlangıç değerine KURUŞUNA EŞİT dönmeli.
   */
  const basta = kalemMaliyeti([ikiAdet[0]]).maliyet;
  const sonra = kalemMaliyeti(donusSonrasi).maliyet;
  kontrol("KÂR DEFTERİ simetrik: maliyet başlangıca EŞİT", sonra === basta, {
    basta,
    sonra,
  });
  kontrol("  ...ve tek adetlik (2018,63)", sonra === 2018.63, sonra);

  /**
   * STOK DEFTERİ de simetrik: net hareket sıfırdan bir adet çıkış.
   */
  const netAdet = -donusSonrasi.reduce((t, h) => t + h.quantityDelta, 0);
  kontrol("STOK DEFTERİ simetrik: net çıkış 1 adet", netAdet === 1, netAdet);

  /**
   * İKİ DEFTER BİRBİRİYLE TUTARLI: maliyet = net adet × birim maliyet.
   * Ayrı ayrı doğru olup birbirinden kopmaları tam olarak yaşanan hataydı.
   */
  kontrol("İKİ DEFTER TUTARLI: maliyet = net adet × birim", sonra === netAdet * BIRIM);
}

// --- 9) AÇIK ÇIKIŞLAR — GERİ DÖNEN MAL İKİNCİ KEZ DÖNMEZ --------------------
{
  console.log("\n9) AÇIK ÇIKIŞLAR (iptal/iade aynasının kaynağı)");
  /**
   * ⚠ AYNI KÖKÜN İKİNCİ YÜZÜ. Adedi 2→1 indirilmiş satış İPTAL edilirse,
   * iptal aynası ham `SALE_OUT` listesinden üretiliyordu: defterde 1 adet
   * açıkken stoğa 2 adet dönerdi. Kâr değil STOK şişerdi.
   */
  const h = (d: number, m = "100.00") => ({ quantityDelta: d, birimMaliyet: m });

  kontrol("dönüş yokken tüm çıkışlar açık", acikCikislar([h(-2)]).length === 1);
  kontrol("  ...adet 2", acikCikislar([h(-2)])[0].adet === 2);

  const azaltilmis = [h(-1), h(-1), h(1)];
  kontrol("1 adet döndüyse 1 adet açık kalır", acikCikislar(azaltilmis).length === 1);
  kontrol("  ...ve adedi 1", acikCikislar(azaltilmis)[0].adet === 1);

  kontrol("hepsi döndüyse açık çıkış YOK", acikCikislar([h(-2), h(2)]).length === 0);

  /** SON ÇIKAN İLK KAPANIR — azalış aynasıyla aynı sıra. */
  const cokParti = [h(-1, "80.00"), h(-1, "120.00"), h(1)];
  kontrol("son çıkan ilk kapanır → açık olan ESKİ parti", (() => {
    const a = acikCikislar(cokParti);
    return a.length === 1 && a[0].birimMaliyet === "80.00";
  })());

  /** Kısmi kapanma: 3 çıkmış, 1 dönmüş → 2 açık. */
  const kismi = [h(-2), h(-1), h(1)];
  kontrol("3 çıkış 1 dönüş → 2 adet açık", (() => {
    const a = acikCikislar(kismi);
    return a.reduce((t, x) => t + x.adet, 0) === 2;
  })());
}

// --- 10) KURUŞ TOZU — ÇOK PARTİLİ GİDİŞ-DÖNÜŞ ------------------------------
{
  console.log("\n10) KURUŞ TOZU (çok partili 3 → 2)");
  /**
   * ⚠ MUTASYON BOŞLUĞU, 17.08.2026'da bulundu. Simetri testi TEK maliyetle
   * yazılınca yuvarlamayı sınamıyordu: 2×2018,63 − 1×2018,63 kayan noktada
   * TAM çıkar (ikiyle çarpma ikilik tabanda kayıpsızdır). Yani
   * `dortBasamak` kaldırıldığında test yeşil kalıyordu — koruduğunu
   * sandığımız satır korumasızdı.
   *
   * Toz FARKLI maliyetli partilerde doğar:
   *     80,10 + 120,20 − 120,20 = 80,10000000000001
   * Test artık o vakayı sürüyor; yuvarlama gerçekten sınanıyor.
   */
  const cok: MaliyetHareketi[] = [
    { quantityDelta: -1, birimMaliyet: "80.10", birimMaliyetParaBirimi: "TRY" },
    { quantityDelta: -1, birimMaliyet: "120.20", birimMaliyetParaBirimi: "TRY" },
    { quantityDelta: 1, birimMaliyet: "120.20", birimMaliyetParaBirimi: "TRY" },
  ];
  const m = kalemMaliyeti(cok).maliyet;
  kontrol("çok partili dönüşte maliyet TAM 80,10", m === 80.1, m);
  kontrol(
    "  ...ham toplam zaten tozluydu (yuvarlama iş yapıyor)",
    80.1 + 120.2 - 120.2 !== 80.1,
  );
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
