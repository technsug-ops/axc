import {
  kanalDagilimi,
  paretoKur,
  paylariDenkle,
  yogunlasma,
  type DagilimGirdisi,
} from "../src/lib/panel/dagilim";

/**
 * ============================================================================
 *  DAĞILIM DOĞRULAMA (2c)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run dagilim:dogrula
 *
 *  Pareto yanlışsa kullanıcı YANLIŞ ÜRÜNE yoğunlaşır — bu, yanlış bir toplam
 *  göstermekten daha pahalıdır: para değil, ZAMAN ve odak kaybettirir.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;

function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen += 1;
    console.log(`  OK    ${ad}`);
  } else {
    kalan += 1;
    console.log(
      `  HATA  ${ad}${gorulen === undefined ? "" : ` — ${JSON.stringify(gorulen)}`}`,
    );
  }
}

const u = (ad: string, net2: number): DagilimGirdisi => ({
  anahtar: ad,
  ad,
  sku: `sku-${ad}`,
  net2,
});

console.log("=".repeat(70));
console.log("1) PARETO — KÂR EDENLER");
console.log("=".repeat(70));

{
  /** Toplam kâr 1.000: 500 · 250 · 150 · 100 → %50 · %25 · %15 · %10. */
  const p = paretoKur([u("A", 500), u("B", 250), u("C", 150), u("D", 100)]);

  kontrol("kâr toplamı 1.000", p.karToplami === 1000, p.karToplami);
  kontrol("AZALAN sıralı", p.karEdenler.map((s) => s.ad).join("") === "ABCD");
  kontrol("ilk ürünün payı %50", p.karEdenler[0].pay === 50, p.karEdenler[0].pay);
  kontrol(
    "kümülatif doğru artıyor (50 · 75 · 90 · 100)",
    p.karEdenler.map((s) => Math.round(s.kumulatif)).join(",") === "50,75,90,100",
    p.karEdenler.map((s) => s.kumulatif),
  );
  kontrol(
    "kümülatif KESİN 100'de biter (geçmez, geri düşmez)",
    p.karEdenler[p.karEdenler.length - 1].kumulatif === 100,
  );
  kontrol(
    "kümülatif hiç azalmıyor",
    p.karEdenler.every((s, i) => i === 0 || s.kumulatif >= p.karEdenler[i - 1].kumulatif),
  );
  kontrol(
    "kümülatif hiçbir yerde 100'ü AŞMIYOR",
    p.karEdenler.every((s) => s.kumulatif <= 100),
  );

  /** Kayan nokta artığı: üçe bölünen kâr. */
  const ucte = paretoKur([u("A", 100), u("B", 100), u("C", 100)]);
  kontrol(
    "üçe bölünen kârda da kümülatif TAM 100",
    ucte.karEdenler[2].kumulatif === 100,
    ucte.karEdenler[2].kumulatif,
  );
}

console.log("");
console.log("=".repeat(70));
console.log("2) ZARAR AYRI KUTUDA — KÜMÜLATİFE KARIŞMAZ");
console.log("=".repeat(70));

{
  const p = paretoKur([
    u("A", 500),
    u("B", 250),
    u("Z1", -300),
    u("C", 150),
    u("Z2", -80),
    u("D", 100),
  ]);

  /**
   * ⚠ ASIL KİLİT: negatifler kâr kümülatifine KARIŞMAMALI. Karışsaydı
   * kümülatif %100'ü aşıp geri düşerdi ve pareto eğrisi anlamsızlaşırdı.
   */
  kontrol(
    "kâr toplamı YALNIZ pozitiflerden (1.000)",
    p.karToplami === 1000,
    p.karToplami,
  );
  kontrol("kâr listesinde negatif YOK", p.karEdenler.every((s) => s.net2 > 0));
  kontrol(
    "kümülatif yine TAM 100'de biter",
    p.karEdenler[p.karEdenler.length - 1].kumulatif === 100,
  );
  kontrol(
    "  ...ve hiçbir satır 100'ü aşmıyor",
    p.karEdenler.every((s) => s.kumulatif <= 100),
  );

  kontrol("zarar edenler ayrı listede (2 ürün)", p.zararEdenler.length === 2);
  kontrol(
    "  ...EN ÇOK ZARAR ETTİREN ÜSTTE",
    p.zararEdenler[0].ad === "Z1",
    p.zararEdenler.map((s) => s.ad),
  );
  kontrol(
    "  ...zarar toplamı NEGATİF olarak duruyor (−380)",
    p.zararToplami === -380,
    p.zararToplami,
  );
  kontrol("zarar listesinde pozitif YOK", p.zararEdenler.every((s) => s.net2 < 0));
}

