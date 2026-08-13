"use server";

import { yetkiIste } from "@/lib/yetki";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  karOnizle,
  karYenidenYaz,
  type YenidenHesaplaGirdisi,
} from "@/lib/kar-yeniden";

export type OnizlemeSonucu = {
  hata?: string;
  /** Ekranda yan yana gösterilecek eski/yeni değerler. */
  onceki?: { net1: number | null; net2: number | null };
  yeni?: { net1: number; net2: number; durum: string };
  paraBirimi?: string;
  kesintiler?: { code: string; tutar: number }[];
  siparisKesintileri?: { code: string; tutar: number }[];
};

export async function karOnizleAction(
  girdi: YenidenHesaplaGirdisi,
): Promise<OnizlemeSonucu> {
  await yetkiIste("kar.duzelt");

  const t = await getTranslations("Satis");

  const sonuc = await karOnizle(girdi);
  if (!sonuc) return { hata: t("satisBulunamadi") };

  return {
    onceki: { net1: sonuc.onceki.net1, net2: sonuc.onceki.net2 },
    yeni: {
      net1: sonuc.yeni.net1,
      net2: sonuc.yeni.net2,
      durum: sonuc.yeni.durum,
    },
    paraBirimi: sonuc.paraBirimi,
    kesintiler: sonuc.yeni.kalemler.flatMap((k) => k.kesintiler),
    siparisKesintileri: sonuc.yeni.siparisKesintileri,
  };
}

export type YazmaSonucu = { hata?: string; basari?: string };

export async function karYenidenYazAction(
  girdi: YenidenHesaplaGirdisi,
): Promise<YazmaSonucu> {
  await yetkiIste("kar.duzelt");

  const t = await getTranslations("Satis");

  let yazildi = false;
  try {
    yazildi = await karYenidenYaz(girdi);
  } catch (e) {
    console.error("[kar yeniden] beklenmeyen hata:", e);
    return { hata: t("hesaplanamadi") };
  }

  if (!yazildi) return { hata: t("satisBulunamadi") };

  revalidatePath(`/satislar/${girdi.saleId}`);
  revalidatePath("/satislar");
  return { basari: t("yenidenHesaplandi") };
}
