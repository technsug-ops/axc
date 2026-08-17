"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { geriAlmaOnizle, geriAlmaUygula } from "@/lib/iptal-geri-alma-veri";
import type { GeriAlmaNedeni } from "@/lib/iptal-geri-alma";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  İPTALİ GERİ AL — SUNUCU EYLEMLERİ
 * ----------------------------------------------------------------------------
 *  ÖNİZLE (yazmaz) → UYGULA (imza doğrularsa yazar). Aynı desen düzenleme ve
 *  iptalde de kurulu.
 * ============================================================================
 */

/** Kilit 3 devredeyse ekranın yazacağı engelleyen hareket. */
export type Engelleyen = {
  tip: string;
  tarih: string;
  satisId: string | null;
  satisKodu: string | null;
};

export type GeriAlmaOnizlemeSonucu =
  | { tamam: true; stoktanCikacakAdet: number; imza: string }
  | { tamam: false; hata: string; engelleyenler?: Engelleyen[] };

export async function geriAlmayiOnizle(
  saleId: string,
  neden: GeriAlmaNedeni | null,
  aciklama: string | null,
): Promise<GeriAlmaOnizlemeSonucu> {
  /**
   * İPTALİ GERİ ALMA DA `satis.iptal`e BAĞLIDIR — ayrı izin AÇILMADI.
   * İptal edebilen geri de alabilmeli; ayrı tutulsaydı kendi hatasını
   * düzeltemeyen bir rol doğar ve iş yine sahibe düşerdi. Tam olarak
   * 17.08.2026'da yaşandı: gerçek satış yanlışlıkla iptal edildi ve
   * geri alma yolu yoktu.
   */
  await yetkiIste("satis.iptal");
  const t = await getTranslations("IptalGeriAl");

  const kurulum = await geriAlmaOnizle(saleId, neden, aciklama);
  if (kurulum === null) return { tamam: false, hata: t("satisYok") };

  const { plan, imza } = kurulum;
  if (!plan.olur) {
    return {
      tamam: false,
      hata: t(`engel_${plan.engel}`),
      /**
       * SESSİZ PASİF DÜĞME YOK: engelleyen hareketler ekrana taşınır ve
       * kullanıcı hangi kaydın engellediğini görüp ona gidebilir.
       */
      engelleyenler: plan.engelleyenler?.map((e) => ({
        tip: e.tip,
        tarih: e.tarih.toISOString(),
        satisId: e.satisId,
        satisKodu: e.satisKodu,
      })),
    };
  }

  return { tamam: true, stoktanCikacakAdet: plan.stoktanCikacakAdet, imza };
}

export type GeriAlmaUygulamaSonucu =
  | { tamam: true; stoktanCikan: number }
  | { tamam: false; hata: string };

export async function geriAlmayiUygula(
  saleId: string,
  neden: GeriAlmaNedeni,
  aciklama: string | null,
  onaylananImza: string,
): Promise<GeriAlmaUygulamaSonucu> {
  const baglam = await yetkiIste("satis.iptal");
  const t = await getTranslations("IptalGeriAl");

  const sonuc = await geriAlmaUygula({
    saleId,
    neden,
    aciklama,
    onaylananImza,
    kullaniciId: baglam.kullaniciId,
    an: new Date(),
  });

  if (!sonuc.tamam) return { tamam: false, hata: t(`engel_${sonuc.engel}`) };

  revalidatePath(`/satislar/${saleId}`);
  revalidatePath("/satislar");
  // Geri alma ciroyu, NET'i, hakediş beklentisini ve stoğu etkiler.
  revalidatePath("/");
  revalidatePath("/rapor");
  revalidatePath("/stok");

  return { tamam: true, stoktanCikan: sonuc.stoktanCikan };
}
