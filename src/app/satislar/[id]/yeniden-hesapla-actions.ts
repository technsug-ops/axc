"use server";

import { yetkiIste } from "@/lib/yetki";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  gercekCargoTutari,
  karOnizle,
  karYenidenYaz,
  type YenidenHesaplaGirdisi,
} from "@/lib/kar-yeniden";

/**
 * ⛔ İSTEMCİYE (client component) AÇILAN ŞEKİL — K202-2 (18.09.2026).
 * `kar-yeniden.ts`nin `CargoTutariBilgisi` birleşik tipi SUNUCU tasarımıdır;
 * `yeniden-hesapla.tsx` bir `"use client"` bileşeni ve `@/lib/kar-yeniden`i
 * (Prisma dahil sunucu bağımlılıkları taşıyor) İTHAL EDEMEZ. Form yalnız
 * tek bir "elle tutar" alanı sunar — boşsa `null`, doluysa GERÇEK bir
 * beyandır. Dönüşüm burada, SUNUCU TARAFINDA yapılır.
 *
 * ⚠ CANLI VAKA (17.09.2026, sipariş 4633427855) TAM BURADAN GEÇTİ: alan
 * BOŞ bırakıldığında eski kod `cargoAmountManual: null` gönderiyordu ve
 * `karYenidenYaz` — unutulan `cargoAmountTahminiMi` bayrağı yüzünden —
 * taze tarife tahminini "gerçekleşen" diye yazıyordu. `gercekCargoTutari`
 * artık `null`ı doğru şekilde `{ tur: "YOK" }`e çeviriyor.
 */
export type YenidenHesaplaGirdisiIstemci = Omit<
  YenidenHesaplaGirdisi,
  "cargoTutari"
> & {
  /** KDV DAHİL, elle girilmiş kargo tutarı — boşsa null (YOK). */
  cargoAmountManual: number | null;
};

function sunucuGirdisi(
  girdi: YenidenHesaplaGirdisiIstemci,
): YenidenHesaplaGirdisi {
  const { cargoAmountManual, ...gerisi } = girdi;
  return { ...gerisi, cargoTutari: gercekCargoTutari(cargoAmountManual) };
}

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
  girdi: YenidenHesaplaGirdisiIstemci,
): Promise<OnizlemeSonucu> {
  await yetkiIste("kar.duzelt");

  const t = await getTranslations("Satis");

  const sonuc = await karOnizle(sunucuGirdisi(girdi));
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
  girdi: YenidenHesaplaGirdisiIstemci,
): Promise<YazmaSonucu> {
  await yetkiIste("kar.duzelt");

  const t = await getTranslations("Satis");

  let yazildi = false;
  try {
    yazildi = await karYenidenYaz(sunucuGirdisi(girdi));
  } catch (e) {
    console.error("[kar yeniden] beklenmeyen hata:", e);
    return { hata: t("hesaplanamadi") };
  }

  if (!yazildi) return { hata: t("satisBulunamadi") };

  revalidatePath(`/satislar/${girdi.saleId}`);
  revalidatePath("/satislar");
  return { basari: t("yenidenHesaplandi") };
}
