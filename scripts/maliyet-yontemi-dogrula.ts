import {
  ACIK_YONTEMLER,
  MALIYET_YONTEMLERI,
  VARSAYILAN_MALIYET_YONTEMI,
  hareketliOrtalama,
  maliyetYontemiCoz,
  type OrtalamaHareketi,
} from "../src/lib/maliyet-yontemi";
import { yontemDegisimKarari } from "../src/lib/maliyet-yontemi-kapisi";

/**
 * ============================================================================
 *  MALİYET YÖNTEMİ BEKÇİSİ (K115②, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run maliyet-yontemi:dogrula
 *
 *  ⛔ NİYE ŞİMDİ: `hareketliOrtalama` TAM yazılmış, çağıranı YOK ve bekçisi
 *  de yoktu. Anayasa bunu adıyla yasaklıyor — "şemadaki alan da bir iddiadır,
 *  yazıcısı yoksa vaat boştur" kuralının GÖVDE tarafı: sınanmamış bir motor,
 *  bağlandığı gün doğru sanılır.
 *
 *  ⭐ KAYNAK TARAMASI YOK — saf gövdeler ÇAĞRILIP değerleri ölçülüyor.
 *
 *  ── ⚠ İKİ DEĞİŞMEZ (kullanıcı şartı K115②) ────────────────────────────
 *    · havuz maliyeti ≥ 0 — negatif ortalama diye bir şey yoktur
 *    · havuz adedi = ledger adedi — motor kendi adedini uydurmaz
 *  İkisi de her senaryoda ayrıca ölçülüyor.
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

function dogru(ad: string, kosul: boolean) {
  yakin(ad, kosul, true);
}

/**
 * ⛔ İKİ DEĞİŞMEZ HER SENARYODA ÖLÇÜLÜR — TEK TEK DEĞERLERİN YANINDA.
 * Ayrı ayrı doğru çıkan değerler, değişmezi kıran bir gövdeyle de üretilebilir;
 * değişmezi her çağrıda sınamak bunu imkânsız kılar.
 * _(Anayasa: "ölçüm iki defteri de ölçmeli".)_
 */
function degismezler(ad: string, hareketler: readonly OrtalamaHareketi[]) {
  const sonuc = hareketliOrtalama(hareketler);
  const ledgerAdet = hareketler.reduce((t, h) => t + h.quantityDelta, 0);
  if (sonuc.durum !== "HESAPLANDI") return;
  dogru(`${ad} — havuz maliyeti ≥ 0`, sonuc.birimMaliyet >= 0);
  dogru(`${ad} — havuz adedi = ledger adedi`, sonuc.adet === ledgerAdet);
}

console.log("\nMALİYET YÖNTEMİ BEKÇİSİ");
console.log("=".repeat(60));

// --- 1) YÖNTEM ÇÖZÜMÜ VE VARSAYILAN --------------------------------------
console.log("\n1) yöntem çözümü — varsayılan mevcut durumu korur");
{
  /**
   * ⛔ VARSAYILAN `FIFO` OLMAK ZORUNDA. Başka bir şey olsaydı yöntem sütunu
   * eklendiği ANDA canlıdaki bütün maliyetler sessizce değişirdi.
   */
  yakin("varsayılan FIFO", VARSAYILAN_MALIYET_YONTEMI, "FIFO");
  yakin("boş değer varsayılana düşer", maliyetYontemiCoz(null), "FIFO");
  yakin("tanınmayan değer varsayılana düşer", maliyetYontemiCoz("LIFO"), "FIFO");
  yakin("geçerli değer aynen döner", maliyetYontemiCoz("HAREKETLI_ORTALAMA"), "HAREKETLI_ORTALAMA");
  yakin("iki yöntem tanımlı", [...MALIYET_YONTEMLERI], ["FIFO", "HAREKETLI_ORTALAMA"]);
  /**
   * ⛔ LIFO KAPSAM DIŞI — VUK ve TMS 2'de yasak. Listeye sızarsa ekranda
   * seçilebilir hâle gelir ve kullanılamayacak bir yöntem taşınmış olur.
   */
  dogru(
    "LIFO listede YOK",
    !(MALIYET_YONTEMLERI as readonly string[]).includes("LIFO"),
  );
}
kosanBolumler.push("yöntem çözümü");

