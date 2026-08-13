import { getTranslations } from "next-intl/server";

import type {
  NoticeStatus,
  PurchaseStatus,
  ReturnReason,
  ReturnType,
  StockMovementType,
} from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  VERİTABANI ENUM DEĞERLERİNİN EKRANDAKİ KARŞILIKLARI
 * ----------------------------------------------------------------------------
 *  Veritabanı değeri (ORDERED, PURCHASE_IN...) DEĞİŞMEZ — sadece ekranda
 *  görünen etiket sözlükten gelir. "Veri çevrilmez" kuralıyla çelişmez:
 *  burada çevrilen veri değil, verinin gösterimi.
 *
 *  Record<PurchaseStatus, ...> tipi BİLEREK dar: şemaya yeni bir durum
 *  eklenip karşılığı yazılmazsa proje DERLENMEZ. Bu koruma, daha önce
 *  PARTIALLY_RECEIVED'in ekranda ham enum olarak görünmesine yol açan
 *  hatadan sonra eklendi; sözlüğe taşırken de korunuyor.
 * ============================================================================
 */

/** Sıralama ve eksiksizlik denetimi. Değerler kullanılmıyor, anahtarlar önemli. */
const ALIM_DURUM_SIRASI: Record<PurchaseStatus, null> = {
  DRAFT: null,
  ORDERED: null,
  PARTIALLY_RECEIVED: null,
  RECEIVED: null,
  CANCELLED: null,
};

/** Alım listesi durum filtresi — sırası yukarıdaki tanımdan gelir. */
export const ALIM_DURUMLARI = Object.keys(
  ALIM_DURUM_SIRASI,
) as PurchaseStatus[];

/**
 * Sunucu bileşenlerinde bir kez çağrılır, sonra senkron kullanılır:
 *   const durumlar = await alimDurumEtiketleri();
 *   {durumlar[alim.status]}
 */
export async function alimDurumEtiketleri(): Promise<
  Record<PurchaseStatus, string>
> {
  const tDurum = await getTranslations("AlimDurumu");
  return {
    DRAFT: tDurum("DRAFT"),
    ORDERED: tDurum("ORDERED"),
    PARTIALLY_RECEIVED: tDurum("PARTIALLY_RECEIVED"),
    RECEIVED: tDurum("RECEIVED"),
    CANCELLED: tDurum("CANCELLED"),
  };
}

const STOK_HAREKET_SIRASI: Record<StockMovementType, null> = {
  INITIAL: null,
  PURCHASE_IN: null,
  SALE_OUT: null,
  RETURN_IN: null,
  EXCHANGE_OUT: null,
  ADJUSTMENT: null,
  COUNT_CORRECTION: null,
};

export const STOK_HAREKET_TIPLERI = Object.keys(
  STOK_HAREKET_SIRASI,
) as StockMovementType[];

export async function stokHareketEtiketleri(): Promise<
  Record<StockMovementType, string>
> {
  const tHareket = await getTranslations("StokHareketi");
  return {
    INITIAL: tHareket("INITIAL"),
    PURCHASE_IN: tHareket("PURCHASE_IN"),
    SALE_OUT: tHareket("SALE_OUT"),
    RETURN_IN: tHareket("RETURN_IN"),
    EXCHANGE_OUT: tHareket("EXCHANGE_OUT"),
    ADJUSTMENT: tHareket("ADJUSTMENT"),
    COUNT_CORRECTION: tHareket("COUNT_CORRECTION"),
  };
}

const IADE_TURU_SIRASI: Record<ReturnType, null> = {
  UNDELIVERED: null,
  NORMAL: null,
  DISPUTED: null,
};

export const IADE_TURLERI = Object.keys(IADE_TURU_SIRASI) as ReturnType[];

export async function iadeTuruEtiketleri(): Promise<
  Record<ReturnType, string>
> {
  const tTur = await getTranslations("IadeTuru");
  return {
    UNDELIVERED: tTur("UNDELIVERED"),
    NORMAL: tTur("NORMAL"),
    DISPUTED: tTur("DISPUTED"),
  };
}

/**
 * ============================================================================
 *  İADE BİLDİRİMİ — GEREKÇE VE DURUM ETİKETLERİ
 * ----------------------------------------------------------------------------
 *  `Record<...>` tipi BİLEREK dar: şemaya yeni bir gerekçe/durum eklenip
 *  karşılığı yazılmazsa proje DERLENMEZ. Bildirim ekranında ham enum
 *  ("KULLANILMIS_ITIRAZ") görünmesi bu kilit sayesinde imkânsız.
 * ============================================================================
 */

const GEREKCE_SIRASI: Record<ReturnReason, null> = {
  DEGISIM: null,
  DEGISIM_KUSURLU: null,
  CALISMIYOR: null,
  CAYMA: null,
  KULLANILMIS_ITIRAZ: null,
  YANLIS_URUN: null,
  DIGER: null,
};

/** Formdaki sıra — şemadaki sırayla aynı, tesadüfe bırakılmıyor. */
export const IADE_GEREKCELERI = Object.keys(GEREKCE_SIRASI) as ReturnReason[];

export async function iadeGerekceEtiketleri(): Promise<
  Record<ReturnReason, string>
> {
  const tGerekce = await getTranslations("IadeGerekcesi");
  return {
    DEGISIM: tGerekce("DEGISIM"),
    DEGISIM_KUSURLU: tGerekce("DEGISIM_KUSURLU"),
    CALISMIYOR: tGerekce("CALISMIYOR"),
    CAYMA: tGerekce("CAYMA"),
    KULLANILMIS_ITIRAZ: tGerekce("KULLANILMIS_ITIRAZ"),
    YANLIS_URUN: tGerekce("YANLIS_URUN"),
    DIGER: tGerekce("DIGER"),
  };
}

const BILDIRIM_DURUM_SIRASI: Record<NoticeStatus, null> = {
  BEKLENIYOR: null,
  MAL_GELDI: null,
  ITIRAZ_ACILDI: null,
  ITIRAZ_INCELEMEDE: null,
  ITIRAZ_KABUL: null,
  ITIRAZ_RED: null,
  KAPANDI: null,
  IPTAL: null,
};

export const BILDIRIM_DURUMLARI = Object.keys(
  BILDIRIM_DURUM_SIRASI,
) as NoticeStatus[];

export async function bildirimDurumEtiketleri(): Promise<
  Record<NoticeStatus, string>
> {
  const tBildirimDurumu = await getTranslations("BildirimDurumu");
  return {
    BEKLENIYOR: tBildirimDurumu("BEKLENIYOR"),
    MAL_GELDI: tBildirimDurumu("MAL_GELDI"),
    ITIRAZ_ACILDI: tBildirimDurumu("ITIRAZ_ACILDI"),
    ITIRAZ_INCELEMEDE: tBildirimDurumu("ITIRAZ_INCELEMEDE"),
    ITIRAZ_KABUL: tBildirimDurumu("ITIRAZ_KABUL"),
    ITIRAZ_RED: tBildirimDurumu("ITIRAZ_RED"),
    KAPANDI: tBildirimDurumu("KAPANDI"),
    IPTAL: tBildirimDurumu("IPTAL"),
  };
}
