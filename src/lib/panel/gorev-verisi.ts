import { AYRILMIS_SAYILAN_DURUMLAR } from "@/lib/iade/bildirim";
import { prisma } from "@/lib/prisma";

import type { GorevAnahtari } from "./bugun-ne-yapmaliyim";

/**
 * ============================================================================
 *  "BUGÜN NE YAPMALIYIM" — SAYILAR
 * ----------------------------------------------------------------------------
 *  Her sayı, tıklanınca açılan SÜZÜLÜ LİSTENİN kaydı ile BİREBİR tutmalı.
 *  Tutmazsa kullanıcı "panel yalan söylüyor" der ve haklı olur — bu yüzden
 *  koşullar buradaki tek yerden geliyor ve `panel:dogrula` her birini
 *  hedef ekranın koşuluyla karşılaştırıyor.
 *
 *  DÖNEM SÜZGECİ UYGULANMAZ. "Kargoya verilmemiş sipariş" dünkü de olsa
 *  bugünün işidir; döneme bağlansaydı dönem daraldığında iş listesi
 *  sessizce kısalırdı.
 * ============================================================================
 */

/**
 * DÖNEM İÇİNDE GİRİLEN ALIM SAYISI — panelin "Seçili dönem" kartı için.
 *
 * ⚠ NİYE GÖREV KUTUSUNDA DEĞİL: kullanıcı isteği 20.08'de bu sayıyı "günlük
 * bir emek" diye istedi ve önce görev kutusuna kondu. Orada YANLIŞ
 * YERDEYDİ — görev kutuları YAPILMAMIŞ işi sayar, bu ise YAPILMIŞ işin
 * adedi; bekleyen rozetine karışıyordu. Kullanıcı kararı 21.08.2026 ile
 * dönem kartına taşındı: orada beş kardeşiyle aynı dönemi paylaşıyor,
 * kıyas rozeti alabiliyor ve süzgeç değişince onlarla birlikte değişiyor.
 *
 * ⚠ ALAN SEÇİMİ ÖLÇÜLDÜ: `purchasedAt` — alım listesi de onu süzüyor
 * (`liste-suzgeci.ts` → `alimKosulu`). `createdAt` seçilseydi geçmiş
 * tarihli bir alım bugün girildiğinde panel sayar, liste göstermezdi;
 * panelin "sayı = liste" sözü bozulurdu.
 */
export async function donemAlimAdedi(pencere: {
  baslangic: Date;
  bitisHaric: Date;
}): Promise<number> {
  /**
   * ⚠ YARI AÇIK ARALIK — `[baslangic, bitisHaric)`. `lte: sonGun`
   * yazılsaydı son günün 00:00'ından sonrası dışarıda kalırdı; `Pencere`
   * tipi bu tuzağı önlemek için `bitisHaric` taşıyor ve liste süzgeci de
   * `{ gte, lt }` kullanıyor. İki taraf aynı aralığı görmeli.
   */
  return prisma.purchase.count({
    where: { purchasedAt: { gte: pencere.baslangic, lt: pencere.bitisHaric } },
  });
}

export async function gorevSayilariniTopla(): Promise<
  Record<GorevAnahtari, number>
> {
  const [
    kargoBekleyen,
    iadeBildirimi,
    malKabulBekleyen,
    karHesaplanamayan,
    oransizKanalSku,
  ] = await Promise.all([
    // `/satislar?kargo=bekleyen` ile aynı koşul.
    prisma.sale.count({ where: { shippedAt: null, iptalTarihi: null } }),

    /**
     * Açık bildirim = mal yolda ya da karar bekleyen. Kapanmış/iptal olan
     * sayılmaz; `AYRILMIS_SAYILAN_DURUMLAR` bunun tek kaynağı ve iade
     * ekranındaki "bekleyen" rozetiyle AYNI listeyi kullanıyor.
     */
    prisma.returnNotice.count({
      where: { status: { in: AYRILMIS_SAYILAN_DURUMLAR } },
    }),

    /**
     * `/alimlar?durum=ORDERED` — kısmi gelenler DE bekliyor sayılır:
     * kalemlerin bir kısmı geldiyse iş bitmemiştir. Şemadaki ad
     * `PARTIALLY_RECEIVED` (sözleşmede "PARTIAL" diye kısaltılmıştı).
     */
    prisma.purchase.count({
      where: { status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } },
    }),

    // `/satislar?kar=eksik` ile aynı koşul: hesaplanmamış ya da eksik.
    prisma.sale.count({
      where: {
        // İptal edilen satışın kârı hesaplanmaz; görev listesine girmemeli.
        iptalTarihi: null,
        OR: [{ profitStatus: null }, { NOT: { profitStatus: "CALCULATED" } }],
      },
    }),

    // `/kanal-sku?eksik=1` — yalnız SATIŞ hesaplarının oranı anlamlı.
    prisma.channelSku.count({
      where: { commissionRate: null, channelAccount: { satisIcin: true } },
    }),

  ]);

  return {
    kargoBekleyen,
    iadeBildirimi,
    malKabulBekleyen,
    karHesaplanamayan,
    oransizKanalSku,
  };
}
