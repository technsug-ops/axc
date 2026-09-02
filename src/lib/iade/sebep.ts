/**
 * ============================================================================
 *  İADE SEBEBİ — NOTTAN OKUNAN GÖSTERİM DEĞERİ (SAF)
 * ----------------------------------------------------------------------------
 *  Kullanıcı 02.09.2026, listeye bakarak: _"Beğenmedim kısmı burda mı olsa
 *  acaba?"_ — Tür sütununu işaret ederek.
 *
 *  ⛔ ALTINDA GERÇEK BİR KUSUR VARDI: aynı gün eklenen arama sebep notunu
 *  DA arıyor. Yani kullanıcı "Beğenmedim" yazıp satırı buluyor ama satır
 *  **niye eşleştiğini söylemiyordu.** Aranabilen ama görünmeyen bir alan,
 *  kullanıcıyı "bu satır niye geldi" sorusuyla baş başa bırakır.
 *  _(İlke #9: bir bilgiye ulaşmak için detaya girmek zorunluysa, o bilgi
 *  muhtemelen listede de olmalıdır.)_
 *
 *  ── ⚠ ÖLÇÜLDÜ: KALIP TEK BAŞINA YETMEZ (02.09.2026, canlı) ──────────────
 *      toplam Return 17  ·  notu dolu 10  ·  notu boş 7
 *      ⭐ kurallı kalıp   8
 *      ⚠ serbest metin   2      ← ve İKİSİ DE gerçek operasyon notu:
 *        "Değişim olarak düzeltildi — para satıcıda kaldı…"
 *        "İADE REDDEDİLDİ TRENDYOL KABUL ETTİ, ÜRÜN MÜŞTERİYE…"
 *
 *  ⛔ YALNIZ KALIBI ÇÖZEN BİR GÖSTERİM O İKİSİNİ **GÖRÜNMEZ** YAPARDI —
 *  ve tam da en çok okunması gereken notlar onlar. Bu yüzden çözücü
 *  ASLA `null` dönmez: kalıp tutmuyorsa notun KENDİSİ döner.
 *  _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 *  değildir" — burada "kalıp tutmadı" ile "not yok" ayrışmak zorunda.)_
 * ============================================================================
 */

/**
 * K136a'da kurulan kalıp: `IADE_SEBEP[kaynak:ty-claims]: «Beğenmedim»`
 *
 * ⚠ `kaynak` YAKALANIYOR AMA LİSTEDE GÖSTERİLMİYOR: hangi kaynaktan geldiği
 * bir GÜVEN bilgisidir ve yeri detay ekranı (orada notun tamamı duruyor).
 * Listede kaynak da basılsaydı sütun okunamaz olurdu — ve operasyonun
 * listede sorduğu soru "niye iade" idi, "kim söyledi" değil.
 */
const KALIP = /^IADE_SEBEP\[kaynak:([^\]]+)\]:\s*«(.+)»$/;

export type IadeSebebi =
  /** Kalıp çözüldü — `metin` sebebin kendisi, `kaynak` nereden geldiği. */
  | { tur: "KALIPLI"; metin: string; kaynak: string }
  /** Not var ama kalıp tutmuyor — HAM gösterilir, gizlenmez. */
  | { tur: "SERBEST"; metin: string }
  /** Not hiç yok. Ekran satırı çizmez; "—" bile yazmaz. */
  | { tur: "YOK" };

/**
 * Notu gösterime çevirir. Veritabanına gitmez, saat okumaz — değerle sınanır.
 *
 * ⚠ NOT DEĞİŞTİRİLMEZ, YALNIZ OKUNUR. Kalıp çözülse bile defterdeki metin
 * olduğu gibi durur; bu gövde sadece EKRANIN ne yazacağını söyler.
 */
export function iadeSebebiCoz(note: string | null | undefined): IadeSebebi {
  const ham = (note ?? "").trim();
  if (ham === "") return { tur: "YOK" };
  const m = KALIP.exec(ham);
  if (m === null) return { tur: "SERBEST", metin: ham };
  const metin = m[2].trim();
  /**
   * ⚠ BOŞ YAKALAMA SERBEST SAYILIR: `«»` gibi bozuk bir kalıp "sebep yok"
   * diye okunmamalı — notun kendisi hâlâ bir bilgidir ve ham gösterilir.
   */
  if (metin === "") return { tur: "SERBEST", metin: ham };
  return { tur: "KALIPLI", metin, kaynak: m[1].trim() };
}

/**
 * Listede basılacak tek satırlık metin. `YOK` ise `null` — çağıran satırı
 * hiç çizmez.
 *
 * ⛔ KIRPMA YOK. En uzun sebep 39 karakter ölçüldü; kırpsaydım "Yanlış
 * sipariş verdim seçeneğinden…" gibi yarım bir cümle kalırdı ve serbest
 * metinlerde asıl hüküm (\"İADE REDDEDİLDİ\") sonda olduğu için KAYBOLURDU.
 * _(Anayasa: "hata mesajını kısaltan her işlem teşhisi kısaltır" — burada
 * kısalan şey operasyonun kararı.)_
 */
export function iadeSebebiMetni(note: string | null | undefined): string | null {
  const s = iadeSebebiCoz(note);
  return s.tur === "YOK" ? null : s.metin;
}
