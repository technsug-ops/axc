import { PrismaClient } from "../src/generated/prisma/client";

/**
 * ============================================================================
 *  STOK DÜZELTME NEDENLERİ (SEED)
 * ----------------------------------------------------------------------------
 *  NEDEN VERİDİR, SABİT KOD DEĞİL: bunlar başlangıç değerleridir. Kullanıcı
 *  ekleyebilir, adını değiştirebilir, pasife alabilir. SaaS'ta her müşteri
 *  kendi fire nedenlerini tanımlayacak.
 *
 *  İKİ HAREKET TİPİ AYRI TUTULUYOR:
 *    ADJUSTMENT       — gerçek kayıp (kırıldı, kayboldu, bozuldu)
 *    COUNT_CORRECTION — sayım farkı; ölçüm hatası, malın kendisi kaybolmadı
 *  Raporda ayrı satırlarda görünürler: "fire" ile "sayım tutmadı" aynı şey
 *  değildir ve aynı kefeye konursa ikisi de yanlış okunur.
 *
 *  TEKRAR ÇALIŞTIRILABİLİR: ada göre upsert, var olanı DEĞİŞTİRMEZ —
 *  adını değiştirdiyseniz seed geri almaz.
 * ============================================================================
 */

const NEDENLER = [
  {
    name: "Hasar / kırılma",
    movementType: "ADJUSTMENT" as const,
    requiresNote: false,
    sortOrder: 10,
  },
  {
    name: "Kayıp",
    movementType: "ADJUSTMENT" as const,
    requiresNote: false,
    sortOrder: 20,
  },
  {
    name: "Fire",
    movementType: "ADJUSTMENT" as const,
    requiresNote: false,
    sortOrder: 30,
  },
  {
    name: "Sayım farkı",
    movementType: "COUNT_CORRECTION" as const,
    requiresNote: false,
    sortOrder: 40,
  },
  {
    // AÇIKLAMA ZORUNLU: "Diğer" nedeniyle açıklamasız yazılmış bir kayıt,
    // üç ay sonra cevabı olmayan bir soruya dönüşür.
    name: "Diğer",
    movementType: "ADJUSTMENT" as const,
    requiresNote: true,
    sortOrder: 90,
  },
];

export async function stokDuzeltmeSeed(prisma: PrismaClient) {
  console.log("\n=== STOK DÜZELTME NEDENLERİ ===\n");

  for (const n of NEDENLER) {
    await prisma.stockAdjustmentReason.upsert({
      where: { name: n.name },
      update: {},
      create: n,
    });
  }

  const toplam = await prisma.stockAdjustmentReason.count();
  console.log(`Düzeltme nedeni: ${toplam} kayıt`);
}
