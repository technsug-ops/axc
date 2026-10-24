"use server";

import { fiyatHafizasi, kiyasDisiSayisi, type FiyatHafizasi } from "@/lib/alim-fiyat-hafizasi";
import { alisKayitlari } from "@/lib/alim-fiyat-hafizasi-verisi";
import { izinVarMi } from "@/lib/yetki";

/**
 * ALIM FORMU — FİYAT HAFIZASI (K363 Faz 2-d). Kalem eklenince form bir kez sorar;
 * iki para birimi birden döner, form kalemin seçili birimini gösterir.
 * İzin `alim.yaz` (formun kendi izni) KENDİ gövdesinde. Hata KOD döner; tam
 * metin günlüğe (anayasa: yakalanmamış hata, yutulmuş hatanın kardeşidir).
 * ⚠ "use server": YALNIZ async fonksiyon dışa aktarılır.
 */
export type HafizaSonucu =
  | { tamam: true; TRY: FiyatHafizasi | null; EUR: FiyatHafizasi | null; kiyasDisi: { TRY: number; EUR: number } }
  | { tamam: false; hata: "YETKISIZ" | "HATA" };

export async function fiyatHafizasiEylemi(variantId: string, haricAlimId: string | null): Promise<HafizaSonucu> {
  if (!(await izinVarMi("alim.yaz"))) return { tamam: false, hata: "YETKISIZ" };
  try {
    const kayit = (await alisKayitlari({ variantIds: [variantId], haricAlimId })).get(variantId) ?? [];
    return {
      tamam: true,
      TRY: fiyatHafizasi(kayit, "TRY"),
      EUR: fiyatHafizasi(kayit, "EUR"),
      kiyasDisi: { TRY: kiyasDisiSayisi(kayit, "TRY"), EUR: kiyasDisiSayisi(kayit, "EUR") },
    };
  } catch (e) {
    console.error("[fiyatHafizasiEylemi] beklenmeyen hata:", e);
    return { tamam: false, hata: "HATA" };
  }
}
