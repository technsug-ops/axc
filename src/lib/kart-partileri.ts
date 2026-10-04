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

/**
 * Bir parti tutara girer mi — `partiToplami` ve `kalanMaliyetOzeti` AYNI
 * koşulu kullanır (iki gövdede iki ölçüt olmaz).
 *
 * ⚠ `paraBirimi === null` SEÇİLEN BİRİM SAYILIR. Maliyeti bilinen ama
 * birimi yazılmamış eski kayıtlar var; onları dışarı atmak, ölçülebilen
 * bir tutarı sebepsiz kaybettirirdi. Bilinmeyen olan MALİYET, birim değil.
 */
export function partiOlculebilirMi(
  p: PanelPartisi,
  para: Currency,
): p is PanelPartisi & { birimMaliyet: number } {
  return p.birimMaliyet !== null && (p.paraBirimi ?? para) === para;
}

export function partiToplami(
  partiler: readonly PanelPartisi[],
  para: Currency,
): PartiToplami {
  let adet = 0;
  let tutar = 0;
  let olculemeyen = 0;

  for (const p of partiler) {
    adet += p.kalanAdet;
    /* Tek kapı: koşul yalnız `partiOlculebilirMi`de — burada ikinci bir null
       kontrolü olsaydı, gövdedeki kontrolü silen mutasyon onun arkasında
       görünmez kalırdı (anayasa: iki kapı aynı şeyi korumaz). */
    if (!partiOlculebilirMi(p, para)) {
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

/**
 * ============================================================================
 *  KALAN STOĞUN MALİYET ÖZETİ — stok sayfasındaki «Mevcut stok» kutusu
 *  (kullanıcı isteği 04.10.2026: «kalan 2 ürünün alım maliyetini göster»)
 * ----------------------------------------------------------------------------
 *  Kartın parti paneliyle AYNI gövdeden: tutar `partiToplami`dan, koşul
 *  `partiOlculebilirMi`den. Stok sayfası kendi hesabını kurmaz.
 *
 *  · `tekBirim` — ölçülebilen bütün partiler AYNI birim maliyetteyse o
 *    maliyet (kuruşuna); değilse null ve ekran ORTALAMA yazar.
 *  · `ortalama` — yalnız ölçülebilen adetlerin ortalaması. Maliyeti
 *    bilinmeyen adet paydaya GİRMEZ (girerse ortalama sahte düşer).
 *  · Ölçülemeyen parti sayısı ayrıca döner; sıfırdan büyükse ekran yazar.
 * ============================================================================
 */
export type KalanMaliyetOzeti = PartiToplami & {
  partiSayisi: number;
  olculenAdet: number;
  tekBirim: number | null;
  ortalama: number | null;
};

export function kalanMaliyetOzeti(
  partiler: readonly PanelPartisi[],
  para: Currency,
): KalanMaliyetOzeti {
  const toplam = partiToplami(partiler, para);
  const olculen = partiler.filter(
    (p): p is PanelPartisi & { birimMaliyet: number } => partiOlculebilirMi(p, para) && p.kalanAdet > 0,
  );
  const olculenAdet = olculen.reduce((s, p) => s + p.kalanAdet, 0);
  const kuruslar = new Set(olculen.map((p) => Math.round(p.birimMaliyet * 100)));
  const tekBirim = olculen.length > 0 && kuruslar.size === 1 ? olculen[0]!.birimMaliyet : null;
  return {
    ...toplam,
    partiSayisi: partiler.length,
    olculenAdet,
    tekBirim,
    ortalama: olculenAdet > 0 ? toplam.tutar / olculenAdet : null,
  };
}

/**
 * Özetin para birimi — açık partilerde EN ÇOK geçen birim; hiç yoksa TRY.
 * Başka birimdeki parti tutara girmez ve `olculemeyen`de sayılır (kur
 * çevirisi yapılmaz — anayasa).
 */
export function partilerinParaBirimi(partiler: readonly PanelPartisi[]): Currency {
  const sayac = new Map<Currency, number>();
  for (const p of partiler) if (p.paraBirimi && p.birimMaliyet !== null) sayac.set(p.paraBirimi, (sayac.get(p.paraBirimi) ?? 0) + 1);
  return [...sayac.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "TRY";
}

/** Kartın «Açık partiler» bölümünün çapası — bağlantıyı kuran ekran da buradan okur. */
export const KART_PARTI_CAPASI = "acik-partiler";
