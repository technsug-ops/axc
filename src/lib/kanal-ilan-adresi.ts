/**
 * ============================================================================
 *  PAZARYERİ İLAN ADRESİ — SAF GÖVDE (kullanıcı isteği 07.10.2026)
 * ----------------------------------------------------------------------------
 *  «Ürünler listesine ürünlerin pazaryerindeki linkini ekle; Firma SKU'nun
 *  soluna 3 satır: önce Trendyol, sonra Hepsiburada, sonra N11. Sonra
 *  eklenecek pazaryerleri için de hazırlık yap. Satırlarda gösterilecek
 *  pazaryerlerini müşteri kendi seçer.»
 *
 *  ⭐ ADRES SAKLANMAZ, KİMLİK SAKLANIR. Link ekranda kanal başına TEK
 *  kalıptan kurulur; kalıp yanlış çıkarsa tek satır düzelir, veri yeniden
 *  yazılmaz. Kimlik `ChannelSku.externalListingId`de (şemadaki adıyla
 *  «pazaryerindeki ürün/listing kimliği» — 07.10'a kadar YAZICISI YOKTU,
 *  0/2358 dolu; kanal okuması artık yazıyor).
 *
 *  ── KALIPLAR — ÖLÇÜM `canli:ilan-adresi-olcum` (07.10.2026, 20'şer kayıt) ──
 *  · TRENDYOL: onaylı v2 uç `variants[].productUrl` 20/20 dolu, biçim
 *    `trendyol.com/abc/xyz-p-{contentId}?merchantId=…`. Trendyol KENDİSİ ad
 *    kısmına «abc/xyz» yazıyor → adresi belirleyen yalnız contentId. Kimlik:
 *    `contentId` (ürün düzeyi, 20/20).
 *  · HEPSIBURADA: uç adres GÖNDERMİYOR; `hepsiburadaSku` 20/20 ve bizim
 *    `channelSku` ZATEN o (eşleştirme onunla). Kalıp `…-p-{HBCV…}`.
 *    ⚠ DOĞRULANMADI: site betikten gelen isteğe 403 veriyor — Halil testi.
 *  · N11: uç adres GÖNDERMİYOR; `n11ProductId` 20/20. Kalıp
 *    `n11.com/urun/x-{n11ProductId}`. ⚠ DOĞRULANMADI (403) — Halil testi.
 *  Kalıbı olmayan kanal link ÜRETMEZ; ekranda «link yok» yazar (uydurulmaz).
 * ============================================================================
 */

export type IlanKaydi = {
  /** Kanalda kullanılan stok kodu (HB'de HBCV… kodunun kendisi). */
  channelSku: string;
  /** Pazaryerinin ürün kimliği (TY contentId · N11 n11ProductId). */
  externalListingId: string | null;
  /** Kanal hesabının pazaryerindeki satıcı kimliği (TY merchantId). */
  saticiId: string | null;
};

const kodla = (s: string) => encodeURIComponent(s.trim());

/** Kanal kodu → ilan adresi kalıbı. Yeni pazaryeri = buraya TEK satır. */
export const ILAN_ADRESI_KALIPLARI: Readonly<Record<string, (k: IlanKaydi) => string | null>> = {
  TRENDYOL: (k) =>
    k.externalListingId && /^\d+$/.test(k.externalListingId.trim())
      ? `https://www.trendyol.com/abc/xyz-p-${kodla(k.externalListingId)}${k.saticiId ? `?merchantId=${kodla(k.saticiId)}` : ""}`
      : null,
  HEPSIBURADA: (k) =>
    /^HB[A-Z0-9]{6,}$/.test(k.channelSku.trim()) ? `https://www.hepsiburada.com/x-p-${kodla(k.channelSku)}` : null,
  N11: (k) =>
    k.externalListingId && /^\d+$/.test(k.externalListingId.trim())
      ? `https://www.n11.com/urun/x-${kodla(k.externalListingId)}`
      : null,
};

/** Kanal kodu için ilan adresi; kalıp yoksa ya da kimlik eksikse `null`. */
export function ilanAdresi(kanalKodu: string, k: IlanKaydi): string | null {
  const kalip = ILAN_ADRESI_KALIPLARI[kanalKodu];
  return kalip ? kalip(k) : null;
}

/** Firma hiç seçmediyse — kullanıcının verdiği sıra. */
export const VARSAYILAN_LISTE_KANALLARI = ["TRENDYOL", "HEPSIBURADA", "N11"] as const;
/** Satır sayısı tavanı — kullanıcı «3 satır» dedi; liste hücresi taşmasın. */
export const LISTE_KANALI_TAVANI = 3;

/**
 * Kayıtlı seçimi çözer: JSON dizi, yalnız GEÇERLİ kanal kodları, tekrar yok,
 * tavan kadar. ⚠ Boş / bozuk / hiç geçerli kod yok → VARSAYILAN (sessiz boş
 * liste olmaz: sütun hiç kanal göstermeseydi «link yok» ile «seçim bozuk»
 * ayırt edilemezdi). Bilerek boş seçim = `[]` (JSON «[]») sütunu gizler.
 */
export function listeKanallariCoz(ham: string | null, gecerliKodlar: readonly string[]): string[] {
  if (ham === null || ham.trim() === "") return [...VARSAYILAN_LISTE_KANALLARI].filter((k) => gecerliKodlar.includes(k));
  let dizi: unknown;
  try {
    dizi = JSON.parse(ham);
  } catch {
    return [...VARSAYILAN_LISTE_KANALLARI].filter((k) => gecerliKodlar.includes(k));
  }
  if (!Array.isArray(dizi)) return [...VARSAYILAN_LISTE_KANALLARI].filter((k) => gecerliKodlar.includes(k));
  if (dizi.length === 0) return [];
  const sonuc: string[] = [];
  for (const k of dizi) {
    if (typeof k === "string" && gecerliKodlar.includes(k) && !sonuc.includes(k)) sonuc.push(k);
    if (sonuc.length === LISTE_KANALI_TAVANI) break;
  }
  return sonuc.length > 0 ? sonuc : [...VARSAYILAN_LISTE_KANALLARI].filter((k) => gecerliKodlar.includes(k));
}
