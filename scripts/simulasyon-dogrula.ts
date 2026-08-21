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
  yakin("N11 NET-2", bul("N11").net2!, 172.85);

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
  kontrol(
    "kanal kutusunda oran DÜZENLENEBİLİR",
    ekran.includes("oranDegistir"),
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

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
