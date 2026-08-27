import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { toplamlariBirlestir, type ParaToplami } from "@/lib/tutar";
import type { SuzgecToplamSonucu } from "@/lib/liste-toplami";

/**
 * ============================================================================
 *  ALIM LİSTESİ TOPLAMLARI — VERİTABANINDA, BELLEKTE DEĞİL
 * ----------------------------------------------------------------------------
 *  `satis-toplami.ts`in kardeşi ve aynı gerekçeyle açıldı (27.08.2026):
 *  toplamlar çekilen diziden hesaplandığı sürece ekran defterin TAMAMINI
 *  çekmek zorunda kalıyor ve sayfalama işe yaramıyor.
 *
 *      /alimlar — sayfalama YOK:  1955 satır · 3,0 MB · 1913 ms
 *
 *  ⛔ İLKE #15 KORUNUR: toplam görünen sayfanın değil, SÜZGECİN TAMAMININ
 *  toplamıdır. Bu gövde `kosul` alır, sayfa numarası almaz.
 *
 *  ⚠ İPTAL AYRIMI `status` ÜZERİNDEN — satışta `iptalTarihi`, alımda
 *  `status = CANCELLED`. İki ekranın aynı kavramı FARKLI alanda tutması
 *  bilinçli değil, tarihsel; bu yüzden iki ayrı gövde var ve her biri kendi
 *  alanını adıyla yazıyor. Tek gövdeye zorlamak, ikisinden birinde sessizce
 *  yanlış alanı okuma riski üretirdi.
 * ============================================================================
 */

function girenKosul(kosul: Prisma.PurchaseWhereInput): Prisma.PurchaseWhereInput {
  /** ⚠ `AND` — spread, kullanıcının kendi `status` süzgecini EZERDİ. */
  return { AND: [kosul, { status: { not: "CANCELLED" } }] };
}

function haricKosul(kosul: Prisma.PurchaseWhereInput): Prisma.PurchaseWhereInput {
  return { AND: [kosul, { status: "CANCELLED" }] };
}

/**
 * TUTAR — para birimi başına `Σ (birim maliyet × adet)`.
 * ⚠ Çarpım `_sum`la yapılamaz; bu yüzden kalemler okunur — ama satır başına
 * YALNIZ ÜÇ skaler alan, `include` yok. Gerekçenin tamamı
 * `satis-toplami.ts → ciroParaBirimine` başlığında.
 */
async function tutarParaBirimine(
  kosul: Prisma.PurchaseWhereInput,
): Promise<ParaToplami[]> {
  const kalemler = await prisma.purchaseItem.findMany({
    where: { purchase: kosul },
    select: { quantity: true, unitCostAmount: true, unitCostCurrency: true },
  });
  const harita = new Map<string, number>();
  for (const k of kalemler) {
    const tutar = Number(k.unitCostAmount.toString()) * k.quantity;
    harita.set(k.unitCostCurrency, (harita.get(k.unitCostCurrency) ?? 0) + tutar);
  }
  return toplamlariBirlestir([
    [...harita.entries()].map(([paraBirimi, tutar]) => ({ paraBirimi, tutar })),
  ]);
}

export type AlimToplamlari = {
  tutar: SuzgecToplamSonucu;
  adet: { toplam: number; haric: number; sayi: number; haricSayi: number };
  /** Süzgece giren TOPLAM kayıt sayısı — sayfalamanın paydası. */
  kayitSayisi: number;
};

export async function alimToplamlari(
  kosul: Prisma.PurchaseWhereInput,
): Promise<AlimToplamlari> {
  const giren = girenKosul(kosul);
  const haric = haricKosul(kosul);

  const [kayitSayisi, girenSayi, haricSayi, girenTutar, haricTutar, girenAdet, haricAdet] =
    await Promise.all([
      prisma.purchase.count({ where: kosul }),
      prisma.purchase.count({ where: giren }),
      prisma.purchase.count({ where: haric }),
      tutarParaBirimine(giren),
      tutarParaBirimine(haric),
      prisma.purchaseItem.aggregate({ where: { purchase: giren }, _sum: { quantity: true } }),
      prisma.purchaseItem.aggregate({ where: { purchase: haric }, _sum: { quantity: true } }),
    ]);

  return {
    tutar: { toplam: girenTutar, haric: haricTutar, sayi: girenSayi, haricSayi },
    adet: {
      toplam: girenAdet._sum.quantity ?? 0,
      haric: haricAdet._sum.quantity ?? 0,
      sayi: girenSayi,
      haricSayi,
    },
    kayitSayisi,
  };
}
