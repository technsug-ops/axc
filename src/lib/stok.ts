import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  STOK MATEMATİĞİ — TEK KAYNAK
 * ----------------------------------------------------------------------------
 *  Stokla ilgili HER hesap burada yapılır. Ekranlar kendi groupBy sorgusunu
 *  yazmaz; böylece "stok nasıl hesaplanıyor" sorusunun tek bir cevabı olur.
 *
 *  TEMEL KURAL (CLAUDE.md): Varyantta "mevcut stok" kolonu yoktur.
 *  Stok = StockMovement.quantityDelta toplamıdır. Aynı şekilde bir alım
 *  kaleminin "teslim alınan sağlam" adedi de kolon değil, o kaleme ait
 *  PURCHASE_IN hareketlerinin toplamıdır.
 * ============================================================================
 */

/** Verilen varyantların güncel stoğu. Hareketi olmayan varyant haritada yer almaz. */
export async function varyantStoklari(
  varyantIdleri: string[],
): Promise<Map<string, number>> {
  if (varyantIdleri.length === 0) return new Map();

  const gruplar = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    where: { variantId: { in: varyantIdleri } },
    _sum: { quantityDelta: true },
  });

  return new Map(
    gruplar.map((g) => [g.variantId, g._sum.quantityDelta ?? 0]),
  );
}

/** Tek varyantın güncel stoğu. */
export async function varyantStogu(varyantId: string): Promise<number> {
  const sonuc = await prisma.stockMovement.aggregate({
    where: { variantId: varyantId },
    _sum: { quantityDelta: true },
  });
  return sonuc._sum.quantityDelta ?? 0;
}

/**
 * Ürün bazında toplam stok (varyantlarının toplamı).
 * Varyant listesi çağıran taraftan gelir; ek sorgu yapılmaz.
 */
export async function urunStoklari(
  urunler: { id: string; variants: { id: string }[] }[],
): Promise<Map<string, number>> {
  const varyantIdleri = urunler.flatMap((u) => u.variants.map((v) => v.id));
  const stoklar = await varyantStoklari(varyantIdleri);

  const sonuc = new Map<string, number>();
  for (const urun of urunler) {
    sonuc.set(
      urun.id,
      urun.variants.reduce((toplam, v) => toplam + (stoklar.get(v.id) ?? 0), 0),
    );
  }
  return sonuc;
}

/**
 * Alım kalemi başına TESLİM ALINAN SAĞLAM adet.
 * Ledger'dan türetilir — PurchaseItem'da böyle bir kolon bilerek yoktur.
 */
export async function kalemTeslimAlinanlar(
  kalemIdleri: string[],
): Promise<Map<string, number>> {
  if (kalemIdleri.length === 0) return new Map();

  const gruplar = await prisma.stockMovement.groupBy({
    by: ["purchaseItemId"],
    where: { purchaseItemId: { in: kalemIdleri }, type: "PURCHASE_IN" },
    _sum: { quantityDelta: true },
  });

  const harita = new Map<string, number>();
  for (const grup of gruplar) {
    if (grup.purchaseItemId) {
      harita.set(grup.purchaseItemId, grup._sum.quantityDelta ?? 0);
    }
  }
  return harita;
}

/** Varyant başına son hareket tarihi (stok listesinde gösterilir). */
export async function sonHareketTarihleri(
  varyantIdleri: string[],
): Promise<Map<string, Date>> {
  if (varyantIdleri.length === 0) return new Map();

  const gruplar = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    where: { variantId: { in: varyantIdleri } },
    _max: { occurredAt: true },
  });

  const harita = new Map<string, Date>();
  for (const grup of gruplar) {
    if (grup._max.occurredAt) harita.set(grup.variantId, grup._max.occurredAt);
  }
  return harita;
}

// ---------------------------------------------------------------------------
//  SAF HESAPLAR (veritabanına gitmez)
// ---------------------------------------------------------------------------

export type KalemIlerlemesi = {
  beklenen: number;
  saglam: number;
  hasarli: number;
  /** Henüz gelmemiş adet. */
  kalan: number;
  tamamlandiMi: boolean;
};

export function kalemIlerlemesi(
  beklenen: number,
  saglam: number,
  hasarli: number,
): KalemIlerlemesi {
  const islenen = saglam + hasarli;
  return {
    beklenen,
    saglam,
    hasarli,
    kalan: Math.max(0, beklenen - islenen),
    tamamlandiMi: islenen >= beklenen,
  };
}

/**
 * Alımın durumunu kalemlerin ilerlemesinden hesaplar.
 * DRAFT ve CANCELLED buraya girmez; onlar elle yönetilen durumlardır.
 */
export function alimDurumunuHesapla(
  kalemler: { beklenen: number; saglam: number; hasarli: number }[],
): "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" {
  if (kalemler.length === 0) return "ORDERED";

  const hepsiTamam = kalemler.every(
    (k) => k.saglam + k.hasarli >= k.beklenen,
  );
  if (hepsiTamam) return "RECEIVED";

  const hicIslemYok = kalemler.every((k) => k.saglam + k.hasarli === 0);
  return hicIslemYok ? "ORDERED" : "PARTIALLY_RECEIVED";
}
