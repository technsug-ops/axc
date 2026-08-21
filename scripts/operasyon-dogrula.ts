import { gunDegeri, pencereOlustur } from "../src/lib/donem";
import {
  gorunumCoz,
  kirilimSec,
  operasyonSerisi,
  operasyonToplami,
  serileriKur,
  TABLO_TAVANI,
  tabloNoktalari,
} from "../src/lib/panel/operasyon-serisi";

/**
 * ============================================================================
 *  GÜNLÜK OPERASYON SERİSİ — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run operasyon:dogrula
 *
 *  Korunan sözler:
 *    1. Pencerenin HER günü nokta üretir (açık sıfır) — hareketsiz gün
 *       atlanmaz, yoksa grafikte iki gün yan yana çizilir.
 *    2. ÜÇ AYRI TARİH EKSENİ. Alım/satış/kargo kendi tarihiyle kovaya girer;
 *       dün satılıp bugün kargolanan paket BUGÜNE yazılır. (15.08.2026'da
 *       ters yaşandı: kullanıcı 6 paket kargoladı, panel "2" dedi.)
 *    3. Görünüm seçimi TEK YERDEN — "adet sekmesinde ciro çizen" hata
 *       doğmasın.
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

/** Sabit "şu an": 21 Ağustos 2026. Testler takvimden bağımsız. */
const AN = new Date("2026-08-21T09:00:00Z");
const g = (metin: string) => gunDegeri({
  yil: Number(metin.slice(0, 4)),
  ay: Number(metin.slice(5, 7)),
  gun: Number(metin.slice(8, 10)),
});

console.log("\nGÜNLÜK OPERASYON SERİSİ\n");

// ===========================================================================
console.log("1) AÇIK SIFIR — her gün nokta üretir");
// ===========================================================================
{
  const pencere = pencereOlustur("SON_15_GUN", AN);
  const seri = operasyonSerisi({
    pencere,
    kirilim: "GUN",
    alimlar: [],
    satislar: [],
    kargolar: [],
  });
  kontrol("15 günlük pencere 15 nokta verir", seri.length === 15, seri.length);
  kontrol(
    "hareketsiz gün ATLANMIYOR, sıfırla duruyor",
    seri.every(
      (n) => n.alimAdet === 0 && n.satisAdet === 0 && n.kargoAdet === 0,
    ),
  );
  kontrol("ilk gün 07.08", seri[0]?.anahtar === "2026-08-07", seri[0]?.anahtar);
  kontrol("son gün 21.08 (BUGÜN DAHİL)", seri.at(-1)?.anahtar === "2026-08-21", seri.at(-1)?.anahtar);
}

// ===========================================================================
console.log("\n2) ÜÇ AYRI TARİH EKSENİ — aynı güne yazılmaz");
// ===========================================================================
{
  const pencere = pencereOlustur("SON_15_GUN", AN);
  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR: satış 19'unda, kargo
   * 21'inde. Aynı güne konsaydı "hepsini satış tarihine yaz" mutasyonu
   * yeşil kalırdı — tam da 15.08.2026'da yaşanan hata.
   */
  const seri = operasyonSerisi({
    pencere,
    kirilim: "GUN",
    alimlar: [{ tarih: g("2026-08-18"), tutar: 1000 }],
    satislar: [{ tarih: g("2026-08-19"), gelir: 500 }],
    kargolar: [{ tarih: g("2026-08-21"), gelir: 500 }],
  });
  const bul = (gun: string) => seri.find((n) => n.anahtar === gun);

  kontrol(
    "alım 18'ine yazıldı",
    bul("2026-08-18")?.alimAdet === 1 && bul("2026-08-18")?.alimTutar === 1000,
    bul("2026-08-18"),
  );
  kontrol(
    "satış 19'una yazıldı, 18'e DEĞİL",
    bul("2026-08-19")?.satisAdet === 1 && bul("2026-08-18")?.satisAdet === 0,
    { on9: bul("2026-08-19")?.satisAdet, on8: bul("2026-08-18")?.satisAdet },
  );
  kontrol(
    "kargo 21'ine yazıldı, satışın günü olan 19'a DEĞİL",
    bul("2026-08-21")?.kargoAdet === 1 && bul("2026-08-19")?.kargoAdet === 0,
    { yirmi1: bul("2026-08-21")?.kargoAdet, on9: bul("2026-08-19")?.kargoAdet },
  );
  kontrol(
    "üç kalem ÜÇ AYRI güne düştü",
    new Set([
      seri.findIndex((n) => n.alimAdet > 0),
      seri.findIndex((n) => n.satisAdet > 0),
      seri.findIndex((n) => n.kargoAdet > 0),
    ]).size === 3,
  );
}

