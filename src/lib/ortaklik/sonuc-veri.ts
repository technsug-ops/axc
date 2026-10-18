import { prisma } from "@/lib/prisma";
import { IADE_GECERLI } from "@/lib/iade-geri-alma";
import type { Pencere } from "@/lib/donem";
import { projeSonucu, type SonucSatisi } from "@/lib/ortaklik/sonuc";

/**
 * İNCE KABUK — veritabanından okur, `projeSonucu`nu çağırır. Kural burada YAZILMAZ.
 *
 * Küme: pencerede SATILMIŞ (`soldAt`), iptal edilmemiş ve en az bir kalemi projeye
 * işaretli bir alım partisinden çıkmış satışlar. İade satışın gününe yazılır (K185-③).
 * Kaldırılmış kalem (`kaldirildiAt`) hiçbir ciro/NET hesabına girmez.
 */
export async function projeSonucuGetir(proje: { id: string; currency: string }, pencere: Pencere) {
  const projeKaynakli = { sourceMovement: { purchaseItem: { ortaklikProjesiId: proje.id } } };
  const satislar = await prisma.sale.findMany({
    where: {
      soldAt: { gte: pencere.baslangic, lt: pencere.bitisHaric },
      iptalTarihi: null,
      items: { some: { kaldirildiAt: null, stockMovements: { some: projeKaynakli } } },
    },
    select: {
      id: true,
      code: true,
      soldAt: true,
      profitCurrency: true,
      profitStatus: true,
      net1Amount: true,
      net2Amount: true,
      channelAccount: { select: { name: true, channel: { select: { name: true } } } },
      items: {
        where: { kaldirildiAt: null },
        select: {
          quantity: true,
          unitPriceAmount: true,
          net1Amount: true,
          net2Amount: true,
          stockMovements: {
            orderBy: { createdAt: "asc" },
            select: {
              quantityDelta: true,
              unitCostAmount: true,
              sourceMovement: { select: { purchaseItem: { select: { ortaklikProjesiId: true } } } },
            },
          },
        },
      },
      returns: { where: IADE_GECERLI, select: { net1Amount: true, net2Amount: true, profitStatus: true } },
    },
  });

  const girdi: SonucSatisi[] = satislar.map((s) => ({
    id: s.id,
    kod: s.code,
    tarih: s.soldAt,
    kanal: `${s.channelAccount.channel.name} — ${s.channelAccount.name}`,
    paraBirimi: s.profitCurrency,
    karHesaplandi: s.profitStatus === "CALCULATED",
    net1: s.net1Amount === null ? null : Number(s.net1Amount),
    net2: s.net2Amount === null ? null : Number(s.net2Amount),
    kalemler: s.items.map((k) => ({
      adet: k.quantity,
      birimFiyat: Number(k.unitPriceAmount),
      net1: k.net1Amount === null ? null : Number(k.net1Amount),
      net2: k.net2Amount === null ? null : Number(k.net2Amount),
      hareketler: k.stockMovements.map((h) => ({
        quantityDelta: h.quantityDelta,
        birimMaliyet: h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
        kaynakProjeId: h.sourceMovement?.purchaseItem?.ortaklikProjesiId ?? null,
      })),
    })),
    iadeler: s.returns.map((r) => ({
      net1: r.net1Amount === null ? null : Number(r.net1Amount),
      net2: r.net2Amount === null ? null : Number(r.net2Amount),
      hesaplandi: r.profitStatus === "CALCULATED",
    })),
  }));

  return projeSonucu(proje.id, proje.currency, girdi);
}
