"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { bicimlendirici } from "@/lib/bicim";
import { gunMetninden, isTakvimGunu, gunDegeri } from "@/lib/donem";
import { prisma } from "@/lib/prisma";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  GİDER İŞLEMLERİ
 * ----------------------------------------------------------------------------
 *  Gider bir DEFTER kaydı değildir (stok hareketi gibi dokunulmaz değil):
 *  yanlış girilen tutar düzeltilebilir, yanlış kayıt silinebilir. Ama silme
 *  dönem raporundaki rakamı değiştirdiği için onay diyaloğu ister (#6).
 *
 *  ŞABLON GİDER ÜRETMEZ: "bu ay için ekle" düğmesine basılmadan hiçbir kayıt
 *  oluşmaz. Sistem arkanızdan kayıt yazmaz (kullanıcı kararı 10.08.2026).
 * ============================================================================
 */

export type GiderDurumu = {
  hatalar?: string[];
  basari?: string;
};

type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

/** Formdan gelen "12.500,50" / "12500.5" -> 12500.5 */
function sayiyaCevir(ham: FormDataEntryValue | null): number {
  const metin = String(ham ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}\b)/g, "") // binlik ayıracı
    .replace(",", ".");
  return metin === "" ? NaN : Number(metin);
}

/** Tarih HARİÇ ortak alanlar — şablonun tarihi yoktur. */
function tutarSemasiKur(t: Ceviri) {
  return z.object({
    categoryId: z.string().min(1, t("kategoriZorunlu")),
    amount: z
      .number({ message: t("tutarSayiOlmali") })
      .refine((n) => Number.isFinite(n), t("tutarSayiOlmali"))
      .refine((n) => n > 0, t("tutarSifirdanBuyuk")),
    currency: z.enum(["TRY", "EUR"]),
    vatRate: z
      .number({ message: t("oranSayiOlmali") })
      .min(0, t("oranAralik"))
      .max(100, t("oranAralik")),
    description: z.string().trim().max(2000).optional(),
  });
}

function giderSemasiKur(t: Ceviri) {
  return tutarSemasiKur(t).extend({
    spentAt: z.string().min(1, t("tarihZorunlu")),
  });
}

function tazele() {
  revalidatePath("/giderler");
  revalidatePath("/giderler/sablonlar");
  revalidatePath("/rapor");
}

function formuOku(formData: FormData) {
  return {
    spentAt: String(formData.get("spentAt") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    amount: sayiyaCevir(formData.get("amount")),
    currency: String(formData.get("currency") ?? "TRY"),
    vatRate: sayiyaCevir(formData.get("vatRate")),
    description: String(formData.get("description") ?? ""),
  };
}

export async function giderEkle(
  _oncekiDurum: GiderDurumu,
  formData: FormData,
): Promise<GiderDurumu> {
  const t = await getTranslations("Gider");

  const sonuc = giderSemasiKur(t).safeParse(formuOku(formData));
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;

  const tarih = gunMetninden(veri.spentAt);
  if (!tarih) return { hatalar: [t("tarihGecersiz")] };

  const kategori = await prisma.expenseCategory.findUnique({
    where: { id: veri.categoryId },
    select: { id: true },
  });
  if (!kategori) return { hatalar: [t("kategoriBulunamadi")] };

  try {
    await prisma.expense.create({
      data: {
        spentAt: tarih,
        categoryId: veri.categoryId,
        amount: String(veri.amount),
        currency: veri.currency as Currency,
        vatRate: String(veri.vatRate),
        description: veri.description?.trim() || null,
      },
    });
  } catch (e) {
    console.error("[gider] eklenemedi:", e);
    return { hatalar: [t("eklenemedi")] };
  }

  tazele();
  return { basari: t("eklendi") };
}

export async function giderGuncelle(
  _oncekiDurum: GiderDurumu,
  formData: FormData,
): Promise<GiderDurumu> {
  const t = await getTranslations("Gider");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const sonuc = giderSemasiKur(t).safeParse(formuOku(formData));
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;

  const tarih = gunMetninden(veri.spentAt);
  if (!tarih) return { hatalar: [t("tarihGecersiz")] };

  const kayit = await prisma.expense.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!kayit) return { hatalar: [t("bulunamadi")] };

  try {
    await prisma.expense.update({
      where: { id },
      data: {
        spentAt: tarih,
        categoryId: veri.categoryId,
        amount: String(veri.amount),
        currency: veri.currency as Currency,
        vatRate: String(veri.vatRate),
        description: veri.description?.trim() || null,
      },
    });
  } catch (e) {
    console.error("[gider] guncellenemedi:", e);
    return { hatalar: [t("guncellenemedi")] };
  }

  tazele();
  return { basari: t("guncellendi") };
}

/** YIKICI EYLEM — çağıran ekran onay diyaloğu göstermek zorundadır (#6). */
export async function giderSil(
  _oncekiDurum: GiderDurumu,
  formData: FormData,
): Promise<GiderDurumu> {
  const t = await getTranslations("Gider");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const kayit = await prisma.expense.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!kayit) return { hatalar: [t("bulunamadi")] };

  try {
    await prisma.expense.delete({ where: { id } });
  } catch (e) {
    console.error("[gider] silinemedi:", e);
    return { hatalar: [t("silinemedi")] };
  }

  tazele();
  return { basari: t("silindi") };
}

