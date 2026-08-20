import { AYRILMIS_SAYILAN_DURUMLAR } from "@/lib/iade/bildirim";
import { suzgecToplami } from "@/lib/liste-toplami";
import { kalemToplamlari, type ParaToplami } from "@/lib/tutar";
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
 * DÖNEM İÇİNDE GİRİLEN ALIM — panelin "Seçili dönem" kartı için.
 *
 * ⚠ NİYE GÖREV KUTUSUNDA DEĞİL: kullanıcı bu sayıyı "günlük bir emek" diye
 * istedi ve önce görev kutusuna kondu. Orada YANLIŞ YERDEYDİ — görev
 * kutuları YAPILMAMIŞ işi sayar, bu ise YAPILMIŞ işin adedi. Kullanıcı
 * kararı 21.08.2026 ile dönem kartına taşındı: orada kardeşleriyle aynı
 * dönemi paylaşıyor ve kıyas rozeti alabiliyor.
 *
 * ⚠ ALAN SEÇİMİ ÖLÇÜLDÜ: `purchasedAt` — alım listesi de onu süzüyor
 * (`liste-suzgeci.ts` → `alimKosulu`). `createdAt` seçilseydi geçmiş
 * tarihli bir alım bugün girildiğinde panel sayar, liste göstermezdi.
 *
 * ── ⚠ TUTAR KENDİ FORMÜLÜYLE HESAPLANMAZ ─────────────────────────────────
 * Alım listesindeki toplam kutusu `kalemToplamlari` + `suzgecToplami`
 * kullanıyor. Panel ayrı bir formül yazsaydı iki ekran aynı dönem için
 * FARKLI toplam gösterir ve hangisinin doğru olduğu tartışılırdı. Aynı
 * yardımcılar burada da çağrılıyor.
 *
 * ⚠ İPTALLER: adet TÜM kayıtları sayar (listede iptalli satır da görünür),
 * TUTAR ise iptalliyi DIŞARIDA bırakır — iptal edilmiş alım gerçekleşmiş
 * bir alış değildir, matraha yazılamaz. Alım listesi de tam böyle yapıyor;
 * ikisi ayrışmasın diye buraya da aynısı yazıldı.
 */
export async function donemAlimi(pencere: {
  baslangic: Date;
  bitisHaric: Date;
}): Promise<{ adet: number; toplam: ParaToplami[] }> {
  /**
   * ⚠ YARI AÇIK ARALIK — `[baslangic, bitisHaric)`. `lte: sonGun`
   * yazılsaydı son günün 00:00'ından sonrası dışarıda kalırdı; `Pencere`
   * tipi bu tuzağı önlemek için `bitisHaric` taşıyor.
   */
  const alimlar = await prisma.purchase.findMany({
    where: { purchasedAt: { gte: pencere.baslangic, lt: pencere.bitisHaric } },
    select: {
      status: true,
      items: { select: { quantity: true, unitCostAmount: true, unitCostCurrency: true } },
    },
  });

  const sonuc = suzgecToplami(
    alimlar,
    (a) => kalemToplamlari(a.items),
    (a) => a.status === "CANCELLED",
  );

  return { adet: alimlar.length, toplam: sonuc.toplam };
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
