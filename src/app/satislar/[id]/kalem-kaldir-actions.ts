"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import {
  geriAlmaOnizle,
  geriAlmaUygula,
  kaldirmaOnizle,
  kaldirmaUygula,
} from "@/lib/kalem-kaldirma-veri";
import type { SatisKalemKaldirmaSebebi } from "@/generated/prisma/enums";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  KALEM KALDIRMA — SUNUCU EYLEMLERİ (K78)
 * ----------------------------------------------------------------------------
 *  İptal tarafındaki desen devralındı: ÖNİZLE (yazmaz) → UYGULA (imza
 *  doğrularsa yazar). Onay düğmesi önizleme çizilmeden aktif olmaz.
 *
 *  ── NİYE YENİ İZİN AÇILMADI ─────────────────────────────────────────────
 *  Ölçüt `satis.iptal`. Kaldırma İPTALİN KALEM ÖLÇEĞİDİR: aynı yıkıcılık
 *  sınıfı (stoğu geri döndürür, ciroyu ve NET'i düşürür), aynı geri alma
 *  yükümlülüğü. Ayrı bir izin açmak "yetki iki bacaklıdır" borcunu da
 *  doğururdu (`izinler.ts` + `seed-yetki.ts` → `SONRADAN_DOGAN`); ikincisi
 *  unutulursa ekran canlıda SESSİZCE kaybolur.
 *  ⚠ Ve `satis.yaz` YETMEZ: satış girebilmek, girilmiş bir satırı deftere
 *  hiç olmamış saymaya yetki vermez.
 * ============================================================================
 */

export type KaldirmaOnizlemeSonucu =
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
        kalanKalemSayisi: number;
      };
      urunAdi: string;
      adet: number;
      imza: string;
    }
  | { tamam: false; hata: string };

export async function kalemKaldirmaOnizle(
  saleItemId: string,
  sebep: SatisKalemKaldirmaSebebi | null,
  not: string | null,
): Promise<KaldirmaOnizlemeSonucu> {
  await yetkiIste("satis.iptal");
  const t = await getTranslations("KalemKaldirma");

  const kurulum = await kaldirmaOnizle(saleItemId, sebep, not);
  if (kurulum === null) return { tamam: false, hata: t("engel_KALEM_YOK") };

  const { plan, imza, urunAdi, adet } = kurulum;
  if (!plan.olur) return { tamam: false, hata: t(`engel_${plan.engel}`) };

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
    urunAdi,
    adet,
    imza,
  };
}

export type KaldirmaUygulamaSonucu =
  | { tamam: true; geriDonenAdet: number }
  | { tamam: false; hata: string };

export async function kalemKaldirmayiUygula(
  saleItemId: string,
  sebep: SatisKalemKaldirmaSebebi,
  not: string | null,
  onaylananImza: string,
): Promise<KaldirmaUygulamaSonucu> {
  const baglam = await yetkiIste("satis.iptal");
  const t = await getTranslations("KalemKaldirma");

  const sonuc = await kaldirmaUygula({
    saleItemId,
    sebep,
    not,
    onaylananImza,
    kullaniciId: baglam.kullaniciId,
    an: new Date(),
  });

  if (!sonuc.tamam) return { tamam: false, hata: t(`engel_${sonuc.engel}`) };

  yollariTazele();
  return { tamam: true, geriDonenAdet: sonuc.geriDonenAdet };
}

export type GeriAlmaOnizlemeSonucu =
  | { tamam: true; dusulecekAdet: number }
  | { tamam: false; hata: string };

export async function kalemKaldirmaGeriAlOnizle(
  saleItemId: string,
): Promise<GeriAlmaOnizlemeSonucu> {
  await yetkiIste("satis.iptal");
  const t = await getTranslations("KalemKaldirma");

  const kurulum = await geriAlmaOnizle(saleItemId);
  if (kurulum === null) return { tamam: false, hata: t("engel_KALEM_YOK") };
  if (!kurulum.plan.olur) {
    return { tamam: false, hata: t(`engel_${kurulum.plan.engel}`) };
  }
  return { tamam: true, dusulecekAdet: kurulum.plan.dusulecekAdet };
}

export type GeriAlmaUygulamaSonucu =
  | { tamam: true; dusulecekAdet: number }
  | { tamam: false; hata: string };

export async function kalemKaldirmayiGeriAl(
  saleItemId: string,
): Promise<GeriAlmaUygulamaSonucu> {
  const baglam = await yetkiIste("satis.iptal");
  const t = await getTranslations("KalemKaldirma");

  const sonuc = await geriAlmaUygula({
    saleItemId,
    kullaniciId: baglam.kullaniciId,
    an: new Date(),
  });

  if (!sonuc.tamam) return { tamam: false, hata: t(`engel_${sonuc.engel}`) };

  yollariTazele();
  return { tamam: true, dusulecekAdet: sonuc.dusulecekAdet };
}

/**
 * ⚠ TAZELENECEK YOLLAR TEK YERDE: kaldırma da geri alma da AYNI rakamları
 * oynatıyor (ciro · NET · stok · ürün kartı). İki listede iki farklı küme
 * olsaydı biri güncellenirken öteki bayat kalırdı.
 */
function yollariTazele() {
  revalidatePath("/satislar", "layout");
  revalidatePath("/");
  revalidatePath("/rapor");
  revalidatePath("/stok");
  revalidatePath("/urunler", "layout");
}
