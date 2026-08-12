/**
 * ============================================================================
 *  STOK DÜZELTME DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run duzeltme:dogrula
 *
 *  DÖRT BÖLÜM:
 *  1) GİRDİ DENETİMİ — eksi adet, sıfır, zorunlu açıklama, para birimsiz tutar.
 *  2) DÖNEM ETKİSİ — fire ile sayım farkı AYRI sayılıyor mu, maliyeti
 *     bilinmeyen hareket sıfır sayılmıyor mu.
 *  3) RAPORA ETKİSİ — düzeltme GERÇEK NET'ten düşüyor ama NET-2'ye
 *     KARIŞMIYOR mu. Bu, kararın kendisidir: düzeltme bir satış değildir.
 *  4) KOMİSYON BANDI — hakedişten fiilen ödenen oran; uyarı eşiği gerçekten
 *     yanlış tuşu yakalıyor mu.
 * ============================================================================
 */

import { gunDegeri, pencereOlustur } from "../src/lib/donem";
import { raporHesapla } from "../src/lib/rapor";
import { bantDisiMi, komisyonBandi } from "../src/lib/komisyon-bandi";
import {
  duzeltmeOzeti,
  duzeltmeyiDogrula,
  hareketMiktari,
} from "../src/lib/stok-duzeltme";

let basarisiz = 0;
let calisan = 0;

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) console.log(`  OK    ${ad}`);
  else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

function yakin(ad: string, gelen: number, beklenen: number, tol = 0.005) {
  const fark = Math.abs(gelen - beklenen);
  calisan++;
  if (fark <= tol) {
    console.log(
      `  OK    ${ad.padEnd(44)} ${gelen.toFixed(2).padStart(10)}  (beklenen ${beklenen.toFixed(2)})`,
    );
  } else {
    basarisiz++;
    console.log(
      `  HATA  ${ad.padEnd(44)} ${gelen.toFixed(2).padStart(10)}  (beklenen ${beklenen.toFixed(2)}, FARK ${fark.toFixed(2)})`,
    );
  }
}

const gun = (y: number, a: number, g: number) => gunDegeri({ yil: y, ay: a, gun: g });

// ===========================================================================
console.log("\n1) GİRDİ DENETİMİ");
// ===========================================================================
{
  const temel = {
    adet: 3,
    yon: "EKSI" as const,
    birimMaliyet: null,
    paraBirimi: null,
    aciklamaZorunlu: false,
    aciklama: "",
  };

  kontrol("geçerli girdi hatasız", duzeltmeyiDogrula(temel).length === 0);

  kontrol(
    "sıfır adet reddedilir",
    duzeltmeyiDogrula({ ...temel, adet: 0 }).includes("ADET_SIFIR"),
  );
  // EKSİ ADET AYRI BİR HATA: yön zaten ayrı seçiliyor. "-5" + EKSİ yön
  // "iki kere eksi" tuzağıdır; stok yanlışlıkla ARTARDI.
  kontrol(
    "eksi adet reddedilir (yön ayrı seçiliyor)",
    duzeltmeyiDogrula({ ...temel, adet: -5 }).includes("ADET_TAM_SAYI_DEGIL"),
  );
  kontrol(
    "kesirli adet reddedilir",
    duzeltmeyiDogrula({ ...temel, adet: 2.5 }).includes("ADET_TAM_SAYI_DEGIL"),
  );

  kontrol(
    "zorunlu açıklama boşsa reddedilir",
    duzeltmeyiDogrula({ ...temel, aciklamaZorunlu: true }).includes(
      "ACIKLAMA_ZORUNLU",
    ),
  );
  kontrol(
    "  ...dolu olunca geçer",
    duzeltmeyiDogrula({
      ...temel,
      aciklamaZorunlu: true,
      aciklama: "kutu ezildi",
    }).length === 0,
  );
  kontrol(
    "  ...yalnız boşluk sayılmaz",
    duzeltmeyiDogrula({
      ...temel,
      aciklamaZorunlu: true,
      aciklama: "   ",
    }).includes("ACIKLAMA_ZORUNLU"),
  );

  kontrol(
    "eksi maliyet reddedilir",
    duzeltmeyiDogrula({
      ...temel,
      yon: "ARTI",
      birimMaliyet: -10,
      paraBirimi: "TRY",
    }).includes("MALIYET_NEGATIF"),
  );
  // Tutar + para birimi BİRLİKTE olur (anayasa).
  kontrol(
    "para birimsiz tutar reddedilir",
    duzeltmeyiDogrula({
      ...temel,
      yon: "ARTI",
      birimMaliyet: 100,
      paraBirimi: null,
    }).includes("MALIYET_PARA_BIRIMSIZ"),
  );
  kontrol(
    "maliyet BOŞ bırakılabilir (NO_COST parti)",
    duzeltmeyiDogrula({ ...temel, yon: "ARTI" }).length === 0,
  );

  kontrol("EKSİ yön -> negatif miktar", hareketMiktari({ adet: 4, yon: "EKSI" }) === -4);
  kontrol("ARTI yön -> pozitif miktar", hareketMiktari({ adet: 4, yon: "ARTI" }) === 4);
}

