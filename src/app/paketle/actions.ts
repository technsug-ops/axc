"use server";

import { prisma } from "@/lib/prisma";
import { PAKETLEME_EYLEMLERI, hazirlaniyorMu } from "@/lib/okuma/paketleme";
import type { PaketSiparisi } from "@/lib/paketleme/yonlendirme";
import { satisKodKosulu } from "@/lib/varyant-arama-kurali";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  YÖNLENDİRMELİ PAKETLEME — SUNUCU EYLEMİ (K46)
 * ----------------------------------------------------------------------------
 *  Bu dosya TEK İŞ yapar: okutulan kargo/sipariş kodundan siparişi ve
 *  KALEMLERİNİN RAFINI getirir. Karar mantığı burada DEĞİL,
 *  `lib/paketleme/yonlendirme.ts`te — orası veritabanısız sınanabiliyor.
 *
 *  ⚠ "PAKETLENDİ" YAZIMI BURADA DEĞİL. `okut/actions.ts`teki
 *  `paketlendiIsaretle` zaten canlıda ve `AuditLog`a yazıyor; ikinci bir
 *  yazma yolu açmak, aynı izi iki farklı şekilde üreten iki kapı demekti.
 *  Bu ekran onu ÇAĞIRIR.
 *
 *  ⚠ SÜZGEÇ ÇAĞRI YERİNDE YAZILI — SABİTE SAKLANMIYOR. `okut/actions.ts`te
 *  aynı karar aynı gerekçeyle alındı: `iptal:bekci` iptalli satışın sızmasını
 *  arıyor ve sabite saklanmış bir süzgeci GÖREMİYOR. Bir bekçinin göremediği
 *  süzgeç, yarın silindiğinde de görünmez.
 *
 *  ⚠ İZİN `stok.gor` — YENİ İZİN AÇILMADI. Ekran depo işidir ve okutma
 *  ekranı (K34a) aynı izinle çalışıyor. Yeni anahtar açmak `izinler.ts` +
 *  seed `SONRADAN_DOGAN` + canlı senkron zinciri demekti; hiçbiri
 *  gerekmiyordu (bkz. CLAUDE.md → "Yetki iki bacaklıdır").
 * ============================================================================
 */
export async function paketlemeIcinAra(
  kod: string,
): Promise<PaketSiparisi | null> {
  await yetkiIste("stok.gor");

  const temiz = kod.trim();
  if (!temiz) return null;

  const satis = await prisma.sale.findFirst({
    where: {
      OR: satisKodKosulu(temiz),
      /* `shippedAt: null` = paket henüz çıkmadı — paketlenecek olan bu. */
      shippedAt: null,
      /* İptal edilmiş satış paketlenmez. */
      iptalTarihi: null,
    },
    select: {
      id: true,
      code: true,
      shipmentCode: true,
      channelAccount: {
        select: { name: true, channel: { select: { name: true } } },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          variant: {
            select: {
              id: true,
              sku: true,
              companySku: true,
              barcode: true,
              name: true,
              location: { select: { code: true } },
              product: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!satis) return null;

  /**
   * PAKETLEME İZİ — "bu sipariş zaten hazırlandı mı".
   * ⚠ En yeni iz kazanır ve eşitlikte "geri alındı" kazanır; kural
   * `lib/okuma/paketleme.ts`te, burada yalnız okunuyor.
   */
  const izler = await prisma.auditLog.findMany({
    where: {
      targetType: "Sale",
      targetId: satis.id,
      action: { in: [...PAKETLEME_EYLEMLERI] },
    },
    select: { action: true, createdAt: true },
  });

  return {
    saleId: satis.id,
    siparisKodu: satis.code,
    gonderiKodu: satis.shipmentCode,
    kanal: satis.channelAccount
      ? `${satis.channelAccount.channel.name} — ${satis.channelAccount.name}`
      : "—",
    kalemler: satis.items.map((k) => ({
      saleItemId: k.id,
      variantId: k.variant.id,
      urunAdi: k.variant.product.name,
      varyantAdi: k.variant.name,
      sku: k.variant.sku,
      companySku: k.variant.companySku,
      barcode: k.variant.barcode,
      adet: k.quantity,
      /* Akışın ASIL çıktısı. `null` ise ekran "raf girilmemiş" der. */
      rafKodu: k.variant.location?.code ?? null,
      /* Teyit istemcide okutularak kurulur; sunucudan teyitli gelmez. */
      teyitli: false,
    })),
    hazirlaniyor: hazirlaniyorMu(izler),
    /**
     * ⚠ `code` (sipariş numarası) BİR ROL DEĞİL — `KOD_ROLLERI` ürün kodu
     * rollerini sayar. Sipariş numarasıyla bulunduysa `null` döner ve ekran
     * iki kodu da gösterdiği için bilgi kaybolmaz.
     */
    bulunanAlan: satis.shipmentCode === temiz ? "shipmentCode" : null,
  };
}
