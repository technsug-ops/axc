import { gunEkle, gunDegeri, isTakvimGunu } from "@/lib/donem";
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

export async function gorevSayilariniTopla(): Promise<
  Record<GorevAnahtari, number>
> {
  /**
   * ⚠ "BUGÜN" İŞ TAKVİMİNDEN — çalışma ortamının saat diliminden DEĞİL.
   * Kullanıcı Almanya'da, operasyon Türkiye'de; `Europe/Istanbul` sabit.
   */
  const bugun = gunDegeri(isTakvimGunu(new Date()));
  const yarin = gunEkle(bugun, 1);

  const [
    kargoBekleyen,
    iadeBildirimi,
    malKabulBekleyen,
    karHesaplanamayan,
    oransizKanalSku,
    bugunAlim,
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

    /**
     * BUGÜN GİRİLEN ALIM — `/alimlar?pencere=BUGUN` ile AYNI koşul.
     *
     * ⚠ ALAN SEÇİMİ ÖLÇÜLDÜ: liste `purchasedAt` süzüyor
     * (`liste-suzgeci.ts` → `alimKosulu`). `createdAt` seçilseydi geçmiş
     * tarihli bir alım bugün girildiğinde panel onu sayar, liste
     * göstermezdi — panelin "sayı = liste" sözü bozulurdu.
     *
     * ⚠ BU BİR SAYAÇ, BEKLEYEN İŞ DEĞİL: durum süzgeci YOK, çünkü soru
     * "kaç alım bekliyor" değil "bugün kaç alım girildi".
     */
    prisma.purchase.count({
      where: { purchasedAt: { gte: bugun, lt: yarin } },
    }),
  ]);

  return {
    kargoBekleyen,
    iadeBildirimi,
    malKabulBekleyen,
    karHesaplanamayan,
    oransizKanalSku,
    bugunAlim,
  };
}
