/**
 * ============================================================================
 *  UYGULAMA KİMLİĞİ — TEK KAYNAK
 * ----------------------------------------------------------------------------
 *  Görünen her yerde (sol menü, üst çubuk, sekme başlıkları) uygulama adı
 *  BURADAN okunur. Adı değiştirmek tek satırlık bir iş olmalıdır.
 *
 *  ADLANDIRMA STANDARDI (CLAUDE.md): Hiçbir firma/marka adı sistemin
 *  YAPISINA gömülmez. Bu sabit ürünün kendi adıdır; müşteri firma adları
 *  yalnızca VERİ olabilir (ileride ayar alanı değeri), yapı olamaz.
 *
 *  NOT: Ürün ADI bir özel isimdir, çevrilmez — bu yüzden sözlükte değil
 *  burada durur. Slogan gibi çevrilebilir metinler messages/*.json içinde.
 * ============================================================================
 */

export const UYGULAMA = {
  /** Ürün adı. Sekme başlıkları ve marka alanları bunu kullanır. */
  ad: "Selliora",
} as const;
