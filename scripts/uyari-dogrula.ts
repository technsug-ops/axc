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
} from "../src/lib/uyari/kurallar";
import { maliyetsizMi, maliyetsizVaryantlar } from "../src/lib/uyari/maliyetsiz-stok";
import { yedekOlcumu } from "../src/lib/uyari/yedek";
import {
  UYARI_ADRESLERI,
  UYARI_ANAHTARLARI,
  UYARI_IZINLERI,
} from "../src/lib/uyari/turler";
import type { Parti } from "../src/lib/stok";

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
  kontrol(
    "çan mobilde 44px dokunma hedefi",
    canBileseni.includes("size-11"),
  );
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