// --- 2) KAPI — BUGÜN YALNIZ FIFO SEÇİLEBİLİR ----------------------------
console.log("\n2) açık yöntem kapısı");
{
  /**
   * ⚠ KULLANICI ŞARTI (31.08.2026): bekçiler yöntem-koşullu hâle gelmeden
   * `HAREKETLI_ORTALAMA` SEÇİLEBİLİR OLMAZ. Ekrandan gizlemek yetmez —
   * bir POST isteği yeter; kapı SUNUCUDA.
   */
  yakin("bugün açık olan tek yöntem", [...ACIK_YONTEMLER], ["FIFO"]);
  dogru(
    "HAREKETLI_ORTALAMA henüz AÇIK DEĞİL",
    !ACIK_YONTEMLER.includes("HAREKETLI_ORTALAMA"),
  );
}
kosanBolumler.push("kapı");

// --- 3) HAREKETLİ ORTALAMA — TEMEL DAVRANIŞ ------------------------------
console.log("\n3) hareketli ortalama — temel");
{
  yakin("hiç hareket yok → STOK_YOK", hareketliOrtalama([]), { durum: "STOK_YOK" });
  /**
   * ⚠ ÖRNEK VERİ AYRIMI GÖSTERİYOR: iki girişin ADEDİ de MALİYETİ de farklı.
   * Eşit olsalardı "ağırlıklı" ile "basit" ortalama aynı sayıyı verirdi ve
   * ağırlığı silen mutasyon YEŞİL kalırdı.
   *   (2 × 100 + 8 × 50) / 10 = 60   ← ağırlıklı
   *   (100 + 50) / 2         = 75   ← basit (YANLIŞ)
   */
  yakin(
    "ağırlıklı ortalama — basit ortalamadan AYRIŞIR",
    hareketliOrtalama([
      { quantityDelta: 2, birimMaliyet: "100.00" },
      { quantityDelta: 8, birimMaliyet: "50.00" },
    ]),
    { durum: "HESAPLANDI", birimMaliyet: 60, adet: 10 },
  );
  degismezler("ağırlıklı", [
    { quantityDelta: 2, birimMaliyet: "100.00" },
    { quantityDelta: 8, birimMaliyet: "50.00" },
  ]);
}
kosanBolumler.push("temel");

