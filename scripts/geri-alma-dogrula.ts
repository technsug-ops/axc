import {
  GERI_ALMA_ACIKLAMA_ZORUNLU,
  GERI_ALMA_NEDENLERI,
  geriAlmaImzasi,
  geriAlmaPlani,
  type AynaHareket,
  type GeriAlmaGirdisi,
  type SonrakiCikis,
} from "../src/lib/iptal-geri-alma";

/**
 * ============================================================================
 *  İPTALİ GERİ AL — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Merkezinde GERÇEK VAKA var: 17.08.2026, canlı testte gerçek bir satış
 *  (11512722550) yanlışlıkla iptal edildi. Ayna hareket +1 adet, maliyet
 *  27,16. Geri alma sonrası ledger stok 0 ve FIFO 0 oldu.
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

const ayna = (
  adet = 1,
  maliyet: string | null = "27.16",
  kaynak: string | null = null,
  /** Varsayılan: parti hâlâ tam duruyor. */
  kalanAdet = adet,
): AynaHareket => ({
  hareketId: "ayna-02dtri",
  variantId: "v-9fb932",
  adet,
  kalanAdet,
  birimMaliyet: maliyet,
  birimMaliyetParaBirimi: maliyet === null ? null : "TRY",
  locationId: "raf-A3",
  kaynakHareketId: kaynak,
});

const cikis = (): SonrakiCikis => ({
  hareketId: "h-sonraki",
  tip: "SALE_OUT",
  adet: -1,
  tarih: new Date("2026-08-18"),
  satisId: "s-baska",
  satisKodu: "11599999999",
});

const temel: GeriAlmaGirdisi = {
  iptalliMi: true,
  aynalar: [ayna()],
  /** Satışın kendi adedi — ayna adediyle TUTMALI. */
  satisAdetleri: [{ variantId: "v-9fb932", adet: 1 }],
  sonrakiCikislar: [],
  neden: "YANLISLIKLA",
  aciklama: null,
};

console.log("\nİPTALİ GERİ AL — DOĞRULAMA\n");

// --- 1) GERÇEK VAKA ---------------------------------------------------------
{
  console.log("1) GERÇEK VAKA (11512722550)");
  const p = geriAlmaPlani(temel);
  kontrol("geri alınabilir", p.olur === true);
  kontrol("tek ters hareket", p.olur && p.hareketler.length === 1);
  kontrol("hareket NEGATİF (stoktan çıkar)", p.olur && p.hareketler[0].quantityDelta === -1);
  kontrol("1 adet stoktan çıkacak", p.olur && p.stoktanCikacakAdet === 1);
  /**
   * TERS HAREKET AYNA PARTİSİNİ TÜKETİR: bağlanmazsa ayna parti FIFO'da
   * açık kalır ve stok toplamı ile FIFO ayrışır (hayalet parti).
   */
  kontrol(
    "ayna partisine BAĞLANIR (FIFO'da açık kalmasın)",
    p.olur && p.hareketler[0].sourceMovementId === "ayna-02dtri",
  );
  kontrol("maliyet aynen taşınır", p.olur && p.hareketler[0].birimMaliyet === "27.16");
  kontrol("raf korunur", p.olur && p.hareketler[0].locationId === "raf-A3");
}

// --- 2) KİLİT 1: iptalli değilse ---------------------------------------------
{
  console.log("\n2) KİLİT 1 — İPTALLİ DEĞİL");
  const p = geriAlmaPlani({ ...temel, iptalliMi: false });
  kontrol("iptalsiz satış geri alınamaz", !p.olur && p.engel === "IPTALLI_DEGIL");
}

// --- 3) KİLİT 2: ayna hareket yok --------------------------------------------
{
  console.log("\n3) KİLİT 2 — AYNA HAREKET YOK");
  const p = geriAlmaPlani({ ...temel, aynalar: [] });
  kontrol("ayna yoksa stok geri çevrilemez", !p.olur && p.engel === "AYNA_YOK");
}

