"use server";

import { yetkiIste } from "@/lib/yetki";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";

export type SatisHesapDurumu = {
  hatalar?: string[];
  basari?: string;
};

/**
 * ============================================================================
 *  SATIŞIN KANAL HESABINI DEĞİŞTİR
 * ----------------------------------------------------------------------------
 *  Satışın tam düzenlemesi YOK (stok hareketi + kâr snapshot'ı zinciri).
 *  Bu action YALNIZ kanal hesabını değiştirir — ledger'a dokunmaz, kalemlere
 *  dokunmaz, kâr rakamlarını KENDİLİĞİNDEN değiştirmez.
 *
 *  NEDEN GEREKLİ: satış yanlış hesaba yazılmış olabilir. 12.08.2026'da
 *  canlıda tam bu çıktı: iki satış, mal ALINAN kişisel hesaba kaydedilmişti;
 *  o hesap hem alış hem satış görünüyordu ve rolü düzeltilemiyordu.
 *
 *  ⚠ KANAL DEĞİŞİRSE KÂR BAYATLAR ama SESSİZCE YENİDEN HESAPLANMAZ:
 *  kesinti kuralları kanal bazındadır. Kâr snapshot'ı geçmişin kaydıdır;
 *  kullanıcı "Yeniden Hesapla" ile açıkça onaylamadan değişmemeli.
 *  Ekran bunu söylüyor.
 * ============================================================================
 */
export async function satisHesabiDegistir(
  _oncekiDurum: SatisHesapDurumu,
  formData: FormData,
): Promise<SatisHesapDurumu> {
  await yetkiIste("kar.duzelt");

  const t = await getTranslations("Satis");

  const saleId = String(formData.get("saleId") ?? "");
  const channelAccountId = String(formData.get("channelAccountId") ?? "");
  if (!saleId || !channelAccountId) {
    return { hatalar: [t("hesabiDegistirEksik")] };
  }

  const [satis, hesap] = await Promise.all([
    prisma.sale.findUnique({
      where: { id: saleId },
      select: { id: true, code: true, channelAccountId: true },
    }),
    prisma.channelAccount.findUnique({
      where: { id: channelAccountId },
      select: { id: true, name: true, satisIcin: true, isActive: true },
    }),
  ]);

  if (!satis) return { hatalar: [t("bulunamadi")] };
  if (!hesap || !hesap.isActive) {
    return { hatalar: [t("hesabiDegistirHesapYok")] };
  }
  // SATIŞ yalnız SATIŞ hesabına taşınabilir — alış hesabına taşımak
  // düzeltmek değil, aynı hatayı tekrar yapmaktır.
  if (!hesap.satisIcin) {
    return { hatalar: [t("hesabiDegistirSatisDegil", { ad: hesap.name })] };
  }
  if (satis.channelAccountId === channelAccountId) {
    return { hatalar: [t("hesabiDegistirAyni")] };
  }

  await prisma.sale.update({
    where: { id: saleId },
    data: { channelAccountId },
  });

  revalidatePath(`/satislar/${saleId}`);
  revalidatePath("/satislar");
  revalidatePath("/ayarlar/kanallar");
  revalidatePath("/hakedis");

  return { basari: t("hesabiDegisti", { ad: hesap.name }) };
}
