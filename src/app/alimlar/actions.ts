"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export type AlimDurumu = {
  hatalar?: string[];
};

/** Formda ve barkod aramasında kullanılan hafif varyant özeti. */
export type VaryantSonucu = {
  id: string;
  urunAdi: string;
  marka: string | null;
  varyantAdi: string | null;
  sku: string;
  axcaliSku: string;
  barcode: string | null;
};

// ---------------------------------------------------------------------------
//  ARAMA
// ---------------------------------------------------------------------------

function varyantiOzetle(v: {
  id: string;
  sku: string;
  axcaliSku: string;
  barcode: string | null;
  name: string | null;
  product: { name: string; brand: string | null };
}): VaryantSonucu {
  return {
    id: v.id,
    urunAdi: v.product.name,
    marka: v.product.brand,
    varyantAdi: v.name,
    sku: v.sku,
    axcaliSku: v.axcaliSku,
    barcode: v.barcode,
  };
}

const VARYANT_SECIMI = {
  id: true,
  sku: true,
  axcaliSku: true,
  barcode: true,
  name: true,
  product: { select: { name: true, brand: true } },
} as const;

/** Serbest metin araması: ürün adı, SKU, Firma SKU veya barkod. */
export async function varyantAra(sorgu: string): Promise<VaryantSonucu[]> {
  const q = sorgu.trim();
  if (q.length < 2) return [];

  const varyantlar = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      OR: [
        { sku: { contains: q } },
        { axcaliSku: { contains: q } },
        { barcode: { contains: q } },
        { product: { name: { contains: q } } },
      ],
    },
    select: VARYANT_SECIMI,
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  return varyantlar.map(varyantiOzetle);
}

/**
 * Okutulan kodun TAM karşılığını bulur.
 * Barkod okuyucudan / kameradan gelen kod için kullanılır: kısmi eşleşme
 * istemeyiz, yanlış ürün eklemek kötü olur.
 */
export async function varyantKodlaBul(
  kod: string,
): Promise<VaryantSonucu | null> {
  const temiz = kod.trim();
  if (!temiz) return null;

  const varyant = await prisma.productVariant.findFirst({
    where: {
      isActive: true,
      OR: [
        { barcode: temiz },
        { axcaliSku: temiz },
        { sku: temiz },
      ],
    },
    select: VARYANT_SECIMI,
  });

  return varyant ? varyantiOzetle(varyant) : null;
}

// ---------------------------------------------------------------------------
//  ALIM OLUŞTURMA
// ---------------------------------------------------------------------------

const kalemSemasi = z.object({
  variantId: z.string().min(1, "ürün seçilmeli"),
  quantity: z
    .number({ message: "adet sayı olmalı" })
    .int("adet tam sayı olmalı")
    .min(1, "adet en az 1 olmalı"),
  unitCostAmount: z
    .number({ message: "birim fiyat sayı olmalı" })
    .min(0, "birim fiyat negatif olamaz"),
  unitCostCurrency: z.enum(["TRY", "EUR"], {
    message: "para birimi TRY veya EUR olmalı",
  }),
});

const alimSemasi = z.object({
  code: z.string().trim().min(1, "Sipariş no zorunlu").max(191),
  purchasedAt: z.string().min(1, "Alım tarihi zorunlu"),
  channelAccountId: z.string(),
  creditCardId: z.string(),
  installmentCount: z
    .number({ message: "Taksit sayısı sayı olmalı" })
    .int("Taksit sayısı tam sayı olmalı")
    .min(1, "Taksit sayısı en az 1 olmalı")
    .max(36, "Taksit sayısı en fazla 36 olabilir"),
  supplierName: z.string().trim().max(191),
  note: z.string().trim(),
  kalemler: z.array(kalemSemasi).min(1, "En az bir kalem eklenmeli"),
});

function hataMesaji(yol: PropertyKey[], mesaj: string): string {
  if (yol[0] === "kalemler" && typeof yol[1] === "number") {
    return `${yol[1] + 1}. kalem: ${mesaj}`;
  }
  return mesaj;
}

export async function alimOlustur(
  _oncekiDurum: AlimDurumu,
  formData: FormData,
): Promise<AlimDurumu> {
  const ham = formData.get("veri");
  if (typeof ham !== "string") return { hatalar: ["Form verisi okunamadı."] };

  let json: unknown;
  try {
    json = JSON.parse(ham);
  } catch {
    return { hatalar: ["Form verisi bozuk."] };
  }

  const sonuc = alimSemasi.safeParse(json);
  if (!sonuc.success) {
    return {
      hatalar: sonuc.error.issues.map((i) => hataMesaji(i.path, i.message)),
    };
  }
  const veri = sonuc.data;

  // Sipariş no benzersiz olmalı (şemada @unique).
  const mevcut = await prisma.purchase.findUnique({
    where: { code: veri.code },
  });
  if (mevcut) {
    return { hatalar: [`"${veri.code}" sipariş numarası zaten kayıtlı.`] };
  }

  const tarih = new Date(veri.purchasedAt);
  if (Number.isNaN(tarih.getTime())) {
    return { hatalar: ["Alım tarihi geçerli değil."] };
  }

  // Seçilen varyantlar gerçekten var mı?
  const varyantIdleri = [...new Set(veri.kalemler.map((k) => k.variantId))];
  const bulunan = await prisma.productVariant.count({
    where: { id: { in: varyantIdleri } },
  });
  if (bulunan !== varyantIdleri.length) {
    return { hatalar: ["Kalemlerden biri artık mevcut değil, listeyi yenileyin."] };
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
      return { hatalar: ["Bu sipariş numarası zaten kayıtlı."] };
    }
    console.error("[alim] beklenmeyen hata:", e);
    return { hatalar: ["Alım kaydedilemedi, beklenmeyen bir hata oluştu."] };
  }

  revalidatePath("/alimlar");
  redirect(`/alimlar/${yeniId}`);
}