// --- 4) ÇIKIŞ ORTALAMAYI OYNATMAZ ---------------------------------------
console.log("\n4) çıkış — adet düşer, ortalama DEĞİŞMEZ");
{
  /**
   * ⛔ YÖNTEMİN TANIMI. Çıkış ortalamadan değerlenir; kendi değerini
   * ortalamadan çıkarmak ortalamayı oynatmaz. Oynatan bir gövde, satış
   * yaptıkça maliyeti kaydırırdı.
   */
  yakin(
    "çıkıştan sonra ortalama AYNI",
    hareketliOrtalama([
      { quantityDelta: 2, birimMaliyet: "100.00" },
      { quantityDelta: 8, birimMaliyet: "50.00" },
      { quantityDelta: -4, birimMaliyet: null },
    ]),
    { durum: "HESAPLANDI", birimMaliyet: 60, adet: 6 },
  );
  degismezler("çıkış sonrası", [
    { quantityDelta: 2, birimMaliyet: "100.00" },
    { quantityDelta: 8, birimMaliyet: "50.00" },
    { quantityDelta: -4, birimMaliyet: null },
  ]);
  /**
   * ⚠ SIFIRA DÜŞÜNCE GEÇMİŞ KAPANIR — ve bu, KUYRUK TOZUYLA sınanıyor.
   * 1/3'lük bir ortalama kayan noktada tam bölünmez; sıfırlama yapılmazsa
   * kalıntı bir sonraki girişin ortalamasına sızar.
   */
  yakin(
    "adet 0'a düşüp yeniden girildi → ESKİ ortalama sızmaz",
    hareketliOrtalama([
      { quantityDelta: 3, birimMaliyet: "100.00" },
      { quantityDelta: -3, birimMaliyet: null },
      { quantityDelta: 1, birimMaliyet: "10.00" },
    ]),
    { durum: "HESAPLANDI", birimMaliyet: 10, adet: 1 },
  );
  /** Stoktan fazla çıkış adedi eksiye düşürmez. */
  yakin(
    "stoktan FAZLA çıkış → STOK_YOK, negatif adet YOK",
    hareketliOrtalama([
      { quantityDelta: 2, birimMaliyet: "100.00" },
      { quantityDelta: -5, birimMaliyet: null },
    ]),
    { durum: "STOK_YOK" },
  );
  /**
   * ⛔ BU VAKA MUTASYON KAÇTIĞI İÇİN EKLENDİ — VE SEBEP BEKÇİ DEĞİL, VERİYDİ.
   * Üstteki örnek `Math.min` kapısını SINAMIYOR: kapı kalksa da adet −3'e
   * düşer ve `adet <= 0` yine `STOK_YOK` döndürür — iki okuma AYNI cevabı
   * verir. Ayrım ancak çıkıştan SONRA yeni bir giriş gelince görünür:
   *   kapı VAR → adet 0'dan başlar,  1 adet ₺10  → HESAPLANDI
   *   kapı YOK → adet −3'ten başlar, −2'de kalır → STOK_YOK
   * _(Anayasa: "mutasyon kaçıyorsa önce test verisi sorgulanır".)_
   */
  yakin(
    "fazla çıkıştan SONRA yeni giriş → borç taşınmaz",
    hareketliOrtalama([
      { quantityDelta: 2, birimMaliyet: "100.00" },
      { quantityDelta: -5, birimMaliyet: null },
      { quantityDelta: 1, birimMaliyet: "10.00" },
    ]),
    { durum: "HESAPLANDI", birimMaliyet: 10, adet: 1 },
  );
  /** `0` delta bir hareket değildir. */
  yakin(
    "sıfır delta atlanır",
    hareketliOrtalama([
      { quantityDelta: 2, birimMaliyet: "100.00" },
      { quantityDelta: 0, birimMaliyet: "999.00" },
    ]),
    { durum: "HESAPLANDI", birimMaliyet: 100, adet: 2 },
  );
}
kosanBolumler.push("çıkış");

// --- 5) BİLİNMEYEN MALİYET SIFIRA ÇEVRİLMEZ -----------------------------
console.log("\n5) maliyeti bilinmeyen giriş");
{
  /**
   * ⛔ ANAYASA: bilinmeyen sıfıra çevrilmez. `null`u 0 saymak ortalamayı
   * aşağı çeker ve kârı YÜKSEK gösterir; girişi atlamak adedi eksik bırakır
   * ve ortalamayı YUKARI çeker. İkisi de yanlış — doğru cevap "bilmiyorum".
   */
  yakin(
    "maliyetsiz GİRİŞ → MALIYET_EKSIK",
    hareketliOrtalama([
      { quantityDelta: 2, birimMaliyet: "100.00" },
      { quantityDelta: 3, birimMaliyet: null },
    ]),
    { durum: "MALIYET_EKSIK" },
  );
  /** ⚠ ÇIKIŞTA maliyet zaten yok — o kirletmez. */
  yakin(
    "maliyetsiz ÇIKIŞ kirletmez",
    hareketliOrtalama([
      { quantityDelta: 2, birimMaliyet: "100.00" },
      { quantityDelta: -1, birimMaliyet: null },
    ]),
    { durum: "HESAPLANDI", birimMaliyet: 100, adet: 1 },
  );
  /** Sayıya çevrilemeyen değer de bilinmeyendir — sessizce NaN taşımaz. */
  yakin(
    "okunamayan maliyet → MALIYET_EKSIK",
    hareketliOrtalama([{ quantityDelta: 2, birimMaliyet: "abc" }]),
    { durum: "MALIYET_EKSIK" },
  );
}
kosanBolumler.push("bilinmeyen maliyet");

