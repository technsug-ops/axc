"use server";

import { basariAdresi } from "@/lib/bildirim";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  KREDİ KARTI ACTION'LARI
 * ----------------------------------------------------------------------------
 *  GÜVENLİK: Burada tam kart numarası, CVV veya son kullanma tarihi
 *  İSTENMEZ ve SAKLANMAZ. Sadece son 4 hane tutulur. Bu bilinçli bir
 *  karardır (PCI-DSS); ileride de eklenmemeli.
 * ============================================================================
 */

export type KartDurumu = {
  hatalar?: string[];
  basari?: string;
};

/** Doğrulama mesajları; şema kurulmadan önce sözlükten çözülür. */
type KartMesajlari = {
  etiketZorunlu: string;
  son4Gecersiz: string;
  paraBirimiGecersiz: string;
  limitParaBirimiGecersiz: string;
  limitGecersiz: string;
  kesimGunuGecersiz: string;
  sonOdemeGunuGecersiz: string;
};

function kartSemasi(m: KartMesajlari) {
  return z.object({
    label: z.string().trim().min(1, m.etiketZorunlu).max(191),
    bankName: z.string().trim().max(191),
    last4: z
      .string()
      .trim()
      .regex(/^\d{4}$/, m.son4Gecersiz),
    holderName: z.string().trim().max(191),
    currency: z.enum(["TRY", "EUR"], {
      message: m.paraBirimiGecersiz,
    }),
    creditLimitAmount: z.string().trim(),
    creditLimitCurrency: z.enum(["TRY", "EUR"], {
      message: m.limitParaBirimiGecersiz,
    }),
    statementDay: z.string().trim(),
    dueDay: z.string().trim(),
  });
}

type KartVerisi = z.infer<ReturnType<typeof kartSemasi>>;

/** "1.234,56" ya da "1234.56" kabul eder. Boşsa null döner. */
function tutarAyristir(ham: string): number | null | "hatali" {
  if (!ham) return null;
  const temiz = ham.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const sayi = Number(temiz);
  if (!Number.isFinite(sayi) || sayi < 0) return "hatali";
  return sayi;
}

/** Ayın günü: 1-31. Boşsa null. */
function gunAyristir(ham: string): number | null | "hatali" {
  if (!ham) return null;
  const sayi = Number(ham);
  if (!Number.isInteger(sayi) || sayi < 1 || sayi > 31) return "hatali";
  return sayi;
}

/** Sözlükten mesajları çözüp şemayı kurar. */
async function kartHazirla() {
  const t = await getTranslations("Kart");

  const mesajlar: KartMesajlari = {
    etiketZorunlu: t("etiketZorunlu"),
    son4Gecersiz: t("son4Gecersiz"),
    paraBirimiGecersiz: t("paraBirimiGecersiz"),
    limitParaBirimiGecersiz: t("limitParaBirimiGecersiz"),
    limitGecersiz: t("limitGecersiz"),
    kesimGunuGecersiz: t("kesimGunuGecersiz"),
    sonOdemeGunuGecersiz: t("sonOdemeGunuGecersiz"),
  };

  return { t, mesajlar, sema: kartSemasi(mesajlar) };
}

function formuOku(sema: ReturnType<typeof kartSemasi>, formData: FormData) {
  return sema.safeParse({
    label: String(formData.get("label") ?? ""),
    bankName: String(formData.get("bankName") ?? ""),
    last4: String(formData.get("last4") ?? ""),
    holderName: String(formData.get("holderName") ?? ""),
    currency: String(formData.get("currency") ?? ""),
    creditLimitAmount: String(formData.get("creditLimitAmount") ?? ""),
    creditLimitCurrency: String(formData.get("creditLimitCurrency") ?? "TRY"),
    statementDay: String(formData.get("statementDay") ?? ""),
    dueDay: String(formData.get("dueDay") ?? ""),
  });
}

type KartAlanlari = {
  label: string;
  bankName: string | null;
  last4: string;
  holderName: string | null;
  currency: "TRY" | "EUR";
  creditLimitAmount: number | null;
  creditLimitCurrency: "TRY" | "EUR" | null;
  statementDay: number | null;
  dueDay: number | null;
};

