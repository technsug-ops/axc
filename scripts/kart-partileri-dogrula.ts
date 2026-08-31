import { partiToplami, siradakiPartiSirasi } from "../src/lib/kart-partileri";

/**
 * ============================================================================
 *  KART PARTİ PANELİ BEKÇİSİ (K115, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run kart-partileri:dogrula
 *
 *  ⛔ NİYE: bu gövde kartta PARA basıyor. İki yönde de pahalı —
 *    · eksik toplarsa   → kullanıcı elindeki malı olduğundan az sanır
 *    · eksiği gizlerse  → eksik bir rakam TAM görünür ve sorgulanmaz
 *
 *  ⭐ KAYNAK TARAMASI YOK — saf gövde ÇAĞRILIP değeri ölçülüyor.
 * ============================================================================
 */

const BOLUM_SAYISI = 4;
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

console.log("\nKART PARTİ PANELİ BEKÇİSİ");
console.log("=".repeat(60));

// --- 1) TOPLAM — TEMİZ HÂL --------------------------------------------
console.log("\n1) toplam — hepsi ölçülebilir");
{
  yakin(
    "boş liste",
    partiToplami([], "TRY"),
    { adet: 0, tutar: 0, olculemeyen: 0 },
  );
  yakin(
    "tek parti",
    partiToplami([{ kalanAdet: 3, birimMaliyet: 100, paraBirimi: "TRY" }], "TRY"),
    { adet: 3, tutar: 300, olculemeyen: 0 },
  );
  /**
   * ⚠ ÖRNEK VERİ AYRIMI GÖSTERİYOR: iki partinin ADEDİ de MALİYETİ de
   * farklı. Aynı olsaydı "adet × maliyet" yerine "adet + maliyet" yazan bir
   * mutasyon bile aynı sayıyı üretebilirdi.
   */
  yakin(
    "iki parti — farklı adet, farklı maliyet",
    partiToplami(
      [
        { kalanAdet: 2, birimMaliyet: 100, paraBirimi: "TRY" },
        { kalanAdet: 5, birimMaliyet: 30, paraBirimi: "TRY" },
      ],
      "TRY",
    ),
    { adet: 7, tutar: 350, olculemeyen: 0 },
  );
  /** Birimi yazılmamış eski kayıt SEÇİLEN birim sayılır — tutara girer. */
  yakin(
    "para birimi null → seçilen birim sayılır",
    partiToplami([{ kalanAdet: 2, birimMaliyet: 50, paraBirimi: null }], "TRY"),
    { adet: 2, tutar: 100, olculemeyen: 0 },
  );
}
kosanBolumler.push("temiz toplam");

// --- 2) ÖLÇÜLEMEYEN — ADET GİRER, TUTAR GİRMEZ ------------------------
console.log("\n2) ölçülemeyen parti — adet girer, tutar girmez");
{
  /**
   * ⛔ ASIL KURAL: maliyeti bilinmeyen parti tutara GİRMEZ ama ADEDİ girer.
   * Adedi de düşürmek, elde duran malı yok saymak olurdu.
   */
  yakin(
    "maliyeti bilinmeyen — adet girer, tutar girmez, sayılır",
    partiToplami(
      [
        { kalanAdet: 2, birimMaliyet: 100, paraBirimi: "TRY" },
        { kalanAdet: 5, birimMaliyet: null, paraBirimi: "TRY" },
      ],
      "TRY",
    ),
    { adet: 7, tutar: 200, olculemeyen: 1 },
  );
  /**
   * ⚠ KUR ÇEVRİLMEZ (anayasa: para birimi VERİDEN gelir). EUR partisi
   * tutara girmez ve dışarıda kaldığı SAYILIR.
   */
  yakin(
    "başka para birimi — çevrilmez, sayılır",
    partiToplami(
      [
        { kalanAdet: 2, birimMaliyet: 100, paraBirimi: "TRY" },
        { kalanAdet: 4, birimMaliyet: 10, paraBirimi: "EUR" },
      ],
      "TRY",
    ),
    { adet: 6, tutar: 200, olculemeyen: 1 },
  );
  yakin(
    "iki sebep birden — ikisi de sayılır",
    partiToplami(
      [
        { kalanAdet: 1, birimMaliyet: 100, paraBirimi: "TRY" },
        { kalanAdet: 2, birimMaliyet: null, paraBirimi: "TRY" },
        { kalanAdet: 3, birimMaliyet: 10, paraBirimi: "EUR" },
      ],
      "TRY",
    ),
    { adet: 6, tutar: 100, olculemeyen: 2 },
  );
  /**
   * ⚠ HİÇBİRİ ÖLÇÜLEMİYORSA TUTAR SIFIR AMA "SIFIR TL MAL VAR" DEMEK
   * DEĞİL — `olculemeyen` o cümleyi kurmayı engelleyen tek şey.
   */
  yakin(
    "hepsi ölçülemez → tutar 0 ama olculemeyen dolu",
    partiToplami(
      [
        { kalanAdet: 2, birimMaliyet: null, paraBirimi: "TRY" },
        { kalanAdet: 3, birimMaliyet: null, paraBirimi: null },
      ],
      "TRY",
    ),
    { adet: 5, tutar: 0, olculemeyen: 2 },
  );
}
kosanBolumler.push("ölçülemeyen");

// --- 3) SEÇİLEN BİRİM EUR OLDUĞUNDA -----------------------------------
console.log("\n3) seçilen birim EUR — süzgeç ters yönde de çalışır");
{
  /**
   * ⚠ AYRIMIN İKİ YAKASI: üstteki bölümde EUR dışarıda kalıyordu. Yalnız o
   * yazılsaydı "EUR hep elenir" diye kodlanmış bir mutasyon YEŞİL kalırdı.
   */
  yakin(
    "EUR seçiliyken TRY elenir, EUR girer",
    partiToplami(
      [
        { kalanAdet: 2, birimMaliyet: 100, paraBirimi: "TRY" },
        { kalanAdet: 4, birimMaliyet: 10, paraBirimi: "EUR" },
      ],
      "EUR",
    ),
    { adet: 6, tutar: 40, olculemeyen: 1 },
  );
}
kosanBolumler.push("ters yön");

// --- 4) SIRADAKİ ROZETİ ------------------------------------------------
console.log("\n4) sıradaki rozeti");
{
  yakin("boş listede rozet YOK", siradakiPartiSirasi(0), -1);
  yakin("tek partide ilk satır", siradakiPartiSirasi(1), 0);
  yakin("çok partide yine ilk satır", siradakiPartiSirasi(5), 0);
}
kosanBolumler.push("sıradaki");

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
