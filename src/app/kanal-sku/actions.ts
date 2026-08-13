"use server";

import { yetkiIste } from "@/lib/yetki";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  KANAL SKU İŞLEMLERİ
 * ----------------------------------------------------------------------------
 *  Bu ekranın varlık sebebi: komisyon oranı `ChannelSku` seviyesinde
 *  tutuluyor (ürün×pazaryeri bazında farklı ve HAFTALIK değişiyor) ama onu
 *  yazacak bir ekran yoktu. Oran boş kalınca kâr motoru RULE_MISSING üretiyor
 *  ve satış "kârı hesaplanamadı" diye duruyordu.
 *
 *  ORAN DEĞİŞTİĞİNDE GEÇMİŞ BOZULMAZ: satış anında oran satışa
 *  snapshot'lanır (SaleItem.commissionRate). Buradaki değişiklik yalnızca
 *  BUNDAN SONRAKİ satışların önerisini etkiler.
 * ============================================================================
 */

/**
 * Çakışma METİN DEĞİL YAPIDIR: "bu eşleme zaten var" cümlesini okuyan
 * kullanıcı, var olan kaydı elle aramak zorunda kalıyordu. Artık hangi
 * kayıt olduğu ve oraya gidiş yolu birlikte dönüyor (eyleme dönük hata).
 */
export type EslemeCakismasi = {
  /** Aynı varyant mı çakıştı, yoksa aynı kanal kodu mu? */
  tur: "varyant" | "kod";
  hesapId: string;
  /** Listeyi o kayda süzecek arama terimi. */
  arama: string;
  urun: string;
  kanalKodu: string;
};

export type KanalSkuDurumu = {
  hatalar?: string[];
  basari?: string;
  cakisma?: EslemeCakismasi;
};

type Ceviri = (
  anahtar: string,
  degerler?: Record<string, string | number>,
) => string;

/** "18,5" / "18.5" -> 18.5 · boş -> null */
function oranCoz(ham: FormDataEntryValue | null): number | null {
  const metin = String(ham ?? "").trim().replace(",", ".");
  if (metin === "") return null;
  return Number(metin);
}

function tazele() {
  revalidatePath("/kanal-sku");
  // Satış formu komisyon önerisini buradan alıyor.
  revalidatePath("/satislar/yeni");
}

function oranSemasiKur(t: Ceviri) {
  return z
    .number({ message: t("oranSayiOlmali") })
    .min(0, t("oranAralik"))
    .max(100, t("oranAralik"));
}

export async function kanalSkuEkle(
  _oncekiDurum: KanalSkuDurumu,
  formData: FormData,
): Promise<KanalSkuDurumu> {
  await yetkiIste("kanalsku.yaz");

  const t = await getTranslations("KanalSku");

  const variantId = String(formData.get("variantId") ?? "");
  const channelAccountId = String(formData.get("channelAccountId") ?? "");
  if (!variantId) return { hatalar: [t("varyantZorunlu")] };
  if (!channelAccountId) return { hatalar: [t("hesapZorunlu")] };

  const oranHam = oranCoz(formData.get("commissionRate"));
  if (oranHam !== null) {
    const sonuc = oranSemasiKur(t).safeParse(oranHam);
    if (!sonuc.success) {
      return { hatalar: sonuc.error.issues.map((i) => i.message) };
    }
  }

  const varyant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { sku: true },
  });
  if (!varyant) return { hatalar: [t("varyantBulunamadi")] };

  // Kanal kodu boşsa sistem SKU'su kullanılır (içe aktarmayla aynı kural).
  const kanalKodu =
    String(formData.get("channelSku") ?? "").trim() || varyant.sku;

  const cakisan = await prisma.channelSku.findFirst({
    where: {
      channelAccountId,
      OR: [{ variantId }, { channelSku: kanalKodu }],
    },
    select: {
      variantId: true,
      channelSku: true,
      variant: {
        select: { sku: true, product: { select: { name: true } } },
      },
    },
  });
  if (cakisan) {
    const ayniVaryant = cakisan.variantId === variantId;
    return {
      hatalar: [
        ayniVaryant ? t("esleseZatenVar") : t("kodZatenVar", { kod: kanalKodu }),
      ],
      cakisma: {
        tur: ayniVaryant ? "varyant" : "kod",
        hesapId: channelAccountId,
        // Var olan kaydın SKU'suyla süzülür: liste tek satıra iner.
        arama: cakisan.variant.sku,
        urun: cakisan.variant.product.name,
        kanalKodu: cakisan.channelSku,
      },
    };
  }

  try {
    await prisma.channelSku.create({
      data: {
        variantId,
        channelAccountId,
        channelSku: kanalKodu,
        commissionRate: oranHam === null ? null : String(oranHam),
        commissionUpdatedAt: oranHam === null ? null : new Date(),
      },
    });
  } catch (e) {
    console.error("[kanal-sku] eklenemedi:", e);
    return { hatalar: [t("eklenemedi")] };
  }

  tazele();
  return { basari: t("eklendi", { sku: varyant.sku }) };
}

