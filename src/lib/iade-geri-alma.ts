import type { Currency, IadeGeriAlmaNedeni } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  İADEYİ GERİ AL — SAF KURALLAR (K44 · 2. adım, 30.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı: _«muhtemel yaşanacak bir problemde girişlerin kapalı
 *  olması mantıksız.»_ Adet · sağlam/hasarlı · değişim ürünü · raf · tür
 *  STOK yazdığı için yerinde düzenlenmez; iade bütünüyle GERİ ALINIR ve
 *  doğru bilgiyle yeniden girilir. Desen satış iptalini geri almanın
 *  aynısı (`iptal-geri-alma.ts`).
 *
 *  ── LEDGER SİLİNMEZ ──────────────────────────────────────────────────────
 *  İadenin yazdığı her hareket DURUR; karşısına ters işaretli ADJUSTMENT
 *  yazılır (`returnItemId` bağıyla — fire raporu iade bağlı düzeltmeyi zaten
 *  dışlıyor).
 *    · GİRİŞ (+)  RETURN_IN · yanlış ürün düzeltmesi+
 *        → −adet, AYNI partiden (`sourceMovementId`) — maliyet aynası
 *    · ÇIKIŞ (−)  EXCHANGE_OUT · yanlış ürün düzeltmesi−
 *        → +adet, YENİ parti, aynı maliyet, KAYNAK BAĞI YOK (hayalet parti
 *          dersi 17.08.2026). Satış kalemine bağlıysa (`EXCHANGE_OUT`) bağ
 *          KORUNUR: değişim maliyeti satışın NET'inden bağla düşmüştü, geri
 *          giriş de bağla geri gelir. `acikCikislar` son çıkanı ilk kapatır
 *          → değişim çıkışı kapanır, satışın asıl çıkışı açık kalır.
 *
 *  ── ÜÇ KİLİT ────────────────────────────────────────────────────────────
 *  1. Zaten geri alınmışsa ikinci kez alınmaz (stok iki kez oynardı).
 *  2. ⚠ GİRİŞ PARTİSİ TÜKENMİŞSE ALINAMAZ: dönen mal bu arada satıldıysa
 *     ya da düzeltildiyse ters çıkış ledger'ı düşürür, FIFO'da karşılığı
 *     olmaz → HAYALET ADET. Ekran hangi ürün olduğunu yazar.
 *  3. Hasarlı kaleme TAZMİNAT açılmışsa alınamaz — talep o iadeye bağlı.
 *
 *  HİÇBİR ŞEY YAZMAZ — plan önce gösterilir, onayla yazılır; yazma anında
 *  plan yeniden kurulur ve İMZASI karşılaştırılır (EK 1 deseni).
 * ============================================================================
 */

/**
 * "BU İADE SAYILIR MI" — TEK GÖVDE. Prisma parçası; kullanım:
 *     where: { ...IADE_GECERLI }           (prisma.return.*)
 *     returns: { where: { ...IADE_GECERLI } }
 *     returnItems: { where: { return: IADE_GECERLI } }
 * Geri alınmış iadeyi GÖRMESİ GEREKEN yer sorgusunun içinde beyan eder:
 *     IADE_SUZGECI MUAF: <gerekçe>
 */
export const IADE_GECERLI = { geriAlindiAt: null } as const;

export function iadeGecerliMi(iade: { geriAlindiAt: Date | null }): boolean {
  return iade.geriAlindiAt === null;
}

export const IADE_GERI_ALMA_NEDENLERI: readonly IadeGeriAlmaNedeni[] = [
  "YANLIS_GIRIS",
  "MUSTERI_VAZGECTI",
  "DIGER",
];
export const IADE_GERI_ALMA_ACIKLAMA_ZORUNLU: readonly IadeGeriAlmaNedeni[] = ["DIGER"];

export type IadeGeriAlmaEngeli =
  | "ZATEN_GERI_ALINDI"
  | "PARTI_TUKENMIS"
  | "TAZMINAT_VAR"
  | "NEDEN_YOK"
  | "ACIKLAMA_YOK";

/** İadenin yazdığı bir stok hareketi. */
export type IadeHareketi = {
  hareketId: string;
  variantId: string;
  returnItemId: string;
  /** İşaretli — defterdeki `quantityDelta`. */
  quantityDelta: number;
  /** GİRİŞ hareketinde o partiden GERİYE KALAN adet (FIFO). Çıkışta kullanılmaz. */
  kalanAdet: number;
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: Currency | null;
  locationId: string | null;
  saleItemId: string | null;
};

export type TersIadeHareketi = {
  variantId: string;
  returnItemId: string;
  quantityDelta: number;
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: Currency | null;
  locationId: string | null;
  sourceMovementId: string | null;
  saleItemId: string | null;
};

export type IadeGeriAlmaPlani =
  | { olur: false; engel: IadeGeriAlmaEngeli; tukenenVaryantlar?: string[] }
  | { olur: true; hareketler: TersIadeHareketi[]; satisKariTazelenir: boolean };

export function iadeGeriAlmaPlani(girdi: {
  geriAlindiMi: boolean;
  hareketler: IadeHareketi[];
  tazminatSayisi: number;
  neden: IadeGeriAlmaNedeni | null;
  not: string | null;
}): IadeGeriAlmaPlani {
  if (girdi.geriAlindiMi) return { olur: false, engel: "ZATEN_GERI_ALINDI" };
  if (girdi.tazminatSayisi > 0) return { olur: false, engel: "TAZMINAT_VAR" };

  /** Kilit 2 — GİRİŞ partisi hâlâ BÜTÜN adediyle açık mı. */
  const tukenen = girdi.hareketler.filter((h) => h.quantityDelta > 0 && h.kalanAdet < h.quantityDelta);
  if (tukenen.length > 0) {
    return { olur: false, engel: "PARTI_TUKENMIS", tukenenVaryantlar: [...new Set(tukenen.map((h) => h.variantId))] };
  }

  if (girdi.neden === null) return { olur: false, engel: "NEDEN_YOK" };
  if (IADE_GERI_ALMA_ACIKLAMA_ZORUNLU.includes(girdi.neden) && (girdi.not === null || girdi.not.trim() === "")) {
    return { olur: false, engel: "ACIKLAMA_YOK" };
  }

  const hareketler: TersIadeHareketi[] = girdi.hareketler
    .filter((h) => h.quantityDelta !== 0)
    .map((h) =>
      h.quantityDelta > 0
        ? {
            variantId: h.variantId,
            returnItemId: h.returnItemId,
            quantityDelta: -h.quantityDelta,
            birimMaliyet: h.birimMaliyet,
            birimMaliyetParaBirimi: h.birimMaliyetParaBirimi,
            locationId: h.locationId,
            /** Aynı partiden çıkar — FIFO o partiyi tüketir. */
            sourceMovementId: h.hareketId,
            saleItemId: h.saleItemId,
          }
        : {
            variantId: h.variantId,
            returnItemId: h.returnItemId,
            quantityDelta: -h.quantityDelta,
            birimMaliyet: h.birimMaliyet,
            birimMaliyetParaBirimi: h.birimMaliyetParaBirimi,
            locationId: h.locationId,
            /** ⛔ KAYNAK BAĞI YOK — yeni parti (hayalet parti dersi). */
            sourceMovementId: null,
            saleItemId: h.saleItemId,
          },
    );

  return {
    olur: true,
    hareketler,
    /** Satış kalemine bağlı hareket döndüyse (değişim) satışın NET'i değişir. */
    satisKariTazelenir: hareketler.some((h) => h.saleItemId !== null),
  };
}

/** Plan imzası — onay GÖSTERİLENE verilmiştir (EK 1). */
export function iadeGeriAlmaImzasi(plan: IadeGeriAlmaPlani): string {
  if (!plan.olur) return `ENGEL:${plan.engel}`;
  return plan.hareketler
    .map((h) => `${h.variantId}|${h.quantityDelta}|${h.birimMaliyet ?? ""}|${h.sourceMovementId ?? ""}|${h.saleItemId ?? ""}`)
    .sort()
    .join(";");
}
