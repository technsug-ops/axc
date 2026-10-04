import { TEKNIK_ADLAR, UYGULAMA } from "@/lib/uygulama";

/**
 * ============================================================================
 *  YEDEK DOSYA BİÇİMİ — SABİTLER VE TİP
 * ----------------------------------------------------------------------------
 *  Veritabanına HİÇ dokunmaz, bu yüzden istemci bileşenlerinden de
 *  içe aktarılabilir. Geri yükleme ekranı tablo listesini ve sürüm
 *  numarasını tarayıcıda kullanıyor; bunlar  içinde kalsaydı
 *  Prisma istemcisi tarayıcı paketine sızardı (12.08.2026 derleme hatası).
 * ============================================================================
 */

/**
 * Yedeğe giren tablolar — ekranda da bu liste gösterilir.
 *
 * SIRA TESADÜFİ DEĞİL: BAĞIMLILIK SIRASIDIR. Önce kimseye bağlı olmayan
 * tablolar, sonra onlara bağlı olanlar. Geri yükleme bu sırayla YAZAR,
 * TERS sırayla SİLER. Sıra bozulursa yabancı anahtar hatası alınır.
 *
 * Yeni model eklendiğinde BURAYA DA EKLENİR. Eklenmezse o tablo sessizce
 * yedeklenmez ve felaket anında kaybolur — 12.08.2026'da tam olarak bu
 * yaşandı: Supplier, Settlement, SettlementItem, Compensation ve User
 * listede yoktu, gece yedekleri aylardır eksik alınıyordu.
 * `yedek:dogrula` artık bu listeyi şemayla karşılaştırıyor.
 */
