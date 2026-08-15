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
  "Category",
  "Location",
  "Channel",
  "CargoCarrier",
  "CreditCard",
  "ExpenseCategory",
  "Supplier",
  "User",
  "StockAdjustmentReason",
  "Company",
  "Role",
  // --- yetki: rol izinleri ve üyelikler ---
  "RolePermission",
  "UserCompanyRole",
  "AuditLog",
  // --- ürün ağacı ---
  "Product",
  "ProductVariant",
  "VariantOption",
  // --- kanal ağacı ---
  "PenaltyTariff",
  "ChannelFee",
  "CargoTariff",
  "ChannelAccount",
  "ChannelSku",
  // --- gider ---
  "ExpenseTemplate",
  "Expense",
  /**
   * Kart ödemesi: `CreditCard` VE `Expense`'ten SONRA gelmeli — ikisine de
   * yabancı anahtarı var (faiz gideri bağı dahil). Sıra bozulursa geri
   * yükleme "parent kayıt yok" diye patlar.
   */
  "KartOdeme",
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
  // --- stok defteri: yukarıdakilerin hepsine bakabilir, KENDİNE de ---
  "StockMovement",
  // --- hakediş ve tazminat ---
  "Settlement",
  "SettlementItem",
  "Compensation",
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
 *
 * Sürüm 1 dosyalar OKUNABİLİR kalır; geri yükleme ekranı eksik tabloları
 * tek tek sayar ve uyarır — sessizce "tamam" demez.
 */
export const YEDEK_SURUMU = 5;

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
