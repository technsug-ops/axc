import type { Parti } from "@/lib/stok";

/**
 * ============================================================================
 *  MALİYETSİZ STOK — TEK ÖLÇÜT
 * ----------------------------------------------------------------------------
 *  Mimar kararı 15.08.2026, ÖLÇÜT (a): stokta adedi olan ama birim maliyeti
 *  BİLİNMEYEN FIFO partisi bulunan varyantlar.
 *
 *  ── NEDEN ÖNLEYİCİ ÖLÇÜT SEÇİLDİ ────────────────────────────────────────
 *  Tepkisel okuma (`NO_COST`a düşmüş satışların varyantları) ELENDİ: o zaten
 *  3. uyarının (kârı hesaplanamayan satış) kapsamındaydı, ikisi birden
 *  sayılsaydı aynı sorun çanda iki kez görünürdü. Bu ölçüt satıştan ÖNCE
 *  yakalar — alım girilirse `NO_COST` hiç doğmaz.
 *
 *  ── SAYI İLE LİSTE AYNI FONKSİYONDAN ────────────────────────────────────
 *  Çandaki sayı da `/stok?maliyet=yok` listesi de BURAYI çağırır. İki yerde
 *  iki koşul yazılsaydı biri "kalanAdet > 0" derken diğeri demez, rozet 4
 *  derken liste 5 gösterirdi. Panelin en temel sözü "sayı = liste"dir
 *  (görev kutusunda 15.08.2026'da tam bu yaşandı).
 *
 *  ── TÜKENMİŞ PARTİ SAYILMAZ ─────────────────────────────────────────────
 *  `kalanAdet > 0` şartı olmadan, maliyeti bilinmeyen ama ÇOKTAN satılmış
 *  bir parti varyantı sonsuza dek uyarıda tutardı: kullanıcı düzeltemez,
 *  uyarı hiç sönmez. Sönmeyen uyarı, bir süre sonra hiç okunmayan uyarıdır.
 * ============================================================================
 */

/** Partisinde maliyeti bilinmeyen ve HÂLÂ stokta duran adet var mı. */
export function maliyetsizMi(partiler: Parti[]): boolean {
  return partiler.some((p) => p.kalanAdet > 0 && p.birimMaliyet === null);
}

/**
 * Maliyeti bilinmeyen varyant kimlikleri — çan sayısı ve stok süzgeci
 * için tek kaynak.
 */
export function maliyetsizVaryantlar(
  partiler: Map<string, Parti[]>,
): string[] {
  const liste: string[] = [];
  for (const [variantId, parti] of partiler) {
    if (maliyetsizMi(parti)) liste.push(variantId);
  }
  return liste;
}
