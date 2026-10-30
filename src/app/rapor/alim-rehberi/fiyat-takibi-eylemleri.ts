"use server";

import { revalidatePath } from "next/cache";

import { alimHedefiAktif, alimHedefiSil, alimHedefiYaz, type HedefYazHatasi } from "@/lib/alim-hedefi-verisi";
import { izinVarMi } from "@/lib/yetki";

/**
 * ============================================================================
 *  FİYAT TAKİBİ EYLEMLERİ (K363 Faz 3-d)
 * ----------------------------------------------------------------------------
 *  Çekirdek `lib/alim-hedefi-verisi.ts`. İzin `alim.yaz`, eylemin KENDİ
 *  gövdesinde sorulur. Hata KOD döner, metne ekran çevirir; beklenmeyen hata
 *  TAM günlüğe (anayasa: yakalanmamış hata, yutulmuş hatanın kardeşidir).
 *  ⚠ "use server": YALNIZ async fonksiyon dışa aktarılır.
 * ============================================================================
 */

export type HedefEylemSonucu = { tamam: true } | { tamam: false; hata: HedefYazHatasi | "YETKISIZ" | "HATA" };

const YETKISIZ = { tamam: false, hata: "YETKISIZ" } as const;

async function sar(ad: string, is: () => Promise<{ tamam: true } | { tamam: false; hata: HedefYazHatasi }>): Promise<HedefEylemSonucu> {
  try {
    const s = await is();
    if (!s.tamam) return s;
    revalidatePath("/rapor/alim-rehberi");
    return { tamam: true };
  } catch (e) {
    console.error(`[${ad}] beklenmeyen hata:`, e);
    return { tamam: false, hata: "HATA" };
  }
}

export async function hedefYazEylemi(variantId: string, fiyat: string): Promise<HedefEylemSonucu> {
  if (!(await izinVarMi("alim.yaz"))) return YETKISIZ;
  return sar("alimHedefiYaz", () => alimHedefiYaz(variantId, fiyat));
}

export async function hedefAktifEylemi(id: string, aktif: boolean): Promise<HedefEylemSonucu> {
  if (!(await izinVarMi("alim.yaz"))) return YETKISIZ;
  return sar("alimHedefiAktif", () => alimHedefiAktif(id, aktif));
}

export async function hedefSilEylemi(id: string): Promise<HedefEylemSonucu> {
  if (!(await izinVarMi("alim.yaz"))) return YETKISIZ;
  return sar("alimHedefiSil", () => alimHedefiSil(id));
}
