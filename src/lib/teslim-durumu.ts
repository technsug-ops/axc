/**
 * ============================================================================
 *  TESLİM DURUMU KOVALARI — "YOLDA" ile "BİLMİYORUZ" AYRI SAYILIR (K199)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR — ÖLÇÜLDÜ (09.09.2026), VARSAYILMADI:
 *
 *      ham "yolda" 337  =  gerçekten yolda 24  +  BİLİNMİYOR 313
 *
 *  Naif ölçüt (`shippedAt` dolu + `deliveredAt` boş) kutuyu **%93 şişirirdi**:
 *  mekanizmadan ÖNCE kargolanmış ve çoktan teslim edilmiş 313 sipariş de
 *  "yolda" görünürdü. Operatör her sabah var olmayan 313 pakete bakardı.
 *
 *  ⭐ KUTU DÜRÜST OLMAK ZORUNDA: geçmiş boşluğu "yolda" gibi gösterilemez.
 *  _(Halil şartı 09.09.2026; anayasa: "boş sonuç ile temiz sonucu ayırt
 *  edemeyen denetim, denetim değildir" ve "sıfır satır gizlenmez".)_
 *
 *  ⚠ VE "BİLİNMİYOR" KOVASI 13 KAT BÜYÜK — GİZLENEMEZ. Sayıya girmese bile
 *  EKRANDA DURUR ve girmediği YAZAR; görünmeyen bir küme hakkında kimse soru
 *  soramaz.
 * ============================================================================
 */

/**
 * TESLİM İZİNİN DOĞUM ANI.
 *
 * ⛔ NİYE SABİT VE NİYE VERİDEN TÜRETİLMİYOR — ÖLÇÜLDÜ:
 * İlk akla gelen ölçüt `MIN(deliveredAt)` idi ve YANLIŞ olurdu. HB teslim
 * TARİHİNİ geçmişten veriyor (`/delivered` ucundaki `DeliveredDate`), yani
 * sütun doğduğu gün içine AĞUSTOS tarihli damgalar girdi. `MIN(deliveredAt)`
 * mekanizmanın doğumunu değil, kanalın bildirdiği en eski teslimi gösterir —
 * eşiği haftalar geriye kaydırır ve "bilinmiyor" kovasını yanlışlıkla
 * "yolda"ya taşırdı.
 *
 * ⭐ BU YÜZDEN SABİT — AMA SERBEST DEĞİL: değeri `deliveredAt` sütununu açan
 * migration'ın damgasıdır (`20260909125825_satis_teslim_damgasi`) ve
 * `teslim-durumu:dogrula` bunu migration klasörüyle KARŞILAŞTIRIR. Sabit
 * kayarsa bekçi kırmızı yanar; elle tutulan bir tarih olmaktan çıkar.
 * _(Anayasa: "sınır veriden gelir, tarih gömülerek değil" — buradaki
 * "veri" migration'ın kendisi.)_
 */
export const TESLIM_IZI_DOGDU = new Date(Date.UTC(2026, 8, 9));

export type TeslimKovasi =
  /** Kargoya verildi, kanal henüz "teslim edildi" demedi — GERÇEKTEN yolda. */
  | "YOLDA"
  /** Kanal teslim dedi. */
  | "TESLIM_EDILDI"
  /**
   * Kargoya verildi ama mekanizmadan ÖNCE — teslim edilmiş de olabilir,
   * yolda da. Sistem BİLMİYOR ve bunu söylüyor.
   */
  | "BILINMIYOR"
  /** Henüz kargoya verilmedi — bu kutunun konusu değil. */
  | "KARGOLANMADI";

export function teslimKovasi(satis: {
  shippedAt: Date | null;
  deliveredAt: Date | null;
}): TeslimKovasi {
  /**
   * ⚠ SIRA ÖNEMLİ: teslim damgası VARSA eşik hiç sorulmaz. Eski bir sipariş
   * kanaldan teslim damgası almış olabilir (HB geçmiş tarih veriyor) ve o
   * "bilinmiyor" DEĞİLDİR — biliyoruz.
   */
  if (satis.deliveredAt !== null) return "TESLIM_EDILDI";
  if (satis.shippedAt === null) return "KARGOLANMADI";
  return satis.shippedAt >= TESLIM_IZI_DOGDU ? "YOLDA" : "BILINMIYOR";
}

/**
 * Kutunun okuduğu küme — tek gövde, iki okuyucu (kutu + tıklanınca açılan
 * liste). ⛔ ÇIPLAK KOŞUL YAZILMAZ: `shippedAt: { not: null }, deliveredAt:
 * null` diye elle kurulan bir sorgu 313'ü "yolda" sayar ve kimse görmez.
 * _(Anayasa: "düzeltmenin çaresi dosya listesi değil, desen yasağıdır".)_
 */
export function teslimKovasiKosulu(kova: Exclude<TeslimKovasi, "KARGOLANMADI">) {
  if (kova === "TESLIM_EDILDI") return { deliveredAt: { not: null } };
  if (kova === "YOLDA") {
    return { deliveredAt: null, shippedAt: { gte: TESLIM_IZI_DOGDU } };
  }
  return { deliveredAt: null, shippedAt: { lt: TESLIM_IZI_DOGDU } };
}
