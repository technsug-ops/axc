"use server";

import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  VARYANT ARAMA — ALIM VE SATIŞ FORMLARININ ORTAK KAYNAĞI
 * ----------------------------------------------------------------------------
 *  Hem alım hem satış formunda "ürünü barkodla okut veya adıyla ara" adımı
 *  var. Mantık tek yerde durur; iki formda ayrı ayrı yazılırsa biri
 *  düzeltilip diğeri unutulur.
 *
 *  İki ayrı davranış bilerek ayrıdır:
 *  - varyantAra()      : serbest metin, KISMİ eşleşme, insan yazar.
 *  - varyantKodlaBul() : okutulan kod, TAM eşleşme, makine okur.
 *    Okutmada kısmi eşleşme yanlış ürün eklerdi.
 * ============================================================================
 */

/** Formlarda ve barkod aramasında kullanılan hafif varyant özeti. */
export type VaryantSonucu = {
  id: string;
  urunAdi: string;
  marka: string | null;
  varyantAdi: string | null;
  sku: string;
  axcaliSku: string;
  barcode: string | null;
};

const VARYANT_SECIMI = {
  id: true,
  sku: true,
  axcaliSku: true,
  barcode: true,
  name: true,
  product: { select: { name: true, brand: true } },
} as const;

function varyantiOzetle(v: {
  id: string;
  sku: string;
  axcaliSku: string;
  barcode: string | null;
  name: string | null;
  product: { name: string; brand: string | null };
}): VaryantSonucu {
  return {
    id: v.id,
    urunAdi: v.product.name,
    marka: v.product.brand,
    varyantAdi: v.name,
    sku: v.sku,
    axcaliSku: v.axcaliSku,
    barcode: v.barcode,
  };
}

/** Serbest metin araması: ürün adı, SKU, Firma SKU veya barkod. */
export async function varyantAra(sorgu: string): Promise<VaryantSonucu[]> {
  const q = sorgu.trim();
  if (q.length < 2) return [];

  const varyantlar = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      OR: [
        { sku: { contains: q } },
        { axcaliSku: { contains: q } },
        { barcode: { contains: q } },
        { product: { name: { contains: q } } },
      ],
    },
    select: VARYANT_SECIMI,
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  return varyantlar.map(varyantiOzetle);
}

/**
 * Okutulan kodun TAM karşılığını bulur.
 * Barkod okuyucudan / kameradan gelen kod için kullanılır: kısmi eşleşme
 * istemeyiz, yanlış ürün eklemek kötü olur.
 */
export async function varyantKodlaBul(
  kod: string,
): Promise<VaryantSonucu | null> {
  const temiz = kod.trim();
  if (!temiz) return null;

  const varyant = await prisma.productVariant.findFirst({
    where: {
      isActive: true,
      OR: [{ barcode: temiz }, { axcaliSku: temiz }, { sku: temiz }],
    },
    select: VARYANT_SECIMI,
  });

  return varyant ? varyantiOzetle(varyant) : null;
}
