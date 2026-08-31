import { baglantiHukmu, TABAN, type TaniOlcumu } from "./tani-hukmu";

/**
 * ============================================================================
 *  BAĞLANTI TANISI BEKÇİSİ
 * ----------------------------------------------------------------------------
 *      npm run baglanti-tanisi:dogrula
 *
 *  ⛔ NİYE: tanı aracının hüküm mantığı YALNIZ KESİNTİDE çalışır. Sağlıklı
 *  günlerde her koşumda yalnız "SAGLIKLI" dalı geçiyor; kesinti dalları
 *  aylarca sınanmadan durur ve tam gerektiği anda yanlış yöne gönderir.
 *
 *  ⭐ KAYNAK TARAMASI YOK — gövde ÇAĞRILIP değeri ölçülüyor.
 *
 *  ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİR: her sınıf için hem O sınıfa
 *  düşen hem düşmeyen bir tablo var. Yoksa "her tabloya EL_SIKISMASI diyen"
 *  bir gövde de testi geçerdi.
 * ============================================================================
 */

const BOLUM_SAYISI = 6;
const kosanBolumler: string[] = [];
let gecen = 0;
let kalan = 0;

function yakin(ad: string, olculen: unknown, beklenen: unknown) {
  const a = JSON.stringify(olculen);
  const b = JSON.stringify(beklenen);
  if (a === b) gecen += 1;
  else {
    kalan += 1;
    console.log(`  HATA  ${ad}`);
    console.log(`      beklenen: ${b}`);
    console.log(`      ölçülen : ${a}`);
  }
}

/** Kısayollar — okunur tablolar kurmak için. */
const iyi = (sn: number): TaniOlcumu => ({ durum: 200, sure: sn });
const dus = (sn: number): TaniOlcumu => ({ durum: 500, sure: sn });
const bos = { acikBaglanti: null, kota: null, abortFarki: null };

console.log("\nBAĞLANTI TANISI BEKÇİSİ");
console.log("=".repeat(60));

// --- 1) ÖLÇÜM YOK ≠ TEMİZ ------------------------------------------------
console.log("\n1) ölçüm yok ile temiz AYRI");
{
  yakin("boş ölçüm → OLCUM_YOK", baglantiHukmu({ olcumler: [], ...bos }).sinif, "OLCUM_YOK");
  /**
   * ⛔ EN TEHLİKELİ YALANCI YEŞİL BU OLURDU: hiç ölçmeden "sağlıklı" demek.
   * Kesintide aracı koşturan kişi "sorun yok" görüp başka yere bakardı.
   */
  yakin(
    "  ...ve SAGLIKLI DEĞİL",
    baglantiHukmu({ olcumler: [], ...bos }).sinif === "SAGLIKLI",
    false,
  );
}
kosanBolumler.push("ölçüm yok");

// --- 2) SAĞLIKLI ---------------------------------------------------------
console.log("\n2) hepsi 200 → SAGLIKLI");
{
  const h = baglantiHukmu({ olcumler: [iyi(0.2), iyi(0.35), iyi(0.11)], ...bos });
  yakin("sınıf", h.sinif, "SAGLIKLI");
  if (h.sinif === "SAGLIKLI") {
    yakin("  en yavaş yanıt taşınıyor", h.enYavasSn, 0.35);
    yakin("  kota bilinmiyorsa uyarı YOK", h.kotaYakin, false);
  }
  /** ⚠ Sağlıklıyken bile kota yakınsa SÖYLENİR — sessiz güven verilmez. */
  const y = baglantiHukmu({
    olcumler: [iyi(0.2)],
    acikBaglanti: 20,
    kota: 25,
    abortFarki: 0,
  });
  yakin("kota %80 → yakın uyarısı", y.sinif === "SAGLIKLI" && y.kotaYakin, true);
  const u = baglantiHukmu({
    olcumler: [iyi(0.2)],
    acikBaglanti: 6,
    kota: 25,
    abortFarki: 0,
  });
  yakin("  ...kota %24 → uyarı YOK", u.sinif === "SAGLIKLI" && u.kotaYakin, false);
}
kosanBolumler.push("sağlıklı");

