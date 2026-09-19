import type { Currency } from "@/generated/prisma/enums";
import { basligiNormalle } from "@/lib/tablo/hucre";

import { TY_TIPLER } from "./okuyucu";
import type { HakedisSatiri } from "./model";

/**
 * ============================================================================
 *  TRENDYOL SETTLEMENTS/OTHERFINANCIALS API — SAF HESAP (K220, 19.09.2026)
 * ----------------------------------------------------------------------------
 *  Veritabanına GİTMEZ, ağa çıkmaz. Girdi: `/settlements` ve
 *  `/otherfinancials` uçlarının HAM JSON kayıtları (ikisinin de gövde şekli
 *  BİREBİR AYNI — resmî dokümandan doğrulandı, 19.09.2026). Çıktı Excel
 *  okuyucusuyla AYNI `HakedisSatiri` — bundan sonraki her şey (eşleştirme,
 *  yazım) kaynağın Excel mi API mi olduğunu bilmez.
 *
 *  ⭐ TUTAR İŞARETİ — CANLI VERİYLE ÖLÇÜLDÜ (19.09.2026):
 *  `sellerRevenue` DOLUYSA (sipariş bazlı satırlar) o kullanılır ve yönü
 *  `credit`/`debt`ten gelir: `credit > 0` → GELİR (+), `debt > 0` → GİDER (−).
 *      Satış      credit=2300 debt=0   sellerRevenue=1960,75 → +1960,75
 *      İade       credit=0 debt=859    sellerRevenue=687,20  → −687,20
 *      Kupon      credit=0 debt=15     sellerRevenue=12,30   → −12,30
 *      KuponİptalcCredit=5,5 debt=0    sellerRevenue=4,40    → +4,40
 *  `sellerRevenue` BOŞSA (sipariş dışı: Stopaj/Kargo Fatura/Platform Hizmet)
 *  komisyon zaten yok, ham `credit − debt` kullanılır (aynı yön kuralı).
 *
 *  ⭐ GERÇEK "ÖDENDİ" SİNYALİ: `paymentOrderId` DOLUYSA para gerçekten
 *  ödenmiş demektir (canlı ölçüm: son 15 günde 177/177 boş, 60-105 gün
 *  önce 165/165 · 123/123 dolu). `paymentDate` bu durumda gerçek ödeme
 *  günüdür; `paymentOrderId` boşken aynı alan yalnız TAHMİNDİR (Trendyol'un
 *  kendi panelinde "Tahmini Hesaplanmıştır" rozetiyle aynı ayrım).
 * ============================================================================
 */

/** `/settlements` ve `/otherfinancials`in ORTAK gövdesi. */
export type TyFinansKaydi = {
  id: string | number;
  transactionType: string;
  barcode?: string | null;
  debt?: number | null;
  credit?: number | null;
  sellerRevenue?: number | null;
  orderNumber?: string | null;
  paymentOrderId?: number | null;
  paymentDate?: number | null;
  currency?: string | null;
};

/** Sipariş no'suna bağlı, `/settlements` ucundan gelen satır tipleri. */
export const TY_API_SIPARIS_TIPLERI = [
  "Sale",
  "Return",
  "Discount",
  "DiscountCancel",
  "Coupon",
  "CouponCancel",
  "TyDiscount",
  "TyDiscountCancel",
  "TyCoupon",
  "TyCouponCancel",
] as const;

/**
 * Sipariş dışı, `/otherfinancials` ucundan gelen satır tipleri.
 * ⛔ `PaymentOrder` ve `CommissionAgreementInvoice` BİLEREK DIŞARIDA:
 * ikisi de `/settlements`teki satırların TOPLAMINI ikinci kez anlatıyor
 * (ölçüldü 19.09.2026) — kalem olarak yazılsalar parayı İKİ KEZ sayardık.
 */
export const TY_API_SIPARIS_DISI_TIPLERI = ["Stoppage", "DeductionInvoices"] as const;

function paraBirimiCoz(ham: string | null | undefined): Currency {
  return ham?.trim().toUpperCase() === "EUR" ? "EUR" : "TRY";
}

/**
 * Tek bir API kaydını `HakedisSatiri`ye çevirir.
 * `satirNo` Excel'deki gibi anlamlı değil (API'de "satır" yok) — 0 sabit.
 */
export function tyApiSatiriniOku(kayit: TyFinansKaydi): HakedisSatiri {
  const credit = kayit.credit ?? 0;
  const debt = kayit.debt ?? 0;
  const yon = credit > 0 ? 1 : -1;
  const tutar = kayit.sellerRevenue !== null && kayit.sellerRevenue !== undefined
    ? yon * kayit.sellerRevenue
    : credit - debt;

  const odendi = kayit.paymentOrderId !== null && kayit.paymentOrderId !== undefined;
  const tarih = kayit.paymentDate !== null && kayit.paymentDate !== undefined
    ? new Date(kayit.paymentDate)
    : null;

  return {
    externalId: String(kayit.id),
    kod: TY_TIPLER[basligiNormalle(kayit.transactionType)] ?? "DIGER",
    hamTip: kayit.transactionType,
    siparisNo: kayit.orderNumber ?? null,
    tutar,
    paraBirimi: paraBirimiCoz(kayit.currency),
    /** Vade: rapordaki gibi TY'nin kendi bildirdiği tarih — TAHMİN olsa da. */
    vadeTarihi: tarih,
    /** Ödeme: yalnız `paymentOrderId` DOLUYSA — gerçekten ödendi demektir. */
    odemeTarihi: odendi ? tarih : null,
    urunKodu: kayit.barcode ?? null,
    satirNo: 0,
    ham: `${kayit.transactionType} · ${kayit.orderNumber ?? "-"} · ${tutar}`,
  };
}

export function tyApiSatirlariniOku(kayitlar: TyFinansKaydi[]): HakedisSatiri[] {
  return kayitlar.map(tyApiSatiriniOku);
}
