"use server";

import { revalidatePath } from "next/cache";

import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import {
  ozelGunAktifDegistir,
  ozelGunEkle,
  ozelGunGuncelle,
  ozelGunSil,
  tarihEkle,
  tarihGuncelle,
  tarihSil,
  type GunGirdisi,
  type TarihGirdisi,
  type YazHatasi,
} from "@/lib/ozel-gun/ozel-gun-yaz";
import { izinVarMi } from "@/lib/yetki";

/**
 * ============================================================================
 *  ÖZEL GÜN TAKVİMİ EYLEMLERİ (K363 Faz 2-b)
 * ----------------------------------------------------------------------------
 *  Çekirdek `lib/ozel-gun/ozel-gun-yaz.ts`. İzin `ayar.yaz`, eylemin KENDİ
 *  gövdesinde sorulur. Hata KOD döner, metne ekran çevirir; beklenmeyen hata
 *  TAM günlüğe (anayasa: yakalanmamış hata, yutulmuş hatanın kardeşidir).
 *  ⚠ "use server": YALNIZ async fonksiyon dışa aktarılır.
 * ============================================================================
 */

export type EylemSonucu = { tamam: true } | { tamam: false; hata: YazHatasi | "YETKISIZ" | "HATA" };

function yenile() {
  revalidatePath("/ayarlar/ozel-gunler");
  revalidatePath("/rapor/alim-rehberi");
}

async function sar(ad: string, is: () => Promise<{ tamam: true } | { tamam: false; hata: YazHatasi }>): Promise<EylemSonucu> {
  try {
    if (!(await izinVarMi("ayar.yaz"))) return { tamam: false, hata: "YETKISIZ" };
    const s = await is();
    if (!s.tamam) return s;
    yenile();
    return { tamam: true };
  } catch (e) {
    console.error(`[${ad}] beklenmeyen hata:`, e);
    return { tamam: false, hata: "HATA" };
  }
}

export async function ozelGunEkleEylemi(g: GunGirdisi, t: TarihGirdisi): Promise<EylemSonucu> {
  return sar("ozelGunEkle", () => ozelGunEkle(g, t));
}

export async function ozelGunGuncelleEylemi(id: string, g: GunGirdisi): Promise<EylemSonucu> {
  return sar("ozelGunGuncelle", () => ozelGunGuncelle(id, g));
}

export async function ozelGunAktifEylemi(id: string, aktif: boolean): Promise<EylemSonucu> {
  return sar("ozelGunAktif", () => ozelGunAktifDegistir(id, aktif));
}

export async function ozelGunSilEylemi(id: string): Promise<EylemSonucu> {
  return sar("ozelGunSil", () => ozelGunSil(id, gunDegeri(isTakvimGunu(new Date()))));
}

export async function tarihEkleEylemi(ozelGunId: string, t: TarihGirdisi): Promise<EylemSonucu> {
  return sar("tarihEkle", () => tarihEkle(ozelGunId, t));
}

export async function tarihGuncelleEylemi(tarihId: string, t: TarihGirdisi): Promise<EylemSonucu> {
  return sar("tarihGuncelle", () => tarihGuncelle(tarihId, t));
}

export async function tarihSilEylemi(tarihId: string): Promise<EylemSonucu> {
  return sar("tarihSil", () => tarihSil(tarihId));
}
