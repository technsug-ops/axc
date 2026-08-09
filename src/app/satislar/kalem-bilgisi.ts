"use server";

import { prisma } from "@/lib/prisma";
import { kdvOraniniCoz } from "@/lib/kdv";
import { varyantStogu } from "@/lib/stok";

/**
 * ============================================================================
 *  SATIŞ FORMU — KALEM VE KARGO BİLGİLERİ
 * ----------------------------------------------------------------------------
 *  Form kalem eklerken tek çağrıda ihtiyacı olan her şeyi alır: stok, desi,
 *  KDV oranı, o kanaldaki komisyon oranı. Ayrı ayrı istekler atmak hem yavaş
 *  hem de tutarsız anlık görüntü riski taşırdı.
 *
 *  Bunlar ÖNERİDİR. Hepsi formda değiştirilebilir ve satışa kaydedilen değer
 *  formdaki son değerdir (komisyon oranları haftalık değişiyor, fiili tartım
 *  desiden farklı çıkabiliyor).
 * ============================================================================
 */

export type KalemBilgisi = {
  stok: number;
  /** Ürün seviyesindeki desi; yoksa null. */
  desi: number | null;
  /** Çözülen KDV oranı (%) ve kaynağı. */
  kdvOrani: number;
  kdvKaynagi: "ISTISNA" | "KATEGORI" | "VARSAYILAN";
  kategoriAdi: string | null;
  /** Bu kanal hesabındaki komisyon oranı (%). Tanımlı değilse null. */
  komisyonOrani: number | null;
};

export async function kalemBilgisiGetir(
  variantId: string,
  channelAccountId: string,
): Promise<KalemBilgisi> {
  const [varyant, stok] = await Promise.all([
    prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        product: {
          select: {
            desi: true,
            vatRateOverride: true,
            category: { select: { name: true, vatRate: true } },
          },
        },
      },
    }),
    varyantStogu(variantId),
  ]);

  const kdv = kdvOraniniCoz({
    vatRateOverride: varyant?.product.vatRateOverride,
    category: varyant?.product.category ?? null,
  });

  let komisyonOrani: number | null = null;
  if (channelAccountId) {
    const kanalSku = await prisma.channelSku.findUnique({
      where: { channelAccountId_variantId: { channelAccountId, variantId } },
      select: { commissionRate: true },
    });
    if (kanalSku?.commissionRate) {
      komisyonOrani = Number(kanalSku.commissionRate.toString());
    }
  }

  return {
    stok,
    desi: varyant?.product.desi
      ? Number(varyant.product.desi.toString())
      : null,
    kdvOrani: kdv.oran,
    kdvKaynagi: kdv.kaynak,
    kategoriAdi: kdv.kategoriAdi,
    komisyonOrani,
  };
}

// ---------------------------------------------------------------------------
//  KARGO SEÇENEKLERİ
// ---------------------------------------------------------------------------

export type KargoSecenegi = {
  carrierId: string;
  ad: string;
  /** KDV HARİÇ tarife tutarı. Taşımıyorsa null. */
  tarife: number | null;
  /** KDV DAHİL tutar — ekranda bu gösterilir. */
  kdvDahil: number | null;
  /** Bu desiyi taşıyor mu? Taşımıyorsa listede pasif görünür. */
  tasiyorMu: boolean;
};

/**
 * Verilen desi için kanalın tüm kargo firmalarını ücretiyle döndürür.
 * EN UCUZ ÖNCE sıralanır; taşımayan firmalar en sonda kalır.
 *
 * Aralık dışı firma listeden ÇIKARILMAZ — pasif olarak gösterilir ki
 * kullanıcı "neden yok" diye aramasın (Kullanıcı Kolaylığı #5).
 */
export async function kargoSecenekleriGetir(
  channelAccountId: string,
  desi: number,
): Promise<KargoSecenegi[]> {
  if (!channelAccountId) return [];

  const hesap = await prisma.channelAccount.findUnique({
    where: { id: channelAccountId },
    select: { channelId: true },
  });
  if (!hesap) return [];

  // Kargo firmaları desiyi YUKARI yuvarlar.
  const tamDesi = Math.max(0, Math.ceil(desi));

  const [firmalar, tarifeler] = await Promise.all([
    prisma.cargoCarrier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.cargoTariff.findMany({
      where: { channelId: hesap.channelId, desi: tamDesi },
      select: { carrierId: true, amount: true },
    }),
  ]);

  const tarifeHaritasi = new Map(
    tarifeler.map((t) => [t.carrierId, Number(t.amount.toString())]),
  );

  const secenekler: KargoSecenegi[] = firmalar.map((f) => {
    const tarife = tarifeHaritasi.get(f.id) ?? null;
    return {
      carrierId: f.id,
      ad: f.name,
      tarife,
      kdvDahil: tarife === null ? null : tarife * 1.2,
      tasiyorMu: tarife !== null,
    };
  });

  // Taşıyanlar ucuzdan pahalıya; taşımayanlar en sonda, alfabetik.
  return secenekler.sort((a, b) => {
    if (a.tasiyorMu !== b.tasiyorMu) return a.tasiyorMu ? -1 : 1;
    if (!a.tasiyorMu) return a.ad.localeCompare(b.ad, "tr");
    return (a.tarife ?? 0) - (b.tarife ?? 0);
  });
}
