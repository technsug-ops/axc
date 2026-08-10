/**
 * ============================================================================
 *  DÖNEM RAPORU DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run rapor:dogrula
 *
 *  Veritabanına GİTMEZ — hepsi saf hesap. Beş bölüm:
 *
 *  1) PENCERE — "bu ay / son 3 ay / son 6 ay / özel aralık" sınırları,
 *     yıl sınırı geçişi, bozuk tarih reddi.
 *  2) SAAT DİLİMİ — raporun en sinsi hatası. Almanya'da hâlâ 31 Temmuz
 *     iken Türkiye'de 1 Ağustos'tur; rapor Ağustos'u göstermelidir.
 *  3) SINIR GÜNLERİ — ay başı DAHİL, önceki ayın son günü HARİÇ.
 *  4) ELLE HESAP — bilinen mini veri setinin her rakamı elle hesaplandı;
 *     motor birebir tutmalı.
 *  5) KURALLAR — iade kendi ayına yazılır · para birimleri ayrı raporlanır
 *     (çevrim yok) · hesaplanamayan kâr sıfır sayılmaz · gider KDV'si.
 *
 *  Bölüm ortasında patlarsa "TÜM KONTROLLER GEÇTİ" YAZMAZ — 09.08.2026'da
 *  yarım koşan bir doğrulama başarı raporladı, bu bayrak onun dersidir.
 * ============================================================================
 */

import {
  ayKaydir,
  gunMetni,
  gunMetninden,
  isTakvimGunu,
  pencereOlustur,
  PencereHatasi,
  type Pencere,
} from "../src/lib/donem";
import { kdvAyir } from "../src/lib/kar";
import {
  raporHesapla,
  type RaporGider,
  type RaporGirdisi,
  type RaporIade,
  type RaporSatis,
} from "../src/lib/rapor";

let basarisiz = 0;
let calisan = 0;

/**
 * Koşan bölümler. Bir bölüm ortasında patlarsa buraya yazılmaz ve sonuç
 * GEÇERSİZ sayılır. 09.08.2026'da yarım koşan bir doğrulama "TÜM KONTROLLER
 * GEÇTİ" yazmıştı; bu liste onun dersidir.
 */
const BOLUM_SAYISI = 5;
const kosanBolumler: string[] = [];

const TOLERANS = 0.005;

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

function yakin(ad: string, gelen: number, beklenen: number) {
  const fark = Math.abs(gelen - beklenen);
  calisan++;
  if (fark <= TOLERANS) {
    console.log(
      `  OK    ${ad.padEnd(36)} ${gelen.toFixed(2).padStart(12)}`,
    );
  } else {
    basarisiz++;
    console.log(
      `  HATA  ${ad.padEnd(36)} ${gelen.toFixed(2).padStart(12)}  (beklenen ${beklenen.toFixed(2)})`,
    );
  }
}

/** Takvim gününü UTC gece yarısı olarak üretir — iş tarihlerinin saklanma biçimi. */
function gun(metin: string): Date {
  const tarih = gunMetninden(metin);
  if (!tarih) throw new Error(`Test verisi bozuk: ${metin}`);
  return tarih;
}

function aralik(p: Pencere): string {
  return `${gunMetni(p.baslangic)} → ${gunMetni(p.sonGun)}`;
}

