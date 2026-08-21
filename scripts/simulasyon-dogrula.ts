import { readFileSync } from "node:fs";

import { SIMULASYON_KANALLARI } from "../src/lib/simulasyon/kanal-kurallari";
import {
  girdiEksikMi,
  simulasyonKarsilastir,
  type SimulasyonGirdisi,
} from "../src/lib/simulasyon/karsilastir";

/**
 * ============================================================================
 *  FİYAT DENEMESİ — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run simulasyon:dogrula
 *
 *  ── ALTIN SENARYOLAR DIŞ KAYNAKTAN ──────────────────────────────────────
 *  Kullanıcı 21.08.2026'da nesatilir.com'un AYNI senaryoyu dört pazaryerinde
 *  hesaplamış ekranlarını gönderdi. Bu, bizim motorumuzu KENDİ çıktısıyla
 *  değil DIŞ bir kaynakla sınama fırsatıdır — "kendi kendini doğrulayan ölçüm
 *  ölçüm değildir" kuralının tam karşılığı.
 *
 *  ⚠ AMA DIŞ KAYNAK KUTSAL DEĞİL. Aynı gün ölçüldü: nesatilir HB tahsilat
 *  bedelini `9,60` diyor, HB'nin kendi ekstresi `8,00` diyor (113 sipariş).
 *  Bu yüzden HB senaryosunda beklenen değer nesatilir'inki DEĞİL, ÖLÇÜLEN
 *  kuralın sonucudur — ve aradaki fark burada AÇIKÇA yazılıdır.
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

function yakin(ad: string, bulunan: number, beklenen: number, tolerans = 0.02) {
  const fark = Math.abs(bulunan - beklenen);
  kontrol(
    `${ad}  ${bulunan.toFixed(2)} (beklenen ${beklenen.toFixed(2)})`,
    fark <= tolerans,
    fark.toFixed(4),
  );
}

/** nesatilir'in ortak senaryosu — KDV DAHİL girilir. */
const ORTAK: SimulasyonGirdisi = {
  kdvDahilMi: true,
  satisFiyati: 1000,
  alisFiyati: 500,
  komisyonOrani: 15,
  kdvOrani: 20,
  kargoUcreti: 120,
};

// ===========================================================================
console.log("\n1) DIŞ KAYNAK KIYASI — nesatilir'in dört senaryosu");
// ===========================================================================
{
  const sonuc = simulasyonKarsilastir(ORTAK);
  const bul = (kod: string) => sonuc.find((s) => s.kod === kod)!;

  /**
   * TRENDYOL — kuruşuna tutmalı. Komisyona KDV eklenmez, ₺13,19 sabit.
   * nesatilir: kâr 172,34.
   */
  yakin("Trendyol NET-2", bul("TRENDYOL").net2, 172.34);
  yakin("Trendyol komisyon (KDV yok)", bul("TRENDYOL").komisyon, 150);

  /**
   * N11 — nesatilir: kâr 172,85. Komisyon KDV'siz, pazarlama gideri ₺12,58.
   */
  yakin("N11 NET-2", bul("N11").net2, 172.85);

  /**
   * ⚠ HEPSİBURADA — BİLEREK AYRIŞIYOR.
   * nesatilir kâr `139,83` diyor; tahsilat bedelini `9,60` (%0,8 × KDV dahil
   * × 1,20) sayıyor. HB'nin KENDİ ekstresi ölçüldü (21.08.2026, 113 sipariş):
   * oran %0,8000 ve matrah KDV DAHİL — yani gerçek kesinti `8,00`, üstüne
   * KDV eklenmiyor.
   *
   * Bizim sonucumuz 141,43: nesatilir'den tam olarak 1,60 (fee farkı 1,60)
   * eksi KDV etkisi kadar yüksek. Bu bir hata DEĞİL, ölçülmüş kuralın
   * sonucudur. Sayı burada kaynağıyla birlikte sabitleniyor.
   */
  const hb = bul("HEPSIBURADA");
  yakin("Hepsiburada komisyon (+%20 KDV)", hb.komisyon, 180);
  const odeme = hb.kesintiler.find((k) => k.code === "ODEME_GIDERI")!.tutar;
  yakin("Hepsiburada tahsilat bedeli — ÖLÇÜLEN kural", odeme, 8);
  kontrol(
    "  ...nesatilir'in 9,60'ı KULLANILMIYOR",
    Math.abs(odeme - 9.6) > 0.5,
    odeme,
  );

  /**
   * AMAZON — nesatilir: kâr 75,83 ama ALIŞ 599 ile. Ortak senaryoda alış 500
   * olduğu için burada ayrı bir girdiyle sınanıyor.
   */
  const amazon = simulasyonKarsilastir({ ...ORTAK, alisFiyati: 599 }).find(
    (s) => s.kod === "AMAZON",
  )!;
  yakin("Amazon NET-2 (alış 599)", amazon.net2, 75.83);
  yakin("Amazon komisyon (+%20 KDV)", amazon.komisyon, 180);
}

