import { prisma } from "@/lib/prisma";
import { supheSebebi, type SupheSebebi } from "@/lib/supheli-urun";

/**
 * ŞÜPHELİ ÜRÜN VERİSİ — TEK GÖVDE (K284). Excel listesi, ekran sayıları ve
 * Ürünler sayfasındaki bağlantı sayısı BURADAN: «sayı = liste» (İlke #16).
 * «İşlem görüyor» = stokta ya da son 90 günde (iptalsiz) satılmış.
 */
/** Aday kümesi TEK SABİT — liste ve sayı ikisi de bunu kullanır (iki yerde iki koşul olmaz). */
export const SUPHELI_ADAY_KOSULU = { isActive: true, product: { isActive: true } } as const;

export type SupheliSatir = {
  kimlik: string;
  sebep: SupheSebebi;
  islemGoruyor: boolean;
  urunAdi: string;
  varyant: string;
  marka: string;
  sku: string;
  firmaSku: string;
  barkod: string;
  kategori: string;
  stok: number;
  sonSatis: Date | null;
};

export async function supheliSatirlari(): Promise<SupheliSatir[]> {
  const v = await prisma.productVariant.findMany({
    where: SUPHELI_ADAY_KOSULU,
    select: {
      id: true,
      sku: true,
      companySku: true,
      barcode: true,
      name: true,
      product: { select: { name: true, brand: true, tyKategori: true, category: { select: { name: true } } } },
    },
  });
  const adaylar = v
    .map((x) => ({ x, sebep: supheSebebi(x.barcode, x.product.tyKategori !== null) }))
    .filter((a): a is { x: (typeof v)[number]; sebep: SupheSebebi } => a.sebep !== null);
  if (adaylar.length === 0) return [];
  const ids = adaylar.map((a) => a.x.id);
  const stoklar = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    where: { variantId: { in: ids } },
    _sum: { quantityDelta: true },
  });
  const stok = new Map(stoklar.map((r) => [r.variantId, r._sum.quantityDelta ?? 0]));
  const sonSatisKayit = await prisma.$queryRawUnsafe<{ v: string; t: Date }[]>(
    "SELECT si.variantId v, MAX(s.soldAt) t FROM `SaleItem` si JOIN `Sale` s ON s.id = si.saleId WHERE s.iptalTarihi IS NULL GROUP BY si.variantId",
  );
  const sonSatis = new Map(sonSatisKayit.map((r) => [r.v, r.t]));
  const sinir = new Date(Date.now() - 90 * 864e5);
  return adaylar
    .map(({ x, sebep }) => {
      const st = stok.get(x.id) ?? 0;
      const ss = sonSatis.get(x.id) ?? null;
      return {
        kimlik: x.id,
        sebep,
        islemGoruyor: st > 0 || (ss !== null && ss >= sinir),
        urunAdi: x.product.name,
        varyant: x.name ?? "",
        marka: x.product.brand ?? "",
        sku: x.sku,
        firmaSku: x.companySku ?? "",
        barkod: (x.barcode ?? "").trim(),
        kategori: x.product.category?.name ?? "",
        stok: st,
        sonSatis: ss,
      };
    })
    .sort(
      (a, b) =>
        Number(b.islemGoruyor) - Number(a.islemGoruyor) ||
        a.sebep.localeCompare(b.sebep) ||
        a.urunAdi.localeCompare(b.urunAdi, "tr"),
    );
}

/**
 * Şüpheli SAYISI — liste ile AYNI aday kümesi (aktif varyant + `supheSebebi`),
 * stok/satış hesabı olmadan. Ürünler sayfasındaki bağlantı bunu gösterir.
 */
export async function supheliSayisi(): Promise<number> {
  const v = await prisma.productVariant.findMany({
    where: SUPHELI_ADAY_KOSULU,
    select: { barcode: true, product: { select: { tyKategori: true } } },
  });
  return v.filter((x) => supheSebebi(x.barcode, x.product.tyKategori !== null) !== null).length;
}
