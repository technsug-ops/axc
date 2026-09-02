/**
 * ============================================================================
 *  K136a — HALİL'İN SEBEPLERİ ŞEMAYA OTURUYOR MU · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:iade-sebep-esleme
 *
 *  BETIK SINIFI: TEK_SEFERLIK — 8 siparişin yazım kapısı. HİÇBİR ŞEY YAZMAZ.
 *
 *  ── NİYE ─────────────────────────────────────────────────────────────────
 *  Halil 02.09.2026'da 8 siparişin iade sebebini pazaryerinin KENDİ
 *  etiketleriyle verdi. Bu, K136a'nın "sebep kaynağı YOK" engelini kaldırdı.
 *
 *  ⛔ AMA ETİKETİN VERİLMİŞ OLMASI, ŞEMAYA GİRDİĞİ ANLAMINA GELMEZ.
 *  `ReturnReason` enum'u 23.08.2026'da pazaryeri listesine göre genişletildi
 *  ama TAMAMI alınmadı. Bu betik hangi etiketin karşılığı OLDUĞUNU ve
 *  hangisinin `DIGER`e düştüğünü SAYAR — tahmin etmez.
 *
 *  ⚠ VE EN ÖNEMLİSİ: KARŞILIĞI OLMAYAN ETİKET UYDURULMAZ.
 *  "Beğenmedim" için `CAYMA` yazmak bir YORUMDUR; müşterinin söylediği o
 *  değil. Uydurulan sınıf sessizdir — ileride "kaç iade cayma" diye
 *  sorulduğunda yanlış cevap verir.
 *  _(Anayasa: "sınıf, kendisinden türetilemiyorsa BEYAN edilir";
 *  "aykırı değer uydurularak düzeltilmez".)_
 * ============================================================================
 */

import { ReturnReason } from "../src/generated/prisma/enums";

/**
 * Halil'in beyanı — 02.09.2026. Kendi kelimeleriyle, DEĞİŞTİRİLMEDEN.
 * _(Anayasa: "veritabanına yazılan veri ÇEVRİLMEZ; kayıtlar yazıldıkları
 * dilde kalıcıdır".)_
 */
const BEYAN: { siparis: string; sebep: string }[] = [
  { siparis: "4068972350", sebep: "Yanlış sipariş verdim" },
  { siparis: "4287210000", sebep: "Yanlış sipariş verdim" },
  { siparis: "4446089356", sebep: "Yanlış sipariş verdim" },
  { siparis: "4586626981", sebep: "Yanlış sipariş verdim" },
  { siparis: "4903455009", sebep: "Küçük geldi" },
  { siparis: "11385159467", sebep: "Yanlış sipariş verdim" },
  { siparis: "11409234590", sebep: "Beğenmedim" },
  { siparis: "11438301199", sebep: "Yanlış sipariş verdim" },
];

/**
 * Pazaryerinin kendi listesi — `docs/iade-sureci.md §3`, 23.08.2026'da
 * Trendyol müşteri uygulamasından ölçüldü. Dokuz seçenek.
 */
const PAZARYERI_LISTESI = [
  "Beğenmedim",
  "Yanlış sipariş verdim",
  "Daha iyi bir fiyat mevcut",
  "Bedeni/Ebatı Büyük Geldi",
  "Bedeni/Ebatı Küçük Geldi",
  "Yanlış ürün gönderildi",
  "Ürünümün parçası/aksesuarı eksik gönderildi",
  "Kusurlu ürün gönderildi",
  "Vazgeçtim",
];

/**
 * ⭐ EŞLEME YALNIZ ENUM YORUMUNDA BİREBİR ALINTILANAN ETİKETLER İÇİN KURULU.
 * Şemadaki yorum satırı tırnak içinde pazaryeri etiketini yazıyorsa eşleme
 * BELGELİDİR; yazmıyorsa eşleme bir YORUM olur ve buraya girmez.
 */
const BELGELI_ESLEME: Record<string, ReturnReason> = {
  "Bedeni/Ebatı Büyük Geldi": "BEDEN_BUYUK",
  "Bedeni/Ebatı Küçük Geldi": "BEDEN_KUCUK",
  "Daha iyi bir fiyat mevcut": "DAHA_UCUZ",
  "Ürünümün parçası/aksesuarı eksik gönderildi": "PARCA_EKSIK",
  "Yanlış ürün gönderildi": "YANLIS_URUN",
};

/** Halil'in kısalttığı etiketleri pazaryeri listesine geri bağlar. */
const KISALTMA: Record<string, string> = {
  "Küçük geldi": "Bedeni/Ebatı Küçük Geldi",
  "Büyük geldi": "Bedeni/Ebatı Büyük Geldi",
};

