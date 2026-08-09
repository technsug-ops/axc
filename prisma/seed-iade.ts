/**
 * ============================================================================
 *  İADE SABİT VERİSİ (SEED)
 * ----------------------------------------------------------------------------
 *  1. Kanal iade politikası: itirazlı iadede yeniden gönderim kargosunu
 *     satıcı öder mi? (Trendyol hayır · Hepsiburada evet)
 *  2. Ceza tarifeleri — sipariş tutarı kademesine göre ÖNERİ üretir.
 *
 *  Ceza tutarı her zaman ELLE girilir; tarife yalnızca öneri içindir.
 *  Kademesi olmayan tutarda (ör. Hepsiburada'da 6.000 TL üstü) öneri
 *  çıkmaz ve ekran "elle girin" der.
 * ============================================================================
 */

import { PrismaClient } from "../src/generated/prisma/client";

/** Bu tutara KADAR olan siparişler bu kademeye girer. */
const CEZA_TARIFELERI: Record<string, { upTo: number; amount: number }[]> = {
  // ≤149 → 50 · 150-499 → 100 · 500-999 → 150
  // 1.000-2.999 → 250 · 3.000-9.999 → 500 · ≥10.000 → 1.000
  TRENDYOL: [
    { upTo: 149, amount: 50 },
    { upTo: 499, amount: 100 },
    { upTo: 999, amount: 150 },
    { upTo: 2999, amount: 250 },
    { upTo: 9999, amount: 500 },
    // Üst kademe: sınırsız. Çok büyük bir eşikle temsil ediliyor.
    { upTo: 99999999, amount: 1000 },
  ],

  // ≤50 → 10 · 50,01-200 → 20 · 200,01-1.000 → 50 · 1.000,01-6.000 → 150
  // 6.000 ÜSTÜ: pazaryeri "değişen oran" diyor — TARİFE YOK, öneri çıkmaz.
  HEPSIBURADA: [
    { upTo: 50, amount: 10 },
    { upTo: 200, amount: 20 },
    { upTo: 1000, amount: 50 },
    { upTo: 6000, amount: 150 },
  ],
};

/** İtirazlı iadede yeniden gönderim kargosunu satıcı öder mi? */
const ITIRAZ_KARGO_SATICIDA: Record<string, boolean> = {
  TRENDYOL: false,
  HEPSIBURADA: true,
};

export async function iadeSeed(prisma: PrismaClient) {
  console.log("\n=== İADE SEED ===\n");

  const kanallar = new Map(
    (await prisma.channel.findMany({ select: { id: true, code: true } })).map(
      (c) => [c.code, c.id],
    ),
  );

  // ---- 1. Kanal iade politikası ----
  for (const [kod, saticiOder] of Object.entries(ITIRAZ_KARGO_SATICIDA)) {
    const id = kanallar.get(kod);
    if (!id) continue;
    await prisma.channel.update({
      where: { id },
      data: { disputedReshipPaidBySeller: saticiOder },
    });
    console.log(
      `${kod.padEnd(14)} itirazlı iade yeniden gönderim: ${saticiOder ? "SATICI öder" : "satıcı ödemez"}`,
    );
  }

  // ---- 2. Ceza tarifeleri ----
  const yururluk = new Date("2026-01-01");
  let yazilan = 0;

  for (const [kod, kademeler] of Object.entries(CEZA_TARIFELERI)) {
    const channelId = kanallar.get(kod);
    if (!channelId) {
      console.log(`  UYARI: ${kod} kanalı yok, ceza tarifesi atlandı`);
      continue;
    }
    for (const kademe of kademeler) {
      await prisma.penaltyTariff.upsert({
        where: {
          channelId_orderAmountUpTo_effectiveFrom: {
            channelId,
            orderAmountUpTo: String(kademe.upTo),
            effectiveFrom: yururluk,
          },
        },
        update: {},
        create: {
          channelId,
          orderAmountUpTo: String(kademe.upTo),
          amount: String(kademe.amount),
          effectiveFrom: yururluk,
        },
      });
      yazilan++;
    }
    console.log(`${kod.padEnd(14)} ceza kademesi: ${kademeler.length}`);
  }

  console.log(`\nToplam ceza kademesi: ${await prisma.penaltyTariff.count()}`);
  void yazilan;
}
