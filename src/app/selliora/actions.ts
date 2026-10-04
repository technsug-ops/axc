"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { girisKilidi } from "@/lib/giris-kilidi";
import { yakinBasarisizDenemeler } from "@/lib/giris-kilidi-okuma";
import { izYaz } from "@/lib/iz";
import { parolaDogrula } from "@/lib/parola";
import { sistemPrisma } from "@/lib/prisma";
import { yonetimOturumuAc, yonetimOturumuKapat } from "@/lib/yonetim-oturumu";

export type YonetimGirisDurumu = { hatalar?: string[] };

/**
 * SELLİORA YÖNETİM GİRİŞİ (K303 4c-2, kullanıcı kararı 04.10.2026) — yalnız
 * e-posta + parola, yalnız SÜPER ADMİN. Firma girişinin kurallarının aynısı:
 * tek hata mesajı (süper admin olmayan biri de aynı mesajı alır — hangi
 * hesabın yönetici olduğu sızmaz), kullanıcı yoksa da parola denenir
 * (süre sızmasın), kaba kuvvet kilidi aynı firmalar-üstü okumadan.
 */
const SAHTE_OZET =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export async function yonetimGirisYap(
  _onceki: YonetimGirisDurumu,
  formData: FormData,
): Promise<YonetimGirisDurumu> {
  const t = await getTranslations("Yonetim");
  const eposta = String(formData.get("email") ?? "").trim().toLocaleLowerCase("tr");
  const parola = String(formData.get("password") ?? "");
  if (!eposta) return { hatalar: [t("epostaZorunlu")] };
  if (!parola) return { hatalar: [t("parolaZorunlu")] };

  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "bilinmiyor";
  const simdi = new Date();
  const kilit = girisKilidi(await yakinBasarisizDenemeler(eposta, ip, simdi), simdi);
  if (kilit.kilitli) {
    const dakika = Math.max(1, Math.ceil((kilit.acilis.getTime() - simdi.getTime()) / 60_000));
    return { hatalar: [t("cokFazlaDeneme", { dakika })] };
  }

  // SISTEM: kullanıcı ve süper admin işareti firmalar-üstüdür.
  const kullanici = await sistemPrisma.user.findUnique({
    where: { email: eposta },
    select: { id: true, passwordHash: true, isActive: true, isSuperAdmin: true },
  });
  const gecti = await parolaDogrula(parola, kullanici?.passwordHash ?? SAHTE_OZET);

  if (!kullanici || !kullanici.isActive || !kullanici.isSuperAdmin || !gecti) {
    await izYaz({
      action: "GIRIS_BASARISIZ",
      targetType: "User",
      targetId: kullanici?.id ?? null,
      userId: null,
      detail: JSON.stringify({ eposta, ip, kapi: "yonetim" }),
    });
    return { hatalar: [t("hataliGiris")] };
  }

  await yonetimOturumuAc(kullanici.id);
  await izYaz({ action: "YONETIM_GIRIS", targetType: "User", targetId: kullanici.id, userId: kullanici.id, detail: JSON.stringify({ ip }) });
  redirect("/selliora/firmalar");
}

export async function yonetimCikisYap() {
  await yonetimOturumuKapat();
  redirect("/selliora");
}
