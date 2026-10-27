"use server";

import { revalidatePath } from "next/cache";

import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";
import { MALIYET_TERCIHLERI, type MaliyetTercihi } from "@/lib/buybox-kural";
import { genelKuralOku, urunKuraliOku } from "@/lib/buybox-kural-verisi";
import { izinVarMi } from "@/lib/yetki";

/**
 * ============================================================================
 *  BUYBOX FİYAT KURALI — AYAR KAYDI (SUNUCU, K366)
 * ----------------------------------------------------------------------------
 *  ① Genel kural (firma): minimum marj · adım · maliyet tercihi — `ayar.yaz`.
 *  ② Ürüne ayrı kural: aynı üç alan, her biri «genel ayarı izle» (`null`) ya
 *    da ayrı değer — `kanal.yaz` (fiyat gönderebilen, fiyat kuralını da
 *    belirler). Ayrı değer, kullanıcı yeniden değiştirene kadar kalır.
 *  Mod (onaylı/otomatik) bu turda AÇILMADI: otomatik gönderim yazılmadan
 *  seçilebilir bir «otomatik» düğmesi, tutamayacağı bir söz olurdu.
 *  Her kayıt eski → yeni değerleriyle İZ bırakır (`BUYBOX_KURALI`).
 *  ⚠ Hata KODLA döner (K57-③); ham hata sunucuda tam loglanır.
 * ============================================================================
 */

export type KuralHatasi = "YETKI_YOK" | "MARJ_GECERSIZ" | "ADIM_GECERSIZ" | "MALIYET_GECERSIZ" | "VARYANT_YOK" | "OKUNAMADI";
export type KuralSonucu = { tamam: true } | { tamam: false; kod: KuralHatasi };

/** Marj −100 ile 100 arası (eksi marj bilinçli bir «zararına sat» kararı olabilir); adım 0'dan büyük. */
function marjGecerli(x: number): boolean {
  return Number.isFinite(x) && x > -100 && x < 100;
}
function adimGecerli(x: number): boolean {
  return Number.isFinite(x) && x > 0 && x <= 1_000_000;
}
function maliyetGecerli(x: string): x is MaliyetTercihi {
  return (MALIYET_TERCIHLERI as readonly string[]).includes(x);
}

export async function buyboxGenelKuralKaydet(veri: { minMarj: number; adim: number; maliyet: string }): Promise<KuralSonucu> {
  if (!(await izinVarMi("ayar.yaz"))) return { tamam: false, kod: "YETKI_YOK" };
  if (!marjGecerli(veri.minMarj)) return { tamam: false, kod: "MARJ_GECERSIZ" };
  if (!adimGecerli(veri.adim)) return { tamam: false, kod: "ADIM_GECERSIZ" };
  if (!maliyetGecerli(veri.maliyet)) return { tamam: false, kod: "MALIYET_GECERSIZ" };
  try {
    const firma = await prisma.company.findFirst({ select: { id: true } });
    if (!firma) return { tamam: false, kod: "OKUNAMADI" };
    const eski = await genelKuralOku();
    await prisma.company.update({
      where: { id: firma.id },
      data: { buyboxMinMarj: veri.minMarj, buyboxAdimAmount: veri.adim, buyboxAdimCurrency: "TRY", buyboxMaliyet: veri.maliyet },
    });
    await izYaz({
      action: "BUYBOX_KURALI",
      targetType: "Company",
      targetId: firma.id,
      companyId: firma.id,
      detail: JSON.stringify({ kapsam: "genel", eski: { minMarj: eski.minMarj, adim: eski.adim, maliyet: eski.maliyet }, yeni: { minMarj: veri.minMarj, adim: veri.adim, maliyet: veri.maliyet } }),
    });
    revalidatePath("/rapor/buybox");
    return { tamam: true };
  } catch (e) {
    console.error("[buybox-kural] genel kural kaydedilemedi", veri, e);
    return { tamam: false, kod: "OKUNAMADI" };
  }
}

/** `null` = o alanda genel ayarı izle. Üç alan da `null` ise ürünün ayrı kuralı kalmaz (satır silinir). */
export async function buyboxUrunKuraliKaydet(
  variantId: string,
  veri: { minMarj: number | null; adim: number | null; maliyet: string | null },
): Promise<KuralSonucu> {
  if (!(await izinVarMi("kanal.yaz"))) return { tamam: false, kod: "YETKI_YOK" };
  if (veri.minMarj !== null && !marjGecerli(veri.minMarj)) return { tamam: false, kod: "MARJ_GECERSIZ" };
  if (veri.adim !== null && !adimGecerli(veri.adim)) return { tamam: false, kod: "ADIM_GECERSIZ" };
  if (veri.maliyet !== null && !maliyetGecerli(veri.maliyet)) return { tamam: false, kod: "MALIYET_GECERSIZ" };
  const maliyet = veri.maliyet as MaliyetTercihi | null;
  try {
    const varyant = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { id: true } });
    if (!varyant) return { tamam: false, kod: "VARYANT_YOK" };
    const eski = await urunKuraliOku(variantId);
    const hepsiBos = veri.minMarj === null && veri.adim === null && maliyet === null;
    /**
     * Mod bu turda yazılmaz; ileride yazılmış bir modu silmemek için satır
     * yalnız mod da boşsa kaldırılır.
     */
    if (hepsiBos && (eski === null || eski.mod === null)) {
      await prisma.buyboxKurali.deleteMany({ where: { variantId } });
    } else {
      const alanlar = {
        minMarj: veri.minMarj,
        adimAmount: veri.adim,
        adimCurrency: veri.adim === null ? null : ("TRY" as const),
        maliyet,
      };
      await prisma.buyboxKurali.upsert({ where: { variantId }, create: { variantId, ...alanlar }, update: alanlar });
    }
    await izYaz({
      action: "BUYBOX_KURALI",
      targetType: "ProductVariant",
      targetId: variantId,
      detail: JSON.stringify({ kapsam: "urun", eski, yeni: { minMarj: veri.minMarj, adim: veri.adim, maliyet } }),
    });
    revalidatePath("/rapor/buybox");
    return { tamam: true };
  } catch (e) {
    console.error("[buybox-kural] ürün kuralı kaydedilemedi", variantId, veri, e);
    return { tamam: false, kod: "OKUNAMADI" };
  }
}
