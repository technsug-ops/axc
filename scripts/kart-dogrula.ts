/**
 * ============================================================================
 *  KART BORCU DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run kart:dogrula
 *
 *  Veritabanına GİTMEZ. Dört bölüm:
 *  1) TAKVİM — kesim günü 31 olan kartta şubat, yıl sınırı, kesim gününde
 *     yapılan alım.
 *  2) SON ÖDEME — son ödeme günü kesimden küçükse ertesi aya sarkar.
 *  3) TAKSİT — bölünmeyen kuruş kaybolmaz; toplam her zaman tam tutardır.
 *  4) EKSTRE — alımların doğru aylara dağılması, bekleyen borç, kalan limit,
 *     kesim günü tanımsızsa SESSİZ SIFIR göstermeme.
 * ============================================================================
 */

import {
  ayinGununuKirp,
  ekstreKesimi,
  kartBorcuHesapla,
  sonOdemeTarihi,
  taksitlereBol,
  type BorcAlimi,
} from "../src/lib/kart-borcu";

let basarisiz = 0;
let calisan = 0;
const BOLUM_SAYISI = 4;
const kosanBolumler: string[] = [];

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

const gun = (metin: string) => new Date(`${metin}T00:00:00.000Z`);
const metin = (t: Date) => t.toISOString().slice(0, 10);

// ===========================================================================
console.log("\n1) TAKVİM — alım hangi ekstreye düşer?");
// ===========================================================================
{
  // Kesim 15: ayın 10'unda alınan bu aya, 20'sinde alınan gelecek aya.
  kontrol(
    "10.08 alım, kesim 15 -> 15.08 ekstresi",
    metin(ekstreKesimi(gun("2026-08-10"), 15)) === "2026-08-15",
  );
  kontrol(
    "20.08 alım, kesim 15 -> 15.09 ekstresi",
    metin(ekstreKesimi(gun("2026-08-20"), 15)) === "2026-09-15",
  );
  // YORUM KARARI: kesim GÜNÜNDE yapılan alım o ayın ekstresine düşer.
  kontrol(
    "15.08 alım (tam kesim günü) -> 15.08 ekstresi",
    metin(ekstreKesimi(gun("2026-08-15"), 15)) === "2026-08-15",
  );

  // YIL SINIRI
  kontrol(
    "25.12 alım, kesim 15 -> 15.01 (yıl döner)",
    metin(ekstreKesimi(gun("2026-12-25"), 15)) === "2027-01-15",
  );

  // AYIN ÇEKMEDİĞİ GÜN — kesim 31, şubat 28 çekiyor
  kontrol(
    "kesim 31, şubat -> 28 Şubat",
    JSON.stringify(ayinGununuKirp(2026, 2, 31)) === '{"yil":2026,"ay":2,"gun":28}',
    ayinGununuKirp(2026, 2, 31),
  );
  kontrol(
    "kesim 31, nisan -> 30 Nisan",
    JSON.stringify(ayinGununuKirp(2026, 4, 31)) === '{"yil":2026,"ay":4,"gun":30}',
  );
  kontrol(
    "kesim 31, artık yıl şubatı -> 29 Şubat",
    JSON.stringify(ayinGununuKirp(2028, 2, 31)) === '{"yil":2028,"ay":2,"gun":29}',
  );
  kontrol(
    "20.02 alım, kesim 31 -> 28.02 ekstresi",
    metin(ekstreKesimi(gun("2026-02-20"), 31)) === "2026-02-28",
  );
  kosanBolumler.push("takvim");
}

