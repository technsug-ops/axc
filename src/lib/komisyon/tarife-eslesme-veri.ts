import { prisma } from "@/lib/prisma";

import { tarifeDizinleriKur, type TarifeDizinleri } from "./tarife-eslesme";

/**
 * Bugünkü katalogdan tarife eşleşme dizinleri (K298). Yükleyici ve tarife
 * ekranları AYNI gövdeyi çağırır — kural `tarife-eslesme.ts`te.
 */
export async function bugunkuTarifeDizinleri(channelAccountId: string): Promise<TarifeDizinleri> {
  const [varyantlar, kanalKodlari] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true },
      select: { id: true, barcode: true, sku: true, companySku: true },
    }),
    prisma.channelSku.findMany({
      where: { isActive: true, variant: { isActive: true } },
      select: { channelSku: true, variantId: true, channelAccountId: true },
    }),
  ]);
  return tarifeDizinleriKur({ varyantlar, kanalKodlari, channelAccountId });
}