function alanlariHazirla(
  veri: KartVerisi,
  m: KartMesajlari,
): { alanlar: KartAlanlari } | { hatalar: string[] } {
  const hatalar: string[] = [];

  const limit = tutarAyristir(veri.creditLimitAmount);
  if (limit === "hatali") hatalar.push(m.limitGecersiz);

  const kesim = gunAyristir(veri.statementDay);
  if (kesim === "hatali") hatalar.push(m.kesimGunuGecersiz);

  const sonOdeme = gunAyristir(veri.dueDay);
  if (sonOdeme === "hatali") hatalar.push(m.sonOdemeGunuGecersiz);

  if (hatalar.length) return { hatalar };

  return {
    alanlar: {
      label: veri.label,
      bankName: veri.bankName || null,
      last4: veri.last4,
      holderName: veri.holderName || null,
      currency: veri.currency,
      creditLimitAmount: limit as number | null,
      creditLimitCurrency: limit === null ? null : veri.creditLimitCurrency,
      statementDay: kesim as number | null,
      dueDay: sonOdeme as number | null,
    },
  };
}

// ---------------------------------------------------------------------------

export async function kartOlustur(
  _oncekiDurum: KartDurumu,
  formData: FormData,
): Promise<KartDurumu> {
  const { t, mesajlar, sema } = await kartHazirla();

  const sonuc = formuOku(sema, formData);
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }

  const hazirlik = alanlariHazirla(sonuc.data, mesajlar);
  if ("hatalar" in hazirlik) return hazirlik;

  let yeniId: string;
  try {
    const kart = await prisma.creditCard.create({
      data: hazirlik.alanlar,
      select: { id: true },
    });
    yeniId = kart.id;
  } catch (e) {
    console.error("[kart] beklenmeyen hata:", e);
    return { hatalar: [t("eklenemedi")] };
  }

  revalidatePath("/kartlar");
  revalidatePath("/alimlar/yeni");
  redirect(basariAdresi(`/kartlar/${yeniId}`, "eklendi"));
}

export async function kartGuncelle(
  _oncekiDurum: KartDurumu,
  formData: FormData,
): Promise<KartDurumu> {
  const { t, mesajlar, sema } = await kartHazirla();

  const kartId = String(formData.get("id") ?? "");
  if (!kartId) return { hatalar: [t("kimlikBulunamadi")] };

  const sonuc = formuOku(sema, formData);
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }

  const hazirlik = alanlariHazirla(sonuc.data, mesajlar);
  if ("hatalar" in hazirlik) return hazirlik;

  try {
    await prisma.creditCard.update({
      where: { id: kartId },
      data: hazirlik.alanlar,
    });
  } catch (e) {
    console.error("[kart] beklenmeyen hata:", e);
    return { hatalar: [t("guncellenemedi")] };
  }

  revalidatePath("/kartlar");
  revalidatePath(`/kartlar/${kartId}`);
  revalidatePath("/alimlar/yeni");
  redirect(basariAdresi(`/kartlar/${kartId}`, "guncellendi"));
}

/**
 * Kart SİLİNMEZ — alımlarla ilişkili olduğu için veri bütünlüğünü bozar.
 * Kullanımdan kaldırmak için pasife alınır.
 */
export async function kartDurumDegistir(
  _oncekiDurum: KartDurumu,
  formData: FormData,
): Promise<KartDurumu> {
  const t = await getTranslations("Kart");

  const kartId = String(formData.get("id") ?? "");
  if (!kartId) return { hatalar: [t("kimlikBulunamadi")] };

  const kart = await prisma.creditCard.findUnique({ where: { id: kartId } });
  if (!kart) return { hatalar: [t("bulunamadi")] };

  await prisma.creditCard.update({
    where: { id: kartId },
    data: { isActive: !kart.isActive },
  });

  revalidatePath("/kartlar");
  revalidatePath(`/kartlar/${kartId}`);
  revalidatePath("/alimlar/yeni");

  // Sessiz başarı yasak (#5) — sonucu kullanıcıya söyle.
  return {
    basari: kart.isActive
      ? t("pasifeAlindi", { etiket: kart.label })
      : t("aktiflestirildi", { etiket: kart.label }),
  };
}
