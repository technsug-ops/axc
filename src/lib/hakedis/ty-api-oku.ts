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
 *  önce 165/165 · 123/123 dolu).
 *
 *  ⛔ AMA "NE ZAMAN ÖDENDİ" SORUSUNU `paymentDate` CEVAPLAMIYOR — ÇÜRÜTÜLDÜ
 *  21.09.2026 (K223). Buraya şöyle yazılmıştı ve YANLIŞTI:
 *
 *      "`paymentDate` bu durumda gerçek ödeme günüdür"
 *
 *  ⚠ ESKİ GEREKÇE SİLİNMİYOR (anayasa kuralı): iddia makul görünüyordu,
 *  çünkü alan ödenmiş kayıtlarda DOLU geliyor ve adı da öyle diyor. Ama alanın
 *  ADI, içeriğinin NE OLDUĞUNU söylemez. Ölçüm şunu gösterdi — `paymentDate`
 *  ödendikten SONRA da kalemin KENDİ VADESİNİ taşıyor, ödeme gününü değil:
 *
 *      emir 76313675 · 112 kalem · ₺205.691,63
 *        GERÇEK ödeme günü          2026-08-11   (TEK gün)
 *        `paymentDate`ten yazılan   10·11·17·18·19·20·22·23·24·25 Ağu + 3 Eyl
 *
 *  Bir ödeme emri = BİR ödeme günü. Kalem başına vade yazılınca tek bir ödeme
 *  nakit takviminde on bir güne dağıldı. Ölçüldü: 91 ödeme emrinin 91'i de
 *  yanlıştı (4946 kalem), sapma −6 … +27 gün.
 *
 *  ⭐ GERÇEK ÖDEME GÜNÜ `PaymentOrder` KAYDINDADIR — emir başına tek satır,
 *  `/otherfinancials?transactionType=PaymentOrder` ucundan gelir ve
 *  `paymentDate` = `transactionDate` = o emrin ödendiği an. Bu kayıtlar
 *  KALEM OLARAK YAZILMAZ (emrin TOPLAMINI taşırlar, parayı ikinci kez
 *  sayarlardı) — yalnız TARİHİ için okunurlar.
 *
 *  ⛔ VE GÜN BİLİNMİYORSA KALEM ÖDENMİŞ YAZILMAZ. Vadeyi ödeme günü diye
 *  yazmak, sistemin bilmediği bir şeyi uydurmasıdır; `null` bir eksiklik
 *  değil BEYANDIR ("bu emrin günü henüz elimde yok"). Sonraki koşumda emir
 *  tarama penceresine girince kendiliğinden dolar.
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
  /**
   * `PaymentOrder` kayıtlarında ödemenin gerçekleştiği an (ölçüldü 21.09.2026:
   * 36/36 kayıtta `paymentDate` ile AYNI değer). Sipariş satırlarında yok.
   */
  transactionDate?: number | null;
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
/** Ödeme emri no → o emrin GERÇEK ödendiği an. */
export type OdemeEmriGunleri = ReadonlyMap<string, Date>;

/**
 * `PaymentOrder` ham kayıtlarından emir no → gerçek ödeme günü haritası kurar.
 *
 * ⚠ TARİH ALANI İKİ ADLA GELİYOR ve ölçümde ikisi de AYNI değeri taşıyordu
 * (36/36 kayıtta `paymentDate === transactionDate`). Yine de ikisi de okunur:
 * birinin boş geldiği bir kayıt varsa öteki kurtarır — ve JSON boş alanı hiç
 * göndermeyebilir (alan kümesi tek kayıttan okunmaz kuralı).
 *
 * ⛔ GEÇERSİZ TARİH SESSİZCE GEÇMEZ: `new Date(bozuk)` `Invalid Date` üretir
 * ve veritabanına kadar gider. Kapı okuma anında kurulur.
 */
export function odemeEmriGunleriniCoz(
  kayitlar: readonly TyFinansKaydi[],
): Map<string, Date> {
  const harita = new Map<string, Date>();
  for (const k of kayitlar) {
    const emirNo =
      k.paymentOrderId !== null && k.paymentOrderId !== undefined
        ? String(k.paymentOrderId)
        : String(k.id ?? "");
    if (emirNo === "" || emirNo === "null" || emirNo === "undefined") continue;
    const ham = k.paymentDate ?? k.transactionDate;
    if (ham === null || ham === undefined) continue;
    const t = new Date(ham);
    if (Number.isNaN(t.getTime())) continue;
    harita.set(emirNo, t);
  }
  return harita;
}

export function tyApiSatiriniOku(
  kayit: TyFinansKaydi,
  /**
   * Ödeme emri günleri. VERİLMEZSE hiçbir kalem ödenmiş yazılmaz — çünkü
   * ödeme gününü bilmiyoruz ve vadeyi ödeme günü diye yazmak uydurmadır.
   */
  odemeGunleri?: OdemeEmriGunleri,
): HakedisSatiri {
  const credit = kayit.credit ?? 0;
  const debt = kayit.debt ?? 0;
  const yon = credit > 0 ? 1 : -1;
  const tutar = kayit.sellerRevenue !== null && kayit.sellerRevenue !== undefined
    ? yon * kayit.sellerRevenue
    : credit - debt;

  const odendi = kayit.paymentOrderId !== null && kayit.paymentOrderId !== undefined;
  /** Vade — TY'nin kendi bildirdiği tahmin; ödendikten sonra da değişmiyor. */
  const vade = kayit.paymentDate !== null && kayit.paymentDate !== undefined
    ? new Date(kayit.paymentDate)
    : null;
  /**
   * ⛔ ÖDEME GÜNÜ VADEDEN OKUNMAZ — emrin kendi kaydından gelir (K223).
   * Emir bilinmiyorsa `null`: "ödendi ama gününü bilmiyorum" hâli, sonraki
   * koşumda dolar. Vadeyi buraya yazmak tek ödemeyi günlere dağıtıyordu.
   */
  const odemeGunu =
    odendi && odemeGunleri
      ? odemeGunleri.get(String(kayit.paymentOrderId)) ?? null
      : null;

  return {
    externalId: String(kayit.id),
    kod: TY_TIPLER[basligiNormalle(kayit.transactionType)] ?? "DIGER",
    hamTip: kayit.transactionType,
    siparisNo: kayit.orderNumber ?? null,
    tutar,
    paraBirimi: paraBirimiCoz(kayit.currency),
    /** Vade: rapordaki gibi TY'nin kendi bildirdiği tarih — TAHMİN olsa da. */
    vadeTarihi: vade,
    /** Ödeme: emrin GERÇEK günü; bilinmiyorsa null (vade YAZILMAZ). */
    odemeTarihi: odemeGunu,
    urunKodu: kayit.barcode ?? null,
    satirNo: 0,
    ham: `${kayit.transactionType} · ${kayit.orderNumber ?? "-"} · ${tutar}`,
  };
}

export function tyApiSatirlariniOku(
  kayitlar: TyFinansKaydi[],
  odemeGunleri?: OdemeEmriGunleri,
): HakedisSatiri[] {
  /**
   * ⚠ `map(tyApiSatiriniOku)` YAZILMAZ: `.map` ikinci parametreye İNDEKSİ
   * geçirir ve o da `odemeGunleri` yerine düşerdi. Çağrı açık yazılır.
   */
  return kayitlar.map((k) => tyApiSatiriniOku(k, odemeGunleri));
}
