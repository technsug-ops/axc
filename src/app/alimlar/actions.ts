"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export type AlimDurumu = {
  hatalar?: string[];
};

// ---------------------------------------------------------------------------
//  ALIM OLUŞTURMA
// ---------------------------------------------------------------------------

/** Sözlükten çözülen çeviri işlevi. */
type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

/**
 * Şema, mesajlar çözüldükten SONRA kurulur.
 * Modül seviyesinde kurulamaz: getTranslations() istek kapsamlıdır.
 */
function alimSemasiKur(t: Ceviri) {
  const kalemSemasi = z.object({
    variantId: z.string().min(1, t("urunSecilmeli")),
    quantity: z
      .number({ message: t("adetSayiOlmali") })
      .int(t("adetTamSayi"))
      .min(1, t("adetEnAzBir")),
    unitCostAmount: z
      .number({ message: t("fiyatSayiOlmali") })
      .min(0, t("fiyatNegatifOlamaz")),
    unitCostCurrency: z.enum(["TRY", "EUR"], {
      message: t("paraBirimiGecersiz"),
    }),
  });

  return z.object({
    code: z.string().trim().min(1, t("siparisNoZorunlu")).max(191),
    purchasedAt: z.string().min(1, t("tarihZorunlu")),
    channelAccountId: z.string(),
    creditCardId: z.string(),
    installmentCount: z
      .number({ message: t("taksitSayiOlmali") })
      .int(t("taksitTamSayi"))
      .min(1, t("taksitEnAzBir"))
      .max(36, t("taksitEnFazla36")),
    supplierName: z.string().trim().max(191),
    note: z.string().trim(),
    kalemler: z.array(kalemSemasi).min(1, t("enAzBirKalem")),
  });
}

function hataMesaji(yol: PropertyKey[], mesaj: string, t: Ceviri): string {
  if (yol[0] === "kalemler" && typeof yol[1] === "number") {
    return t("kalemHataKalibi", { sira: yol[1] + 1, mesaj });
  }
  return mesaj;
}

