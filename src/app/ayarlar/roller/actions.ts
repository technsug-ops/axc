"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";
import { izinTaninirMi, TUM_IZINLER } from "@/lib/yetki/izinler";

/**
 * ============================================================================
 *  ROL YÖNETİMİ
 * ----------------------------------------------------------------------------
 *  ROLLER VERİDİR, İZİN LİSTESİ KODDUR. Ekranda onay kutusu olarak görünen
 *  izinler `lib/yetki/izinler.ts`ten gelir; buraya gelen tanınmayan bir
 *  anahtar SESSİZCE ATILIR — uydurma bir izin adı veritabanına yazılmaz.
 *
 *  SİSTEM ROLÜ (SAHİP) KORUNUR: adı değişebilir ama silinemez, pasife
 *  alınamaz ve İZİNLERİ KISILAMAZ. Sahibin izinlerini kısmak, kimsenin
 *  giremediği bir sistem üretmenin en kolay yoludur.
 *
 *  ROL SİLİNMEZ, PASİFE ALINIR: geçmişte o rolle iş yapılmış olabilir ve
 *  üyelikler role bağlıdır (veritabanı da Restrict ile engelliyor).
 * ============================================================================
 */

export type RolDurumu = { hatalar?: string[] };

type Ceviri = (a: string, d?: Record<string, string | number>) => string;

function semaKur(t: Ceviri) {
  return z.object({
    name: z.string().trim().min(1, t("adZorunlu")).max(191, t("adCokUzun")),
  });
}

function tazele() {
  revalidatePath("/ayarlar/roller");
  revalidatePath("/ayarlar/kullanicilar");
}

/** Formdaki onay kutularından tanınan izinleri çıkarır. */
function izinleriTopla(formData: FormData): string[] {
  const secilen = formData.getAll("izinler").map(String);
  // TANINMAYAN ATILIR: ekrandan gelen liste kodla eşleşmiyorsa yazılmaz.
  return [...new Set(secilen.filter((i) => izinTaninirMi(i)))];
}

export async function rolEkle(
  _onceki: RolDurumu,
  formData: FormData,
): Promise<RolDurumu> {
  await yetkiIste("rol.yonet");
  const t = await getTranslations("Rol");

  const cozum = semaKur(t).safeParse({ name: formData.get("name") });
  if (!cozum.success) return { hatalar: cozum.error.issues.map((i) => i.message) };

  const mevcut = await prisma.role.findUnique({
    where: { name: cozum.data.name },
    select: { id: true },
  });
  if (mevcut) return { hatalar: [t("adZatenVar", { ad: cozum.data.name })] };

  const izinler = izinleriTopla(formData);
  // İZİNSİZ ROL AÇILMAZ: hiçbir şeye yetkisi olmayan bir rol, bir gün
  // birine atanıp "neden hiçbir şey göremiyorum" sorusu doğurur.
  if (izinler.length === 0) return { hatalar: [t("izinSecin")] };

  try {
    const enBuyuk = await prisma.role.aggregate({ _max: { sortOrder: true } });
    await prisma.role.create({
      data: {
        name: cozum.data.name,
        sortOrder: (enBuyuk._max.sortOrder ?? 0) + 10,
        izinler: { create: izinler.map((permissionKey) => ({ permissionKey })) },
      },
    });
  } catch (e) {
    console.error("[rol ekle] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  tazele();
  return {};
}

export async function rolGuncelle(
  _onceki: RolDurumu,
  formData: FormData,
): Promise<RolDurumu> {
  await yetkiIste("rol.yonet");
  const t = await getTranslations("Rol");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kayitBulunamadi")] };

  const rol = await prisma.role.findUnique({
    where: { id },
    select: { isSystem: true, name: true },
  });
  if (!rol) return { hatalar: [t("kayitBulunamadi")] };

  const cozum = semaKur(t).safeParse({ name: formData.get("name") });
  if (!cozum.success) return { hatalar: cozum.error.issues.map((i) => i.message) };

  const cakisma = await prisma.role.findFirst({
    where: { name: cozum.data.name, NOT: { id } },
    select: { id: true },
  });
  if (cakisma) return { hatalar: [t("adZatenVar", { ad: cozum.data.name })] };

  const izinler = izinleriTopla(formData);
  if (izinler.length === 0) return { hatalar: [t("izinSecin")] };

  // SİSTEM ROLÜNÜN İZİNLERİ KISILAMAZ. Adı değişebilir — "Sahip" yerine
  // "Patron" denebilir — ama yetkisi düşerse kimse sisteme giremez.
  if (rol.isSystem) {
    const eksik = TUM_IZINLER.filter((i) => !izinler.includes(i));
    if (eksik.length > 0) {
      return { hatalar: [t("sistemRolIzinKisilamaz", { sayi: eksik.length })] };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.role.update({ where: { id }, data: { name: cozum.data.name } });
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.rolePermission.createMany({
        data: izinler.map((permissionKey) => ({ roleId: id, permissionKey })),
      });
    });
  } catch (e) {
    console.error("[rol guncelle] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  tazele();
  return {};
}

/** Pasife alma / geri açma. Sistem rolü pasife alınamaz. */
export async function rolDurumDegistir(
  _onceki: RolDurumu,
  formData: FormData,
): Promise<RolDurumu> {
  await yetkiIste("rol.yonet");
  const t = await getTranslations("Rol");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kayitBulunamadi")] };

  const rol = await prisma.role.findUnique({
    where: { id },
    select: {
      isActive: true,
      isSystem: true,
      name: true,
      _count: { select: { uyelikler: true } },
    },
  });
  if (!rol) return { hatalar: [t("kayitBulunamadi")] };

  if (rol.isSystem && rol.isActive) {
    return { hatalar: [t("sistemRolPasifeAlinamaz", { ad: rol.name })] };
  }

  // Kullanımdaki rol pasife alınırsa o kullanıcılar yetkisiz kalır —
  // sessizce olmaz, kaç kişiyi etkilediği söylenir.
  if (rol.isActive && rol._count.uyelikler > 0) {
    return {
      hatalar: [t("rolKullanimda", { ad: rol.name, sayi: rol._count.uyelikler })],
    };
  }

  try {
    await prisma.role.update({
      where: { id },
      data: { isActive: !rol.isActive },
    });
  } catch (e) {
    console.error("[rol durum] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  tazele();
  return {};
}
