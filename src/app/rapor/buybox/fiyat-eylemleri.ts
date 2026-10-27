"use server";

import { izYaz } from "@/lib/iz";
import type { BuyboxKanali } from "@/lib/buybox";
import { fiyatSonucu, zararOnayiGerekirMi } from "@/lib/buybox-fiyat";
import { buyboxFiyatZemini, type FiyatZeminiSonucu } from "@/lib/buybox-fiyat-verisi";
import { izinVarMi, yetkiIste } from "@/lib/yetki";

import { hbStokFiyatGonder, tyStokFiyatGonder, type HbGonderimSonucu, type TyGonderimSonucu } from "../../kart/[variantId]/actions";

/**
 * ============================================================================
 *  BUYBOX FİYAT KUTUSU — SUNUCU EYLEMLERİ (K363 Faz 3-c)
 * ----------------------------------------------------------------------------
 *  ① Zemin: satır «Hesapla»ya basınca tek varyant × tek kanal zemini döner
 *    (kâr görme izni ister — kartla aynı kapı). Hesap tarayıcıda yapılır.
 *  ② Gönder: Trendyol YA DA Hepsiburada, YALNIZ fiyat (stok gönderilmez).
 *    Sunucu EKRANA GÜVENMEZ: zemini kendisi yeniden kurar, kârı kendisi
 *    hesaplar. NET-2 eksi ya da hesaplanamıyorsa açık onay ister; onay İZ
 *    BIRAKIR (`ZARARINA_FIYAT_ONAYI` — anayasa: «kullanıcı ısrar ederse istisna
 *    kaydedilir»). Asıl gönderim ürün kartının eylemleri (`tyStokFiyatGonder` ·
 *    `hbStokFiyatGonder`): yetki, kod çözümü, kanal cevabı ve `KANAL_GONDERIMI`
 *    izi oradan.
 *  ESKİ KURAL VE NİYE ÇEVRİLDİ: ilk teslimde (25.10.2026) yalnız Trendyol'a
 *  gönderiliyordu (`YALNIZ_TRENDYOL`) — istek «Trendyol'a göndersin» diyordu.
 *  Kullanıcı aynı gün «Hepsiburada'ya neden gönderemiyoruz» dedi; HB yazma
 *  01.10.2026'dan beri kartta canlı, aynı eylem buraya bağlandı.
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

/** Kanalın kendi sonucu kanal etiketiyle döner — ekran iki kanalın cevabını ayrı biçimde yazar. */
export type BuyboxGonderimSonucu =
  | { kanal: "TY"; sonuc: TyGonderimSonucu }
  | { kanal: "HB"; sonuc: HbGonderimSonucu }
  | { kanal: null; sonuc: { tamam: false; kod: "ZARAR_ONAYI_GEREKLI" | "KANAL_GECERSIZ" | "FIYAT_GECERSIZ" | "YETKI_YOK" | "ZEMIN_YOK" | "OKUNAMADI" } };

const KANAL_ADI: Record<BuyboxKanali, string> = { TY: "Trendyol", HB: "Hepsiburada" };

export async function buyboxFiyatGonder(
  variantId: string,
  kanal: BuyboxKanali,
  fiyat: number,
  zararOnayi: boolean,
): Promise<BuyboxGonderimSonucu> {
  const hata = (kod: "ZARAR_ONAYI_GEREKLI" | "KANAL_GECERSIZ" | "FIYAT_GECERSIZ" | "YETKI_YOK" | "ZEMIN_YOK" | "OKUNAMADI"): BuyboxGonderimSonucu => ({ kanal: null, sonuc: { tamam: false, kod } });
  await yetkiIste("kanal.yaz");
  if (!(await izinVarMi("satis.kar.gor"))) return hata("YETKI_YOK");
  if (kanal !== "TY" && kanal !== "HB") return hata("KANAL_GECERSIZ");
  if (!(Number.isFinite(fiyat) && fiyat > 0)) return hata("FIYAT_GECERSIZ");
  try {
    const an = new Date();
    const z = await buyboxFiyatZemini(variantId, kanal, an);
    if (!z.tamam) return hata("ZEMIN_YOK");
    /** Kâr SUNUCUDA yeniden hesaplanır — istemcinin söylediği NET kullanılmaz. */
    const s = fiyatSonucu(z.zemin, fiyat, an);
    if (zararOnayiGerekirMi(s)) {
      if (!zararOnayi) return hata("ZARAR_ONAYI_GEREKLI");
      await izYaz({
        action: "ZARARINA_FIYAT_ONAYI",
        targetType: "ProductVariant",
        targetId: variantId,
        detail: JSON.stringify({
          kanal: KANAL_ADI[kanal],
          ekran: "/rapor/buybox",
          fiyat,
          net1: s.net1,
          net2: s.net2,
          maliyet: z.zemin.maliyet,
          maliyetTabani: `rafta ${z.kural.etkin.maliyet} (KDV dahil)`,
          kargoDahil: s.kargoDahil,
          komisyonOrani: s.komisyonOrani,
        }),
      });
    }
    if (kanal === "TY") return { kanal: "TY", sonuc: await tyStokFiyatGonder(variantId, { stokGonder: false, fiyat }) };
    return { kanal: "HB", sonuc: await hbStokFiyatGonder(variantId, { stokGonder: false, fiyat }) };
  } catch (e) {
    console.error("[buybox-fiyat] gönderim düştü", variantId, kanal, fiyat, e);
    return hata("OKUNAMADI");
  }
}
