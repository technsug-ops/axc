import { gunDegeri, pencereOlustur } from "../src/lib/donem";
import {
  gorunumCoz,
  operasyonSerisi,
  operasyonToplami,
  serileriKur,
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
  kontrol("ilk gün 07.08", seri[0]?.gun === "2026-08-07", seri[0]?.gun);
  kontrol("son gün 21.08 (BUGÜN DAHİL)", seri.at(-1)?.gun === "2026-08-21", seri.at(-1)?.gun);
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
    alimlar: [{ tarih: g("2026-08-18"), tutar: 1000 }],
    satislar: [{ tarih: g("2026-08-19"), gelir: 500 }],
    kargolar: [{ tarih: g("2026-08-21"), gelir: 500 }],
  });
  const bul = (gun: string) => seri.find((n) => n.gun === gun);

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
    alimlar: [
      { tarih: g("2026-08-20"), tutar: 300 },
      { tarih: g("2026-08-20"), tutar: 700 },
    ],
    satislar: [],
    kargolar: [],
  });
  const n = seri.find((x) => x.gun === "2026-08-20");
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
    alimlar: [{ tarih: g("2026-08-21"), tutar: 1000 }],
    satislar: [{ tarih: g("2026-08-21"), gelir: 2000 }],
    kargolar: [{ tarih: g("2026-08-21"), gelir: 3000 }],
  });

  const adet = serileriKur(seri, "adet");
  kontrol(
    "adet görünümü ADET veriyor",
    adet.alim[0] === 1 && adet.satis[0] === 1 && adet.kargo[0] === 1,
    adet,
  );

  const ciro = serileriKur(seri, "ciro");
  kontrol(
    "ciro görünümü TUTAR veriyor",
    ciro.alim[0] === 1000 && ciro.satis[0] === 2000 && ciro.kargo[0] === 3000,
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
  kontrol("kargo toplamı 1 kayıt / 50", t.kargoAdet === 1 && t.kargoCiro === 50, t);
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
