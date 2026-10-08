/**
 * ============================================================================
 *  TRENDYOL'UN BİLDİRDİĞİ DESİ NE ZAMAN NİHAİDİR (kullanıcı kuralı 08.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: «Trendyol Express ile taşınan ürünlerde sisteme düşen desi nihai
 *  desi oluyor; nihai desi belli olana kadar bizim ürün için belirlediğimiz desi
 *  geçici olarak yazılabilir, sonra Trendyol sistemine desi düşünce revize edilir.»
 *
 *  📏 ÖLÇÜLDÜ (08.10.2026, Trendyol API, yalnız GET): Trendyol Express paketi
 *  KARGODAYKEN `cargoDeci=5` — her pakete aynı standart değer (geçici).
 *  TESLİMDEN SONRA gerçek desi: 11678375509 → 1 · 11676825942 → 1 ·
 *  11675284364 → 3 (panel ekranıyla birebir). Kargodaki 11685920937 → 5.
 *  Canlıda 47 Trendyol Express satışının 47'sinde 5 yapışmıştı.
 *
 *  ⭐ KURAL: Trendyol Express paketinde desi ancak TESLİMDEN SONRA kanal desisi
 *  sayılır; öncesinde `null` döner ve tahmin ürünün kendi desisiyle yapılır.
 *  Öteki taşıyıcılar (Aras vb.) kargoya verilişte gerçek tartımı bildiriyor —
 *  onlarda değer olduğu gibi geçer.
 *
 *  Saf gövde: içe aktarma ve geri doldurma betiği AYNI kuralı buradan çağırır.
 * ============================================================================
 */

/** Trendyol'un `cargoProviderName` alanındaki Trendyol Express adı (ölçüldü: «Trendyol Express Marketplace»). */
export const TEX_FIRMA_DESENI = /trendyol\s*express/i;

export function tyKanalDesisi(paket: {
  cargoDeci: unknown;
  kargoFirmasi: string | null;
  teslimEdildi: boolean;
}): number | null {
  const desi = paket.cargoDeci;
  if (typeof desi !== "number" || !Number.isFinite(desi) || desi <= 0) return null;
  if (paket.kargoFirmasi !== null && TEX_FIRMA_DESENI.test(paket.kargoFirmasi) && !paket.teslimEdildi) return null;
  return desi;
}

/**
 * Ürünün kendi desisi — Σ(ürün.desi × adet), tam desiye yukarı. Ürünlerden
 * birinin desisi yoksa `null`: eksik bir toplamı tam diye sunmak, olmayan bir
 * bilgiyi iddia etmek olurdu (çağıran küresel ortancaya düşer).
 */
export function urunDesisiToplami(kalemler: { desi: number | null; adet: number }[]): number | null {
  if (kalemler.length === 0) return null;
  let toplam = 0;
  for (const k of kalemler) {
    if (k.desi === null || !Number.isFinite(k.desi) || k.desi <= 0) return null;
    toplam += k.desi * k.adet;
  }
  return Math.ceil(toplam - 0.0001);
}
