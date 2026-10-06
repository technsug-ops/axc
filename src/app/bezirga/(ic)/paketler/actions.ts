"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { paketIceriginiKaydet, paketKaydet, type PaketHatasi } from "@/lib/paket/yonetim";
import { yonetimEylemi } from "@/lib/yonetim-oturumu";

/**
 * PAKET EYLEMLERİ — süper admin (K303 ②). Her eylem yönetim kapısından geçer;
 * hata KODA çevrilir, ekran sözlükten yazar.
 */

export type PaketEylemDurumu = { hatalar?: string[]; tamam?: string };

const HATA: Record<PaketHatasi | "YETKISIZ", string> = {
  AD_BOS: "hataPaketAdBos",
  AD_VAR: "hataPaketAdVar",
  TUTAR_GECERSIZ: "hataOdemeTutar",
  PARA_BIRIMI_GECERSIZ: "hataOdemeParaBirimi",
  DONEM_GECERSIZ: "hataOdemeDonem",
  PAKET_YOK: "hataPaketYok",
  OZELLIK_GECERSIZ: "hataOzellikGecersiz",
  FIRMAYA_OZEL: "hataPaketFirmayaOzel",
  YETKISIZ: "hataYetkisiz",
};

function girdi(formData: FormData) {
  return {
    ad: String(formData.get("ad") ?? ""),
    aciklama: String(formData.get("aciklama") ?? ""),
    tutar: String(formData.get("tutar") ?? ""),
    paraBirimi: String(formData.get("paraBirimi") ?? ""),
    donem: String(formData.get("donem") ?? ""),
  };
}

export async function yeniPaketEylemi(_onceki: PaketEylemDurumu, formData: FormData): Promise<PaketEylemDurumu> {
  const t = await getTranslations("Yonetim");
  const k = await yonetimEylemi();
  if (!k) return { hatalar: [t(HATA.YETKISIZ)] };
  let id: string;
  try {
    const r = await paketKaydet(null, { ...girdi(formData), firmayaOzel: formData.get("firmayaOzel") === "on" }, k.id);
    if (r.durum === "HATA") return { hatalar: [t(HATA[r.hata])] };
    id = r.id;
  } catch (hata) {
    console.error("[paket ac] beklenmeyen hata:", hata);
    return { hatalar: [t("hataKaydedilemedi")] };
  }
  revalidatePath(`${YONETIM_YOLU}/paketler`);
  redirect(`${YONETIM_YOLU}/paketler/${id}`);
}

export async function paketBilgisiEylemi(_onceki: PaketEylemDurumu, formData: FormData): Promise<PaketEylemDurumu> {
  const t = await getTranslations("Yonetim");
  const k = await yonetimEylemi();
  if (!k) return { hatalar: [t(HATA.YETKISIZ)] };
  const id = String(formData.get("paketId") ?? "");
  try {
    const r = await paketKaydet(id, girdi(formData), k.id);
    if (r.durum === "HATA") return { hatalar: [t(HATA[r.hata])] };
    revalidatePath(`${YONETIM_YOLU}/paketler`);
    revalidatePath(`${YONETIM_YOLU}/paketler/${id}`);
    return { tamam: t("paketKaydedildi") };
  } catch (hata) {
    console.error("[paket bilgisi] beklenmeyen hata:", hata);
    return { hatalar: [t("hataKaydedilemedi")] };
  }
}

/** Paket içeriği — işaretli kutuların TAM kümesi. */
export async function paketIcerigiEylemi(paketId: string, secim: string[]): Promise<{ hata?: string; tamam?: string }> {
  const t = await getTranslations("Yonetim");
  const k = await yonetimEylemi();
  if (!k) return { hata: t(HATA.YETKISIZ) };
  try {
    const r = await paketIceriginiKaydet(paketId, secim, k.id);
    if (r.durum === "HATA") return { hata: t(HATA[r.hata]) };
    revalidatePath(`${YONETIM_YOLU}/paketler`);
    revalidatePath(`${YONETIM_YOLU}/paketler/${paketId}`);
    revalidatePath(`${YONETIM_YOLU}/firmalar`, "layout");
    return { tamam: r.eklenen.length + r.cikan.length === 0 ? t("degisiklikYok") : t("paketIcerigiKaydedildi", { eklenen: r.eklenen.length, cikan: r.cikan.length }) };
  } catch (hata) {
    console.error("[paket icerigi] beklenmeyen hata:", hata);
    return { hata: t("hataKaydedilemedi") };
  }
}
