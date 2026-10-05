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
import { firmaAdiniDegistir, firmaKullanicisininParolasiniSifirla } from "@/lib/firma-karti";
import { uyelikDurumunuDegistir } from "@/lib/kullanici-uyeligi";
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

/* ═══ FİRMA KARTI (süper admin ① — 05.10.2026) ═══════════════════════════ */

export type FirmaAdiDurumu = { hatalar?: string[]; tamam?: string };

export async function firmaAdiDegistir(_onceki: FirmaAdiDurumu, formData: FormData): Promise<FirmaAdiDurumu> {
  const t = await getTranslations("Yonetim");
  const k = await yonetimEylemi();
  if (!k) return { hatalar: [t(HATA_ANAHTARI.YETKISIZ)] };
  const firmaId = String(formData.get("firmaId") ?? "");
  try {
    const sonuc = await firmaAdiniDegistir(firmaId, String(formData.get("ad") ?? ""), k.id);
    if (sonuc.durum === "HATA") return { hatalar: [t(sonuc.hata === "AD_BOS" ? "hataAdBos" : "hataFirmaYok")] };
    revalidatePath(`${YONETIM_YOLU}/firmalar`);
    revalidatePath(`${YONETIM_YOLU}/firmalar/${firmaId}`);
    return { tamam: t(sonuc.degisti ? "adKaydedildi" : "adAyni") };
  } catch (e) {
    console.error("[yonetim firma adi] beklenmeyen hata:", e);
    return { hatalar: [t("hataKaydedilemedi")] };
  }
}

export type ParolaSifirlamaDurumu = { hata?: string; geciciParola?: string; eposta?: string };

export async function firmaKullaniciParolaSifirla(firmaId: string, kullaniciId: string): Promise<ParolaSifirlamaDurumu> {
  const t = await getTranslations("Yonetim");
  const k = await yonetimEylemi();
  if (!k) return { hata: t(HATA_ANAHTARI.YETKISIZ) };
  try {
    const sonuc = await firmaKullanicisininParolasiniSifirla(firmaId, kullaniciId, k.id);
    if (sonuc.durum === "HATA") return { hata: t(sonuc.hata === "SUPER_ADMIN" ? "hataSuperAdminSifirlanmaz" : "hataUyeDegil") };
    revalidatePath(`${YONETIM_YOLU}/firmalar/${firmaId}`);
    return { geciciParola: sonuc.geciciParola, eposta: sonuc.eposta };
  } catch (e) {
    console.error("[yonetim parola sifirla] beklenmeyen hata:", e);
    return { hata: t("hataKaydedilemedi") };
  }
}

export type UyelikDurumuSonucu = { hata?: string; tamam?: string };

/** Kişiyi BU firmada pasife al / aktif et (öteki firmalarına dokunmaz). */
export async function firmaUyeligiDurumu(firmaId: string, kullaniciId: string): Promise<UyelikDurumuSonucu> {
  const t = await getTranslations("Yonetim");
  const k = await yonetimEylemi();
  if (!k) return { hata: t(HATA_ANAHTARI.YETKISIZ) };
  try {
    const sonuc = await uyelikDurumunuDegistir(firmaId, kullaniciId, k.id);
    if (sonuc.durum === "HATA") {
      return { hata: sonuc.hata === "SON_SAHIP" ? t("hataSonSahip", { eposta: sonuc.eposta ?? "" }) : t("hataUyeDegil") };
    }
    revalidatePath(`${YONETIM_YOLU}/firmalar/${firmaId}`);
    return { tamam: t(sonuc.aktif ? "uyelikAktiflesti" : "uyelikPasifeAlindi", { eposta: sonuc.eposta }) };
  } catch (e) {
    console.error("[yonetim uyelik durumu] beklenmeyen hata:", e);
    return { hata: t("hataKaydedilemedi") };
  }
}