// ===========================================================================
console.log("\n3) AYNI GÜNDE BİRDEN ÇOK KAYIT TOPLANIR");
// ===========================================================================
{
  const pencere = pencereOlustur("SON_15_GUN", AN);
  const seri = operasyonSerisi({
    pencere,
    kirilim: "GUN",
    alimlar: [
      { tarih: g("2026-08-20"), tutar: 300 },
      { tarih: g("2026-08-20"), tutar: 700 },
    ],
    satislar: [],
    kargolar: [],
  });
  const n = seri.find((x) => x.anahtar === "2026-08-20");
  kontrol("iki alım tek güne toplandı", n?.alimAdet === 2, n?.alimAdet);
  /** ⚠ Tutarlar da toplanmalı — yalnız adet sayılsaydı bu yeşil kalırdı. */
  kontrol("tutarlar da toplandı", n?.alimTutar === 1000, n?.alimTutar);
}

// ===========================================================================
console.log("\n4) PENCERE DIŞI KAYIT SERİYİ KAYDIRMAZ");
// ===========================================================================
{
  const pencere = pencereOlustur("SON_15_GUN", AN);
  const seri = operasyonSerisi({
    pencere,
    kirilim: "GUN",
    alimlar: [
      { tarih: g("2026-07-01"), tutar: 999 },
      { tarih: g("2026-08-20"), tutar: 100 },
    ],
    satislar: [],
    kargolar: [],
  });
  kontrol("nokta sayısı değişmedi", seri.length === 15, seri.length);
  kontrol(
    "pencere dışı alım hiçbir güne yazılmadı",
    operasyonToplami(seri).alimTutar === 100,
    operasyonToplami(seri).alimTutar,
  );
}

// ===========================================================================
console.log("\n5) GÖRÜNÜM SEÇİMİ — adet ile ciro AYRIŞIR");
// ===========================================================================
{
  const pencere = pencereOlustur("BUGUN", AN);
  /**
   * ⚠ ADET İLE TUTAR FARKLI SEÇİLDİ (1 ve 1000). Eşit olsalardı "adet
   * sekmesinde ciro çiz" mutasyonu yeşil kalırdı.
   */
  const seri = operasyonSerisi({
    pencere,
    kirilim: "GUN",
    alimlar: [{ tarih: g("2026-08-21"), tutar: 1000 }],
    satislar: [{ tarih: g("2026-08-21"), gelir: 2000 }],
    kargolar: [{ tarih: g("2026-08-21"), gelir: 3000 }],
  });

  const adet = serileriKur(seri, "adet");
  kontrol(
    "adet görünümü ADET veriyor",
    adet.alim[0] === 1 && adet.satis[0] === 1 && adet.ucuncu[0] === 1,
    adet,
  );

  const ciro = serileriKur(seri, "ciro");
  kontrol(
    "ciro görünümü TUTAR veriyor",
    ciro.alim[0] === 1000 && ciro.satis[0] === 2000 && ciro.ucuncu[0] === 1000,
    ciro,
  );
  kontrol(
    "iki görünüm AYNI değil",
    JSON.stringify(adet) !== JSON.stringify(ciro),
  );

  kontrol("varsayılan görünüm adet", gorunumCoz(undefined) === "adet");
  kontrol("geçersiz değer adete düşer", gorunumCoz("uydurma") === "adet");
  kontrol("ciro tanınır", gorunumCoz("ciro") === "ciro");
}

