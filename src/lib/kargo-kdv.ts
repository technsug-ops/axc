import { GENEL_KDV_ORANI } from "@/lib/kar";

/**
 * ============================================================================
 *  KARGO KDV ÇEVİRİSİ — ÇİFT YÖNLÜ, TEK KAYNAK
 * ----------------------------------------------------------------------------
 *  ⚠ NEDEN VAR (canlı hata 17.08.2026)
 *
 *  `Sale.cargoAmount` KDV HARİÇ saklanır (ölçüldü: 32/32 satışta KARGO
 *  kesintisi = cargoAmount × 1,20). Kullanıcı ise KDV DAHİL tutarı bilir —
 *  faturada o yazar, kargo firması onu tahsil eder.
 *
 *  Düzenleme formu KDV hariç değeri "KDV dahil" etiketiyle gösterdi;
 *  kullanıcı dokunmadan kaydetti ve motor bir kez daha 1,2'ye böldü:
 *  74,13 → 61,78. HER DÜZENLEMEDE %20 kayıp; üçüncü turda 51,48 olurdu.
 *
 *  ── ÇEVİRİ İKİ YÖNLÜ OLMAK ZORUNDA ──────────────────────────────────────
 *  Bir yön eksik kalırsa döngü kapanmaz. Kural:
 *      form AÇILIRKEN  →  `kdvDahilKargo`  (DB → ekran, ×1,20)
 *      form KAYDEDİLİRKEN → `kdvHaricKargo` (ekran → DB, ÷1,20)
 *
 *  İkisi aynı dosyada durur ki biri değişip öteki unutulmasın. `duzenleme:
 *  dogrula` iki tur aç-kaydet döngüsü koşuyor: değer AYNEN kalmalı.
 *
 *  ── YUVARLAMA: DÖRT BASAMAK ─────────────────────────────────────────────
 *  Şema `Decimal(18,4)`. 88,96 ÷ 1,2 = 74,133333… — dört basamağa
 *  yuvarlanmazsa veritabanı kendi keser ve ekranla veri arasında sessiz bir
 *  kuruş farkı doğar. Yuvarlama BURADA, açıkça yapılıyor.
 * ============================================================================
 */

const CARPAN = 1 + GENEL_KDV_ORANI / 100;

/** Şemadaki `Decimal(18,4)` çözünürlüğü. */
function dortBasamak(deger: number): number {
  return Math.round(deger * 10000) / 10000;
}

/** VERİTABANI → EKRAN. KDV hariç saklanan tutarı KDV dahil hâle çevirir. */
export function kdvDahilKargo(kdvHaric: number | null): number | null {
  if (kdvHaric === null) return null;
  // Ekranda kuruş gösterilir; iki basamak yeter ve okunur.
  return Math.round(kdvHaric * CARPAN * 100) / 100;
}

/** EKRAN → VERİTABANI. Kullanıcının girdiği KDV dahil tutarı hariçe çevirir. */
export function kdvHaricKargo(kdvDahil: number | null): number | null {
  if (kdvDahil === null) return null;
  return dortBasamak(kdvDahil / CARPAN);
}