/** Satır içi düzenleme: kanal kodu + komisyon oranı. */
export async function kanalSkuGuncelle(
  _oncekiDurum: KanalSkuDurumu,
  formData: FormData,
): Promise<KanalSkuDurumu> {
  await yetkiIste("kanalsku.yaz");

  const t = await getTranslations("KanalSku");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const kayit = await prisma.channelSku.findUnique({
    where: { id },
    select: {
      id: true,
      channelAccountId: true,
      commissionRate: true,
      variant: { select: { sku: true } },
    },
  });
  if (!kayit) return { hatalar: [t("bulunamadi")] };

  const oran = oranCoz(formData.get("commissionRate"));
  if (oran !== null) {
    const sonuc = oranSemasiKur(t).safeParse(oran);
    if (!sonuc.success) {
      return { hatalar: sonuc.error.issues.map((i) => i.message) };
    }
  }

  const kanalKodu =
    String(formData.get("channelSku") ?? "").trim() || kayit.variant.sku;

  const cakisan = await prisma.channelSku.findFirst({
    where: {
      channelAccountId: kayit.channelAccountId,
      channelSku: kanalKodu,
      NOT: { id },
    },
    select: { id: true },
  });
  if (cakisan) return { hatalar: [t("kodZatenVar", { kod: kanalKodu })] };

  // Oran GERÇEKTEN değiştiyse damgayı tazele — "ne zaman güncellendi"
  // bilgisi haftalık takibin tek dayanağı, dokunulmadan bozulmasın.
  const eskiOran =
    kayit.commissionRate === null
      ? null
      : Number(kayit.commissionRate.toString());
  const oranDegisti = eskiOran !== oran;

  try {
    await prisma.channelSku.update({
      where: { id },
      data: {
        channelSku: kanalKodu,
        commissionRate: oran === null ? null : String(oran),
        ...(oranDegisti
          ? { commissionUpdatedAt: oran === null ? null : new Date() }
          : {}),
      },
    });
  } catch (e) {
    console.error("[kanal-sku] guncellenemedi:", e);
    return { hatalar: [t("guncellenemedi")] };
  }

  tazele();
  return { basari: t("guncellendi") };
}

export async function kanalSkuDurumDegistir(
  _oncekiDurum: KanalSkuDurumu,
  formData: FormData,
): Promise<KanalSkuDurumu> {
  await yetkiIste("kanalsku.yaz");

  const t = await getTranslations("KanalSku");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const kayit = await prisma.channelSku.findUnique({ where: { id } });
  if (!kayit) return { hatalar: [t("bulunamadi")] };

  await prisma.channelSku.update({
    where: { id },
    data: { isActive: !kayit.isActive },
  });

  tazele();
  return {
    basari: kayit.isActive ? t("pasifeAlindi") : t("aktiflestirildi"),
  };
}

/** YIKICI — çağıran ekran onay diyaloğu göstermek zorundadır (#6). */
export async function kanalSkuSil(
  _oncekiDurum: KanalSkuDurumu,
  formData: FormData,
): Promise<KanalSkuDurumu> {
  await yetkiIste("kanalsku.yaz");

  const t = await getTranslations("KanalSku");

  const id = String(formData.get("id") ?? "");
  if (!id) return { hatalar: [t("kimlikBulunamadi")] };

  const kayit = await prisma.channelSku.findUnique({ where: { id } });
  if (!kayit) return { hatalar: [t("bulunamadi")] };

  try {
    await prisma.channelSku.delete({ where: { id } });
  } catch (e) {
    console.error("[kanal-sku] silinemedi:", e);
    return { hatalar: [t("silinemedi")] };
  }

  tazele();
  return { basari: t("silindi") };
}
