import type { Currency } from "@/generated/prisma/enums";
import type { PanelIadesi, PanelSatisi } from "@/lib/panel";

/**
 * ============================================================================
 *  PANEL SATIR DÖNÜŞTÜRMELERİ (K332, 11.10.2026)
 * ----------------------------------------------------------------------------
 *  Veritabanı satırı → panel satırı. Eskiden `page.tsx` içinde tek yerde
 *  duruyordu; panel artık İKİ okuma yapıyor (üst kısım: seçili dönem · 12 aylık
 *  grafik: arkadan dolan bölüm) ve ikisi AYNI dönüştürmeden geçer — iki yerde
 *  iki ayrı ciro/KDV hesabı doğmasın («iki yerde iki ölçüt olmaz»).
 *  Gövdeler eskisinin birebir kopyası; yalnız fonksiyona çıkarıldı.
 * ============================================================================
 */

type Ondalik = { toString(): string };
type KanalHesabi = { id: string; name: string; channel: { code: string; name: string } };

export type PanelSatisGirdisi = {
  soldAt: Date;
  net1Amount: Ondalik | null;
  net2Amount: Ondalik | null;
  profitCurrency: Currency | null;
  profitStatus: PanelSatisi["durum"];
  channelAccount: KanalHesabi;
  items: readonly {
    quantity: number;
    unitPriceAmount: Ondalik;
    unitPriceCurrency: Currency;
    vatRate: Ondalik | null;
  }[];
};

export type PanelIadeGirdisi = {
  net1Amount: Ondalik | null;
  net2Amount: Ondalik | null;
  profitCurrency: Currency | null;
  profitStatus: PanelIadesi["durum"];
  fees: readonly { code: string; amount: Ondalik }[];
  sale: { soldAt: Date; channelAccount: KanalHesabi };
};

export function panelSatisiKur(satis: PanelSatisGirdisi): PanelSatisi {
  // Satışın para birimi: kâr snapshot'ındaki birim, yoksa ilk kalemin.
  // (Rapor ekranıyla birebir aynı kural — iki ekran farklı ciro göstermesin.)
  const paraBirimi: Currency =
    satis.profitCurrency ?? satis.items[0]?.unitPriceCurrency ?? "TRY";

  const gelir = satis.items
    .filter((k) => k.unitPriceCurrency === paraBirimi)
    .reduce(
      (t2, k) => t2 + Number(k.unitPriceAmount.toString()) * k.quantity,
      0,
    );

  /**
   * ⚠ KDV KALEM KALEM — tek oranla çarpılmaz. Bir siparişte %20 kulaklık
   * ile %1 kitap birlikte olabilir; sipariş toplamına tek oran uygulamak
   * ikisini de yanlış hesaplardı.
   * ⚠ TUTAR KDV DAHİL: kdv = satır − satır/(1+oran).
   */
  const kdv = satis.items
    .filter((k) => k.unitPriceCurrency === paraBirimi)
    .reduce((t, k) => {
      const satir = Number(k.unitPriceAmount.toString()) * k.quantity;
      const oran = k.vatRate === null ? 0 : Number(k.vatRate.toString());
      return t + (oran === 0 ? 0 : satir - satir / (1 + oran / 100));
    }, 0);

  return {
    kanalKodu: satis.channelAccount.channel.code,
    kanalAdi: satis.channelAccount.channel.name,
    hesapId: satis.channelAccount.id,
    hesapAdi: satis.channelAccount.name,
    tarih: satis.soldAt,
    paraBirimi,
    gelir,
    kdv,
    net1:
      satis.net1Amount === null ? null : Number(satis.net1Amount.toString()),
    net2:
      satis.net2Amount === null ? null : Number(satis.net2Amount.toString()),
    durum: satis.profitStatus,
  };
}

export function panelIadesiKur(iade: PanelIadeGirdisi): PanelIadesi {
  return {
    kanalKodu: iade.sale.channelAccount.channel.code,
    kanalAdi: iade.sale.channelAccount.channel.name,
    hesapId: iade.sale.channelAccount.id,
    hesapAdi: iade.sale.channelAccount.name,
    /**
     * ⛔ ATIF SATIŞIN GÜNÜNE — iadenin kendi gününe DEĞİL (K185-③).
     * İadenin kendi tarihi kaybolmuyor: `/iadeler` listesi onu gösteriyor,
     * çünkü orada sorulan şey "bu iade ne zaman oldu"dur. Burada sorulan
     * ise "bu iade hangi ayın cirosunu düşürür" — ve cevabı satışın ayıdır.
     */
    tarih: iade.sale.soldAt,
    // Rapor ekranıyla aynı kural: iadenin para birimi kâr snapshot'ından.
    paraBirimi: iade.profitCurrency ?? "TRY",
    net1: iade.net1Amount === null ? null : Number(iade.net1Amount.toString()),
    net2: iade.net2Amount === null ? null : Number(iade.net2Amount.toString()),
    durum: iade.profitStatus,
    // Mutlak değer: satır defterde negatif duruyor (gider işareti), ekranda
    // "−X iade" diye zaten eksiyle yazılıyor. İki kez eksiye düşmesin.
    iadeTutari: Math.abs(
      iade.fees
        .filter((f) => f.code === "KAYIP_GELIR")
        .reduce((t2, f) => t2 + Number(f.amount.toString()), 0),
    ),
  };
}

export type Pencere = { baslangic: Date; bitisHaric: Date };

/** Kova payı: en geniş operasyon kovası bir aydır (≤ 31 gün). */
export const UST_OKUMA_PAYI_MS = 31 * 24 * 60 * 60 * 1000;

/**
 * ÜST KISMIN OKUMA ARALIĞI (K332) — dönem ve kıyas pencerelerini kapsar, iki
 * yanda bir kova (31 gün) pay bırakır, ama 12 aylık VERİ aralığını AŞAMAZ.
 * Gerekçe `page.tsx`teki çağrının üstünde. Saf: bekçi değerini sınar.
 */
export function ustOkumaPenceresi(
  veri: Pencere,
  pencereler: readonly (Pencere | null | undefined)[],
): Pencere {
  const dolu = pencereler.filter((p): p is Pencere => p != null);
  if (dolu.length === 0) return veri;
  const enErken = Math.min(...dolu.map((p) => p.baslangic.getTime()));
  const enGec = Math.max(...dolu.map((p) => p.bitisHaric.getTime()));
  return {
    baslangic: new Date(Math.max(veri.baslangic.getTime(), enErken - UST_OKUMA_PAYI_MS)),
    bitisHaric: new Date(Math.min(veri.bitisHaric.getTime(), enGec + UST_OKUMA_PAYI_MS)),
  };
}