// ===========================================================================
console.log("\n2) DÖNEM ETKİSİ — fire ve sayım farkı AYRI");
// ===========================================================================
{
  const ozet = duzeltmeOzeti([
    { tarih: gun(2026, 8, 5), miktar: -3, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT" },
    { tarih: gun(2026, 8, 6), miktar: -2, birimMaliyet: 50, paraBirimi: "TRY", tip: "COUNT_CORRECTION" },
  ])[0];

  yakin("fire zararı (3 × 100)", ozet.fireZarari, 300);
  yakin("sayım zararı (2 × 50)", ozet.sayimZarari, 100);
  yakin("toplam", ozet.toplamZarar, 400);
  kontrol(
    "iki tip AYRI sayılıyor (tek kefeye konmadı)",
    ozet.fireZarari !== ozet.toplamZarar,
    `fire ${ozet.fireZarari} · toplam ${ozet.toplamZarar}`,
  );
  kontrol("fire adedi 3", ozet.fireAdedi === 3);
  kontrol("sayım adedi 2", ozet.sayimAdedi === 2);

  // ARTI yön zararı AZALTIR: mal bedava gelmedi, önceki bir eksilme döndü.
  const fazla = duzeltmeOzeti([
    { tarih: gun(2026, 8, 5), miktar: -3, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT" },
    { tarih: gun(2026, 8, 7), miktar: 1, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT" },
  ])[0];
  yakin("sayım fazlası zararı azaltır (300 - 100)", fazla.fireZarari, 200);

  // MALİYETİ BİLİNMEYEN SIFIR SAYILMAZ.
  const bilinmeyen = duzeltmeOzeti([
    { tarih: gun(2026, 8, 5), miktar: -3, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT" },
    { tarih: gun(2026, 8, 8), miktar: -7, birimMaliyet: null, paraBirimi: null, tip: "ADJUSTMENT" },
  ])[0];
  yakin("bilinen kısım tutarlı", bilinmeyen.fireZarari, 300);
  kontrol(
    "maliyeti bilinmeyen 7 adet AYRICA sayıldı",
    bilinmeyen.degeriBilinmeyenAdet === 7,
    bilinmeyen.degeriBilinmeyenAdet,
  );
  kontrol(
    "  ...sıfır maliyetle toplama KATILMADI",
    Math.abs(bilinmeyen.fireZarari - 300) < 0.01,
  );

  // Para birimleri karışmaz.
  const ikiPara = duzeltmeOzeti([
    { tarih: gun(2026, 8, 5), miktar: -1, birimMaliyet: 100, paraBirimi: "TRY", tip: "ADJUSTMENT" },
    { tarih: gun(2026, 8, 5), miktar: -1, birimMaliyet: 40, paraBirimi: "EUR", tip: "ADJUSTMENT" },
  ]);
  kontrol("TRY ve EUR ayrı blok", ikiPara.length === 2, ikiPara.length);
}

// ===========================================================================
console.log("\n3) RAPORA ETKİSİ — GERÇEK NET'ten düşer, NET-2'ye KARIŞMAZ");
// ===========================================================================
{
  const an = new Date("2026-08-12T09:00:00Z");
  const pencere = pencereOlustur("BU_AY", an);

  const ortakGirdi = {
    satislar: [
      {
        id: "s1",
        kod: null,
        tarih: gun(2026, 8, 5),
        gelir: 1000,
        net1: 300,
        net2: 250,
        paraBirimi: "TRY" as const,
        durum: "CALCULATED" as const,
      },
    ],
    iadeler: [],
    giderler: [],
  };

  const duzeltmesiz = raporHesapla(pencere, ortakGirdi).paraBirimleri[0];
  const duzeltmeli = raporHesapla(pencere, {
    ...ortakGirdi,
    duzeltmeler: [
      {
        tarih: gun(2026, 8, 6),
        miktar: -2,
        birimMaliyet: 40,
        paraBirimi: "TRY",
        tip: "ADJUSTMENT",
      },
    ],
  }).paraBirimleri[0];

  yakin("düzeltmesiz GERÇEK NET", duzeltmesiz.gercekNet, 250);
  yakin("düzeltmeli GERÇEK NET (250 - 80)", duzeltmeli.gercekNet, 170);
  yakin("düzeltme zararı", duzeltmeli.duzeltmeZarari, 80);

  // ASIL İDDİA: kâr rakamlarına DOKUNMADI.
  yakin("NET-2 DEĞİŞMEDİ", duzeltmeli.brutNet2, duzeltmesiz.brutNet2);
  yakin("NET-1 DEĞİŞMEDİ", duzeltmeli.satisNet1, duzeltmesiz.satisNet1);
  yakin("satış geliri DEĞİŞMEDİ", duzeltmeli.satisGeliri, duzeltmesiz.satisGeliri);

  // GİDER TABLOSUNA YAZILMAZ: gider toplamı da dokunulmamış olmalı.
  yakin("gider toplamı DEĞİŞMEDİ", duzeltmeli.giderNetDusen, duzeltmesiz.giderNetDusen);
  kontrol(
    "  ...gider kategorisi açılmadı (çift kayıt yok)",
    duzeltmeli.kategoriler.length === duzeltmesiz.kategoriler.length,
    `${duzeltmesiz.kategoriler.length} -> ${duzeltmeli.kategoriler.length}`,
  );

  // Pencere dışı düzeltme sayılmaz.
  const disarda = raporHesapla(pencere, {
    ...ortakGirdi,
    duzeltmeler: [
      {
        tarih: gun(2026, 7, 20),
        miktar: -5,
        birimMaliyet: 100,
        paraBirimi: "TRY",
        tip: "ADJUSTMENT",
      },
    ],
  }).paraBirimleri[0];
  yakin("geçen ayın düzeltmesi girmedi", disarda.duzeltmeZarari, 0);
}


// ===========================================================================
console.log("\n4) KOMİSYON BANDI — hakedişten fiilen ödenen oran");
// ===========================================================================
{
  const kalem = (siparisNo: string, kod: string, tutar: number, hesap = "h1") => ({
    channelAccountId: hesap,
    siparisNo,
    kod,
    tutar,
  });

  // Üç sipariş: %20, %10, %30
  const bant = komisyonBandi([
    kalem("A", "SIPARIS_TUTARI", 1000),
    kalem("A", "KOMISYON", -200),
    kalem("B", "SIPARIS_TUTARI", 1000),
    kalem("B", "KOMISYON", -100),
    kalem("C", "SIPARIS_TUTARI", 1000),
    kalem("C", "KOMISYON", -300),
  ])[0];

  yakin("en düşük %10", bant.enDusuk, 10);
  yakin("en yüksek %30", bant.enYuksek, 30);
  yakin("medyan %20", bant.medyan, 20);
  kontrol("3 sipariş sayıldı", bant.siparisSayisi === 3, bant.siparisSayisi);
  kontrol(
    "kesinti NEGATİF gelse de oran pozitif",
    bant.enDusuk > 0 && bant.enYuksek > 0,
  );

  // MEDYAN, ORTALAMA DEĞİL: tek uç değer ortalamayı çeker, medyanı çekmez.
  const uclu = komisyonBandi([
    kalem("A", "SIPARIS_TUTARI", 1000),
    kalem("A", "KOMISYON", 200),
    kalem("B", "SIPARIS_TUTARI", 1000),
    kalem("B", "KOMISYON", 200),
    kalem("C", "SIPARIS_TUTARI", 1000),
    kalem("C", "KOMISYON", 900),
  ])[0];
  yakin("uç değer medyanı bozmaz (%20)", uclu.medyan, 20);
  kontrol(
    "  ...ortalama olsaydı ~%43 çıkardı",
    Math.abs(uclu.medyan - 43.3) > 5,
    uclu.medyan,
  );

  // EKSİK VERİ: yalnız komisyonu ya da yalnız tutarı olan sipariş sayılmaz.
  const eksik = komisyonBandi([
    kalem("A", "SIPARIS_TUTARI", 1000),
    kalem("A", "KOMISYON", 200),
    kalem("B", "KOMISYON", 150), // tutarı yok
    kalem("C", "SIPARIS_TUTARI", 900), // komisyonu yok
    kalem("D", "SIPARIS_TUTARI", 1000),
    kalem("D", "KOMISYON", 220),
    kalem("E", "SIPARIS_TUTARI", 1000),
    kalem("E", "KOMISYON", 180),
  ])[0];
  kontrol(
    "yarım siparişler sayılmadı (3 gözlem)",
    eksik.siparisSayisi === 3,
    eksik.siparisSayisi,
  );

  // AZ GÖZLEMDEN BANT ÇIKMAZ.
  const azgozlem = komisyonBandi([
    kalem("A", "SIPARIS_TUTARI", 1000),
    kalem("A", "KOMISYON", 200),
    kalem("B", "SIPARIS_TUTARI", 1000),
    kalem("B", "KOMISYON", 200),
  ]);
  kontrol("2 siparişten bant üretilmez", azgozlem.length === 0, azgozlem.length);

  // KANAL HESAPLARI KARIŞMAZ.
  const ikiHesap = komisyonBandi([
    kalem("A", "SIPARIS_TUTARI", 1000, "h1"),
    kalem("A", "KOMISYON", 200, "h1"),
    kalem("B", "SIPARIS_TUTARI", 1000, "h1"),
    kalem("B", "KOMISYON", 200, "h1"),
    kalem("C", "SIPARIS_TUTARI", 1000, "h1"),
    kalem("C", "KOMISYON", 200, "h1"),
    kalem("D", "SIPARIS_TUTARI", 1000, "h2"),
    kalem("D", "KOMISYON", 50, "h2"),
    kalem("E", "SIPARIS_TUTARI", 1000, "h2"),
    kalem("E", "KOMISYON", 50, "h2"),
    kalem("F", "SIPARIS_TUTARI", 1000, "h2"),
    kalem("F", "KOMISYON", 50, "h2"),
  ]);
  kontrol("iki hesap iki ayrı bant", ikiHesap.length === 2, ikiHesap.length);
  const h2 = ikiHesap.find((b) => b.channelAccountId === "h2")!;
  yakin("ikinci hesabın medyanı %5", h2.medyan, 5);

  // --- UYARI EŞİĞİ: geniş bant hiçbir şeyi yakalamaz, bu yüzden dilim ---
  const genis = komisyonBandi(
    Array.from({ length: 20 }, (_, i) => [
      kalem(`S${i}`, "SIPARIS_TUTARI", 1000),
      // 18 tanesi %18-22 bandında, 2 tanesi uçta (%2 ve %60)
      kalem(`S${i}`, "KOMISYON", i === 0 ? 20 : i === 19 ? 600 : 180 + i * 2),
    ]).flat(),
  )[0];
  kontrol(
    "görülen bant uç değerleri İÇERİR",
    genis.enDusuk < 5 && genis.enYuksek > 50,
    `%${genis.enDusuk.toFixed(1)} – %${genis.enYuksek.toFixed(1)}`,
  );
  kontrol(
    "uyarı aralığı DAR (uç değerler dışarıda)",
    genis.uyariAlt > 10 && genis.uyariUst < 40,
    `%${genis.uyariAlt.toFixed(1)} – %${genis.uyariUst.toFixed(1)}`,
  );
  kontrol("%2 girilirse UYARIR", bantDisiMi(2, genis));
  kontrol("%60 girilirse UYARIR", bantDisiMi(60, genis));
  kontrol("%20 girilirse SUSAR", !bantDisiMi(20, genis));
  kontrol(
    "  ...görülen bant kullanılsaydı %2 bile SUSARDI",
    2 >= genis.enDusuk,
    `görülen alt sınır %${genis.enDusuk.toFixed(2)}`,
  );
}

console.log("\n" + "=".repeat(70));
if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
