/**
 * ============================================================================
 *  STOK DÜZELTME DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run duzeltme:dogrula
 *
 *  ÜÇ BÖLÜM:
 *  1) GİRDİ DENETİMİ — eksi adet, sıfır, zorunlu açıklama, para birimsiz tutar.
 *  2) DÖNEM ETKİSİ — fire ile sayım farkı AYRI sayılıyor mu, maliyeti
 *     bilinmeyen hareket sıfır sayılmıyor mu.
 *  3) RAPORA ETKİSİ — düzeltme GERÇEK NET'ten düşüyor ama NET-2'ye
 *     KARIŞMIYOR mu. Bu, kararın kendisidir: düzeltme bir satış değildir.
 * ============================================================================
 */

import { gunDegeri, pencereOlustur } from "../src/lib/donem";
import { raporHesapla } from "../src/lib/rapor";
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

console.log("\n" + "=".repeat(70));
if (basarisiz === 0) console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
