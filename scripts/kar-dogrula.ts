import { readFileSync } from "node:fs";
/**
 * ============================================================================
 *  KÂR MOTORU DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run kar:dogrula
 *
 *  ÜÇ BÖLÜM:
 *  1) BİRİM TESTLERİ — oran birimi ve KDV ayrıştırma. Bir oranın yüzde mi
 *     binde mi olduğu belirsiz kalırsa 10 kat hata çıkar; burada sabitlenir.
 *  2) ALTIN SENARYOLAR — kullanıcının Excel'inden çözümlenmiş iki gerçek
 *     satış. Motor bunları ±0,25 TL toleransla üretmeli.
 *  2b) TRENDYOL ORAN YOLU — komisyona KDV eklenmediğinin kilidi.
 *  3) DURUM TESTLERİ — maliyetsiz parti, para birimi uyuşmazlığı, eksik kural.
 *     Hesaplanamayan kâr SIFIR SAYILMAZ, durum koduyla bildirilir.
 * ============================================================================
 */

import { karHesapla, kdvAyir, kdvHaric, type KarGirdisi } from "../src/lib/kar";

let basarisiz = 0;
let calisan = 0;

const TOLERANS = 0.25;

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

function yakin(
  ad: string,
  gelen: number,
  beklenen: number,
  tolerans = TOLERANS,
) {
  const fark = Math.abs(gelen - beklenen);
  calisan++;
  if (fark <= tolerans) {
    console.log(
      `  OK    ${ad.padEnd(34)} ${gelen.toFixed(2).padStart(10)}  (beklenen ${beklenen.toFixed(2)}, fark ${fark.toFixed(2)})`,
    );
  } else {
    basarisiz++;
    console.log(
      `  HATA  ${ad.padEnd(34)} ${gelen.toFixed(2).padStart(10)}  (beklenen ${beklenen.toFixed(2)}, FARK ${fark.toFixed(2)})`,
    );
  }
}

