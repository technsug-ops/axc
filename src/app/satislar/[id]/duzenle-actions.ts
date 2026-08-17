"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  duzenlemeOnizle,
  duzenlemeUygula,
  type YeniDegerler,
} from "@/lib/satis-duzenleme-veri";
import type { DuzenlemeNedeni, Fark } from "@/lib/satis-duzenleme";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  SATIŞ DÜZENLEME — SUNUCU EYLEMLERİ
 * ----------------------------------------------------------------------------
 *  İki adım: ÖNİZLE (hiçbir şey yazmaz) → UYGULA (imza doğrularsa yazar).
 *
 *  Onay düğmesi önizleme çizilmeden aktif olmaz; imza da ancak önizlemeden
 *  gelir. Yani "gördüğünü onayla" kuralı hem ekranda hem sunucuda duruyor.
 * ============================================================================
 */

export type OnizlemeSonucu =
  | {
      tamam: true;
      farklar: Fark[];
      eskiCiro: number;
      yeniCiro: number;
      ciroFarki: number;
      paraBirimi: string;
      imza: string;
    }
  | { tamam: false; hata: string };

export async function duzenlemeyiOnizle(
  saleId: string,
  yeni: YeniDegerler,
  neden: DuzenlemeNedeni | null,
  aciklama: string | null,
): Promise<OnizlemeSonucu> {
  await yetkiIste("satis.yaz");
  const t = await getTranslations("SatisDuzenleme");

  const kurulum = await duzenlemeOnizle(saleId, yeni, neden, aciklama);
  if (kurulum === null) return { tamam: false, hata: t("satisYok") };

  const { plan, imza } = kurulum;
  if (!plan.olur) {
    // Her engel KENDİ cümlesini alır — "olmadı" demek yetmez, NEDEN yazar.
    return { tamam: false, hata: t(`engel_${plan.engel}`) };
  }

  return {
    tamam: true,
    farklar: plan.farklar,
    eskiCiro: plan.eskiCiro,
    yeniCiro: plan.yeniCiro,
    ciroFarki: plan.ciroFarki,
    paraBirimi: plan.paraBirimi,
    imza,
  };
}

export type UygulamaSonucu =
  | { tamam: true; eskiNet2: number | null; yeniNet2: number | null }
  | { tamam: false; hata: string };

export async function duzenlemeyiUygula(
  saleId: string,
  yeni: YeniDegerler,
  neden: DuzenlemeNedeni,
  aciklama: string | null,
  onaylananImza: string,
): Promise<UygulamaSonucu> {
  const baglam = await yetkiIste("satis.yaz");
  const t = await getTranslations("SatisDuzenleme");

  const sonuc = await duzenlemeUygula({
    saleId,
    yeni,
    neden,
    aciklama,
    onaylananImza,
    kullaniciId: baglam.kullaniciId,
    an: new Date(),
  });

  if (!sonuc.tamam) {
    /**
     * DURUM DEĞİŞTİ — sessizce yeni plana göre yazılmaz. Kullanıcıya
     * önizlemeyi tazelemesi söylenir; onay gösterilene verilmiştir.
     */
    if (sonuc.kod === "DURUM_DEGISTI") {
      return { tamam: false, hata: t("durumDegisti") };
    }
    if (sonuc.kod === "SATIS_YOK") return { tamam: false, hata: t("satisYok") };
    return { tamam: false, hata: t(`engel_${sonuc.engel}`) };
  }

  revalidatePath(`/satislar/${saleId}`);
  revalidatePath("/satislar");
  // Panel, rapor ve kârlılık kartı aynı snapshot'ı okur — hepsi tazelensin.
  revalidatePath("/");
  revalidatePath("/rapor");

  return { tamam: true, eskiNet2: sonuc.eskiNet2, yeniNet2: sonuc.yeniNet2 };
}
