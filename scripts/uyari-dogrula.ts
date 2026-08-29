/**
 * ============================================================================
 *  UYARI MERKEZİ DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run uyari:dogrula
 *
 *  Veritabanına GİTMEZ. Dört bölüm:
 *  1) KURAL — doğru koşulda tetikleniyor, tetiklenmemesi gerekende SUSUYOR.
 *  2) ROZET — en yüksek seviye kazanıyor, sayı uyarı adedi.
 *  3) YETKİ — göremeyeceği uyarı sayıya da girmiyor.
 *  4) EKRAN BAĞI — gösterilen adresin karşılığı VAR MI, sayı ile liste aynı
 *     fonksiyondan mı geliyor. ("Kural doğru mu" değil, "kural TESLİM
 *     EDİLEBİLİR mi" — anayasa notu 16.08.2026.)
 * ============================================================================
 */

import { readFileSync } from "node:fs";

import {
  canSayisi,
  canSeviyesi,
  izneGoreSuz,
  nakitAcigiOlcumu,
  uyarilariKur,
  type UyariOlcumleri,
  notrVarMi,
} from "../src/lib/uyari/kurallar";
import { maliyetsizMi, maliyetsizVaryantlar } from "../src/lib/uyari/maliyetsiz-stok";
import { yedekOlcumu } from "../src/lib/uyari/yedek";
import {
  supheSebepleri,
  supheliMi,
  SUPHELI_MALIYET_PAYI,
  SUPHELI_VERIM,
  SUPHE_OLCUMU,
} from "../src/lib/uyari/veri-supheli";
import { gecTeslimMi, GEC_TESLIM_GUN, TESLIM_OLCUMU } from "../src/lib/uyari/gec-teslim";
import {
  DOGRULAMA_SEBEPLERI,
  damgaKur,
  kaydiCoz,
  notZorunluMu,
  sebepGecerliMi,
  susturmaGecerliMi,
} from "../src/lib/uyari/veri-dogrulama";
import {
  UYARI_ADRESLERI,
  UYARI_ANAHTARLARI,
  UYARI_IZINLERI,
  UYARI_SEVIYESI,
} from "../src/lib/uyari/turler";
import type { Parti } from "../src/lib/stok";
import { KAR_SUZGECLERI } from "../src/lib/liste-suzgeci";

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

const bos: UyariOlcumleri = {
  nakitAcigi: { sayi: 0 },
  maliyetsizStok: { sayi: 0 },
  karHesaplanamayan: { sayi: 0 },
  hakedisGecikti: { sayi: 0 },
  cevapsizTalep: { sayi: 0 },
  yedekEski: { sayi: 0 },
  yedekYok: { sayi: 0 },
  veriSupheli: { sayi: 0 },
  kanalKodsuzStok: { sayi: 0 },
  hakedisBaglanmamis: { sayi: 0 },
  zararinaSatis: { sayi: 0 },
  iadeSayaciDoluyor: { sayi: 0 },
};

const parti = (kalanAdet: number, birimMaliyet: string | null): Parti => ({
  hareketId: "h",
  occurredAt: new Date("2026-01-01T00:00:00.000Z"),
  girenAdet: kalanAdet,
  kalanAdet,
  birimMaliyet,
  birimMaliyetParaBirimi: birimMaliyet === null ? null : "TRY",
  locationId: null,
});

console.log("=".repeat(70));
console.log("1) KURAL — tetiklenme ve SUSMA");
console.log("=".repeat(70));
{
  kontrol("hiç ölçüm yoksa uyarı YOK", uyarilariKur(bos).length === 0);

  /**
   * NAKİT AÇIĞI YALNIZ EKSİDE. Artı pozisyon uyarı değildir; sıfır da
   * değildir. "14 günde ₺0 açık" diye bir uyarı dikkati boşa harcar ve
   * her gün yanan bir lamba bir süre sonra hiç okunmaz.
   */
  kontrol("nakit artıda → uyarı YOK", nakitAcigiOlcumu(5000).sayi === 0);
  kontrol("nakit tam sıfır → uyarı YOK", nakitAcigiOlcumu(0).sayi === 0);
  const acik = nakitAcigiOlcumu(-12500);
  kontrol("nakit eksideyse UYARIR", acik.sayi === 1);
  kontrol("  ...tutar MUTLAK değer (eksi işareti taşınmaz)", acik.tutar === 12500);

  const dolu = uyarilariKur({
    nakitAcigi: nakitAcigiOlcumu(-12500),
    maliyetsizStok: { sayi: 3 },
    karHesaplanamayan: { sayi: 7 },
    hakedisGecikti: { sayi: 2, tutar: 4400 },
    cevapsizTalep: { sayi: 1 },
    yedekEski: { sayi: 0 },
    yedekYok: { sayi: 0 },
    veriSupheli: { sayi: 0 },
      kanalKodsuzStok: { sayi: 0 },
  hakedisBaglanmamis: { sayi: 0 },
  zararinaSatis: { sayi: 0 },
  iadeSayaciDoluyor: { sayi: 0 },
  });
  kontrol("beş ölçüm → beş uyarı", dolu.length === 5, dolu.length);
  kontrol("hepsi FAZ 1'de kırmızı", dolu.every((u) => u.seviye === "kirmizi"));

  /** SIFIR OLAN ELENİR — "0 satışın kârı hesaplanamıyor" satırı olmaz. */
  const kismi = uyarilariKur({
    ...bos,
    maliyetsizStok: { sayi: 3 },
  });
  kontrol("sıfır ölçümler listeye GİRMEZ", kismi.length === 1, kismi.length);
  kontrol("  ...kalan uyarı doğru olan", kismi[0]?.anahtar === "maliyetsizStok");

  /** Tutar taşıyan ve taşımayan uyarı ayrımı. */
  const hakedis = dolu.find((u) => u.anahtar === "hakedisGecikti");
  kontrol("geciken hakediş tutar taşıyor", hakedis?.tutar === 4400);
  kontrol("  ...para birimi de dolu", hakedis?.paraBirimi === "TRY");
  const maliyet = dolu.find((u) => u.anahtar === "maliyetsizStok");
  kontrol("maliyetsiz stok tutarsız (adet uyarısı)", maliyet?.tutar === null);
  kontrol("  ...para birimi de boş", maliyet?.paraBirimi === null);
}


/* ============================================================================
 *  YEDEK YAŞI — beşinci kırmızı (17.08.2026)
 * ==========================================================================*/
{
  console.log("");
  console.log("YEDEK YAŞI");

  const g = (gun: number) => new Date(Date.UTC(2026, 7, gun));
  const bugun = g(17);

  /**
   * GERÇEK VAKA: canlıda son yedek 13.08'di, bugün 17.08. Dört gün kimse
   * fark etmedi. Bu senaryo kuralın var oluş sebebidir.
   */
  const gercek = yedekOlcumu(g(13), bugun);
  kontrol("13.08 yedeği 17.08'de UYARIR", gercek.yedekEski.sayi === 4, gercek);
  kontrol("  ...sayı GÜN sayısıdır (4)", gercek.yedekEski.sayi === 4);
  kontrol("  ...'yedek yok' uyarısı ÇIKMAZ", gercek.yedekYok.sayi === 0);

  // EŞİK: 2 gün sessiz, 3 gün kırmızı. Sınırın iki yanı da sınanır.
  kontrol("bugün alınmış → sessiz", yedekOlcumu(g(17), bugun).yedekEski.sayi === 0);
  kontrol("1 gün → sessiz", yedekOlcumu(g(16), bugun).yedekEski.sayi === 0);
  kontrol("2 gün (eşik) → HÂLÂ sessiz", yedekOlcumu(g(15), bugun).yedekEski.sayi === 0);
  kontrol("3 gün → KIRMIZI", yedekOlcumu(g(14), bugun).yedekEski.sayi === 3);

  // HİÇ YEDEK YOK / OKUNAMADI — ayrı uyarı, uydurma gün sayısı YOK.
  const yok = yedekOlcumu(null, bugun);
  kontrol("yedek yoksa 'yedekYok' yanar", yok.yedekYok.sayi === 1);
  kontrol("  ...gün sayısı UYDURULMAZ", yok.yedekEski.sayi === 0);

  // İleri tarihli yedek (saat kayması) alarm üretmez.
  kontrol("ileri tarihli yedek uyarı DEĞİL", yedekOlcumu(g(19), bugun).yedekEski.sayi === 0);

  // Uyarı listesine gerçekten giriyor mu + adres/izin doğru mu?
  const liste = uyarilariKur({ ...bos, yedekEski: { sayi: 4 } });
  const u = liste.find((x) => x.anahtar === "yedekEski");
  kontrol("yedekEski uyarı listesine girer", u !== undefined);
  kontrol("  ...kırmızı", u?.seviye === "kirmizi");
  kontrol("  ...adres /ayarlar/disa-aktarma", u?.adres === "/ayarlar/disa-aktarma");
  kontrol("  ...izin veri.aktar", u?.izin === "veri.aktar");

  /**
   * İZİN SÜZGECİ: veri.aktar YOKSA uyarı hiç görünmez. Göremeyeceği bir
   * ekrana götüren uyarı, çıkmaz olan uyarıdan kötüdür.
   */
  const suzulmus = izneGoreSuz(liste, (izin) => izin !== "veri.aktar");
  kontrol(
    "veri.aktar yoksa yedek uyarısı GİZLENİR",
    suzulmus.every((x) => x.anahtar !== "yedekEski"),
  );

  /**
   * Sözlük metinleri AYRICA KONTROL EDİLMİYOR: aşağıdaki ekran bölümünde
   * `UYARI_ANAHTARLARI.every(...)` zaten HER anahtarın başlık ve eylem
   * metnini dolu olmaya zorluyor. Yeni anahtar eklemek o kontrolü
   * kendiliğinden genişletiyor — ikinci bir liste tutmak, biri güncellenip
   * ötekinin unutulacağı yeni bir borç olurdu.
   */
}

