import type { DurumRengi } from "@/lib/renkler";

/**
 * ============================================================================
 *  TARİFE HESAPLAMA — "ŞU ANKİ FİYAT" ÖNERİSİ VE NET RENGİ (K234-②, 22.09.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ KARAR ÇEVRİLDİ, ESKİSİ SİLİNMEDİ. 21.09.2026'da kullanıcı "ekran ayna +
 *  NET olsun, HÜKÜM vermesin" demişti; en kârlı dilim yalnız işaretleniyordu.
 *  22.09.2026'da aynı kullanıcı: _"şu anki fiyattan satarsam ne kalır,
 *  teklifleri değerlendirirsem… Selliora bana desin ki bunun fiyatını 1095
 *  yap daha fazla kazan; fark ufak ama sistem önemli."_ Öneri artık YAZILIR —
 *  ama yalnız ŞU ANKİ fiyata göre ve rakamıyla: "fiyatı X yaparsan NET-2 +Δ".
 *
 *  Saf gövde: ekran değil, değer testi sınar (`tarife:dogrula` K234).
 * ============================================================================
 */

export type NetSatiri = { fiyat: number | null; net2: number | null };

export type Oneri =
  | { tur: "ARTIR"; hedefFiyat: number; fark: number }
  | { tur: "EN_IYI" }
  /** Şu anki fiyatın NET'i yok (fiyat bilinmiyor / hesaplanamadı) — hüküm yok. */
  | { tur: "YOK" };

/** Kuruş tozu öneri üretmez: fark 1 kuruşun altındaysa "aynı" sayılır. */
const KURUS = 0.005;

/**
 * En yüksek NET-2 veren dilim satırı. Boş/hesaplanamayan satırlar dışarıda;
 * hepsi boşsa `null` (uydurma bir "en iyi" yok).
 */
export function enIyiSatir<T extends NetSatiri>(satirlar: readonly T[]): T | null {
  let enIyi: T | null = null;
  for (const s of satirlar) {
    if (s.net2 === null || s.fiyat === null) continue;
    if (enIyi === null || s.net2 > (enIyi.net2 ?? Number.NEGATIVE_INFINITY)) enIyi = s;
  }
  return enIyi;
}

/**
 * Şu anki fiyatın NET'i ile dilimlerin en iyisini karşılaştırır.
 *  · en iyi dilim şu ankinden BELİRGİN yüksekse → ARTIR (hedef fiyat + fark)
 *  · değilse → EN_IYI (şu anki fiyat zaten en iyisi)
 *  · şu anki NET yoksa → YOK
 */
export function oneriKur(guncel: NetSatiri | null, satirlar: readonly NetSatiri[]): Oneri {
  if (!guncel || guncel.net2 === null || guncel.fiyat === null) return { tur: "YOK" };
  const enIyi = enIyiSatir(satirlar);
  if (!enIyi || enIyi.net2 === null || enIyi.fiyat === null) return { tur: "EN_IYI" };
  const fark = enIyi.net2 - guncel.net2;
  if (fark > KURUS && Math.abs(enIyi.fiyat - guncel.fiyat) > KURUS) {
    return { tur: "ARTIR", hedefFiyat: enIyi.fiyat, fark };
  }
  return { tur: "EN_IYI" };
}

/**
 * NET rengi — kullanıcı 22.09: "eksi ise kırmızı, artı ise yeşil olursa daha
 * anlaşılır." Sıfır ve bilinmeyen renksiz: renk bir hükümdür, yokluk değil.
 */
export function netRengi(net: number | null): DurumRengi | null {
  if (net === null || Math.abs(net) <= KURUS) return null;
  return net < 0 ? "olumsuz" : "olumlu";
}
