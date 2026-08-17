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

/**
 * Satır verisini üretmek için gereken EN AZ alan kümesi.
 *
 * Yapısal tip: hem sayfalanmış liste sorgusu (ürün adı, kullanıcı gibi
 * ekranın ihtiyaç duyduğu fazlalıklarla) hem de özet için atılan DAR sorgu
 * bu tipe uyar. Fazla alan taşımak sorun değil, eksik alan derlemede yakalanır.
 */
export type IadeHesapGirdisi = {
  id: string;
  returnType: ReturnType;
  net1Amount: { toString(): string } | null;
  net2Amount: { toString(): string } | null;
  penaltyAmount: { toString(): string } | null;
  profitCurrency: Currency | null;
  sale: { channelAccount: { channel: { code: string; name: string } } };
  fees: { code: string; amount: { toString(): string } }[];
  items: {
    quantity: number;
    soundQuantity: number;
    damagedQuantity: number;
    compensations: { quantity: number }[];
  }[];
};

/**
 * ⚠ NEDEN SAF KATMANA TAŞINDI (17.08.2026)
 *
 * Bu dönüşüm ekranın içinde, sayfalanmış listenin `map`'i olarak duruyordu ve
 * "Dönem özeti" kartları ondan besleniyordu. Yani özet aslında GÖRÜNEN SAYFANIN
 * toplamıydı: sayfa boyutu 50, 51'inci iadede kart sessizce yanlış rakam
 * gösterirdi ve başlığında "Dönem özeti" yazdığı için yanlışlığı belli olmazdı.
 *
 * Dönüşüm burada durunca özet, süzgecin TAMAMINDAN aynı kuralla hesaplanabiliyor
 * (Kullanıcı Kolaylığı #15: sayfalama varsa toplam görünen sayfanın değil,
 * süzgecin tamamının toplamıdır).
 */
export function iadeSatirVerisi(
  i: IadeHesapGirdisi,
  /** Hasarlıdan tazminat talebi açılmamış adet — kural `lib/tazminat.ts`de. */
  kalanTalepEdilebilir: (hasarli: number, talepler: number[]) => number,
): IadeSatirVerisi {
  const sayi = (d: { toString(): string } | null) =>
    d === null ? null : Number(d.toString());

  const satirTutari = (kod: string) =>
    i.fees
      .filter((f) => f.code === kod)
      .reduce((t, f) => t + Number(f.amount.toString()), 0);

  /**
   * MALİYET İKİ SATIRDAN OKUNUR, TÜRETİLMEZ (14.08.2026 düzeltmesi).
   * `MALIYET_GERI` iade edilen adedin TAMAMININ maliyeti, `MALIYET_DONMEYEN`
   * hasarlıya düşen NEGATİF pay; toplamları gerçekten stoğa dönen maliyettir.
   */
  const donmeyen = satirTutari("MALIYET_DONMEYEN");

  return {
    iadeId: i.id,
    kanalKodu: i.sale.channelAccount.channel.code,
    kanalAdi: i.sale.channelAccount.channel.name,
    tur: i.returnType,
    adet: i.items.reduce((t, k) => t + k.quantity, 0),
    saglamAdet: i.items.reduce((t, k) => t + k.soundQuantity, 0),
    hasarliAdet: i.items.reduce((t, k) => t + k.damagedQuantity, 0),
    talepsizHasarAdet: i.items.reduce(
      (t, k) =>
        t +
        kalanTalepEdilebilir(
          k.damagedQuantity,
          k.compensations.map((c) => c.quantity),
        ),
      0,
    ),
    net1: sayi(i.net1Amount),
    net2: sayi(i.net2Amount),
    ceza: sayi(i.penaltyAmount) ?? 0,
    donenMaliyet: satirTutari("MALIYET_GERI") + donmeyen,
    /** Satır negatif tutulur (nete öyle giriyor); kutuda pozitif gösterilir. */
    donmeyenMaliyet: Math.abs(donmeyen),
    kayipGelir: Math.abs(satirTutari("KAYIP_GELIR")),
    paraBirimi: i.profitCurrency ?? "TRY",
  };
}

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
