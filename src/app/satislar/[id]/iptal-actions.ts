"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { iptalOnizle, iptalUygula } from "@/lib/satis-iptali-veri";
import type { SatisIptalSebebi } from "@/generated/prisma/enums";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  SATIŞ İPTALİ — SUNUCU EYLEMLERİ
 * ----------------------------------------------------------------------------
 *  Düzenleme tarafındaki desen devralındı: ÖNİZLE (yazmaz) → UYGULA (imza
 *  doğrularsa yazar). Onay düğmesi önizleme çizilmeden aktif olmaz.
 * ============================================================================
 */

export type IptalOnizlemeSonucu =
  | {
      tamam: true;
      geriDonenAdet: number;
      hareketler: {
        variantId: string;
        adet: number;
        birimMaliyet: string | null;
        paraBirimi: string | null;
      }[];
      etki: {
        ciro: number;
        net2: number | null;
        paraBirimi: string;
        hakedisEslesmisMi: boolean;
      };
      imza: string;
    }
  | {
      tamam: false;
      hata: string;
      /** İade engeli — ekran O KAYDA bağlantı verir (yol gösteren mesaj). */
      iade?: { id: string; kod: string | null };
    };

export async function iptaliOnizle(
  saleId: string,
  sebep: SatisIptalSebebi | null,
  not: string | null,
): Promise<IptalOnizlemeSonucu> {
  await yetkiIste("satis.yaz");
  const t = await getTranslations("SatisIptali");

  const kurulum = await iptalOnizle(saleId, sebep, not);
  if (kurulum === null) return { tamam: false, hata: t("satisYok") };

  const { plan, imza } = kurulum;
  if (!plan.olur) {
    return { tamam: false, hata: t(`engel_${plan.engel}`), iade: plan.iade };
  }

  return {
    tamam: true,
    geriDonenAdet: plan.geriDonenAdet,
    hareketler: plan.hareketler.map((h) => ({
      variantId: h.variantId,
      adet: h.quantityDelta,
      birimMaliyet: h.birimMaliyet,
      paraBirimi: h.birimMaliyetParaBirimi,
    })),
    etki: plan.etki,
    imza,
  };
}

export type IptalUygulamaSonucu =
  | { tamam: true; geriDonenAdet: number }
  | { tamam: false; hata: string };

export async function iptaliUygula(
  saleId: string,
  sebep: SatisIptalSebebi,
  not: string | null,
  onaylananImza: string,
): Promise<IptalUygulamaSonucu> {
  const baglam = await yetkiIste("satis.yaz");
  const t = await getTranslations("SatisIptali");

  const sonuc = await iptalUygula({
    saleId,
    sebep,
    not,
    onaylananImza,
    kullaniciId: baglam.kullaniciId,
    an: new Date(),
  });

  if (!sonuc.tamam) {
    return { tamam: false, hata: t(`engel_${sonuc.engel}`) };
  }

  revalidatePath(`/satislar/${saleId}`);
  revalidatePath("/satislar");
  // İptal ciroyu, NET'i, hakediş beklentisini ve stoğu etkiler.
  revalidatePath("/");
  revalidatePath("/rapor");
  revalidatePath("/stok");

  return { tamam: true, geriDonenAdet: sonuc.geriDonenAdet };
}
