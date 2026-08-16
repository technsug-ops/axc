"use server";

import { yetkiIste } from "@/lib/yetki";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  STOK DÜZELTME NEDENLERİ — YÖNETİM
 * ----------------------------------------------------------------------------
 *  KDV Kategorileri ekranının deseni: ekle · düzenle · pasife al. SİLME YOK.
 *
 *  NEDEN SİLİNMEZ: geçmiş stok hareketleri nedene bağlı. Silinseydi
 *  "üç ay önce bu mal neden düşülmüş?" sorusunun cevabı kaybolurdu.
 *  Pasife alınan neden yeni kayıtta seçilemez, eski kayıtlarda görünmeye
 *  devam eder — ledger'ın kendi kuralının ta kendisi.
 *
 *  HAREKET TİPİ SONRADAN DEĞİŞTİRİLEMEZ: bir neden ADJUSTMENT olarak
 *  kullanılıp hareket yazdıysa, sonradan COUNT_CORRECTION'a çevrilmesi
 *  geçmiş raporları oynatırdı — dünkü "fire" bugün "sayım farkı" olurdu.
 *  Hareket görmüş nedende tip alanı KİLİTLİDİR.
 * ============================================================================
 */

export type NedenDurumu = {
  hatalar?: string[];
};

type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

function semaKur(t: Ceviri) {
  return z.object({
    name: z.string().trim().min(1, t("adZorunlu")).max(191, t("adCokUzun")),
    movementType: z.enum(["ADJUSTMENT", "COUNT_CORRECTION"], {
      message: t("tipGecersiz"),
    }),
    /**
     * YÖN — hangi yönde seçilebileceği.
     *
     * TİPTEN FARKLI OLARAK SONRADAN DEĞİŞTİRİLEBİLİR: tip raporu ikiye
     * böldüğü için hareket görmüş nedende kilitlenir, ama yön yalnız
     * SEÇİM listesini süzer. Geçmiş kayıtların anlamını değiştirmez —
     * kullanıcı "Nakliye hasarı"nı sonradan EKSİ'ye çekebilmeli.
     */
    yon: z.enum(["EKSI", "ARTI", "HER_IKISI"], { message: t("yonGecersiz") }),
  });
}

function tazele() {
  revalidatePath("/ayarlar/duzeltme-nedenleri");
  // Düzeltme formu neden listesini varyant detayından alıyor.
  revalidatePath("/stok", "layout");
}

/** Ad başka nedende kullanılıyor mu? Çakışma sessizce çözülmez. */
async function adCakismasi(
  t: Ceviri,
  ad: string,
  haricId?: string,
): Promise<string | null> {
  const sahip = await prisma.stockAdjustmentReason.findFirst({
    where: { name: ad, ...(haricId ? { NOT: { id: haricId } } : {}) },
    select: { name: true },
  });
  return sahip ? t("adZatenVar", { ad }) : null;
}

export async function nedenEkle(
  _onceki: NedenDurumu,
  formData: FormData,
): Promise<NedenDurumu> {
  await yetkiIste("ayar.yaz");

  const t = await getTranslations("DuzeltmeNedeni");

  const cozum = semaKur(t).safeParse({
    name: formData.get("name"),
    movementType: formData.get("movementType"),
    yon: formData.get("yon"),
  });
  if (!cozum.success) {
    return { hatalar: cozum.error.issues.map((i) => i.message) };
  }

  const cakisma = await adCakismasi(t, cozum.data.name);
  if (cakisma) return { hatalar: [cakisma] };

  try {
    // Sıra: en sona eklenir. Mevcut en büyük + 10 — aralarına sonradan
    // el ile değer sıkıştırılabilsin diye onarlı gidiyor.
    const enBuyuk = await prisma.stockAdjustmentReason.aggregate({
      _max: { sortOrder: true },
    });

    await prisma.stockAdjustmentReason.create({
      data: {
        name: cozum.data.name,
        movementType: cozum.data.movementType,
        yon: cozum.data.yon,
        requiresNote: formData.get("requiresNote") === "on",
        sortOrder: (enBuyuk._max.sortOrder ?? 0) + 10,
      },
    });
  } catch (e) {
    console.error("[neden ekle] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  tazele();
  return {};
}

export async function nedenGuncelle(
  _onceki: NedenDurumu,
  formData: FormData,
): Promise<NedenDurumu> {
  await yetkiIste("ayar.yaz");

  const t = await getTranslations("DuzeltmeNedeni");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kayitBulunamadi")] };

  const mevcut = await prisma.stockAdjustmentReason.findUnique({
    where: { id },
    select: { movementType: true, _count: { select: { movements: true } } },
  });
  if (!mevcut) return { hatalar: [t("kayitBulunamadi")] };

  const cozum = semaKur(t).safeParse({
    name: formData.get("name"),
    // HAREKET GÖRMÜŞ NEDENDE TİP DEĞİŞMEZ: formdan geleni yok sayıp
    // mevcudu koruyoruz. Ekran alanı zaten kilitli, ama sunucu da
    // güvenmiyor — istek elle de kurulabilir.
    movementType:
      mevcut._count.movements > 0
        ? mevcut.movementType
        : formData.get("movementType"),
    yon: formData.get("yon"),
  });
  if (!cozum.success) {
    return { hatalar: cozum.error.issues.map((i) => i.message) };
  }

  const cakisma = await adCakismasi(t, cozum.data.name, id);
  if (cakisma) return { hatalar: [cakisma] };

  try {
    await prisma.stockAdjustmentReason.update({
      where: { id },
      data: {
        name: cozum.data.name,
        movementType: cozum.data.movementType,
        yon: cozum.data.yon,
        requiresNote: formData.get("requiresNote") === "on",
      },
    });
  } catch (e) {
    console.error("[neden guncelle] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  tazele();
  return {};
}

/** Pasife alma / geri açma. SİLME YOK — geçmiş hareketler nedensiz kalmasın. */
export async function nedenDurumDegistir(
  _onceki: NedenDurumu,
  formData: FormData,
): Promise<NedenDurumu> {
  await yetkiIste("ayar.yaz");

  const t = await getTranslations("DuzeltmeNedeni");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kayitBulunamadi")] };

  const mevcut = await prisma.stockAdjustmentReason.findUnique({
    where: { id },
    select: { isActive: true },
  });
  if (!mevcut) return { hatalar: [t("kayitBulunamadi")] };

  try {
    await prisma.stockAdjustmentReason.update({
      where: { id },
      data: { isActive: !mevcut.isActive },
    });
  } catch (e) {
    console.error("[neden durum] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  tazele();
  return {};
}