// ===========================================================================
console.log("\n6) TOPLAM — grafiğin altındaki rakam (İlke #15)");
// ===========================================================================
{
  const pencere = pencereOlustur("SON_15_GUN", AN);
  const seri = operasyonSerisi({
    pencere,
    kirilim: "GUN",
    alimlar: [
      { tarih: g("2026-08-18"), tutar: 100 },
      { tarih: g("2026-08-19"), tutar: 200 },
    ],
    satislar: [{ tarih: g("2026-08-19"), gelir: 50 }],
    kargolar: [{ tarih: g("2026-08-20"), gelir: 50 }],
  });
  const t = operasyonToplami(seri);
  kontrol("alım toplamı 2 kayıt / 300", t.alimAdet === 2 && t.alimTutar === 300, t);
  kontrol("satış toplamı 1 kayıt / 50", t.satisAdet === 1 && t.satisCiro === 50, t);
  kontrol("kargo toplamı 1 kayıt", t.kargoAdet === 1, t);
}

// ===========================================================================
console.log("\n7) KIRILIM — uzun pencerede gün gün çizilmez");
// ===========================================================================
{
  /** Kullanıcının verdiği eşleme, birebir. */
  kontrol("Son 30 gün → GÜN", kirilimSec("SON_30_GUN", 30) === "GUN");
  kontrol("Bu ay → HAFTA", kirilimSec("BU_AY", 21) === "HAFTA");
  kontrol("Son 3 ay → AY", kirilimSec("SON_3_AY", 92) === "AY");
  kontrol("Son 6 ay → AY", kirilimSec("SON_6_AY", 183) === "AY");
  kontrol("Son 1 yıl → AY", kirilimSec("SON_1_YIL", 365) === "AY");
  kontrol("Dün → GÜN", kirilimSec("DUN", 1) === "GUN");
  /**
   * ⚠ ÖZEL ARALIK TÜRDEN ÇÖZÜLEMEZ: "OZEL" bir gün de olabilir üç yıl da.
   * Uzunluğa bakılıyor; iki yaka da sınanıyor.
   */
  kontrol("Özel 10 gün → GÜN", kirilimSec("OZEL", 10) === "GUN");
  kontrol("Özel 60 gün → HAFTA", kirilimSec("OZEL", 60) === "HAFTA");
  kontrol("Özel 400 gün → AY", kirilimSec("OZEL", 400) === "AY");

  /** AY kırılımında 1 yıllık pencere 365 değil ~12 nokta verir. */
  const yil = operasyonSerisi({
    pencere: pencereOlustur("SON_1_YIL", AN),
    kirilim: "AY",
    alimlar: [],
    satislar: [],
    kargolar: [],
  });
  kontrol("1 yıl AY kırılımında 12 nokta", yil.length === 12, yil.length);

  /**
   * ⚠ İLK KOVA PENCEREYE KIRPILIR. "Bu ay" 1 Ağustos'ta başlıyor ama o
   * haftanın pazartesisi 27 Temmuz. Nokta 27 Temmuz'dan başlasaydı ona
   * tıklayınca PENCERE DIŞINA süzülmüş liste açılır ve grafikteki sayı ile
   * listenin sayısı tutmazdı.
   */
  const buAy = pencereOlustur("BU_AY", AN);
  const haftalar = operasyonSerisi({
    pencere: buAy,
    kirilim: "HAFTA",
    alimlar: [],
    satislar: [],
    kargolar: [],
  });
  kontrol(
    "ilk hafta kovası pencerenin başına KIRPILDI",
    haftalar[0]!.baslangic.getTime() === buAy.baslangic.getTime(),
    haftalar[0]!.baslangic.toISOString().slice(0, 10),
  );
  kontrol(
    "son kova pencerenin sonunu AŞMIYOR",
    haftalar.at(-1)!.sonGun.getTime() === buAy.sonGun.getTime(),
    haftalar.at(-1)!.sonGun.toISOString().slice(0, 10),
  );

  /** Haftalık kovada aynı haftanın iki günü TEK noktaya toplanır. */
  const toplanan = operasyonSerisi({
    pencere: buAy,
    kirilim: "HAFTA",
    alimlar: [
      { tarih: g("2026-08-17"), tutar: 100 },
      { tarih: g("2026-08-19"), tutar: 200 },
    ],
    satislar: [],
    kargolar: [],
  });
  const dolu = toplanan.filter((n) => n.alimAdet > 0);
  kontrol(
    "aynı haftanın iki günü TEK noktada",
    dolu.length === 1 && dolu[0]!.alimAdet === 2 && dolu[0]!.alimTutar === 300,
    dolu,
  );
}

