"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { EN_AZ_PAROLA_UZUNLUGU, parolaOzetle, parolaYeterliMi } from "@/lib/parola";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";
import { baskaSahipVarMi, baskaSahipVarMiKullanici } from "@/lib/yetki/koruma";

/**
 * ============================================================================
 *  KULLANICI YÖNETİMİ
 * ----------------------------------------------------------------------------
 *  PAROLAYI SAHİP ATAR (karar 13.08.2026): e-posta altyapısı yok, davet
 *  akışı kurmak çözdüğü sorundan büyük bir bağımlılık olurdu. Kullanıcı
 *  İLK GİRİŞTE parolasını değiştirmek zorunda kalır (`mustChangePassword`).
 *
 *  KULLANICI SİLİNMEZ, PASİFE ALINIR: stok hareketlerinde ve denetim izinde
 *  "kim yaptı" olarak duruyor. Silinseydi geçmiş sahipsiz kalırdı.
 *  (Hiç iz bırakmamış yeni bir kayıt istisnadır ama ekrandan yapılmaz —
 *  bugüne kadar tek örneği yazım hatasıydı ve elle temizlendi.)
 *
 *  ROL ATAMA TEK ADIMDA: kullanıcı eklenirken rol seçilir, ayrı bir
 *  "rol ata" adımı yoktur (kullanıcı kararı).
 * ============================================================================
 */

export type KullaniciDurumu = { hatalar?: string[] };

type Ceviri = (a: string, d?: Record<string, string | number>) => string;

function semaKur(t: Ceviri) {
  return z.object({
    email: z.string().trim().toLowerCase().email(t("epostaGecersiz")),
    name: z.string().trim().max(191, t("adCokUzun")),
    roleId: z.string().min(1, t("rolSecin")),
  });
}

function tazele() {
  revalidatePath("/ayarlar/kullanicilar");
}

export async function kullaniciEkle(
  _onceki: KullaniciDurumu,
  formData: FormData,
): Promise<KullaniciDurumu> {
  await yetkiIste("kullanici.yonet");
  const t = await getTranslations("Kullanici");

  const cozum = semaKur(t).safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    roleId: formData.get("roleId"),
  });
  if (!cozum.success) return { hatalar: cozum.error.issues.map((i) => i.message) };

  const parola = String(formData.get("password") ?? "");
  if (!parolaYeterliMi(parola)) {
    return { hatalar: [t("parolaKisa", { uzunluk: EN_AZ_PAROLA_UZUNLUGU })] };
  }

  const mevcut = await prisma.user.findUnique({
    where: { email: cozum.data.email },
    select: { id: true },
  });
  if (mevcut) return { hatalar: [t("epostaZatenVar", { eposta: cozum.data.email })] };

  const rol = await prisma.role.findUnique({
    where: { id: cozum.data.roleId },
    select: { id: true, isActive: true },
  });
  if (!rol || !rol.isActive) return { hatalar: [t("rolBulunamadi")] };

  const firma = await prisma.company.findFirst({
    where: { isActive: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!firma) return { hatalar: [t("firmaYok")] };

  try {
    await prisma.$transaction(async (tx) => {
      const kullanici = await tx.user.create({
        data: {
          email: cozum.data.email,
          name: cozum.data.name === "" ? null : cozum.data.name,
          passwordHash: await parolaOzetle(parola),
          // İLK GİRİŞTE DEĞİŞTİRME ZORUNLU: parolayı sahip belirledi,
          // kullanıcının kendi parolası olmalı.
          mustChangePassword: true,
        },
      });
      await tx.userCompanyRole.create({
        data: { userId: kullanici.id, companyId: firma.id, roleId: rol.id },
      });
    });
  } catch (e) {
    console.error("[kullanici ekle] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  tazele();
  return {};
}

/** Rol değiştirme — kendini kilitleme koruması burada. */
export async function kullaniciRolDegistir(
  _onceki: KullaniciDurumu,
  formData: FormData,
): Promise<KullaniciDurumu> {
  await yetkiIste("kullanici.yonet");
  const t = await getTranslations("Kullanici");

  const uyelikId = String(formData.get("uyelikId") ?? "");
  const yeniRolId = String(formData.get("roleId") ?? "");
  if (!uyelikId || !yeniRolId) return { hatalar: [t("kayitBulunamadi")] };

  const uyelik = await prisma.userCompanyRole.findUnique({
    where: { id: uyelikId },
    select: { roleId: true, user: { select: { email: true } } },
  });
  if (!uyelik) return { hatalar: [t("kayitBulunamadi")] };
  if (uyelik.roleId === yeniRolId) return {};

  const rol = await prisma.role.findUnique({
    where: { id: yeniRolId },
    select: { isActive: true },
  });
  if (!rol || !rol.isActive) return { hatalar: [t("rolBulunamadi")] };

  // SON SAHİBİN ROLÜ DÜŞÜRÜLEMEZ. Kontrol SUNUCUDA: düğmeyi gizlemek
  // yetmez, istek elle de kurulabilir.
  if (!(await baskaSahipVarMi(uyelikId))) {
    return { hatalar: [t("sonSahipRol", { eposta: uyelik.user.email })] };
  }

  try {
    await prisma.userCompanyRole.update({
      where: { id: uyelikId },
      data: { roleId: yeniRolId },
    });
  } catch (e) {
    console.error("[kullanici rol] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  tazele();
  return {};
}

/** Pasife alma / geri açma. */
export async function kullaniciDurumDegistir(
  _onceki: KullaniciDurumu,
  formData: FormData,
): Promise<KullaniciDurumu> {
  await yetkiIste("kullanici.yonet");
  const t = await getTranslations("Kullanici");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kayitBulunamadi")] };

  const kullanici = await prisma.user.findUnique({
    where: { id },
    select: { isActive: true, email: true },
  });
  if (!kullanici) return { hatalar: [t("kayitBulunamadi")] };

  // PASİFE ALMA da kilitleyebilir — aynı koruma.
  if (kullanici.isActive && !(await baskaSahipVarMiKullanici(id))) {
    return { hatalar: [t("sonSahipPasif", { eposta: kullanici.email })] };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        isActive: !kullanici.isActive,
        // Pasife alınan kullanıcının AÇIK OTURUMLARI da kapanır.
        // Yoksa jetonu 30 gün daha geçerli kalırdı.
        ...(kullanici.isActive ? { sessionVersion: { increment: 1 } } : {}),
      },
    });
  } catch (e) {
    console.error("[kullanici durum] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  tazele();
  return {};
}

/** Parola sıfırlama — sahip yeni parola verir, kullanıcı ilk girişte değiştirir. */
export async function kullaniciParolaSifirla(
  _onceki: KullaniciDurumu,
  formData: FormData,
): Promise<KullaniciDurumu> {
  await yetkiIste("kullanici.yonet");
  const t = await getTranslations("Kullanici");

  const id = String(formData.get("id") ?? "");
  const parola = String(formData.get("password") ?? "");
  if (!id) return { hatalar: [t("kayitBulunamadi")] };
  if (!parolaYeterliMi(parola)) {
    return { hatalar: [t("parolaKisa", { uzunluk: EN_AZ_PAROLA_UZUNLUGU })] };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash: await parolaOzetle(parola),
        mustChangePassword: true,
        // Parola değişti: eski jetonlar geçersiz.
        sessionVersion: { increment: 1 },
      },
    });
  } catch (e) {
    console.error("[parola sifirla] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  tazele();
  return {};
}
