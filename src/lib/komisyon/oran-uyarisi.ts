/**
 * ============================================================================
 *  KOMİSYON ORANI UYARISI — SATIŞ FORMU
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE VAR — 18.08.2026'da ÖLÇÜLEN GERÇEK ZARAR.
 *
 *  Üç satış (`11493262226` · `11492798173` · `11492628481`) **%2,70**
 *  komisyon oranıyla kaydedilmişti; gerçeği %15. Kanal SKU kayıtları
 *  satıştan SONRA açıldığı için oran forma ELLE yazılmıştı ve hiçbir
 *  şey uyarmamıştı. Üç satışın kârı olduğundan ~721 TL fazla göründü.
 *
 *  ── UYARI, ENGEL DEĞİL ──────────────────────────────────────────────────
 *  Oran gerçekten düşük olabilir (kampanya, özel anlaşma). Kaydı DURDURMAK
 *  operasyoncuyu kilitler ve "sistem çalışmıyor" dedirtir. Doğrusu:
 *  görünür uyarı + serbest kayıt. _Kullanıcı Kolaylığı İlkeleri #5: sessiz
 *  başarısızlık yasak; ama her uyarı da engel değildir._
 *
 *  ── EŞİK UYDURULMADI, ÖLÇÜLDÜ ───────────────────────────────────────────
 *  18.08.2026 canlı ölçümü — üç pazaryerinin gerçek oran aralıkları:
 *      Trendyol      %3,6 – %23   (40 farklı oran)
 *      Hepsiburada   %4   – %22   (15 farklı oran)
 *      N11           8 farklı oran
 *  Görülmüş en düşük oran **%3,6**. Eşik onun altına, %3'e konuldu:
 *  gerçek bir oranı yanlışlıkla işaretlememek için pay bırakıldı ama
 *  %2,70 yakalanıyor. Eşik keyfi olsaydı ya gürültü üretirdi ya da
 *  yakalaması gerekeni kaçırırdı.
 * ============================================================================
 */

/** Bugüne kadar canlıda görülmüş en düşük gerçek oran (%). */
export const GORULEN_EN_DUSUK_ORAN = 3.6;

/** Bunun altı şüphelidir — ölçülen en düşüğün altında, pay bırakılmış. */
export const SUPHELI_ORAN_ESIGI = 3;

/** Öneriden bu kadar PUAN sapma dikkat ister. */
export const SAPMA_ESIGI = 5;

export type OranUyarisi =
  | { tur: "KAYNAK_YOK" }
  | { tur: "SUPHELI_DUSUK"; girilen: number }
  | { tur: "ONERIDEN_SAPTI"; girilen: number; onerilen: number; fark: number };

/**
 * Girilen oran için uyarı üretir. Uyarı YOKSA `null` — her satırda bir
 * şey yazmak, hiçbir şey yazmamakla aynı kapıya çıkar.
 *
 * @param girilen   Formdaki değer. Boşsa `null`.
 * @param onerilen  Kanal SKU'sundan gelen kayıtlı oran. Kayıt yoksa `null`.
 */
export function oranUyarisi(
  girilen: number | null,
  onerilen: number | null,
): OranUyarisi | null {
  /**
   * ⚠ ÖNCE "KAYNAK VAR MIYDI" — bugünkü dersin aynısı.
   *
   * Kayıtlı oran yoksa kullanıcı KÖRÜNE yazıyor demektir; asıl vaka buydu.
   * Girilen değer makul görünse bile bu durum söylenmeli, çünkü doğruluğu
   * hiçbir şeye dayanmıyor.
   */
  if (onerilen === null) {
    return girilen === null ? null : { tur: "KAYNAK_YOK" };
  }

  if (girilen === null) return null;

  /** Şüpheli düşük, sapmadan ÖNCE gelir: daha somut bir kusurdur. */
  if (girilen < SUPHELI_ORAN_ESIGI) {
    return { tur: "SUPHELI_DUSUK", girilen };
  }

  const fark = Math.abs(girilen - onerilen);
  if (fark > SAPMA_ESIGI) {
    return { tur: "ONERIDEN_SAPTI", girilen, onerilen, fark: Math.round(fark * 100) / 100 };
  }

  return null;
}
