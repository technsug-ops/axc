"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import type { IadeGeriAlmaNedeni } from "@/generated/prisma/enums";
import { DonemKorumasiHatasi, donemIsrariniOku } from "@/lib/donem-kapisi";
import { IADE_GERI_ALMA_NEDENLERI, iadeGeriAlmaImzasi, iadeGeriAlmaPlani, type IadeGeriAlmaEngeli } from "@/lib/iade-geri-alma";
import { iadeGeriAlmaOku, iadeyiGeriAl } from "@/lib/iade-geri-alma-veri";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

/**
 * İADEYİ GERİ AL — SUNUCU EYLEMLERİ (K44 · 2. adım). Önizle → onayla.
 * Onay, önizlemenin İMZASIYLA gelir; yazma anında plan yeniden kurulur.
 */

export type IadeGeriAlOnizleme =
  | {
      tamam: true;
      imza: string;
      satirlar: { urun: string; sku: string; adet: number }[];
      satisKariTazelenir: boolean;
    }
  | { tamam: false; hata: string };

export type IadeGeriAlSonucuEkrani = { tamam: true } | { tamam: false; hata: string; donem?: string; donemSatisSayisi?: number };

function nedenOku(ham: string): IadeGeriAlmaNedeni | null {
  return (IADE_GERI_ALMA_NEDENLERI as readonly string[]).includes(ham) ? (ham as IadeGeriAlmaNedeni) : null;
}

async function engelMetni(engel: IadeGeriAlmaEngeli, tukenen: string[] | undefined): Promise<string> {
  const t = await getTranslations("IadeGeriAl");
  if (engel === "PARTI_TUKENMIS") {
    const varyantlar = await prisma.productVariant.findMany({
      where: { id: { in: tukenen ?? [] } },
      select: { sku: true, product: { select: { name: true } } },
    });
    return t("engel_PARTI_TUKENMIS", { urunler: varyantlar.map((v) => `${v.product.name} (${v.sku})`).join(", ") });
  }
  return t(`engel_${engel}`);
}

export async function iadeGeriAlmayiOnizle(returnId: string, nedenHam: string, not: string): Promise<IadeGeriAlOnizleme> {
  await yetkiIste("iade.yaz");
  const o = await iadeGeriAlmaOku(prisma, returnId);
  const t = await getTranslations("IadeGeriAl");
  if (!o) return { tamam: false, hata: t("iadeYok") };
  const plan = iadeGeriAlmaPlani({
    geriAlindiMi: o.geriAlindiAt !== null,
    hareketler: o.hareketler,
    tazminatSayisi: o.tazminatSayisi,
    neden: nedenOku(nedenHam),
    not: not.trim() === "" ? null : not,
  });
  if (!plan.olur) return { tamam: false, hata: await engelMetni(plan.engel, plan.tukenenVaryantlar) };

  const varyantlar = await prisma.productVariant.findMany({
    where: { id: { in: [...new Set(plan.hareketler.map((h) => h.variantId))] } },
    select: { id: true, sku: true, product: { select: { name: true } } },
  });
  const ad = new Map(varyantlar.map((v) => [v.id, v]));
  /** Aynı varyantın hareketleri tek satırda toplanır — kullanıcı stoğun NET değişimini görür. */
  const net = new Map<string, number>();
  for (const h of plan.hareketler) net.set(h.variantId, (net.get(h.variantId) ?? 0) + h.quantityDelta);
  return {
    tamam: true,
    imza: iadeGeriAlmaImzasi(plan),
    satirlar: [...net].map(([id, adet]) => ({ urun: ad.get(id)?.product.name ?? "", sku: ad.get(id)?.sku ?? "", adet })),
    satisKariTazelenir: plan.satisKariTazelenir,
  };
}

export async function iadeGeriAlmayiUygula(formData: FormData): Promise<IadeGeriAlSonucuEkrani> {
  const baglam = await yetkiIste("iade.yaz");
  const t = await getTranslations("IadeGeriAl");
  const not = String(formData.get("not") ?? "");
  try {
    const s = await iadeyiGeriAl({
      returnId: String(formData.get("returnId") ?? ""),
      neden: nedenOku(String(formData.get("neden") ?? "")),
      not: not.trim() === "" ? null : not,
      onaylananImza: String(formData.get("imza") ?? ""),
      kullaniciId: baglam.kullaniciId,
      donemIsrari: donemIsrariniOku(formData),
    });
    switch (s.durum) {
      case "YOK":
        return { tamam: false, hata: t("iadeYok") };
      case "PLAN_DEGISTI":
        return { tamam: false, hata: t("planDegisti") };
      case "YARISTI":
        return { tamam: false, hata: t("engel_ZATEN_GERI_ALINDI") };
      case "ENGEL":
        return { tamam: false, hata: await engelMetni(s.plan.engel, s.plan.tukenenVaryantlar) };
      case "TAMAM":
        revalidatePath(`/satislar/${s.saleId}`);
        revalidatePath("/satislar");
        revalidatePath("/iadeler");
        revalidatePath("/stok");
        revalidatePath("/rapor");
        return { tamam: true };
    }
  } catch (e) {
    if (e instanceof DonemKorumasiHatasi) {
      return {
        tamam: false,
        hata: t("donemKapali", { donem: e.donem, sayi: e.satisSayisi }),
        donem: e.donem,
        donemSatisSayisi: e.satisSayisi,
      };
    }
    console.error("[iade-geri-al] beklenmeyen hata:", e);
    return { tamam: false, hata: t("yapilamadi") };
  }
}
