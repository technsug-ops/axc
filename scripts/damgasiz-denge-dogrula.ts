import { damgasizDenge, dengeBozukMu } from "../src/lib/damgasiz-denge";

/**
 * ============================================================================
 *  DAMGASIZ DENGE BEKÇİSİ (K118, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run damgasiz-denge:dogrula
 *
 *  ⛔ NİYE SAF GÖVDE SINANIYOR, CANLI VERİ DEĞİL: karar önce canlı betiğin
 *  içindeydi ve MUTASYONLA SINANAMADI — bugün canlıda dengesizlik yok,
 *  `net < 0` ve `net > 0` dalları hiç çalışmıyor. İki mutasyon (neti sabit
 *  sıfıra çeviren · yön karşılaştırmasını ters çeviren) YEŞİL geçti.
 *  Sebep bekçi eksikliği değil, VERİNİN ayrımı gösterememesiydi.
 *  _(Anayasa: "mutasyon kaçıyorsa önce test verisi sorgulanır".)_
 *
 *  ⭐ KAYNAK TARAMASI YOK — gövde ÇAĞRILIP değeri ölçülüyor.
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

const H = (variantId: string, sku: string, quantityDelta: number) => ({
  variantId,
  sku,
  quantityDelta,
});

console.log("\nDAMGASIZ DENGE BEKÇİSİ");
console.log("=".repeat(60));

// --- 1) AYNA ÇİFTİ — CANLIDA BUGÜN OLAN HÂL ----------------------------
console.log("\n1) ayna çifti — net sıfır");
{
  const s = damgasizDenge([H("v1", "SKU-A", 1), H("v1", "SKU-A", -1)]);
  yakin("temiz sayısı", s.temiz, 1);
  yakin("giderleşmemiş YOK", s.giderlesmemis.length, 0);
  yakin("bilinmeyen giren YOK", s.bilinmeyenGiren.length, 0);
  yakin("denge BOZUK DEĞİL", dengeBozukMu(s), false);
  /** ⚠ ADETLER DE ÖLÇÜLÜYOR — "hepsi temiz" derken kaçını gördüğü yazmalı. */
  yakin("giriş adedi", s.girisAdet, 1);
  yakin("çıkış adedi", s.cikisAdet, 1);
  yakin("hareket sayısı", s.hareket, 2);
  yakin("incelenen varyant", s.incelenen, 1);
  /** Canlıdaki 14'lük çift de aynı kurala uyar. */
  const buyuk = damgasizDenge([H("v9", "SKU-Z", 14), H("v9", "SKU-Z", -14)]);
  yakin("14'lük ayna da temiz", buyuk.temiz, 1);
}
kosanBolumler.push("ayna");

// --- 2) MALİYETİ GİDERLEŞMEMİŞ — net < 0 -------------------------------
console.log("\n2) net < 0 — maliyeti giderleşmemiş mal ÇIKMIŞ");
{
  /**
   * ⛔ ASIL ARANAN HÂL. Damgasız çıkış, damgasız girişten FAZLA: o mal
   * defterden maliyeti giderleşmeden çıkmış demektir.
   */
  const s = damgasizDenge([H("v1", "SKU-A", 1), H("v1", "SKU-A", -3)]);
  yakin("giderleşmemiş 1 satır", s.giderlesmemis.length, 1);
  yakin("bilinmeyen giren YOK", s.bilinmeyenGiren.length, 0);
  yakin("temiz YOK", s.temiz, 0);
  yakin("denge BOZUK", dengeBozukMu(s), true);
  yakin("satır değerleri", s.giderlesmemis[0], {
    sku: "SKU-A",
    giris: 1,
    cikis: 3,
    net: -2,
  });
}
kosanBolumler.push("giderleşmemiş");

// --- 3) MALİYETİ BİLİNMEYEN GİREN — net > 0 ----------------------------
console.log("\n3) net > 0 — maliyeti bilinmeyen mal GİRMİŞ");
{
  /**
   * ⛔ AYRIMIN ÖTEKİ YAKASI. Yalnız `net < 0` sınansaydı, yön
   * karşılaştırmasını ters çeviren mutasyon YEŞİL kalırdı — ve gerçek bir
   * boşluk yanlış kovaya düşerdi.
   */
  const s = damgasizDenge([H("v1", "SKU-A", 5), H("v1", "SKU-A", -2)]);
  yakin("bilinmeyen giren 1 satır", s.bilinmeyenGiren.length, 1);
  yakin("giderleşmemiş YOK", s.giderlesmemis.length, 0);
  yakin("denge BOZUK", dengeBozukMu(s), true);
  yakin("satır değerleri", s.bilinmeyenGiren[0], {
    sku: "SKU-A",
    giris: 5,
    cikis: 2,
    net: 3,
  });
}
kosanBolumler.push("bilinmeyen giren");

// --- 4) KARIŞIK — İKİ YÖN AYNI ANDA, VE SIFIR DELTA ---------------------
console.log("\n4) karışık küme — iki yön birbirini GÖTÜRMEZ");
{
  /**
   * ⛔ İKİ YÖN TEK SAYIDA TOPLANMAZ. Bir varyant −2, öteki +3 iken toplam
   * net +1 olurdu ve "bir sorun var" cümlesi yanlış yöne işaret ederdi.
   * Varyant bazında ayrıldığı için ikisi de ayrı görünüyor.
   */
  const s = damgasizDenge([
    H("v1", "SKU-A", 1),
    H("v1", "SKU-A", -3),
    H("v2", "SKU-B", 5),
    H("v2", "SKU-B", -2),
    H("v3", "SKU-C", 2),
    H("v3", "SKU-C", -2),
  ]);
  yakin("giderleşmemiş 1", s.giderlesmemis.length, 1);
  yakin("bilinmeyen giren 1", s.bilinmeyenGiren.length, 1);
  yakin("temiz 1", s.temiz, 1);
  yakin("incelenen 3 varyant", s.incelenen, 3);
  yakin("denge BOZUK", dengeBozukMu(s), true);

  /**
   * ⚠ SIFIR DELTA BİR HAREKET DEĞİLDİR — hiçbir kovaya girmez.
   * `else` yazılsaydı sessizce ÇIKIŞ sayılır ve dengeyi bozardı.
   */
  const sifirli = damgasizDenge([
    H("v1", "SKU-A", 1),
    H("v1", "SKU-A", 0),
    H("v1", "SKU-A", -1),
  ]);
  yakin("sıfır delta dengeyi bozmaz", dengeBozukMu(sifirli), false);
  yakin("sıfır delta çıkışa sayılmaz", sifirli.cikisAdet, 1);
  yakin("boş küme temiz", dengeBozukMu(damgasizDenge([])), false);
}
kosanBolumler.push("karışık");

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
