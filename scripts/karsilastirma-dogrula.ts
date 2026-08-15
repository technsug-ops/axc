import { gunDegeri, gunMetni, pencereOlustur } from "../src/lib/donem";
import {
  KIYAS_ANAHTARLARI,
  ayGeriKaydir,
  ciroyaOran,
  degisim,
  kiyasCoz,
  kiyasPenceresi,
} from "../src/lib/rapor/karsilastirma";

/**
 * ============================================================================
 *  KARŞILAŞTIRMA DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run karsilastirma:dogrula
 *
 *  Karşılaştırma rakamı, bakılan rakamın kendisinden daha tehlikelidir:
 *  yanlışsa kullanıcı OLMAYAN bir eğilime göre karar verir. Bu yüzden
 *  pencere kaydırması ve yüzde işareti tek tek sınanıyor.
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
    console.log(`  HATA  ${ad}${gorulen === undefined ? "" : ` — ${JSON.stringify(gorulen)}`}`);
  }
}

const gun = (yil: number, ay: number, g: number) => gunDegeri({ yil, ay, gun: g });
/** Sabit "şu an": 15 Ağustos 2026. Testler takvimden bağımsız. */
const AN = new Date("2026-08-15T09:00:00Z");

console.log("=".repeat(70));
console.log("1) KIYAS PENCERESİ — AY KAYDIRMASI");
console.log("=".repeat(70));

{
  /**
   * BU AY = 1–15 Ağustos (ay sürüyor). Kıyas pencereleri aynı takvim
   * konumuna düşmeli: 1–15 Temmuz, 1–15 Mayıs, 1–15 Ağustos 2025.
   */
  const buAy = pencereOlustur("BU_AY", AN);
  kontrol(
    "seçili pencere 1–15 Ağustos 2026",
    gunMetni(buAy.baslangic) === "2026-08-01" && gunMetni(buAy.sonGun) === "2026-08-15",
    [gunMetni(buAy.baslangic), gunMetni(buAy.sonGun)],
  );

  const onceki = kiyasPenceresi(buAy, "onceki");
  kontrol(
    "önceki dönem = 1–15 TEMMUZ (17–31 Haziran DEĞİL)",
    gunMetni(onceki.baslangic) === "2026-07-01" && gunMetni(onceki.sonGun) === "2026-07-15",
    [gunMetni(onceki.baslangic), gunMetni(onceki.sonGun)],
  );
  kontrol(
    "  ...gün sayısı aynı (kısmi dönem tuzağı kapanıyor)",
    (onceki.bitisHaric.getTime() - onceki.baslangic.getTime()) ===
      (buAy.bitisHaric.getTime() - buAy.baslangic.getTime()),
  );

  const ucAy = kiyasPenceresi(buAy, "ucAy");
  kontrol(
    "3 ay öncesi = 1–15 MAYIS 2026",
    gunMetni(ucAy.baslangic) === "2026-05-01" && gunMetni(ucAy.sonGun) === "2026-05-15",
    [gunMetni(ucAy.baslangic), gunMetni(ucAy.sonGun)],
  );

  const gecenYil = kiyasPenceresi(buAy, "gecenYil");
  kontrol(
    "geçen yıl aynı dönem = 1–15 AĞUSTOS 2025",
    gunMetni(gecenYil.baslangic) === "2025-08-01" && gunMetni(gecenYil.sonGun) === "2025-08-15",
    [gunMetni(gecenYil.baslangic), gunMetni(gecenYil.sonGun)],
  );
  kontrol(
    "  ...yıl gerçekten değişti (ay aynı kaldı)",
    gecenYil.baslangic.getUTCFullYear() === 2025 && gecenYil.baslangic.getUTCMonth() === 7,
  );
}

{
  /** AY SONU KIRPILIR: 31 Mart'tan 1 ay geri 31 Şubat olamaz. */
  kontrol(
    "31 Mart − 1 ay = 28 Şubat (2026 artık yıl değil)",
    gunMetni(ayGeriKaydir(gun(2026, 3, 31), 1)) === "2026-02-28",
    gunMetni(ayGeriKaydir(gun(2026, 3, 31), 1)),
  );
  kontrol(
    "  ...artık yılda 29 Şubat'a düşer",
    gunMetni(ayGeriKaydir(gun(2024, 3, 31), 1)) === "2024-02-29",
    gunMetni(ayGeriKaydir(gun(2024, 3, 31), 1)),
  );
  kontrol(
    "yıl sınırı geçilir: 15 Ocak − 3 ay = 15 Ekim önceki yıl",
    gunMetni(ayGeriKaydir(gun(2026, 1, 15), 3)) === "2025-10-15",
    gunMetni(ayGeriKaydir(gun(2026, 1, 15), 3)),
  );

  /**
   * PENCERE BİR GÜN KISALMAZ. `bitisHaric` doğrudan kaydırılsaydı ayın
   * 1'i olan üst sınır bir önceki ayın 1'ine düşer ve pencere bir gün
   * eksilirdi — sessiz bir kayıp.
   */
  const tamAy = pencereOlustur("BU_AY", new Date("2026-07-31T09:00:00Z"));
  const kiyas = kiyasPenceresi(tamAy, "onceki");
  const gunSayisi = (p: { baslangic: Date; bitisHaric: Date }) =>
    Math.round((p.bitisHaric.getTime() - p.baslangic.getTime()) / 86400000);
  kontrol(
    "31 günlük Temmuz'un kıyası 30 günlük Haziran — gün kaybı yok",
    gunSayisi(tamAy) === 31 && gunSayisi(kiyas) === 30,
    [gunSayisi(tamAy), gunSayisi(kiyas)],
  );
}