// --- 3) 31.08 İMZASI: EL SIKIŞMASI --------------------------------------
console.log("\n3) sıcak çalışıyor + yeni bağlantı 10 sn'de düşüyor");
{
  /** 31.08.2026'da ÖLÇÜLEN tablo — birebir. */
  const h = baglantiHukmu({
    olcumler: [iyi(0.38), iyi(0.44), dus(10.22), dus(10.27), dus(10.36), dus(10.44)],
    acikBaglanti: 1,
    kota: 25,
    abortFarki: 6,
  });
  yakin("sınıf", h.sinif, "EL_SIKISMASI");
  if (h.sinif === "EL_SIKISMASI") {
    yakin("  sıcak sayısı", h.sicak, 2);
    yakin("  zaman aşımı sayısı", h.zamanAsimi, 4);
  }
  /**
   * ⚠ AYRIMIN ÖTEKİ YAKASI: sıcak yanıt YOKSA bu imza kurulamaz — hepsi
   * düşmüşse başka bir sınıftır. Bunu ayırmayan bir gövde her kesintiye
   * "el sıkışması" derdi.
   */
  const t = baglantiHukmu({
    olcumler: [dus(10.2), dus(10.3), dus(10.15)],
    acikBaglanti: 1,
    kota: 25,
    abortFarki: 3,
  });
  yakin("sıcak yanıt yoksa EL_SIKISMASI DEĞİL", t.sinif, "TAM_KESINTI");
}
kosanBolumler.push("el sıkışması");

// --- 4) KOTA DOLU — SAYIYLA KANITLANIR ----------------------------------
console.log("\n4) kota dolu");
{
  const h = baglantiHukmu({
    olcumler: [iyi(0.3), dus(10.2)],
    acikBaglanti: 25,
    kota: 25,
    abortFarki: 1,
  });
  yakin("kota dolu → KOTA_DOLU", h.sinif, "KOTA_DOLU");
  /**
   * ⚠ SIRA SINANIYOR: aynı tablo el sıkışması imzasına DA uyuyor (sıcak var,
   * zaman aşımı var). Kota önce gelmezse gövde yanlış yöne gönderirdi —
   * kota kesin bir sayıdır, el sıkışması bir çıkarımdır.
   */
  const a = baglantiHukmu({
    olcumler: [iyi(0.3), dus(10.2)],
    acikBaglanti: 6,
    kota: 25,
    abortFarki: 1,
  });
  yakin("  kota DOLU DEĞİLSE el sıkışmasına düşer", a.sinif, "EL_SIKISMASI");
}
kosanBolumler.push("kota");

// --- 5) TANINMAYAN TABLO — SEBEP UYDURULMAZ ------------------------------
console.log("\n5) tanınmayan tablo");
{
  /** Düşen var ama süreler imzaya uymuyor (3 sn) — hızlı bir 500. */
  const h = baglantiHukmu({
    olcumler: [iyi(0.3), dus(3.0), dus(2.8)],
    acikBaglanti: 6,
    kota: 25,
    abortFarki: 0,
  });
  yakin("sınıf", h.sinif, "TANINMADI");
  if (h.sinif === "TANINMADI") {
    yakin("  düşen sayısı", h.dusen, 2);
    yakin("  temiz sayısı", h.temiz, 1);
  }
  /** ⛔ UYDURMA YOK: tanınmayan tabloya EL_SIKISMASI denmiyor. */
  yakin("  ...EL_SIKISMASI DEMİYOR", h.sinif === "EL_SIKISMASI", false);
}
kosanBolumler.push("tanınmadı");

// --- 6) PENCERE ÖLÇÜLDÜ -------------------------------------------------
console.log("\n6) zaman aşımı penceresi doğru genişlikte");
{
  /**
   * ⚠ PENCERE ±1,5 sn. Dar olsa (±0,1) gerçek kesinti "tanınmadı"ya düşerdi;
   * geniş olsa (±5) yavaş ama BAŞARILI yanıtlar zaman aşımı sanılırdı.
   * İki uç da sınanıyor.
   */
  const icinde = baglantiHukmu({
    olcumler: [iyi(0.4), dus(TABAN.cokusSuresiSn + 1.4)],
    ...bos,
  });
  yakin("10,15 + 1,4 sn → hâlâ imza içinde", icinde.sinif, "EL_SIKISMASI");
  const disinda = baglantiHukmu({
    olcumler: [iyi(0.4), dus(TABAN.cokusSuresiSn + 2.0)],
    ...bos,
  });
  yakin("10,15 + 2,0 sn → imza DIŞINDA", disinda.sinif, "TANINMADI");
}
kosanBolumler.push("pencere");

console.log("\n" + "=".repeat(60));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — ${kosanBolumler.length}/${BOLUM_SAYISI} bölüm. Sonuç GEÇERSİZ.`,
  );
  process.exit(1);
}
if (kalan === 0) {
  console.log(`OK  ${gecen}/${gecen} ölçüt geçti (${BOLUM_SAYISI} bölüm)`);
  process.exit(0);
}
console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
process.exit(1);