// --- 4) KİLİT 3: iptalden sonra çıkış — KONUŞAN KİLİT ------------------------
{
  console.log("\n4) KİLİT 3 — SONRAKİ ÇIKIŞ (sessiz pasif düğme YOK)");
  /**
   * İptal stoğa 1 adet koydu; o adet BAŞKA bir satışta kullanıldı. Geri alma
   * stoğu EKSİYE düşürürdü.
   */
  const p = geriAlmaPlani({ ...temel, sonrakiCikislar: [cikis()] });
  kontrol("sonraki çıkış varsa geri alınamaz", !p.olur && p.engel === "SONRAKI_CIKIS");

  /**
   * MİMAR ŞARTI: engelleyen hareketler GERİ DÖNER; ekran hangi kaydın
   * engellediğini yazar ve ona bağlanır. Sessiz pasif düğme yasak.
   */
  kontrol(
    "engelleyen hareketler GERİ DÖNER",
    !p.olur && p.engelleyenler?.length === 1,
    !p.olur ? p.engelleyenler : p,
  );
  kontrol(
    "  ...satış kodu da döner (ekran bağlantı verebilsin)",
    !p.olur && p.engelleyenler?.[0].satisKodu === "11599999999",
  );
  kontrol(
    "  ...hareket tipi ve tarihi de",
    !p.olur &&
      p.engelleyenler?.[0].tip === "SALE_OUT" &&
      p.engelleyenler?.[0].tarih instanceof Date,
  );

  /**
   * KİLİT 3 SEBEPTEN ÖNCE ÇALIŞIR: kullanıcı sebep seçmeden de neden
   * yapamayacağını öğrenmeli — form doldurup en sonda duvara çarpmasın.
   */
  const nedensiz = geriAlmaPlani({
    ...temel,
    sonrakiCikislar: [cikis()],
    neden: null,
  });
  kontrol(
    "kilit 3, sebep sorulmadan ÖNCE çalışır",
    !nedensiz.olur && nedensiz.engel === "SONRAKI_CIKIS",
    nedensiz,
  );
}

// --- 5) SEBEP ve AÇIKLAMA ---------------------------------------------------
{
  console.log("\n5) SEBEP / AÇIKLAMA");
  kontrol(
    "nedensiz geri alma OLMAZ",
    (() => {
      const p = geriAlmaPlani({ ...temel, neden: null });
      return !p.olur && p.engel === "NEDEN_YOK";
    })(),
  );
  kontrol(
    "DIGER açıklamasız OLMAZ",
    (() => {
      const p = geriAlmaPlani({ ...temel, neden: "DIGER", aciklama: null });
      return !p.olur && p.engel === "ACIKLAMA_YOK";
    })(),
  );
  kontrol(
    "  ...yalnız boşluk SAYILMAZ",
    (() => {
      const p = geriAlmaPlani({ ...temel, neden: "DIGER", aciklama: "  " });
      return !p.olur && p.engel === "ACIKLAMA_YOK";
    })(),
  );
  kontrol(
    "  ...açıklama varsa GEÇER",
    geriAlmaPlani({ ...temel, neden: "DIGER", aciklama: "test iptaliydi" }).olur === true,
  );
  for (const n of ["YANLISLIKLA", "MUSTERI_DEVAM"] as const) {
    kontrol(`${n} açıklamasız geçer`, geriAlmaPlani({ ...temel, neden: n }).olur === true);
  }
  kontrol("neden listesi ÜÇ kalem", GERI_ALMA_NEDENLERI.length === 3);
  kontrol(
    "açıklama zorunlu YALNIZ DIGER",
    GERI_ALMA_ACIKLAMA_ZORUNLU.length === 1 &&
      GERI_ALMA_ACIKLAMA_ZORUNLU[0] === "DIGER",
  );
}

// --- 6) HAYALET PARTİ BAĞI TEMİZLENİR ---------------------------------------
{
  console.log("\n6) HAYALET PARTİ BAĞI");
  /**
   * Eski kayıtlarda ayna hareket hatalı bir `sourceMovementId` taşıyor
   * (17.08.2026 hatası: ledger 1 / FIFO 2). Geri alma onu temizler.
   */
  const kirli = geriAlmaPlani({ ...temel, aynalar: [ayna(1, "27.16", "hn92uv")] });
  kontrol(
    "hatalı kaynak bağı temizlenmek üzere işaretlenir",
    kirli.olur && kirli.hareketler[0].temizlenecekAynaId === "ayna-02dtri",
  );

  // Yeni kayıtlarda bağ zaten yok — temizlenecek bir şey de yok.
  const temiz = geriAlmaPlani(temel);
  kontrol(
    "temiz kayıtta temizleme İŞARETİ YOK",
    temiz.olur && temiz.hareketler[0].temizlenecekAynaId === null,
  );
}

// --- 7) PLAN İMZASI (EK 1) ---------------------------------------------------
{
  console.log("\n7) PLAN İMZASI");
  const a = geriAlmaPlani(temel);
  kontrol("aynı plan aynı imza", geriAlmaImzasi(a) === geriAlmaImzasi(geriAlmaPlani(temel)));
  kontrol(
    "adet değişirse imza DEĞİŞİR",
    geriAlmaImzasi(a) !== geriAlmaImzasi(
      geriAlmaPlani({
        ...temel,
        aynalar: [ayna(2)],
        satisAdetleri: [{ variantId: "v-9fb932", adet: 2 }],
      }),
    ),
  );
  /**
   * ARAYA ÇIKIŞ GİRERSE imza değişir → yazma durur. Önizleme alındıktan
   * sonra o mal satıldıysa geri alma stoğu eksiye düşürürdü.
   */
  kontrol(
    "araya çıkış girerse imza DEĞİŞİR (yazma durur)",
    geriAlmaImzasi(a) !==
      geriAlmaImzasi(geriAlmaPlani({ ...temel, sonrakiCikislar: [cikis()] })),
  );
}

