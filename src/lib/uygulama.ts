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

/**
 * AD DEĞİŞİKLİĞİ 04.10.2026 (kullanıcı kararı): «Selliora» → «Bezirga».
 * Logo ve işaret çizimi `lib/marka/cizim.tsx`te; ad bir daha değişirse yeni
 * marka paketiyle o dosya da değişir (çizim bir addan TÜRETİLEMEZ).
 */
export const UYGULAMA = {
  /**
   * Ürün adı — ekranda görünen hâli. Sekme başlıkları, menü, giriş ekranı ve
   * sözlükteki `{uygulama}` yer tutucusu bunu kullanır. Logodaki küçük harfli
   * «bezirga» bir ÇİZİMDİR; cümle içinde özel isim büyük harfle yazılır
   * (kullanıcı kararı 04.10.2026).
   */
  ad: "Bezirga",
  /**
   * Teknik ad — kullanıcının görmediği kimlikler bundan türetilir: oturum
   * çerezi, yedek dosyası adı ve biçimi, tarayıcı depolama anahtarları,
   * indirilen dosya adları.
   */
  teknikAd: "bezirga",
  /**
   * ⛔ ESKİ TEKNİK ADLAR SİLİNMEZ. Eski adla yazılmış yedekler
   * (`selliora-<gün>.json`, `bicim: "selliora-yedek"`) geri yüklenebilir
   * kalmak zorunda. OKUYAN her yer `teknikAdlar`ı kullanır; YAZAN her yer
   * yalnız `teknikAd`ı. Ad yeniden değişirse bugünkü ad bu listeye eklenir.
   */
  eskiTeknikAdlar: ["selliora"],
} as const;

/** Okumada tanınan bütün teknik adlar — güncel ad başta. */
export const TEKNIK_ADLAR: readonly string[] = [
  UYGULAMA.teknikAd,
  ...UYGULAMA.eskiTeknikAdlar,
];
