"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export type KanalHesabiDurumu = {
  hatalar?: string[];
  basari?: string;
};

const hesapSemasi = z.object({
  channelId: z.string().trim().min(1, "Kanal seçilmeli"),
  code: z
    .string()
    .trim()
    .min(1, "Hesap kodu zorunlu")
    .max(191, "Hesap kodu çok uzun"),
  name: z
    .string()
    .trim()
    .min(1, "Hesap adı zorunlu")
    .max(191, "Hesap adı çok uzun"),
  externalId: z.string().trim().max(191),
  defaultCurrency: z.enum(["TRY", "EUR"], {
    message: "Para birimi TRY veya EUR olmalı",
  }),
});

export async function kanalHesabiEkle(
  _oncekiDurum: KanalHesabiDurumu,
  formData: FormData,
): Promise<KanalHesabiDurumu> {
  const sonuc = hesapSemasi.safeParse({
    channelId: String(formData.get("channelId") ?? ""),
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    externalId: String(formData.get("externalId") ?? ""),
    defaultCurrency: String(formData.get("defaultCurrency") ?? ""),
  });

  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }

  const { channelId, code, name, externalId, defaultCurrency } = sonuc.data;

  const kanal = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!kanal) {
    return { hatalar: ["Seçilen kanal bulunamadı."] };
  }

  // Kod, kanal içinde benzersiz (şemadaki @@unique([channelId, code])).
  const mevcut = await prisma.channelAccount.findFirst({
    where: { channelId, code },
  });
  if (mevcut) {
    return {
      hatalar: [`"${kanal.name}" kanalında "${code}" kodlu hesap zaten var.`],
    };
  }

  try {
    await prisma.channelAccount.create({
      data: {
        channelId,
        code,
        name,
        externalId: externalId || null,
        defaultCurrency,
      },
    });
  } catch (e) {
    console.error("[kanal hesabi] beklenmeyen hata:", e);
    return { hatalar: ["Hesap eklenemedi, beklenmeyen bir hata oluştu."] };
  }

  revalidatePath("/ayarlar/kanallar");
  // Alım formu hesap listesini buradan alıyor.
  revalidatePath("/alimlar/yeni");
  return { basari: `"${kanal.name} — ${name}" hesabı eklendi.` };
}

/** Hesap silinmez; alımlarla ilişkili olabilir. Sadece aktif/pasif yapılır. */
export async function kanalHesabiDurumDegistir(
  _oncekiDurum: KanalHesabiDurumu,
  formData: FormData,
): Promise<KanalHesabiDurumu> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: ["Hesap kimliği bulunamadı."] };

  const hesap = await prisma.channelAccount.findUnique({ where: { id } });
  if (!hesap) return { hatalar: ["Hesap bulunamadı."] };

  await prisma.channelAccount.update({
    where: { id },
    data: { isActive: !hesap.isActive },
  });

  revalidatePath("/ayarlar/kanallar");
  revalidatePath("/alimlar/yeni");
  return {
    basari: hesap.isActive
      ? `"${hesap.name}" pasife alındı.`
      : `"${hesap.name}" tekrar aktif.`,
  };
}
