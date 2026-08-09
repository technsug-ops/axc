import { VARSAYILAN_KDV_ORANI } from "@/lib/kar";

/**
 * ============================================================================
 *  KDV ORANI ÇÖZÜMLEME — TEK KAYNAK
 * ----------------------------------------------------------------------------
 *  ÇÖZÜM SIRASI (CLAUDE.md → Yol haritası notları):
 *      ürün istisnası  >  kategori oranı  >  varsayılan %20
 *
 *  Varsayılana düşmek SESSİZ OLMAMALI: `kaynak` alanı hangi yoldan gelindiğini
 *  söyler, ekranlar da "varsayılan %20 ile hesaplandı — kategori atayın"
 *  uyarısını buna bakarak gösterir.
 *
 *  Satış anında çözülen oran satış kalemine YAZILIR (snapshot); kategori
 *  oranı sonradan değişse eski satışların hesabı değişmez.
 * ============================================================================
 */

export type KdvKaynagi = "ISTISNA" | "KATEGORI" | "VARSAYILAN";

export type KdvCozumu = {
  oran: number;
  kaynak: KdvKaynagi;
  /** Kategoriden geldiyse kategori adı — ekranda gösterilir. */
  kategoriAdi: string | null;
};

type Sayisal = { toString(): string } | number | string | null | undefined;

function sayiya(deger: Sayisal): number | null {
  if (deger === null || deger === undefined) return null;
  const n = Number(deger.toString());
  return Number.isFinite(n) ? n : null;
}

export function kdvOraniniCoz(urun: {
  vatRateOverride?: Sayisal;
  category?: { name: string; vatRate: Sayisal } | null;
}): KdvCozumu {
  const istisna = sayiya(urun.vatRateOverride);
  if (istisna !== null) {
    return { oran: istisna, kaynak: "ISTISNA", kategoriAdi: null };
  }

  const kategoriOrani = sayiya(urun.category?.vatRate);
  if (urun.category && kategoriOrani !== null) {
    return {
      oran: kategoriOrani,
      kaynak: "KATEGORI",
      kategoriAdi: urun.category.name,
    };
  }

  return {
    oran: VARSAYILAN_KDV_ORANI,
    kaynak: "VARSAYILAN",
    kategoriAdi: null,
  };
}
