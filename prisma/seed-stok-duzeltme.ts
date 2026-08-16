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
  // ----------------------------- EKSİ YÖN ---------------------------------
  {
    name: "Hasar / kırılma",
    movementType: "ADJUSTMENT" as const,
    yon: "EKSI" as const,
    requiresNote: false,
    sortOrder: 10,
  },
  {
    name: "Kayıp",
    movementType: "ADJUSTMENT" as const,
    yon: "EKSI" as const,
    requiresNote: false,
    sortOrder: 20,
  },
  {
    name: "Fire",
    movementType: "ADJUSTMENT" as const,
    yon: "EKSI" as const,
    requiresNote: false,
    sortOrder: 30,
  },

  // ----------------------------- ARTI YÖN ---------------------------------
  /**
   * MAL YOKTAN BELİRMEZ — HER GİRİŞİN BİR HİKÂYESİ VARDIR.
   *
   * 16.08.2026 kullanıcı sorusu: "artıda neden girmek sağlıklı mı?" Evet,
   * hatta eksiden daha önemli: hayalet envanter ve sahte kâr sisteme tam
   * bu kapıdan girer. Sebebi yazılmayan bir giriş, üç ay sonra cevabı
   * olmayan bir soruya dönüşür.
   *
   * Bunlar ALIM DEĞİLDİR — alımın kendi akışı var ve fiyatı zorunlu.
   * Buradakiler alım dışı, parasız ya da telafi girişleridir.
   */
  {
    /** "Kayıp" yazılmış mal sonradan bulundu — o kaydın karşılığı. */
    name: "Kayıp mal bulundu",
    movementType: "ADJUSTMENT" as const,
    yon: "ARTI" as const,
    requiresNote: false,
    sortOrder: 50,
  },
  {
    /** Tedarikçi sipariş edilenden fazla gönderdi; fatura edilmedi. */
    name: "Tedarikçi fazla gönderdi",
    movementType: "ADJUSTMENT" as const,
    yon: "ARTI" as const,
    requiresNote: false,
    sortOrder: 60,
  },
  {
    /** Numune, hediye, promosyon — bedelsiz giriş. */
    name: "Numune / hediye giriş",
    movementType: "ADJUSTMENT" as const,
    yon: "ARTI" as const,
    requiresNote: false,
    sortOrder: 70,
  },
  {
    /**
     * Yanlış varyanta yazılmış stok buraya aktarılıyor. AÇIKLAMA ZORUNLU:
     * karşı tarafta eksi bir düzeltme olmalı ve hangisi olduğu yazılmazsa
     * çift bulunamaz.
     */
    name: "Yanlış varyanttan aktarıldı",
    movementType: "ADJUSTMENT" as const,
    yon: "ARTI" as const,
    requiresNote: true,
    sortOrder: 80,
  },

  // --------------------------- HER İKİ YÖN --------------------------------
  {
    /** Sayım farkı iki yönde de olur: eksik de çıkar, fazla da. */
    name: "Sayım farkı",
    movementType: "COUNT_CORRECTION" as const,
    yon: "HER_IKISI" as const,
    requiresNote: false,
    sortOrder: 40,
  },
  {
    // AÇIKLAMA ZORUNLU: "Diğer" nedeniyle açıklamasız yazılmış bir kayıt,
    // üç ay sonra cevabı olmayan bir soruya dönüşür.
    name: "Diğer",
    movementType: "ADJUSTMENT" as const,
    yon: "HER_IKISI" as const,
    requiresNote: true,
    sortOrder: 90,
  },
];

export async function stokDuzeltmeSeed(prisma: PrismaClient) {
  console.log("\n=== STOK DÜZELTME NEDENLERİ ===\n");

  for (const n of NEDENLER) {
    await prisma.stockAdjustmentReason.upsert({
      where: { name: n.name },
      /**
       * YÖN GÜNCELLENİR, GERİSİ DOKUNULMAZ.
       *
       * Bu seed başta `update: {}` idi: "kullanıcı adı değiştirdiyse geri
       * alma" gerekçesiyle. Doğru gerekçe, ama yön alanı SONRADAN doğdu ve
       * canlıdaki üç neden `HER_IKISI` varsayılanıyla duruyor. Sadece
       * eklemekle yetinseydik süzgeç hiçbir şeyi süzmezdi — "Fire" artı
       * yönde görünmeye devam ederdi.
       *
       * Yalnız `yon` yazılıyor; ad, açıklama zorunluluğu ve sıra
       * kullanıcıya ait kalıyor.
       */
      update: { yon: n.yon },
      create: n,
    });
  }

  const toplam = await prisma.stockAdjustmentReason.count();
  console.log(`Düzeltme nedeni: ${toplam} kayıt`);
}