console.log("");
console.log("=".repeat(70));
console.log("2) DEĞİŞİM — SAYI VE ORAN BİRLİKTE");
console.log("=".repeat(70));

{
  const d = degisim(1200, 1000);
  kontrol("mutlak fark 200", d.mutlak === 200, d.mutlak);
  kontrol("yüzde +%20", d.yuzde === 20, d.yuzde);

  const dus = degisim(800, 1000);
  kontrol("düşüşte mutlak −200", dus.mutlak === -200, dus.mutlak);
  kontrol("  ...yüzde −%20", dus.yuzde === -20, dus.yuzde);

  /**
   * EKSİDEN EKSİYE İYİLEŞME DOĞRU İŞARETLENİR. Ham bölme kullanılsaydı
   * (−50 − (−100)) / (−100) = −%50 çıkardı; yani zarardan çıkan bir dönem
   * "kötüleşti" görünürdü. Payda MUTLAK DEĞER olduğu için doğru.
   */
  const iyilesme = degisim(-50, -100);
  kontrol("zarar −100'den −50'ye: mutlak +50", iyilesme.mutlak === 50, iyilesme.mutlak);
  kontrol(
    "  ...yüzde +%50 (iyileşme, kötüleşme DEĞİL)",
    iyilesme.yuzde === 50,
    iyilesme.yuzde,
  );
  const kotulesme = degisim(-150, -100);
  kontrol("zarar büyürse yüzde EKSİ", kotulesme.yuzde === -50, kotulesme.yuzde);

  /** Zarardan kâra geçiş. */
  const donus = degisim(100, -100);
  kontrol("zarardan kâra: mutlak +200, yüzde +%200", donus.mutlak === 200 && donus.yuzde === 200);

  /** SIFIR PAYDA: yüzde YOK. */
  const yeni = degisim(500, 0);
  kontrol("kıyas dönemi 0 ise yüzde null (%100 DEĞİL)", yeni.yuzde === null, yeni.yuzde);
  kontrol("  ...ama mutlak fark yine de var (+500)", yeni.mutlak === 500, yeni.mutlak);
  kontrol("iki dönem de 0 ise yüzde null", degisim(0, 0).yuzde === null);
  kontrol("değişim yoksa yüzde 0", degisim(100, 100).yuzde === 0);
}

console.log("");
console.log("=".repeat(70));
console.log("3) CİROYA ORAN");
console.log("=".repeat(70));

{
  kontrol("NET 200 / ciro 2.000 = %10", ciroyaOran(200, 2000) === 10, ciroyaOran(200, 2000));
  kontrol("ciro 0 ise null (%0 DEĞİL)", ciroyaOran(200, 0) === null);
  kontrol("  ...eksi ciro da null", ciroyaOran(200, -100) === null);
  kontrol("zararda oran EKSİ çıkar", ciroyaOran(-100, 1000) === -10, ciroyaOran(-100, 1000));
  /** Panel ile AYNI tanım: brüt ciro paydası. */
  kontrol(
    "panel örneğiyle aynı sonuç (272,85 / 6.200 → %4,40)",
    Math.abs(ciroyaOran(272.85, 6200)! - 4.4008) < 0.01,
  );
}

console.log("");
console.log("=".repeat(70));
console.log("4) ADRES PARAMETRESİ");
console.log("=".repeat(70));

{
  for (const a of KIYAS_ANAHTARLARI) {
    kontrol(`"${a}" tanınıyor`, kiyasCoz(a) === a);
  }
  kontrol("boş parametre null (karşılaştırma kapalı)", kiyasCoz(undefined) === null);
  kontrol(
    "TANIMSIZ değer SESSİZCE varsayılana düşmez",
    kiyasCoz("gecenHafta") === null,
  );
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
