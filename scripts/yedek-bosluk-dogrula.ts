import { gercekKacisSayisi, yedekBoslugu } from "../src/lib/yedek-bosluk";

/**
 * ============================================================================
 *  YEDEK BOŞLUĞU — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Cron iki kez kaçtı (18–19.08.2026) ve ikisi de ancak biri fark ettiği
 *  için anlaşıldı. Bu katman "hangi günler eksik" sorusunu ekrana taşıyor.
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
    console.log(`  HATA  ${ad}${gorulen === undefined ? "" : ` — ${JSON.stringify(gorulen)}`}`);
  }
}

const g = (iso: string) => new Date(`${iso}T12:00:00Z`);
const BUGUN = g("2026-08-19");

console.log("\nYEDEK BOŞLUĞU — DOĞRULAMA\n");

// --- 1) KESİNTİSİZ DİZİ ------------------------------------------------------
{
  console.log("1) EKSİK YOK");
  const yedekler = [g("2026-08-19"), g("2026-08-18"), g("2026-08-17")].map((t) => ({ tarih: t }));
  const r = yedekBoslugu(yedekler, BUGUN, 3);
  kontrol("üç günün üçü de dolu", r.doluGun === 3 && r.eksikGunler.length === 0);
  kontrol("kaçış YOK", gercekKacisSayisi(r, BUGUN) === 0);
}

// --- 2) GERÇEK VAKA ----------------------------------------------------------
{
  console.log("\n2) GERÇEK VAKA (18 ve 19.08 kaçtı)");
  /** 17'sinde yedek var, 18 ve 19'unda yok — yaşananın aynısı. */
  const yedekler = [g("2026-08-17"), g("2026-08-16")].map((t) => ({ tarih: t }));
  const r = yedekBoslugu(yedekler, BUGUN, 4);
  kontrol("iki gün eksik bulundu", r.eksikGunler.length === 2, r.eksikGunler.map((d) => d.toISOString().slice(0, 10)));
  kontrol("  ...19.08 eksik", r.eksikGunler[0].toISOString().slice(0, 10) === "2026-08-19");
  kontrol("  ...18.08 eksik", r.eksikGunler[1].toISOString().slice(0, 10) === "2026-08-18");
  kontrol("eksikler YENİDEN ESKİYE", r.eksikGunler[0] > r.eksikGunler[1]);
  /**
   * BUGÜN eksikse kusur SAYILMAZ: cron gece koşar, gün içinde bakan biri
   * bugünün yedeğini henüz görmeyebilir. Ayrım olmasaydı her sabah
   * yalancı alarm çalardı.
   */
  kontrol("gerçek kaçış YALNIZ dün ve öncesi", gercekKacisSayisi(r, BUGUN) === 1);
}

// --- 3) BUGÜN EKSİK, DÜN DOLU ------------------------------------------------
{
  console.log("\n3) YALNIZ BUGÜN EKSİK");
  const yedekler = [g("2026-08-18"), g("2026-08-17")].map((t) => ({ tarih: t }));
  const r = yedekBoslugu(yedekler, BUGUN, 3);
  kontrol("bugün eksik görünür", r.eksikGunler.length === 1);
  kontrol("  ...ama KAÇIŞ sayılmaz", gercekKacisSayisi(r, BUGUN) === 0);
}

// --- 4) EN ESKİ YEDEKTEN ÖNCESİ SAYILMAZ ------------------------------------
{
  console.log("\n4) KAPSAM DIŞI GÜNLER");
  /**
   * ⚠ İZİN DOĞUM TARİHİ KURALI. En eski yedek 17.08 ise 10.08 için
   * "eksik" demek yanlış olurdu: o gün yedek alınması BEKLENMİYORDU.
   * Saklama 30 gün; daha eskisinin olmaması kuralın kendisidir.
   */
  const yedekler = [g("2026-08-17")].map((t) => ({ tarih: t }));
  const r = yedekBoslugu(yedekler, BUGUN, 10);
  kontrol("en eskiden öncesi KAPSAM DIŞI", r.kapsamDisiGun === 7, r.kapsamDisiGun);
  kontrol("  ...bakılan gün 3", r.bakilanGun === 3);
  kontrol("  ...eksik yalnız 18 ve 19", r.eksikGunler.length === 2);
  kontrol("kapsam dışı SESSİZ değil, sayılıyor", r.kapsamDisiGun > 0);
}

// --- 5) HİÇ YEDEK YOK --------------------------------------------------------
{
  console.log("\n5) HİÇ YEDEK YOK");
  const r = yedekBoslugu([], BUGUN, 5);
  /**
   * Hiç yedek yoksa "en eski" de yok; tarama tüm pencereyi eksik sayar.
   * Doğrusu bu: sistem hiç yedek almamışsa bu bilinmesi gereken en
   * ağır durumdur, kapsam dışı sayılıp gizlenemez.
   */
  kontrol("tüm pencere eksik", r.eksikGunler.length === 5);
  kontrol("kapsam dışı YOK", r.kapsamDisiGun === 0);
  kontrol("dolu gün 0", r.doluGun === 0);
}

// --- 6) GÜN İÇİNDE İKİ YEDEK -------------------------------------------------
{
  console.log("\n6) AYNI GÜN İKİ YEDEK");
  /** Elle alınan + otomatik: gün TEK sayılır, "fazla" diye bir şey yok. */
  const yedekler = [
    { tarih: new Date("2026-08-19T02:00:00Z") },
    { tarih: new Date("2026-08-19T14:00:00Z") },
  ];
  const r = yedekBoslugu(yedekler, BUGUN, 1);
  kontrol("aynı gün iki yedek TEK sayılır", r.doluGun === 1);
  kontrol("  ...eksik yok", r.eksikGunler.length === 0);
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
