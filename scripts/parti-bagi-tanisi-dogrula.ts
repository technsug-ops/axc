import {
  ileriPartiImzasi,
  partiBagiTanisi,
  type BagHareketi,
} from "../src/lib/parti-bagi-tanisi";

/**
 * ============================================================================
 *  PARTİ BAĞI TANISI BEKÇİSİ (K91, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run parti-bagi-tanisi:dogrula
 *
 *  ⛔ NİYE: bu gövde ekranda bir UYARI çiziyor. Yanlış tanı iki yönde de
 *  pahalı — susarsa kullanıcı şüpheli rakama güvenir, fazla konuşursa
 *  uyarı gürültüye döner ve okunmaz olur.
 *
 *  ⭐ KAYNAK TARAMASI YOK — saf gövde ÇAĞRILIP değeri ölçülüyor.
 *
 *  ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİR: her sınıf için hem O
 *  sınıfa düşen hem düşmeyen bir defter var. Yoksa "her deftere SUPHELI
 *  diyen" bir gövde de testi geçerdi.
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

let sayac = 0;
/** Giriş (parti) kurucu. */
function giris(gun: number, adet: number, maliyet: string | null): BagHareketi {
  sayac += 1;
  return {
    id: "p" + sayac,
    occurredAt: new Date(Date.UTC(2026, 7, gun)),
    createdAt: new Date(Date.UTC(2026, 7, gun)),
    quantityDelta: adet,
    unitCostAmount: maliyet,
    sourceMovementId: null,
  };
}
/** Çıkış kurucu — hangi partiye bağlı olduğu açıkça verilir. */
function cikis(
  gun: number,
  adet: number,
  damga: string | null,
  parti: string,
): BagHareketi {
  sayac += 1;
  return {
    id: "c" + sayac,
    occurredAt: new Date(Date.UTC(2026, 7, gun)),
    createdAt: new Date(Date.UTC(2026, 7, gun)),
    quantityDelta: -adet,
    unitCostAmount: damga,
    sourceMovementId: parti,
  };
}

console.log("\nPARTİ BAĞI TANISI BEKÇİSİ");
console.log("=".repeat(60));

// --- 1) TEMİZ DEFTER ----------------------------------------------------
console.log("\n1) temiz defter");
{
  sayac = 0;
  const p1 = giris(1, 5, "100.00");
  const p2 = giris(5, 3, "180.00");
  /** Damga tek bir açık partiyle eşleşiyor → belirsizlik yok. */
  const c1 = cikis(6, 2, "100.00", p1.id);
  yakin("TEMİZ", partiBagiTanisi([p1, p2, c1]), "TEMIZ");
  yakin("  ...ileri parti imzası YOK", ileriPartiImzasi([p1, p2, c1]), false);
}
kosanBolumler.push("temiz");

// --- 2) KAYMIŞ (b) — AYNI DAMGALI İKİ AÇIK PARTİ ------------------------
console.log("\n2) aynı damgalı iki açık parti → KAYMIS");
{
  sayac = 0;
  const p1 = giris(1, 5, "100.00");
  const p2 = giris(5, 5, "100.00");
  const c1 = cikis(6, 2, "100.00", p1.id);
  yakin("KAYMIS", partiBagiTanisi([p1, p2, c1]), "KAYMIS");
  /**
   * ⚠ AYRIMIN ÖTEKİ YAKASI: maliyetler FARKLI olsa belirsizlik biter.
   * Bunu ayırmayan bir gövde her çok partili deftere KAYMIS derdi.
   */
  sayac = 0;
  const q1 = giris(1, 5, "100.00");
  const q2 = giris(5, 5, "180.00");
  const d1 = cikis(6, 2, "100.00", q1.id);
  yakin("  ...maliyetler FARKLIYSA temiz", partiBagiTanisi([q1, q2, d1]), "TEMIZ");
}
kosanBolumler.push("kaymis");

// --- 3) ŞÜPHELİ (c) — HİÇ ADAY YOK --------------------------------------
console.log("\n3) damgaya uyan açık parti yok → SUPHELI");
{
  sayac = 0;
  const p1 = giris(1, 5, "100.00");
  /** Damga 999 — böyle bir parti hiç yok. */
  const c1 = cikis(6, 2, "999.00", p1.id);
  yakin("SUPHELI", partiBagiTanisi([p1, c1]), "SUPHELI");

  /**
   * ⚠ TÜKENMİŞ PARTİ DE ADAY DEĞİLDİR. İlk çıkış partiyi bitiriyor;
   * ikinci çıkış aynı damgayı taşısa bile açık aday kalmıyor.
   * "Tarihi önce" demekle "o an açıktı" demek AYRI şeyler — kısayol
   * alsaydık bu vaka TEMİZ görünürdü.
   */
  sayac = 0;
  const q1 = giris(1, 2, "100.00");
  const e1 = cikis(2, 2, "100.00", q1.id);
  const e2 = cikis(3, 1, "100.00", q1.id);
  yakin("tükenmiş parti aday değil → SUPHELI", partiBagiTanisi([q1, e1, e2]), "SUPHELI");
}
kosanBolumler.push("supheli");

