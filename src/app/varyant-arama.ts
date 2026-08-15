"use server";

import { prisma } from "@/lib/prisma";
import { aramaKosulu, kodKosulu } from "@/lib/varyant-arama-kurali";
import {
  VARYANT_SECIMI,
  varyantiOzetle,
  type VaryantSonucu,
} from "@/lib/varyant-ozet";
import { yetkiIste } from "@/lib/yetki";

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

/** Serbest metin araması: ürün adı ve DÖRT kod rolü (bkz. varyant-arama-kurali). */
export async function varyantAra(sorgu: string): Promise<VaryantSonucu[]> {
  await yetkiIste("urun.gor");

  const q = sorgu.trim();
  if (q.length < 2) return [];

  const varyantlar = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      OR: aramaKosulu(q),
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
  await yetkiIste("urun.gor");

  const temiz = kod.trim();
  if (!temiz) return null;

  const varyant = await prisma.productVariant.findFirst({
    where: {
      isActive: true,
      OR: kodKosulu(temiz),
    },
    select: VARYANT_SECIMI,
  });

  return varyant ? varyantiOzetle(varyant) : null;
}
