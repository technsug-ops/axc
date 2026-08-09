import { prisma, type IslemIstemcisi } from "@/lib/prisma";

import type { Currency } from "@/generated/prisma/enums";

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
//  FIFO — PARTİLER
// ---------------------------------------------------------------------------

/**
 * Bir giriş partisi. Parti = pozitif quantityDelta'lı bir stok hareketi
 * (INITIAL, PURCHASE_IN, pozitif ADJUSTMENT/COUNT_CORRECTION).
 *
 * `kalanAdet` KOLON DEĞİLDİR — girenden, o partiyi kaynak gösteren çıkışların
 * toplamı düşülerek türetilir. Ledger tek doğruluk kaynağıdır.
 */
export type Parti = {
  hareketId: string;
  occurredAt: Date;
  girenAdet: number;
  kalanAdet: number;
  /** Decimal string olarak taşınır; float'a çevrilmez. */
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: Currency | null;
  locationId: string | null;
};

/**
 * Varyantın tüketilebilir partileri — EN ESKİ ÖNCE (FIFO sırası).
 *
 * Sadece PURCHASE_IN değil, POZİTİF olan her hareket partidir. Aksi hâlde
 * açılış stoğu (INITIAL) veya elle düzeltmeyle girilen mal "stokta görünür
 * ama satılamaz" olurdu ve negatif stok engeli yanlış yerden tetiklenirdi.
 * Maliyeti olmayan partide `birimMaliyet` null kalır.
 *
 * Transaction içinde çağrılmalıdır (satışta `tx` geçilir); yoksa okuma ile
 * yazma arasında başka bir satış araya girip aynı partiyi tüketebilir.
 */
export async function acikPartiler(
  db: IslemIstemcisi,
  variantId: string,
): Promise<Parti[]> {
  const girisler = await db.stockMovement.findMany({
    where: { variantId, quantityDelta: { gt: 0 } },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      occurredAt: true,
      quantityDelta: true,
      unitCostAmount: true,
      unitCostCurrency: true,
      locationId: true,
    },
  });

  if (girisler.length === 0) return [];

  const tuketimler = await db.stockMovement.groupBy({
    by: ["sourceMovementId"],
    where: { sourceMovementId: { in: girisler.map((g) => g.id) } },
    _sum: { quantityDelta: true },
  });

  // Çıkışlar negatiftir; tüketilen adet toplamın mutlak değeridir.
  const tuketilen = new Map<string, number>();
  for (const grup of tuketimler) {
    if (grup.sourceMovementId) {
      tuketilen.set(
        grup.sourceMovementId,
        Math.abs(grup._sum.quantityDelta ?? 0),
      );
    }
  }

  return girisler
    .map((giris) => ({
      hareketId: giris.id,
      occurredAt: giris.occurredAt,
      girenAdet: giris.quantityDelta,
      kalanAdet: giris.quantityDelta - (tuketilen.get(giris.id) ?? 0),
      birimMaliyet: giris.unitCostAmount?.toString() ?? null,
      birimMaliyetParaBirimi: giris.unitCostCurrency,
      locationId: giris.locationId,
    }))
    .filter((parti) => parti.kalanAdet > 0);
}

// ---------------------------------------------------------------------------
//  SAF HESAPLAR (veritabanına gitmez)
// ---------------------------------------------------------------------------

export type FifoPayi = { parti: Parti; adet: number };

export type FifoSonucu =
  | { yeterliMi: true; dagitim: FifoPayi[]; kalanPartiler: Parti[] }
  | { yeterliMi: false; mevcut: number };

/**
 * İstenen adedi en eski partiden başlayarak dağıtır.
 *
 * Stok yetmiyorsa HİÇBİR dağıtım yapmaz, mevcut adedi bildirir — çağıran taraf
 * satışı komple reddeder. Kısmî satış diye bir şey yok.
 *
 * `kalanPartiler` döner çünkü aynı satışta aynı varyant birden fazla kalemde
 * geçebilir; ikinci kalem, birincinin tükettiği partileri tekrar tüketmemeli.
 * Girdi dizisi DEĞİŞTİRİLMEZ.
 */
export function fifoDagit(partiler: Parti[], adet: number): FifoSonucu {
  const mevcut = partiler.reduce((toplam, p) => toplam + p.kalanAdet, 0);
  if (adet > mevcut) return { yeterliMi: false, mevcut };

  const dagitim: FifoPayi[] = [];
  const kalanPartiler: Parti[] = [];
  let kalanIhtiyac = adet;

  for (const parti of partiler) {
    if (kalanIhtiyac === 0) {
      kalanPartiler.push(parti);
      continue;
    }

    const alinan = Math.min(parti.kalanAdet, kalanIhtiyac);
    dagitim.push({ parti, adet: alinan });
    kalanIhtiyac -= alinan;

    const kalan = parti.kalanAdet - alinan;
    if (kalan > 0) kalanPartiler.push({ ...parti, kalanAdet: kalan });
  }

  return { yeterliMi: true, dagitim, kalanPartiler };
}

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