// ===========================================================================
console.log("\n1) BİRİM TESTLERİ — oran birimi ve KDV ayrıştırma");
// ===========================================================================
{
  // KDV ayrıştırma: tutar KDV DAHİL, içindeki KDV çıkarılır (üstüne eklenmez).
  kontrol(
    "120 TL içindeki %20 KDV = 20",
    Math.abs(kdvAyir(120, 20) - 20) < 0.001,
  );
  kontrol(
    "120 TL'nin KDV hariç hali = 100",
    Math.abs(kdvHaric(120, 20) - 100) < 0.001,
  );
  kontrol(
    "110 TL içindeki %10 KDV = 10",
    Math.abs(kdvAyir(110, 10) - 10) < 0.001,
  );
  kontrol("101 TL içindeki %1 KDV = 1", Math.abs(kdvAyir(101, 1) - 1) < 0.001);

  /**
   * ORAN BİRİMİ **VE MATRAH** — ikisi ayrı ayrı bozulabilir.
   *
   * ⚠ ESKİ HÂLİ MATRAHI YANLIŞ KİLİTLİYORDU (düzeltildi 21.08.2026):
   * girdi `satisTutari: 1200` idi ve 8 bekleniyordu — yani sessizce
   * "KDV HARİÇ 1000'in binde sekizi" deniyordu. Testin amacı birimi
   * (binde ↔ yüzde) sabitlemekti, ama matrahı da sabitledi ve YANLIŞ
   * olanı sabitledi.
   *
   * Anayasa: _"%0,8 ödeme gideri — sipariş tutarının binde sekizi,
   * **100 TL'de 80 kuruş**"_. Ve HB'nin kendi ekstresi ölçüldü: tahsilat
   * bedeli / sipariş tutarı = %0,8000 (113 sipariş), sipariş tutarının
   * KDV DAHİL olduğu aynı dosyadaki stopaj oranıyla teyit edildi.
   *
   * Artık girdi KDV DAHİL 1000 ve beklenen 8 — üstelik ÜÇ yanlış okuma
   * birden dışlanıyor.
   */
  const bindeSekiz = karHesapla({
    kalemler: [
      {
        satisTutari: 1000,
        satisParaBirimi: "TRY",
        maliyet: 0,
        maliyetParaBirimi: "TRY",
        kdvOrani: 20,
        komisyonTutari: 0,
      },
    ],
    komisyonKdvOrani: null,
    siparisKesintileri: [
      { code: "ODEME_GIDERI", basis: "SALE_AMOUNT", rate: 0.8 },
    ],
    kargoTarifesi: null,
  });
  const odeme = bindeSekiz.siparisKesintileri.find(
    (k) => k.code === "ODEME_GIDERI",
  )!.tutar;
  yakin("%0,8 binde sekiz — KDV DAHİL 1000 -> 8", odeme, 8, 0.001);
  /**
   * ⚠ ÖRNEK VERİ AYRIMIN HER YAKASINI GÖSTERMELİ: üç yanlış okuma da
   * ayrı ayrı dışlanıyor, yoksa biri sessizce geri gelebilir.
   */
  kontrol(
    "  ...yüzde sekiz DEĞİL (80 olmamalı)",
    Math.abs(odeme - 80) > 1,
    odeme,
  );
  kontrol(
    "  ...KDV HARİÇ matrahtan DEĞİL (6,67 olmamalı)",
    Math.abs(odeme - (1000 / 1.2) * 0.008) > 0.5,
    odeme,
  );
  kontrol(
    "  ...üstüne KDV EKLENMİYOR (9,60 olmamalı — nesatilir modeli)",
    Math.abs(odeme - 9.6) > 0.5,
    odeme,
  );

  // Komisyon oranı: %20 yüzde yirmidir.
  const yuzdeYirmi = karHesapla({
    kalemler: [
      {
        satisTutari: 1000,
        satisParaBirimi: "TRY",
        maliyet: 0,
        maliyetParaBirimi: "TRY",
        kdvOrani: 20,
        komisyonOrani: 20,
      },
    ],
    komisyonKdvOrani: null,
    siparisKesintileri: [],
    kargoTarifesi: null,
  });
  yakin(
    "komisyon %20 (1000 -> 200)",
    yuzdeYirmi.kalemler[0].komisyon,
    200,
    0.001,
  );

  // Komisyona KDV eklenmesi (Hepsiburada): %4 -> 4 × 1,20
  const komisyonKdvli = karHesapla({
    kalemler: [
      {
        satisTutari: 1000,
        satisParaBirimi: "TRY",
        maliyet: 0,
        maliyetParaBirimi: "TRY",
        kdvOrani: 20,
        komisyonOrani: 4,
      },
    ],
    komisyonKdvOrani: 20,
    siparisKesintileri: [],
    kargoTarifesi: null,
  });
  yakin(
    "komisyon %4 + KDV (1000 -> 48)",
    komisyonKdvli.kalemler[0].komisyon,
    48,
    0.001,
  );

  // Kargo: tarife KDV HARİÇ gelir, motor KDV ekler.
  const kargolu = karHesapla({
    kalemler: [
      {
        satisTutari: 1200,
        satisParaBirimi: "TRY",
        maliyet: 0,
        maliyetParaBirimi: "TRY",
        kdvOrani: 20,
        komisyonTutari: 0,
      },
    ],
    komisyonKdvOrani: null,
    siparisKesintileri: [],
    kargoTarifesi: 100,
  });
  yakin(
    "kargo tarifesi 100 -> 120 (KDV eklendi)",
    kargolu.siparisKesintileri.find((k) => k.code === "KARGO")!.tutar,
    120,
    0.001,
  );

  // Stopaj: KDV HARİÇ tutarın %1'i, ürünün KENDİ oranıyla.
  const stopajli = karHesapla({
    kalemler: [
      {
        satisTutari: 1100,
        satisParaBirimi: "TRY",
        maliyet: 0,
        maliyetParaBirimi: "TRY",
        kdvOrani: 10, // %10 kategori
        komisyonTutari: 0,
      },
    ],
    komisyonKdvOrani: null,
    siparisKesintileri: [],
    kargoTarifesi: null,
  });
  yakin(
    "stopaj %10 KDV'li üründe (1000 -> 10)",
    stopajli.kalemler[0].stopaj,
    10,
    0.001,
  );
}

// ===========================================================================
console.log("\n2) ALTIN SENARYOLAR — kullanıcının Excel'inden");
// ===========================================================================