function main() {
  console.log("=".repeat(78));
  console.log("  İADE SEBEBİ — HALİL'İN BEYANI ↔ ŞEMA (salt okuma)");
  console.log("=".repeat(78));

  console.log("\n① ŞEMADAKİ `ReturnReason` DEĞERLERİ");
  const enumDegerleri = Object.values(ReturnReason);
  console.log(`   ${enumDegerleri.length} değer: ${enumDegerleri.join(" · ")}`);

  /** ② Pazaryeri listesinin kaçının şemada karşılığı var. */
  console.log("\n② PAZARYERİ LİSTESİ (9) ↔ ŞEMA — KAPSAMA");
  let kapsanan = 0;
  for (const etiket of PAZARYERI_LISTESI) {
    const karsilik = BELGELI_ESLEME[etiket];
    if (karsilik) kapsanan += 1;
    console.log(
      `   ${etiket.padEnd(46)} ${
        karsilik ? `→ ${karsilik}` : "⛔ KARŞILIĞI YOK → DIGER"
      }`,
    );
  }
  console.log(
    `\n   belgeli karşılığı olan : ${kapsanan}/${PAZARYERI_LISTESI.length}`,
  );
  console.log(
    `   ⛔ DIGER'e düşen        : ${PAZARYERI_LISTESI.length - kapsanan}`,
  );

  /** ③ Halil'in 8 beyanı — gerçek veri üzerinde kapsama. */
  console.log("\n③ HALİL'İN 8 BEYANI — GERÇEK VERİDE");
  let eslesen = 0;
  let digere = 0;
  const digerEtiketleri = new Map<string, number>();

  for (const b of BEYAN) {
    const tam = KISALTMA[b.sebep] ?? b.sebep;
    const listede = PAZARYERI_LISTESI.includes(tam);
    const karsilik = BELGELI_ESLEME[tam];
    if (karsilik) eslesen += 1;
    else {
      digere += 1;
      digerEtiketleri.set(tam, (digerEtiketleri.get(tam) ?? 0) + 1);
    }
    console.log(
      `   ${b.siparis.padEnd(13)} "${b.sebep}"`.padEnd(48) +
        (tam !== b.sebep ? ` [= "${tam}"]` : "") +
        (karsilik ? `  → ${karsilik}` : "  ⛔ → DIGER") +
        (listede ? "" : "  ⚠ pazaryeri listesinde YOK"),
    );
  }

  console.log("\n" + "=".repeat(78));
  console.log("  ÖZET");
  console.log("=".repeat(78));
  console.log(`   belgeli enum karşılığı bulunan : ${eslesen}/${BEYAN.length}`);
  console.log(`   ⛔ DIGER'e düşen                : ${digere}/${BEYAN.length}`);
  for (const [e, n] of [...digerEtiketleri.entries()].sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`      "${e}" × ${n}`);
  }

  console.log("\n   ⚠ 23.08.2026'DA ÖLÇÜLEN KUSUR AYNEN DURUYOR.");
  console.log("     Şema o gün pazaryeri listesine göre genişletildi ama");
  console.log("     listenin İLK İKİ maddesi (`Beğenmedim`, `Yanlış sipariş");
  console.log("     verdim`) alınmadı — ve gerçek veride en sık geçen ikisi");
  console.log("     tam olarak onlar. Bugün 8 iadenin 7'si DIGER'e düşüyor.");

  console.log("\n   ⛔ ÖNERİ YOK — İKİ YOL VAR, SEÇİM MİMARDA:");
  console.log("     A) `Return.note`ta Halil'in KENDİ CÜMLESİ saklanır.");
  console.log("        Şema değişmez, hiçbir sınıf uydurulmaz, veri kaybolmaz.");
  console.log("        Sorgulanamaz (gruplama/süzgeç yok) — geriye bakılır.");
  console.log("     B) Enum'a iki değer eklenir → migration + canlı koşum.");
  console.log("        ⚠ ENUM SIRASI: yeni değer SONA eklenir; araya");
  console.log("        sokulursa MySQL'de mevcut kayıtların anlamı KAYAR");
  console.log("        (27.08.2026 vakası — `YANLIS_URUN`).");
  console.log("\n     Ayırt edici soru (anayasa): bu veriyle ne yapılacak?");
  console.log("     · geriye bakmak → serbest metin YETER");
  console.log("     · SORGU (kaç iade hangi sebepten) → enum GEREKİR");
  console.log("=".repeat(78) + "\n");
}

main();
