/**
 * ============================================================================
 *  KÂRLILIK KARTI ADRESİ — TEK KAYNAK
 * ----------------------------------------------------------------------------
 *  Kullanıcı 24.08.2026: _"Alışlar, satışlar ve Ürünlerde ürün isminin
 *  üstüne tıklandığında kârlılık kartına direkt girsin. Arada başka tıklama
 *  olmasın."_ (İlke #9 — az tıkla.)
 *
 *  ⚠ KART VARYANT SEVİYESİNDEDİR (`/kart/{variantId}`), ÜRÜN DEĞİL.
 *  Aynı ürünün iki varyantının maliyeti, stoğu ve kârı ayrıdır; "ürünün
 *  kartı" diye bir şey yok. Bu yüzden bağlantı ancak varyant TEKİLSE
 *  kurulabilir.
 *
 *  ⚠ BELİRSİZKEN BAĞLANTI KURULMAZ, TAHMİN EDİLMEZ. İki varyantlı bir
 *  kayıtta "ilkini al" demek, kullanıcıyı sessizce YANLIŞ kartın önüne
 *  koymaktı — ve yanlış olduğu ekranda hiçbir yerde yazmazdı. `null`
 *  dönünce ad düz metin kalır; bugünkü davranış korunur, hiçbir şey
 *  bozulmaz.
 *
 *  ⚠ BUGÜN BELİRSİZLİK YOK AMA KURAL YİNE DE VAR — ölçüldü 24.08.2026:
 *  126 satışın 126'sı, 339 alımın 339'u tek varyantlı; 1080 ürünün 1076'sı
 *  tek varyantlı, 4'ü çok (6 · 5 · 2 · 2). Yani kural bugün 4 üründe
 *  devreye giriyor ve yarın hacim artınca kendiliğinden doğru kalıyor.
 * ============================================================================
 */

/**
 * Kalemlerden kârlılık kartı adresi. Varyant tekil değilse `null`.
 *
 * ⚠ `variantId` ile TEKİLLEŞTİRİLİR, kalem sayısıyla değil: aynı varyant
 * iki ayrı kalemde geçebilir (farklı fiyattan iki satır) ve o durumda kart
 * hâlâ belirsiz DEĞİLDİR.
 */
export function kartAdresi(
  kalemler: readonly { variantId: string }[],
): string | null {
  const tekil = new Set(kalemler.map((k) => k.variantId));
  if (tekil.size !== 1) return null;
  return `/kart/${[...tekil][0]}`;
}
