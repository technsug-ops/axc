/**
 * ============================================================================
 *  ÜRÜN GÖRSELİ — KAYNAK SIRASI ve SEÇİM KURALI (K273, 25.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: «otomatik yükleme; Trendyol, Hepsiburada gibi programlardan sıralı
 *  olarak hangisinde varsa alınsın… kırık gelirse aynı sıralamayla tekrar
 *  bakılır». SAF: veritabanı ve ağ yok — senkronlar ve ekran bu kuralı çağırır.
 *
 *  ── KAYNAKLAR (ÖLÇÜLDÜ 25.09.2026, salt okuma) ─────────────────────────────
 *   TRENDYOL  ürün ucu `images[].url` — 20/20 dolu. Orijinal 749 KB; CDN
 *             `mnresize/128/192/` önekiyle 7,5 KB (≈100×) → liste bunu kullanır.
 *   N11       `/ms/product-query` `imageUrls[]` — 20/20 dolu, 106 KB; küçültme
 *             yolu denendi, AYNI dosya döndü → orijinal kullanılır.
 *   HEPSİBURADA katalog ucu yalnız DOSYA ADI veriyor (`tiger.jpg`), adres değil
 *             → sırada YOK. Adres veren bir uç bulunursa buraya eklenir.
 *   ELLE      kullanıcının yüklediği — hiçbir senkron EZMEZ.
 *
 *  ── KURAL ──────────────────────────────────────────────────────────────────
 *   · Görsel yoksa ya da KIRIK işaretliyse → gelen aday yazılır.
 *   · Görsel ÇALIŞIYORSA sabit kalır; yalnız DAHA ÖNCELİKLİ bir kaynak onu
 *     değiştirebilir (N11 → Trendyol yükseltmesi; tersi olmaz). Sonuç her
 *     koşumda aynı yere yakınsar: mevcut en öncelikli kaynak.
 *   · ELLE yüklenmiş görsele senkron dokunmaz.
 *   · Adres yalnız İZİNLİ görsel sunucularından kabul edilir (https + alan adı
 *     listesi) — dışarıdan gelen bir dize ekranda keyfi adres olarak çizilmez.
 * ============================================================================
 */

export const GORSEL_KAYNAKLARI = ["ELLE", "TRENDYOL", "N11"] as const;
export type GorselKaynagi = (typeof GORSEL_KAYNAKLARI)[number];

/** Öncelik: küçük sayı önce. ELLE en üstte — kullanıcının seçimi kazanır. */
export const GORSEL_ONCELIGI: Record<GorselKaynagi, number> = {
  ELLE: 0,
  TRENDYOL: 1,
  N11: 2,
};

/** Kanal görselleri yalnız bu sunuculardan kabul edilir (ölçülen adresler). */
export const IZINLI_GORSEL_SUNUCULARI: Record<Exclude<GorselKaynagi, "ELLE">, RegExp> = {
  /* ÖLÇÜLDÜ 25.09: 1.673 görselden 5'i Trendyol'un değil, ürünü Trendyol'a yükleyen
     XML entegratörünün sunucusunda (`cdn1.xmlbankasi.com`). Adres Trendyol'un KENDİ
     API'sinden geliyor → gerçek ürün görseli; küçültme yolu yok, orijinal çizilir. */
  TRENDYOL: /^(cdn\.dsmcdn\.com|cdn\d*\.xmlbankasi\.com)$/,
  N11: /^n11scdn\d*\.akamaized\.net$/,
};

/**
 * Mevcut hâl — veritabanındaki üç alan. KIRIK = `url` son kırık adrese eşit.
 * `kirikUrl` ayrı tutulur ki kaynak AYNI bozuk adresi tekrar gönderdiğinde
 * «öncelikli kaynak kazanır» kuralı onu geri getirmesin (K273 tasarım bulgusu).
 */
export type MevcutGorsel = {
  url: string | null;
  kaynak: GorselKaynagi | null;
  kirikUrl: string | null;
};
export type GorselAdayi = { url: string; kaynak: Exclude<GorselKaynagi, "ELLE"> } | null;

/** Adres kaynağının izinli sunucusunda ve https mi. */
export function gorselAdresiGecerliMi(url: string, kaynak: Exclude<GorselKaynagi, "ELLE">): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  return u.protocol === "https:" && IZINLI_GORSEL_SUNUCULARI[kaynak].test(u.hostname);
}

/** Görsel kırık mı — son kırık adres şu anki adresse. */
export function gorselKirikMi(m: MevcutGorsel): boolean {
  return m.url !== null && m.url === m.kirikUrl;
}

/**
 * Yazılacak görseli döner; DEĞİŞİKLİK YOKSA `null` (senkron boşuna yazmaz).
 */
export function gorselSec(
  mevcut: MevcutGorsel,
  aday: GorselAdayi,
): { url: string; kaynak: GorselKaynagi } | null {
  if (aday === null || !gorselAdresiGecerliMi(aday.url, aday.kaynak)) return null;
  /* Bilinen kırık adres bir daha kabul edilmez. */
  if (aday.url === mevcut.kirikUrl) return null;
  /* Kullanıcının yüklediği görsele senkron dokunmaz — kırık olsa bile (ekranda yer tutucu). */
  if (mevcut.kaynak === "ELLE") return null;
  if (mevcut.url === null || gorselKirikMi(mevcut)) return { url: aday.url, kaynak: aday.kaynak };
  if (mevcut.kaynak !== null && GORSEL_ONCELIGI[aday.kaynak] < GORSEL_ONCELIGI[mevcut.kaynak]) {
    return { url: aday.url, kaynak: aday.kaynak };
  }
  return null;
}

/** Listede gösterilecek KÜÇÜK adres (Trendyol CDN küçültmesi; ötekiler aynen). */
export const TY_KUCUK_ONEK = "mnresize/128/192/";
export function kucukGorselAdresi(url: string, kaynak: GorselKaynagi): string {
  if (kaynak !== "TRENDYOL") return url;
  const m = /^https:\/\/cdn\.dsmcdn\.com\/(?!mnresize\/)(.+)$/.exec(url);
  return m ? `https://cdn.dsmcdn.com/${TY_KUCUK_ONEK}${m[1]}` : url;
}