/**
 * ============================================================================
 *  AYNA ADEDİ SATIŞIN ADEDİYLE TUTMALI
 * ----------------------------------------------------------------------------
 *  ⚠ CANLI HATA 20.08.2026: 1 adetlik bir satışın iptali geri alınırken
 *  stoktan 2 adet düştü. Sebep: ayna süzgeci `occurredAt >= iptalTarihi`
 *  diyordu ve AYNI varyantın DAHA SONRAKİ iptalinin aynasını da topladı.
 *
 *  Ayna hareketler satışa bağlı DEĞİL (`saleItemId` yok, `sourceMovementId`
 *  de bilerek yazılmıyor — hayalet parti hatası, 17.08.2026). Dolayısıyla
 *  "bu aynalar bu satışın mı" sorusunun tek cevabı ADETLERİN TUTMASIDIR.
 * ============================================================================
 */
{
  console.log("");
  console.log("AYNA ADEDİ — satışın adediyle karşılaştırma");

  const tutan = geriAlmaPlani(temel);
  kontrol("adetler tutuyorsa plan kurulur", tutan.olur, tutan);

  /** ⚠ ASIL VAKA: iki ayna toplandı ama satış 1 adetlik. */
  const fazla = geriAlmaPlani({
    ...temel,
    aynalar: [ayna(1), { ...ayna(1), hareketId: "ayna-baska-iptal" }],
  });
  kontrol(
    "ayna FAZLAYSA durulur (canlı vaka: 1 adetlik satış, 2 ayna)",
    !fazla.olur && fazla.engel === "AYNA_ADET_UYUSMAZ",
    fazla,
  );

  /** Az da uydurulmaz — eksik ayna da hüküm vermez. */
  const eksik = geriAlmaPlani({
    ...temel,
    satisAdetleri: [{ variantId: "v-9fb932", adet: 3 }],
  });
  kontrol(
    "ayna EKSİKSE de durulur (uydurulmaz)",
    !eksik.olur && eksik.engel === "AYNA_ADET_UYUSMAZ",
    eksik,
  );

  /** ⚠ Varyant bazında bakılır — toplam tutup dağılım tutmayabilir. */
  const karisik = geriAlmaPlani({
    ...temel,
    aynalar: [ayna(2)],
    satisAdetleri: [
      { variantId: "v-9fb932", adet: 1 },
      { variantId: "v-baska", adet: 1 },
    ],
  });
  kontrol(
    "TOPLAM tutsa da varyant dağılımı tutmuyorsa durulur",
    !karisik.olur && karisik.engel === "AYNA_ADET_UYUSMAZ",
    karisik,
  );

  /**
   * ── AYNA PARTİSİ TÜKENMİŞSE ────────────────────────────────────────────
   * ⚠ CANLI VAKA 20.08.2026 (`OYU-LG-598P-01`): geri alma, araya giren bir
   * "HATA DÜZELTME" ile çoktan tüketilmiş ayna partisini tüketmeye çalıştı.
   * Ledger −1 yazdı, FIFO'da düşecek parti yoktu → ledger 3, FIFO 4.
   *
   * ⚠ ADET DOĞRULAMASI BUNU YAKALAMAZ: adetler tutuyor (1 ayna, 1 satış),
   * sorun aynanın MEVCUDİYETİ. İki ayrı kural, iki ayrı test.
   */
  const tukenmis = geriAlmaPlani({
    ...temel,
    aynalar: [ayna(1, "27.16", null, 0)],
  });
  kontrol(
    "ayna partisi TÜKENMİŞSE durulur (hayalet adet doğmasın)",
    !tukenmis.olur && tukenmis.engel === "AYNA_TUKENMIS",
    tukenmis,
  );

  /** Kısmen tükenmiş de yeterli değildir — 2 gerekiyorsa 1 yetmez. */
  const kismi = geriAlmaPlani({
    ...temel,
    aynalar: [ayna(2, "27.16", null, 1)],
    satisAdetleri: [{ variantId: "v-9fb932", adet: 2 }],
  });
  kontrol(
    "ayna KISMEN tükenmişse de durulur",
    !kismi.olur && kismi.engel === "AYNA_TUKENMIS",
    kismi,
  );

  /** ⚠ Sıra: adet uyuşmazlığı ÖNCE bakılır — daha temel bir kusur. */
  const ikisiDe = geriAlmaPlani({
    ...temel,
    aynalar: [ayna(1, "27.16", null, 0), { ...ayna(1, "27.16", null, 0), hareketId: "a2" }],
  });
  kontrol(
    "hem adet hem tükenmişlik bozuksa ADET hükmü döner",
    !ikisiDe.olur && ikisiDe.engel === "AYNA_ADET_UYUSMAZ",
    ikisiDe,
  );

  /** Kırpma YAPILMADIĞI da sınanır: fazla ayna sessizce 1'e indirilmemeli. */
  kontrol(
    "fazla ayna KIRPILMIYOR (plan hiç kurulmuyor)",
    !fazla.olur && !("hareketler" in fazla),
    fazla,
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
