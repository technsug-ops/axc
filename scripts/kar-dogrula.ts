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

import {
  karHesapla,
  kdvAyir,
  kdvHaric,
  type KarGirdisi,
} from "../src/lib/kar";

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

function yakin(ad: string, gelen: number, beklenen: number, tolerans = TOLERANS) {
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
  kontrol("120 TL içindeki %20 KDV = 20", Math.abs(kdvAyir(120, 20) - 20) < 0.001);
  kontrol("120 TL'nin KDV hariç hali = 100", Math.abs(kdvHaric(120, 20) - 100) < 0.001);
  kontrol("110 TL içindeki %10 KDV = 10", Math.abs(kdvAyir(110, 10) - 10) < 0.001);
  kontrol("101 TL içindeki %1 KDV = 1", Math.abs(kdvAyir(101, 1) - 1) < 0.001);

  // ORAN BİRİMİ — %0,8 BİNDE SEKİZDİR, yüzde sekiz değil.
  // 1000 TL (KDV hariç) üzerinden %0,8 -> 8 TL. Yanlış okunursa 80 TL çıkar.
  const bindeSekiz = karHesapla({
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
    siparisKesintileri: [
      { code: "ODEME_GIDERI", basis: "SALE_AMOUNT", rate: 0.8 },
    ],
    kargoTarifesi: null,
  });
  const odeme = bindeSekiz.siparisKesintileri.find(
    (k) => k.code === "ODEME_GIDERI",
  )!.tutar;
  yakin("%0,8 binde sekiz (1000 -> 8)", odeme, 8, 0.001);
  kontrol("  ...yüzde sekiz DEĞİL (80 olmamalı)", Math.abs(odeme - 80) > 1);

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
  yakin("komisyon %20 (1000 -> 200)", yuzdeYirmi.kalemler[0].komisyon, 200, 0.001);

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
  yakin(
    "sipariş kesintileri (kargo hariç)",
    s.siparisKesintileri
      .filter((k) => k.code !== "KARGO")
      .reduce((t, k) => t + k.tutar, 0),
    26.85,
  );
  yakin(
    "kargo (KDV dahil)",
    s.siparisKesintileri.find((k) => k.code === "KARGO")!.tutar,
    107,
  );
  yakin("NET-1", s.net1, 336.65);

  yakin("KDV: satış", s.kdv.satisKdv, 359.5);
  yakin("KDV: alış", s.kdv.alisKdv, 260.8);
  yakin("KDV: komisyon", s.kdv.komisyonKdv, 17.3);
  yakin("KDV: kargo", s.kdv.kargoKdv, 17.8);
  yakin("KDV: sipariş kesintileri", s.kdv.kesintiKdv, 4.5);
  yakin("KDV: ödenecek", s.kdv.odenecekKdv, 59.1);

  yakin("NET-2", s.net2, 277.54);
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
  yakin("TY 3999 × %15,5 komisyon", tyKalem(3999, 15.5).kalemler[0].komisyon, 619.85, 0.01);

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
  kontrol("maliyetsiz parti -> NO_COST", maliyetsiz.durum === "NO_COST", maliyetsiz.durum);

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
console.log(
  basarisiz === 0
    ? `TÜM KONTROLLER GEÇTİ (${calisan})`
    : `${basarisiz}/${calisan} KONTROL BAŞARISIZ`,
);
process.exit(basarisiz === 0 ? 0 : 1);
