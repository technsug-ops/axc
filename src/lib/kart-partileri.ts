import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  KART PARTİ PANELİ — SAF HESAP (K115, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⭐ NİYE AYRI GÖVDE: anayasa — "saf hesap katmanı, desen tarayan bekçiye
 *  muhtaç olmaz." Panelin TOPLAM kuralı burada yaşarsa bekçi kaynağı
 *  taramaz, gövdeyi ÇAĞIRIP değerini ölçer.
 *
 *  ── ⛔ TOPLAM YALNIZ ÖLÇÜLEBİLENİ TOPLAR ───────────────────────────────
 *  Dışarıda kalan iki hâl var ve ikisi de sessiz bırakılmaz:
 *    · maliyeti BİLİNMEYEN parti (`null`)
 *    · BAŞKA para birimindeki parti — kur çevirisi anayasa gereği yapılmaz
 *  Kaç partinin dışarıda kaldığı ayrı sayılır ve ekran onu YAZAR.
 *  _(Anayasa: boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 *  değildir; ve para rakamı tabanıyla birlikte yazılır.)_
 *
 *  ── ⚠ ADET HER ZAMAN TAM TOPLANIR ─────────────────────────────────────
 *  Adet para birimi taşımaz ve maliyeti bilinmese de bilinir; onu eksik
 *  göstermek için hiçbir sebep yok. Tutar eksik olabilir, adet olamaz.
 * ============================================================================
 */

export type PanelPartisi = {
  kalanAdet: number;
  birimMaliyet: number | null;
  paraBirimi: Currency | null;
};

export type PartiToplami = {
  /** Bütün açık partilerin adedi — hiçbir parti dışarıda kalmaz. */
  adet: number;
  /** Yalnız ölçülebilen partilerin tutarı. */
  tutar: number;
  /** Tutara GİRMEYEN parti sayısı — sıfırdan büyükse ekranda yazar. */
  olculemeyen: number;
};

export function partiToplami(
  partiler: readonly PanelPartisi[],
  para: Currency,
): PartiToplami {
  let adet = 0;
  let tutar = 0;
  let olculemeyen = 0;

  for (const p of partiler) {
    adet += p.kalanAdet;
    /**
     * ⚠ `paraBirimi === null` SEÇİLEN BİRİM SAYILIR. Maliyeti bilinen ama
     * birimi yazılmamış eski kayıtlar var; onları dışarı atmak, ölçülebilen
     * bir tutarı sebepsiz kaybettirirdi. Bilinmeyen olan MALİYET, birim değil.
     */
    const birimUyuyor = (p.paraBirimi ?? para) === para;
    if (p.birimMaliyet === null || !birimUyuyor) {
      olculemeyen += 1;
      continue;
    }
    tutar += p.kalanAdet * p.birimMaliyet;
  }

  return { adet, tutar, olculemeyen };
}

/**
 * Panelde "sıradaki" rozeti hangi satıra konur.
 *
 * ⭐ ÖLÇÜT SIRA, TARİH DEĞİL: liste `acikPartiler` gövdesinden FIFO sırasında
 * geliyor ve o gövde tarihi ZATEN çözmüş durumda. Burada tarihi ikinci kez
 * karşılaştırmak, aynı kuralı iki yerde tutmak olurdu — ve iki yer ayrışınca
 * rozet ile motorun tükettiği parti SESSİZCE farklılaşırdı.
 * _(Anayasa: aynı kural iki gövdede yaşamaz.)_
 *
 * ⚠ VE BOŞ LİSTEDE ROZET YOK: `-1` hiçbir satırla eşleşmez.
 */
export function siradakiPartiSirasi(partiSayisi: number): number {
  return partiSayisi > 0 ? 0 : -1;
}