// ===========================================================================
console.log("\n1) PENCERE — dönem sınırları");
// ===========================================================================
{
  // 10 Ağustos 2026, İstanbul öğlen.
  const an = new Date("2026-08-10T09:00:00Z");

  const buAy = pencereOlustur("BU_AY", an);
  kontrol(`bu ay          ${aralik(buAy)}`, aralik(buAy) === "2026-08-01 → 2026-08-10");

  // KULLANICI KARARI 10.08.2026: "son 3 ay" = BU AY DAHİL son 3 takvim ayı.
  const son3 = pencereOlustur("SON_3_AY", an);
  kontrol(`son 3 ay       ${aralik(son3)}`, aralik(son3) === "2026-06-01 → 2026-08-10");

  const son6 = pencereOlustur("SON_6_AY", an);
  kontrol(`son 6 ay       ${aralik(son6)}`, aralik(son6) === "2026-03-01 → 2026-08-10");

  // YIL SINIRI — Ocak'tan geriye giderken yıl düşmeli.
  const ocak = new Date("2026-01-15T09:00:00Z");
  const ocakSon3 = pencereOlustur("SON_3_AY", ocak);
  kontrol(
    `yıl sınırı: son 3 ay ${aralik(ocakSon3)}`,
    aralik(ocakSon3) === "2025-11-01 → 2026-01-15",
  );
  const ocakSon6 = pencereOlustur("SON_6_AY", ocak);
  kontrol(
    `yıl sınırı: son 6 ay ${aralik(ocakSon6)}`,
    aralik(ocakSon6) === "2025-08-01 → 2026-01-15",
  );

  kontrol("ayKaydir(2026,1,-2) = 2025/11", JSON.stringify(ayKaydir(2026, 1, -2)) === '{"yil":2025,"ay":11}');
  kontrol("ayKaydir(2025,12,+1) = 2026/1", JSON.stringify(ayKaydir(2025, 12, 1)) === '{"yil":2026,"ay":1}');

  // ÖZEL ARALIK — bitiş günü DAHİLDİR.
  const ozel = pencereOlustur("OZEL", an, {
    baslangic: "2026-02-01",
    bitis: "2026-02-28",
  });
  kontrol(`özel aralık    ${aralik(ozel)}`, aralik(ozel) === "2026-02-01 → 2026-02-28");
  kontrol(
    "özel aralıkta bitiş günü DAHİL (bitisHaric = 1 Mart)",
    gunMetni(ozel.bitisHaric) === "2026-03-01",
  );

  // BOZUK GİRDİ SESSİZ GEÇMEZ.
  kontrol("31 Şubat reddedilir", gunMetninden("2026-02-31") === null);
  kontrol("bozuk biçim reddedilir", gunMetninden("01.02.2026") === null);

  let tersYakalandi = false;
  try {
    pencereOlustur("OZEL", an, { baslangic: "2026-03-01", bitis: "2026-02-01" });
  } catch (hata) {
    tersYakalandi = hata instanceof PencereHatasi && hata.kod === "TERS_ARALIK";
  }
  kontrol("ters aralık hata verir", tersYakalandi);
  kosanBolumler.push("pencere");
}

// ===========================================================================
console.log("\n2) SAAT DİLİMİ — iş günü Europe/Istanbul'dan okunur");
// ===========================================================================
{
  // 31 Temmuz 21:30 UTC.  UTC'de ve Almanya'da (UTC+2) hâlâ 31 TEMMUZ;
  // Türkiye'de (UTC+3) çoktan 1 AĞUSTOS. Rapor AĞUSTOS'u göstermeli.
  const gecTemmuz = new Date("2026-07-31T21:30:00Z");

  const isGunu = isTakvimGunu(gecTemmuz);
  kontrol(
    `31.07 21:30 UTC → İstanbul günü ${isGunu.gun}.${isGunu.ay}`,
    isGunu.yil === 2026 && isGunu.ay === 8 && isGunu.gun === 1,
    isGunu,
  );

  const p = pencereOlustur("BU_AY", gecTemmuz);
  kontrol(
    `o anda "bu ay" = ${aralik(p)}  (Temmuz DEĞİL)`,
    gunMetni(p.baslangic) === "2026-08-01",
  );

  // Ters yön: ay sonunda da aynı kural.
  const ayDonumu = new Date("2026-08-31T21:30:00Z");
  const p2 = pencereOlustur("BU_AY", ayDonumu);
  kontrol(
    `31.08 21:30 UTC → "bu ay" = ${aralik(p2)}  (Eylül)`,
    gunMetni(p2.baslangic) === "2026-09-01",
  );

  // Gündüz saatlerinde iki dilim aynı günü gösterir — kayma YOK.
  const ogle = new Date("2026-08-15T09:00:00Z");
  const oglenGun = isTakvimGunu(ogle);
  kontrol(
    "gündüz saatinde gün kaymaz (15 Ağustos)",
    oglenGun.gun === 15 && oglenGun.ay === 8,
  );
  kosanBolumler.push("saat dilimi");
}

