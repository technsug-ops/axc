"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { gunMetninden } from "@/lib/donem";
import { gecisGecerliMi, kapaliMi } from "@/lib/iade/bildirim";
import { oturumdakiKullanici } from "@/lib/oturum";
import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";

import type { NoticeStatus } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  İADE BİLDİRİMİ — YAZIM İŞLEMLERİ
 * ----------------------------------------------------------------------------
 *  AŞAMA A'nın tamamı burada: bildirim açılır, durumu ilerler, iptal edilir.
 *  HİÇBİRİ LEDGER'A DOKUNMAZ ve hiçbiri kâr hesaplamaz — bildirim bir niyet
 *  beyanıdır. Stok ve kâr ancak AŞAMA B'de (`iadeKaydet`) işler.
 *
 *  GEÇİŞ KURALI SUNUCUDA DA UYGULANIR: ekranda pasif düğme göstermek yetki
 *  değildir; istek elle kurulabilir. `gecisGecerliMi` hem düğmeyi çizerken
 *  hem burada çağrılır — tek kaynak (src/lib/iade/bildirim.ts).
 * ============================================================================
 */

export type BildirimDurumu = { hatalar?: string[]; basarili?: boolean };

type Ceviri = (anahtar: string, degerler?: Record<string, string | number>) => string;

function semaKur(t: Ceviri) {
  return z.object({
    saleId: z.string().min(1, t("satisZorunlu")),
    /** Pazaryerindeki talep numarası — dış dünyanın kimliği, boş olabilir. */
    code: z.string().trim().max(191),
    noticedAt: z.string().min(1, t("tarihZorunlu")),
    reason: z.enum(
      [
        "DEGISIM",
        "DEGISIM_KUSURLU",
        "CALISMIYOR",
        "CAYMA",
        "KULLANILMIS_ITIRAZ",
        "YANLIS_URUN",
        "DIGER",
      ],
      { message: t("gerekceZorunlu") },
    ),
    /** Değişim için ayrılan ürün — FİZİKSEL STOĞA DOKUNMAZ, niyet beyanıdır. */
    reservedVariantId: z.string().nullable(),
    reservedQuantity: z.number().int().min(0),
    note: z.string().trim(),
  });
}

export async function bildirimOlustur(
  _oncekiDurum: BildirimDurumu,
  formData: FormData,
): Promise<BildirimDurumu> {
  await yetkiIste("iade.yaz");
  const t = await getTranslations("Bildirim2");

  const ham = formData.get("veri");
  if (typeof ham !== "string") return { hatalar: [t("formOkunamadi")] };

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: [t("formOkunamadi")] };
  }

  const sonuc = semaKur(t).safeParse(json);
  if (!sonuc.success) {
    return { hatalar: sonuc.error.issues.map((i) => i.message) };
  }
  const veri = sonuc.data;

  const tarih = gunMetninden(veri.noticedAt);
  if (!tarih) return { hatalar: [t("tarihGecersiz")] };

  const satis = await prisma.sale.findUnique({
    where: { id: veri.saleId },
    select: { id: true },
  });
  if (!satis) return { hatalar: [t("satisBulunamadi")] };

  /**
   * AYRILAN ÜRÜN VARSA ADEDİ DE OLMALI — ve tersi. Yarım beyan, stok
   * ekranındaki rozeti sessizce yanlış gösterirdi.
   */
  if (veri.reservedVariantId && veri.reservedQuantity <= 0) {
    return { hatalar: [t("ayrilanAdetZorunlu")] };
  }
  if (!veri.reservedVariantId && veri.reservedQuantity > 0) {
    return { hatalar: [t("ayrilanUrunZorunlu")] };
  }
  if (veri.reservedVariantId) {
    const varyant = await prisma.productVariant.findUnique({
      where: { id: veri.reservedVariantId },
      select: { id: true },
    });
    if (!varyant) return { hatalar: [t("ayrilanUrunBulunamadi")] };
  }

  const kullanici = await oturumdakiKullanici();

  await prisma.returnNotice.create({
    data: {
      saleId: veri.saleId,
      code: veri.code || null,
      noticedAt: tarih,
      reason: veri.reason,
      // Yeni bildirim her zaman BEKLENIYOR doğar: mal daha yolda.
      status: "BEKLENIYOR",
      note: veri.note || null,
      reservedVariantId: veri.reservedVariantId || null,
      reservedQuantity: veri.reservedVariantId ? veri.reservedQuantity : 0,
      userId: kullanici?.id ?? null,
    },
  });

  revalidatePath("/iadeler");
  // Ayrılmış rozet stok ekranından okunuyor.
  revalidatePath("/stok");
  revalidatePath(`/satislar/${veri.saleId}`);
  return { basarili: true };
}

/**
 * Durumu ilerletir. İZİNSİZ GEÇİŞ REDDEDİLİR ve sebebi söylenir.
 */
export async function bildirimDurumuGuncelle(
  bildirimId: string,
  hedef: NoticeStatus,
): Promise<{ hata?: string }> {
  await yetkiIste("iade.yaz");
  const t = await getTranslations("Bildirim2");

  const bildirim = await prisma.returnNotice.findUnique({
    where: { id: bildirimId },
    select: { id: true, status: true, saleId: true, returnId: true },
  });
  if (!bildirim) return { hata: t("bulunamadi") };

  if (kapaliMi(bildirim.status)) {
    return { hata: t("kapaliBildirim") };
  }
  if (!gecisGecerliMi(bildirim.status, hedef)) {
    return { hata: t("gecisIzinliDegil") };
  }

  /**
   * KAPANIŞ İKİ YOLDAN GELİR ve karıştırılmamalı:
   *   - İade işlendiyse (`returnId` dolu) kapanış doğaldır.
   *   - ITIRAZ_KABUL'den gelen kapanışta iade HİÇ doğmaz; ürün müşteride
   *     kalır. Bu yüzden `returnId` boş olması BEKLENEN durumdur.
   * MAL_GELDI'den doğrudan KAPANDI'ya geçmek, iade işlenmeden dosyayı
   * kapatmak demektir — bu geçiş açıktır çünkü kullanıcı "iade işlemeyeceğim,
   * konu kapandı" diyebilir; ama iade işlemek isterse "İadeyi işle" düğmesi
   * onu iade formuna götürür.
   */
  await prisma.returnNotice.update({
    where: { id: bildirimId },
    data: { status: hedef },
  });

  revalidatePath("/iadeler");
  revalidatePath("/stok");
  revalidatePath(`/satislar/${bildirim.saleId}`);
  return {};
}
