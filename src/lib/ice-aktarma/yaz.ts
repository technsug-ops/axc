import { prisma } from "@/lib/prisma";

import type { YazimPlani } from "./dogrula";

/**
 * ============================================================================
 *  PLANI YAZ — TEK TRANSACTION, YA HEPSİ YA HİÇİ
 * ----------------------------------------------------------------------------
 *  Buraya yalnızca HATASIZ bir plan gelir; doğrulayıcı hata bulduysa planı
 *  zaten boşaltmıştır. Yine de yazımın kendisi tek transaction'dadır: bir
 *  kalem patlarsa (ör. aynı anda başka bir yerden aynı SKU açıldıysa)
 *  hiçbir satır kalmaz.
 *
 *  İKİ TEKNİK KARAR (kullanıcı onayı 10.08.2026):
 *
 *  1. SÜRE YÜKSELTİLDİ. Prisma'nın varsayılan transaction süresi 5 saniyedir;
 *     birkaç yüz satırlık bir açılış aktarması bunu rahatça aşar ve kullanıcı
 *     sebepsiz bir hata görürdü.
 *
 *  2. KİMLİKLER UYGULAMADA ÜRETİLİR. MySQL'de `createMany` üretilen kimlikleri
 *     geri vermez; ürün -> varyant -> stok hareketi zinciri için kimlikler
 *     ÖNCEDEN gerekli. Satır satır `create` yapmak 1000 satırda 1000 gidiş
 *     dönüş demekti. Kimlikler doğrulama aşamasında üretilip plana yazılır,
 *     burada toplu yazılır. (Kimlik biçimi opaktır; hiçbir kod ayrıştırmaz.)
 * ============================================================================
 */

/** Büyük dosyalar için: 5 sn'lik varsayılan yetmez. */
const ISLEM_SURESI_MS = 120_000;
const BEKLEME_SURESI_MS = 30_000;

export type YazimSonucu = {
  urun: number;
  varyant: number;
  guncellenenVaryant: number;
  hareket: number;
  adet: number;
  kanalSku: number;
  guncellenenKanalSku: number;
};

export async function planiYaz(plan: YazimPlani): Promise<YazimSonucu> {
  return prisma.$transaction(
    async (tx) => {
      // --- 1) ÜRÜNLER ---
      if (plan.yeniUrunler.length) {
        await tx.product.createMany({
          data: plan.yeniUrunler.map((u) => ({
            id: u.id,
            name: u.ad,
            brand: u.marka,
            categoryId: u.kategoriId,
            desi: u.desi === null ? null : String(u.desi),
            hasVariants: u.cokVaryantli,
          })),
        });
      }

      // --- 2) VARYANTLAR ---
      if (plan.yeniVaryantlar.length) {
        await tx.productVariant.createMany({
          data: plan.yeniVaryantlar.map((v) => ({
            id: v.id,
            productId: v.urunId,
            sku: v.sku,
            companySku: v.firmaSku,
            barcode: v.barkod,
            name: v.ad,
            isDefault: v.varsayilan,
            locationId: v.rafId,
          })),
        });
      }

      // --- 3) MEVCUT VARYANT GÜNCELLEMELERİ ---
      for (const v of plan.guncellenenVaryantlar) {
        await tx.productVariant.update({
          where: { id: v.id },
          data: {
            companySku: v.firmaSku,
            barcode: v.barkod,
            name: v.ad,
            locationId: v.rafId,
          },
        });
      }

      // --- 4) AÇILIŞ STOĞU — her satır AYRI bir FIFO partisi ---
      if (plan.acilisHareketleri.length) {
        await tx.stockMovement.createMany({
          data: plan.acilisHareketleri.map((h) => ({
            id: h.id,
            variantId: h.varyantId,
            type: "INITIAL" as const,
            quantityDelta: h.adet,
            occurredAt: h.tarih,
            locationId: h.rafId,
            unitCostAmount:
              h.birimMaliyet === null ? null : String(h.birimMaliyet),
            unitCostCurrency: h.paraBirimi,
            note: h.not,
          })),
        });
      }

      // --- 5) KANAL SKU: yeni ---
      if (plan.yeniKanalSkulari.length) {
        await tx.channelSku.createMany({
          data: plan.yeniKanalSkulari.map((k) => ({
            id: k.id,
            variantId: k.varyantId,
            channelAccountId: k.kanalHesabiId,
            channelSku: k.kanalKodu,
            commissionRate:
              k.komisyonOrani === null ? null : String(k.komisyonOrani),
            commissionUpdatedAt: k.komisyonOrani === null ? null : new Date(),
          })),
        });
      }

      // --- 6) KANAL SKU: güncelleme (haftalık komisyon akışı) ---
      for (const k of plan.guncellenenKanalSkulari) {
        await tx.channelSku.update({
          // Kimliğe göre değil BENZERSİZ ÇİFTE göre: güncellemede kayıt
          // kimliğini bilmiyoruz, hesap+varyant çifti zaten tekil.
          where: {
            channelAccountId_variantId: {
              channelAccountId: k.kanalHesabiId,
              variantId: k.varyantId,
            },
          },
          data: {
            channelSku: k.kanalKodu,
            commissionRate:
              k.komisyonOrani === null ? null : String(k.komisyonOrani),
            commissionUpdatedAt:
              k.komisyonOrani === null ? undefined : new Date(),
          },
        });
      }

      return {
        urun: plan.yeniUrunler.length,
        varyant: plan.yeniVaryantlar.length,
        guncellenenVaryant: plan.guncellenenVaryantlar.length,
        hareket: plan.acilisHareketleri.length,
        adet: plan.acilisHareketleri.reduce((t, h) => t + h.adet, 0),
        kanalSku: plan.yeniKanalSkulari.length,
        guncellenenKanalSku: plan.guncellenenKanalSkulari.length,
      };
    },
    { timeout: ISLEM_SURESI_MS, maxWait: BEKLEME_SURESI_MS },
  );
}
