import { getTranslations } from "next-intl/server";

import type {
  PurchaseStatus,
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
    ADJUSTMENT: tHareket("ADJUSTMENT"),
    COUNT_CORRECTION: tHareket("COUNT_CORRECTION"),
  };
}
