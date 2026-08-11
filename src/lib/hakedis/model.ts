import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  HAKEDİŞ — ORTAK İÇ MODEL
 * ----------------------------------------------------------------------------
 *  Trendyol GENİŞ format verir (bir satır = bir sipariş, kesintiler kolon),
 *  Hepsiburada UZUN format verir (bir satır = bir kalem, kesintiler ayrı
 *  satır). İki okuyucu da çıktısını BU modele çevirir; bundan sonraki her
 *  şey (eşleştirme, önizleme, yazım) formatı bilmez.
 *
 *  Yarın üçüncü bir pazaryeri eklenirse yalnız bir okuyucu yazılır.
 * ============================================================================
 */

/**
 * Kalem tipleri. Pazaryerinin kendi metni DEĞİL, bizim ortak dilimiz —
 * "Komisyon tutarı" (HB) ve "TY Hakediş"in komisyon payı aynı koda düşer.
 */
export const HAKEDIS_KODLARI = [
  "SIPARIS_TUTARI",
  "KOMISYON",
  "KARGO",
  "STOPAJ",
  "HIZMET_BEDELI",
  "TAHSILAT_BEDELI",
  "KAMPANYA",
  "KUPON",
  // --- iade aynaları: aynı kalemin geri dönüşü ---
  "IADE_TUTARI",
  "KOMISYON_IADE",
  "KARGO_IADE",
  "STOPAJ_IADE",
  "HIZMET_BEDELI_IADE",
  "TAHSILAT_BEDELI_IADE",
  "KAMPANYA_IADE",
  // --- sipariş dışı ---
  "PLATFORM_HIZMET",
  "KARGO_FATURA",
  "ETICARET_STOPAJI",
  "HURDA_GELIRI",
  "DIGER",
] as const;

export type HakedisKodu = (typeof HAKEDIS_KODLARI)[number];

/** Sipariş numarasına bağlanmayan, döneme yazılan kalemler. */
export const SIPARIS_DISI_KODLAR: HakedisKodu[] = [
  "PLATFORM_HIZMET",
  "KARGO_FATURA",
  "ETICARET_STOPAJI",
  "HURDA_GELIRI",
];

/**
 * Normalize edilmiş tek satır.
 *
 * TUTAR İŞARETİ: gelir POZİTİF, gider NEGATİF. Pazaryerleri bunu farklı
 * gösteriyor (HB'de "Kayıt Türü: Gider" kolonu var, TY'de kesintiler ayrı
 * kolonlarda pozitif duruyor); okuyucular işareti burada tekleştirir.
 * Toplam almak isteyen kimse ayrıca kural bilmek zorunda kalmasın.
 */
export type HakedisSatiri = {
  /** Pazaryerinin Kayıt No'su — idempotentliğin anahtarı. */
  externalId: string;
  kod: HakedisKodu;
  /** Ham "Kayıt Tipi" / "İşlem Tipi" metni — tanınmayanı görebilmek için. */
  hamTip: string;
  /** Pazaryeri sipariş numarası. Sipariş dışı kalemlerde null. */
  siparisNo: string | null;
  tutar: number;
  paraBirimi: Currency;
  /** Vade tarihi — UTC gece yarısı. */
  vadeTarihi: Date | null;
  /** Paranın hesaba geçtiği gün. HB'de var, TY'de YOK. */
  odemeTarihi: Date | null;
  /** İkincil doğrulama: TY'de barkod, HB'de kanal SKU. */
  urunKodu: string | null;
  /** Elektronik tablodaki satır numarası — hata mesajı buna işaret eder. */
  satirNo: number;
  /** Ham satırın okunur özeti; kaynağa dönmek gerekirse. */
  ham: string;
};

/** Bir dosyanın okunmuş hâli. */
export type HakedisOkumasi = {
  kanal: "TRENDYOL" | "HEPSIBURADA";
  satirlar: HakedisSatiri[];
  /** Tanınmayan başlıklar — okuyucu tutmadıysa sebebi burada. */
  eksikSutunlar: string[];
};

/**
 * ============================================================================
 *  EŞİKLER — TEK YERDE, GEREKÇESİYLE
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 11.08.2026.
 * ============================================================================
 */
export const HAKEDIS_ESIKLERI = {
  /**
   * Kaç İŞ GÜNÜ geçince "geç ödeme" sayılır.
   * Sıfır değil çünkü iş günü hesabı resmî tatilleri saymıyor; bayram
   * denk gelen dönemde beklenen tarih 2-3 gün erken çıkıyor.
   */
  gecikmeIsGunu: 3,

  /**
   * Kaç para birimi farkı "eksik/fazla ödeme" sayılır.
   * Kuruş farkları yuvarlamadan doğar ve uyarı değeri taşımaz;
   * 1 birimin altı gürültüdür.
   */
  tutarFarki: 1,
} as const;
