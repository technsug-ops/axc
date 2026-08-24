"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

export type GonderiNoDurumu = {
  hatalar?: string[];
  basari?: string;
};

/**
 * ============================================================================
 *  GÖNDERİ (TAKİP) NUMARASINI SONRADAN GİR (K41①, 24.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE AYRI EYLEM, NİYE DÜZENLEME EKRANI DEĞİL.
 *  Satış düzenleme ekranı FİYAT ve ADET değiştiriyor; bir plan kuruyor,
 *  imza üretiyor ve DÜZELTME NEDENİ soruyor — çünkü orada para ve stok
 *  hareket ediyor. Gönderi numarası ise METADATA: ne parayı ne adedi
 *  değiştirir. O makineye sokmak, takip numarası girmek için "düzeltme
 *  nedeni" sordurmak olurdu (İlke #9: sık yapılan işlem az adımla biter).
 *
 *  ⚠ NİYE SONRADAN GİRİLEBİLİYOR: kod pazaryerinde/kargoda satıştan SONRA
 *  oluşuyor. Yalnız yeni satış formunda sorulsaydı, kodu henüz olmayan bir
 *  satış için ya kayıt geciktirilir ya da alan sonsuza kadar boş kalırdı.
 *
 *  ⚠ KÂRA DOKUNMAZ ve bu bilinçli: hiçbir kesinti kuralı gönderi numarasına
 *  bağlı değil. `karYenidenYaz` çağırmak, değişmeyecek bir damgayı boşuna
 *  tazelemek ve "bu alan kârı etkiliyor" izlenimi vermek olurdu.
 * ============================================================================
 */
export async function gonderiNoKaydet(
  saleId: string,
  ham: string,
): Promise<GonderiNoDurumu> {
  await yetkiIste("satis.duzenle");
  const t = await getTranslations("Satis");

  const kod = ham.trim();

  const satis = await prisma.sale.findUnique({
    where: { id: saleId },
    select: { id: true, shipmentCode: true, iptalTarihi: true },
  });
  if (!satis) return { hatalar: [t("gonderiNoSatisYok")] };

  /**
   * ⚠ İPTAL EDİLMİŞ SATIŞA YAZILMAZ. İptal "bu satış hiç olmadı" demek;
   * ona takip numarası iliştirmek, olmayan bir gönderiye kimlik vermektir.
   */
  if (satis.iptalTarihi !== null) {
    return { hatalar: [t("gonderiNoIptalli")] };
  }

  /** BOŞALTMA — alan temizlenebilir; boş dize DEĞİL null yazılır. */
  if (!kod) {
    if (satis.shipmentCode === null) return { basari: t("gonderiNoZatenBos") };
    await prisma.sale.update({
      where: { id: saleId },
      data: { shipmentCode: null },
    });
    revalidatePath(`/satislar/${saleId}`);
    revalidatePath("/satislar");
    return { basari: t("gonderiNoSilindi") };
  }

  /**
   * ⚠ ÇAKIŞMA ÖNCE SORULUR, HAM VERİTABANI HATASINA BIRAKILMAZ.
   * `@unique` zaten engelliyor ama Prisma'nın ham hatası ekranda anlamsız
   * görünür (İlke #5: bir şey olmadıysa NEDEN olmadığı ekranda yazar).
   *
   * ⚠ AYNI SATIŞA AYNI KODU YAZMAK ÇAKIŞMA DEĞİLDİR — kullanıcı formu
   * ikinci kez göndermiş olabilir.
   */
  const cakisan = await prisma.sale.findUnique({
    where: { shipmentCode: kod },
    select: { id: true, code: true },
  });
  if (cakisan && cakisan.id !== saleId) {
    return {
      hatalar: [t("gonderiNoCakisma", { siparis: cakisan.code ?? "—" })],
    };
  }

  await prisma.sale.update({
    where: { id: saleId },
    data: { shipmentCode: kod },
  });

  revalidatePath(`/satislar/${saleId}`);
  revalidatePath("/satislar");
  return { basari: t("gonderiNoKaydedildi") };
}
