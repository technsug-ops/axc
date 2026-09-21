/**
 * ============================================================================
 *  KANAL LİSTELEME SAĞLIĞI BEKÇİSİ — K224 (21.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run kanal-listeleme:dogrula
 *
 *  ⛔ KAYNAK TARAMAZ — GÖVDEYİ ÇAĞIRIR. Davranış saf bir gövdeye taşındığı
 *  için desen araması gerekmiyor (anayasa: "saf hesap katmanı, desen tarayan
 *  bekçiye muhtaç olmaz"). Bu, deponun en sık tekrarlayan hata sınıfını bu
 *  katmanda YAPISAL OLARAK imkânsız yapar.
 *
 *  NE KORUYOR:
 *   ① "Kapalı duran" ölçütü İKİ ŞARTI birden ister (stok VAR **ve** kanalda
 *     kapalı). Tek şarta düşerse kova yanlış dolar.
 *   ② ÖLÇÜLMEMİŞ satır kapalı SAYILMAZ — bakmadığımız şey hakkında iddia
 *     kurulmaz; ve "ölçülmedi" ile "temiz" AYRI sayılır.
 *   ③ Fiyatı olmayan satır SAYILIR ama tutara GİRMEZ (adet tam, tutar alt
 *     sınır) — uydurma fiyatla çarpmak da, satırı düşürmek de yanlış olurdu.
 *   ④ Bayatlık eşiği ve ölçüm yaşı — şemanın kendi şartı.
 * ============================================================================
 */
import {
  BAYAT_ESIGI_GUN,
  bayatMi,
  kapaliDuranMi,
  olcumYasiGun,
  saglikOzeti,
  type ListelemeSatiri,
} from "../src/lib/kanal-listeleme-saglik";

let kalan = 0;
let gecen = 0;
const BOLUM_SAYISI = 4;
const kosanBolumler: string[] = [];

