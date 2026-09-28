"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

/**
 * ÖZELLİK ANAHTARLARI — SUNUCU EYLEMİ (K304-②). Firma bazında açılıp kapanan
 * isteğe bağlı özellikler; kullanıcı kararı 28.09.2026: «herkesin ihtiyacı
 * olmayabilir». Firma OTURUMDAN gelir (`baglam.companyId`) — «ilk firma»
 * varsayılmaz (çok-firma hazırlığı).
 *
 * ⛔ KAPATMAK VERİ SAKLAMAZ: finansmanda önceden girilmiş USD/altın kayıtları
 * görünmeye devam eder; yalnız YENİ kayıtta bu birimler seçilemez.
 */
export type OzellikSonucu = { tamam: boolean; hata?: string };

export async function finansmanCokBirimAyarla(acik: boolean): Promise<OzellikSonucu> {
  const baglam = await yetkiIste("ayar.yaz");
  const t = await getTranslations("Ozellikler");
  try {
    await prisma.$transaction(async (tx) => {
      await tx.company.update({ where: { id: baglam.companyId }, data: { finansmanCokBirim: acik } });
      await izYaz({ action: "OZELLIK_DEGISTI", companyId: baglam.companyId, targetType: "Company", targetId: baglam.companyId, detail: JSON.stringify({ ozellik: "finansmanCokBirim", acik }) }, tx);
    });
  } catch (e) {
    console.error("[ozellikler] finansmanCokBirimAyarla", e);
    return { tamam: false, hata: t("kaydedilemedi") };
  }
  revalidatePath("/ayarlar/ozellikler");
  revalidatePath("/finansman", "layout");
  return { tamam: true };
}