console.log("");
console.log("=".repeat(70));
console.log("3) SIFIR KÂR — HİÇBİR KUTUYA GİRMEZ, SAYILIR");
console.log("=".repeat(70));

{
  const p = paretoKur([u("A", 500), u("S1", 0), u("S2", 0), u("Z", -100)]);
  kontrol("sıfır kâr ürün kâr kutusunda YOK", p.karEdenler.every((s) => s.ad !== "S1"));
  kontrol("  ...zarar kutusunda da YOK", p.zararEdenler.every((s) => s.ad !== "S1"));
  kontrol("  ...ama SAYILIYOR (2 adet)", p.notrAdet === 2, p.notrAdet);
}

console.log("");
console.log("=".repeat(70));
console.log("4) BOŞ VE UÇ HÂLLER");
console.log("=".repeat(70));

{
  const bos = paretoKur([]);
  kontrol("girdi yoksa boş liste, çökme yok", bos.karEdenler.length === 0);
  kontrol("  ...toplamlar 0", bos.karToplami === 0 && bos.zararToplami === 0);
  kontrol("  ...yoğunlaşma null", yogunlasma(bos, 70) === null);

  const hepsiZarar = paretoKur([u("Z1", -100), u("Z2", -50)]);
  kontrol("hepsi zararda: kâr listesi boş", hepsiZarar.karEdenler.length === 0);
  kontrol("  ...zarar toplamı −150", hepsiZarar.zararToplami === -150);
  kontrol("  ...yoğunlaşma null (kâr yok)", yogunlasma(hepsiZarar, 70) === null);

  const tek = paretoKur([u("A", 500)]);
  kontrol("tek kâr eden: payı %100", tek.karEdenler[0].pay === 100);
  kontrol("  ...kümülatifi %100", tek.karEdenler[0].kumulatif === 100);
}

console.log("");
console.log("=".repeat(70));
console.log("5) YOĞUNLAŞMA CÜMLESİ");
console.log("=".repeat(70));

{
  const p = paretoKur([u("A", 500), u("B", 250), u("C", 150), u("D", 100)]);
  const y = yogunlasma(p, 70)!;
  /** %70'e ULAŞMIŞ olmalı, yaklaşmış değil: 50 → 75, yani 2 ürün. */
  kontrol("kârın %70'i 2 üründe", y.urunSayisi === 2, y);
  kontrol("  ...ve gerçekleşen yüzde %75", Math.round(y.yuzde) === 75, y.yuzde);
  kontrol("%100 hedefinde tüm ürünler", yogunlasma(p, 100)!.urunSayisi === 4);
  kontrol("%50 hedefinde 1 ürün", yogunlasma(p, 50)!.urunSayisi === 1);
}

console.log("");
console.log("=".repeat(70));
console.log("6) KANAL DAĞILIMI — TOPLAM %100");
console.log("=".repeat(70));