console.log("");
console.log("=".repeat(70));
console.log("2) MALİYETSİZ STOK — ÖLÇÜT (a)");
console.log("=".repeat(70));
{
  kontrol(
    "maliyeti bilinmeyen ve stokta duran parti UYARIR",
    maliyetsizMi([parti(5, null)]),
  );
  kontrol(
    "maliyeti bilinen parti SUSAR",
    !maliyetsizMi([parti(5, "120.0000")]),
  );
  /**
   * TÜKENMİŞ PARTİ SAYILMAZ. `kalanAdet > 0` şartı olmasa, maliyeti
   * bilinmeyen ama çoktan satılmış bir parti varyantı SONSUZA DEK uyarıda
   * tutardı: kullanıcı düzeltemez, uyarı hiç sönmez.
   */
  kontrol(
    "tükenmiş maliyetsiz parti SUSAR (sönmeyen uyarı olmaz)",
    !maliyetsizMi([parti(0, null)]),
  );
  kontrol(
    "karışık partide bir tanesi bile yeter",
    maliyetsizMi([parti(3, "50.0000"), parti(2, null)]),
  );
  kontrol("parti yoksa susar", !maliyetsizMi([]));

  const harita = new Map<string, Parti[]>([
    ["v1", [parti(5, null)]],
    ["v2", [parti(5, "10.0000")]],
    ["v3", [parti(0, null)]],
    ["v4", [parti(1, "10.0000"), parti(1, null)]],
  ]);
  const liste = maliyetsizVaryantlar(harita);
  kontrol("yalnız gerçekten maliyetsizler listeleniyor", liste.length === 2, liste);
  kontrol("  ...doğru varyantlar", liste.includes("v1") && liste.includes("v4"));
}

console.log("");
console.log("=".repeat(70));
console.log("3) ROZET VE YETKİ");
console.log("=".repeat(70));
{
  const uyarilar = uyarilariKur({
    ...bos,
    maliyetsizStok: { sayi: 3 },
    karHesaplanamayan: { sayi: 7 },
  });
  kontrol("rozet sayısı UYARI adedi, kayıt adedi DEĞİL", canSayisi(uyarilar) === 2);
  kontrol("  ...10 değil (3 + 7 toplanmıyor)", canSayisi(uyarilar) !== 10);
  kontrol("rozet seviyesi kırmızı", canSeviyesi(uyarilar) === "kirmizi");
  kontrol("uyarı yoksa seviye null (rozet çizilmez)", canSeviyesi([]) === null);

  /**
   * EN YÜKSEK SEVİYE KAZANIR. Ortalama ya da çoğunluk alınsaydı tek bir
   * para kaybı uyarısı amberlerin arasında sarıya boğulup gözden kaçardı.
   */
  const karisik = [
    { ...uyarilar[0], seviye: "amber" as const },
    { ...uyarilar[1], seviye: "kirmizi" as const },
  ];
  kontrol("bir kırmızı + bir amber → rozet KIRMIZI", canSeviyesi(karisik) === "kirmizi");
  kontrol(
    "hepsi amber → rozet amber",
    canSeviyesi(karisik.map((u) => ({ ...u, seviye: "amber" as const }))) ===
      "amber",
  );

  /**
   * YETKİ SÜZGECİ SAYIMDAN ÖNCE. Rozet 3 gösterip listede 1 uyarı çizmek
   * "iki uyarı saklanıyor" demek olurdu: hem kafa karıştırır hem saklananın
   * VARLIĞINI sızdırır.
   */
  const hepsi = uyarilariKur({
    nakitAcigi: nakitAcigiOlcumu(-100),
    maliyetsizStok: { sayi: 3 },
    karHesaplanamayan: { sayi: 7 },
    hakedisGecikti: { sayi: 2, tutar: 400 },
    yedekEski: { sayi: 0 },
    yedekYok: { sayi: 0 },
    veriSupheli: { sayi: 0 },
      kanalKodsuzStok: { sayi: 0 },
  hakedisBaglanmamis: { sayi: 0 },
  zararinaSatis: { sayi: 0 },
  iadeSayaciDoluyor: { sayi: 0 },
    cevapsizTalep: { sayi: 0 },
  });
  const kisitli = izneGoreSuz(hepsi, () => false);
  kontrol("kâr izni yoksa yalnız operasyonel uyarı kalıyor", kisitli.length === 1);
  kontrol("  ...kalan maliyetsiz stok", kisitli[0]?.anahtar === "maliyetsizStok");
  kontrol("  ...rozet sayısı da düşüyor (saklanan sayılmaz)", canSayisi(kisitli) === 1);
  kontrol("izin varsa dördü de görünüyor", izneGoreSuz(hepsi, () => true).length === 4);

  /**
   * CEVAPSIZ TALEP YALNIZ `destek.yonet` OLANDA. Bildiren kişi kendi
   * talebini zaten biliyor; ona "1 talep var" demek gürültüdür ve çanın
   * "her uyarı eyleme götürür" sözünü bozar — bildiren o talebi
   * ilerletemez.
   */
  const talepli = uyarilariKur({ ...bos, cevapsizTalep: { sayi: 2 } });
  kontrol("cevapsız talep uyarısı doğuyor", talepli.length === 1);
  kontrol(
    "  ...destek.yonet izni istiyor",
    UYARI_IZINLERI.cevapsizTalep === "destek.yonet",
  );
  kontrol(
    "  ...yetkisizde HİÇ görünmüyor",
    izneGoreSuz(talepli, () => false).length === 0,
  );
  kontrol(
    "  ...AÇIK taleplerin listesine gidiyor",
    UYARI_ADRESLERI.cevapsizTalep === "/talepler?durum=ACIK",
  );

  kontrol(
    "maliyetsiz stok izin İSTEMİYOR (depocu görebilir)",
    UYARI_IZINLERI.maliyetsizStok === null,
  );
  kontrol(
    "para uyarıları satis.kar.gor istiyor",
    UYARI_IZINLERI.nakitAcigi === "satis.kar.gor" &&
      UYARI_IZINLERI.karHesaplanamayan === "satis.kar.gor" &&
      UYARI_IZINLERI.hakedisGecikti === "satis.kar.gor",
  );
}