export const YEDEK_TABLOLARI = [
  // --- kimseye bağlı olmayanlar ---
  /**
   * K303 Aşama 2/3b — `Company` EN BAŞTA: firmaya ait 49 tablo `companyId`
   * ile ona bağlı. Eskiden `StockAdjustmentReason`dan sonra duruyordu (o gün
   * kimse ona bağlı değildi); öyle kalsaydı geri yükleme ilk firmalı tabloda
   * yabancı anahtarla düşerdi. `yedek:dogrula` sıra bekçisi yakaladı.
   */
  "Company",
  "Category",
  /** K283 — `Category`ye bağlı (categoryId, SetNull); kategoriden SONRA. */
  "TyKategoriEslesme",
  /** K285 — marka kod tablosu; `Product.brandId` buna bağlı → ürünlerden ÖNCE. */
  "Brand",
  /**
   * ⚠ `Location`DAN ÖNCE — `Location.bolumId` buna bağlı.
   * Geri yükleme sırası bağımlılığı izler; bölüm sonra gelseydi raflar
   * var olmayan bir bölüme bağlanmaya çalışır ve yabancı anahtar patlardı.
   */
  "DepoBolumu",
  "Location",
  "Channel",
  "CargoCarrier",
  "CreditCard",
  "ExpenseCategory",
  "Supplier",
  "User",
  "StockAdjustmentReason",
  "Role",
  // --- yetki: rol izinleri ve üyelikler ---
  "RolePermission",
  "UserCompanyRole",
  "AuditLog",
  // --- ürün ağacı ---
  "Product",
  "ProductVariant",
  "VariantOption",
  /** K287 — eski kodlar; `ProductVariant`e bağlı (RESTRICT) → varyantlardan SONRA. */
  "EskiKod",
  // --- kanal ağacı ---
  "PenaltyTariff",
  "ChannelFee",
  "CargoTariff",
  "ChannelAccount",
  "ChannelSku",
  /**
   * KOMİSYON TARİFESİ — `ChannelAccount`tan SONRA (ona bağlı), kalemi de
   * `ProductVariant`tan sonra (isteğe bağlı `variantId` bağı var).
   *
   * ⚠ NİYE KRİTİK: Trendyol'un TAM DİLİMLİ ileri tarifesi satıcı panelinden
   * ARŞİVE İNMİYOR. O hafta indirilmezse bir daha elde edilemez — yani bu
   * iki tablo, kaybolursa YENİDEN ÜRETİLEMEYEN tek veri kümesi. Ötekiler
   * en kötü ihtimalle pazaryerinden yeniden çekilir; bu çekilemez.
   *
   * ⚠ VE BU BOŞLUK BİR SÜRE AÇIK KALDI. `yedek:dogrula` kapsam bekçisi onu
   * bulmuştu ve KIRMIZI yanıyordu; görülmemesinin sebebi bekçinin rutin
   * doğrulama listesinde olmamasıydı (ölçüldü 21.08.2026: 36 bekçiden
   * yalnız 7'si her teslimde koşuluyordu). Bekçi vardı, koşulmuyordu.
   */
  "KomisyonTarifesi",
  "KomisyonTarifeKalemi",
  // --- gider ---
  "ExpenseTemplate",
  "Expense",
  /**
   * Kart ödemesi: `CreditCard` VE `Expense`'ten SONRA gelmeli — ikisine de
   * yabancı anahtarı var (faiz gideri bağı dahil). Sıra bozulursa geri
   * yükleme "parent kayıt yok" diye patlar.
   */
  "KartOdeme",
  // Geçmiş beyan ekstreleri — karta bağlı, KartOdeme ile aynı seviyede.
  "GecmisEkstre",
  /**
   * K304 — finansman: kaynak ÖNCE, hareket SONRA; hareket `Expense`e (faiz
   * gideri) bağlı olduğu için giderden de sonra. Ters kayıt kendi tablosuna
   * işaret eder — geri yüklemede FK denetimi kapalı olduğu için sıra sorunu yok.
   */
  "Finansman",
  "FinansmanHareketi",
  // K304-② — kullanıcının girdiği birim fiyatları (bağımsız tablo).
  "FinansmanBirimFiyati",
  // --- alım ---
  "Purchase",
  "PurchaseItem",
  // --- satış ve iade ---
  "Sale",
  "SaleItem",
  "SaleFee",
  "Return",
  "ReturnItem",
  "ReturnFee",
  // İade bildirimi (RMA) — Sale, ProductVariant, Return ve User'a bakar,
  // bu yüzden dördünden de SONRA gelir.
  "ReturnNotice",
  // --- fiziksel sayım (K57) ---
  // ⚠ STOK DEFTERİNDEN ÖNCE GELİR. `StockMovement.sayimSatiriId` sayım
  // satırına bakıyor; sıra ters olsaydı sayım düzeltmesi geri yüklenirken
  // hedefini bulamaz ve YABANCI ANAHTAR HATASI verirdi. Sıra bağımlılık
  // yönündedir, alfabe ya da tabloların yaşı değil.
  "StokSayimi",
  "StokSayimSatiri",
  // --- muhasebe dönemi (K108): `kapatanId` ile `User`a bakar, o yüzden
  //     kullanıcılardan SONRA; başka hiçbir tabloya bağlı değil. ---
  "MuhasebeDonemi",
  // --- günlük özet (K-OZET): hiçbir yabancı anahtarı yok, sırası serbest ---
  "AiOzet",
  // --- stok defteri: yukarıdakilerin hepsine bakabilir, KENDİNE de ---
  "StockMovement",
  // --- hakediş ve tazminat ---
  "Settlement",
  "SettlementItem",
  "Compensation",
  // --- destek talepleri ---
  // EKLERDEN ÖNCE: Attachment polimorfik olarak Talep'e de bağlanabiliyor
  // (`targetType = "Talep"`). Geri yüklemede önce hedef, sonra ek gelmeli;
  // sıra bağımlılık yönündedir.
  "Talep",
  // --- dosya ekleri ---
  // ⚠ YALNIZ SATIRLAR YEDEKLENİR, DOSYALARIN KENDİSİ DEĞİL (karar
  // 13.08.2026). Dosyalar Vercel Blob'da durur. Telafi üçlüsü: bu satırlar
  // + yedekteki EK MANİFESTİ + geri yükleme ekranındaki "N ek bu dosyada
  // yok, Blob'da" uyarısı. Blob yedekleme stratejisi ayrı karar maddesi.
  "Attachment",
] as const;

/**
 * Dosya biçimi sürümü.
 *   1 — ilk sürüm (10.08.2026)
 *   2 — Supplier, User, Settlement, SettlementItem, Compensation eklendi
 *       ve tablo sırası bağımlılık sırasına çevrildi (12.08.2026)
 *   5 — ReturnNotice (RMA bildirimi) ve Attachment eklendi (13.08.2026).
 *       Attachment'ta YALNIZ SATIRLAR var; dosyalar Blob'da kalır ve JSON
 *       yedeğe girmez (kullanıcı kararı). Yedek, ek manifesti taşır.
 *   4 — Company, Role, RolePermission, UserCompanyRole, AuditLog
 *       eklendi (13.08.2026). Kapsam bekçisi migration'dan hemen sonra
 *       kırmızı yandı; aynı pakette kapatıldı.
 *   3 — StockAdjustmentReason eklendi (12.08.2026). Bu kez unutulmadı:
 *       `yedek:dogrula` kapsam bekçisi migration'dan hemen sonra yakaladı.
 *   6 — KomisyonTarifesi ve KomisyonTarifeKalemi eklendi (22.08.2026).
 *       ⚠ BU KEZ UNUTULMUŞTU: bekçi kırmızı yanıyordu ama bekçinin kendisi
 *       koşulmuyordu. Tarife verisi kaybolursa YENİDEN ÜRETİLEMEZ (tam
 *       dilimli ileri tarife arşivden inmiyor), yani boşluk en pahalı
 *       yerdeydi. Ders bekçiye değil RUTİNE yazıldı: artık her teslimde
 *       `npm run bekci` bütün bekçileri koşuyor.
 *
 * Sürüm 1 dosyalar OKUNABİLİR kalır; geri yükleme ekranı eksik tabloları
 * tek tek sayar ve uyarır — sessizce "tamam" demez.
 */