// ===========================================================================
console.log("\n2) KDV DAHİL / HARİÇ — aynı ürün, iki dil, aynı sonuç");
// ===========================================================================
{
  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERMELİ. KDV hariç girilen değerler
   * dahile çevrildiğinde ORTAK senaryonun aynısı olmalı: 1000/1,2 = 833,33 ·
   * 500/1,2 = 416,67 · kargo 120/1,2 = 100.
   */
  const haric = simulasyonKarsilastir({
    kdvDahilMi: false,
    satisFiyati: 1000 / 1.2,
    alisFiyati: 500 / 1.2,
    komisyonOrani: 15,
    kdvOrani: 20,
    kargoUcreti: 100,
  });
  const dahil = simulasyonKarsilastir(ORTAK);

  for (const kanal of ["TRENDYOL", "HEPSIBURADA", "N11", "AMAZON"]) {
    const a = haric.find((s) => s.kod === kanal)!;
    const b = dahil.find((s) => s.kod === kanal)!;
    yakin(`${kanal}: iki dil aynı NET-2`, a.net2, b.net2, 0.05);
  }

  /**
   * ⚠ VE ÇEVİRİM GERÇEKTEN ÇALIŞIYOR MU: aynı sayıları KDV DAHİL sayarsak
   * sonuç FARKLI olmalı. Bu olmadan "çevirim hiç yapılmıyor" mutasyonu
   * yeşil kalırdı — iki taraf da aynı işlemi atlardı.
   */
  const yanlisDil = simulasyonKarsilastir({
    kdvDahilMi: true,
    satisFiyati: 1000 / 1.2,
    alisFiyati: 500 / 1.2,
    komisyonOrani: 15,
    kdvOrani: 20,
    kargoUcreti: 100,
  });
  kontrol(
    "KDV anahtarı gerçekten etkili (dahil ≠ hariç)",
    Math.abs(
      yanlisDil.find((s) => s.kod === "TRENDYOL")!.net2 -
        haric.find((s) => s.kod === "TRENDYOL")!.net2,
    ) > 1,
  );
}

// ===========================================================================
console.log("\n3) SIRALAMA VE BOŞ GİRDİ");
// ===========================================================================
{
  const sonuc = simulasyonKarsilastir(ORTAK);
  kontrol(
    "bütün kanallar geliyor",
    sonuc.length === SIMULASYON_KANALLARI.length,
    sonuc.length,
  );
  kontrol(
    "EN KÂRLI başta (NET-2 azalan)",
    sonuc.every((s, i) => i === 0 || sonuc[i - 1]!.net2 >= s.net2),
    sonuc.map((s) => `${s.kod}:${s.net2.toFixed(2)}`),
  );

  /**
   * SIFIR SATIŞ "0 KÂR" DEĞİL, CEVAPSIZ SORUDUR. Boş formda tablo çizmek
   * kullanıcıya hesaplanmış gibi görünen bir sıfır duvarı gösterirdi.
   */
  kontrol(
    "boş satış fiyatı → tablo YOK",
    simulasyonKarsilastir({ ...ORTAK, satisFiyati: 0 }).length === 0,
  );
  kontrol(
    "boş alış fiyatı → tablo YOK",
    simulasyonKarsilastir({ ...ORTAK, alisFiyati: 0 }).length === 0,
  );
  kontrol(
    "eksi satış → tablo YOK",
    simulasyonKarsilastir({ ...ORTAK, satisFiyati: -5 }).length === 0,
  );
  kontrol(
    "girdiEksikMi boş formu yakalıyor",
    girdiEksikMi({ ...ORTAK, satisFiyati: Number.NaN }),
  );
  kontrol("dolu form eksik SAYILMIYOR", !girdiEksikMi(ORTAK));

  /** Kargosuz deneme meşru: alıcı ödüyorsa kargo bize gider değildir. */
  const kargosuz = simulasyonKarsilastir({ ...ORTAK, kargoUcreti: null });
  kontrol(
    "kargosuz senaryo hesaplanıyor",
    kargosuz.length === SIMULASYON_KANALLARI.length,
  );
  kontrol(
    "  ...ve kargosuz NET-2 daha yüksek",
    kargosuz.find((s) => s.kod === "TRENDYOL")!.net2 >
      sonuc.find((s) => s.kod === "TRENDYOL")!.net2,
  );
}

