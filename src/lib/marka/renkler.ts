/**
 * ============================================================================
 *  KABUK RENKLERİ — CSS DIŞINDA OKUNMASI GEREKEN TEK RENK KÜMESİ
 * ----------------------------------------------------------------------------
 *  Normalde renk CSS'te durur ve buradan okunmaz. Üç yerde okunamıyor:
 *
 *  1. PWA simgeleri derleme anında PNG'ye çevriliyor — o an CSS yok.
 *  2. Manifest bir JSON; `var(--se-kabuk)` yazamaz.
 *  3. Telefonun sistem çubuğu rengi (`<meta name="theme-color">`) React
 *     yüklenmeden ÖNCE, `<head>`teki küçük betikte yazılıyor.
 *
 *  ⚠ BU KOPYA BEKÇİYE BAĞLI. Yorumda duran bir karar sessizce çürür:
 *  22.08.2026'da çizgi rengi kararı tam böyle çürüdü — palet değişti,
 *  gerekçe olduğu gibi kaldı, kimse fark etmedi. `scripts/pwa-dogrula.ts`
 *  aşağıdaki değerleri `src/styles/tema-*.css` içindeki `--se-kabuk` ve
 *  `--se-kabuk-ink` ile KARŞILAŞTIRIR; ayrışırsa kırmızı yanar.
 * ============================================================================
 */

import { UYGULAMA } from "@/lib/uygulama";

/**
 * Tema tercihinin tarayıcı anahtarı. Burada durur çünkü İKİ yer okur:
 * `tema-secici.tsx` (istemci) ve `layout.tsx`teki ilk boyama betiği
 * (sunucuda yazılır). İstemci bileşeninden sunucuya sabit aktarılamaz.
 */
export const TEMA_ANAHTARI = `${UYGULAMA.teknikAd}-tema`;

/** Tema başına kabuk (sol menü / sistem çubuğu) zemini. */
export const KABUK_RENKLERI = {
  /** `tema-kobalt.css` → `--se-kabuk` */
  kobalt: "#FFFFFF",
  /* 07.10.2026: Algoritmo pembe teması — menü beyaz, sistem çubuğu da beyaz. */
  pembe: "#FFFFFF",
  /** `tema-gece.css` → `--se-kabuk` */
  gece: "#08101E",
  /** `tema-kagit.css` → `--se-kabuk` */
  kagit: "#3A2E24",
} as const;

/** Kabuk üstündeki yazı — iki temada da beyaza yakın; simge tek çizim. */
export const KABUK_YAZI = "#FFFFFF";

/**
 * Simge ve manifest tek renk taşır (tema seçimini bilemezler); varsayılan
 * tema Kobalt olduğu için o kullanılır.
 */
export const MARKA_RENKLERI = {
  zemin: KABUK_RENKLERI.kobalt,
  yazi: KABUK_YAZI,
} as const;
