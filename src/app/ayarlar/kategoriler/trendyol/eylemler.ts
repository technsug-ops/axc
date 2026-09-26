"use server";

import { revalidatePath } from "next/cache";

import { izYaz } from "@/lib/iz";
import { eslesmeyiUrunlereUygula } from "@/lib/kategori-eslesme-yaz";
import { prisma } from "@/lib/prisma";
import { yetkiBaglami } from "@/lib/yetki";

/**
 * ============================================================================
 *  TRENDYOL KATEGORİ EŞLEŞMESİNİ KAYDET (K283)
 * ----------------------------------------------------------------------------
 *  Bir TY kategorisinin bizdeki karşılığını seçer (ya da seçimi kaldırır) ve
 *  o TY kategorisindeki AKTİF ürünlere uygular — karar saf kuraldan: elle
 *  seçilmiş kategoriye dokunulmaz, KDV değişecekse yazılmaz.
 *  İzin `ayar.yaz`. Eşleşme değişikliği eski/yeni değerle İZE yazılır.
 *  ⚠ "use server": YALNIZ async fonksiyon dışa aktarılır.
 *  ⚠ Hata KOD döner, metne ekran çevirir; beklenmeyen hata TAM günlüğe.
 * ============================================================================
 */
export type EslesmeSonucu =
  | {
      durum: "KAYDEDILDI";
      kategoriYazilan: number;
      kdvBekleyen: number;
      elle: number;
      tavandaKalan: number;
    }
  | { hata: "YETKISIZ" | "KATEGORI_YOK" | "ESLESME_YOK" | "HATA" };

export async function eslesmeKaydet(tyKategori: string, categoryId: string | null): Promise<EslesmeSonucu> {
  try {
    const baglam = await yetkiBaglami();
    if (!baglam || !baglam.izinler.has("ayar.yaz")) return { hata: "YETKISIZ" };
    const satir = await prisma.tyKategoriEslesme.findUnique({
      where: { tyKategori },
      select: { id: true, categoryId: true },
    });
    if (!satir) return { hata: "ESLESME_YOK" };
    if (categoryId !== null) {
      const k = await prisma.category.findFirst({ where: { id: categoryId, isActive: true }, select: { id: true } });
      if (!k) return { hata: "KATEGORI_YOK" };
    }
    await prisma.tyKategoriEslesme.update({ where: { id: satir.id }, data: { categoryId } });
    await izYaz({
      action: "TY_KATEGORI_ESLESMESI",
      targetType: "TyKategoriEslesme",
      targetId: satir.id,
      detail: JSON.stringify({ tyKategori, eski: satir.categoryId, yeni: categoryId }),
    });
    const ozet = await eslesmeyiUrunlereUygula(tyKategori);
    revalidatePath("/ayarlar/kategoriler/trendyol");
    revalidatePath("/ayarlar/kategoriler");
    return {
      durum: "KAYDEDILDI",
      kategoriYazilan: ozet.kategoriYazilan,
      kdvBekleyen: ozet.atlanan.KDV_DEGISIR,
      elle: ozet.atlanan.ELLE,
      tavandaKalan: ozet.tavandaKalan,
    };
  } catch (e) {
    console.error("[eslesmeKaydet] beklenmeyen hata:", tyKategori, e);
    return { hata: "HATA" };
  }
}
