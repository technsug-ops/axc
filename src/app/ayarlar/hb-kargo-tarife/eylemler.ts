"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { KARGO_TARIFE_ENGEL_ANAHTARI } from "@/lib/kargo-tarife-pdf/hata-anahtari";
import { kargoTarifeDenetle, kargoTarifeYaz } from "@/lib/kargo-tarife-pdf/yaz";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  HEPSİBURADA KARGO TARİFESİ PDF YÜKLEME — SUNUCU EYLEMLERİ (K202)
 * ----------------------------------------------------------------------------
 *  ⚠ İKİ ADIM, TEK YAZMA — `ayarlar/tarife/eylemler.ts` ile AYNI desen:
 *  1. `kargoTarifeOnizle` — dosya çözülür, fark ölçülür. HİÇBİR ŞEY YAZMAZ.
 *  2. `kargoTarifeyiYaz` — kullanıcı planı gördükten SONRA onaylar.
 *
 *  ⚠ YETKİ `kanalsku.yaz` — komisyon tarifesi ekranıyla AYNI izin (ikisi de
 *  "kanal fiyatlama verisi" yazıyor). Yeni izin AÇILMADI: açsaydık
 *  `izinler.ts` + `seed-yetki.ts → SONRADAN_DOGAN` + canlı senkron gerekirdi.
 * ============================================================================
 */

type Sonuc =
  | { durum: "HATA"; engel: string; eslesmeyenler?: string[] }
  | {
      durum: "ONIZLEME";
      etkinTarih: string;
      uyarilar: string[];
      rapor: {
        okunanSatir: number;
        yazilacakDeger: number;
        ayniKalan: number;
        degisen: number;
        yeni: number;
      };
      ornekDegisenler: { tasiyici: string; desi: number; eski: number; yeni: number }[];
      uzerineYazmaGerekli: boolean;
      zatenAyni: boolean;
    }
  | { durum: "YAZILDI"; etkinTarih: string; yazilanSatir: number; arsiv: "YAZILDI" | "DEPO_YOK" | "HATA" };

function dosyayiOku(form: FormData): { hata: string } | { dosya: File } {
  const dosya = form.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) return { hata: "hataDosyaSecilmedi" };
  return { dosya };
}

/** Adım 1 — çözüm ve fark ölçümü. Yazma YOK. */
export async function kargoTarifeOnizle(form: FormData): Promise<Sonuc> {
  await yetkiIste("kanalsku.yaz");
  const t = await getTranslations("HbKargoTarife");

  const d = dosyayiOku(form);
  if ("hata" in d) return { durum: "HATA", engel: t(d.hata as Parameters<typeof t>[0]) };

  const bayt = Buffer.from(await d.dosya.arrayBuffer());
  const sonuc = await kargoTarifeDenetle(bayt);
  return ozetle(sonuc, t);
}

/** Adım 2 — yazma. Kullanıcı planı GÖRDÜKTEN sonra. */
export async function kargoTarifeyiYaz(form: FormData): Promise<Sonuc> {
  await yetkiIste("kanalsku.yaz");
  const t = await getTranslations("HbKargoTarife");

  const d = dosyayiOku(form);
  if ("hata" in d) return { durum: "HATA", engel: t(d.hata as Parameters<typeof t>[0]) };
  const uzerineYazOnay = form.get("uzerineYazOnay") === "on";

  const bayt = Buffer.from(await d.dosya.arrayBuffer());
  const sonuc = await kargoTarifeYaz(bayt, uzerineYazOnay);

  /**
   * ── HAM PDF ARŞİVE ────────────────────────────────────────────────────
   * ⚠ Vercel'de kalıcı disk yok — `ayarlar/tarife` ekranıyla AYNI Blob
   * deposu, aynı gerekçe. Arşiv başarısızlığı SESSİZ KALMAZ; sonuç `arsiv`
   * alanıyla ekrana çıkar.
   */
  let arsiv: "YAZILDI" | "DEPO_YOK" | "HATA" = "DEPO_YOK";
  if (sonuc.durum === "YAZILDI") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      arsiv = "DEPO_YOK";
    } else {
      try {
        const damga = sonuc.etkinTarih.toISOString().slice(0, 10);
        await put(`hb-kargo-tarife-arsiv/${damga}-${d.dosya.name}`, bayt, {
          access: "private",
          addRandomSuffix: true,
        });
        arsiv = "YAZILDI";
      } catch {
        arsiv = "HATA";
      }
    }
    revalidatePath("/ayarlar/hb-kargo-tarife");
  }

  const ozet = ozetle(sonuc, t);
  return ozet.durum === "YAZILDI" ? { ...ozet, arsiv } : ozet;
}

type Ceviri = Awaited<ReturnType<typeof getTranslations<"HbKargoTarife">>>;

function ozetle(
  sonuc: Awaited<ReturnType<typeof kargoTarifeDenetle>>,
  t: Ceviri,
): Sonuc {
  if (sonuc.durum === "HATA") {
    return {
      durum: "HATA",
      engel: t(KARGO_TARIFE_ENGEL_ANAHTARI[sonuc.kod] as Parameters<Ceviri>[0]),
      eslesmeyenler: sonuc.eslesmeyenler,
    };
  }
  if (sonuc.durum === "ONIZLEME") {
    return {
      durum: "ONIZLEME",
      etkinTarih: sonuc.etkinTarih.toISOString(),
      uyarilar: sonuc.uyarilar,
      rapor: sonuc.rapor,
      ornekDegisenler: sonuc.ornekDegisenler,
      uzerineYazmaGerekli: sonuc.uzerineYazmaGerekli,
      zatenAyni: sonuc.zatenAyni,
    };
  }
  return {
    durum: "YAZILDI",
    etkinTarih: sonuc.etkinTarih.toISOString(),
    yazilanSatir: sonuc.yazilanSatir,
    arsiv: "DEPO_YOK",
  };
}