// ===========================================================================
console.log("\n2) SON ÖDEME GÜNÜ");
// ===========================================================================
{
  kontrol(
    "kesim 15.08, son ödeme günü 25 -> 25.08",
    metin(sonOdemeTarihi(gun("2026-08-15"), 25)) === "2026-08-25",
  );
  // Son ödeme günü kesimden KÜÇÜKSE ertesi aya sarkar.
  kontrol(
    "kesim 25.08, son ödeme günü 5 -> 05.09",
    metin(sonOdemeTarihi(gun("2026-08-25"), 5)) === "2026-09-05",
  );
  kontrol(
    "kesim 25.12, son ödeme günü 5 -> 05.01 (yıl döner)",
    metin(sonOdemeTarihi(gun("2026-12-25"), 5)) === "2027-01-05",
  );
  kontrol(
    "kesim 31.01, son ödeme günü 31 -> 28.02 (şubat kırpılır)",
    metin(sonOdemeTarihi(gun("2026-01-31"), 31)) === "2026-02-28",
  );
  kosanBolumler.push("son odeme");
}

// ===========================================================================
console.log("\n3) TAKSİT BÖLME — kuruş kaybolmaz");
// ===========================================================================
{
  const uce = taksitlereBol(1000, 3);
  kontrol(
    `1000 / 3 = ${uce.join(" + ")}`,
    uce.length === 3 && uce[0] === 333.33 && uce[2] === 333.34,
    uce,
  );
  kontrol(
    "toplam tam tutarı verir",
    Math.abs(uce.reduce((t, p) => t + p, 0) - 1000) < 0.0001,
  );

  const tek = taksitlereBol(1565, 1);
  kontrol("tek çekim tek taksit", tek.length === 1 && tek[0] === 1565);

  const alti = taksitlereBol(100, 6);
  kontrol(
    `100 / 6 son taksit farkı yutar (${alti[0]} ... ${alti[5]})`,
    Math.abs(alti.reduce((t, p) => t + p, 0) - 100) < 0.0001 &&
      alti[5] > alti[0],
    alti,
  );

  kontrol(
    "taksit sayısı 0 verilse bile tek taksit üretir",
    taksitlereBol(500, 0).length === 1,
  );
  kosanBolumler.push("taksit");
}

