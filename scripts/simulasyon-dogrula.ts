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

/**
 * ⚠ `null` GELİRSE ÇÖKMEZ, KIRMIZI YANAR. Önceki hâli `bulunan.toFixed()`
 * çağırıyordu; hesaplanamayan bir NET geldiğinde sonda TypeError ile
 * DÜŞÜYORDU ve geri kalan kontroller HİÇ KOŞMUYORDU. Mutasyon denemesinde
 * tam bu oldu: rapor "4 hata" dedi, gerçekte sonda ortada ölmüştü ve kaç
 * kontrolün sınanmadığı bilinmiyordu.
 *
 * Çöken sonda, eksik sonuçla "bu kadarı bozulmuş" izlenimi verir — boş
 * sonuçla temiz sonucu ayırt edemeyen denetimin kardeşi.
 */
function yakin(
  ad: string,
  bulunan: number | null,
  beklenen: number,
  tolerans = 0.02,
) {
  if (bulunan === null) {
    kontrol(`${ad}  (beklenen ${beklenen.toFixed(2)})`, false, "null");
    return;
  }
  const fark = Math.abs(bulunan - beklenen);
  kontrol(
    `${ad}  ${bulunan.toFixed(2)} (beklenen ${beklenen.toFixed(2)})`,
    fark <= tolerans,
    fark.toFixed(4),
  );
}

/** Sabit "bugün" — sonda kendi saatini okumaz (tekrarlanabilir ölçüm). */
const BUGUN = new Date("2026-08-21T09:00:00.000Z");

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
  const sonuc = simulasyonKarsilastir(ORTAK, BUGUN);
  const bul = (kod: string) => sonuc.find((s) => s.kod === kod)!;

  /**
   * TRENDYOL — kuruşuna tutmalı. Komisyona KDV eklenmez, ₺13,19 sabit.
   * nesatilir: kâr 172,34.
   */
  yakin("Trendyol NET-2", bul("TRENDYOL").net2!, 172.34);
  /** ⚠ ARTIK TUTAR DEĞİL ORAN dönüyor (motor birleşti); tutar NET içinde. */
  kontrol(
    "Trendyol komisyon oranı çözüldü",
    bul("TRENDYOL").komisyonOrani === 15,
    bul("TRENDYOL").komisyonOrani,
  );

  /**
   * N11 — nesatilir: kâr 172,85. Komisyon KDV'siz, pazarlama gideri ₺12,58.
   */
  /**
   * ⚠ N11 ARTIK nesatilir'E GÖRE SINANMIYOR (22.08.2026). HB'de yaşananın
   * aynısı oldu: gerçek ekstre geldi ve dış kaynağı çürüttü.
   *
   * nesatilir tek bir "pazarlama gideri" (₺12,58) diyordu. N11'in kendi
   * hakediş ekstresi İKİ ayrı satır gösteriyor: Pazarlama Bedeli %1,20 ve
   * Pazaryeri Bedeli %0,80 — toplam %2,00.
   *
   * ⚠ 166,67 ELDE HESAPLANDI, motordan OKUNMADI — yoksa test kendi
   * çıktısını doğrulardı. Döküm (satış 1000 · alış 500 · komisyon %15 ·
   * kargo 120, hepsi KDV DAHİL):
   *   komisyon  150,00 (1000×%15, üstüne KDV YOK)
   *   pazarlama  12,00 (1000×%1,20)
   *   pazaryeri   8,00 (1000×%0,80)
   *   stopaj      8,33 (833,33×%1)
   *   kargo     120,00
   *   NET-1 = 1000 − 500 − 150 − 12 − 8 − 8,33 − 120 = 201,67
   *   ödenecek KDV = 166,67 − 83,33 − 20,00 − 25,00 − 3,33 = 35,00
   *   NET-2 = 201,67 − 35,00 = 166,67
   */
  yakin("N11 NET-2 — ÖLÇÜLEN kural", bul("N11").net2!, 166.67, 0.02);
  kontrol(
    "  ...nesatilir'in 172,85'i KULLANILMIYOR",
    Math.abs(bul("N11").net2! - 172.85) > 1,
    bul("N11").net2,
  );

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
  /**
   * ⚠ HB ARTIK NET-2 ÜZERİNDEN SINANIYOR. Motor birleşince kesinti dökümü
   * dönmüyor; ölçülen kuralın etkisi NET-2'de görünüyor. nesatilir 139,83
   * diyor; bizim ölçülmüş matrahımız (KDV dahil, üstüne KDV yok) 141,43
   * veriyor. Aradaki 1,60 tam olarak fee farkının kendisidir.
   */
  const hb = bul("HEPSIBURADA");
  /**
   * ⚠ 141,17 ELDE HESAPLANDI, motordan OKUNMADI — yoksa test kendi çıktısını
   * doğrulardı. Döküm:
   *   komisyon 180,00 (1000×%15×1,20) · tahsilat 8,00 (1000×%0,8, KDV DAHİL
   *   matrah) · hizmet 12,60 · stopaj 8,33 (833,33×%1) · kargo 120,00
   *   ödenecek KDV 29,90 = 166,67 − 83,33 − 30,00 − 20,00 − 3,43
   *   NET-2 = 1000 − 500 − 180 − 8 − 12,60 − 8,33 − 120 − 29,90 = 141,17
   *
   * ⚠ İLK YAZDIĞIM 141,43 TAHMİNDİ ve kırmızı yandı — iyi ki yandı.
   */
  yakin("Hepsiburada NET-2 — ÖLÇÜLEN kural", hb.net2!, 141.17, 0.05);
  kontrol(
    "  ...nesatilir'in 139,83'ü KULLANILMIYOR",
    Math.abs(hb.net2! - 139.83) > 1,
    hb.net2,
  );

  /**
   * AMAZON — nesatilir: kâr 75,83 ama ALIŞ 599 ile. Ortak senaryoda alış 500
   * olduğu için burada ayrı bir girdiyle sınanıyor.
   */
  const amazon = simulasyonKarsilastir(
    { ...ORTAK, alisFiyati: 599 },
    BUGUN,
  ).find((s) => s.kod === "AMAZON")!;
  yakin("Amazon NET-2 (alış 599)", amazon.net2!, 75.83);
  kontrol(
    "Amazon komisyona KDV ekliyor (oran 15, NET farkı)",
    amazon.komisyonOrani === 15,
  );
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
  const haric = simulasyonKarsilastir(
    {
      kdvDahilMi: false,
      satisFiyati: 1000 / 1.2,
      alisFiyati: 500 / 1.2,
      komisyonOrani: 15,
      kdvOrani: 20,
      kargoUcreti: 100,
    },
    BUGUN,
  );
  const dahil = simulasyonKarsilastir(ORTAK, BUGUN);

  for (const kanal of ["TRENDYOL", "HEPSIBURADA", "N11", "AMAZON"]) {
    const a = haric.find((s) => s.kod === kanal)!;
    const b = dahil.find((s) => s.kod === kanal)!;
    yakin(`${kanal}: iki dil aynı NET-2`, a.net2!, b.net2!, 0.05);
  }

  /**
   * ⚠ VE ÇEVİRİM GERÇEKTEN ÇALIŞIYOR MU: aynı sayıları KDV DAHİL sayarsak
   * sonuç FARKLI olmalı. Bu olmadan "çevirim hiç yapılmıyor" mutasyonu
   * yeşil kalırdı — iki taraf da aynı işlemi atlardı.
   */
  const yanlisDil = simulasyonKarsilastir(
    {
      kdvDahilMi: true,
      satisFiyati: 1000 / 1.2,
      alisFiyati: 500 / 1.2,
      komisyonOrani: 15,
      kdvOrani: 20,
      kargoUcreti: 100,
    },
    BUGUN,
  );
  kontrol(
    "KDV anahtarı gerçekten etkili (dahil ≠ hariç)",
    Math.abs(
      yanlisDil.find((s) => s.kod === "TRENDYOL")!.net2! -
        haric.find((s) => s.kod === "TRENDYOL")!.net2!,
    ) > 1,
  );
}