console.log("\n--- SENARYO 1: HEPSİBURADA ---");
{
  const girdi: KarGirdisi = {
    kalemler: [
      {
        satisTutari: 2157,
        satisParaBirimi: "TRY",
        maliyet: 1565,
        maliyetParaBirimi: "TRY",
        kdvOrani: 20,
        // Panel gerçeği: listelenen %7 değil, fiilen kesilen %4 × 1,20.
        // Kullanıcı tutarı doğrudan girebiliyor (kampanya indirimi).
        komisyonTutari: 103.53,
      },
    ],
    komisyonKdvOrani: 20,
    siparisKesintileri: [
      { code: "ODEME_GIDERI", basis: "SALE_AMOUNT", rate: 0.8 },
      { code: "HIZMET_BEDELI", basis: "FIXED", amount: 12.6 },
    ],
    kargoTarifesi: 107 / 1.2, // tarife KDV hariç; senaryoda KDV dahil 107,00
  };

  const s = karHesapla(girdi);

  yakin("komisyon", s.kalemler[0].komisyon, 103.53);
  yakin("stopaj", s.kalemler[0].stopaj, 17.98);
  /**
   * ============================================================================
   *  ⚠ BU BEKLENTİ 21.08.2026'DA DEĞİŞTİ — VE ESKİ DEĞER KAYITTA KALIYOR
   * ----------------------------------------------------------------------------
   *  Excel'den çözülen değer **26,85** idi (ödeme gideri ≈ 14,25 + hizmet
   *  bedeli 12,60). Bu rakam KDV HARİÇ matrahı destekliyordu ve motor da
   *  öyle hesaplıyordu — yani test ile motor birbirini doğruluyordu.
   *
   *  HEPSİBURADA'NIN KENDİ EKSTRESİ ÖLÇÜLDÜ (salt okuma, 21.08.2026):
   *    · 113 siparişte tahsilat bedeli / sipariş tutarı = **%0,8000**
   *      (min 0,7992 · max 0,8005 — gerçek yuvarlama gürültüsü)
   *    · Aynı dosyadaki stopaj oranı %0,8333 çıktı (116 satır); stopaj KDV
   *      hariç tutarın %1'i olduğuna göre payda **KDV DAHİLDİR**.
   *    · Bu senaryonun neredeyse ikizi ekstrede duruyor — HB siparişi
   *      `4816616670`, tutar 2.181,52 ₺:
   *          TAHSILAT_BEDELI  −17,45  (%0,7999)
   *          HIZMET_BEDELI    −12,60
   *          STOPAJ           −18,18  (%0,8334)
   *
   *  Yani 2.157 ₺'lik bir HB satışında gerçek ödeme gideri ~17,26'dır,
   *  14,25 değil. Excel'in o satırı tutmuyor; pazaryerinin kendi beyanı
   *  tutuyor ve anayasanın "100 TL'de 80 kuruş" ifadesiyle de örtüşüyor.
   *
   *  ⚠ DEĞİŞEN YALNIZ BU KALEM. Komisyon · stopaj · kargo · satış/alış KDV
   *  beklentileri Excel'den geldiği gibi DURUYOR ve geçiyor — yani senaryo
   *  hâlâ dış bir referansa bağlı, tamamen motorun kendi çıktısına
   *  çevrilmedi (aksi hâlde kendi kendini doğrulayan bir test olurdu).
   * ============================================================================
   */
  yakin(
    "sipariş kesintileri (kargo hariç) — ekstreden düzeltildi",
    s.siparisKesintileri
      .filter((k) => k.code !== "KARGO")
      .reduce((t, k) => t + k.tutar, 0),
    29.86,
  );
  yakin(
    "kargo (KDV dahil)",
    s.siparisKesintileri.find((k) => k.code === "KARGO")!.tutar,
    107,
  );
  yakin("NET-1", s.net1, 333.64);

  yakin("KDV: satış", s.kdv.satisKdv, 359.5);
  yakin("KDV: alış", s.kdv.alisKdv, 260.8);
  yakin("KDV: komisyon", s.kdv.komisyonKdv, 17.3);
  yakin("KDV: kargo", s.kdv.kargoKdv, 17.8);
  yakin("KDV: sipariş kesintileri", s.kdv.kesintiKdv, 4.98);
  yakin("KDV: ödenecek", s.kdv.odenecekKdv, 58.6);

  yakin("NET-2", s.net2, 275.04);
  kontrol("durum CALCULATED", s.durum === "CALCULATED", s.durum);
}

