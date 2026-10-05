"use server";

import { YONETIM_YOLU } from "@/lib/oturum-imza";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  firmaAc,
  firmaAcilisiniTamamla,
  type FirmaAcilisHatasi,
} from "@/lib/firma-acilisi";
import { firmaAdiniDegistir, firmaKullanicisininParolasiniSifirla } from "@/lib/firma-karti";
import { uyelikDurumunuDegistir } from "@/lib/kullanici-uyeligi";
import { yonetimEylemi } from "@/lib/yonetim-oturumu";
import { askiyaAl, askiyiKaldir, firmaYoneticiEpostalari, uyariBaslat, uyariKaldir, UYARI_EN_AZ_GUN, UYARI_EN_COK_GUN } from "@/lib/aski-sureci";
import { bicimlendirici } from "@/lib/bicim";
import { epostaGonder, type EpostaTuru } from "@/lib/eposta";
import { sistemPrisma } from "@/lib/prisma";
import { UYGULAMA } from "@/lib/uygulama";

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

/**
 * Listedeki «Aktifleştir» — ASKIYI KALDIRIR (yöneticilere e-posta gider).
 * ⚠ 05.10.2026: sebepsiz pasife alma KALKTI; pasife alma yalnız firma
 * kartındaki «Askı süreci»nden, sebeple (`askiyaAlEylemi`).
 */
export async function firmaDurumu(firmaId: string, aktif: boolean): Promise<{ hata?: string; tamam?: string }> {
  const t = await getTranslations("Yonetim");
  const k = await yonetimEylemi();
  if (!k) return { hata: t(HATA_ANAHTARI.YETKISIZ) };
  if (!aktif) return { hata: t("hataSebepGerekli") };
  const sonuc = await askiyiKaldir(firmaId, k.id);
  revalidatePath(`${YONETIM_YOLU}/firmalar`);
  revalidatePath(`${YONETIM_YOLU}/firmalar/${firmaId}`);
  if (sonuc.durum === "HATA") return { hata: t(sonuc.hata === "YARIM_KURULUM" ? "hataYarimKurulum" : "hataFirmaYok") };
  const e = await yoneticilereBildir(firmaId, "ASKI_KALDIRILDI", {}, k.id);
  return { tamam: `${t("aktiflestirildi")} ${epostaOzeti(t, e)}` };
}

/* ═══ ASKI SÜRECİ (kullanıcı kararı 05.10.2026: uyarı → süre → onaylı askı) ═══ */

export type AskiEylemDurumu = { hatalar?: string[]; tamam?: string };

const SEBEP_HATA_ANAHTARI: Record<string, string> = {
  SEBEP_GECERSIZ: "hataSebepGecersiz",
  ACIKLAMA_ZORUNLU: "hataAciklamaZorunlu",
  ACIKLAMA_UZUN: "hataAciklamaUzun",
  GUN_GECERSIZ: "hataGunGecersiz",
  FIRMA_YOK: "hataFirmaYok",
  FIRMA_AKTIF_DEGIL: "hataFirmaAktifDegil",
  YARIM_KURULUM: "hataYarimKurulum",
  SEBEP_YOK: "hataSebepGerekli",
  UYARI_YOK: "hataUyariYok",
};

type EpostaOzet = { gonderilen: number; gonderilemeyen: number; ayarYok: boolean; aliciYok: boolean };

/** Bildirim metni sözlükten; alıcı firmanın aktif tam yetkili üyeleri. Fırlatmaz. */
async function yoneticilereBildir(
  firmaId: string,
  tur: EpostaTuru,
  d: { sebep?: string; aciklama?: string | null; sonGun?: Date },
  yapanId: string,
): Promise<EpostaOzet> {
  const te = await getTranslations("EpostaAski");
  const ts = await getTranslations("AskiSebebi");
  const bicim = await bicimlendirici();
  // SISTEM: bildirimde firmanın adı.
  const firma = await sistemPrisma.company.findUnique({ where: { id: firmaId }, select: { name: true } });
  const alicilar = await firmaYoneticiEpostalari(firmaId);
  const degerler = {
    uygulama: UYGULAMA.ad,
    firma: firma?.name ?? "",
    sebep: d.sebep ? ts(d.sebep) : "",
    aciklama: d.aciklama ?? "",
    tarih: d.sonGun ? bicim.tarih(d.sonGun) : "",
  };
  let gonderilen = 0;
  let gonderilemeyen = 0;
  let ayarYok = false;
  for (const kime of alicilar) {
    const s = await epostaGonder({ kime, konu: te(`${tur}.konu`, degerler), metin: te(`${tur}.metin`, degerler), tur, firmaId, yapanId });
    if (s.durum === "GONDERILDI") gonderilen++;
    else if (s.durum === "AYAR_YOK") ayarYok = true;
    else gonderilemeyen++;
  }
  return { gonderilen, gonderilemeyen, ayarYok, aliciYok: alicilar.length === 0 };
}

