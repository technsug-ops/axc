/**
 * Para birimi bazlı toplama.
 *
 * KURAL (CLAUDE.md): Para birimleri BİRBİRİNE ÇEVRİLMEZ. Bir alımda hem TRY
 * hem EUR kalem olabilir; bunlar ayrı ayrı toplanır ve ayrı ayrı gösterilir.
 * Burada hiçbir yerde kur kullanılmaz.
 */

export type ParaToplami = {
  paraBirimi: string;
  tutar: number;
};

type ToplanabilirKalem = {
  quantity: number;
  unitCostAmount: { toString(): string } | number | string;
  unitCostCurrency: string;
};

/** Kalemleri para birimine göre gruplayıp toplar. */
export function kalemToplamlari(kalemler: ToplanabilirKalem[]): ParaToplami[] {
  const harita = new Map<string, number>();

  for (const kalem of kalemler) {
    const birimFiyat = Number(kalem.unitCostAmount.toString());
    if (!Number.isFinite(birimFiyat)) continue;

    const satirToplami = birimFiyat * kalem.quantity;
    harita.set(
      kalem.unitCostCurrency,
      (harita.get(kalem.unitCostCurrency) ?? 0) + satirToplami,
    );
  }

  return [...harita.entries()]
    .map(([paraBirimi, tutar]) => ({ paraBirimi, tutar }))
    .sort((a, b) => a.paraBirimi.localeCompare(b.paraBirimi));
}

/** Birden çok toplam listesini tek listede birleştirir (kart detayı için). */
export function toplamlariBirlestir(
  listeler: ParaToplami[][],
): ParaToplami[] {
  const harita = new Map<string, number>();

  for (const liste of listeler) {
    for (const { paraBirimi, tutar } of liste) {
      harita.set(paraBirimi, (harita.get(paraBirimi) ?? 0) + tutar);
    }
  }

  return [...harita.entries()]
    .map(([paraBirimi, tutar]) => ({ paraBirimi, tutar }))
    .sort((a, b) => a.paraBirimi.localeCompare(b.paraBirimi));
}