// ===========================================================================
console.log("\n4) EKSTRE DAĞILIMI");
// ===========================================================================
{
  const KART = { kesimGunu: 15, sonOdemeGunu: 25, limit: 300000 };
  const BUGUN = gun("2026-08-10");

  const alimlar: BorcAlimi[] = [
    // Kesimden ÖNCE, tek çekim -> 15.08 ekstresi
    { id: "a1", kod: "ALM-1", tarih: gun("2026-08-05"), tutar: 1000, taksitSayisi: 1 },
    // Kesimden SONRA, tek çekim -> 15.09 ekstresi
    { id: "a2", kod: "ALM-2", tarih: gun("2026-08-20"), tutar: 500, taksitSayisi: 1 },
    // 3 taksit, kesimden önce -> 15.08 / 15.09 / 15.10
    { id: "a3", kod: "ALM-3", tarih: gun("2026-08-01"), tutar: 3000, taksitSayisi: 3 },
  ];

  const sonuc = kartBorcuHesapla(alimlar, KART, BUGUN, []);

  kontrol("hesaplanabilir", sonuc.hesaplanabilir);
  kontrol(
    `3 ekstre oluştu (${sonuc.ekstreler.map((e) => metin(e.kesimTarihi)).join(", ")})`,
    sonuc.ekstreler.length === 3,
    sonuc.ekstreler.map((e) => metin(e.kesimTarihi)),
  );

  const [agustos, eylul, ekim] = sonuc.ekstreler;
  kontrol("ilk ekstre 15.08", metin(agustos.kesimTarihi) === "2026-08-15");
  kontrol("son ödeme 25.08", metin(agustos.sonOdemeTarihi!) === "2026-08-25");
  kontrol(
    `15.08 toplamı 2000 (1000 + 1000 taksit)`,
    Math.abs(agustos.toplam - 2000) < 0.005,
    agustos.toplam,
  );
  kontrol(
    `15.09 toplamı 1500 (500 + 1000 taksit)`,
    Math.abs(eylul.toplam - 1500) < 0.005,
    eylul.toplam,
  );
  kontrol(
    `15.10 toplamı 1000 (yalnız son taksit)`,
    Math.abs(ekim.toplam - 1000) < 0.005,
    ekim.toplam,
  );

  kontrol(
    "taksit sırası kaydedilir (1/3, 2/3, 3/3)",
    agustos.taksitler.find((t) => t.alimId === "a3")?.sira === 1 &&
      eylul.taksitler.find((t) => t.alimId === "a3")?.sira === 2 &&
      ekim.taksitler.find((t) => t.alimId === "a3")?.sira === 3,
  );

  // 10 Ağustos'ta duruyoruz: 15.08 ekstresi HENÜZ kesilmedi.
  kontrol("15.08 ekstresi henüz geçmemiş", agustos.gecmisMi === false);
  kontrol(
    "bekleyen toplam = 4500 (hepsi gelecekte)",
    Math.abs(sonuc.bekleyenToplam - 4500) < 0.005,
    sonuc.bekleyenToplam,
  );
  kontrol(
    "kalan limit = 295.500",
    Math.abs((sonuc.kalanLimit ?? 0) - 295500) < 0.005,
    sonuc.kalanLimit,
  );

  /**
   * ════════════════════════════════════════════════════════════════════
   *  GEÇMİŞ EKSTRE ARTIK KAYBOLMUYOR (16.08.2026)
   * --------------------------------------------------------------------
   *  Bu testin eski hâli varsayımı DOĞRULUYORDU: "01.09'da bekleyen
   *  2500'e düşer" diyordu ve ₺2.000'lik Ağustos ekstresi hiçbir toplamda
   *  görünmediği hâlde test yeşildi. Ödenip ödenmediği hiç sorulmuyordu.
   *
   *  Yeni kural: ödeme kaydı yoksa o borç KAYBOLMAZ, gecikmiş olur.
   *  Ödeme kaydı varsa hiçbir yerde toplanmaz. Aradaki fark artık
   *  ölçülüyor.
   * ════════════════════════════════════════════════════════════════════
   */
  const sonrasi = kartBorcuHesapla(alimlar, KART, gun("2026-09-01"), []);
  kontrol(
    "01.09'da 15.08 ekstresi GEÇMİŞ sayılır",
    sonrasi.ekstreler[0]?.gecmisMi === true,
  );
  kontrol(
    "bekleyen (gelecek) 2500",
    Math.abs(sonrasi.bekleyenToplam - 2500) < 0.005,
    sonrasi.bekleyenToplam,
  );
  kontrol(
    "ÖDENMEMİŞ geçmiş ekstre GECİKMİŞ olur, kaybolmaz",
    Math.abs(sonrasi.gecikmisToplam - 2000) < 0.005,
    sonrasi.gecikmisToplam,
  );
  kontrol(
    "açık toplam = gecikmiş + bekleyen",
    Math.abs(sonrasi.acikToplam - 4500) < 0.005,
    sonrasi.acikToplam,
  );

  // Aynı an, ama Ağustos ekstresi ÖDENMİŞ kaydıyla.
  const odenmis = kartBorcuHesapla(alimlar, KART, gun("2026-09-01"), [
    { donem: gun("2026-08-01"), odenenAnaBorc: 2000 },
  ]);
  kontrol("ödenen geçmiş ekstre gecikmişe girmez", odenmis.gecikmisToplam === 0);
  kontrol(
    "  ...ekstrenin kalanı sıfırlanır",
    odenmis.ekstreler[0]?.kalan === 0,
    odenmis.ekstreler[0]?.kalan,
  );
  kontrol(
    "  ...açık toplam yalnız geleceği gösterir",
    Math.abs(odenmis.acikToplam - 2500) < 0.005,
    odenmis.acikToplam,
  );

  // Kısmi ödeme: kalan kadarı gecikmiş sayılır, tamamı değil.
  const kismi = kartBorcuHesapla(alimlar, KART, gun("2026-09-01"), [
    { donem: gun("2026-08-20"), odenenAnaBorc: 800 },
  ]);
  kontrol(
    "kısmi ödemede yalnız KALAN gecikmiş sayılır",
    Math.abs(kismi.gecikmisToplam - 1200) < 0.005,
    kismi.gecikmisToplam,
  );
  kontrol(
    "  ...ödeme ayın herhangi bir gününde olabilir (eşleme yıl-ay)",
    Math.abs((kismi.ekstreler[0]?.odenen ?? 0) - 800) < 0.005,
  );

  // Aynı ekstreye birden çok ödeme toplanır; ters kayıt negatif olarak girer.
  const cokluOdeme = kartBorcuHesapla(alimlar, KART, gun("2026-09-01"), [
    { donem: gun("2026-08-01"), odenenAnaBorc: 1500 },
    { donem: gun("2026-08-01"), odenenAnaBorc: 800 },
    { donem: gun("2026-08-01"), odenenAnaBorc: -800 },
  ]);
  kontrol(
    "aynı döneme çok ödeme toplanır, ters kayıt düşer",
    Math.abs((cokluOdeme.ekstreler[0]?.odenen ?? 0) - 1500) < 0.005,
    cokluOdeme.ekstreler[0]?.odenen,
  );
  kontrol(
    "  ...kalan 500 gecikmiş",
    Math.abs(cokluOdeme.gecikmisToplam - 500) < 0.005,
    cokluOdeme.gecikmisToplam,
  );

  // Fazla ödeme kalanı EKSİYE indirmez — başka ekstreyi kapatmaz.
  const fazla = kartBorcuHesapla(alimlar, KART, gun("2026-09-01"), [
    { donem: gun("2026-08-01"), odenenAnaBorc: 5000 },
  ]);
  kontrol("fazla ödemede kalan eksiye inmez", fazla.ekstreler[0]?.kalan === 0);
  kontrol(
    "  ...fazlalık sonraki ekstreyi kapatmaz",
    Math.abs(fazla.bekleyenToplam - 2500) < 0.005,
    fazla.bekleyenToplam,
  );

  // Başka kartın/dönemin ödemesi bu ekstreyi kapatmaz.
  const yanlisDonem = kartBorcuHesapla(alimlar, KART, gun("2026-09-01"), [
    { donem: gun("2026-06-01"), odenenAnaBorc: 2000 },
  ]);
  kontrol(
    "başka dönemin ödemesi bu ekstreyi kapatmaz",
    Math.abs(yanlisDonem.gecikmisToplam - 2000) < 0.005,
    yanlisDonem.gecikmisToplam,
  );

  // Kesim günü tanımsız kart: SESSİZ SIFIR YOK.
  const eksikKart = kartBorcuHesapla(alimlar, {
    kesimGunu: null,
    sonOdemeGunu: null,
    limit: 300000,
  }, BUGUN, []);
  kontrol("kesim günü yoksa hesaplanamaz", eksikKart.hesaplanabilir === false);
  kontrol("hesaplanamayan kartta ekstre üretilmez", eksikKart.ekstreler.length === 0);

  // Limit tanımsızsa kalan limit null — sıfır değil.
  const limitsiz = kartBorcuHesapla(alimlar, {
    kesimGunu: 15,
    sonOdemeGunu: 25,
    limit: null,
  }, BUGUN, []);
  kontrol("limit yoksa kalan limit null", limitsiz.kalanLimit === null);

  // Alım yoksa borç yok ama kart hesaplanabilir.
  const bos = kartBorcuHesapla([], KART, BUGUN, []);
  kontrol("alım yoksa ekstre yok", bos.ekstreler.length === 0);
  kontrol("alım yoksa bekleyen 0", bos.bekleyenToplam === 0);
  kontrol("alım yoksa limit tam", bos.kalanLimit === 300000);
  kosanBolumler.push("ekstre");
}

// ===========================================================================
console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`,
  );
  process.exit(1);
} else if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
