import { prisma } from "@/lib/prisma";

import { tarifeDizinleriKur, tarifeKodunuCoz, varyantKalemleriniSec, type TarifeDizinleri } from "./tarife-eslesme";

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

/**
 * BİR VARYANTIN BİR TARİFEDEKİ DİLİMLERİ (K298-②) — fiyat denemesi zemini ve
 * satış kaydının oranı BURADAN okur. Seçim `varyantKalemleriniSec` kuralıyla:
 * bağlı satır önce, yoksa bağsız satır bugünkü katalogla çözülür. YAZMAZ.
 *
 * `onbellek`: aynı istekte aynı hesabın dizini bir kez kurulur (birden çok
 * pencere denenirken tekrar tekrar bütün kataloğu okumamak için).
 */
export async function varyantinTarifeKalemleri(
  tarifeId: string,
  channelAccountId: string,
  variantId: string,
  onbellek: Map<string, TarifeDizinleri> = new Map(),
) {
  const adaylar = await prisma.komisyonTarifeKalemi.findMany({
    where: { tarifeId, OR: [{ variantId }, { variantId: null }] },
    orderBy: { dilimSirasi: "asc" },
    select: { barkod: true, variantId: true, dilimSirasi: true, altLimit: true, ustLimit: true, oran: true },
  });
  const bagsizVar = adaylar.some((k) => k.variantId === null) && !adaylar.some((k) => k.variantId === variantId);
  let dizin: TarifeDizinleri | null = null;
  if (bagsizVar) {
    dizin = onbellek.get(channelAccountId) ?? (await bugunkuTarifeDizinleri(channelAccountId));
    onbellek.set(channelAccountId, dizin);
  }
  return varyantKalemleriniSec(adaylar, variantId, (kod) => (dizin ? tarifeKodunuCoz(kod, dizin) : null));
}