// ===========================================================================
console.log("\n3) SIRALAMA VE BOŞ GİRDİ");
// ===========================================================================
{
  const sonuc = simulasyonKarsilastir(ORTAK, BUGUN);
  kontrol(
    "bütün kanallar geliyor",
    sonuc.length === SIMULASYON_KANALLARI.length,
    sonuc.length,
  );
  kontrol(
    "EN KÂRLI başta (NET-2 azalan)",
    sonuc.every(
      (s, i) =>
        i === 0 || (sonuc[i - 1]!.net2 ?? -Infinity) >= (s.net2 ?? -Infinity),
    ),
    sonuc.map((s) => `${s.kod}:${s.net2?.toFixed(2)}`),
  );

  /**
   * SIFIR SATIŞ "0 KÂR" DEĞİL, CEVAPSIZ SORUDUR. Boş formda tablo çizmek
   * kullanıcıya hesaplanmış gibi görünen bir sıfır duvarı gösterirdi.
   */
  kontrol(
    "boş satış fiyatı → tablo YOK",
    simulasyonKarsilastir({ ...ORTAK, satisFiyati: 0 }, BUGUN).length === 0,
  );
  kontrol(
    "boş alış fiyatı → tablo YOK",
    simulasyonKarsilastir({ ...ORTAK, alisFiyati: 0 }, BUGUN).length === 0,
  );
  kontrol(
    "eksi satış → tablo YOK",
    simulasyonKarsilastir({ ...ORTAK, satisFiyati: -5 }, BUGUN).length === 0,
  );
  kontrol(
    "girdiEksikMi boş formu yakalıyor",
    girdiEksikMi({ ...ORTAK, satisFiyati: Number.NaN }),
  );
  kontrol("dolu form eksik SAYILMIYOR", !girdiEksikMi(ORTAK));

  /** Kargosuz deneme meşru: alıcı ödüyorsa kargo bize gider değildir. */
  const kargosuz = simulasyonKarsilastir(
    { ...ORTAK, kargoUcreti: null },
    BUGUN,
  );
  kontrol(
    "kargosuz senaryo hesaplanıyor",
    kargosuz.length === SIMULASYON_KANALLARI.length,
  );
  kontrol(
    "  ...ve kargosuz NET-2 daha yüksek",
    kargosuz.find((s) => s.kod === "TRENDYOL")!.net2! >
      sonuc.find((s) => s.kod === "TRENDYOL")!.net2!,
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
    /**
     * ⚠ ÖLÇÜT DEĞİŞTİ (21.08.2026): artık `karHesapla` değil `simulasyonKur`
     * çağrılmalı. İlk hâlde bu modül kendi motorunu kuruyordu ve
     * `lib/fiyatlama/simulasyon.ts` ZATEN VARDI — aynı soruya iki motor.
     * Kontrol de o yanlışı doğruluyordu: "kâr motoru yeniden yazılmamış"
     * diyordu ve YAZILMIŞTI, sadece adı başkaydı.
     */
    "mevcut simülasyon motoru kullanılıyor (simulasyonKur)",
    motor.includes("simulasyonKur("),
  );
  kontrol("  ...ve paralel motor kurulmuyor", !motor.includes("karHesapla("));
  kontrol(
    "  ...ve elle stopaj/komisyon formülü yok",
    !/\* *0\.01|\/ *1\.2 *\*/.test(motor.replace(/\/\*[\s\S]*?\*\//g, "")),
  );
}

// ===========================================================================
console.log("\n5) DÖKÜM VE PASTA — satış fiyatı nereye gidiyor");
// ===========================================================================
{
  const sonuc = simulasyonKarsilastir(ORTAK, BUGUN);
  const hb = sonuc.find((s) => s.kod === "HEPSIBURADA")!;
  const ty = sonuc.find((s) => s.kod === "TRENDYOL")!;

  /**
   * ⚠ DÖKÜM KANALDAN KANALA DEĞİŞİR — ve grafiğin bütün değeri bu farkta.
   * HB'de tahsilat bedeli var, Trendyol'da yok. Sabit bir kalem listesi
   * yazsaydım biri sessizce kaybolurdu.
   */
  const kodlar = (s: (typeof sonuc)[number]) =>
    s.dokum.map((d) => d.kod).sort();
  kontrol(
    "HB dökümünde tahsilat bedeli VAR",
    kodlar(hb).includes("ODEME_GIDERI"),
    kodlar(hb),
  );
  kontrol(
    "Trendyol dökümünde tahsilat bedeli YOK",
    !kodlar(ty).includes("ODEME_GIDERI"),
    kodlar(ty),
  );
  kontrol(
    "HB dökümünde hizmet bedeli VAR",
    kodlar(hb).includes("HIZMET_BEDELI"),
  );
  kontrol("Trendyol'da sabit gider VAR", kodlar(ty).includes("SABIT_GIDER"));
  for (const zorunlu of [
    "MALIYET",
    "KOMISYON",
    "STOPAJ",
    "KARGO",
    "ODENECEK_KDV",
  ]) {
    kontrol(
      `her kanalda ${zorunlu} var`,
      sonuc.every((s) => kodlar(s).includes(zorunlu)),
    );
  }

  /**
   * ── DENKLEM KAPANIYOR MU ───────────────────────────────────────────────
   * ⚠ ASIL SINAV BU: kesintiler + NET-2 = satış fiyatı. Kapanmıyorsa
   * grafikte bir dilim EKSİK demektir ve pasta "kâr nereye gitti" sorusunu
   * yanlış cevaplar — üstelik güzel görünerek.
   */
  for (const s of sonuc) {
    const toplam = s.dokum.reduce((t, d) => t + d.tutar, 0) + (s.net2 ?? 0);
    yakin(`${s.ad}: kesintiler + NET-2 = satış`, toplam, 1000, 0.05);
  }

  /** Döküm MOTORDAN geliyor — ekran kendi toplamını kurmuyor. */
  const motor = readFileSync("src/lib/simulasyon/karsilastir.ts", "utf8");
  kontrol("döküm motordan taşınıyor", motor.includes("dokum: s.dokum"));

  const pasta = readFileSync("src/components/pasta-grafik.tsx", "utf8");
  /**
   * ⚠ RENK TEK BAŞINA KONUŞMAZ (renk sistemi kısıt #1): pastanın yanında
   * etiket ve tutar listesi olmalı. Renk körü bir kullanıcı için grafik süs,
   * liste veridir.
   */
  kontrol("pastanın yanında etiketli liste var", pasta.includes("<ul"));
  kontrol(
    "pasta hareket azaltmaya saygılı",
    pasta.includes("prefers-reduced-motion"),
  );
  /**
   * ⚠ PAYDA SATIŞ FİYATI, DİLİM TOPLAMI DEĞİL. Zararda kâr dilimi yoktur ve
   * kesintiler satışı aşar; dilim toplamına bölmek "her şey yolunda" görünen
   * bir pasta üretir ve zarar KAYBOLUR.
   */
  kontrol(
    "payda satış fiyatından korunuyor (Math.max)",
    /payda = Math\.max/.test(pasta),
  );

  const ekran = readFileSync("src/app/simulasyon/deneme.tsx", "utf8");
  kontrol(
    "her kanal kutusunda pasta çiziliyor",
    ekran.includes("<PastaGrafik"),
  );
  /**
   * ⚠ VE KOŞULUYLA BİRLİKTE: dökümü olmayan kanalda pasta çizilmemeli,
   * yoksa boş bir halka "hesaplandı" gibi görünür.
   */
  kontrol(
    "  ...yalnız dökümü olan kanalda",
    /sonuc\.dokum\.length > 0 \? \([\s\S]{0,600}?<PastaGrafik/.test(ekran),
  );
}

// ===========================================================================
console.log("\n6) ÜRÜN ZEMİNİ — barkodla dolan alanlar");
// ===========================================================================
{
  const zemin = readFileSync("src/lib/simulasyon/urun-zemini.ts", "utf8");
  /**
   * ⚠ ARAMA ORTAK KOŞULDAN. Bu depoda `varyantAra` Kanal SKU'yu hiç
   * sormuyordu; kendi sorgusunu yazan her yer o kümeden ayrışır.
   */
  kontrol(
    "arama ortak `kodKosulu`dan geçiyor",
    zemin.includes("kodKosulu(temiz)"),
  );
  /**
   * ⚠ ORTALAMA ALIŞ AÇIK PARTİDEN DEĞİL, LEDGER'DAN. Stoğu tükenmiş üründe
   * açık parti yoktur; "bu ürünü genelde kaça alıyorum" sorusu yine de
   * cevaplanabilir olmalı. (Aynı gün kartın "son alım"ı bu yüzden 26
   * varyantta "alım yok" diyordu.)
   */
  kontrol(
    "ortalama alış LEDGER'dan (açık parti değil)",
    zemin.includes("purchaseItemId: { not: null }") &&
      !zemin.includes("acikPartiler"),
  );
  kontrol("maliyet hareketin damgasından", zemin.includes("unitCostAmount"));
  kontrol(
    "iptalli satış ortalamaya girmiyor",
    zemin.includes("iptalTarihi: null"),
  );
  kontrol(
    "sıfır adette null döner (sıfıra bölme yok)",
    /alimAdet > 0 \? alimTutar \/ alimAdet : null/.test(zemin) &&
      /satisAdet > 0 \? satisTutar \/ satisAdet : null/.test(zemin),
  );
  kontrol(
    "hiçbir şey yazmıyor",
    !/\.create\(|\.update\(|\.delete\(/.test(zemin),
  );

  const action = readFileSync("src/app/simulasyon/actions.ts", "utf8");
  /**
   * ⚠ SERVER ACTION KENDİ BAŞINA BİR UÇTUR. Ekranın `sayfaIzni` ile korunuyor
   * olması bu action'ı KORUMAZ; izin burada da sorulmalı.
   */
  kontrol(
    "arama action'ı izin soruyor",
    action.includes('izinVarMi("satis.kar.gor")'),
  );
  kontrol("bulunamadı sessiz kalmıyor", action.includes('tur: "BULUNAMADI"'));

  const ekran = readFileSync("src/app/simulasyon/deneme.tsx", "utf8");
  kontrol("ekranda kod arama kutusu var", ekran.includes("urunAra("));
  /** USB okuyucu Enter basar (İlke #7) — form olmadığı için tuş dinleniyor. */
  kontrol("okuyucunun Enter'ı çalışıyor", /e\.key === "Enter"/.test(ekran));
  /**
   * ⚠ GERÇEK ZEMİN KARŞILAŞTIRMAYA ULAŞIYOR MU: ürün seçilince komisyon
   * tarifeden gelmeli. Zeminler geçirilmezse ekran sessizce kullanıcının
   * tahminiyle hesaplar ve "tarifeden" yazısı yalan olur.
   */
  kontrol(
    "ürün zeminleri karşılaştırmaya geçiyor",
    /simulasyonKarsilastir\(girdi, new Date\(bugun\), urun\?\.zeminler/.test(
      ekran,
    ),
  );
  kontrol(
    "oranın kaynağı ekranda yazıyor",
    ekran.includes("oran_${sonuc.oranKaynagi}"),
  );
}

// ===========================================================================
console.log("\n7) KANAL BAŞINA KOMİSYON — tek oran yanlış sonuç verir");
// ===========================================================================
{
  /**
   * ⚠ KULLANICI BİLDİRDİ 21.08.2026: _"her pazar yerinde komisyon oranları
   * farklı, kâr değişimi çoğunlukla bundan çıkıyor. Sabit olunca yanlış
   * sonuç geliyor."_
   *
   * ÖLÇÜLDÜ (canlı, salt okuma) ve haklıydı:
   *   · Trendyol ChannelSku oranları: min 3,6 · ortanca 14,8 · max 23,0
   *     — 41 FARKLI oran
   *   · Hepsiburada: min 4,0 · ortanca 15,0 · max 20,0 — 13 farklı oran
   *   · AYNI ÜRÜN, farklı kanal: fark ortanca **2 puan**, p75 6,2,
   *     max **14,4 puan** (n=1052)
   *
   * 1.000 ₺'lik satışta 14,4 puan = ₺144. Bu, "hangi kanalda satsam"
   * sorusunun cevabını TERSİNE ÇEVİREBİLECEK bir büyüklük — yani tek oran
   * yalnız yaklaşık değil, YANILTICI olur.
   */
  const elle = simulasyonKarsilastir(
    { ...ORTAK, kanalOranlari: { TRENDYOL: 5 } },
    BUGUN,
  );
  const ortak = simulasyonKarsilastir(ORTAK, BUGUN);
  const ty = (l: typeof ortak) => l.find((s) => s.kod === "TRENDYOL")!;
  const n11 = (l: typeof ortak) => l.find((s) => s.kod === "N11")!;

  kontrol(
    "kanal oranı uygulanıyor (TY %15 → %5)",
    ty(elle).komisyonOrani === 5,
    ty(elle).komisyonOrani,
  );
  kontrol("  ...ve elle girildiği beyan ediliyor", ty(elle).oranElle);
  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERMELİ: öteki kanal ETKİLENMEMELİ.
   * Oranı tek sözlükten okuyup hepsine uygulayan bir hata, yalnız TY'ye
   * bakan bir testte yeşil kalırdı.
   */
  kontrol(
    "öteki kanal ETKİLENMİYOR (N11 hâlâ %15)",
    n11(elle).komisyonOrani === 15,
    n11(elle).komisyonOrani,
  );
  kontrol("  ...ve N11 elle girilmiş SAYILMIYOR", !n11(elle).oranElle);

  /** Düşük komisyon NET-2'yi yükseltmeli — yön testi. */
  kontrol("oran düşünce NET-2 artıyor", ty(elle).net2! > ty(ortak).net2!, {
    elle: ty(elle).net2,
    ortak: ty(ortak).net2,
  });
  /** Ve büyüklüğü de sabitlensin: %10 puanlık indirim 1000 ₺'de ~100 ₺. */
  yakin(
    "  ...ve farkın büyüklüğü ~100 ₺",
    ty(elle).net2! - ty(ortak).net2!,
    100,
    20,
  );

  /**
   * ⚠ GEÇERSİZ METİN ORANA DÖNÜŞMEZ. Yarım yazılmış bir sayı ("1,") ya da
   * eksi bir oran, sessizce 0 komisyon olarak okunsaydı ekran mucizevi bir
   * kâr gösterirdi.
   */
  const bozuk = simulasyonKarsilastir(
    { ...ORTAK, kanalOranlari: { TRENDYOL: Number.NaN } },
    BUGUN,
  );
  kontrol(
    "geçersiz oran yok sayılıyor (ortak orana düşer)",
    ty(bozuk).komisyonOrani === 15,
    ty(bozuk).komisyonOrani,
  );

  const ekran = readFileSync("src/app/simulasyon/deneme.tsx", "utf8");
  /**
   * ⚠ DESEN DOSYADA DEĞİL, KULLANIM BLOĞUNDA ARANIR. `setKanalOranlari`
   * dosyada üç yerde geçiyor (durum tanımı · ürün sıfırlama · form kutusu);
   * dosyanın tamamında aramak, form bloğu tamamen silinse bile yeşil kalırdı.
   */
  const formBlok = ekran.slice(
    ekran.indexOf("PAZARYERİ BAŞINA GİRDİ — FİYAT + KOMİSYON"),
    ekran.indexOf("══════════════ SONUÇ ══════════════"),
  );
  kontrol("komisyon bloğu formda var", formBlok.length > 200, formBlok.length);
  kontrol(
    "form kutuları KANAL LİSTESİNDEN üretiliyor",
    formBlok.includes("SIMULASYON_KANALLARI.map("),
  );
  kontrol(
    "form kutusu oranı YAZIYOR (salt okunur değil)",
    formBlok.includes("setKanalOranlari((o) => ({ ...o, [k.kod]: v }))"),
  );
  /**
   * ⚠ VE HANGİ KAYNAĞIN KAZANDIĞI YAZIYOR. "Oran dilim tarifesinden" ile
   * "senin girdiğin" karışırsa kullanıcı hangi rakamla hesaplandığını
   * bilemez — ekranda bir sayı yazıp başka bir sayıyla hesaplamak olurdu.
   */
  kontrol(
    "oranın kaynağı kutuda beyan ediliyor",
    ekran.includes("sonuc.oranElle"),
  );
  /**
   * ⚠ ÜRÜN DEĞİŞİNCE ELLE ORANLAR TEMİZLENİYOR: önceki üründen kalan bir
   * oran yeni ürünün gerçek zeminini SESSİZCE ezerdi.
   */
  kontrol(
    "yeni üründe elle oranlar sıfırlanıyor",
    ekran.includes("setKanalOranlari({})"),
  );

  const motor = readFileSync("src/lib/simulasyon/karsilastir.ts", "utf8");
  /**
   * ⚠ ELLE ORAN VARSA DİLİM TARİFESİ DEVREDEN ÇIKMALI. Yoksa tarife kazanır
   * ve kullanıcının girdiği sayı sessizce yok sayılır.
   */
  kontrol(
    "elle oran dilim tarifesini devre dışı bırakıyor",
    /elleOran\(kanal\.kod, girdi\.kanalOranlari\) !== null[\s\S]{0,80}?null/.test(
      motor,
    ),
  );
  /**
   * ⚠ SÜZGEÇ KİTAPLIKTA OLMALI, ekranın nezaketine bırakılmamalı: ikinci bir
   * ekran eklendiğinde aynı süzgeci yazmayı unutan biri hatayı geri getirir.
   */
  kontrol(
    "geçersiz oran süzgeci kitaplıkta",
    motor.includes("function elleOran("),
  );
}

// ===========================================================================
console.log("");
console.log("8) ORTAK ORAN ZORUNLU DEĞİL — kapı kanal kutularını kapatmasın");
// ===========================================================================
{
  /**
   * ⚠ CANLIDA YAKALANDI 21.08.2026. Kullanıcı ürünü koddan buldu, ekranda
   * hiçbir kanal kutusu göremedi ve bildirdi: _"burada pazar yerlerine has
   * oran girme yeri yok"_.
   *
   * Sebep bir SIRALAMA tuzağıydı: kanal başına oran kutuları SONUÇ
   * kutusunun içinde yaşıyordu, sonuç kutuları da `girdiEksikMi` ORTAK
   * oranı şart koştuğu için çizilmiyordu. Yani kanal oranını girebilmek
   * için önce "kanal oranı YOKSA" etiketli alanı doldurmak gerekiyordu.
   * Alanın kendi etiketi onu YEDEK ilan ediyordu; kapı ZORUNLU tutuyordu.
   *
   * Motor tarafı doğruydu ve mutasyonlarla sınanmıştı — kırık olan
   * TESLİM yoluydu. ("Kural doğru mu değil, kural teslim edilebilir mi.")
   */
  const ortaksiz: SimulasyonGirdisi = {
    ...ORTAK,
    komisyonOrani: undefined,
  };

  kontrol("ortak oran YOKKEN form eksik SAYILMIYOR", !girdiEksikMi(ortaksiz));
  kontrol(
    "  ...ve kanal kutuları ÇİZİLİYOR",
    simulasyonKarsilastir(ortaksiz, BUGUN).length ===
      SIMULASYON_KANALLARI.length,
    simulasyonKarsilastir(ortaksiz, BUGUN).length,
  );

  /**
   * ⚠ AMA SESSİZ SIFIR ÜRETMEZ. Oranı hiçbir yerden çözülemeyen kanal
   * "0 komisyon" ile kârlı görünemez: NET null döner ve ORAN_YOK beyanı
   * ekranda yazar. Kutunun çizilmesi, hüküm verilmesi demek değildir.
   */
  const oransiz = simulasyonKarsilastir(ortaksiz, BUGUN);
  const oransizTy = oransiz.find((k) => k.kod === "TRENDYOL")!;
  kontrol("oranı çözülemeyen kanalın oranı null", oransizTy.komisyonOrani === null);
  kontrol("  ...NET-2 de null (sıfır DEĞİL)", oransizTy.net2 === null);
  kontrol(
    "  ...ve ORAN_YOK beyanı üretiliyor",
    oransizTy.beyanlar.some((b) => b.tur === "ORAN_YOK"),
    oransizTy.beyanlar.map((b) => b.tur),
  );

  /**
   * ⚠ NaN SÜZGECİ ORTAK ORANDA DA VAR. `simulasyonKur`un sözleşmesi
   * `tekOran: number | null` ve kontrolü `!== null`; `NaN` oradan "değer
   * var" diye geçer ve NET sessizce `NaN` çıkardı. Elle oranda süzgeç
   * kitaplığa taşınmıştı, ortak oranda kalmamıştı — kapı NaN'ı zaten
   * durduruyordu. Kapı açılınca açık doğardı; süzgeç aynı gün kondu.
   */
  const bozukOrtak = simulasyonKarsilastir(
    { ...ORTAK, komisyonOrani: Number.NaN },
    BUGUN,
  );
  const bozukTy = bozukOrtak.find((k) => k.kod === "TRENDYOL")!;
  kontrol("geçersiz ORTAK oran yok sayılıyor", bozukTy.komisyonOrani === null);
  /**
   * ⚠ GÖRÜNEN DEĞER `String()` İLE BASILIYOR, JSON İLE DEĞİL:
   * `JSON.stringify(NaN)` → `"null"`. Yani bu kontrol kırmızı yandığında
   * teşhis satırı "null" yazar ve okuyan "zaten null, ne istiyorsun" der —
   * hatanın kendisini gizler. Mutasyon denemesinde tam bu yaşandı.
   */
  kontrol(
    "  ...ve NET NaN DEĞİL (sessiz bozulma yok)",
    bozukTy.net2 === null,
    String(bozukTy.net2),
  );

  /**
   * ── TEK PAZARYERİ DOLDURULABİLİR ────────────────────────────────────
   * Kullanıcı kararı 21.08.2026: _"kişi isterse tek pazaryeri komisyon
   * oranını girsin ve bilgi alsın, isterse hepsini. Bu onun seçimi olsun."_
   *
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR: doldurulan kanal HÜKÜM
   * veriyor, doldurulmayan SUSUYOR. "Hepsi dolmadan hesap yok" diyen bir
   * kapı, yalnız TY'ye bakan bir testte yakalanmazdı.
   */
  const tekKanal = simulasyonKarsilastir(
    { ...ortaksiz, kanalOranlari: { TRENDYOL: 12 } },
    BUGUN,
  );
  const tekTy = tekKanal.find((k) => k.kod === "TRENDYOL")!;
  const tekN11 = tekKanal.find((k) => k.kod === "N11")!;
  kontrol("tek kanal doldurunca O KANAL hesaplanıyor", tekTy.net2 !== null, tekTy.net2);
  kontrol("  ...oranı da girilen oran", tekTy.komisyonOrani === 12, tekTy.komisyonOrani);
  kontrol("  ...öteki kanal ise SUSUYOR (uydurulmuyor)", tekN11.net2 === null);

  /**
   * ⚠ VE İKİNCİ BİR GİRDİ KUTUSU YOK. Aynı oran hem formdan hem sonuç
   * kutusundan düzenlenebilseydi, hangisinin geçerli olduğu ekranda
   * cevapsız kalırdı. Sonuç kutusu artık yalnız KULLANILAN oranı okutur.
   */
  const ekran8 = readFileSync("src/app/simulasyon/deneme.tsx", "utf8");
  const kanalKutusu = ekran8.slice(ekran8.indexOf("function KanalKutusu("));
  kontrol(
    "sonuç kutusunda ikinci girdi kutusu YOK",
    !kanalKutusu.includes("onChange"),
  );
}

// ===========================================================================
console.log("");
console.log("9) KANAL BAŞINA BUY BOX FİYATI — asıl satış kararı burada");
// ===========================================================================
{
  /**
   * ⚠ KULLANICI ANLATTI 21.08.2026, kendi rakamlarıyla:
   *
   *   _"x ürünü alış 1000 · Trendyol buy box 2150, komisyon %5, kargo 200,
   *   diğer 13,19 → kâr 673,02 · Hepsiburada buy box 2250, komisyon %13,
   *   diğer 31 → 533,25 · N11 buy box 2175, komisyon %12, diğer 27,36 →
   *   554. En düşük satış fiyatı Trendyol'da olmasına rağmen en yüksek kâr
   *   Trendyol'da. Ben bunu takip edip satış kararı vermek istiyorum;
   *   satmak istemediğim pazaryerlerinde fiyatı yükseltip buybox'tan
   *   çıkıyorum."_
   *
   * ⚠ VE BU DIŞ BİR ÖLÇÜTTÜR — bizim motorumuzun kendi çıktısı değil.
   * Elle kurulmuş bir hesap; "kendi kendini doğrulayan ölçüm ölçüm
   * değildir" kuralının karşılığı. Tuttuğu yer kadar TUTMADIĞI yer de
   * anlamlı, o yüzden fark ölçülüp yazılıyor.
   */
  const SENARYO: SimulasyonGirdisi = {
    kdvDahilMi: true,
    alisFiyati: 1000,
    kdvOrani: 20,
    kargoUcreti: 200,
    kanalFiyatlari: { TRENDYOL: 2150, HEPSIBURADA: 2250, N11: 2175 },
    kanalOranlari: { TRENDYOL: 5, HEPSIBURADA: 13, N11: 12 },
  };
  const sonuc = simulasyonKarsilastir(SENARYO, BUGUN);
  const bul = (kod: string) => sonuc.find((k) => k.kod === kod)!;

  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERİYOR: üç kanal ÜÇ FARKLI
   * fiyatla hesaplanıyor. Fiyatı tek sözlükten okuyup hepsine uygulayan
   * bir hata, tek fiyatlı bir senaryoda yeşil kalırdı.
   */
  kontrol("TY kendi buy box'ıyla (2150)", bul("TRENDYOL").satisFiyati === 2150);
  kontrol("HB kendi buy box'ıyla (2250)", bul("HEPSIBURADA").satisFiyati === 2250);
  kontrol("N11 kendi buy box'ıyla (2175)", bul("N11").satisFiyati === 2175);

  /**
   * ⚠ ASIL HÜKÜM: EN DÜŞÜK FİYAT EN YÜKSEK KÂRI VERİYOR. Kullanıcının
   * bütün stratejisi bu tersliğe dayanıyor; sıralama bozulursa ekran ona
   * yanlış pazaryerinde beklemesini söyler.
   */
  /**
   * ⚠ KAZANANIN HESAPLANMIŞ OLMASI DA ŞART. İlk yazımda yalnız
   * `sonuc[0].kod === "TRENDYOL"` bakılıyordu ve bu KÖR bir kontroldü:
   * bütün NET'ler `null` olduğunda sıralama girdiyi bozmuyor, TRENDYOL
   * listede zaten ilk sırada ve kontrol YEŞİL kalıyordu. Mutasyon (kanal
   * fiyatını yok say) tam buradan sızdı.
   */
  kontrol(
    "en düşük fiyatlı kanal (TY) KAZANIYOR",
    sonuc[0]!.kod === "TRENDYOL" && sonuc[0]!.net2 !== null,
    sonuc.map((k) => `${k.kod}:${k.net2?.toFixed(2)}`),
  );
  kontrol(
    "  ...ve sıra TY > N11 > HB",
    bul("TRENDYOL").net2! > bul("N11").net2! &&
      bul("N11").net2! > bul("HEPSIBURADA").net2!,
  );

  /** Büyüklükler de sabitlensin — kesinti kuralı sessizce kayarsa yakalansın. */
  yakin("TY NET-2 ~673", bul("TRENDYOL").net2!, 673.17, 0.02);
  yakin("HB NET-2 ~538", bul("HEPSIBURADA").net2!, 538.25, 0.02);
  /**
   * ⚠ N11 RAKAMI İKİ KEZ DEĞİŞTİ — ÜÇÜ DE BURADA, NEDENİYLE:
   *   566,39  ilk hâl  — pazarlama gideri SABİT ₺12,58 sanılıyordu
   *   554,07  21.08    — nesatilir'in 2. senaryosu YÜZDE olduğunu gösterdi
   *   540,62  22.08    — N11'in GERÇEK ekstresi geldi: iki ayrı kalem,
   *                      %1,20 + %0,80 = %2,00 (nesatilir %1,258 diyordu)
   *
   * Rakam hiç bozulmadı; her seferinde KAYNAK iyileşti. Eski değerler
   * silinmiyor: aynı senaryo üç farklı sayı vermiş görünürse hangisinin
   * neden geçerli olduğu okunabilsin.
   *
   * ⚠ 540,62 ELDE DOĞRULANDI (satış 2175 · alış 1000 · komisyon %12 ·
   * kargo 200): komisyon 261,00 · pazarlama 26,10 · pazaryeri 17,40 ·
   * stopaj 18,13 · kargo 200 → NET-1 652,38; ödenecek KDV 111,75;
   * NET-2 = 540,63.
   */
  yakin("N11 NET-2 ~540 (gerçek ekstre)", bul("N11").net2!, 540.62, 0.02);

  /**
   * ── ORTAK FİYAT YEDEKTİR ────────────────────────────────────────────
   * Kanalın kendi fiyatı yoksa üstteki ortak alan devreye girer.
   */
  const karisik = simulasyonKarsilastir(
    { ...SENARYO, satisFiyati: 2000, kanalFiyatlari: { TRENDYOL: 2150 } },
    BUGUN,
  );
  kontrol(
    "kendi fiyatı olan kanal ONU kullanıyor",
    karisik.find((k) => k.kod === "TRENDYOL")!.satisFiyati === 2150,
  );
  kontrol(
    "  ...olmayan kanal ORTAK fiyata düşüyor",
    karisik.find((k) => k.kod === "HEPSIBURADA")!.satisFiyati === 2000,
  );

  /**
   * ── FİYATSIZ KANAL SUSAR, SIFIR SAYMAZ ──────────────────────────────
   * ⚠ "Fiyat yok" ile "fiyat sıfır" karıştırılsaydı o kanal maliyeti kadar
   * ZARARDA görünür ve listenin dibine düşerdi: hesaplanmamış bir kanal,
   * hesaplanmış bir felaket gibi okunurdu.
   */
  const tekFiyat = simulasyonKarsilastir(
    { ...SENARYO, kanalFiyatlari: { TRENDYOL: 2150 } },
    BUGUN,
  );
  const bosHb = tekFiyat.find((k) => k.kod === "HEPSIBURADA")!;
  kontrol("fiyatsız kanalın NET-2'si null", bosHb.net2 === null, bosHb.net2);
  kontrol("  ...satış fiyatı da null (0 DEĞİL)", bosHb.satisFiyati === null);
  kontrol(
    "  ...ve FIYAT_YOK beyanı üretiliyor",
    bosHb.beyanlar.some((b) => b.tur === "FIYAT_YOK"),
    bosHb.beyanlar.map((b) => b.tur),
  );
  kontrol(
    "  ...fiyatı olan kanal etkilenmiyor",
    tekFiyat.find((k) => k.kod === "TRENDYOL")!.net2 !== null,
  );

  /** ⚠ SIFIR VE GEÇERSİZ FİYAT KUTUYA YAZILSA BİLE HESABA GİRMEZ. */
  for (const [ad, deger] of [
    ["sıfır", 0],
    ["eksi", -100],
    ["NaN", Number.NaN],
  ] as const) {
    const bozuk = simulasyonKarsilastir(
      { ...SENARYO, satisFiyati: 2000, kanalFiyatlari: { TRENDYOL: deger } },
      BUGUN,
    );
    kontrol(
      `geçersiz fiyat (${ad}) yok sayılıyor → ortak fiyat`,
      bozuk.find((k) => k.kod === "TRENDYOL")!.satisFiyati === 2000,
      bozuk.find((k) => k.kod === "TRENDYOL")!.satisFiyati,
    );
  }

  /** Hiç fiyat yoksa tablo hiç çizilmez — boş durum. */
  kontrol(
    "hiçbir fiyat yoksa tablo YOK",
    simulasyonKarsilastir(
      { ...SENARYO, kanalFiyatlari: {} },
      BUGUN,
    ).length === 0,
  );
  kontrol(
    "  ...ama tek kanal fiyatı bile kapıyı açıyor",
    !girdiEksikMi({ ...SENARYO, kanalFiyatlari: { N11: 2175 } }),
  );

  // ── EKRAN ────────────────────────────────────────────────────────────
  const ekran9 = readFileSync("src/app/simulasyon/deneme.tsx", "utf8");
  const blok9 = ekran9.slice(
    ekran9.indexOf("PAZARYERİ BAŞINA GİRDİ — FİYAT + KOMİSYON"),
    ekran9.indexOf("══════════════ SONUÇ ══════════════"),
  );
  kontrol(
    "formda kanal başına FİYAT kutusu var",
    blok9.includes("setKanalFiyatlari((o) => ({ ...o, [k.kod]: v }))"),
  );
  /**
   * ⚠ PASTANIN PAYDASI KANALIN KENDİ FİYATI. Ortak girdiden okunsaydı
   * TY'nin pastası HB'nin buy box'ına bölünür, dilimler yanlış oranda
   * çizilir ve MAKUL GÖRÜNÜRDÜ — hiçbir sayı imkânsız çıkmazdı.
   */
  const kart9 = ekran9.slice(ekran9.indexOf("function KanalKutusu("));
  kontrol(
    "pasta paydası kanalın KENDİ fiyatı",
    /toplam=\{sonuc\.satisFiyati/.test(kart9),
  );
  kontrol(
    "kullanılan satış fiyatı kutuda yazıyor",
    kart9.includes('t("kullanilanSatis")'),
  );
  /** Ürün değişince önceki ürünün buy box'ı kutuda kalmamalı. */
  kontrol(
    "yeni üründe elle fiyatlar sıfırlanıyor",
    ekran9.includes("setKanalFiyatlari({})"),
  );
}

// ===========================================================================
console.log("");
console.log("10) EKRAN — son satış fiyatı, yanıltıcı satır, durum rengi");
// ===========================================================================
{
  const ekran = readFileSync("src/app/simulasyon/deneme.tsx", "utf8");

  /**
   * ⚠ ORTALAMA DEĞİL SON SATIŞ (kullanıcı kararı 21.08.2026). Ortalama,
   * aylar önceki bir fiyatı bugünkü denemeye karıştırır ve fiyat kaymasını
   * gizler. Desen `ara()` içinde TEK yerde geçmeli.
   */
  kontrol(
    "satış alanı SON satış fiyatından doluyor",
    ekran.includes("setSatis(z.sonSatisFiyati.toFixed(2))"),
  );
  kontrol(
    "  ...ortalama satış artık ALANI DOLDURMUYOR",
    !ekran.includes("setSatis(z.ortalamaSatis"),
  );
  const zemin = readFileSync("src/lib/simulasyon/urun-zemini.ts", "utf8");
  /**
   * ⚠ SON SATIŞ, ORTALAMAYLA AYNI KÜMEDEN: iki rakam farklı kümelerden
   * gelseydi ekranda yan yana durup birbirini yalanlarlardı.
   */
  /**
   * ⚠ DESENİ DOSYADA DEĞİL SORGU BLOĞUNDA ARA: `iptalTarihi: null` bu
   * dosyada İKİ kez geçiyor (ortalama satış sorgusu + son satış sorgusu).
   * Dosyanın tamamında aramak, son satış sorgusundan süzgeç kalksa bile
   * yeşil kalırdı — ötekini bulurdu.
   */
  const sonSatisSorgusu = zemin.slice(
    zemin.indexOf("const sonSatis = await"),
    zemin.indexOf("const stok = await"),
  );
  kontrol(
    "son satış sorgusu bulundu",
    sonSatisSorgusu.length > 50,
    sonSatisSorgusu.length,
  );
  kontrol(
    "  ...iptalli satışları DIŞLIYOR",
    sonSatisSorgusu.includes("iptalTarihi: null"),
  );
  kontrol(
    "  ...ve EN SON satışı alıyor (soldAt desc)",
    sonSatisSorgusu.includes('soldAt: "desc"'),
  );

  /**
   * ⚠ YANILTICI SATIR GİTTİ. "satış ve alış fiyatını gir" cümlesi formun
   * GENEL durumunu anlatıyordu ama komisyon kutusunun ALTINDA duruyordu —
   * o kutuya ne yazılacağını söylüyormuş gibi okunuyordu (kullanıcı bildirdi).
   */
  kontrol("yanıltıcı 'oranHenuz' satırı ekranda YOK", !ekran.includes("oranHenuz"));
  const sozluk = readFileSync("messages/tr.json", "utf8");
  kontrol("  ...sözlükten de kalktı", !sozluk.includes("oranHenuz"));

  /**
   * ⚠ DESEN İKİ YERDE GEÇİYOR (girdi kutusu + sonuç kutusu) — her yer AYRI
   * sınanır. Birini bozan mutasyon ötekini ayakta bırakırdı ve tarama yeşil
   * kalırdı.
   */
  const girdiKutusu = ekran.slice(
    ekran.indexOf("function KanalGirdiKutusu("),
    ekran.indexOf("function MiniAlan("),
  );
  const sonucKutusu = ekran.slice(ekran.indexOf("function KanalKutusu("));
  for (const [ad, blok] of [
    ["girdi kutusu", girdiKutusu],
    ["sonuç kutusu", sonucKutusu],
  ] as const) {
    kontrol(
      `${ad}: renk DURUM_SERIDI'nden geliyor`,
      blok.includes("DURUM_SERIDI[durum]"),
    );
    /**
     * ⚠ AYNI ÖLÇÜT İKİ YERDE. Kazanan yeşil, zarar kırmızı, hesaplanmayan
     * nötr — iki kutu farklı ölçüt kullansaydı aynı kanal yukarıda yeşil
     * aşağıda mavi görünürdü.
     */
    kontrol(
      `  ...${ad}: kazanan olumlu, zarar olumsuz, hesaplanmayan nötr`,
      /kazanan[\s\S]{0,60}"olumlu"/.test(blok) &&
        blok.includes('"olumsuz"') &&
        blok.includes('"notr"'),
    );
    /**
     * Gri kutu duvarı gitti: zemin `bg-card`, gri `bg-muted` değil.
     *
     * ⚠ İŞARET `className`E BAĞLI, ADA DEĞİL. İlk yazımda yalnız
     * `blok.includes("bg-card")` vardı ve mutasyon (kutuyu `bg-muted`e
     * çevir) YEŞİL kaldı: `bg-card` bu bloğun YORUMUNDA da geçiyor ve
     * tarama onu buluyordu. Desen dosyada bulunuyor diye davranış
     * gerçekleşmiş olmuyor.
     */
    kontrol(
      `  ...${ad}: zemin bg-card`,
      blok.includes("className={`bg-card"),
    );
    /*
     * ⚠ "HİÇ bg-muted GEÇMESİN" DİYE BİR KONTROL YAZILMADI ve yazılmamalı:
     * kartın İÇİNDEKİ kompakt rakam hücreleri bilerek hafif gri (İlke #12).
     * Yanlış kapsamlı bir kontrol, doğru kodu kırmızı yakardı — nitekim ilk
     * denemede tam bunu yaptı. Ölçüt kartın KABUĞU, içindeki hücreler değil.
     */
  }

  /**
   * ⚠ KAZANAN "İLK SIRADAKİ" DEĞİL, "HESAPLANMIŞ İLK SIRADAKİ". Hiçbir
   * kanal hesaplanamadığında sıralama girdiyi bozmaz ve listenin ilki
   * kazanmış gibi görünürdü — sondada tam bu körlük yakalanmıştı.
   */
  kontrol(
    "kazanan kanal NET-2'si null olamaz",
    /kazananKod =[\s\S]{0,140}net2 !== null/.test(ekran),
  );

  /**
   * ── GİRDİ KUTUSU GİRDİ GİBİ GÖRÜNÜYOR MU ────────────────────────────
   * ⚠ Kullanıcı bildirdi 21.08.2026: _"rakam ve oran yazılacak yerler belli
   * değil"_. Kutular `bg-transparent` + kenarlıksızdı; rakam kartın
   * ortasında boşlukta duruyordu ve yazılabilir olduğu görünmüyordu
   * (İlke #2). Kontrol `MiniAlan` gövdesine DARALTILDI — `border-input`
   * dosyanın başka yerlerinde de geçiyor.
   */
  const miniAlan = ekran.slice(
    ekran.indexOf("function MiniAlan("),
    ekran.indexOf("── KANAL KUTUSU — ÜÇ KATMAN"),
  );
  kontrol("MiniAlan gövdesi bulundu", miniAlan.length > 200, miniAlan.length);
  kontrol(
    "  ...girdi kutusunun KENARLIĞI var",
    miniAlan.includes("border-input") && miniAlan.includes("bg-background"),
  );
  kontrol(
    "  ...odaklanınca görünür (focus-within)",
    miniAlan.includes("focus-within:ring"),
  );
  kontrol(
    "  ...dokunma hedefi 44 px (h-11)",
    miniAlan.includes("h-11"),
  );
  /**
   * ⚠ BİRİM RAKAMIN YANINDA. Etikete yazmak yetmiyordu: göz rakama bakıyor,
   * etikete değil. Fiyat kutusunda ₺ önek, oran kutusunda % sonek.
   */
  const girdiKutusu2 = ekran.slice(
    ekran.indexOf("function KanalGirdiKutusu("),
    ekran.indexOf("function MiniAlan("),
  );
  kontrol(
    "fiyat kutusunda para işareti (önek)",
    /kanalFiyati"\)\}[\s\S]{0,200}onek=\{t\("birimPara"\)\}/.test(girdiKutusu2),
  );
  kontrol(
    "oran kutusunda yüzde işareti (sonek)",
    /kanalOrani"\)\}[\s\S]{0,200}sonek=\{t\("birimYuzde"\)\}/.test(girdiKutusu2),
  );

  /** Hiç satılmamış üründe ortak fiyat ZORUNLU DEĞİL — metin de öyle diyor. */
  kontrol(
    "hiç satılmamış üründe 'boş kalabilir' deniyor",
    sozluk.includes("BOŞ kalabilir"),
  );
}

// ===========================================================================
console.log("");
console.log("11) HEPSİNİ TEMİZLE — tek düğme, HİÇBİR alan geride kalmasın");
// ===========================================================================
{
  /**
   * ⚠ KULLANICI 22.08.2026: "hepsinde çarpı var, o da iş görüyor ama komple
   * temizlik yapabileceğim bir düğmeye ihtiyacım var." Dört kanal × iki kutu
   * + dört ortak alan = on iki ayrı temizleme.
   *
   * ⚠ ASIL RİSK "DÜĞME VAR MI" DEĞİL, "HEPSİNİ Mİ TEMİZLİYOR". Yarım
   * temizleyen bir düğme en kötüsüdür: kullanıcı formu boş SANIR, oysa bir
   * kanalda eski oran durmaktadır ve sonraki denemenin hükmünü sessizce
   * bozar. Bu yüzden her alan TEK TEK sınanıyor.
   */
  const ekran = readFileSync("src/app/simulasyon/deneme.tsx", "utf8");
  const govde = ekran.slice(
    ekran.indexOf("const hepsiniTemizle = () => {"),
    ekran.indexOf("const sayi = (m: string)"),
  );
  kontrol("temizleme işlevi bulundu", govde.length > 100, govde.length);

  /**
   * Durum listesi KAYNAKTAN türetiliyor, elle yazılmıyor: yarın yeni bir
   * `useState` eklenip temizlemeye yazılmazsa bu kontrol kırmızı yanar.
   * Elle liste tutulsaydı yeni alanı eklemeyi unutan kişi testi de
   * unuturdu ve kontrol sessizce eskirdi.
   */
  const durumlar = [...ekran.matchAll(/const \[[a-zA-Z]+, (set[A-Z][a-zA-Z]*)\]/g)].map(
    (m) => m[1]!,
  );
  kontrol("ekranın durum listesi okundu", durumlar.length >= 8, durumlar.length);

  /** `araniyor` bir geçiş bayrağı (useTransition), temizlenecek bir alan değil. */
  const HARIC = ["setKod"];
  const temizlenmeyen = durumlar.filter(
    (d) => !govde.includes(`${d}(`) && !HARIC.includes(d),
  );
  kontrol(
    "her durum alanı temizleniyor",
    temizlenmeyen.length === 0,
    temizlenmeyen,
  );
  /** Arama kutusu da temizlenmeli — ürün bırakılıyorsa kodu da gitmeli. */
  kontrol("arama kutusu da temizleniyor", govde.includes("setKod(\"\")"));

  /**
   * ⚠ KDV ORANI BOŞA DEĞİL VARSAYILANA DÖNER. Boş bırakılsaydı kapı
   * kapanır ve kullanıcı hesabın neden çıkmadığını anlamazdı.
   */
  kontrol(
    "KDV oranı varsayılana dönüyor (boşa DEĞİL)",
    govde.includes("setKdv(String(VARSAYILAN_KDV_ORANI))"),
  );
  kontrol("KDV dili varsayılana dönüyor", govde.includes("setKdvDahil(true)"));

  /**
   * ⚠ DÜĞME YALNIZ DOLUYKEN GÖRÜNÜR. Boş formda duran bir "temizle"
   * düğmesi tıklanınca hiçbir şey yapmaz ve kullanıcıya ekranın bozuk
   * olduğunu düşündürür (İlke #5).
   */
  kontrol(
    "düğme forma bağlı (formDolu)",
    /\{formDolu \? \(/.test(ekran) && ekran.includes("hepsiniTemizle}"),
  );
  /** Boşluk ölçütü ürün ve kanal kutularını da kapsamalı. */
  const dolulukGovdesi = ekran.slice(
    ekran.indexOf("const formDolu ="),
    ekran.indexOf("const hepsiniTemizle"),
  );
  for (const alan of ["urun !== null", "kanalFiyatlari", "kanalOranlari"]) {
    kontrol(
      `  ...doluluk ölçütü ${alan} kapsıyor`,
      dolulukGovdesi.includes(alan),
    );
  }
}

// ===========================================================================
console.log("");
console.log("12) N11 KESİNTİLERİ — GERÇEK HAKEDİŞ EKSTRESİNDEN");
// ===========================================================================
{
  /**
   * ⚠ KAYNAK DEĞİŞTİ: nesatilir → N11'İN KENDİ EKSTRESİ (22.08.2026).
   *
   * Kullanıcı "Para Transferi Listesi"nden bir hakediş detayı gönderdi ve
   * denklem KURUŞUNA kapandı:
   *
   *     Satış Tutarı        9.599,00
   *     Komisyon Tutarı     1.535,84   → %16,0000  (üstüne KDV YOK)
   *     Pazarlama Bedeli      115,19   → %1,2000
   *     Pazaryeri Bedeli       76,79   → %0,8000
   *     Vergi Kesintisi        79,99   → 9.599/1,2 × %1 = STOPAJ
   *     ─────────────────────────────
   *     Net Transfer        7.791,19   ✓ fark 0,0000
   *
   * ⚠ MATRAH BAĞIMSIZ DOĞRULANDI: stopaj satırı ancak KDV HARİÇ tutarın
   * %1'i olarak çıkıyor, dolayısıyla 9.599 KDV DAHİL demektir. Üç oran da
   * YALNIZ o tabanda tam yuvarlak sayı veriyor. Önce "KDV dahil mi hariç mi
   * ayırt edilemedi" diye beyan edilen belirsizlik böylece kapandı.
   */
  const EKSTRE_SATIS = 9599.0;
  const kesinti = (kod: string, satis: number): number => {
    const k = simulasyonKarsilastir(
      {
        kdvDahilMi: true,
        alisFiyati: 500,
        kdvOrani: 20,
        kargoUcreti: null,
        kanalFiyatlari: { N11: satis },
        kanalOranlari: { N11: 16 },
      },
      BUGUN,
    ).find((x) => x.kod === "N11")!;
    return k.dokum.find((d) => d.kod === kod)?.tutar ?? 0;
  };

  /** Ekstrenin kendi satırları — motor onları ÜRETEBİLMELİ. */
  yakin("Pazarlama Bedeli = 115,19", kesinti("PAZARLAMA_HIZMET", EKSTRE_SATIS), 115.19, 0.01);
  yakin("Pazaryeri Bedeli = 76,79", kesinti("PAZARYERI_BEDELI", EKSTRE_SATIS), 76.79, 0.01);
  yakin("Komisyon = 1.535,84", kesinti("KOMISYON", EKSTRE_SATIS), 1535.84, 0.01);
  yakin("Stopaj (vergi kesintisi) = 79,99", kesinti("STOPAJ", EKSTRE_SATIS), 79.99, 0.01);

  /**
   * ⚠ İKİ AYRI KALEM OLMALI — TEK KALEMDE TOPLAMAK YETMEZ. Toplamı %2,00
   * tutan tek bir kesinti aynı NET'i verir ama ekstreyle satır satır
   * karşılaştırılamaz; kanal yarın birini değiştirirse hangisi olduğu
   * bilinemez. Ekstrenin ayırdığını biz de ayırıyoruz.
   */
  const n11Kural = SIMULASYON_KANALLARI.find((k) => k.kod === "N11")!;
  kontrol(
    "iki AYRI kesinti kalemi var",
    n11Kural.kesintiler.length === 2,
    n11Kural.kesintiler.map((k) => k.code),
  );
  kontrol(
    "  ...biri PAZARYERI_BEDELI (önceden HİÇ yoktu)",
    n11Kural.kesintiler.some((k) => k.code === "PAZARYERI_BEDELI"),
  );

  /**
   * ⚠ ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERMELİ: iki FARKLI fiyatta
   * oranların sabit kaldığı sınanıyor. Tek fiyat, sabit tutarlı bir kuralı
   * da geçirirdi.
   */
  for (const satis of [1000, 3000]) {
    yakin(
      `  ...%1,20 oranı ${satis} ₺'de de aynı`,
      (kesinti("PAZARLAMA_HIZMET", satis) / satis) * 100,
      1.2,
      0.001,
    );
    yakin(
      `  ...%0,80 oranı ${satis} ₺'de de aynı`,
      (kesinti("PAZARYERI_BEDELI", satis) / satis) * 100,
      0.8,
      0.001,
    );
  }

  /**
   * ⚠ ROZET ARTIK OLCULDU — çünkü kaynak dış bir hesaplayıcı değil kanalın
   * KENDİ ekstresi. Ama örneklem beyan ediliyor: "ölçüldü" demek "yeterince
   * ölçüldü" demek değildir.
   */
  kontrol("rozet OLCULDU (gerçek ekstre)", n11Kural.kaynak === "OLCULDU");
  /**
   * ⚠ ÖRNEKLEM n=1 → n=3 (aynı gün). N11'in KOMİSYON FATURASI geldi ve üç
   * satış birden ölçüldü: ₺4.299 (%10) · ₺6.299 (%15) · ₺9.599 (%16).
   * Üçünde de pazarlama %1,2000 ve pazaryeri %0,8000 — üç FARKLI tutarda
   * aynı oran, yani sabit terim ihtimali kapandı.
   */
  kontrol(
    "  ...kaynak notu belgeyi ve örneklemi yazıyor",
    n11Kural.kaynakNotu.includes("E-FATURA") &&
      n11Kural.kaynakNotu.includes("n=3"),
    n11Kural.kaynakNotu.slice(0, 60),
  );
  /**
   * ⚠ BELİRSİZLİK KAPANDI — ve kapandığı için SUSTURULDU, gizlenmedi.
   * Son soru "kesilen komisyon KDV içeriyor mu" idi; N11'in resmî
   * e-faturası (`DPE2026000325810`) her kalemi matrah+KDV olarak ayırıyor
   * ve toplamı hakedişteki kesintinin TAM kendisi:
   *     komisyon  2.425,49 + 485,10 = 2.910,59  ↔ hakediş 2.910,59
   *     pazarlama   201,98 +  40,40 =   242,38  ↔ hakediş   242,37
   *     pazaryeri   134,64 +  26,93 =   161,57  ↔ hakediş   161,57
   * Motorun varsayımı doğruymuş; artık varsayım değil ÖLÇÜM.
   *
   * ⚠ BOŞ BELİRSİZLİK "ölçülmedi" DEMEK DEĞİL — kaynak notu neyin
   * ölçüldüğünü tek tek yazıyor. Boş bırakılan alan, doldurulmayı bekleyen
   * değil KAPANMIŞ bir sorudur ve bunu kaynak notu kanıtlar.
   */
  kontrol("belirsizlik kalmadı (fatura kapattı)", n11Kural.belirsizlik === null);
  kontrol(
    "  ...ve resmî fatura kaynak notunda ADIYLA yazılı",
    n11Kural.kaynakNotu.includes("DPE2026000325810"),
  );
  kontrol(
    "  ...KDV hükmü de yazılı (kesilen tutar KDV DAHİL)",
    n11Kural.kaynakNotu.includes("KDV DAHİL"),
  );
  /** nesatilir'in rakamı artık hiçbir yerde kullanılmamalı. */
  kontrol(
    "nesatilir'in %1,258'i KULLANILMIYOR",
    !n11Kural.kesintiler.some((k) => "rate" in k && k.rate === 1.258),
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