{
  /** Yuvarlama artığı doğuran klasik durum: üçe bölünen ciro. */
  const denk = paylariDenkle([100 / 3, 100 / 3, 100 / 3]);
  kontrol(
    "üçe bölünen paylar TAM %100'e toplanıyor",
    Math.abs(denk.reduce((t, y) => t + y, 0) - 100) < 1e-9,
    denk,
  );
  kontrol("  ...artık EN BÜYÜK paya eklendi", denk[0] > denk[1], denk);

  const d = kanalDagilimi([
    { kanalKodu: "TY", kanalAdi: "Trendyol", ciro: 6000, net2: 400 },
    { kanalKodu: "HB", kanalAdi: "Hepsiburada", ciro: 3000, net2: 500 },
    { kanalKodu: "N11", kanalAdi: "N11", ciro: 1000, net2: 100 },
  ]);
  kontrol(
    "ciro payları %60 · %30 · %10",
    d.kanallar.map((k) => k.ciroPayi).join(",") === "60,30,10",
    d.kanallar.map((k) => k.ciroPayi),
  );
  kontrol(
    "ciro payları toplamı %100",
    Math.abs(d.kanallar.reduce((t, k) => t + k.ciroPayi, 0) - 100) < 1e-9,
  );
  /**
   * CİRO VE KÂR DAĞILIMI FARKLI OLABİLİR — ve o fark ÖNEMLİDİR.
   * Trendyol cironun %60'ı ama kârın yalnız %40'ı; Hepsiburada tersi.
   */
  kontrol(
    "NET-2 payları ciro paylarından FARKLI (%40 · %50 · %10)",
    d.kanallar.map((k) => k.net2Payi).join(",") === "40,50,10",
    d.kanallar.map((k) => k.net2Payi),
  );
  kontrol(
    "  ...NET-2 payları da %100",
    Math.abs(d.kanallar.reduce((t, k) => t + (k.net2Payi ?? 0), 0) - 100) < 1e-9,
  );
}

console.log("");
console.log("=".repeat(70));
console.log("7) DAĞILIM ANLAMSIZSA SAHTE %100 YOK");
console.log("=".repeat(70));

{
  const tekKanal = kanalDagilimi([
    { kanalKodu: "TY", kanalAdi: "Trendyol", ciro: 6000, net2: 400 },
  ]);
  kontrol("tek kanal: dağılım ANLAMSIZ", tekKanal.anlamli === false);

  const ciroYok = kanalDagilimi([
    { kanalKodu: "TY", kanalAdi: "Trendyol", ciro: 0, net2: 0 },
    { kanalKodu: "HB", kanalAdi: "Hepsiburada", ciro: 0, net2: 0 },
  ]);
  kontrol("ciro yoksa dağılım ANLAMSIZ", ciroYok.anlamli === false);
  /**
   * ⚠ BU KONTROL GERÇEK BİR HATA YAKALADI (15.08.2026). İlk yazımda
   * `paylariDenkle` yuvarlama artığını KOŞULSUZ en büyük paya ekliyordu;
   * ciro sıfırken girdiler [0, 0] olduğu için artık 100 çıkıyor ve ekrana
   * "%100 Trendyol" yazılıyordu — hiç satış olmayan bir dönemde.
   * Denkleştirme artık yalnız ham toplam %100'e yakınsa çalışıyor.
   */
  kontrol("  ...paylar 0, sahte %100 yok", ciroYok.kanallar.every((k) => k.ciroPayi === 0));
  kontrol(
    "  ...denkleştirme eksik dağılımı TAMAMLAMIYOR (yuvarlama aracıdır)",
    paylariDenkle([10, 20]).join(",") === "10,20",
    paylariDenkle([10, 20]),
  );

  /**
   * TOPLAM NET-2 EKSİYSE PAY HESAPLANMAZ. Eksi bir toplamın içinde "pay"
   * anlamsızdır: işaretler birbirini yer ve %300 gibi rakamlar çıkar.
   */
  const zararli = kanalDagilimi([
    { kanalKodu: "TY", kanalAdi: "Trendyol", ciro: 6000, net2: -400 },
    { kanalKodu: "HB", kanalAdi: "Hepsiburada", ciro: 3000, net2: 100 },
  ]);
  kontrol(
    "toplam NET-2 eksiyse pay null (uydurma yüzde yok)",
    zararli.kanallar.every((k) => k.net2Payi === null),
  );
  kontrol("  ...ama ciro payı yine hesaplanıyor", zararli.kanallar[0].ciroPayi === 66.7);
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
