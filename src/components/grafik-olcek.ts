/**
 * ============================================================================
 *  GRAFİK ÖLÇEĞİ — PAYLAŞILAN SAF GÖVDE (K117, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE AYRI DOSYA: `cizgi-grafik.tsx` içinde yaşıyordu ve ikinci bir
 *  grafik (envanter · marj) doğduğunda **kopyalanacaktı.** Kopyalanan bir
 *  eksen gövdesi, biri düzeltilip öteki unutulunca iki grafiği farklı
 *  ölçekte gösterirdi — ve fark ancak yan yana konunca görünürdü.
 *  _(Anayasa: aynı kural iki gövdede yaşamaz.)_
 *
 *  ⭐ SAF: DOM'a, tarihe, veritabanına dokunmaz. Bekçi kaynağı taramak
 *  yerine gövdeyi ÇAĞIRIP değerini ölçebiliyor.
 * ============================================================================
 */

/**
 * Çizim alanı — kullanıcı birimi (viewBox), piksel değil.
 *
 * ORAN ÖNEMLİ, MUTLAK DEĞER DEĞİL (15.08.2026 düzeltmesi). SVG `w-full`
 * ile çizildiği için viewBox ekran genişliğine ÖLÇEKLENİR: 760 birimlik
 * bir kutu 1100 px'lik alanda %45 büyür — 13 birimlik yazı 19 px olur,
 * 260 birimlik yükseklik 376 px'e çıkar. Kullanıcı haklı olarak "inanılmaz
 * kötü, çok büyük" dedi; grafik ekranın üçte birini yiyordu.
 *
 * Çözüm kutuyu GENİŞ ve BASIK yapmak: 1240×280 (yaklaşık 4,4:1). Aynı
 * ekranda ölçek ~0,9'a düşüyor, yazılar 12 px civarında kalıyor ve
 * yükseklik ~250 px'i geçmiyor. Eğilim grafiği zaten yatay okunur —
 * yüksek bir kutu bilgi taşımaz, yalnız yer kaplar.
 */
/** ⚠ Ortak kutu: bütün grafikler aynısını kullanır (İlke #10 — tutarlılık). */
export const GRAFIK_KUTUSU = {
  genislik: 1240,
  yukseklik: 280,
  sol: 110,
  sag: 16,
  ust: 16,
  alt: 34,
} as const;

export const IC_GENISLIK =
  GRAFIK_KUTUSU.genislik - GRAFIK_KUTUSU.sol - GRAFIK_KUTUSU.sag;
export const IC_YUKSEKLIK =
  GRAFIK_KUTUSU.yukseklik - GRAFIK_KUTUSU.ust - GRAFIK_KUTUSU.alt;

/** Y ekseninde kaç aralık olacak. 4 aralık = 5 çizgi. */
const ARALIK_SAYISI = 4;

/**
 * Ekseni "güzel" sayılara yaslar: 1, 2, 2,5 ve 5'in katları.
 * Ham maksimumu kullanmak eksende 13.847 gibi okunmaz sayılar üretir.
 */
export function guzelAdim(hamAdim: number): number {
  if (hamAdim <= 0) return 1;
  const buyukluk = 10 ** Math.floor(Math.log10(hamAdim));
  const kalan = hamAdim / buyukluk;
  const carpan =
    kalan <= 1 ? 1 : kalan <= 2 ? 2 : kalan <= 2.5 ? 2.5 : kalan <= 5 ? 5 : 10;
  return carpan * buyukluk;
}

export type Eksen = { alt: number; ust: number; adim: number };

/**
 * Y ekseni sınırları. SIFIR HER ZAMAN İÇERİDEDİR — kâr eksiye düşebilir ve
 * sıfır çizgisi görünmezse "az kâr" ile "zarar" aynı görünür.
 *
 * ⚠ MARJ GRAFİĞİNDE DE AYNI SEBEPLE GEÇERLİ: %2 marj ile −%3 marj arasındaki
 * fark, sıfır çizgisi olmadan "iki alçak nokta" gibi görünür.
 */
export function eksen(degerler: number[]): Eksen {
  const enBuyuk = Math.max(0, ...degerler);
  const enKucuk = Math.min(0, ...degerler);

  if (enBuyuk === 0 && enKucuk === 0) {
    return { alt: 0, ust: 1, adim: 1 };
  }

  const adim = guzelAdim((enBuyuk - enKucuk) / ARALIK_SAYISI);
  return {
    alt: Math.floor(enKucuk / adim) * adim,
    ust: Math.ceil(enBuyuk / adim) * adim,
    adim,
  };
}

/** Eksen işaretleri — kılavuz çizgilerinin değerleri. */
export function eksenIsaretleri(y: Eksen): number[] {
  const isaretler: number[] = [];
  for (let d = y.alt; d <= y.ust + y.adim / 2; d += y.adim) isaretler.push(d);
  return isaretler;
}

/**
 * Etiket atlama ritmi — sıkışırsa birer atlanır, üst üste binen yazı okunmaz.
 *
 * ⚠ NOKTA RAKAMLARI DA BU RİTMİ KULLANIR. İki ayrı ritim olsaydı bazı
 * noktalarda rakam olur ay adı olmazdı; okuyan hangi aya ait olduğunu
 * bilemezdi.
 */
export function etiketAtlamasi(noktaSayisi: number): number {
  return Math.ceil(noktaSayisi / 12);
}

/**
 * X konumu. Tek noktalı seride payda sıfır olurdu; o durumda nokta ortaya
 * konur — yoksa `NaN` üretir ve SVG sessizce hiçbir şey çizmez.
 */
export function xKonumu(i: number, noktaSayisi: number): number {
  if (noktaSayisi <= 1) return GRAFIK_KUTUSU.sol + IC_GENISLIK / 2;
  return GRAFIK_KUTUSU.sol + i * (IC_GENISLIK / (noktaSayisi - 1));
}

export function yKonumu(deger: number, y: Eksen): number {
  return (
    GRAFIK_KUTUSU.ust + IC_YUKSEKLIK * (1 - (deger - y.alt) / (y.ust - y.alt))
  );
}
