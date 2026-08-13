"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { oturumdakiKullanici } from "@/lib/oturum";
import {
  EN_AZ_PAROLA_UZUNLUGU,
  parolaDogrula,
  parolaOzetle,
  parolaYeterliMi,
} from "@/lib/parola";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  PAROLA DEĞİŞTİRME
 * ----------------------------------------------------------------------------
 *  YETKİ İSTEMEZ ve bu BİLİNÇLİDİR: kullanıcı zaten giriş yapmış, kendi
 *  parolasını değiştiriyor. Bir izin şartı koysaydık, ilk girişte parolasını
 *  değiştirmek ZORUNDA olan operasyon elemanı bunu yapamazdı — yani sisteme
 *  hiç giremezdi.
 *
 *  Kendi kaydından başkasına dokunamaz: hedef OTURUMDAN gelir, formdan değil.
 *  Bu yüzden `yetki:dogrula` istisna listesindedir.
 * ============================================================================
 */

export type ParolaDurumu = { hatalar?: string[] };

export async function parolamiDegistir(
  _onceki: ParolaDurumu,
  formData: FormData,
): Promise<ParolaDurumu> {
  const t = await getTranslations("ParolaDegistir");

  const kullanici = await oturumdakiKullanici();
  if (!kullanici) return { hatalar: [t("oturumYok")] };

  const eski = String(formData.get("eski") ?? "");
  const yeni = String(formData.get("yeni") ?? "");
  const tekrar = String(formData.get("tekrar") ?? "");

  const kayit = await prisma.user.findUnique({
    where: { id: kullanici.id },
    select: { passwordHash: true },
  });
  if (!kayit) return { hatalar: [t("oturumYok")] };

  if (!(await parolaDogrula(eski, kayit.passwordHash))) {
    return { hatalar: [t("eskiYanlis")] };
  }
  if (!parolaYeterliMi(yeni)) {
    return { hatalar: [t("kisa", { uzunluk: EN_AZ_PAROLA_UZUNLUGU })] };
  }
  if (yeni !== tekrar) return { hatalar: [t("tekrarTutmuyor")] };
  if (yeni === eski) return { hatalar: [t("ayniParola")] };

  await prisma.user.update({
    where: { id: kullanici.id },
    data: {
      passwordHash: await parolaOzetle(yeni),
      mustChangePassword: false,
      // Parola değişti: TÜM oturumlar kapanır (kendi çerezi dahil).
      // Kullanıcı yeni parolasıyla tekrar girer — istenen davranış budur;
      // başka bir cihazda açık kalmış oturum yaşamaya devam etmemeli.
      sessionVersion: { increment: 1 },
    },
  });

  redirect("/giris?parola=degisti");
}