// ===========================================================================
console.log("\n8) CİRO ÜÇÜNCÜ SERİ = FARK (kargo DEĞİL)");
// ===========================================================================
{
  const seri = operasyonSerisi({
    pencere: pencereOlustur("BUGUN", AN),
    kirilim: "GUN",
    /** ⚠ Kargo cirosu BİLEREK farklı (9999): fark yerine kargo çizilirse yakalansın. */
    alimlar: [{ tarih: g("2026-08-21"), tutar: 400 }],
    satislar: [{ tarih: g("2026-08-21"), gelir: 1000 }],
    kargolar: [{ tarih: g("2026-08-21"), gelir: 9999 }],
  });
  const ciro = serileriKur(seri, "ciro");
  kontrol("ciro 3. serisi SATIŞ − ALIM", ciro.ucuncu[0] === 600, ciro.ucuncu[0]);
  kontrol("ciro 3. serisi kargo cirosu DEĞİL", ciro.ucuncu[0] !== 9999);

  const t = operasyonToplami(seri);
  kontrol("toplam fark = satış − alım", t.fark === 600, t.fark);
  kontrol(
    "işlem adedi üç kalemin toplamı",
    t.islemAdedi === t.alimAdet + t.satisAdet + t.kargoAdet && t.islemAdedi === 3,
    t.islemAdedi,
  );
  /** ⚠ Fark NEGATİF de olabilir — alım satıştan büyükse para dışarı çıkmış. */
  const eksi = operasyonToplami(
    operasyonSerisi({
      pencere: pencereOlustur("BUGUN", AN),
      kirilim: "GUN",
      alimlar: [{ tarih: g("2026-08-21"), tutar: 1000 }],
      satislar: [],
      kargolar: [],
    }),
  );
  kontrol("alım büyükse fark NEGATİF", eksi.fark === -1000, eksi.fark);
}

// ===========================================================================
console.log("\n9) TABLO TAVANI — özet ekranda döküm olmaz (İlke #13)");
// ===========================================================================
{
  const uzun = operasyonSerisi({
    pencere: pencereOlustur("SON_30_GUN", AN),
    kirilim: "GUN",
    alimlar: [],
    satislar: [],
    kargolar: [],
  });
  const { gosterilen, gizlenen } = tabloNoktalari(uzun);
  kontrol("30 noktada tablo 15'te kesiliyor", gosterilen.length === TABLO_TAVANI);
  kontrol("gizlenen sayısı beyan ediliyor", gizlenen === uzun.length - TABLO_TAVANI, gizlenen);
  /**
   * ⚠ SONDAN KIRPILIYOR: kırpılan taraf ESKİ olmalı. Baştan alsaydık
   * kullanıcı dünü göremezdi ve tablo işe yaramazdı.
   */
  kontrol(
    "kırpma SONDAN — en yeni nokta tabloda",
    gosterilen.at(-1)!.anahtar === uzun.at(-1)!.anahtar,
  );
  kontrol(
    "  ...ve en eski nokta tabloda DEĞİL",
    gosterilen[0]!.anahtar !== uzun[0]!.anahtar,
  );

  const kisa = operasyonSerisi({
    pencere: pencereOlustur("SON_15_GUN", AN),
    kirilim: "GUN",
    alimlar: [],
    satislar: [],
    kargolar: [],
  });
  const k = tabloNoktalari(kisa);
  kontrol("15 nokta TAM gösteriliyor, gizlenen yok", k.gosterilen.length === 15 && k.gizlenen === 0);
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
