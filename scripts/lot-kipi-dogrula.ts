import {
  LOT_KIPLERI,
  VARSAYILAN_LOT_KIPI,
  lotKipiCoz,
  seciciCizilsinMi,
  secimZorunluMu,
} from "../src/lib/lot-kipi";

/**
 * ============================================================================
 *  LOT KİPİ BEKÇİSİ (K115, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run lot-kipi:dogrula
 *
 *  ⛔ NİYE: bu gövde satış formunda bir kutunun ÇIKIP ÇIKMAYACAĞINA karar
 *  veriyor. İki yönde de pahalı — çıkmazsa operatör bilerek seçemez,
 *  gereksiz çıkarsa her satışta anlamsız bir karar yüklenir ve kutu
 *  görmezden gelinmeye başlar.
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

console.log("\nLOT KİPİ BEKÇİSİ");
console.log("=".repeat(60));

// --- 1) KİP ÇÖZÜMÜ VE VARSAYILAN ----------------------------------------
console.log("\n1) kip çözümü — varsayılan bugünkü davranış");
{
  /**
   * ⛔ VARSAYILAN `HIBRIT`, `FIFO` DEĞİL. `FIFO` olsaydı K110 ile gelen
   * seçici, sütun eklendiği anda SESSİZCE kaybolurdu.
   */
  yakin("varsayılan HIBRIT", VARSAYILAN_LOT_KIPI, "HIBRIT");
  yakin("boş değer varsayılana düşer", lotKipiCoz(null), "HIBRIT");
  yakin("tanınmayan değer varsayılana düşer", lotKipiCoz("SACMA"), "HIBRIT");
  yakin("geçerli değer aynen döner", lotKipiCoz("LOT"), "LOT");
  yakin("üç kip tanımlı", [...LOT_KIPLERI], ["FIFO", "HIBRIT", "LOT"]);
}
kosanBolumler.push("kip çözümü");

// --- 2) SEÇİCİ: KİP KAPISI ----------------------------------------------
console.log("\n2) seçici — kip kapısı");
{
  const cokFarkli = ["100.00", "180.00"];
  /** `FIFO` kipinde seçici HİÇ çıkmaz — sistem seçer. */
  yakin(
    "FIFO kipinde çıkmaz",
    seciciCizilsinMi({ kip: "FIFO", maliyetler: cokFarkli }),
    false,
  );
  yakin(
    "HIBRIT kipinde çıkar",
    seciciCizilsinMi({ kip: "HIBRIT", maliyetler: cokFarkli }),
    true,
  );
  yakin(
    "LOT kipinde çıkar",
    seciciCizilsinMi({ kip: "LOT", maliyetler: cokFarkli }),
    true,
  );
}
kosanBolumler.push("kip kapısı");

// --- 3) SEÇİCİ: MALİYET ÖLÇÜTÜ ------------------------------------------
console.log("\n3) seçici — ölçüt 'parti sayısı' değil 'MALİYET farkı'");
{
  yakin("tek parti → çıkmaz", seciciCizilsinMi({ kip: "HIBRIT", maliyetler: ["100.00"] }), false);
  yakin("hiç parti → çıkmaz", seciciCizilsinMi({ kip: "HIBRIT", maliyetler: [] }), false);
  /**
   * ⭐ ASIL DARALTMA: aynı fiyata alınmış iki partiden hangisini seçtiğinin
   * HİÇBİR sonucu yok. Ölçüldü: 102 çok partili varyantın 61'inde
   * maliyetler aynı — gürültünün %60'ı bu ölçütle düşüyor.
   */
  yakin(
    "iki parti AYNI maliyet → çıkmaz",
    seciciCizilsinMi({ kip: "HIBRIT", maliyetler: ["100.00", "100.00"] }),
    false,
  );
  yakin(
    "iki parti FARKLI maliyet → çıkar",
    seciciCizilsinMi({ kip: "HIBRIT", maliyetler: ["100.00", "180.00"] }),
    true,
  );
  /**
   * ⚠ BİLİNMEYEN MALİYET FARK SAYILIR. `null`u "aynı" saymak operatörden
   * gerçek bir seçimi gizlerdi (anayasa: bilinmeyen aynıya çevrilmez).
   */
  yakin(
    "biri BİLİNMİYOR → çıkar",
    seciciCizilsinMi({ kip: "HIBRIT", maliyetler: ["100.00", null] }),
    true,
  );
  /**
   * ⚠ BU VAKA MUTASYON KAÇTIĞI İÇİN EKLENDİ. Üstteki örnek `null`
   * kapısını SINAMIYOR: `Number(null)` **0** döndürüyor (NaN değil), yani
   * kapı kalksa bile `[100, 0]` "farklı" çıkıp aynı cevabı veriyordu.
   * İKİSİ DE bilinmeyen olunca fark ancak kapı varsa görünür.
   * _(Anayasa: "mutasyon kaçıyorsa önce test verisi sorgulanır".)_
   */
  yakin(
    "İKİSİ DE bilinmiyor → yine çıkar",
    seciciCizilsinMi({ kip: "HIBRIT", maliyetler: [null, null] }),
    true,
  );
  /**
   * ⚠ VE TEK PARTİ KAPISI DA BU VAKAYLA SINANIYOR: maliyeti bilinmeyen
   * TEK parti. Uzunluk kapısı kalkarsa `null` kuralı devreye girer ve
   * seçilecek tek parti varken kutu çizilir.
   */
  yakin(
    "tek parti + maliyeti bilinmiyor → yine ÇIKMAZ",
    seciciCizilsinMi({ kip: "HIBRIT", maliyetler: [null] }),
    false,
  );
  /**
   * ⚠ KURUŞA: `Decimal`→float kuyruğu sahte fark üretmemeli. İki haneden
   * sonrası farklı ama kuruşta aynı → çıkmaz.
   */
  yakin(
    "kuruş altı fark → çıkmaz",
    seciciCizilsinMi({ kip: "HIBRIT", maliyetler: ["100.001", "100.004"] }),
    false,
  );
  yakin(
    "bir kuruş fark → ÇIKAR",
    seciciCizilsinMi({ kip: "HIBRIT", maliyetler: ["100.00", "100.01"] }),
    true,
  );
}
kosanBolumler.push("maliyet ölçütü");

// --- 4) ZORUNLULUK — TEK PARTİDE ZORLANMAZ ------------------------------
console.log("\n4) LOT kipinde zorunluluk");
{
  yakin("LOT + 2 parti → ZORUNLU", secimZorunluMu({ kip: "LOT", partiSayisi: 2 }), true);
  /**
   * ⭐ TEK PARTİLİ ÜRÜNDE ZORLANMAZ (kullanıcı sorusu 31.08.2026):
   * seçilecek bir şey yokken onay istemek, operatöre anlamsız bir adım
   * yükler ve zorunluluğu ucuzlatır.
   */
  yakin("LOT + 1 parti → zorunlu DEĞİL", secimZorunluMu({ kip: "LOT", partiSayisi: 1 }), false);
  yakin("LOT + 0 parti → zorunlu DEĞİL", secimZorunluMu({ kip: "LOT", partiSayisi: 0 }), false);
  yakin("HIBRIT → hiç zorunlu değil", secimZorunluMu({ kip: "HIBRIT", partiSayisi: 5 }), false);
  yakin("FIFO → hiç zorunlu değil", secimZorunluMu({ kip: "FIFO", partiSayisi: 5 }), false);
}
kosanBolumler.push("zorunluluk");

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
