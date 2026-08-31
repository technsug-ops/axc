/**
 * ============================================================================
 *  LOT KİPİ — PARTİYİ KİM SEÇER (K115, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ BU BİR MALİYET YÖNTEMİ DEĞİL. Üç kipte de maliyet kuralı FIFO'dur;
 *  değişen tek şey partiyi SİSTEMİN mi OPERATÖRÜN mü seçtiği. Karıştırılırsa
 *  "lot kipini değiştirince maliyetim değişti mi" diye sorulur — değişmez.
 *
 *  ── ⭐ ÜÇ KİP, TEK MOTOR ────────────────────────────────────────────────
 *    FIFO   — seçici GİZLİ, sistem hep en eskiyi tüketir
 *    HIBRIT — seçici İSTEĞE BAĞLI, varsayılan en eski (K110 davranışı)
 *    LOT    — seçici ZORUNLU, her satırda parti seçilir
 *
 *  ── ⚠ YALNIZ `maliyetYontemi = FIFO` İKEN ANLAMLI ──────────────────────
 *  Hareketli ortalamada parti kavramı YOKTUR; havuz tek fiyat verir ve
 *  seçilecek bir şey kalmaz. Ekran o hâlde ayarı kapatır ve NİYE kapandığını
 *  yazar — sessizce gri bırakmak "bozuk" sanılırdı (İlke #5).
 *
 *  ── ⚠ VARSAYILAN `HIBRIT`, `FIFO` DEĞİL ────────────────────────────────
 *  Bugünkü davranış bu. `FIFO` varsayılan yapılsaydı K110 ile gelen seçici
 *  sütun eklendiği anda SESSİZCE kaybolurdu.
 *
 *  ── ⚠ ÖLÇÜLDÜ: SEÇİM 41 VARYANTTA RAKAM DEĞİŞTİRİR ─────────────────────
 *  Canlı (31.08.2026): 230 stoklu varyantın 102'sinde 2+ açık parti var,
 *  41'inde partilerin MALİYETİ farklı — ortanca %2,3, en büyüğü %36
 *  (₺3.749 ↔ ₺5.099). Kalan 61'inde seçim hiçbir şeyi değiştirmez.
 * ============================================================================
 */

export const LOT_KIPLERI = ["FIFO", "HIBRIT", "LOT"] as const;
export type LotKipi = (typeof LOT_KIPLERI)[number];

export const VARSAYILAN_LOT_KIPI: LotKipi = "HIBRIT";

export function lotKipiCoz(ham: string | null | undefined): LotKipi {
  return (LOT_KIPLERI as readonly string[]).includes(ham ?? "")
    ? (ham as LotKipi)
    : VARSAYILAN_LOT_KIPI;
}

/**
 * Satış formunda parti seçici ÇİZİLİR Mİ — saf kural.
 *
 * ⚠ ÖLÇÜT "2+ parti var mı" DEĞİL, "MALİYETİ FARKLI 2+ parti var mı".
 * Aynı fiyata alınmış iki partiden hangisini seçtiğinin hiçbir sonucu yok;
 * orada kutu göstermek saf gürültüdür. Ölçüldü: 102 varyantın 61'inde
 * maliyetler aynı — gürültünün %60'ı bu ölçütle düşüyor.
 */
export function seciciCizilsinMi(g: {
  kip: LotKipi;
  /** Açık partilerin birim maliyetleri (Decimal dizesi; bilinmeyen `null`). */
  maliyetler: readonly (string | null)[];
}): boolean {
  if (g.kip === "FIFO") return false;
  if (g.maliyetler.length < 2) return false;

  /**
   * ⚠ BİLİNMEYEN MALİYET FARK SAYILIR. `null` bir partinin maliyeti
   * bilinmiyor demektir; onu "aynı" saymak, operatörden gerçek bir seçimi
   * gizlerdi. _(Anayasa: bilinmeyen sıfıra/aynıya çevrilmez.)_
   */
  if (g.maliyetler.some((m) => m === null)) return true;

  const sayilar = g.maliyetler.map((m) => Number(m));
  const min = Math.min(...sayilar);
  const max = Math.max(...sayilar);
  /** ⚠ KURUŞA: `Decimal`→float kuyruğu sahte fark üretmesin. */
  return max - min > 0.005;
}

/**
 * `LOT` kipinde seçim ZORUNLU mu — saf kural.
 *
 * ⭐ TEK PARTİLİ ÜRÜNDE ZORLA TIKLATILMAZ (kullanıcı sorusu 31.08.2026):
 * seçilecek bir şey yokken onay istemek, operatöre anlamsız bir adım
 * yükler ve zorunluluğu ucuzlatır. Kutu bilgi olarak durur, kapı açılmaz.
 */
export function secimZorunluMu(g: { kip: LotKipi; partiSayisi: number }): boolean {
  return g.kip === "LOT" && g.partiSayisi > 1;
}
