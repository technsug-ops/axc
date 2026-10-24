import { prisma } from "@/lib/prisma";

import { fiyatHafizasi, type AlisKaydi, type FiyatHafizasi } from "./alim-fiyat-hafizasi";

/**
 * ALIM FİYATI HAFIZASI — OKUMA (SUNUCU). Hesap `alim-fiyat-hafizasi.ts`te (saf).
 * Gerçek alım = taslak ve iptal HARİÇ (özel gün alım listesiyle aynı süzgeç).
 * `haricAlimId`: düzenlenen alım kendi geçmişine karışmasın.
 */
export async function alisKayitlari(p: { variantIds?: readonly string[]; haricAlimId?: string | null }): Promise<Map<string, AlisKaydi[]>> {
  const kalemler = await prisma.purchaseItem.findMany({
    where: {
      ...(p.variantIds ? { variantId: { in: [...p.variantIds] } } : {}),
      purchase: {
        status: { notIn: ["DRAFT", "CANCELLED"] },
        ...(p.haricAlimId ? { id: { not: p.haricAlimId } } : {}),
      },
    },
    select: {
      variantId: true,
      unitCostAmount: true,
      unitCostCurrency: true,
      promosyon: true,
      purchase: { select: { purchasedAt: true, fiyatKdvDahil: true, kargoDahil: true, customsAmount: true } },
    },
    orderBy: [{ purchase: { purchasedAt: "asc" } }, { id: "asc" }],
  });
  const harita = new Map<string, AlisKaydi[]>();
  for (const k of kalemler) {
    const liste = harita.get(k.variantId) ?? [];
    liste.push({
      tarih: k.purchase.purchasedAt,
      birim: Number(k.unitCostAmount.toString()),
      paraBirimi: k.unitCostCurrency,
      kdvDahil: k.purchase.fiyatKdvDahil,
      kargoDahil: k.purchase.kargoDahil,
      gumrukVar: k.purchase.customsAmount !== null && Number(k.purchase.customsAmount.toString()) > 0,
      promosyon: k.promosyon,
    });
    harita.set(k.variantId, liste);
  }
  return harita;
}

/** Rehber sekmesi: bütün varyantların TRY hafızası (kıyaslanabilir alışı olanlar). */
export async function tryHafizalari(): Promise<Map<string, FiyatHafizasi>> {
  const kayit = await alisKayitlari({});
  const sonuc = new Map<string, FiyatHafizasi>();
  for (const [variantId, liste] of kayit) {
    const h = fiyatHafizasi(liste, "TRY");
    if (h) sonuc.set(variantId, h);
  }
  return sonuc;
}