// --- 4) ŞÜPHELİ, KAYMIŞ'I EZER ------------------------------------------
console.log("\n4) ağır tanı hafifini ezer");
{
  sayac = 0;
  const p1 = giris(1, 5, "100.00");
  const p2 = giris(2, 5, "100.00");
  /** Önce belirsizlik (iki aday), sonra hiç aday olmayan bir çıkış. */
  const c1 = cikis(3, 1, "100.00", p1.id);
  const c2 = cikis(4, 1, "777.00", p1.id);
  yakin("KAYMIS + SUPHELI → SUPHELI", partiBagiTanisi([p1, p2, c1, c2]), "SUPHELI");
  /** ⚠ Ters sırada da aynı sonuç — tanı sıraya değil OLGUYA bağlı. */
  yakin("  ...sıra değişince de aynı", partiBagiTanisi([p1, p2, c2, c1]), "SUPHELI");
}
kosanBolumler.push("agir tani");

// --- 5) İLERİ PARTİ İMZASI — TANIDAN AYRI ------------------------------
console.log("\n5) ileri parti imzası");
{
  sayac = 0;
  const p1 = giris(10, 5, "100.00");
  /** Çıkış 3 Ağustos, parti 10 Ağustos — satış, gelmemiş maldan çıkmış. */
  const c1 = cikis(3, 1, "100.00", p1.id);
  yakin("gelecekteki partiye bağlı → imza VAR", ileriPartiImzasi([p1, c1]), true);

  sayac = 0;
  const q1 = giris(1, 5, "100.00");
  const d1 = cikis(3, 1, "100.00", q1.id);
  yakin("  ...normal defterde imza YOK", ileriPartiImzasi([q1, d1]), false);

  /**
   * ⚠ AYNI GÜN İMZA SAYILMAZ — ölçüldü (29.08): çıkışların %48,72'si
   * partisiyle AYNI anı taşıyor. Aynı gün alıp aynı gün satmak kenar
   * durum değil, işin kendisi.
   */
  sayac = 0;
  const r1 = giris(5, 5, "100.00");
  const f1 = cikis(5, 1, "100.00", r1.id);
  yakin("aynı gün imza DEĞİL", ileriPartiImzasi([r1, f1]), false);
}
kosanBolumler.push("imza");

// --- 6) KURUŞ VE SIRA — AYRIMI GÖSTEREN VERİYLE ------------------------
console.log("\n6) kuruş yuvarlaması ve iş tarihi sırası");
{
  /**
   * ⚠ BU BÖLÜM MUTASYON KAÇTIĞI İÇİN EKLENDİ — VE KUSUR BEKÇİDE DEĞİL
   * VERİDEYDİ. İlk yazımda bütün maliyetler iki haneliydi ("100.00") ve
   * `createdAt === occurredAt` idi; ne yuvarlama ne sıralama HİÇ devreye
   * giriyordu, dolayısıyla ikisini bozan mutasyonlar yeşil geçti.
   * _(Anayasa: "mutasyon kaçıyorsa önce test verisi sorgulanır".)_
   */
  sayac = 0;
  /** İki haneden SONRASI farklı: yuvarlanınca AYNI, yuvarlanmayınca farklı. */
  const p1 = giris(1, 5, "100.0010");
  const c1 = cikis(3, 1, "100.0040", p1.id);
  yakin("kuruşa yuvarlanınca eşleşiyor → TEMİZ", partiBagiTanisi([p1, c1]), "TEMIZ");

  /**
   * ⚠ GERİYE DÖNÜK GİRİLEN ALIM: iş tarihi ERKEN, kayıt tarihi GEÇ.
   * `createdAt`e göre sıralayan bir gövde bu partiyi çıkıştan SONRA
   * oynatır, "o an açık parti yok" der ve TEMİZ bir defteri ŞÜPHELİ
   * ilan eder. Ölçüldü (29.08): geç girilen 15 hareketin 15'i meşru alım.
   */
  sayac = 0;
  const q1: BagHareketi = {
    id: "gecGirilen",
    occurredAt: new Date(Date.UTC(2026, 7, 1)),
    createdAt: new Date(Date.UTC(2026, 7, 20)),
    quantityDelta: 5,
    unitCostAmount: "100.00",
    sourceMovementId: null,
  };
  const d1: BagHareketi = {
    id: "cikisErken",
    occurredAt: new Date(Date.UTC(2026, 7, 3)),
    createdAt: new Date(Date.UTC(2026, 7, 3)),
    quantityDelta: -1,
    unitCostAmount: "100.00",
    sourceMovementId: "gecGirilen",
  };
  yakin("iş tarihine göre sıralanınca → TEMİZ", partiBagiTanisi([q1, d1]), "TEMIZ");
  /** ⚠ Ve bu bir "ileri parti" DEĞİL: parti 1 Ağustos, çıkış 3 Ağustos. */
  yakin("  ...ileri parti imzası YOK", ileriPartiImzasi([q1, d1]), false);
}
kosanBolumler.push("kuruş ve sıra");

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