// ---------------------------------------------------------------------------
//  ŞABLONLAR
// ---------------------------------------------------------------------------

export async function sablonEkle(
  _oncekiDurum: GiderDurumu,
  formData: FormData,
): Promise<GiderDurumu> {
  const t = await getTranslations("Gider");

  const ad = String(formData.get("name") ?? "").trim();
  if (!ad) return { hatalar: [t("sablonAdZorunlu")] };

  const sonuc = tutarSemasiKur(t).safeParse(formuOku(formData));
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;

  const gunHam = String(formData.get("dayOfMonth") ?? "").trim();
  let gun: number | null = null;
  if (gunHam !== "") {
    gun = Number(gunHam);
    if (!Number.isInteger(gun) || gun < 1 || gun > 31) {
      return { hatalar: [t("sablonGunAralik")] };
    }
  }

  const kategori = await prisma.expenseCategory.findUnique({
    where: { id: veri.categoryId },
    select: { id: true },
  });
  if (!kategori) return { hatalar: [t("kategoriBulunamadi")] };

  try {
    await prisma.expenseTemplate.create({
      data: {
        name: ad,
        categoryId: veri.categoryId,
        amount: String(veri.amount),
        currency: veri.currency as Currency,
        vatRate: String(veri.vatRate),
        description: veri.description?.trim() || null,
        dayOfMonth: gun,
      },
    });
  } catch (e) {
    console.error("[gider sablonu] eklenemedi:", e);
    return { hatalar: [t("eklenemedi")] };
  }

  tazele();
  return { basari: t("sablonEklendi", { ad }) };
}

export async function sablonDurumDegistir(
  _oncekiDurum: GiderDurumu,
  formData: FormData,
): Promise<GiderDurumu> {
  const t = await getTranslations("Gider");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const kayit = await prisma.expenseTemplate.findUnique({ where: { id } });
  if (!kayit) return { hatalar: [t("sablonBulunamadi")] };

  await prisma.expenseTemplate.update({
    where: { id },
    data: { isActive: !kayit.isActive },
  });

  tazele();
  return {
    basari: kayit.isActive
      ? t("sablonPasif", { ad: kayit.name })
      : t("sablonAktif", { ad: kayit.name }),
  };
}

/**
 * Şablondan BU AY için gider üretir.
 *
 * ÇİFT KAYIT KORUMASI: aynı şablondan bu ay içinde zaten bir gider varsa
 * yenisi YAZILMAZ ve neden yazılmadığı söylenir (#5). Kirayı iki kez girip
 * ayı 12.000 TL yanlış görmek, sessizce olabilecek en pahalı hatalardan
 * biridir.
 *
 * Tarih: şablonda "ayın kaçı" yazıyorsa bu ayın o günü, yoksa BUGÜN —
 * ikisi de İŞ saat diliminde (Europe/Istanbul) çözülür.
 */
export async function sablondanEkle(
  _oncekiDurum: GiderDurumu,
  formData: FormData,
): Promise<GiderDurumu> {
  const t = await getTranslations("Gider");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const sablon = await prisma.expenseTemplate.findUnique({ where: { id } });
  if (!sablon) return { hatalar: [t("sablonBulunamadi")] };
  if (!sablon.isActive) return { hatalar: [t("sablonPasifNotu")] };

  const bugun = isTakvimGunu(new Date());
  const ayBasi = gunDegeri({ yil: bugun.yil, ay: bugun.ay, gun: 1 });
  const sonrakiAyBasi = gunDegeri(
    bugun.ay === 12
      ? { yil: bugun.yil + 1, ay: 1, gun: 1 }
      : { yil: bugun.yil, ay: bugun.ay + 1, gun: 1 },
  );

  const zatenVar = await prisma.expense.findFirst({
    where: {
      templateId: sablon.id,
      spentAt: { gte: ayBasi, lt: sonrakiAyBasi },
    },
    select: { id: true },
  });
  if (zatenVar) {
    return { hatalar: [t("sablonZatenEklendi", { ad: sablon.name })] };
  }

  // Şablonda 31 yazıp ay 30 çekiyorsa ayın son gününe yaslanır.
  let gun = bugun.gun;
  if (sablon.dayOfMonth) {
    const ayinSonGunu = new Date(sonrakiAyBasi.getTime() - 1).getUTCDate();
    gun = Math.min(sablon.dayOfMonth, ayinSonGunu);
  }

  try {
    await prisma.expense.create({
      data: {
        spentAt: gunDegeri({ yil: bugun.yil, ay: bugun.ay, gun }),
        categoryId: sablon.categoryId,
        amount: sablon.amount,
        currency: sablon.currency,
        vatRate: sablon.vatRate,
        description: sablon.description ?? sablon.name,
        templateId: sablon.id,
      },
    });
  } catch (e) {
    console.error("[gider sablonu] gider uretilemedi:", e);
    return { hatalar: [t("eklenemedi")] };
  }

  tazele();
  // Para biçimi dil altyapısından geçer — elle biçimlendirme yasak.
  const bicim = await bicimlendirici();
  return {
    basari: t("sablondanEklendi", {
      ad: sablon.name,
      tutar: bicim.para(sablon.amount, sablon.currency),
    }),
  };
}