// ===========================================================================
console.log("\n4) KAYNAK BEYANI — kaynağı yazılmayan sayı kullanılamaz");
// ===========================================================================
{
  for (const k of SIMULASYON_KANALLARI) {
    kontrol(
      `${k.ad} — kaynağı beyan edilmiş`,
      k.kaynakNotu.length > 20,
      k.kaynakNotu.length,
    );
  }
  /**
   * ⚠ ÖLÇÜLMÜŞ İLE REFERANS AYRIMI GERÇEKTEN VAR MI: ikisi de dolu olmalı.
   * Hepsi "OLCULDU" olsaydı rozet hiçbir şey ayırt etmez, kullanıcı
   * doğrulanmamış rakama ölçülmüş sanıp güvenirdi.
   */
  const olculdu = SIMULASYON_KANALLARI.filter((k) => k.kaynak === "OLCULDU");
  const referans = SIMULASYON_KANALLARI.filter((k) => k.kaynak === "REFERANS");
  kontrol(
    "ölçülmüş kanal var",
    olculdu.length > 0,
    olculdu.map((k) => k.kod),
  );
  kontrol(
    "referans kanal var",
    referans.length > 0,
    referans.map((k) => k.kod),
  );
  kontrol(
    "referans kanalların BELİRSİZLİĞİ de yazılı",
    referans.every((k) => k.belirsizlik !== null && k.belirsizlik.length > 20),
  );

  /**
   * ⚠ ROZET İLE KAYNAK BAĞLI OLMALI — VE BUNU MUTASYON ÖĞRETTİ.
   * İlk hâlde yalnız "en az bir ölçülmüş, en az bir referans var" deniyordu.
   * N11'i `OLCULDU`ya çeviren mutasyon YEŞİL KALDI: Amazon hâlâ referanstı,
   * sayım tutuyordu. Oysa o hâlde ekran, nesatilir'den gelen doğrulanmamış
   * bir rakamı "ölçüldü" rozetiyle gösterirdi — rozetin tamamına olan güveni
   * götüren tam da budur.
   *
   * Ölçüt sayım değil BAĞ: kaynağında nesatilir geçen bir kanal ölçülmüş
   * sayılamaz; ölçülmüş bir kanal da kaynağını nesatilir'e dayandıramaz.
   */
  for (const k of SIMULASYON_KANALLARI) {
    const disKaynak = /nesatilir/i.test(k.kaynakNotu);
    kontrol(
      `${k.ad} — rozet kaynağıyla tutarlı (${k.kaynak})`,
      disKaynak ? k.kaynak === "REFERANS" : k.kaynak === "OLCULDU",
      { kaynak: k.kaynak, disKaynak },
    );
    /** Ölçülmüş kanal ne ölçüldüğünü söylemeli: örneklem ya da anayasa. */
    if (k.kaynak === "OLCULDU") {
      kontrol(
        `  ...${k.ad} ölçümün DAYANAĞINI yazıyor`,
        /anayasa|ekstre|sipariş|teyitli/i.test(k.kaynakNotu),
        k.kaynakNotu,
      );
    }
  }

  /**
   * ⚠ DEFTER KİRLENMEMELİ (kullanıcı kararı 21.08.2026): simülasyon kuralları
   * `ChannelFee`'ye yazılmaz. N11'in canlıda 2 gerçek satışı var; doğrulanmamış
   * kural deftere girseydi o satışların NET-2'si sessizce değişirdi.
   */
  /**
   * ⚠ YORUMLAR ELENİYOR — VE BUNU YİNE KENDİ TESTİM ÖĞRETTİ (ikinci kez,
   * 21.08.2026). "Veritabanına yazmıyor" kontrolü kırmızı yandı; suçlu kod
   * değil, kural dosyasındaki AÇIKLAMAYDI ("niye `ChannelFee` değil"
   * başlığı). Yorumu silip testi susturmak yanlış olurdu: yorum ekrana da
   * veritabanına da bir şey yazmaz.
   */
  const kodu = (yol: string) =>
    readFileSync(yol, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  kontrol(
    "simülasyon kuralları veritabanına YAZMIYOR",
    !/prisma|channelFee/i.test(kodu("src/lib/simulasyon/kanal-kurallari.ts")),
  );
  const motor = readFileSync("src/lib/simulasyon/karsilastir.ts", "utf8");
  kontrol(
    "karşılaştırma da yazma yapmıyor",
    !/prisma|\.create\(|\.update\(/i.test(
      kodu("src/lib/simulasyon/karsilastir.ts"),
    ),
  );
  /**
   * ⚠ VE KÂR HESABI KOPYALANMAMIŞ: kendi formülünü yazsaydı aynı soruya iki
   * cevap veren iki motor olurdu ve ayrışma sessiz olurdu.
   */
  kontrol(
    "kâr motoru YENİDEN YAZILMAMIŞ (karHesapla çağrılıyor)",
    motor.includes("karHesapla("),
  );
  kontrol(
    "  ...ve elle stopaj/komisyon formülü yok",
    !/\* *0\.01|\/ *1\.2 *\*/.test(motor.replace(/\/\*[\s\S]*?\*\//g, "")),
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
