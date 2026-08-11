"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  RAF BİRLEŞTİRME
 * ----------------------------------------------------------------------------
 *  Aynı raf iki kere yazılmışsa (ör. "a-01" ve "a02") ürünleri tek rafta
 *  toplamak gerekir.
 *
 *  ⚠ LEDGER DEĞİŞMEZ. Birleştirme yalnızca ÜRÜNLERİN BUGÜNKÜ RAF ATAMASINI
 *  taşır. Geçmiş stok hareketleri ("3 Ağustos'ta a02'den çıktı") ve iade
 *  kayıtları OLDUĞU GİBİ KALIR — muhasebe defteri geçmişe dönük
 *  değiştirilmez. Bu bir eksiklik değil, kuralın kendisidir.
 *
 *  Kaynak raf silinmez, PASİFE ALINIR: geçmiş hareketler ona referans
 *  veriyor, silmek o kayıtları sahipsiz bırakırdı.
 *
 *  ÖNİZLE-ÖNCE-YAZ: kaç ürünün taşınacağı ve kaç geçmiş kaydın olduğu gibi
 *  kalacağı ONAYDAN ÖNCE ekranda yazar.
 * ============================================================================
 */

export type BirlestirmeOnizlemesi = {
  kaynakKod: string;
  hedefKod: string;
  /** Raf ataması taşınacak varyant sayısı. */
  tasinacakVaryant: number;
  /** Kaynak rafa bağlı ve DEĞİŞMEYECEK geçmiş kayıt sayısı. */
  kalanHareket: number;
  kalanIade: number;
};

export type BirlestirDurumu = {
  hatalar?: string[];
  basari?: string;
  onizleme?: BirlestirmeOnizlemesi;
};

async function raflariAl(kaynakId: string, hedefId: string) {
  const [kaynak, hedef] = await Promise.all([
    prisma.location.findUnique({ where: { id: kaynakId } }),
    prisma.location.findUnique({ where: { id: hedefId } }),
  ]);
  return { kaynak, hedef };
}

/** Yazmadan önce ne olacağını hesaplar. Veritabanına DOKUNMAZ. */
export async function birlestirmeOnizle(
  _oncekiDurum: BirlestirDurumu,
  formData: FormData,
): Promise<BirlestirDurumu> {
  const t = await getTranslations("RafBirlestir");

  const kaynakId = String(formData.get("kaynakId") ?? "");
  const hedefId = String(formData.get("hedefId") ?? "");

  if (!kaynakId || !hedefId) return { hatalar: [t("ikisiDeSecilmeli")] };
  if (kaynakId === hedefId) return { hatalar: [t("ayniRaf")] };

  const { kaynak, hedef } = await raflariAl(kaynakId, hedefId);
  if (!kaynak || !hedef) return { hatalar: [t("rafBulunamadi")] };

  const [tasinacakVaryant, kalanHareket, kalanIade] = await Promise.all([
    prisma.productVariant.count({ where: { locationId: kaynakId } }),
    prisma.stockMovement.count({ where: { locationId: kaynakId } }),
    prisma.returnItem.count({ where: { locationId: kaynakId } }),
  ]);

  return {
    onizleme: {
      kaynakKod: kaynak.code,
      hedefKod: hedef.code,
      tasinacakVaryant,
      kalanHareket,
      kalanIade,
    },
  };
}

/** Onaydan sonra yazar: atamaları taşır, kaynağı pasife alır. */
export async function birlestirmeyiUygula(
  _oncekiDurum: BirlestirDurumu,
  formData: FormData,
): Promise<BirlestirDurumu> {
  const t = await getTranslations("RafBirlestir");

  const kaynakId = String(formData.get("kaynakId") ?? "");
  const hedefId = String(formData.get("hedefId") ?? "");

  if (!kaynakId || !hedefId) return { hatalar: [t("ikisiDeSecilmeli")] };
  if (kaynakId === hedefId) return { hatalar: [t("ayniRaf")] };

  const { kaynak, hedef } = await raflariAl(kaynakId, hedefId);
  if (!kaynak || !hedef) return { hatalar: [t("rafBulunamadi")] };
  if (!hedef.isActive) return { hatalar: [t("hedefPasif", { kod: hedef.code })] };

  let tasinan = 0;
  try {
    await prisma.$transaction(async (tx) => {
      const sonuc = await tx.productVariant.updateMany({
        where: { locationId: kaynakId },
        data: { locationId: hedefId },
      });
      tasinan = sonuc.count;

      // Kaynak SİLİNMEZ: geçmiş hareketler ona bağlı.
      await tx.location.update({
        where: { id: kaynakId },
        data: { isActive: false },
      });
    });
  } catch (e) {
    console.error("[raf birlestir] beklenmeyen hata:", e);
    return { hatalar: [t("birlestirilemedi")] };
  }

  revalidatePath("/ayarlar/konumlar");
  revalidatePath("/ayarlar/konumlar/etiketler");
  revalidatePath("/stok");

  return {
    basari: t("birlestirildi", {
      kaynak: kaynak.code,
      hedef: hedef.code,
      sayi: tasinan,
    }),
  };
}