export async function alimOlustur(
  _oncekiDurum: AlimDurumu,
  formData: FormData,
): Promise<AlimDurumu> {
  const t = await getTranslations("Alim");

  const ham = formData.get("veri");
  if (typeof ham !== "string") return { hatalar: [t("formOkunamadi")] };

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: [t("formBozuk")] };
  }

  const sonuc = alimSemasiKur(t).safeParse(json);
  if (!sonuc.success) {
    return {
      hatalar: sonuc.error.issues.map((i) => hataMesaji(i.path, i.message, t)),
    };
  }
  const veri = sonuc.data;

  // Sipariş no benzersiz olmalı (şemada @unique).
  const mevcut = await prisma.purchase.findUnique({
    where: { code: veri.code },
  });
  if (mevcut) {
    return { hatalar: [t("siparisNoZatenKayitli", { kod: veri.code })] };
  }

  const tarih = new Date(veri.purchasedAt);
  if (Number.isNaN(tarih.getTime())) {
    return { hatalar: [t("tarihGecersiz")] };
  }

  // Seçilen varyantlar gerçekten var mı?
  const varyantIdleri = [...new Set(veri.kalemler.map((k) => k.variantId))];
  const bulunan = await prisma.productVariant.count({
    where: { id: { in: varyantIdleri } },
  });
  if (bulunan !== varyantIdleri.length) {
    return { hatalar: [t("kalemMevcutDegil")] };
  }

  // Özet alanları: SADECE tüm kalemler aynı para birimindeyse doldurulur.
  // Karma para birimli alımda tek bir toplam yanıltıcı olurdu; boş bırakılır
  // ve toplamlar her zaman kalemlerden hesaplanır.
  const paraBirimleri = new Set(veri.kalemler.map((k) => k.unitCostCurrency));
  const tekParaBirimi =
    paraBirimleri.size === 1 ? [...paraBirimleri][0] : null;
  const malToplami = tekParaBirimi
    ? veri.kalemler.reduce(
        (toplam, k) => toplam + k.unitCostAmount * k.quantity,
        0,
      )
    : null;

  let yeniId: string;
  try {
    const alim = await prisma.purchase.create({
      data: {
        code: veri.code,
        // Spec gereği yeni alım "sipariş verildi" durumunda başlar.
        // Mal kabul (RECEIVED) ve stok girişi Aşama 3'te gelecek.
        status: "ORDERED",
        purchasedAt: tarih,
        supplierName: veri.supplierName || null,
        note: veri.note || null,
        installmentCount: veri.installmentCount,
        channelAccountId: veri.channelAccountId || null,
        creditCardId: veri.creditCardId || null,
        goodsAmount: malToplami,
        goodsCurrency: tekParaBirimi,
        items: {
          create: veri.kalemler.map((k) => ({
            variantId: k.variantId,
            quantity: k.quantity,
            unitCostAmount: k.unitCostAmount,
            unitCostCurrency: k.unitCostCurrency,
          })),
        },
      },
      select: { id: true },
    });
    yeniId = alim.id;
  } catch (e) {
    const kod =
      typeof e === "object" && e !== null && "code" in e
        ? String((e as { code: unknown }).code)
        : "";
    if (kod === "P2002") {
      return { hatalar: [t("siparisNoCakisti")] };
    }
    console.error("[alim] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  revalidatePath("/alimlar");
  redirect(`/alimlar/${yeniId}`);
}

// ---------------------------------------------------------------------------
//  ALIM GÜNCELLEME VE İPTAL
// ---------------------------------------------------------------------------

/**
 * Kalem başına KABUL EDİLMİŞ adet: PURCHASE_IN hareketlerinin toplamı.
 * "Gelen sağlam" kolon olarak tutulmuyor (şema kuralı), ledger'dan türetilir.
 */
async function gelenAdetler(alimId: string): Promise<Map<string, number>> {
  const hareketler = await prisma.stockMovement.findMany({
    where: { purchaseItem: { purchaseId: alimId } },
    select: { purchaseItemId: true, quantityDelta: true },
  });
  const harita = new Map<string, number>();
  for (const h of hareketler) {
    if (!h.purchaseItemId) continue;
    harita.set(
      h.purchaseItemId,
      (harita.get(h.purchaseItemId) ?? 0) + h.quantityDelta,
    );
  }
  return harita;
}

/**
 * ALIM GÜNCELLEME — üç kural (kullanıcı kararı 10.08.2026).
 *
 * 1. Sipariş adedi KABUL EDİLMİŞ adedin ALTINA inemez. Gelen mal stok
 *    defterine yazıldı; siparişi ondan aza çekmek defteri yalanlamak olurdu.
 * 2. Kabul edilmiş kalem ÇIKARILAMAZ — defterdeki hareket sahipsiz kalırdı.
 * 3. Maliyet değişirse o kaleme ait PURCHASE_IN hareketlerinin maliyet
 *    damgası da düzeltilir. Bu defteri "yeniden yazmak" DEĞİL, yanlış
 *    girilmiş bir veriyi düzeltmektir: geçmiş satışlar kendi maliyetlerini
 *    satış anında kaydettiği için ETKİLENMEZ; yalnız o partiden bundan
 *    sonra yapılacak satışlar doğru maliyeti kullanır.
 *
 * Durum sonunda yeniden hesaplanır: hiç gelmediyse ORDERED, kısmen
 * PARTIALLY_RECEIVED, tamamı geldiyse RECEIVED.
 */
export async function alimGuncelle(
  _oncekiDurum: AlimDurumu,
  formData: FormData,
): Promise<AlimDurumu> {
  const t = await getTranslations("Alim");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("bulunamadi")] };

  const ham = formData.get("veri");
  if (typeof ham !== "string") return { hatalar: [t("formOkunamadi")] };

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: [t("formBozuk")] };
  }

  const sonuc = alimSemasiKur(t).safeParse(json);
  if (!sonuc.success) {
    return {
      hatalar: sonuc.error.issues.map((i) => hataMesaji(i.path, i.message, t)),
    };
  }
  const veri = sonuc.data;

  const alim = await prisma.purchase.findUnique({
    where: { id },
    include: { items: { include: { variant: { select: { sku: true } } } } },
  });
  if (!alim) return { hatalar: [t("bulunamadi")] };
  if (alim.status === "CANCELLED") {
    return { hatalar: [t("iptalliDuzenlenemez")] };
  }

  const tarih = new Date(veri.purchasedAt);
  if (Number.isNaN(tarih.getTime())) return { hatalar: [t("tarihGecersiz")] };

  const cakisan = await prisma.purchase.findFirst({
    where: { code: veri.code, NOT: { id } },
    select: { id: true },
  });
  if (cakisan) {
    return { hatalar: [t("siparisNoZatenKayitli", { kod: veri.code })] };
  }

  const gelen = await gelenAdetler(id);
  const eskiKalemler = new Map(alim.items.map((k) => [k.variantId, k]));
  const yeniVaryantlar = new Set(veri.kalemler.map((k) => k.variantId));

  const hatalar: string[] = [];

  for (const eski of alim.items) {
    if (yeniVaryantlar.has(eski.variantId)) continue;
    if ((gelen.get(eski.id) ?? 0) > 0) {
      hatalar.push(t("kalemCikarilamaz", { urun: eski.variant.sku }));
    }
  }

  for (const yeni of veri.kalemler) {
    const eski = eskiKalemler.get(yeni.variantId);
    if (!eski) continue;
    const gelmis = gelen.get(eski.id) ?? 0;
    if (yeni.quantity < gelmis) {
      hatalar.push(
        t("adetGeleninAltinda", {
          urun: eski.variant.sku,
          adet: yeni.quantity,
          gelen: gelmis,
        }),
      );
    }
  }
  if (hatalar.length > 0) return { hatalar };

  const paraBirimleri = new Set(veri.kalemler.map((k) => k.unitCostCurrency));
  const tekParaBirimi = paraBirimleri.size === 1 ? [...paraBirimleri][0] : null;
  const malToplami = tekParaBirimi
    ? veri.kalemler.reduce(
        (toplam, k) => toplam + k.unitCostAmount * k.quantity,
        0,
      )
    : null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id },
        data: {
          code: veri.code,
          purchasedAt: tarih,
          supplierName: veri.supplierName || null,
          note: veri.note || null,
          installmentCount: veri.installmentCount,
          channelAccountId: veri.channelAccountId || null,
          creditCardId: veri.creditCardId || null,
          goodsAmount: malToplami,
          goodsCurrency: tekParaBirimi,
        },
      });

      // Çıkarılanlar — buraya yalnız hiç mal gelmemiş kalemler düşebilir.
      for (const eski of alim.items) {
        if (yeniVaryantlar.has(eski.variantId)) continue;
        await tx.purchaseItem.delete({ where: { id: eski.id } });
      }

      for (const yeni of veri.kalemler) {
        const eski = eskiKalemler.get(yeni.variantId);

        if (!eski) {
          await tx.purchaseItem.create({
            data: {
              purchaseId: id,
              variantId: yeni.variantId,
              quantity: yeni.quantity,
              unitCostAmount: String(yeni.unitCostAmount),
              unitCostCurrency: yeni.unitCostCurrency,
            },
          });
          continue;
        }

        const maliyetDegisti =
          Number(eski.unitCostAmount.toString()) !== yeni.unitCostAmount ||
          eski.unitCostCurrency !== yeni.unitCostCurrency;

        await tx.purchaseItem.update({
          where: { id: eski.id },
          data: {
            quantity: yeni.quantity,
            unitCostAmount: String(yeni.unitCostAmount),
            unitCostCurrency: yeni.unitCostCurrency,
          },
        });

        // KURAL 3 — defterdeki maliyet damgası da düzelir.
        if (maliyetDegisti && (gelen.get(eski.id) ?? 0) > 0) {
          await tx.stockMovement.updateMany({
            where: { purchaseItemId: eski.id },
            data: {
              unitCostAmount: String(yeni.unitCostAmount),
              unitCostCurrency: yeni.unitCostCurrency,
            },
          });
        }
      }

      const guncelKalemler = await tx.purchaseItem.findMany({
        where: { purchaseId: id },
        select: { id: true, quantity: true, damagedQuantity: true },
      });
      const yeniGelen = await gelenAdetler(id);
      const toplamBeklenen = guncelKalemler.reduce((s, k) => s + k.quantity, 0);
      const toplamGelen = guncelKalemler.reduce(
        (s, k) => s + (yeniGelen.get(k.id) ?? 0) + k.damagedQuantity,
        0,
      );

      await tx.purchase.update({
        where: { id },
        data: {
          status:
            toplamGelen === 0
              ? "ORDERED"
              : toplamGelen >= toplamBeklenen
                ? "RECEIVED"
                : "PARTIALLY_RECEIVED",
        },
      });
    });
  } catch (e) {
    console.error("[alim] guncellenemedi:", e);
    return { hatalar: [t("guncellenemedi")] };
  }

  revalidatePath("/alimlar");
  revalidatePath(`/alimlar/${id}`);
  revalidatePath("/stok");
  redirect(`/alimlar/${id}`);
}

/**
 * ALIM İPTAL — kayıt SİLİNMEZ, iptal olarak işaretlenir.
 *
 * Mal kabul yapılmışsa iptal edilemez: stok defterine giren malı geri almak
 * ayrı bir düzeltme işidir, bir iptal düğmesinin sessizce yapacağı şey değil.
 */
export async function alimIptalEt(
  _oncekiDurum: AlimDurumu,
  formData: FormData,
): Promise<AlimDurumu> {
  const t = await getTranslations("Alim");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("bulunamadi")] };

  const alim = await prisma.purchase.findUnique({ where: { id } });
  if (!alim) return { hatalar: [t("bulunamadi")] };

  const gelen = await gelenAdetler(id);
  const toplamGelen = [...gelen.values()].reduce((s, n) => s + n, 0);
  if (toplamGelen > 0) return { hatalar: [t("iptalEdilemez")] };

  await prisma.purchase.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/alimlar");
  revalidatePath(`/alimlar/${id}`);
  return {};
}