console.log("");
console.log("=".repeat(70));
console.log("4) EKRAN BAĞI — adres gerçekten VAR MI");
console.log("=".repeat(70));
{
  /**
   * ════════════════════════════════════════════════════════════════════
   *  "KURAL DOĞRU MU" DEĞİL, "KURAL TESLİM EDİLEBİLİR Mİ"
   * --------------------------------------------------------------------
   *  Sözleşme `hakedisGecikti` için `/hakedis?durum=geciken` yazıyordu;
   *  o ekranda "durum" süzgeci HİÇ YOK. Uyarı oraya bağlansaydı kullanıcı
   *  süzülmemiş bir listeye düşer ve saydığımız kümeyi bulamazdı — K9'daki
   *  gider kategorisi tuzağının aynısı.
   *
   *  Bu bölüm her adresin karşılığını KAYNAKTA arar. Mimar talimatı da bu
   *  süzgeçten geçer: talimat niyeti söyler, karşılığı olup olmadığını
   *  kontrol etmek uygulayanın işidir.
   * ════════════════════════════════════════════════════════════════════
   */
  const stokSayfasi = readFileSync("src/app/stok/page.tsx", "utf8");
  const satisSuzgeci = readFileSync("src/lib/liste-suzgeci.ts", "utf8");
  const canBileseni = readFileSync("src/components/uyari-cani.tsx", "utf8");
  /**
   * YORUMLAR SOYULUR. Bu kontrol ilk yazıldığında kırmızı yandı: dosyanın
   * BAŞLIK YORUMUNDA "çan kendi `prisma.sale.count` sorgusunu yazsaydı…"
   * cümlesi geçiyordu ve test o cümleyi gerçek bir çağrı sandı. Kod
   * doğruydu, testin gözü bozuktu.
   *
   * Bu tuzağa bu projede defalarca düşüldü — kaynak metnine bakan her
   * kontrol, KODA bakmalı, anlatıya değil.
   */
  const yorumsuz = (metin: string) =>
    metin.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const toplayici = yorumsuz(readFileSync("src/lib/uyari/topla.ts", "utf8"));
  const tr = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Uyari?: Record<string, string>;
  };

  kontrol(
    "her uyarının bir adresi var",
    UYARI_ANAHTARLARI.every((a) => (UYARI_ADRESLERI[a] ?? "").startsWith("/")),
  );
  kontrol(
    "maliyetsiz stok adresinin SÜZGECİ gerçekten var",
    UYARI_ADRESLERI.maliyetsizStok === "/stok?maliyet=yok" &&
      stokSayfasi.includes("maliyet?: string") &&
      stokSayfasi.includes('maliyet === "yok"'),
  );
  kontrol(
    "  ...stok süzgeci ÇANLA AYNI fonksiyonu çağırıyor (kopya yok)",
    stokSayfasi.includes("maliyetsizVaryantlar(") &&
      toplayici.includes("maliyetsizVaryantlar("),
  );
  /**
   * HESAPLAMAK YETMEZ, UYGULAMAK GEREKİR.
   *
   * İlk teslimde süzgeç listesi hesaplanıyor ama sorguya HİÇ bağlanmıyordu:
   * `?maliyet=yok` bütün stoğu gösterecekti ve kullanıcı süzgecin
   * çalıştığını sanacaktı. Yalnız ESLint'in "kullanılmayan değişken"
   * uyarısı yakaladı — yani tesadüfen. Artık test de tutuyor.
   */
  kontrol(
    "  ...hesaplanan süzgeç sorguya GERÇEKTEN bağlanıyor",
    stokSayfasi.includes("id: { in: varyantSuzgeci }"),
  );
  kontrol(
    "kârsız satış adresinin süzgeci gerçekten var",
    UYARI_ADRESLERI.karHesaplanamayan === "/satislar?kar=eksik" &&
      satisSuzgeci.includes('kar === "eksik"'),
  );
  kontrol(
    "hakediş adresi OLMAYAN bir süzgece bel bağlamıyor",
    !UYARI_ADRESLERI.hakedisGecikti.includes("?"),
  );

  /**
   * KOPYA YASAK. Çan kendi `sale.count` sorgusunu yazsaydı, görev
   * kutusundaki koşul bir gün değişip çandaki kalırdı; aynı ekranda iki
   * farklı sayı görünürdü.
   */
  kontrol(
    "kârsız satış sayısı GÖREV KUTUSUNDAN geliyor",
    toplayici.includes("gorevSayilariniTopla()") &&
      toplayici.includes("gorevSayilari.karHesaplanamayan"),
  );
  kontrol(
    "  ...çan kendi satış sorgusunu YAZMIYOR",
    !toplayici.includes("prisma.sale.count"),
  );
  kontrol(
    "nakit açığı PANELİN motorundan geliyor",
    toplayici.includes("nakitTakvimiKur("),
  );
  /**
   * HAKEDİŞ VADESİ KALEMDE. `Settlement.paidAt` bir içe aktarma partisine
   * aittir; üst kayıttan okunursa uyarı SESSİZCE boş çıkar — hata "0 uyarı"
   * diye görünür ve kimse fark etmez.
   */
  kontrol(
    "hakediş vadesi KALEMDEN okunuyor (üst kayıttan değil)",
    toplayici.includes("prisma.settlementItem.aggregate") &&
      toplayici.includes("dueDate"),
  );
  kontrol(
    "  ...bugün vadesi dolan HENÜZ gecikmiş sayılmıyor",
    toplayici.includes("lt: bugun"),
  );

  /** AÇIK SIFIR — uyarı yoksa çan gizlenmez, "temiz" yazar. */
  kontrol(
    "uyarı yokken 'temiz' mesajı çiziliyor",
    canBileseni.includes('t("temiz")') &&
      typeof tr.Uyari?.temiz === "string" &&
      tr.Uyari.temiz.length > 0,
  );
  kontrol(
    "  ...yükleniyor ile SIFIR ayrı hâller",
    canBileseni.includes("uyarilar === null") &&
      canBileseni.includes("uyarilar.length === 0"),
  );
  kontrol(
    "  ...yüklenmemişken rozet çizilmiyor (sahte '0 uyarı' güvencesi yok)",
    canBileseni.includes("uyarilar === null ? 0 : canSayisi"),
  );

  /** Her uyarı EYLEME götürür: satır tıklanabilir. */
  kontrol(
    "uyarı satırı tıklanabilir ve adrese gidiyor",
    canBileseni.includes("href={u.adres}"),
  );
  kontrol(
    "her uyarının başlık ve eylem metni sözlükte DOLU",
    UYARI_ANAHTARLARI.every(
      (a) =>
        (tr.Uyari?.[`baslik_${a}`] ?? "").length > 0 &&
        (tr.Uyari?.[`eylem_${a}`] ?? "").length > 0,
    ),
  );
  /**
   * ⚠ PARAMETRE SÖZLEŞMESİ — bileşen `baslik_`e {sayi} GEÇER, `eylem_`e
   * GEÇMEZ. `eylem_` metnine {sayi} yazmak çalışma anında next-intl
   * hatası verir: ekran patlar, kod derlenir. Tam da "kural doğru mu
   * değil, teslim edilebilir mi" tuzağı — testte görünmez, canlıda
   * çöker.
   */
  kontrol(
    "eylem metinleri PARAMETRESİZ",
    UYARI_ANAHTARLARI.every((a) => !(tr.Uyari?.[`eylem_${a}`] ?? "").includes("{")),
  );
  kontrol(
    "çan mobilde 44px dokunma hedefi",
    canBileseni.includes("size-11"),
  );
}

console.log("");
console.log("=".repeat(70));
console.log("F2-A) İMKÂNSIZ DEĞER — eşikler ölçümden");
console.log("=".repeat(70));
{
  const g = (net2: number, maliyet: number, ciro: number) => ({ net2, maliyet, ciro });

  /**
   * ⚠ GERÇEK VAKA — Philips OneBlade. NET-2 981,17 · maliyet 27,16 ·
   * ciro 1.434. İki ölçüt de yakalamalı; biri kâr üzerinden, öteki
   * fiyat üzerinden bakıyor.
   */
  const oneblade = supheSebepleri(g(981.17, 27.16, 1434));
  kontrol("OneBlade yakalanıyor", oneblade.length === 2, oneblade);
  kontrol("  ...verim sebebi", oneblade.includes("VERIM_YUKSEK"));
  kontrol("  ...maliyet payı sebebi", oneblade.includes("MALIYET_DUSUK"));

  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR — meşru yüksek marjlı
   * kalem YAKALANMAMALI. Anker 322: NET-2 428,32 · maliyet 279 · verim
   * %154 (ölçülen p95). Eşik %100 seçilseydi bu ilk gün yanlış alarm
   * verirdi; test tam o seçimi kırmızıya düşürüyor.
   */
  const anker = supheSebepleri(g(428.32, 279, 1000));
  kontrol("meşru yüksek marj (p95, %154) YAKALANMIYOR", anker.length === 0, anker);

  /** Eşik ölçülen p95'in ÜSTÜNDE olmalı — yoksa dağılımın içine girer. */
  kontrol("verim eşiği p95'in üstünde", SUPHELI_VERIM > SUPHE_OLCUMU.verimP95);
  kontrol("maliyet payı eşiği p5'in altında", SUPHELI_MALIYET_PAYI < SUPHE_OLCUMU.maliyetPayiP5);

  /**
   * ⚠ EKSİK VERİ ŞÜPHE DEĞİLDİR — kendi uyarısı var. İki uyarının aynı
   * kaydı saydırması rozeti şişirir ve ikisine de güveni azaltır.
   */
  kontrol("maliyet bilinmiyorsa şüphe YOK", !supheliMi({ net2: 500, maliyet: null, ciro: 1000 }));
  kontrol("NET bilinmiyorsa şüphe YOK", !supheliMi({ net2: null, maliyet: 10, ciro: 1000 }));
  kontrol("maliyet sıfırsa bölme YAPILMAZ", !supheliMi(g(500, 0, 1000)));
  kontrol("ciro sıfırsa pay hesaplanmaz", supheSebepleri(g(500, 10, 0)).every((x) => x !== "MALIYET_DUSUK"));

  /** Normal kalem sessiz kalmalı — ortanca verim %23, maliyet payı %66. */
  kontrol("ortanca kalem sessiz", !supheliMi(g(230, 1000, 1515)));
}

