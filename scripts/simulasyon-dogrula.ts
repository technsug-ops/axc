import {
  birAltDilim,
  simulasyonKur,
  type SimulasyonGirdisi,
} from "../src/lib/fiyatlama/simulasyon";
import type { TarifeDilimi } from "../src/lib/komisyon/tarife-okuyucu";

/**
 * ============================================================================
 *  FİYAT SİMÜLASYONU — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Saf katman; veritabanına gidilmez. Merkezinde GERÇEK VAKA var:
 *  Manuel Rondo 500 ml, canlıdaki tarifeden okunmuş dilimlerle.
 *      769,99+        → %18
 *      701,29–769,98  → %12,8
 *      641,09–701,28  → %11,1
 *      641,08 altı    → %9,3
 *  Güncel fiyat 1.999 TL, yani en pahalı dilimde.
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

/** Canlıdan okunan gerçek tarife. */
const RONDO: TarifeDilimi[] = [
  { sira: 1, altLimit: 769.99, ustLimit: null, oran: 18 },
  { sira: 2, altLimit: 701.29, ustLimit: 769.98, oran: 12.8 },
  { sira: 3, altLimit: 641.09, ustLimit: 701.28, oran: 11.1 },
  { sira: 4, altLimit: null, ustLimit: 641.08, oran: 9.3 },
];

const BUGUN = new Date("2026-08-19T09:00:00Z");

const temel = (ek: Partial<SimulasyonGirdisi> = {}): SimulasyonGirdisi => ({
  hedefFiyat: 1999,
  adet: 1,
  birimMaliyet: 1200,
  kdvOrani: 20,
  paraBirimi: "TRY",
  dilimler: RONDO,
  pencereBitis: new Date("2026-08-25T04:59:00Z"),
  tekOran: 18,
  komisyonKdvOrani: null,
  siparisKesintileri: [],
  kargoTarifesi: null,
  bugun: BUGUN,
  ...ek,
});

console.log("\nFİYAT SİMÜLASYONU — DOĞRULAMA\n");

// --- 1) GERÇEK VAKA ----------------------------------------------------------
{
  console.log("1) MANUEL RONDO — güncel fiyat 1.999");
  const s = simulasyonKur(temel());
  kontrol("1. dilime düşer", s.dilim?.sira === 1);
  kontrol("oran %18", s.komisyonOrani === 18);
  kontrol("oran kaynağı DİLİM", s.oranKaynagi === "DILIM");
  kontrol("NET hesaplandı", s.net1 !== null && s.net2 !== null);
  kontrol("beyan YOK (zemin sağlam)", s.beyanlar.length === 0, s.beyanlar);
}

// --- 2) BİR KURUŞ İNMENİN ETKİSİ — ASIL SORU --------------------------------
{
  console.log("\n2) BİR KURUŞ AŞAĞI (769,99 → 769,98)");
  /**
   * ⚠ AŞAMA 1'İN VARLIK SEBEBİ. Bir kuruş fiyat kaybı, komisyonu 5,2 puan
   * düşürüyor. Kazanç ciroyla ölçekleniyor; kayıp sabit bir kuruş.
   */
  const ust = simulasyonKur(temel({ hedefFiyat: 769.99 }));
  const alt = simulasyonKur(temel({ hedefFiyat: 769.98 }));

  kontrol("769,99 → 1. dilim %18", ust.dilim?.sira === 1 && ust.komisyonOrani === 18);
  kontrol("769,98 → 2. dilim %12,8", alt.dilim?.sira === 2 && alt.komisyonOrani === 12.8);
  kontrol("ciro yalnız 1 kuruş düştü", Math.abs(ust.ciro - alt.ciro - 0.01) < 0.001);
  /**
   * NET-2 ARTMALI: 5,2 puanlık komisyon kazancı bir kuruşluk kaybı
   * kat kat aşıyor. Bu test tersine dönerse ya dilim sırası ya oran
   * bağlanması bozulmuştur.
   */
  kontrol(
    "NET-2 ARTAR (bir kuruş kayıp, 5,2 puan kazanç)",
    alt.net2 !== null && ust.net2 !== null && alt.net2 > ust.net2,
    { ust: ust.net2, alt: alt.net2 },
  );
}