// --- 6) YÖNTEM DEĞİŞİM KAPISI -------------------------------------------
console.log("\n6) yöntem değişim kapısı — ilk kurulum / dönem sınırı");
{
  /**
   * ⚠ AYNI DEĞERE "DEĞİŞTİR" DEMEK DEĞİŞİKLİK DEĞİLDİR. Kapı burada
   * kapanmasa kullanıcı hiçbir şey değiştirmeden onay kutusu doldurur ve
   * her seferinde çıkan uyarı okunmaz olur.
   */
  yakin(
    "değişiklik yoksa kapı hiç çalışmaz",
    yontemDegisimKarari({
      eski: "FIFO",
      yeni: "FIFO",
      toplamHareket: 10780,
      cariDonemHareketi: 542,
    }),
    { sonuc: "DEGISIKLIK_YOK" },
  );
  /**
   * ⭐ İLK KURULUM SERBEST — ÖLÇÜT "HAREKET VAR MI", uydurma bir tarih
   * değil. Defter hiç açılmamışsa "geçmişini bölüyorsun" demek yalan olurdu.
   */
  yakin(
    "defter hiç açılmamış → SERBEST / ILK_KURULUM",
    yontemDegisimKarari({
      eski: "FIFO",
      yeni: "HAREKETLI_ORTALAMA",
      toplamHareket: 0,
      cariDonemHareketi: 0,
    }),
    { sonuc: "SERBEST", sebep: "ILK_KURULUM" },
  );
  /**
   * ⛔ AYRIMIN İKİ YAKASI. Bu iki senaryo YALNIZ `cariDonemHareketi` ile
   * ayrılıyor; `toplamHareket` ikisinde de aynı. Biri yazılmasaydı ağırlığı
   * sabitleyen bir mutasyon YEŞİL kalırdı.
   * _(Anayasa: "örnek veri ayrımın iki yakasını göstermeli".)_
   */
  yakin(
    "cari dönemde hareket VAR → DONEM_ORTASI, etkilenen = cari",
    yontemDegisimKarari({
      eski: "FIFO",
      yeni: "HAREKETLI_ORTALAMA",
      toplamHareket: 10780,
      cariDonemHareketi: 542,
    }),
    { sonuc: "DURAKSA", agirlik: "DONEM_ORTASI", etkilenen: 542 },
  );
  yakin(
    "cari dönem TEMİZ → SINIRDA, etkilenen = toplam",
    yontemDegisimKarari({
      eski: "FIFO",
      yeni: "HAREKETLI_ORTALAMA",
      toplamHareket: 10780,
      cariDonemHareketi: 0,
    }),
    { sonuc: "DURAKSA", agirlik: "SINIRDA", etkilenen: 10780 },
  );
  /**
   * ⚠ TERS YÖN DE KAPIDAN GEÇER. Ortalamadan FIFO'ya dönüş "geri alma"
   * değil, ikinci bir yöntem değişikliğidir — defter yine iki kuralla
   * yazılmış olur.
   */
  yakin(
    "ters yön (ortalama → FIFO) de duraksatır",
    yontemDegisimKarari({
      eski: "HAREKETLI_ORTALAMA",
      yeni: "FIFO",
      toplamHareket: 10780,
      cariDonemHareketi: 542,
    }),
    { sonuc: "DURAKSA", agirlik: "DONEM_ORTASI", etkilenen: 542 },
  );
}
kosanBolumler.push("değişim kapısı");

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
