"use server";

import { izYaz } from "@/lib/iz";
import type { BuyboxKanali } from "@/lib/buybox";
import { fiyatSonucu, zararOnayiGerekirMi } from "@/lib/buybox-fiyat";
import { buyboxFiyatZemini, type FiyatZeminiSonucu } from "@/lib/buybox-fiyat-verisi";
import { izinVarMi, yetkiIste } from "@/lib/yetki";

import { tyStokFiyatGonder, type TyGonderimSonucu } from "../../kart/[variantId]/actions";

/**
 * ============================================================================
 *  BUYBOX FİYAT KUTUSU — SUNUCU EYLEMLERİ (K363 Faz 3-c)
 * ----------------------------------------------------------------------------
 *  ① Zemin: satır «Hesapla»ya basınca tek varyant × tek kanal zemini döner
 *    (kâr görme izni ister — kartla aynı kapı). Hesap tarayıcıda yapılır.
 *  ② Gönder: YALNIZ Trendyol ve YALNIZ fiyat (stok gönderilmez). Sunucu
 *    EKRANA GÜVENMEZ: zemini kendisi yeniden kurar, kârı kendisi hesaplar.
 *    NET-2 eksi ya da hesaplanamıyorsa açık onay ister; onay İZ BIRAKIR
 *    (`ZARARINA_FIYAT_ONAYI` — anayasa: «kullanıcı ısrar ederse istisna
 *    kaydedilir»). Asıl gönderim ürün kartının eylemi (`tyStokFiyatGonder`):
 *    yetki, barkod çözümü, TY cevabı ve `KANAL_GONDERIMI` izi oradan.
 *  ⚠ Hata KODLA döner (K57-③); ham hata ekrana basılmaz, sunucuda tam loglanır.
 * ============================================================================
 */

export type ZeminCevabi = FiyatZeminiSonucu | { tamam: false; kod: "YETKI_YOK" | "OKUNAMADI" };

export async function buyboxFiyatZeminiGetir(variantId: string, kanal: BuyboxKanali): Promise<ZeminCevabi> {
  if (!(await izinVarMi("satis.kar.gor"))) return { tamam: false, kod: "YETKI_YOK" };
  if (kanal !== "TY" && kanal !== "HB") return { tamam: false, kod: "KANAL_KODU_YOK" };
  try {
    return await buyboxFiyatZemini(variantId, kanal, new Date());
  } catch (e) {
    console.error("[buybox-fiyat] zemin okunamadı", variantId, kanal, e);
    return { tamam: false, kod: "OKUNAMADI" };
  }
}

export type BuyboxGonderimSonucu =
  | TyGonderimSonucu
  | { tamam: false; kod: "ZARAR_ONAYI_GEREKLI" | "YALNIZ_TRENDYOL" | "YETKI_YOK" | "ZEMIN_YOK" | "OKUNAMADI"; ayrinti?: string };

export async function buyboxFiyatGonder(
  variantId: string,
  kanal: BuyboxKanali,
  fiyat: number,
  zararOnayi: boolean,
): Promise<BuyboxGonderimSonucu> {
  await yetkiIste("kanal.yaz");
  if (!(await izinVarMi("satis.kar.gor"))) return { tamam: false, kod: "YETKI_YOK" };
  if (kanal !== "TY") return { tamam: false, kod: "YALNIZ_TRENDYOL" };
  if (!(Number.isFinite(fiyat) && fiyat > 0)) return { tamam: false, kod: "FIYAT_GECERSIZ" };
  try {
    const an = new Date();
    const z = await buyboxFiyatZemini(variantId, "TY", an);
    if (!z.tamam) return { tamam: false, kod: "ZEMIN_YOK" };
    /** Kâr SUNUCUDA yeniden hesaplanır — istemcinin söylediği NET kullanılmaz. */
    const s = fiyatSonucu(z.zemin, fiyat, an);
    if (zararOnayiGerekirMi(s)) {
      if (!zararOnayi) return { tamam: false, kod: "ZARAR_ONAYI_GEREKLI" };
      await izYaz({
        action: "ZARARINA_FIYAT_ONAYI",
        targetType: "ProductVariant",
        targetId: variantId,
        detail: JSON.stringify({
          kanal: "Trendyol",
          ekran: "/rapor/buybox",
          fiyat,
          net1: s.net1,
          net2: s.net2,
          maliyet: z.zemin.maliyet,
          maliyetTabani: "rafta en düşük parti (KDV dahil)",
          kargoDahil: s.kargoDahil,
          komisyonOrani: s.komisyonOrani,
        }),
      });
    }
    return await tyStokFiyatGonder(variantId, { stokGonder: false, fiyat });
  } catch (e) {
    console.error("[buybox-fiyat] gönderim düştü", variantId, fiyat, e);
    return { tamam: false, kod: "OKUNAMADI" };
  }
}