// --- 3) DİLİM SINIRLARI — İKİ YÖNLÜ -----------------------------------------
{
  console.log("\n3) SINIR DEĞERLERİ");
  const dilim = (f: number) => simulasyonKur(temel({ hedefFiyat: f })).dilim?.sira;
  kontrol("769,99 (tam sınır) → 1", dilim(769.99) === 1);
  kontrol("769,98 → 2", dilim(769.98) === 2);
  kontrol("701,29 (tam sınır) → 2", dilim(701.29) === 2);
  kontrol("701,28 → 3", dilim(701.28) === 3);
  kontrol("641,09 (tam sınır) → 3", dilim(641.09) === 3);
  kontrol("641,08 → 4", dilim(641.08) === 4);
  kontrol("1 TL → 4 (alt uç açık)", dilim(1) === 4);
  kontrol("999.999 TL → 1 (üst uç açık)", dilim(999999) === 1);
}

// --- 4) BİR ALT DİLİM ÖNERİSİ -----------------------------------------------
{
  console.log("\n4) BİR ALT DİLİM HEDEFİ");
  /**
   * Kullanıcı elle deneyerek bulmamalı: "769,98'e inersen %12,8" yazısı
   * tek bakışta görünmeli. Hedef, alt dilimin ÜST sınırıdır — bir kuruş
   * daha inmek gereksiz kayıptır.
   */
  const oneri = birAltDilim(RONDO, 1999);
  kontrol("öneri üretilir", oneri !== null);
  kontrol("hedef fiyat 769,98", oneri?.hedefFiyat === 769.98);
  kontrol("  ...hedef dilim 2", oneri?.dilim.sira === 2);
  kontrol("  ...hedef oran %12,8", oneri?.dilim.oran === 12.8);

  /** Zincir: her dilimden bir alttakine. */
  kontrol("2. dilimden 3'e → 701,28", birAltDilim(RONDO, 750)?.hedefFiyat === 701.28);
  kontrol("3. dilimden 4'e → 641,08", birAltDilim(RONDO, 660)?.hedefFiyat === 641.08);

  /**
   * EN UCUZ DİLİMDE ÖNERİ YOK. "Daha da in" demek anlamsız olurdu ve
   * uydurma bir hedef fiyat üretmek zorunda kalırdık.
   */
  kontrol("en ucuz dilimde öneri YOK", birAltDilim(RONDO, 100) === null);
  kontrol("boş dilim listesinde öneri YOK", birAltDilim([], 1999) === null);
}

// --- 5) DİLİM VERİSİ YOK — BEYAN ŞART ---------------------------------------
{
  console.log("\n5) DİLİM VERİSİ YOK");
  /**
   * ⚠ Tek oranla hesaplamak yanlış değil; SESSİZCE yapmak yanlış.
   * Beyansız bir tahmin, dilim bilgisi varmış gibi okunur ve kullanıcı
   * olmayan bir kesinliğe dayanarak fiyat değiştirir.
   */
  const s = simulasyonKur(temel({ dilimler: null, tekOran: 15 }));
  kontrol("tek oranla hesaplanır", s.komisyonOrani === 15);
  kontrol("kaynak TEK_ORAN", s.oranKaynagi === "TEK_ORAN");
  kontrol("dilim null", s.dilim === null);
  kontrol("DILIM_YOK BEYAN edilir", s.beyanlar.some((b) => b.tur === "DILIM_YOK"));
  kontrol("NET yine hesaplanır", s.net2 !== null);

  /** Ne dilim ne oran varsa NET üretilmez — uydurma sayı yok. */
  const oransiz = simulasyonKur(temel({ dilimler: null, tekOran: null }));
  kontrol("oran da yoksa NET null", oransiz.net2 === null);
  kontrol("  ...ORAN_YOK beyan edilir", oransiz.beyanlar.some((b) => b.tur === "ORAN_YOK"));
}