// ===========================================================================
console.log("\n3) SINIR GÜNLERİ — ay başı DAHİL, bir önceki gün HARİÇ");
// ===========================================================================
{
  const an = new Date("2026-08-31T09:00:00Z"); // İstanbul: 31 Ağustos
  const pencere = pencereOlustur("BU_AY", an);

  function tekSatis(tarih: string): RaporSatis {
    return {
      id: tarih,
      tarih: gun(tarih),
      gelir: 100,
      net1: 10,
      net2: 10,
      paraBirimi: "TRY",
      durum: "CALCULATED",
    };
  }

  const sonuc = raporHesapla(pencere, {
    satislar: [
      tekSatis("2026-07-31"), // HARİÇ — önceki ay
      tekSatis("2026-08-01"), // DAHİL — ay başı
      tekSatis("2026-08-15"),
      tekSatis("2026-08-31"), // DAHİL — bugün
      tekSatis("2026-09-01"), // HARİÇ — gelecek
    ],
    iadeler: [],
    giderler: [],
  });

  const blok = sonuc.paraBirimleri[0];
  kontrol(
    `pencereye giren satış sayısı = 3 (gelen ${blok?.satisAdedi})`,
    blok?.satisAdedi === 3,
  );
  yakin("pencere içi gelir", blok?.satisGeliri ?? 0, 300);
  kosanBolumler.push("sınır günleri");
}

// ===========================================================================
console.log("\n4) ELLE HESAP — mini veri setinin her rakamı");
// ===========================================================================
{
  const an = new Date("2026-08-31T09:00:00Z");
  const pencere = pencereOlustur("BU_AY", an);

  const satislar: RaporSatis[] = [
    { id: "S1", tarih: gun("2026-08-05"), gelir: 2157, net1: 348, net2: 300, paraBirimi: "TRY", durum: "CALCULATED" },
    { id: "S2", tarih: gun("2026-08-12"), gelir: 7835, net1: 1200, net2: 1000, paraBirimi: "TRY", durum: "CALCULATED" },
    // Maliyetsiz parti — kârı YOK, geliri VAR.
    { id: "S3", tarih: gun("2026-08-20"), gelir: 500, net1: null, net2: null, paraBirimi: "TRY", durum: "NO_COST" },
  ];

  const iadeler: RaporIade[] = [
    { id: "I1", tarih: gun("2026-08-15"), net1: -695.11, net2: -600, paraBirimi: "TRY", durum: "CALCULATED" },
  ];

  const giderler: RaporGider[] = [
    { id: "G1", tarih: gun("2026-08-01"), tutar: 12000, kdvOrani: 20, paraBirimi: "TRY", kategoriId: "kira", kategoriAd: "Kira", sabitMi: true },
    // Maaşta KDV YOK — oran 0, tam tutar düşer.
    { id: "G2", tarih: gun("2026-08-03"), tutar: 20000, kdvOrani: 0, paraBirimi: "TRY", kategoriId: "maas", kategoriAd: "Maaş", sabitMi: true },
    { id: "G3", tarih: gun("2026-08-18"), tutar: 1200, kdvOrani: 20, paraBirimi: "TRY", kategoriId: "sarf", kategoriAd: "Sarf malzeme", sabitMi: false },
  ];

  const b = raporHesapla(pencere, { satislar, iadeler, giderler })
    .paraBirimleri[0]!;

  // --- satış ---
  kontrol("satış adedi = 3", b.satisAdedi === 3);
  yakin("satış geliri", b.satisGeliri, 2157 + 7835 + 500); //  10.492,00
  yakin("Σ NET-1 (satış)", b.satisNet1, 1548);
  yakin("Σ NET-2 (satış)", b.satisNet2, 1300);
  kontrol("kârı hesaplanan satış = 2", b.hesaplananSatisAdedi === 2);
  kontrol("hesaplanamayan satış = 1", b.hesaplanamayanSatisAdedi === 1);

  // --- iade (kendi ayına) ---
  kontrol("iade adedi = 1", b.iadeAdedi === 1);
  yakin("iade NET-1 etkisi", b.iadeNet1, -695.11);
  yakin("iade NET-2 etkisi", b.iadeNet2, -600);

  // --- brüt (iade dahil) ---
  yakin("brüt NET-1", b.brutNet1, 1548 - 695.11); //     852,89
  yakin("brüt NET-2", b.brutNet2, 700);

  // --- gider ---
  yakin("gider toplamı (KDV dahil)", b.giderKdvDahil, 33200);
  yakin("indirilebilir KDV", b.giderIndirilebilirKdv, 2200); // 2000 + 0 + 200
  yakin("GERÇEK NET'ten düşen gider", b.giderNetDusen, 31000); // 10000+20000+1000
  yakin("sabit gider", b.sabitGiderNetDusen, 30000);
  yakin("değişken gider", b.degiskenGiderNetDusen, 1000);

  // --- sonuç ---
  yakin("GERÇEK NET", b.gercekNet, 700 - 31000); //  −30.300,00

  // --- referans göstergeler ---
  yakin("satış başına ort. genel gider", b.satisBasinaOrtGider ?? 0, 31000 / 3);
  yakin("satış başına ort. brüt kâr", b.satisBasinaOrtBrutKar ?? 0, 350);

  // --- kategori dökümü ---
  kontrol("kategori sayısı = 3", b.kategoriler.length === 3);
  kontrol(
    "kategori sıralaması büyükten küçüğe (Maaş başta)",
    b.kategoriler[0]?.kategoriAd === "Maaş",
  );
  const kira = b.kategoriler.find((k) => k.kategoriId === "kira")!;
  yakin("Kira — KDV dahil", kira.kdvDahil, 12000);
  yakin("Kira — indirilebilir KDV", kira.kdv, 2000);
  yakin("Kira — net düşen", kira.netDusen, 10000);
  kosanBolumler.push("elle hesap");
}