console.log("\n--- SENARYO 2: TRENDYOL ---");
{
  const girdi: KarGirdisi = {
    kalemler: [
      {
        satisTutari: 2060,
        satisParaBirimi: "TRY",
        maliyet: 1249,
        maliyetParaBirimi: "TRY",
        kdvOrani: 20,
        komisyonTutari: 416.12,
      },
    ],
    // Trendyol komisyonuna KDV EKLENMEZ.
    komisyonKdvOrani: null,
    siparisKesintileri: [
      { code: "SABIT_GIDER", basis: "FIXED", amount: 13.19 },
    ],
    kargoTarifesi: 142 / 1.2,
  };

  const s = karHesapla(girdi);

  yakin("komisyon", s.kalemler[0].komisyon, 416.12);
  yakin("stopaj", s.kalemler[0].stopaj, 17.17);
  yakin(
    "sabit gider",
    s.siparisKesintileri.find((k) => k.code === "SABIT_GIDER")!.tutar,
    13.19,
  );
  yakin(
    "kargo (KDV dahil)",
    s.siparisKesintileri.find((k) => k.code === "KARGO")!.tutar,
    142,
  );
  yakin("NET-1", s.net1, 222.53);

  yakin("KDV: satış", s.kdv.satisKdv, 343.3);
  yakin("KDV: alış", s.kdv.alisKdv, 208.2);
  yakin("KDV: komisyon", s.kdv.komisyonKdv, 69.4);
  yakin("KDV: kargo", s.kdv.kargoKdv, 23.7);
  yakin("KDV: sipariş kesintileri", s.kdv.kesintiKdv, 2.2);
  yakin("KDV: ödenecek", s.kdv.odenecekKdv, 39.8, 0.4);

  yakin("NET-2", s.net2, 182.58, 0.4);
  kontrol("durum CALCULATED", s.durum === "CALCULATED", s.durum);
}

// ===========================================================================
console.log("\n2b) TRENDYOL ORAN YOLU — komisyona KDV EKLENMEZ");
// ===========================================================================
/**
 * NEDEN AYRI BÖLÜM VAR:
 * Senaryo 2 komisyonu TUTAR olarak veriyor, yani KDV'nin eklendiği ORAN
 * yolundan hiç geçmiyor. Oysa gerçekte kullanılan yol odur — komisyon oranı
 * Kanal SKU'sundan gelir, satış formunda önerilir. Hepsiburada'nın
 * KOMISYON_KDV kuralı bir gün Trendyol'a da tanımlanırsa tek bir satır
 * değişikliğiyle her TY satışının kârı sessizce düşerdi ve hiçbir test
 * kırmızı yanmazdı.
 *
 * TEYİT (12.08.2026): TY kesintisi KDV DAHİL TEK TUTARDIR. Hem kullanıcı
 * beyanı hem hakediş dosyası aynı şeyi söylüyor — rapordaki komisyon satırı
 * brüt × oran'a birebir eşit, üstüne bir şey eklenmemiş.
 */
{
  /** Kanalda KOMISYON_KDV kuralı olmadan tek kalemlik satış. */
  function tyKalem(satisTutari: number, komisyonOrani: number) {
    return karHesapla({
      kalemler: [
        {
          satisTutari,
          satisParaBirimi: "TRY",
          maliyet: 0,
          maliyetParaBirimi: "TRY",
          kdvOrani: 20,
          komisyonOrani,
        },
      ],
      // Trendyol'un KOMISYON_KDV kuralı YOKTUR — canlı ve yerel veritabanında
      // ölçüldü (12.08.2026): TRENDYOL'da yalnız SABIT_GIDER tanımlı.
      komisyonKdvOrani: null,
      siparisKesintileri: [],
      kargoTarifesi: null,
    });
  }

  // --- 1) Gerçek canlı satış: 11492628481 ---
  const gercek = tyKalem(1946, 2.7).kalemler[0].komisyon;
  yakin("TY 1946 × %2,70 komisyon", gercek, 52.54, 0.01);

  // --- 2) NEGATİF İDDİA: KDV eklenmiş hâli ÇIKMAMALI ---
  // Bu kontrol pozitif olanın aynısı değildir: 52,54 beklentisi tolerans
  // yüzünden kayarsa bile bu satır 63,05'i ayrıca reddeder.
  kontrol(
    "  ...KDV eklenmiş 63,05 DEĞİL",
    Math.abs(gercek - 63.05) > 1,
    `gelen ${gercek.toFixed(2)}`,
  );

  // --- 3) Kullanıcının ikinci örneği ---
  yakin(
    "TY 3999 × %15,5 komisyon",
    tyKalem(3999, 15.5).kalemler[0].komisyon,
    619.85,
    0.01,
  );

  // --- Karşı kontrol: KURAL VARSA KDV gerçekten ekleniyor mu? ---
  // Yukarıdaki üçü, motor komisyona hiç KDV eklemese de geçerdi. Bu satır
  // Hepsiburada yolunun hâlâ çalıştığını kanıtlar: aynı girdi, tek fark kural.
  const kurallı = karHesapla({
    kalemler: [
      {
        satisTutari: 1946,
        satisParaBirimi: "TRY",
        maliyet: 0,
        maliyetParaBirimi: "TRY",
        kdvOrani: 20,
        komisyonOrani: 2.7,
      },
    ],
    komisyonKdvOrani: 20,
    siparisKesintileri: [],
    kargoTarifesi: null,
  });
  yakin(
    "aynı girdi + KOMISYON_KDV kuralı -> 63,05",
    kurallı.kalemler[0].komisyon,
    63.05,
    0.01,
  );
}

