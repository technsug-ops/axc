/**
 * ============================================================================
 *  İÇE AKTARMA — SAYFA VE SÜTUN TANIMLARI (TEK KAYNAK)
 * ----------------------------------------------------------------------------
 *  Şablonu ÜRETEN kod da, yüklenen dosyayı OKUYAN kod da buradan beslenir.
 *  İkisi ayrı yerde tanımlansaydı bir gün biri değişir, öteki değişmez ve
 *  "şablonu indirdim, kendi şablonumu yükleyemiyorum" hatası çıkardı.
 *
 *  BAŞLIK METİNLERİ SÖZLÜKTEN GELİR (i18n kuralı). Burada yalnızca kararlı
 *  ANAHTARLAR durur; okuyucu, dosyadaki başlıkları o anki dilin sözlüğüyle
 *  eşleştirir. İngilizce eklendiğinde İngilizce şablon üretilir ve İngilizce
 *  başlıklı dosya okunur — kod değişmez.
 * ============================================================================
 */

export const SAYFALAR = ["urunler", "acilisStogu", "kanalSku"] as const;
export type SayfaAnahtari = (typeof SAYFALAR)[number];

/** Referans sayfaları — okunmaz, yalnızca kullanıcıya yardım eder. */
export const YARDIMCI_SAYFALAR = ["listeler", "yardim"] as const;

export type SutunTanimi = {
  anahtar: string;
  zorunlu: boolean;
  /** Şablonda sütun genişliği (karakter). */
  genislik: number;
};

export const SUTUNLAR: Record<SayfaAnahtari, SutunTanimi[]> = {
  urunler: [
    { anahtar: "urunAdi", zorunlu: true, genislik: 34 },
    { anahtar: "marka", zorunlu: false, genislik: 16 },
    { anahtar: "varyantAdi", zorunlu: false, genislik: 18 },
    { anahtar: "sku", zorunlu: true, genislik: 18 },
    { anahtar: "firmaSku", zorunlu: true, genislik: 18 },
    { anahtar: "barkod", zorunlu: false, genislik: 18 },
    { anahtar: "kategori", zorunlu: false, genislik: 20 },
    { anahtar: "desi", zorunlu: false, genislik: 10 },
    { anahtar: "raf", zorunlu: false, genislik: 12 },
  ],
  acilisStogu: [
    { anahtar: "sku", zorunlu: true, genislik: 18 },
    { anahtar: "adet", zorunlu: true, genislik: 10 },
    { anahtar: "birimMaliyet", zorunlu: false, genislik: 16 },
    { anahtar: "paraBirimi", zorunlu: false, genislik: 12 },
    { anahtar: "tarih", zorunlu: false, genislik: 14 },
    { anahtar: "raf", zorunlu: false, genislik: 12 },
    { anahtar: "not", zorunlu: false, genislik: 30 },
  ],
  kanalSku: [
    { anahtar: "sku", zorunlu: true, genislik: 18 },
    { anahtar: "kanalHesabi", zorunlu: true, genislik: 30 },
    { anahtar: "kanalKodu", zorunlu: false, genislik: 20 },
    { anahtar: "komisyonOrani", zorunlu: false, genislik: 16 },
  ],
};

/** Şablondaki örnek satırlar — hangi biçimde yazılacağı görünsün diye. */
export const ORNEK_SATIRLAR: Record<SayfaAnahtari, string[][]> = {
  urunler: [
    ["Bluetooth Hoparlör", "JBL", "", "HOP-001", "FRM-1001", "8690000000011", "Genel", "3,5", "A-01"],
    ["Tişört", "Koton", "M / Siyah", "TSH-M-S", "FRM-2001", "8690000000028", "Genel", "0,8", "A-02"],
    ["Tişört", "Koton", "L / Siyah", "TSH-L-S", "FRM-2002", "8690000000035", "Genel", "0,8", "A-02"],
  ],
  acilisStogu: [
    ["HOP-001", "10", "1200", "TRY", "01.03.2026", "A-01", "devir stoğu"],
    ["HOP-001", "5", "1450", "TRY", "20.06.2026", "A-01", "ikinci parti"],
    ["TSH-M-S", "20", "180", "TRY", "", "A-02", ""],
  ],
  kanalSku: [
    ["HOP-001", "Trendyol — TR Ana Mağaza", "TY-HOP-001", "18,5"],
    ["HOP-001", "Hepsiburada — TR Mağaza", "HB-556677", "21"],
    ["TSH-M-S", "Trendyol — TR Ana Mağaza", "", "14"],
  ],
};