// --- 6) PENCERE BİLİNCİ ------------------------------------------------------
{
  console.log("\n6) PENCERE BİTMİŞ TARİFE");
  /**
   * Engellemek yanlış olurdu — eski tarife de fikir verir. Ama beyan
   * etmeden göstermek, kullanıcıya BAYAT bir sayıyla fiyat değiştirtir.
   */
  const s = simulasyonKur(temel({ pencereBitis: new Date("2026-08-18T04:59:00Z") }));
  kontrol("simülasyon YİNE yapılır", s.net2 !== null);
  kontrol("PENCERE_BITTI beyan edilir", s.beyanlar.some((b) => b.tur === "PENCERE_BITTI"));
  kontrol(
    "  ...bitiş tarihi bildirilir",
    s.beyanlar.some((b) => b.tur === "PENCERE_BITTI" && b.bitis.getUTCDate() === 18),
  );

  /** Geçerli pencerede uyarı YOK — her satırda uyaran araç okunmaz olur. */
  const gecerli = simulasyonKur(temel());
  kontrol("geçerli pencerede uyarı YOK", !gecerli.beyanlar.some((b) => b.tur === "PENCERE_BITTI"));
}

// --- 7) MALİYETSİZ ÜRÜN ------------------------------------------------------
{
  console.log("\n7) MALİYET YOK");
  const s = simulasyonKur(temel({ birimMaliyet: null }));
  kontrol("NET hesaplanamaz", s.net1 === null && s.net2 === null);
  kontrol("MALIYET_YOK beyan edilir", s.beyanlar.some((b) => b.tur === "MALIYET_YOK"));
  /** Dilim yine de çözülür: hangi orana düştüğü maliyetten bağımsızdır. */
  kontrol("dilim yine de çözülür", s.dilim?.sira === 1);
  kontrol("  ...oran yine bildirilir", s.komisyonOrani === 18);
}

// --- 8) ADET ÖLÇEKLENMESİ ----------------------------------------------------
{
  console.log("\n8) ADET");
  /**
   * ⚠ TEST VERİSİ AYRIMI GÖSTERMELİ — üçüncü kez aynı tuzağa düştüm.
   *
   * İlk yazılışta 1.000 TL × 3 = 3.000 kullanmıştım; ikisi de 1. dilimde
   * olduğu için "dilim ciroda çözülsün" mutasyonu YEŞİL kaldı. Kural
   * doğruydu ama test onu KORUMUYORDU.
   *
   * 700 TL seçildi: BİRİM fiyat 3. dilimde (641,09–701,28), ama 3 adetlik
   * CİRO 2.100 TL, yani 1. dilimde. İkisi artık farklı cevap veriyor.
   */
  const tek = simulasyonKur(temel({ hedefFiyat: 700, adet: 1 }));
  const uc = simulasyonKur(temel({ hedefFiyat: 700, adet: 3 }));
  kontrol("ciro adetle çarpılır", uc.ciro === 2100);

  /**
   * ⚠ DİLİM BİRİM FİYATA GÖRE ÇÖZÜLÜR, ciroya göre DEĞİL. Kanal fiyatı
   * ürün BAŞINA ilan ediyor; ciroya bakılsaydı 3 adetlik sipariş yanlış
   * dilime düşer ve komisyon %11,1 yerine %18 hesaplanırdı.
   */
  kontrol("birim fiyat 700 → 3. dilim", tek.dilim?.sira === 3);
  kontrol("3 adette de 3. dilim (ciro 2.100 olsa bile)", uc.dilim?.sira === 3, uc.dilim?.sira);
  kontrol("  ...oran %11,1 kalır", uc.komisyonOrani === 11.1);
  kontrol("  ...ciro dilimi olan %18 DEĞİL", uc.komisyonOrani !== 18);
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