// ===========================================================================
console.log("\n3) DURUM TESTLERİ — hesaplanamayan kâr sıfır sayılmaz");
// ===========================================================================
{
  const temelKalem = {
    satisTutari: 1200,
    satisParaBirimi: "TRY" as const,
    kdvOrani: 20,
    komisyonTutari: 100,
  };

  const maliyetsiz = karHesapla({
    kalemler: [{ ...temelKalem, maliyet: null, maliyetParaBirimi: null }],
    komisyonKdvOrani: null,
    siparisKesintileri: [],
    kargoTarifesi: null,
  });
  kontrol(
    "maliyetsiz parti -> NO_COST",
    maliyetsiz.durum === "NO_COST",
    maliyetsiz.durum,
  );

  const paraFarki = karHesapla({
    kalemler: [{ ...temelKalem, maliyet: 800, maliyetParaBirimi: "EUR" }],
    komisyonKdvOrani: null,
    siparisKesintileri: [],
    kargoTarifesi: null,
  });
  kontrol(
    "EUR maliyet / TRY satış -> CURRENCY_MISMATCH",
    paraFarki.durum === "CURRENCY_MISMATCH",
    paraFarki.durum,
  );

  const komisyonsuz = karHesapla({
    kalemler: [
      {
        satisTutari: 1200,
        satisParaBirimi: "TRY",
        maliyet: 800,
        maliyetParaBirimi: "TRY",
        kdvOrani: 20,
        // ne tutar ne oran verildi
      },
    ],
    komisyonKdvOrani: null,
    siparisKesintileri: [],
    kargoTarifesi: null,
  });
  kontrol(
    "komisyon oranı/tutarı yok -> RULE_MISSING",
    komisyonsuz.durum === "RULE_MISSING",
    komisyonsuz.durum,
  );

  const kargosuz = karHesapla({
    kalemler: [{ ...temelKalem, maliyet: 800, maliyetParaBirimi: "TRY" }],
    komisyonKdvOrani: null,
    siparisKesintileri: [],
    kargoTarifesi: null,
    kargoTarifesiBulunamadi: true,
  });
  kontrol(
    "aralık dışı desi (tarife yok) -> RULE_MISSING",
    kargosuz.durum === "RULE_MISSING",
    kargosuz.durum,
  );

  // Kategori KDV oranı gerçekten kullanılıyor mu?
  const indirimli = karHesapla({
    kalemler: [
      {
        satisTutari: 1100,
        satisParaBirimi: "TRY",
        maliyet: 0,
        maliyetParaBirimi: "TRY",
        kdvOrani: 10,
        komisyonTutari: 0,
      },
    ],
    komisyonKdvOrani: null,
    siparisKesintileri: [],
    kargoTarifesi: null,
  });
  yakin("%10 kategoride satış KDV'si", indirimli.kdv.satisKdv, 100, 0.01);
}

