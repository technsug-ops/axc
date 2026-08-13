import type { Currency, ReturnType } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  İADE LİSTESİ — SAF HESAP
 * ----------------------------------------------------------------------------
 *  Veritabanına gitmez. Ekran satırları çeker, toplamı ve kanal kırılımını
 *  buraya sorar. Böylece "iade oranı" gibi tanımı tartışmalı bir metrik
 *  sınanabilir kalır.
 * ============================================================================
 */

export type IadeSatirVerisi = {
  iadeId: string;
  kanalKodu: string;
  kanalAdi: string;
  tur: ReturnType;
  /** İade edilen toplam adet. */
  adet: number;
  /** Bunun kaçı sağlam döndü (stoğa girdi). */
  saglamAdet: number;
  /** Bunun kaçı hasarlı (stoğa girmedi, maliyeti üstte kaldı). */
  hasarliAdet: number;
  /** Hasarlıdan tazminat talebi AÇILMAMIŞ adet. */
  talepsizHasarAdet: number;
  net1: number | null;
  net2: number | null;
  ceza: number;
  /** Stoğa DÖNEN malın maliyeti (MALIYET_GERI satırı). */
  donenMaliyet: number;
  /** Stoğa DÖNMEYEN malın maliyeti — görünmeyen gider. */
  donmeyenMaliyet: number;
  kayipGelir: number;
  paraBirimi: Currency;
};

export type IadeToplami = {
  paraBirimi: Currency;
  iadeAdedi: number;
  urunAdedi: number;
  kayipGelir: number;
  toplamEtki2: number;
  cezaToplami: number;
  donenMaliyet: number;
  donmeyenMaliyet: number;
  talepsizHasarAdet: number;
};

/** Para birimi başına dönem toplamı — TRY ve EUR ASLA toplanmaz. */
export function iadeToplamlari(satirlar: IadeSatirVerisi[]): IadeToplami[] {
  const gruplar = new Map<Currency, IadeToplami>();

  for (const s of satirlar) {
    const g = gruplar.get(s.paraBirimi) ?? {
      paraBirimi: s.paraBirimi,
      iadeAdedi: 0,
      urunAdedi: 0,
      kayipGelir: 0,
      toplamEtki2: 0,
      cezaToplami: 0,
      donenMaliyet: 0,
      donmeyenMaliyet: 0,
      talepsizHasarAdet: 0,
    };

    g.iadeAdedi += 1;
    g.urunAdedi += s.adet;
    g.kayipGelir += s.kayipGelir;
    g.toplamEtki2 += s.net2 ?? 0;
    g.cezaToplami += s.ceza;
    g.donenMaliyet += s.donenMaliyet;
    g.donmeyenMaliyet += s.donmeyenMaliyet;
    g.talepsizHasarAdet += s.talepsizHasarAdet;

    gruplar.set(s.paraBirimi, g);
  }

  return [...gruplar.values()].sort((a, b) =>
    a.paraBirimi.localeCompare(b.paraBirimi),
  );
}

export type KanalKirilimi = {
  kanalKodu: string;
  kanalAdi: string;
  iadeAdedi: number;
  /** Aynı dönemde o kanalda kaç satış oldu — oranın paydası. */
  satisAdedi: number;
  /**
   * DÖNEM ORANI: dönemde gelen iade / dönemde yapılan satış.
   * Pay ve payda FARKLI kohortlara ait olabilir; bu oran operasyon ve nakit
   * yükünü ölçer, ürün kalitesini DEĞİL. Satış yoksa null (0'a bölme değil,
   * "ölçülemez" — sıfır göstermek yanlış bilgi olurdu).
   */
  oran: number | null;
  toplamEtki2: number;
  cezaToplami: number;
  /** Ortalama iade maliyeti — iade başına NET-2 etkisi. */
  ortalamaEtki: number | null;
  paraBirimi: Currency;
};

/**
 * Kanal bazında iade kırılımı.
 *
 * @param satisAdetleri Kanal kodu → aynı dönemdeki satış adedi.
 */
export function kanalKirilimi(
  satirlar: IadeSatirVerisi[],
  satisAdetleri: Map<string, number>,
): KanalKirilimi[] {
  const gruplar = new Map<string, KanalKirilimi>();

  for (const s of satirlar) {
    const g = gruplar.get(s.kanalKodu) ?? {
      kanalKodu: s.kanalKodu,
      kanalAdi: s.kanalAdi,
      iadeAdedi: 0,
      satisAdedi: satisAdetleri.get(s.kanalKodu) ?? 0,
      oran: null,
      toplamEtki2: 0,
      cezaToplami: 0,
      ortalamaEtki: null,
      paraBirimi: s.paraBirimi,
    };

    g.iadeAdedi += 1;
    g.toplamEtki2 += s.net2 ?? 0;
    g.cezaToplami += s.ceza;

    gruplar.set(s.kanalKodu, g);
  }

  for (const g of gruplar.values()) {
    g.oran = g.satisAdedi > 0 ? g.iadeAdedi / g.satisAdedi : null;
    g.ortalamaEtki = g.iadeAdedi > 0 ? g.toplamEtki2 / g.iadeAdedi : null;
  }

  // En çok iade yiyen kanal üstte — bakılacak yer ilk sırada olsun.
  return [...gruplar.values()].sort((a, b) => b.iadeAdedi - a.iadeAdedi);
}

export type UrunKirilimi = {
  variantId: string;
  sku: string;
  ad: string;
  iadeAdedi: number;
  hasarliAdet: number;
};

/**
 * EN ÇOK İADE EDİLEN ÜRÜNLER.
 *
 * Arbitrajda tek bir sorunlu ürün ayın kârını yiyebilir; bunu erken görmek
 * doğrudan paradır. Hasarlı adet ayrı sayılır: çok iade edilen ama sağlam
 * dönen ürün (beden/renk sorunu) ile hasarlı dönen ürün (kalite sorunu)
 * AYRI sorunlardır ve ayrı çözümleri vardır.
 */
export function urunKirilimi(
  kalemler: {
    variantId: string;
    sku: string;
    ad: string;
    adet: number;
    hasarliAdet: number;
  }[],
  kacTane = 5,
): UrunKirilimi[] {
  const gruplar = new Map<string, UrunKirilimi>();

  for (const k of kalemler) {
    const g = gruplar.get(k.variantId) ?? {
      variantId: k.variantId,
      sku: k.sku,
      ad: k.ad,
      iadeAdedi: 0,
      hasarliAdet: 0,
    };
    g.iadeAdedi += k.adet;
    g.hasarliAdet += k.hasarliAdet;
    gruplar.set(k.variantId, g);
  }

  return [...gruplar.values()]
    .sort((a, b) => b.iadeAdedi - a.iadeAdedi || b.hasarliAdet - a.hasarliAdet)
    .slice(0, kacTane);
}
