import { prisma } from "@/lib/prisma";
import { skuOnizlemesi, type OnizlemeDurumu } from "@/lib/sku-onizleme";

/**
 * SKU ÖNİZLEMESİ — TEK GÖVDE (K286). Ekran, sayılar ve Excel BURADAN
 * (sayı = liste). HİÇBİR ŞEY YAZMAZ.
 *
 * KÜME: aktif varyant + aktif ürün. KALICI SIRA: ürünün sisteme giriş anı,
 * sonra varyantın giriş anı, eşitlikte kimlik — aynı veri her koşumda aynı
 * numarayı verir (sıra dışarıdan sabitlenmezse yarın başka kod çıkardı).
 * Çakışma kümesi BÜTÜN kayıtların (pasifler dahil) SKU · Firma SKU · barkodu.
 */
export type SkuOnizlemeSatiri = {
  kimlik: string;
  urunAdi: string;
  varyant: string;
  kategori: string;
  marka: string;
  eskiFirmaSku: string;
  sku: string;
  yeniKod: string | null;
  durum: OnizlemeDurumu;
};

export async function skuOnizlemeSatirlari(): Promise<SkuOnizlemeSatiri[]> {
  const [varyantlar, tumKodlar, eskiKodlar] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true, product: { isActive: true } },
      select: {
        id: true,
        sku: true,
        companySku: true,
        barcode: true,
        name: true,
        product: {
          select: {
            name: true,
            brand: true,
            categoryId: true,
            category: { select: { name: true, code: true } },
            brandKaydi: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: [{ product: { createdAt: "asc" } }, { createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.productVariant.findMany({ select: { sku: true, companySku: true, barcode: true } }),
    /** K287 — eski kodlar da DOLU sayılır: bir eski kod başka ürüne yeni kod olarak verilemez. */
    prisma.eskiKod.findMany({ select: { kod: true } }),
  ]);
  const kullanilan = new Set<string>();
  for (const k of tumKodlar) for (const d of [k.sku, k.companySku, k.barcode]) if (d) kullanilan.add(d.trim());
  for (const e of eskiKodlar) kullanilan.add(e.kod.trim());

  const onizleme = skuOnizlemesi(
    varyantlar.map((v) => ({
      kimlik: v.id,
      eskiKod: v.companySku,
      kategoriVar: v.product.categoryId !== null,
      kategoriKodu: v.product.category?.code?.trim() || null,
      markaKodu: v.product.brandKaydi?.code ?? null,
      kendiKodlari: [v.sku, v.companySku, v.barcode].filter((x): x is string => Boolean(x)).map((x) => x.trim()),
    })),
    kullanilan,
  );
  const bilgi = new Map(varyantlar.map((v) => [v.id, v]));
  return onizleme.map((o) => {
    const v = bilgi.get(o.kimlik)!;
    return {
      kimlik: o.kimlik,
      urunAdi: v.product.name,
      varyant: v.name ?? "",
      kategori: v.product.category?.name ?? "",
      marka: v.product.brandKaydi?.name ?? v.product.brand ?? "",
      eskiFirmaSku: v.companySku,
      sku: v.sku,
      yeniKod: o.yeniKod,
      durum: o.durum,
    };
  });
}