console.log(`\n${"=".repeat(70)}`);

console.log("");
console.log("=".repeat(70));
console.log("BÖLÜNMÜŞ PAKET — hizmet bedeli paket başına");
console.log("=".repeat(70));
{
  /**
   * ⚠ ÖLÇÜLDÜ 20.08.2026, TY PANELİNDEN — iki gerçek sipariş:
   *   11438745987 (1 paket) -> platform hizmet 13,19
   *   11361665302 (2 paket) -> platform hizmet 26,38  = 2 × 13,19
   *
   * Motor bu bedeli SİPARİŞ BAŞINA sabit sayıyordu; bölünmüş her
   * siparişte kesinti eksik, kâr ŞİŞKİN hesaplanıyordu.
   */
  const temel = (paketSayisi?: number) =>
    karHesapla({
      kalemler: [
        {
          satisTutari: 1000,
          satisParaBirimi: "TRY",
          maliyet: 500,
          maliyetParaBirimi: "TRY",
          kdvOrani: 20,
          komisyonOrani: 10,
        },
      ],
      komisyonKdvOrani: null,
      siparisKesintileri: [
        {
          code: "SABIT_GIDER",
          basis: "FIXED",
          amount: 13.19,
          paketBasina: true,
        },
      ],
      kargoTarifesi: null,
      paketSayisi,
    });

  const tek = temel(1);
  const iki = temel(2);
  const kesinti = (s: ReturnType<typeof karHesapla>) =>
    s.siparisKesintileri.find((k) => k.code === "SABIT_GIDER")?.tutar ?? 0;

  kontrol(
    "1 paket → 13,19",
    Math.abs(kesinti(tek) - 13.19) < 0.001,
    kesinti(tek),
  );
  kontrol(
    "2 paket → 26,38",
    Math.abs(kesinti(iki) - 26.38) < 0.001,
    kesinti(iki),
  );
  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR: aynı kural, farklı
   * paket sayısı, farklı sonuç. Tek paketle sınasaydık çarpan hiç
   * sınanmamış olurdu.
   */
  /**
   * ⚠ İLK TEST YANLIŞ ŞEY BEKLEDİ: "NET-2 farkı tam 13,19" dedi ve
   * kırmızı yandı. Doğrusu değil — kesinti KDV DAHİL tutuluyor, motor
   * KDV'sini ayırıp mahsuba yazıyor; NET-2'ye yansıyan kısım daha küçük.
   * NET-1 ise kesintinin tamamını görür.
   *
   * Sınanacak şey "fark 13,19" değil, "fark VAR ve DOĞRU YÖNDE".
   */
  kontrol(
    "  ...NET-1 farkı tam 13,19",
    Math.abs(tek.net1 - iki.net1 - 13.19) < 0.001,
    tek.net1 - iki.net1,
  );
  kontrol("  ...NET-2 de düşüyor", iki.net2 < tek.net2, {
    tek: tek.net2,
    iki: iki.net2,
  });
  kontrol(
    "  ...ve NET-2 farkı 13,19'u AŞMIYOR (KDV mahsubu)",
    tek.net2 - iki.net2 <= 13.19 + 0.001,
    tek.net2 - iki.net2,
  );

  /** ⚠ EN AZ 1 — "0 paket" kesintiyi yok ederdi. */
  kontrol(
    "paket 0 verilirse 1 sayılır",
    Math.abs(kesinti(temel(0)) - 13.19) < 0.001,
  );
  kontrol(
    "paket eksi verilirse 1 sayılır",
    Math.abs(kesinti(temel(-3)) - 13.19) < 0.001,
  );
  kontrol(
    "paket verilmezse 1 sayılır",
    Math.abs(kesinti(temel()) - 13.19) < 0.001,
  );

  /**
   * ⚠ ÇARPAN YALNIZ PAKET BAŞINA KURALDA. Yüzde tabanlı kesinti (ödeme
   * gideri) ciro üzerinden hesaplanıyor; onu paketle çarpmak aynı parayı
   * iki kez kesmek olurdu.
   */
  const yuzdeli = karHesapla({
    kalemler: [
      {
        satisTutari: 1000,
        satisParaBirimi: "TRY",
        maliyet: 500,
        maliyetParaBirimi: "TRY",
        kdvOrani: 20,
        komisyonOrani: 10,
      },
    ],
    komisyonKdvOrani: null,
    siparisKesintileri: [
      { code: "ODEME_GIDERI", basis: "SALE_AMOUNT", rate: 0.8 },
      { code: "HIZMET_BEDELI", basis: "FIXED", amount: 12.6 },
    ],
    kargoTarifesi: null,
    paketSayisi: 3,
  });
  const bul = (k: string) =>
    yuzdeli.siparisKesintileri.find((x) => x.code === k)?.tutar ?? 0;
  kontrol("yüzde tabanlı kesinti ÇARPILMAZ", bul("ODEME_GIDERI") < 10);
  /** ⚠ PAKET BAŞINA İŞARETLENMEMİŞ SABİT KESİNTİ DE ÇARPILMAZ. */
  kontrol(
    "işaretsiz sabit kesinti ÇARPILMAZ (HB 12,60 ölçülmedi)",
    Math.abs(bul("HIZMET_BEDELI") - 12.6) < 0.001,
    bul("HIZMET_BEDELI"),
  );

  /**
   * ⚠ DEĞER TESTİ BURAYA BAKAMAZ: kuralların motora TAŞINDIĞI yer
   * veritabanına dokunuyor. Süzgeç `PER_PACKAGE`ı almazsa kural sessizce
   * DÜŞER ve kesinti hiç uygulanmaz — kâr daha da şişer. Mutasyon
   * denemesinde tam bu iki nokta KÖR kaldı; kaynak taraması eklendi.
   *
   * ⚠ Desen KULLANIM BLOĞUNDA aranıyor: "PER_PACKAGE" kelimesi dosyada
   * yorumlarda da geçiyor, `.filter(` satırına bağlanmazsa yalancı yeşil
   * olurdu (beş kez yaşandı).
   */
  for (const yol of ["src/lib/satis.ts", "src/lib/kar-yeniden.ts"]) {
    const kaynak = readFileSync(yol, "utf8");
    kontrol(
      `${yol}: süzgeç PER_PACKAGE'ı da alıyor`,
      /\.filter\(\(k\) => k\.scope === "PER_SALE" \|\| k\.scope === "PER_PACKAGE"\)/.test(
        kaynak,
      ),
    );
    kontrol(
      `  ...ve kurala paketBasina işareti konuyor`,
      /paketBasina: k\.scope === "PER_PACKAGE"/.test(kaynak),
    );
  }

  /**
   * ⚠ YENİDEN HESAP KAYDIN KENDİ GERÇEĞİYLE KOŞAR. Sabit 1'e düşseydi
   * bölünmüş bir satış HER tazelemede yeniden şişerdi — ve tazeleme
   * kanal taşımasında, adet düzeltmesinde, maliyet hizalamasında
   * kendiliğinden koşuyor.
   */
  const yeniden = readFileSync("src/lib/kar-yeniden.ts", "utf8");
  kontrol(
    "yeniden hesap paket sayısını SATIŞTAN okuyor",
    /paketSayisi: satis\.paketSayisi,/.test(yeniden),
  );
  const satisKaynak = readFileSync("src/lib/satis.ts", "utf8");
  kontrol(
    "kayıt sırasında paket sayısı motora GİDİYOR",
    /paketSayisi: girdi\.paketSayisi,/.test(satisKaynak),
  );
  kontrol(
    "  ...ve veritabanına YAZILIYOR",
    /paketSayisi: Math\.max\(1, Math\.trunc\(girdi\.paketSayisi \?\? 1\)\)/.test(
      satisKaynak,
    ),
  );
}

console.log(
  basarisiz === 0
    ? `TÜM KONTROLLER GEÇTİ (${calisan})`
    : `${basarisiz}/${calisan} KONTROL BAŞARISIZ`,
);
process.exit(basarisiz === 0 ? 0 : 1);