function kontrol(ad: string, kosul: boolean, gorulen?: unknown) {
  if (kosul) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}${gorulen === undefined ? "" : ` — ${JSON.stringify(gorulen)}`}`);
  }
}

const GUN = 86_400_000;
const SIMDI = new Date("2026-09-21T09:00:00.000Z");
const DUN = new Date(SIMDI.getTime() - GUN);
const ESKI = new Date(SIMDI.getTime() - 14 * GUN);

function satir(o: Partial<ListelemeSatiri>): ListelemeSatiri {
  return {
    durum: "ACIK",
    kanalAdet: 1,
    olcumAt: DUN,
    stok: 0,
    fiyat: 100,
    ...o,
  };
}

// ===========================================================================
console.log("\n1) KAPALI DURAN ÖLÇÜTÜ — İKİ ŞART BİRDEN");
// ===========================================================================
{
  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİR: dört kombinasyon da var.
   * Tek şarta bakan bir mutasyon bunlardan en az birinde kırmızı yanar.
   */
  kontrol(
    "stok VAR + kanalda KAPALI → kapalı duran",
    kapaliDuranMi(satir({ stok: 3, durum: "PASIF" })),
  );
  kontrol(
    "stok VAR + kanalda AÇIK → kapalı duran DEĞİL",
    !kapaliDuranMi(satir({ stok: 3, durum: "ACIK" })),
  );
  kontrol(
    "stok YOK + kanalda KAPALI → kapalı duran DEĞİL (satılacak mal yok)",
    !kapaliDuranMi(satir({ stok: 0, durum: "PASIF" })),
  );
  kontrol(
    "stok YOK + kanalda AÇIK → kapalı duran DEĞİL",
    !kapaliDuranMi(satir({ stok: 0, durum: "ACIK" })),
  );
  /** Kanalın "stoksuz" dediği ama BİZDE stok olan hâl — asıl vaka budur. */
  kontrol(
    "kanal STOKSUZ diyor ama bizde stok VAR → kapalı duran (asıl vaka)",
    kapaliDuranMi(satir({ stok: 2, durum: "STOKSUZ" })),
  );
  kontrol(
    "kanalda hiç listelenmemiş + stok var → kapalı duran",
    kapaliDuranMi(satir({ stok: 1, durum: "YOK" })),
  );
  kosanBolumler.push("olcut");
}

// ===========================================================================
console.log("\n2) ÖLÇÜLMEMİŞ SATIR — HÜKÜM YOK");
// ===========================================================================
{
  kontrol(
    "olcumAt boş → stok olsa bile kapalı SAYILMAZ (bakmadık)",
    !kapaliDuranMi(satir({ stok: 5, durum: "PASIF", olcumAt: null })),
  );
  kontrol(
    "durum BILINMIYOR → kapalı SAYILMAZ (bilgisizlik durum değildir)",
    !kapaliDuranMi(satir({ stok: 5, durum: "BILINMIYOR" })),
  );

  const o = saglikOzeti([
    satir({ olcumAt: null, durum: "BILINMIYOR", stok: 5 }),
    satir({ olcumAt: null, durum: "BILINMIYOR", stok: 0 }),
    satir({ durum: "ACIK", stok: 1 }),
  ]);
  kontrol("ölçülmemiş AYRI sayılır", o.olculmemis === 2, o.olculmemis);
  kontrol("  ...ve kapalı kovasına GİRMEZ", o.kapaliDuran === 0, o.kapaliDuran);
  kontrol("  ...ölçülmüş satır sayılmaya devam eder", o.acik === 1, o.acik);
  kosanBolumler.push("olculmemis");
}

// ===========================================================================
console.log("\n3) TUTAR — FİYATSIZ SATIR SAYILIR, TOPLAMA GİRMEZ");
// ===========================================================================
{
  const o = saglikOzeti([
    satir({ stok: 2, durum: "PASIF", fiyat: 1000 }),
    satir({ stok: 3, durum: "STOKSUZ", fiyat: null }),
  ]);
  kontrol("iki satır da kapalı duran sayılır", o.kapaliDuran === 2, o.kapaliDuran);
  kontrol(
    "tutar YALNIZ fiyatı olandan (2 × 1000 = 2000)",
    o.kapaliDuranTutar === 2000,
    o.kapaliDuranTutar,
  );
  /**
   * ⛔ TOPLAMIN KAPSAMI AYRICA SAYILIR — TOPLAM BİR ALT SINIRDIR.
   *
   * ⚠ MUTASYON NOTU (ölçüldü 21.09.2026): `if (fiyat !== null) topla` yerine
   * `topla(stok * (fiyat ?? 0))` yazan mutasyon YEŞİL KALIR ve bu DOĞRUDUR —
   * `stok × 0` eklemek ile eklememek matematiksel olarak AYNI. Bu bir
   * EŞDEĞER MUTASYONDUR, kör nokta değil.
   *
   * ⛔ Ama o mutasyon gerçek bir eksiği gösterdi: `?? 0` biçimi "ölçtüm,
   * sıfır çıktı" gibi okunur (anayasadaki "nötr görünen varsayılan" sınıfı).
   * Bu yüzden fiyatı bilinmeyen satırlar AYRICA sayılıyor ve ekranda yazıyor:
   * doğru bir sayı, kapsamı görünmezse yanlış bir hüküm üretir.
   */
  const hepsiFiyatli = saglikOzeti([
    satir({ stok: 2, durum: "PASIF", fiyat: 1000 }),
    satir({ stok: 3, durum: "STOKSUZ", fiyat: 500 }),
  ]);
  kontrol(
    "fiyatlar farklıysa toplam ikisini de sayar (2000 + 1500)",
    hepsiFiyatli.kapaliDuranTutar === 3500,
    hepsiFiyatli.kapaliDuranTutar,
  );
  kontrol(
    "fiyatı bilinmeyen kapalı satır AYRICA sayılır (toplamın kapsamı)",
    o.kapaliDuranFiyatsiz === 1,
    o.kapaliDuranFiyatsiz,
  );
  kontrol(
    "  ...hepsi fiyatlıysa o sayaç SIFIR (0 yazar, kaybolmaz)",
    hepsiFiyatli.kapaliDuranFiyatsiz === 0,
    hepsiFiyatli.kapaliDuranFiyatsiz,
  );
  kontrol(
    "  ...ve fiyatsız satır yine KAPALI DURAN sayılır (adet tam)",
    o.kapaliDuran === 2 && o.kapaliDuranTutar === 2000,
    [o.kapaliDuran, o.kapaliDuranTutar],
  );
  kontrol("boş liste çökmez ve sıfır döner", saglikOzeti([]).toplam === 0);
  kosanBolumler.push("tutar");
}

// ===========================================================================
console.log("\n4) ÖLÇÜMÜN YAŞI VE BAYATLIK");
// ===========================================================================
{
  kontrol("yaş: dün ölçülmüş → 1 gün", olcumYasiGun(DUN, SIMDI) === 1, olcumYasiGun(DUN, SIMDI));
  kontrol("yaş: hiç ölçülmemiş → null", olcumYasiGun(null, SIMDI) === null);
  kontrol("yaş: 14 gün önce → 14", olcumYasiGun(ESKI, SIMDI) === 14, olcumYasiGun(ESKI, SIMDI));

  kontrol(`eşik ${BAYAT_ESIGI_GUN} gün (gerekçesi gövdede yazılı)`, BAYAT_ESIGI_GUN === 2);
  kontrol("dün ölçülmüş → BAYAT DEĞİL", !bayatMi(DUN, SIMDI));
  kontrol("14 gün önce → BAYAT", bayatMi(ESKI, SIMDI));
  /** ⛔ HİÇ ÖLÇÜLMEMİŞ DE BAYAT SAYILIR — "taze" demek yalan olurdu. */
  kontrol("hiç ölçülmemiş → BAYAT (taze SAYILMAZ)", bayatMi(null, SIMDI));

  const o = saglikOzeti([satir({ olcumAt: ESKI }), satir({ olcumAt: DUN }), satir({ olcumAt: null })]);
  kontrol("özet en ESKİ ölçümü bulur", o.enEskiOlcum?.getTime() === ESKI.getTime());
  kontrol("özet en YENİ ölçümü bulur", o.enYeniOlcum?.getTime() === DUN.getTime());
  kosanBolumler.push("yas");
}

// ===========================================================================
console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
  process.exit(1);
} else if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
  process.exit(0);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrol içinde)`);
  process.exit(1);
}