function epostaOzeti(t: Awaited<ReturnType<typeof getTranslations>>, e: EpostaOzet): string {
  if (e.aliciYok) return t("epostaAliciYok");
  if (e.ayarYok) return t("epostaAyarYok");
  return e.gonderilemeyen > 0
    ? t("epostaKismen", { gonderilen: e.gonderilen, gonderilemeyen: e.gonderilemeyen })
    : t("epostaGitti", { sayi: e.gonderilen });
}

export async function uyariBaslatEylemi(_onceki: AskiEylemDurumu, formData: FormData): Promise<AskiEylemDurumu> {
  const t = await getTranslations("Yonetim");
  const k = await yonetimEylemi();
  if (!k) return { hatalar: [t(HATA_ANAHTARI.YETKISIZ)] };
  const firmaId = String(formData.get("firmaId") ?? "");
  try {
    const aciklama = String(formData.get("aciklama") ?? "");
    const r = await uyariBaslat(firmaId, { sebep: String(formData.get("sebep") ?? ""), aciklama, gun: Number(formData.get("gun")) }, k.id);
    if (r.durum === "HATA") return { hatalar: [t(SEBEP_HATA_ANAHTARI[r.hata] ?? "hataKaydedilemedi", { enAz: UYARI_EN_AZ_GUN, enCok: UYARI_EN_COK_GUN })] };
    revalidatePath(`${YONETIM_YOLU}/firmalar`);
    revalidatePath(`${YONETIM_YOLU}/firmalar/${firmaId}`);
    const e = await yoneticilereBildir(firmaId, "ASKI_UYARI", { sebep: r.sebep, aciklama, sonGun: r.sonGun }, k.id);
    return { tamam: `${t("uyariBasladi")} ${epostaOzeti(t, e)}` };
  } catch (hata) {
    console.error("[aski uyari] beklenmeyen hata:", hata);
    return { hatalar: [t("hataKaydedilemedi")] };
  }
}

export async function uyariKaldirEylemi(firmaId: string): Promise<{ hata?: string; tamam?: string }> {
  const t = await getTranslations("Yonetim");
  const k = await yonetimEylemi();
  if (!k) return { hata: t(HATA_ANAHTARI.YETKISIZ) };
  try {
    const r = await uyariKaldir(firmaId, k.id);
    if (r.durum === "HATA") return { hata: t(SEBEP_HATA_ANAHTARI[r.hata]) };
    revalidatePath(`${YONETIM_YOLU}/firmalar`);
    revalidatePath(`${YONETIM_YOLU}/firmalar/${firmaId}`);
    const e = await yoneticilereBildir(firmaId, "ASKI_UYARI_KALDIRILDI", {}, k.id);
    return { tamam: `${t("uyariKaldirildi")} ${epostaOzeti(t, e)}` };
  } catch (hata) {
    console.error("[aski uyari kaldir] beklenmeyen hata:", hata);
    return { hata: t("hataKaydedilemedi") };
  }
}

export async function askiyaAlEylemi(_onceki: AskiEylemDurumu, formData: FormData): Promise<AskiEylemDurumu> {
  const t = await getTranslations("Yonetim");
  const k = await yonetimEylemi();
  if (!k) return { hatalar: [t(HATA_ANAHTARI.YETKISIZ)] };
  const firmaId = String(formData.get("firmaId") ?? "");
  try {
    const aciklama = String(formData.get("aciklama") ?? "");
    const r = await askiyaAl(firmaId, { sebep: String(formData.get("sebep") ?? ""), aciklama }, k.id);
    if (r.durum === "HATA") return { hatalar: [t(SEBEP_HATA_ANAHTARI[r.hata] ?? "hataKaydedilemedi")] };
    revalidatePath(`${YONETIM_YOLU}/firmalar`);
    revalidatePath(`${YONETIM_YOLU}/firmalar/${firmaId}`);
    const e = await yoneticilereBildir(firmaId, "ASKI_BASLADI", { sebep: r.sebep, aciklama }, k.id);
    return { tamam: `${t("pasifeAlindi")} ${epostaOzeti(t, e)}` };
  } catch (hata) {
    console.error("[aski] beklenmeyen hata:", hata);
    return { hatalar: [t("hataKaydedilemedi")] };
  }
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
