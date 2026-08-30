/**
 * ============================================================================
 *  HATA EKRANI — SAF KARAR (K98, 30.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ CANLI VAKA: barındırma sağlayıcısında kesinti oldu ve Halil şunu gördü:
 *
 *      This page couldn't load
 *      A server error occurred.        ERROR 800923320
 *
 *  Bu ekran KİMİN hatası olduğunu söylemiyor. Operatör "ben mi bozdum,
 *  sistem mi çöktü, sunucu mu" diye bilemiyor — ve soracak kişi yoksa
 *  çalışmayı bırakıyor. _(İlke #5: Türkçe ve net geri bildirim; sessiz
 *  başarısızlık yasak.)_
 *
 *  ── ⛔ SEBEP TAHMİN EDİLMEZ, SORULUR ────────────────────────────────────
 *  İlk tasarım _"Veritabanına bağlanılamıyor"_ yazacaktı. **Yazamaz:** hata
 *  sınırına düşen `Error` üretimde yalnız bir `digest` taşır, mesajı taşımaz.
 *  Sebebi BİLMEDEN yazmak, sistemin takip etmediği şey hakkında iddia
 *  kurmaktır — ve yanlış çıktığında operatör yanlış yere bakar.
 *
 *  ⭐ ÇARE: ekran SORAR. Bir sonda (`SELECT 1`) veritabanına ulaşıp
 *  ulaşamadığını ÖLÇER ve ekran ölçtüğünü söyler. Sonda da cevap veremezse
 *  bu da bir BİLGİDİR ve öyle yazılır — "bilmiyorum" diye susmaz.
 *
 *  ⚠ VE "VERİN KAYBOLMADI" DENMEZ. Bilmiyoruz: hata bir yazma sırasında da
 *  oluşmuş olabilir. Söylenebilecek olan, o ekranın ÇİZİLEMEDİĞİdir.
 * ============================================================================
 */

export type Sonda =
  /** Sonda henüz cevap vermedi. */
  | { durum: "BEKLIYOR" }
  /** Sonda cevap verdi — veritabanına ulaşılıp ulaşılamadığını söylüyor. */
  | { durum: "CEVAP"; veritabani: boolean }
  /** ⚠ Sonda ÇAĞRISI başarısız oldu — sunucunun kendisi cevap vermiyor. */
  | { durum: "CEVAPSIZ" };

export const EKRAN_DURUMLARI = [
  "KONTROL_EDILIYOR",
  "VERITABANI_YOK",
  "SUNUCUYA_ULASILAMADI",
  "SUNUCU_HATASI",
] as const;

export type EkranDurumu = (typeof EKRAN_DURUMLARI)[number];

/**
 * Sondanın söylediğini ekran durumuna çevirir.
 *
 * ⚠ DÖRT DURUM AYRI TUTULUR, ÜÇE İNDİRİLMEZ. "Sunucuya ulaşılamadı" ile
 * "veritabanına ulaşılamadı" farklı işlere yol açar: ilkinde beklenir,
 * ikincisinde veritabanı sağlayıcısına bakılır. Tek kefeye konsalardı ekran
 * doğru ama işe yaramaz bir cümle kurardı.
 */
export function hataEkranDurumu(sonda: Sonda): EkranDurumu {
  if (sonda.durum === "BEKLIYOR") return "KONTROL_EDILIYOR";
  if (sonda.durum === "CEVAPSIZ") return "SUNUCUYA_ULASILAMADI";
  /**
   * ⭐ SONDA CEVAP VERDİYSE SUNUCU AYAKTA — geriye iki hâl kalır ve ikisi de
   * ÖLÇÜLMÜŞTÜR, tahmin değil.
   */
  return sonda.veritabani ? "SUNUCU_HATASI" : "VERITABANI_YOK";
}

/**
 * Hata kodu gösterilebilir mi?
 *
 * ⭐ GÖSTERİLİR — ama yalnız `digest`. Destek için tek tutamak o; gizlemek
 * "hangi hata" sorusunu cevapsız bırakır.
 *
 * ⛔ HAM MESAJ ASLA EKRANA BASILMAZ: hem kullanıcıya bir şey anlatmaz hem iç
 * ayrıntı sızdırır (K57-③ kuralı). Bu gövde bu yüzden yalnız `digest` alır —
 * ham mesajı parametre olarak bile görmez.
 */
export function hataKodu(digest: string | undefined): string | null {
  const temiz = (digest ?? "").trim();
  /** ⚠ Boş kod GÖSTERİLMEZ: "ERROR" yazıp yanını boş bırakmak, olmayan bir
   *  tutamağı varmış gibi gösterirdi. */
  if (temiz === "") return null;
  /** ⚠ Uzunluk sınırı: digest normalde kısa; uzun bir şey gelirse ekranı
   *  bozmasın diye kırpılır — ama KIRPILDIĞI belli olsun diye üç nokta. */
  return temiz.length > 64 ? `${temiz.slice(0, 64)}…` : temiz;
}
