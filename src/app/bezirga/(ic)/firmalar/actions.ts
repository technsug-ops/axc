"use server";

import { YONETIM_YOLU } from "@/lib/oturum-imza";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  firmaAc,
  firmaAcilisiniTamamla,
  firmaDurumunuDegistir,
  type FirmaAcilisHatasi,
} from "@/lib/firma-acilisi";
import { yonetimEylemi } from "@/lib/yonetim-oturumu";

/**
 * FİRMA YÖNETİMİ EYLEMLERİ (K303 4c-2). Her eylem yönetim kapısından geçer;
 * süper admin değilse YETKISIZ döner. Hata KODA çevrilir, metne değil
 * (anayasa) — ekran sabit eşlemeyle sözlükten yazar.
 */

export type YeniFirmaDurumu =
  | { durum?: undefined; hatalar?: string[] }
  | { durum: "ACILDI"; kod: string; yoneticiEposta: string; yeniKullanici: boolean; geciciParola: string | null };

const HATA_ANAHTARI: Record<FirmaAcilisHatasi | "YETKISIZ", string> = {
  AD_BOS: "hataAdBos",
  KOD_GECERSIZ: "hataKodGecersiz",
  KOD_VAR: "hataKodVar",
  EPOSTA_GECERSIZ: "hataEpostaGecersiz",
  YARIM_DEGIL: "hataYarimDegil",
  FIRMA_YOK: "hataFirmaYok",
  KURULUM_HATASI: "hataKurulum",
  YETKISIZ: "hataYetkisiz",
};

export async function yeniFirmaAc(_onceki: YeniFirmaDurumu, formData: FormData): Promise<YeniFirmaDurumu> {
  const t = await getTranslations("Yonetim");
  const k = await yonetimEylemi();
  if (!k) return { hatalar: [t(HATA_ANAHTARI.YETKISIZ)] };
  const sonuc = await firmaAc(
    {
      ad: String(formData.get("ad") ?? ""),
      kod: String(formData.get("kod") ?? ""),
      yoneticiEposta: String(formData.get("yoneticiEposta") ?? ""),
      yoneticiAd: String(formData.get("yoneticiAd") ?? ""),
    },
    k.id,
  );
  revalidatePath(`${YONETIM_YOLU}/firmalar`);
  if (sonuc.durum === "HATA") return { hatalar: [t(HATA_ANAHTARI[sonuc.hata])] };
  return { durum: "ACILDI", kod: sonuc.kod, yoneticiEposta: sonuc.yoneticiEposta, yeniKullanici: sonuc.yeniKullanici, geciciParola: sonuc.geciciParola };
}

export async function kurulumuTamamla(_onceki: YeniFirmaDurumu, formData: FormData): Promise<YeniFirmaDurumu> {
  const t = await getTranslations("Yonetim");
  const k = await yonetimEylemi();
  if (!k) return { hatalar: [t(HATA_ANAHTARI.YETKISIZ)] };
  const sonuc = await firmaAcilisiniTamamla(String(formData.get("firmaId") ?? ""), k.id);
  revalidatePath(`${YONETIM_YOLU}/firmalar`);
  if (sonuc.durum === "HATA") return { hatalar: [t(HATA_ANAHTARI[sonuc.hata])] };
  return { durum: "ACILDI", kod: sonuc.kod, yoneticiEposta: sonuc.yoneticiEposta, yeniKullanici: sonuc.yeniKullanici, geciciParola: sonuc.geciciParola };
}

export async function firmaDurumu(firmaId: string, aktif: boolean): Promise<{ hata?: string; tamam?: string }> {
  const t = await getTranslations("Yonetim");
  const k = await yonetimEylemi();
  if (!k) return { hata: t(HATA_ANAHTARI.YETKISIZ) };
  const sonuc = await firmaDurumunuDegistir(firmaId, aktif, k.id);
  revalidatePath(`${YONETIM_YOLU}/firmalar`);
  if (sonuc.durum === "HATA") return { hata: t(sonuc.hata === "YARIM_KURULUM" ? "hataYarimKurulum" : "hataFirmaYok") };
  return { tamam: t(aktif ? "aktiflestirildi" : "pasifeAlindi") };
}