console.log("");
console.log("=".repeat(70));
console.log("F2-B) SEVİYE + ROZET");
console.log("=".repeat(70));
{
  const uyarilar = uyarilariKur({
    ...bos,
    nakitAcigi: { sayi: 1, tutar: 500 },
    veriSupheli: { sayi: 1 },
    kanalKodsuzStok: { sayi: 2 },
  });
  kontrol("üç uyarı da doğdu", uyarilar.length === 3, uyarilar.length);

  /** Seviye artık tanımdan geliyor — kural gövdesi karar vermiyor. */
  kontrol("nakit KIRMIZI", uyarilar.find((u) => u.anahtar === "nakitAcigi")?.seviye === "kirmizi");
  kontrol("veri şüpheli AMBER", uyarilar.find((u) => u.anahtar === "veriSupheli")?.seviye === "amber");
  kontrol("kanal kodsuz NÖTR", uyarilar.find((u) => u.anahtar === "kanalKodsuzStok")?.seviye === "notr");

  /**
   * ⚠ ROZET NÖTR SAYMAZ (mimar kararı). Rozet EYLEM ÇAĞRISIDIR; bilgi
   * sayacına dönerse gerçek kırmızı geldiği gün de okunmaz.
   */
  kontrol("rozet nötrü SAYMIYOR", canSayisi(uyarilar) === 2, canSayisi(uyarilar));
  kontrol("rozet rengi en yükseği alıyor", canSeviyesi(uyarilar) === "kirmizi");

  /** ⚠ AYIRT EDİCİ: yalnız nötr varken rozet SIFIR ama nokta VAR. */
  const yalnizNotr = uyarilariKur({ ...bos, kanalKodsuzStok: { sayi: 2 } });
  kontrol("yalnız nötr → rozet sayısı 0", canSayisi(yalnizNotr) === 0);
  kontrol("  ...ama nötr VARLIK NOKTASI yanıyor", notrVarMi(yalnizNotr));
  kontrol("hiç uyarı yoksa nokta da YOK", !notrVarMi(uyarilariKur(bos)));

  /** Amber tek başınayken rozet amber olmalı, kırmızıya kaçmamalı. */
  const amberTek = uyarilariKur({ ...bos, veriSupheli: { sayi: 1 } });
  kontrol("yalnız amber → rozet amber", canSeviyesi(amberTek) === "amber");
  kontrol("  ...ve rozete GİRER", canSayisi(amberTek) === 1);

  /** Her anahtarın seviyesi tanımlı — yeni anahtar seviyesiz kalmasın. */
  for (const a of UYARI_ANAHTARLARI) {
    kontrol(`  seviye tanımlı: ${a}`, UYARI_SEVIYESI[a] !== undefined);
  }
}



