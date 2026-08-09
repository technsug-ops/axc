"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export type KanalHesabiDurumu = {
  hatalar?: string[];
  basari?: string;
};

/** Şema, mesajlar çözüldükten sonra kurulur (getTranslations istek kapsamlı). */
function hesapSemasi(m: {
  kanalSecilmeli: string;
  kodZorunlu: string;
  kodCokUzun: string;
  adZorunlu: string;
  adCokUzun: string;
  paraBirimiGecersiz: string;
}) {
  return z.object({
    channelId: z.string().trim().min(1, m.kanalSecilmeli),
    code: z.string().trim().min(1, m.kodZorunlu).max(191, m.kodCokUzun),
    name: z.string().trim().min(1, m.adZorunlu).max(191, m.adCokUzun),
    externalId: z.string().trim().max(191),
    defaultCurrency: z.enum(["TRY", "EUR"], {
      message: m.paraBirimiGecersiz,
    }),
  });
}

export async function kanalHesabiEkle(
  _oncekiDurum: KanalHesabiDurumu,
  formData: FormData,
): Promise<KanalHesabiDurumu> {
  const t = await getTranslations("KanalHesabi");

  const sema = hesapSemasi({
    kanalSecilmeli: t("kanalSecilmeli"),
    kodZorunlu: t("kodZorunlu"),
    kodCokUzun: t("kodCokUzun"),
    adZorunlu: t("adZorunlu"),
    adCokUzun: t("adCokUzun"),
    paraBirimiGecersiz: t("paraBirimiGecersiz"),
  });

  const sonuc = sema.safeParse({
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
    return { hatalar: [t("kanalBulunamadi")] };
  }

  // Kod, kanal içinde benzersiz (şemadaki @@unique([channelId, code])).
  const mevcut = await prisma.channelAccount.findFirst({
    where: { channelId, code },
  });
  if (mevcut) {
    return {
      hatalar: [t("kodZatenVar", { kanal: kanal.name, kod: code })],
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
    return { hatalar: [t("eklenemedi")] };
  }

  revalidatePath("/ayarlar/kanallar");
  // Alım ve satış formları hesap listesini buradan alıyor; ikisi de
  // statik üretiliyor, tazelenmezse yeni hesap listede görünmez.
  revalidatePath("/alimlar/yeni");
  revalidatePath("/satislar/yeni");
  return { basari: t("eklendi", { kanal: kanal.name, ad: name }) };
}

/** Hesap silinmez; alımlarla ilişkili olabilir. Sadece aktif/pasif yapılır. */
export async function kanalHesabiDurumDegistir(
  _oncekiDurum: KanalHesabiDurumu,
  formData: FormData,
): Promise<KanalHesabiDurumu> {
  const t = await getTranslations("KanalHesabi");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const hesap = await prisma.channelAccount.findUnique({ where: { id } });
  if (!hesap) return { hatalar: [t("bulunamadi")] };

  await prisma.channelAccount.update({
    where: { id },
    data: { isActive: !hesap.isActive },
  });

  revalidatePath("/ayarlar/kanallar");
  revalidatePath("/alimlar/yeni");
  revalidatePath("/satislar/yeni");
  return {
    basari: hesap.isActive
      ? t("pasifeAlindi", { ad: hesap.name })
      : t("aktiflestirildi", { ad: hesap.name }),
  };
}
