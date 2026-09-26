import { enSikYazim, kodOner, markaAnahtari } from "@/lib/marka-kodu";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  MARKA KOD TABLOSU — OKUMA GÖVDESİ (K285)
 * ----------------------------------------------------------------------------
 *  Ekran, sayılar ve Excel BURADAN (sayı = liste). Ürünlerin TAMAMI okunur
 *  (pasifler dahil): bağ kurma da bütün ürünlere işler, sayı ile yazım aynı
 *  kümeyi görür.
 *
 *  ÜÇ KÜME, AYRI SAYILIR:
 *   · tabloda     — `Brand` kaydı olan markalar (bağlı ürün sayısıyla)
 *   · bağsız      — markası YAZILI ama tabloya bağlanmamış ürünlerin yazımları
 *                   (anahtarı tabloda VARSA «bağla», YOKSA «ekle» — öneriyle)
 *   · markasız    — marka alanı BOŞ ürün: koda bağlanamaz, doldurulacak liste
 * ============================================================================
 */

export type TablodakiMarka = {
  id: string;
  name: string;
  code: string;
  anahtar: string;
  urun: number;
  yazimlar: [string, number][];
};

export type BagsizMarka = {
  anahtar: string;
  ad: string;
  yazimlar: [string, number][];
  urun: number;
  /** Tabloda bu anahtarla kayıt VAR — yalnız bağ eksik. */
  tabloId: string | null;
  /** Yalnız tabloda YOKSA: önerilen kod (`null` = kural bulamadı, elle). */
  oneri: string | null;
};

export type MarkaDurumu = {
  tablo: TablodakiMarka[];
  bagsiz: BagsizMarka[];
  markasiz: number;
};

export async function markaDurumu(): Promise<MarkaDurumu> {
  const [markalar, urunler] = await Promise.all([
    prisma.brand.findMany({ select: { id: true, name: true, code: true, anahtar: true } }),
    prisma.product.findMany({ select: { brand: true, brandId: true } }),
  ]);
  const anahtarla = new Map(markalar.map((m) => [m.anahtar, m]));
  const bagli = new Map<string, { urun: number; yazimlar: Map<string, number> }>();
  const bagsiz = new Map<string, { urun: number; yazimlar: Map<string, number> }>();
  let markasiz = 0;
  const say = (hedef: Map<string, { urun: number; yazimlar: Map<string, number> }>, anahtar: string, yazim: string) => {
    const k = hedef.get(anahtar) ?? { urun: 0, yazimlar: new Map<string, number>() };
    k.urun++;
    if (yazim) k.yazimlar.set(yazim, (k.yazimlar.get(yazim) ?? 0) + 1);
    hedef.set(anahtar, k);
  };
  for (const u of urunler) {
    const yazim = (u.brand ?? "").trim();
    if (u.brandId !== null) {
      say(bagli, u.brandId, yazim);
      continue;
    }
    const a = markaAnahtari(yazim);
    if (a === "") markasiz++;
    else say(bagsiz, a, yazim);
  }

  const tablo = markalar
    .map((m) => {
      const k = bagli.get(m.id);
      return { ...m, urun: k?.urun ?? 0, yazimlar: [...(k?.yazimlar ?? [])].sort((x, y) => y[1] - x[1]) };
    })
    .sort((a, b) => b.urun - a.urun || a.name.localeCompare(b.name, "tr"));

  /* Öneriler SIRAYLA verilir (çok ürünlü marka önce): aynı kod iki öneriye düşmez. */
  const kullanilan = new Set(markalar.map((m) => m.code));
  const bagsizListe = [...bagsiz]
    .sort((a, b) => b[1].urun - a[1].urun || a[0].localeCompare(b[0]))
    .map(([anahtar, k]): BagsizMarka => {
      const varolan = anahtarla.get(anahtar) ?? null;
      const oneri = varolan ? null : kodOner(anahtar, kullanilan);
      if (oneri) kullanilan.add(oneri);
      return {
        anahtar,
        ad: varolan?.name ?? enSikYazim(k.yazimlar),
        yazimlar: [...k.yazimlar].sort((x, y) => y[1] - x[1]),
        urun: k.urun,
        tabloId: varolan?.id ?? null,
        oneri,
      };
    });

  return { tablo, bagsiz: bagsizListe, markasiz };
}

/**
 * Markası BOŞ ürünler — doldurulacak liste (Excel). Ölçüt `markaDurumu`nun
 * `markasiz` sayısıyla AYNI: bağsız + anahtarı boş (yalnız boşluk da boştur).
 */
export async function markasizUrunler() {
  const u = await prisma.product.findMany({
    where: { brandId: null },
    select: {
      id: true,
      name: true,
      brand: true,
      isActive: true,
      category: { select: { name: true } },
      variants: { where: { isDefault: true }, select: { sku: true, companySku: true, barcode: true }, take: 1 },
    },
    orderBy: { name: "asc" },
  });
  return u
    .filter((p) => markaAnahtari(p.brand) === "")
    .map((p) => ({
      kimlik: p.id,
      ad: p.name,
      aktif: p.isActive,
      kategori: p.category?.name ?? "",
      sku: p.variants[0]?.sku ?? "",
      firmaSku: p.variants[0]?.companySku ?? "",
      barkod: p.variants[0]?.barcode ?? "",
    }));
}