// ===========================================================================
console.log("\n5) KURALLAR");
// ===========================================================================
{
  // --- 5a) İADE KENDİ AYINA YAZILIR (kullanıcı kararı 10.08.2026) ---------
  const satisTemmuz: RaporSatis = {
    id: "S", tarih: gun("2026-07-20"), gelir: 2157,
    net1: 348, net2: 300, paraBirimi: "TRY", durum: "CALCULATED",
  };
  const iadeAgustos: RaporIade = {
    id: "I", tarih: gun("2026-08-05"),
    net1: -695.11, net2: -600, paraBirimi: "TRY", durum: "CALCULATED",
  };
  const veri: RaporGirdisi = {
    satislar: [satisTemmuz],
    iadeler: [iadeAgustos],
    giderler: [],
  };

  const temmuz = raporHesapla(
    pencereOlustur("OZEL", new Date("2026-08-10T09:00:00Z"), {
      baslangic: "2026-07-01",
      bitis: "2026-07-31",
    }),
    veri,
  ).paraBirimleri[0]!;

  kontrol("Temmuz: satış var, iade YOK", temmuz.satisAdedi === 1 && temmuz.iadeAdedi === 0);
  yakin("Temmuz brüt NET-2 (iade dokunmaz)", temmuz.brutNet2, 300);

  const agustos = raporHesapla(
    pencereOlustur("OZEL", new Date("2026-08-10T09:00:00Z"), {
      baslangic: "2026-08-01",
      bitis: "2026-08-31",
    }),
    veri,
  ).paraBirimleri[0]!;

  kontrol("Ağustos: satış YOK, iade var", agustos.satisAdedi === 0 && agustos.iadeAdedi === 1);
  yakin("Ağustos brüt NET-2 (yalnız iade etkisi)", agustos.brutNet2, -600);

  // --- 5b) PARA BİRİMLERİ AYRI — ÇEVRİM YOK -------------------------------
  const pencere = pencereOlustur("BU_AY", new Date("2026-08-31T09:00:00Z"));
  const cokluSonuc = raporHesapla(pencere, {
    satislar: [
      { id: "T", tarih: gun("2026-08-05"), gelir: 1000, net1: 100, net2: 80, paraBirimi: "TRY", durum: "CALCULATED" },
      { id: "T2", tarih: gun("2026-08-06"), gelir: 500, net1: 50, net2: 40, paraBirimi: "TRY", durum: "CALCULATED" },
    ],
    iadeler: [],
    giderler: [
      { id: "E", tarih: gun("2026-08-10"), tutar: 119, kdvOrani: 19, paraBirimi: "EUR", kategoriId: "abonelik", kategoriAd: "Abonelik", sabitMi: true },
    ],
  });

  kontrol("iki ayrı para birimi bloğu üretildi", cokluSonuc.paraBirimleri.length === 2);
  const tryBlok = cokluSonuc.paraBirimleri.find((p) => p.paraBirimi === "TRY")!;
  const eurBlok = cokluSonuc.paraBirimleri.find((p) => p.paraBirimi === "EUR")!;
  kontrol("hareketi çok olan blok başta (TRY)", cokluSonuc.paraBirimleri[0]?.paraBirimi === "TRY");
  yakin("TRY bloğunda EUR gideri YOK", tryBlok.giderNetDusen, 0);
  yakin("TRY GERÇEK NET", tryBlok.gercekNet, 120);
  yakin("EUR bloğunda TRY satışı YOK", eurBlok.satisGeliri, 0);
  yakin("EUR gider net düşen (119 / %19)", eurBlok.giderNetDusen, 100);
  yakin("EUR GERÇEK NET", eurBlok.gercekNet, -100);

  // --- 5c) HESAPLANAMAYAN KÂR SIFIR SAYILMAZ ------------------------------
  const eksik = raporHesapla(pencere, {
    satislar: [
      { id: "A", tarih: gun("2026-08-02"), gelir: 1000, net1: null, net2: null, paraBirimi: "TRY", durum: "NO_COST" },
      { id: "B", tarih: gun("2026-08-03"), gelir: 2000, net1: null, net2: null, paraBirimi: "TRY", durum: "CURRENCY_MISMATCH" },
      { id: "C", tarih: gun("2026-08-04"), gelir: 3000, net1: null, net2: null, paraBirimi: "TRY", durum: "NO_COST" },
      { id: "D", tarih: gun("2026-08-05"), gelir: 4000, net1: 500, net2: 400, paraBirimi: "TRY", durum: "CALCULATED" },
    ],
    iadeler: [],
    giderler: [],
  }).paraBirimleri[0]!;

  kontrol("hesaplanamayan satış sayısı = 3", eksik.hesaplanamayanSatisAdedi === 3);
  yakin("gelirleri toplama GİRER", eksik.satisGeliri, 10000);
  yakin("kârları toplama GİRMEZ", eksik.satisNet2, 400);
  kontrol(
    "nedenleri sayılır: NO_COST 2, CURRENCY_MISMATCH 1",
    eksik.hesaplanamayanDurumlar[0]?.durum === "NO_COST" &&
      eksik.hesaplanamayanDurumlar[0]?.adet === 2 &&
      eksik.hesaplanamayanDurumlar[1]?.durum === "CURRENCY_MISMATCH" &&
      eksik.hesaplanamayanDurumlar[1]?.adet === 1,
    eksik.hesaplanamayanDurumlar,
  );
  kontrol(
    "ortalama kâr, BİLİNEN satışa bölünür (400/1)",
    Math.abs((eksik.satisBasinaOrtBrutKar ?? 0) - 400) < TOLERANS,
  );

  // --- 5d) GİDER KDV'Sİ — birim kontrol ----------------------------------
  yakin("12.000 TL içindeki %20 KDV", kdvAyir(12000, 20), 2000);
  yakin("KDV'siz giderde (oran 0) KDV yok", kdvAyir(20000, 0), 0);

  // --- 5e) BOŞ DÖNEM sessizce sıfır uydurmaz -----------------------------
  const bosSonuc = raporHesapla(pencere, { satislar: [], iadeler: [], giderler: [] });
  kontrol("kayıtsız dönem 'boş' işaretlenir", bosSonuc.bos === true);
  kontrol("kayıtsız dönemde blok üretilmez", bosSonuc.paraBirimleri.length === 0);
  kosanBolumler.push("kurallar");
}

// ===========================================================================
console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI} bölüm: ${kosanBolumler.join(", ")})`,
  );
  process.exit(1);
} else if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