export const YEDEK_SURUMU = 6;

/**
 * ============================================================================
 *  YEDEK ADLARI — YAZAN TEK AD, OKUYAN BÜTÜN ADLAR (04.10.2026)
 * ----------------------------------------------------------------------------
 *  Ürün adı «Selliora»dan «Bezirga»ya döndü. Yeni yedekler yeni teknik adla
 *  yazılır (`bezirga-<gün>.json`, `bicim: "bezirga-yedek"`); eski adla
 *  yazılmış yedekler OKUNMAYA devam eder — felaket anında elde olan dosya
 *  eski adlı olabilir ve "bu bir yedek değil" demek felaketi büyütürdü.
 *
 *  ⚠ BİÇİM ALANI ADIN PARÇASI, İÇERİĞİN DEĞİL: `selliora-yedek` ile
 *  `bezirga-yedek` aynı yapıyı taşır; içerik farkı `surum`dadır.
 *  ⚠ Ad listesi `TEKNIK_ADLAR`dan gelir; burada elle yazılmaz.
 * ============================================================================
 */
export const YEDEK_BICIMI = `${UYGULAMA.teknikAd}-yedek`;

/** Okumada kabul edilen biçimler — güncel ve eski adlar. */
export const TANINAN_YEDEK_BICIMLERI: readonly string[] = TEKNIK_ADLAR.map(
  (ad) => `${ad}-yedek`,
);

/**
 * Teknik adlar yalnız küçük harf olmak ZORUNDA — kalıba kaçırılmadan girer.
 * Kaçırma yerine kapı: harf dışı bir ad yazılırsa modül yüklenirken düşer.
 */
const AD_SECENEKLERI = TEKNIK_ADLAR.map((ad) => {
  if (!/^[a-z]+$/.test(ad)) throw new Error(`teknik ad yalniz kucuk harf olmali: ${ad}`);
  return ad;
}).join("|");

/** Gece yedeğinin adı — `yedek/` klasörü çağıranda eklenir. */
export function gunlukYedekAdi(gun: string): string {
  return `${UYGULAMA.teknikAd}-${gun}.json`;
}

/** Gece yedeği mi (güncel ya da eski adlı)? `guvenlik-*` değil. */
export function gunlukYedekMi(dosyaAdi: string): boolean {
  return TEKNIK_ADLAR.some((ad) => dosyaAdi.startsWith(`${ad}-`));
}

/** İndirilebilir yedek adları: gece yedeği (her ad) + güvenlik yedeği. */
export const INDIRILEBILIR_YEDEK_KALIBI = new RegExp(
  String.raw`^((?:${AD_SECENEKLERI})-\d{4}-\d{2}-\d{2}|guvenlik-[\dTZ:.-]+)\.json$`,
);

/** Geri yüklenebilir yedek adları — indirme kalıbının geniş hâli. */
export const GERI_YUKLENEBILIR_YEDEK_KALIBI = new RegExp(
  String.raw`^(?:${AD_SECENEKLERI}|guvenlik)-[\w:.-]+\.json$`,
);

export type YedekDosyasi = {
  bicim: string;
  surum: number;
  olusturulmaAni: string;
  /** true ise kargo tarifeleri dosyada YOK; seed ile tamamlanır. */
  kargoTarifesiHaric: boolean;
  satirSayilari: Record<string, number>;
  tablolar: Record<string, unknown[]>;

  /**
   * EK MANİFESTİ — dosya, İÇİNDE OLMAYAN şeyi de söyler.
   *
   * Ek dosyaları (fotoğraf, fatura) Blob'da durur ve bu JSON'a girmez
   * (kullanıcı kararı 13.08.2026). Sessizce yok saymak, geri yükleyen
   * kişiye "her şey burada" yalanını söylerdi. Bu blok sayıyı ve yolları
   * taşır; geri yükleme ekranı "N ek bu dosyada yok, Blob'da" uyarısını
   * buradan üretir.
   *
   * Sürüm 4 ve öncesi dosyalarda YOKTUR — okuyan taraf yokluğunu
   * "ek yok" değil "bilinmiyor" saymalıdır.
   */
  ekManifesti?: {
    adet: number;
    toplamBayt: number;
    yollar: string[];
  };
};

/**
 * @param an Dosyaya yazılacak zaman damgası — dışarıdan verilir ki üretim
 *           saati okuma sorumluluğu tek yerde kalsın.
 */
