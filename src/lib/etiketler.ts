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
  SALE_CANCEL_IN: null,
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
    SALE_CANCEL_IN: tHareket("SALE_CANCEL_IN"),
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
  /* Pazaryerinin kendi listesinden — bkz. docs/iade-sureci.md §3.
     Sıra formdaki sıradır; müşterinin en sık seçtikleri üstte. */
  BEDEN_KUCUK: null,
  BEDEN_BUYUK: null,
  DAHA_UCUZ: null,
  PARCA_EKSIK: null,
  URUN_EKSIK: null,
  HASARLI: null,
  BOS_PAKET: null,
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
    BEDEN_KUCUK: tGerekce("BEDEN_KUCUK"),
    BEDEN_BUYUK: tGerekce("BEDEN_BUYUK"),
    DAHA_UCUZ: tGerekce("DAHA_UCUZ"),
    PARCA_EKSIK: tGerekce("PARCA_EKSIK"),
    URUN_EKSIK: tGerekce("URUN_EKSIK"),
    HASARLI: tGerekce("HASARLI"),
    BOS_PAKET: tGerekce("BOS_PAKET"),
    DIGER: tGerekce("DIGER"),
  };
}

/** Sıra AKIŞIN sırasıdır (docs/iade-sureci.md §1) — tesadüfe bırakılmıyor. */
const BILDIRIM_DURUM_SIRASI: Record<NoticeStatus, null> = {
  BEKLENIYOR: null,
  KARGOYA_VERILDI: null,
  MAL_GELDI: null,
  ITIRAZ_ACILDI: null,
  ITIRAZ_INCELEMEDE: null,
  ANALIZ: null,
  ITIRAZ_KABUL: null,
  ITIRAZ_RED: null,
  ASKIDA: null,
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
    KARGOYA_VERILDI: tBildirimDurumu("KARGOYA_VERILDI"),
    MAL_GELDI: tBildirimDurumu("MAL_GELDI"),
    ITIRAZ_ACILDI: tBildirimDurumu("ITIRAZ_ACILDI"),
    ITIRAZ_INCELEMEDE: tBildirimDurumu("ITIRAZ_INCELEMEDE"),
    ANALIZ: tBildirimDurumu("ANALIZ"),
    ITIRAZ_KABUL: tBildirimDurumu("ITIRAZ_KABUL"),
    ITIRAZ_RED: tBildirimDurumu("ITIRAZ_RED"),
    ASKIDA: tBildirimDurumu("ASKIDA"),
    KAPANDI: tBildirimDurumu("KAPANDI"),
    IPTAL: tBildirimDurumu("IPTAL"),
  };
}

/**
 * DURUM ADI ≠ DÜĞME ADI (kullanıcı geri bildirimi 14.08.2026: "devam
 * gelmiyor").
 *
 * Geçiş düğmeleri durum adlarını yazıyordu: "Mal geldi", "İptal". Kullanıcı
 * bunları ROZET sandı ve ilerlemek için basılacak bir şey görmedi. Düğme
 * EYLEM söylemeli: "Mal geldi olarak işaretle".
 *
 * Tip bilerek dar (`Record<NoticeStatus, …>`): şemaya yeni durum eklenip
 * eylem metni yazılmazsa proje DERLENMEZ — etiketsiz düğme çıkamaz.
 */
export async function bildirimGecisEtiketleri(): Promise<
  Record<NoticeStatus, string>
> {
  const tGecis = await getTranslations("BildirimGecisi");
  return {
    BEKLENIYOR: tGecis("BEKLENIYOR"),
    KARGOYA_VERILDI: tGecis("KARGOYA_VERILDI"),
    MAL_GELDI: tGecis("MAL_GELDI"),
    ITIRAZ_ACILDI: tGecis("ITIRAZ_ACILDI"),
    ITIRAZ_INCELEMEDE: tGecis("ITIRAZ_INCELEMEDE"),
    ANALIZ: tGecis("ANALIZ"),
    ITIRAZ_KABUL: tGecis("ITIRAZ_KABUL"),
    ITIRAZ_RED: tGecis("ITIRAZ_RED"),
    ASKIDA: tGecis("ASKIDA"),
    KAPANDI: tGecis("KAPANDI"),
    IPTAL: tGecis("IPTAL"),
  };
}

/**
 * SIRADAKİ ADIM METNİ — "şimdi ne yapmalıyım" sorusunun cevabı kayıtta yazar.
 *
 * Kullanıcı 14.08.2026'da BEKLENIYOR durumundaki bildirimde takıldı: "İadeyi
 * işle" pasifti (doğru), sebebi yazılıydı (doğru) ama İLERLEMEK için hangi
 * düğmeye basılacağı yazılı değildi. Sebep ile YÖNLENDİRME ayrı iki şeydir.
 */
export async function bildirimSiradakiAdim(): Promise<
  Record<NoticeStatus, string>
> {
  const tGecis = await getTranslations("BildirimGecisi");
  return {
    BEKLENIYOR: tGecis("siradakiBekleniyor"),
    KARGOYA_VERILDI: tGecis("siradakiKargoyaVerildi"),
    MAL_GELDI: tGecis("siradakiMalGeldi"),
    ITIRAZ_ACILDI: tGecis("siradakiItiraz"),
    ITIRAZ_INCELEMEDE: tGecis("siradakiItiraz"),
    ANALIZ: tGecis("siradakiAnaliz"),
    ITIRAZ_KABUL: tGecis("siradakiItirazKabul"),
    ITIRAZ_RED: tGecis("siradakiItirazRed"),
    ASKIDA: tGecis("siradakiAskida"),
    KAPANDI: tGecis("siradakiYok"),
    IPTAL: tGecis("siradakiYok"),
  };
}