console.log("");
console.log("=".repeat(70));
console.log("F2-D) ADRESLER VE EKRAN BAĞI");
console.log("=".repeat(70));
{
  /**
   * ⚠ GÖSTERDİĞİM LİNK VAR OLAN BİR EKRANA MI GİDİYOR — ve o ekran AYNI
   * KÜMEYİ mi gösteriyor? Tasarım raporunda `/kanal-kodlari?eksik=1`
   * yazmıştım; MENÜ ETİKETİNE bakmışım, rotaya değil. Gerçek rota
   * `/kanal-sku` ve oradaki `eksik=1` BAŞKA bir şey demek ("oranı eksik
   * kod"), bizim uyarımız "kodu hiç olmayan varyant". Sayı 2 derken liste
   * bambaşka bir küme gösterirdi.
   */
  const stok = readFileSync("src/app/stok/page.tsx", "utf8");
  const satislar = readFileSync("src/app/satislar/page.tsx", "utf8");
  const suzgec = readFileSync("src/lib/liste-suzgeci.ts", "utf8");

  kontrol("kanalKodsuz adresi /stok?kanal=yok", UYARI_ADRESLERI.kanalKodsuzStok === "/stok?kanal=yok");
  kontrol("  ...stok ekranı `kanal` parametresini okuyor", /kanal\?: string/.test(stok));
  kontrol("  ...ve AYNI gövdeyi çağırıyor", /kanalKodsuzStokluVaryantlar\(\)/.test(stok));

  kontrol("veriSupheli adresi /satislar?veri=supheli", UYARI_ADRESLERI.veriSupheli === "/satislar?veri=supheli");
  kontrol("  ...satış ekranı `veri` parametresini okuyor", /veri\?: string/.test(satislar));
  kontrol("  ...ve AYNI gövdeyi çağırıyor", /supheliVeriBulgusu\(/.test(satislar));
  kontrol("  ...süzgeç kimlik listesini uyguluyor", /veri === "supheli"/.test(suzgec));


  /** Süzgeç istenmiş ama küme boşsa liste BOŞ çıkmalı — sessiz kayıp yok. */
  kontrol("boş küme 'hepsini göster'e düşmüyor", /supheliIdler \?\? \[\]/.test(suzgec));

  /** Nötr nokta çanda var mı ve RAKAMSIZ mı? */
  const can = readFileSync("src/components/uyari-cani.tsx", "utf8");
  kontrol("çanda nötr varlık noktası var", /notrVarMi\(uyarilar\)/.test(can));
  kontrol("  ...yalnız rozet YOKKEN çiziliyor", /sayi === 0 && notrVarMi/.test(can));
  kontrol("  ...ve rakam taşımıyor", /aria-hidden/.test(can));
}

console.log("");
console.log("=".repeat(70));
console.log("F2-E) HAYALET KIRMIZI — muafiyet ve BEYANI");
console.log("=".repeat(70));
{
  /**
   * ⚠ CANLI BULGU 19.08.2026: çan "67 hakediş kalemi gecikti · ₺137.975"
   * diyordu. Ölçüm: üç hakediş partisinin 177 farklı sipariş numarasının
   * HİÇBİRİ bir satış kaydıyla eşleşmiyor. Bilmediğimiz bir şeyi
   * "gecikti" diye iddia ediyorduk.
   */
  const topla = readFileSync("src/lib/uyari/topla.ts", "utf8");
  kontrol(
    "geciken sayımı satışa BAĞLI kalemle sınırlı",
    /gecikmeKosulu\(bugun\), saleId: \{ not: null \}/.test(topla) &&
      /lt: bugun/.test(topla),
  );
  kontrol(
    "  ...ve muafiyet AYRICA sayılıyor (saleId: null)",
    /gecikmeKosulu\(bugun\), saleId: null/.test(topla),
  );
  /**
   * ⚠ KÖR MUTASYON DERSİ: beyanı `{ sayi: 0 }` yapan mutasyon YEŞİL
   * kaldı — kural doğru çalışıyordu, ekrana BAĞLANMASI koptuğu hâlde.
   * Muafiyetin uygulanması ile BEYAN EDİLMESİ ayrı iki şey; ikisi ayrı
   * sınanmalı, yoksa ₺138K sessizce yok olur.
   */
  kontrol(
    "  ...beyan ÖLÇÜLEN sayıdan besleniyor (sabit değil)",
    /hakedisBaglanmamis: \{ sayi: baglanmamisHakedis \}/.test(topla),
  );

  /**
   * ⚠ MUAFİYET SESSİZ OLAMAZ. Bu, muafiyeti kaldıran mutasyondan FARKLI
   * bir kusuru yakalar: muafiyet doğru uygulanıp beyanı unutulursa
   * ₺138K hiçbir yerde görünmeden yok olur.
   */
  const beyan = uyarilariKur({ ...bos, hakedisBaglanmamis: { sayi: 83 } });
  kontrol("bağlanmamış kalem uyarı ÜRETİYOR", beyan.length === 1);
  kontrol("  ...seviyesi NÖTR (sorun değil, beyan)", beyan[0]?.seviye === "notr");
  kontrol("  ...rozete GİRMİYOR", canSayisi(beyan) === 0);
  kontrol("  ...ama nokta yanıyor", notrVarMi(beyan));
  kontrol("  ...adresi hakediş ekranı", UYARI_ADRESLERI.hakedisBaglanmamis === "/hakedis");

  /** Bağlanmış ve gecikmiş kalem HÂLÂ kırmızı — kural kalkmadı, kapsam daraldı. */
  const gercek = uyarilariKur({ ...bos, hakedisGecikti: { sayi: 3, tutar: 900 } });
  kontrol("bağlı+geciken hâlâ KIRMIZI", gercek[0]?.seviye === "kirmizi");
  kontrol("  ...ve rozete giriyor", canSayisi(gercek) === 1);
}

console.log("");
console.log("=".repeat(70));
console.log("F2-F) ZARARINA SATIŞ + ÜÇ SEVİYELİ EKRAN");
console.log("=".repeat(70));
{
  const topla = readFileSync("src/lib/uyari/topla.ts", "utf8");
  const form = readFileSync("src/app/satislar/kar-durumu.tsx", "utf8");
  const can = readFileSync("src/components/uyari-cani.tsx", "utf8");

  /**
   * ⚠ SAYI İLE LİSTE AYNI KOŞULDAN. Süzgeç `/satislar?kar=zarar` şunu
   * uyguluyor: profitStatus CALCULATED **VE** net2 < 0. Sayaç yalnız
   * net2 < 0 sayarsa, kârı henüz hesaplanmamış kalem sayıya girer ama
   * listede çıkmaz — panel 5, liste 4 vakasının aynısı.
   */
  kontrol("sayaç profitStatus şartını da taşıyor", /profitStatus: "CALCULATED",/.test(topla));
  kontrol("  ...ve net2 < 0", /net2Amount: \{ lt: 0 \}/.test(topla));
  kontrol("  ...adres MEVCUT süzgeci kullanıyor", UYARI_ADRESLERI.zararinaSatis === "/satislar?kar=zarar");
  kontrol("  ...ve KAR_SUZGECLERI 'zarar'ı tanıyor", KAR_SUZGECLERI.includes("zarar"));
  /**
   * ⚠ SEVİYE DE SINANIR. Zararına satış PARA KAYBIDIR; amber ya da nötre
   * düşürmek onu rozetin dışına ya da arka plana atardı — Faz 1'in
   * `nakitAcigi` ile aynı sınıf.
   */
  kontrol("zararına satış KIRMIZI", UYARI_SEVIYESI.zararinaSatis === "kirmizi");
  kontrol(
    "  ...ve rozete giriyor",
    canSayisi(uyarilariKur({ ...bos, zararinaSatis: { sayi: 2 } })) === 1,
  );

  /**
   * ⚠ FORM KENDİ KÂRINI HESAPLAMAZ. K5 motoru çağrılır; ikinci bir NET
   * hesabı aynı satışı formda bir türlü, kayıttan sonra başka türlü
   * gösterebilirdi.
   */
  /**
   * ⚠ KÖR MUTASYON DERSİ: `simulasyonKur(` deseni ARAMAK yetmedi —
   * kararı veren satır elle hesaba çevrildiğinde bile desen dosyada
   * kalıyordu (alt dilim önerisi hâlâ motoru çağırıyor). Kontrol artık
   * KARARI VEREN satıra bakıyor.
   */
  kontrol("form K5 motorunu çağırıyor", /simulasyonKur\(/.test(form));
  kontrol(
    "  ...ve HÜKMÜ VEREN NET motordan geliyor",
    /const s = simulasyonKur\(girdi\);/.test(form),
  );
  kontrol("  ...alt dilim önerisi de motordan", /birAltDilim\(/.test(form));
  kontrol("  ...varış noktası hükmüyle", /yonHukmu\(/.test(form));
  kontrol("  ...oran FORMDAKİ değerden okunuyor", /komisyonOraniMetni/.test(form));
  /** Kaydı engellemez — uyarı, engel değil. */
  kontrol("form uyarısı kaydı ENGELLEMİYOR", !/disabled/.test(form));

  /**
   * ⚠ SESSİZLİK DE BİR CEVAPTIR, AMA YANLIŞ CEVAP — Halil önerisi
   * 20.08.2026. Kâr durumunda ekran susuyordu ve sessizlik "hesap
   * çalışıyor mu?" tereddüdü yaratıyordu.
   */
  /**
   * ⚠ CÜMLE DAYANAĞINI TAŞIR — mimar düzeltmesi 20.08.2026.
   * Kutu "tahmini: maliyet açık partilerin ORTALAMASI" diyordu; bu
   * MEKANİZMAYI anlatıyor, RAKAMI vermiyordu. Kelime vardı, sayı yoktu.
   */
  /**
   * ⚠ DÖRDÜNCÜ KEZ AYNI TUZAK: aynı desen İKİ yerde geçiyor (kâr cümlesi
   * ve zarar cümlesi); birini silen mutasyon ötekini ayakta bırakıyor ve
   * test yeşil kalıyordu. Kontrol artık her cümleyi KENDİ BLOĞUNDA
   * arıyor.
   */
  const karBloku = form.slice(form.indexOf('t("karDurumu"'), form.indexOf('if (s.net2 === 0)'));
  const zararBloku = form.slice(form.indexOf('t("zararUyarisi"'), form.indexOf('t("zararTahmin")'));
  for (const [ad, blok] of [["kâr", karBloku], ["zarar", zararBloku]] as const) {
    kontrol(`${ad} cümlesi maliyeti RAKAMLA veriyor`, /maliyet: bicim\.para\(birimMaliyet/.test(blok));
    kontrol(`  ...${ad} cümlesi satış fiyatını da`, /satis: bicim\.para\(fiyat/.test(blok));
  }
  const sz2 = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Satis?: Record<string, string>;
  };
  kontrol("  ...sözlükte iki dayanak da yer alıyor",
    (sz2.Satis?.zararUyarisi ?? "").includes("{maliyet}") &&
      (sz2.Satis?.zararUyarisi ?? "").includes("{satis}"));
  kontrol("  ...kâr cümlesinde de (aynı iddia, aynı ispat)",
    (sz2.Satis?.karDurumu ?? "").includes("{maliyet}") &&
      (sz2.Satis?.karDurumu ?? "").includes("{satis}"));

  kontrol("kâr hâli de konuşuyor", /karDurumu/.test(form));
  kontrol("  ...ve koşul NET-2 > 0'a bağlı", /s\.net2 > 0/.test(form));
  /** ⚠ TAM SIFIR YEŞİL DEĞİL — üçüncü ekranda da aynı kural. */
  kontrol("başabaş yeşil DEĞİL", /s\.net2 === 0/.test(form) && /karBasabas/.test(form));
  /** Yeşil satır dilim/yön mantığına GİRMEZ — o K5'in işi. */
  /**
   * ⚠ İLK DENEME YANLIŞ ŞEYİ SINIYORDU: "karDurumu ile birAltDilim
   * arasında 400 karakter yok" demek KAYNAK SIRASINI ölçmek olurdu,
   * davranışı değil. Doğrusu: kâr dalı ERKEN DÖNÜYOR mu — yani öneri
   * hesabına hiç varmadan mı çıkıyor?
   */
  const karDali = form.slice(
    form.indexOf("if (s.net2 > 0) {"),
    form.indexOf("if (s.net2 === 0) {"),
  );
  kontrol("kâr dalı ERKEN dönüyor (öneriye varmadan)",
    karDali.includes("return (") && !karDali.includes("oneri"));
  /** Tahmin olduğu yazılı. */
  kontrol("  ...tahmin olduğu beyan ediliyor", /zararTahmin/.test(form));

  /** Üç seviye ayrı ayrı gruplanıyor mu, ve nötr NÖTR renkte mi? */
  kontrol("ekran seviyeye göre gruplanıyor", /SEVIYE_SIRASI\.map/.test(can));
  kontrol("  ...sıra kırmızı→amber→nötr", /\["kirmizi", "amber", "notr"\]/.test(can));
  kontrol("  ...boş seviye başlığı çizilmiyor", /grup\.length === 0\) return null/.test(can));
  /**
   * ⚠ CANLI TUR BULGUSU 19.08.2026: nötr kutular amber'la AYNI görünüyordu.
   * Sayım ayrışmıştı (rozete girmiyorlar) ama GÖRÜNÜM ayrışmamıştı.
   * "bilgi" (mavi) de yetmez — renkli kutu hiyerarşide amberle aynı
   * ağırlıkta okunur. Nötr GRİ/SOLUK olmalı.
   */
  kontrol("nötr satır GRİ/SOLUK (notr)", /notr: "notr",/.test(can));
  kontrol("  ...amber değil", !/notr: "uyari"/.test(can));
  kontrol("  ...mavi de değil", !/notr: "bilgi"/.test(can));
  kontrol("  ...renk eşlemesi tüketici (ikili koşul kalmadı)",
    !/seviye === "kirmizi" \? "olumsuz" : "uyari"/.test(can));

  /** Grup başlıkları sözlükten — koda gömülü metin yasak. */
  const sozluk = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Uyari?: Record<string, string>;
  };
  for (const sv of ["kirmizi", "amber", "notr"]) {
    kontrol(
      `  grup başlığı sözlükte: ${sv}`,
      (sozluk.Uyari?.[`grup_${sv}`] ?? "").length > 0,
    );
  }
  for (const anahtar of ["zararUyarisi", "zararAltDilimKurtarir", "zararAltDilimKurtarmaz"]) {
    const satis = (JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
      Satis?: Record<string, string>;
    }).Satis;
    kontrol(`  form metni sözlükte: ${anahtar}`, (satis?.[anahtar] ?? "").length > 0);
  }
}

console.log("");
console.log("=".repeat(70));
console.log("F2-G) GECİKME SINIRI TEK KAYNAK");
console.log("=".repeat(70));
{
  const topla = readFileSync("src/lib/uyari/topla.ts", "utf8");
  /**
   * ⚠ İKİ SAYI TEK SINIRDAN. Kırmızı sayaç ile muafiyet beyanı yalnızca
   * `saleId` ile ayrılmalı; gecikme tanımı ikisinde de aynı. Ayrı
   * yazılsalardı biri değişip öteki unutulur ve "kaç kalem muaf tutuldu"
   * sorusunun cevabı kırmızı sayıyla tutmazdı.
   */
  kontrol("gecikme koşulu TEK fonksiyonda", /function gecikmeKosulu\(/.test(topla));
  kontrol("  ...kırmızı onu kullanıyor", /gecikmeKosulu\(bugun\), saleId: \{ not: null \}/.test(topla));
  kontrol("  ...muafiyet de onu kullanıyor", /gecikmeKosulu\(bugun\), saleId: null/.test(topla));
  kontrol(
    "  ...ikinci bir dueDate koşulu KALMADI",
    (topla.match(/dueDate: \{ not: null/g) ?? []).length === 1,
  );

  /**
   * ⚠ SINIR İŞ TAKVİMİ GÜNÜ — `new Date()` DEĞİL. Vadesi BUGÜN dolan
   * kalem henüz gecikmiş değildir. Sınır kayarsa aynı veriden farklı
   * sayı çıkar: 19.08.2026'da sonda `new Date()` ile 83, ekran `bugun`
   * ile 67 diyordu.
   */
  kontrol("sınır `bugun`, `new Date()` değil", /lt: bugun/.test(topla));

  /**
   * ⚠ METİN SAYIYLA UYUMLU OLMALI. "N kalem satışa bağlanamadı" derken
   * N gecikme sayımından ÇIKARILAN sayıydı (67); bağsız kalem toplamı
   * 658. Metin, sahip olmadığı bir anlamı iddia ediyordu.
   */
  const sz = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Uyari?: Record<string, string>;
  };
  kontrol(
    "muafiyet başlığı 'sayım dışında' diyor (bağsız TOPLAM değil)",
    (sz.Uyari?.baslik_hakedisBaglanmamis ?? "").includes("sayımı dışında"),
  );
}

console.log("");
console.log("=".repeat(70));
console.log("F2-H) DOĞRULANDI — susturma kaydın HÂLİNE bağlı");
console.log("=".repeat(70));
{
  const d = { net2: 981.17, maliyet: 27.16, ciro: 1434 };

  kontrol("aynı hâl → susturma GEÇERLİ", susturmaGecerliMi(d, { ...d }));

  /**
   * ⚠ TASARIMIN KALBİ: hâl değişirse susturma DÜŞER. Kalıcı muafiyet,
   * sonradan GERÇEKTEN bozulan bir kaydı sonsuza kadar sessizleştirirdi.
   * Üç alan da ayrı ayrı sınanıyor — yalnız maliyete bakmak yetmezdi.
   */
  kontrol("maliyet değişti → DÜŞER", !susturmaGecerliMi(d, { ...d, maliyet: 1100 }));
  kontrol("NET-2 değişti → DÜŞER", !susturmaGecerliMi(d, { ...d, net2: 500 }));
  kontrol("ciro değişti → DÜŞER", !susturmaGecerliMi(d, { ...d, ciro: 1500 }));

  /**
   * ⚠ KURUŞ BİRİM SEÇİMİDİR, TOLERANS DEĞİL. Decimal→float kuyruğu
   * (981.1666999…) yüzünden susturmanın HAKSIZ YERE düşmesi, "bir daha
   * doğrula" döngüsü yaratırdı. Ama BİR KURUŞ fark gerçek bir değişimdir
   * ve düşürür.
   */
  kontrol("kuruş altı kuyruk susturmayı DÜŞÜRMEZ",
    susturmaGecerliMi(d, { ...d, net2: 981.1712 }));
  kontrol("BİR KURUŞ fark DÜŞÜRÜR",
    !susturmaGecerliMi(d, { ...d, net2: 981.18 }));

  /** Sebep kapalı küme; serbest metin susturamaz. */
  kontrol("geçerli sebep tanınıyor", sebepGecerliMi("KUPON_INDIRIM"));
  kontrol("uydurma sebep REDDEDİLİYOR", !sebepGecerliMi("CANIM_ISTEDI"));
  kontrol("dört sebep tanımlı", DOGRULAMA_SEBEPLERI.length === 4);
  kontrol("DİĞER'de not ZORUNLU", notZorunluMu("DIGER"));
  kontrol("  ...ötekilerde değil", !notZorunluMu("KUPON_INDIRIM"));

  /**
   * ⚠ BOZUK İZ SUSTURMAZ. Çözülemeyen bir kayıt "doğrulanmış" sayılsaydı,
   * bozuk JSON bir kalemi sonsuza kadar sessizleştirebilirdi.
   */
  kontrol("bozuk JSON çözülmüyor", kaydiCoz("{bozuk") === null);
  kontrol("damgasız kayıt çözülmüyor", kaydiCoz(JSON.stringify({ sebep: "DIGER" })) === null);
  kontrol("sebepsiz kayıt çözülmüyor", kaydiCoz(JSON.stringify({ damga: d })) === null);
  kontrol("geçerli kayıt çözülüyor",
    kaydiCoz(JSON.stringify({ damga: d, sebep: "KUPON_INDIRIM", not: null }))?.sebep === "KUPON_INDIRIM");

  kontrol("damga kuruşa yuvarlanıyor", damgaKur({ net2: 1.005, maliyet: 2.004, ciro: 3 }).maliyet === 2);

  /** ---- EKRAN VE SUNUCU BAĞI ---- */
  const veri = readFileSync("src/lib/uyari/faz2-veri.ts", "utf8");
  const eylem = readFileSync("src/app/satislar/dogrula-actions.ts", "utf8");
  const buton = readFileSync("src/app/satislar/dogrula-butonu.tsx", "utf8");
  const liste = readFileSync("src/app/satislar/page.tsx", "utf8");

  kontrol("sayım doğrulanmışı düşürüyor", /susturmaGecerliMi\(damga, bugunku\)/.test(veri));
  kontrol("  ...ve iz AuditLog'dan okunuyor", /action: DOGRULAMA_EYLEMI/.test(veri));

  /**
   * ⚠ DAMGA SUNUCUDA KURULUR. İstemciden gelseydi biri bugünkü değerlere
   * uydurulmuş bir damga göndererek kaydı susturabilirdi.
   */
  kontrol("damga SUNUCUDA kuruluyor", /damgaKur\(\{ net2: net2!/.test(eylem));
  kontrol("  ...ve şüpheli olmayan kayıt reddediliyor", /supheliMi\(\{ net2, maliyet, ciro \}\)/.test(eylem));
  kontrol("  ...yetki satis.duzenle", /yetkiIste\("satis\.duzenle"\)/.test(eylem));
  kontrol("  ...eski iz SİLİNMİYOR (create, update değil)", /auditLog\.create/.test(eylem) && !/auditLog\.update/.test(eylem));

  kontrol("düğme onay diyaloğu açıyor", /Dialog/.test(buton));
  kontrol("  ...geçicilik ekranda yazılı", /dogrulaGecicilik/.test(buton));
  kontrol("  ...DİĞER'de onay kilitli", /notEksik/.test(buton));
  kontrol("düğme YALNIZ şüpheli kalemde çiziliyor", /supheliKalemHaritasi\.get\(satis\.id\)/.test(liste));

  const sz = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Satis?: Record<string, string>;
  };
  for (const a of ["dogrulaBaslik", "dogrulaGecicilik", "dogrulaNotZorunlu"]) {
    kontrol(`  sözlük: ${a}`, (sz.Satis?.[a] ?? "").length > 0);
  }
}

console.log("");
console.log("=".repeat(70));
console.log("F2-I) GEÇ TESLİM UYARISI + İZ DOĞUM BEYANI");
console.log("=".repeat(70));
{
  const g = (m: string) => new Date(m + "T00:00:00.000Z");

  /**
   * ⚠ EŞİK DAĞILIMIN BOŞ BANDINA KONULDU (11–20 gün, n=113'te SIFIR kayıt).
   * Mimar "30+" önerdi; ölçüm düzeltti — 30 seçilseydi 21 günlük kayıt
   * KAÇARDI. Örnek veri ayrımın iki yakasını gösteriyor.
   */
  kontrol("gövde (p95=7 gün) UYARMIYOR", gecTeslimMi(g("2026-07-01"), g("2026-07-08")) === null);
  kontrol("10 gün UYARMIYOR (gövdenin ucu)", gecTeslimMi(g("2026-07-01"), g("2026-07-11")) === null);
  kontrol("21 gün UYARIYOR (30 olsaydı kaçardı)",
    gecTeslimMi(g("2026-07-01"), g("2026-07-22"))?.tur === "GEC");
  kontrol("48 gün UYARIYOR (Schafer)", gecTeslimMi(g("2026-06-26"), g("2026-08-13"))?.tur === "GEC");
  kontrol("30 gün UYARIYOR (LEGO)", gecTeslimMi(g("2026-07-20"), g("2026-08-19"))?.tur === "GEC");

  kontrol("eşik boş bandın İÇİNDE",
    GEC_TESLIM_GUN > TESLIM_OLCUMU.bosBant[0] - 1 && GEC_TESLIM_GUN < TESLIM_OLCUMU.bosBant[1] + 1);
  kontrol("  ...ve p95'in üstünde", GEC_TESLIM_GUN > TESLIM_OLCUMU.p95);

  /** ⚠ TERS FARK DA UYARIR — ölçümde min −28 çıktı, imkânsız ve sessiz geçilemez. */
  const ters = gecTeslimMi(g("2026-08-13"), g("2026-07-16"));
  kontrol("teslim siparişten ÖNCEyse uyarıyor", ters?.tur === "TERS", ters);

  kontrol("tarih yoksa hüküm YOK", gecTeslimMi(null, g("2026-07-01")) === null);

  /** Form SORAR, ENGELLEMEZ — mal gerçekten geç gelmiş olabilir. */
  const form = readFileSync("src/app/alimlar/[id]/mal-kabul/mal-kabul-formu.tsx", "utf8");
  kontrol("form uyarıyı çiziyor", /gecTeslimMi\(/.test(form));
  kontrol("  ...ve sipariş tarihini alıyor", /siparisTarihi: string/.test(form));
  const sayfa = readFileSync("src/app/alimlar/[id]/mal-kabul/page.tsx", "utf8");
  kontrol("  ...sayfa siparişi geçiriyor", /siparisTarihi=\{alim\.purchasedAt/.test(sayfa));

  /** ---- İZ DOĞUM BEYANI ---- */
  const can = readFileSync("src/components/uyari-cani.tsx", "utf8");
  kontrol("iz doğum beyanı KUTUNUN İÇİNDE", /izDogumu/.test(can));
  kontrol("  ...yalnız veriSupheli kutusunda", /u\.anahtar === "veriSupheli"/.test(can));
  kontrol("  ...tarih sabitten okunuyor", /IZ_DOGUM_TARIHI/.test(can));
}

console.log("");
console.log("=".repeat(70));
console.log("F2-J) HALİL TURU DÜZELTMELERİ");
console.log("=".repeat(70));
{
  const can = readFileSync("src/components/uyari-cani.tsx", "utf8");
  const liste = readFileSync("src/app/satislar/page.tsx", "utf8");
  const form = readFileSync("src/app/satislar/kar-durumu.tsx", "utf8");
  const buton = readFileSync("src/app/satislar/dogrula-butonu.tsx", "utf8");

  /**
   * ⚠ B4a — ROZET BAYAT KALIYORDU. Veri yalnız ilk çizimde çekiliyordu;
   * kullanıcı bir uyarıyı çözdükten sonra çanda ESKİ SAYIYI görüyor,
   * tıklayınca boş liste açılıyordu. "Sayı ile liste ayrıştı" hatasının
   * ZAMAN eksenindeki hâli.
   */
  kontrol("çan açıldıkça tazeleniyor", /\}, \[acik\]\);/.test(can));
  kontrol("  ...ve tek seferlik değil", !/\}, \[\]\);/.test(can));

  /**
   * ⚠ B4b — SÜZGEÇ PARAMETRELERİ TAŞINMIYORDU. Üç şey birden bozuktu:
   * boş mesajı yanlış, başka süzgece dokununca `veri=supheli` sessizce
   * düşüyor, Excel süzgeci yok sayıyordu.
   */
  kontrol("veri süzgeci taşınıyor", /veri: p\.veri,/.test(liste));

  /** ⚠ AÇIK SIFIR: süzgeç boşaldıysa bu bir BAŞARIDIR. */
  /**
   * ⚠ KÖR MUTASYON DERSİ (ÜÇÜNCÜ KEZ): anahtarın dosyada bulunması
   * yetmiyor — koşulu `false` yapan mutasyon anahtarı yerinde bırakıyor.
   * Kontrol KOŞULA bakmalı, metne değil.
   */
  kontrol("şüpheli süzgeç boşalınca 'kalmadı ✓'", /bosSupheliVeri/.test(liste));
  /**
   * ⚠ DESENİN VARLIĞI DEĞİL, KULLANIM YERİ. İlk deneme yine kör kaldı:
   * dosyada `p.veri === "supheli"` İKİ yerde geçiyor (küme hesabı ve boş
   * mesaj); birini bozan mutasyon ötekini ayakta bırakıyordu. Kontrol
   * artık koşulu SONUCUYLA birlikte arıyor.
   */
  kontrol(
    "  ...boş mesaj koşulu süzgece bağlı",
    /p\.veri === "supheli"\s*\?\s*t\("bosSupheliVeri"\)/.test(liste),
  );
  kontrol(
    "  ...küme hesabı da süzgece bağlı",
    /p\.veri === "supheli"\s*\?\s*await supheliVeriBulgusu/.test(liste),
  );

  /**
   * ⚠ C2/C3 — FORM SESSİZ KALIYORDU. Ölçüm: stoklu 121 varyant×kanal
   * zemininin 86'sında dilim verisi YOK (HB 0/54, N11 0/13). Öneri
   * yokluğu kusur değil VERİ yokluğuydu — ama form bunu söylemiyordu.
   */
  kontrol("form öneri yoksa SEBEBİNİ söylüyor", /zararDilimYok/.test(form));
  kontrol(
    "  ...ve koşul ÖNERİNİN yokluğuna bağlı",
    /\{oneri === null \? \(/.test(form),
  );
  kontrol("  ...ve 'zaten en alt dilim' halini ayırıyor", /zararEnAltDilim/.test(form));

  /**
   * ⚠ B3 — ALAN KOŞULSUZ, ETİKET KOŞULLU. İlk kontrol ikisini
   * ayırmıyordu: "zorunlu" ekini koşullu çizen düzeltme testi kırmızıya
   * düşürdü, oysa ALAN hâlâ koşulsuzdu. Sınanan şey doğru olmalı —
   * girdi her sebepte var mı, koşullu sarmalayıcı içinde mi?
   */
  const notBloku = buton.slice(
    buton.indexOf('htmlFor="dogrula-not"'),
    buton.indexOf('id="dogrula-not"'),
  );
  kontrol("not GİRDİSİ koşulsuz çiziliyor", /id="dogrula-not"/.test(buton));
  kontrol(
    "  ...girdi koşullu bir dalın içinde DEĞİL",
    !/\{notZorunluMu\(sebep\) \? \(\s*<Input/.test(buton),
  );
  kontrol("  ...yalnız ZORUNLU eki koşullu", /notZorunluMu\(sebep\)/.test(notBloku));
  /** Küçük ekranda kesilmesin — alanın "görünmemesi" bu yüzden olabilirdi. */
  kontrol("diyalog taşarsa kaydırılabiliyor", /overflow-y-auto/.test(buton));
  /** Yer tutucu sebebe göre — ne yazılacağını gösteriyor. */
  kontrol("yer tutucu sebebe göre", /dogrulaNotIpucu_\$\{sebep\}/.test(buton));

  const sz = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Satis?: Record<string, string>;
  };
  for (const a of ["bosSupheliVeri", "zararDilimYok", "zararEnAltDilim"]) {
    kontrol(`  sözlük: ${a}`, (sz.Satis?.[a] ?? "").length > 0);
  }
}

console.log("");
console.log("=".repeat(70));
console.log("F2-K) KANAL TAŞIMASI KÂRI TAZELİYOR");
console.log("=".repeat(70));
{
  /**
   * ⚠ CANLI BULGU 20.08.2026: "Kanal hesabını değiştir" kanalı
   * değiştiriyor ama kârı yeniden HESAPLAMIYORDU. Kanal değişince
   * kesinti kuralları değişir (HB: komisyon KDV'si + ₺12,60 hizmet +
   * %0,8 ödeme; TY: ₺13,19 sabit) — taşınan satışın NET'i ESKİ kanalın
   * kurallarıyla kalıyor ve ekranda DOĞRU görünüyordu.
   *
   * Önceki davranış bilinçliydi ("snapshot geçmişin kaydıdır") ama
   * yanlış tarafta duruyordu: orada korunan geçmiş değil, HATAYDI.
   */
  const eylem = readFileSync("src/app/satislar/[id]/hesap-actions.ts", "utf8");
  /**
   * ⚠ DESEN DEĞİL, İFADE. `if (false) await karYenidenYaz({` yazan
   * mutasyon deseni ayakta bırakıyordu; kontrol artık çağrının KOŞULSUZ
   * bir ifade olduğunu (satır başında, iki boşluk girintili) sınıyor.
   */
  kontrol(
    "kanal taşıması kârı tazeliyor",
    /^ {2}await karYenidenYaz\(\{/m.test(eylem),
  );
  /**
   * ⚠ BEŞİNCİ KEZ AYNI TUZAK: `revalidatePath` IMPORT satırında da
   * geçiyor ve `indexOf` onu buluyordu — sıra kontrolü hep yanlış
   * konuma bakıyordu. İşaret ÇAĞRI yerine bağlandı.
   */
  kontrol(
    "  ...tazeleme işlemin PARÇASI (ayrı adım değil)",
    eylem.indexOf("prisma.sale.update") < eylem.indexOf("await karYenidenYaz(") &&
      eylem.indexOf("await karYenidenYaz(") <
        eylem.indexOf('revalidatePath(`/satislar/'),
  );

  /**
   * ⚠ ORAN TAŞINMAZ. Yeni kanalın oranını çekmek, kullanıcının girdiği
   * oranı sessizce ezmek olurdu; oran ayrı bir düzeltmedir.
   */
  kontrol(
    "  ...komisyon oranı KALEMDEN (ezilmiyor)",
    eylem.includes("k.commissionRate === null"),
  );
  kontrol("  ...komisyon TUTARI null (düzenleme yoluyla aynı)", /commissionAmount: null/.test(eylem));
  /** Kargo çevirisi tek kaynaktan — betik kendi çarpanını yazmasın. */
  kontrol("  ...kargo kdvDahilKargo ile", /kdvDahilKargo\(/.test(eylem));

  const sz3 = JSON.parse(readFileSync("messages/tr.json", "utf8")) as {
    Satis?: Record<string, string>;
  };
  kontrol("diyalog metni artık 'otomatik' diyor",
    (sz3.Satis?.hesabiDegistirNotu ?? "").includes("OTOMATİK"));
  kontrol("  ...başarı mesajı da tazelemeyi söylüyor",
    (sz3.Satis?.hesabiDegisti ?? "").includes("yeniden hesapland"));
}

console.log("");
console.log("=".repeat(70));
console.log("F2-L) İPTAL DURUMU RAKAMLARDAN ÖNCE OKUNUR");
console.log("=".repeat(70));
{
  /**
   * ⚠ CANLI BULGU 20.08.2026 (`sfsfsf` ekran görüntüsü): iptal kutusu
   * sayfanın EN ALTINDAYDI. Okuyan önce toplam tutarı, kalemleri ve
   * NET-2'yi görüyor, iptali en son öğreniyordu — "NET-2 ₺438,72" ibaresi
   * o satışın kazandırdığı sanılmasına yol açar. Oysa iptal edilen satış
   * HİÇ DOĞMAMIŞ sayılır ve hiçbir toplama girmez.
   */
  const detay = readFileSync("src/app/satislar/[id]/page.tsx", "utf8");
  const iptalKutusu = detay.indexOf('tIpt("iptalEdildi"');
  const bilgiKarti = detay.indexOf('{t("satisBilgileri")}');
  const karBlogu = detay.indexOf('t("kalemKari")');
  kontrol("iptal durumu bilgi kartından ÖNCE", iptalKutusu > 0 && iptalKutusu < bilgiKarti);
  kontrol(
    "  ...ve kâr bloğundan ÖNCE",
    iptalKutusu > 0 && (karBlogu < 0 || iptalKutusu < karBlogu),
  );

  /**
   * ⚠ DURUM BEYANDIR, İPTAL EYLEMDİR. Yıkıcı düğmeyi sayfanın tepesine
   * koymak, okumaya gelen kullanıcıyı yanlışlıkla tıklamaya davet ederdi.
   */
  const iptalDugmesi = detay.indexOf("<IptalFormu saleId={satis.id} />");
  kontrol("iptal DÜĞMESİ aşağıda kaldı", iptalDugmesi > bilgiKarti);
  kontrol(
    "  ...ve yalnız iptalsiz satışta çizilir",
    /satis\.iptalTarihi === null && iptalEdebilir/.test(detay),
  );

  /** Geri alma yolu iptal kutusunun İÇİNDE — durum ve çaresi bir arada. */
  kontrol("geri alma kutunun içinde", detay.indexOf("<GeriAlFormu") < bilgiKarti);
}

console.log("");
console.log("=".repeat(70));
/**
 * ============================================================================
 *  İÇE AKTARMA ŞERHİ — SAYI EKRANIN SÜZGECİNE BAĞLI
 * ----------------------------------------------------------------------------
 *  ⛔ CANLI KUSUR 29.08.2026 (Halil buldu): şerh süzgeçsiz okunuyordu ve
 *  SÜZÜLMÜŞ bir arama sonucunun üstünde duruyordu. Tek barkod arandı,
 *  ekranda tek ürün vardı, üstünde "9 satışın stok düşümü yapılmadı"
 *  yazıyordu. O 9 defterin TAMAMINA aitti; aranan ürüne ait olan **0**'dı.
 *  Rakam doğru, çerçeve yanlış — ve yanlış teşhise yol açtı.
 *
 *  ⚠ VE İLK DÜZELTME SESSİZCE ÇALIŞMADI: süzgeç `...{ items: { some } }`
 *  diye SPREAD ile eklenmişti ve alttaki `items: { none: … }` onu ezdi
 *  (aynı anahtar iki kez → JS'de ikincisi kazanır). Üç ölçüm de aynı
 *  sayıyı verdi; DEĞER TESTİ yakaladı, kaynak okuması yakalamazdı.
 *  _(Anayasa: "koşul `AND` ile eklenir, spread ile değil".)_
 * ============================================================================
 */
{
  const serhKaynak = readFileSync("src/lib/ice-aktarma-serhi.ts", "utf8");
  const ekranKaynak = readFileSync("src/app/stok/page.tsx", "utf8");

  /**
   * ⚠ ÖLÇÜT PENCEREYE DEĞİL İMZAYA BAĞLI. İlk hâli fonksiyon adıyla
   * parametre arasına 400 karakter pencere koyuyordu ve gerekçe yorumu
   * o pencereyi aştı — kontrol kırmızı yandı, kod doğruydu. Parametre
   * artık DÖNÜŞ TİPİNE demirli: araya ne kadar yorum girerse girsin
   * ölçüt aynı imzayı görür.
   */
  kontrol(
    "şerh sayısı SÜZGEÇ parametresi alıyor",
    /varyantSuzgeci\?: object,\s*\r?\n\): Promise<number>/.test(serhKaynak),
  );
  /**
   * ⭐ ÖLÇÜT `AND`E BAĞLI, VARLIĞA DEĞİL. Spread'e dönen bir mutasyon
   * sessizce çalışmayan bir süzgeç üretir ve sayı hep defter geneli kalır.
   */
  kontrol(
    "  ...süzgeç `AND` ile ekleniyor (spread DEĞİL)",
    /AND:\s*\[\{\s*items:\s*\{\s*some:\s*\{\s*variant:\s*varyantSuzgeci/.test(serhKaynak),
  );
  kontrol(
    "  ...ve `items: { none: … }` koşulu DURUYOR (ezilmemiş)",
    /items:\s*\{\s*none:\s*\{\s*stockMovements:\s*\{\s*some:\s*\{\}\s*\}\s*\}\s*\}/
      .test(serhKaynak),
  );
  kontrol(
    "stok ekranı şerhe KENDİ süzgecini geçiriyor",
    /<IceAktarmaSerhi\s+varyantSuzgeci=\{suzgec\}\s*\/>/.test(ekranKaynak),
  );
  /**
   * ⚠ DEFTER DERİNLİĞİ ŞERHİ SÜZGEÇSİZ KALIR — bilinçli ve gerekçesi
   * kodda yazılı. İki şerh iki farklı soru soruyor; ikincisi iki DEFTERİN
   * başlangıcını karşılaştırıyor ve tek ürün için anlamı yok.
   */
  kontrol(
    "defter derinliği şerhi süzgeçsiz BIRAKILMIŞ (bilinçli)",
    /<DefterDerinligiSerhi\s*\/>/.test(ekranKaynak),
  );
  kontrol(
    "  ...ve NİYE süzgeçsiz olduğu kodda YAZILI",
    /SÜZGECE BAĞLANMAZ — VE BU BİLİNÇLİ/.test(ekranKaynak),
  );
}
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");

