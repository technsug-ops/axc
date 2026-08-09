import { prisma } from "@/lib/prisma";
import { acikPartiler, fifoDagit, type Parti } from "@/lib/stok";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  SATIŞ KAYDI + FIFO STOK DÜŞÜMÜ — TEK KAYNAK
 * ----------------------------------------------------------------------------
 *  Satışın kaydı, FIFO düşümü ve negatif stok engeli TEK TRANSACTION içinde
 *  yapılır. Yarım satış kaydı oluşamaz: bir kalemde stok yetmiyorsa hiçbir
 *  satır yazılmaz, hiçbir stok hareketi oluşmaz.
 *
 *  Bir satış kalemi birden fazla partiden düşebilir. O durumda parti başına
 *  AYRI bir SALE_OUT hareketi yazılır; her hareket kendi partisini
 *  (`sourceMovementId`), o partinin birim maliyetini ve rafını taşır.
 *  Böylece "bu satış hangi maldan çıktı" sorusu ledger'dan cevaplanır.
 *
 *  Maliyet SaleItem'da tutulmaz — kâr motoru (sonraki aşama) SALE_OUT
 *  hareketlerinden okur. Para birimleri birbirine ÇEVRİLMEZ.
 * ============================================================================
 */

export type SatisKalemGirdisi = {
  variantId: string;
  quantity: number;
  unitPriceAmount: string;
  unitPriceCurrency: Currency;
};

export type SatisGirdisi = {
  code: string | null;
  channelAccountId: string;
  soldAt: Date;
  note: string | null;
  kalemler: SatisKalemGirdisi[];
};

/** Stok yetmediğinde fırlatılır; transaction geri sarılır. */
export class YetersizStokHatasi extends Error {
  constructor(
    readonly variantId: string,
    readonly istenen: number,
    readonly mevcut: number,
  ) {
    super("Yetersiz stok");
    this.name = "YetersizStokHatasi";
  }
}

/** Sipariş numarası çakıştığında fırlatılır. */
export class SiparisNoCakismasiHatasi extends Error {
  constructor(readonly code: string) {
    super("Sipariş numarası zaten kayıtlı");
    this.name = "SiparisNoCakismasiHatasi";
  }
}

/**
 * Satışı kaydeder ve stoğu FIFO ile düşer.
 *
 * @returns oluşan satışın kimliği
 * @throws YetersizStokHatasi | SiparisNoCakismasiHatasi
 */
export async function satisKaydet(girdi: SatisGirdisi): Promise<string> {
  return prisma.$transaction(async (tx) => {
    if (girdi.code) {
      const cakisan = await tx.sale.findUnique({
        where: { code: girdi.code },
        select: { id: true },
      });
      if (cakisan) throw new SiparisNoCakismasiHatasi(girdi.code);
    }

    // Aynı varyant birden fazla kalemde geçebilir; partilerin kalan durumu
    // kalemler arasında taşınmalı ki aynı parti iki kez tüketilmesin.
    const partiDurumu = new Map<string, Parti[]>();

    async function varyantinPartileri(variantId: string): Promise<Parti[]> {
      const mevcut = partiDurumu.get(variantId);
      if (mevcut) return mevcut;

      const partiler = await acikPartiler(tx, variantId);
      partiDurumu.set(variantId, partiler);
      return partiler;
    }

    // ÖNCE tüm dağıtımlar hesaplanır. Böylece son kalemde stok yetmezse
    // önceki kalemler için hiçbir şey yazılmamış olur.
    const planlar: {
      kalem: SatisKalemGirdisi;
      dagitim: { parti: Parti; adet: number }[];
    }[] = [];

    for (const kalem of girdi.kalemler) {
      const partiler = await varyantinPartileri(kalem.variantId);
      const sonuc = fifoDagit(partiler, kalem.quantity);

      if (!sonuc.yeterliMi) {
        throw new YetersizStokHatasi(
          kalem.variantId,
          kalem.quantity,
          sonuc.mevcut,
        );
      }

      partiDurumu.set(kalem.variantId, sonuc.kalanPartiler);
      planlar.push({ kalem, dagitim: sonuc.dagitim });
    }

    const satis = await tx.sale.create({
      data: {
        code: girdi.code,
        channelAccountId: girdi.channelAccountId,
        soldAt: girdi.soldAt,
        note: girdi.note,
      },
      select: { id: true },
    });

    for (const plan of planlar) {
      const satisKalemi = await tx.saleItem.create({
        data: {
          saleId: satis.id,
          variantId: plan.kalem.variantId,
          quantity: plan.kalem.quantity,
          unitPriceAmount: plan.kalem.unitPriceAmount,
          unitPriceCurrency: plan.kalem.unitPriceCurrency,
        },
        select: { id: true },
      });

      for (const pay of plan.dagitim) {
        await tx.stockMovement.create({
          data: {
            variantId: plan.kalem.variantId,
            type: "SALE_OUT",
            // Çıkış negatiftir.
            quantityDelta: -pay.adet,
            occurredAt: girdi.soldAt,
            saleItemId: satisKalemi.id,
            sourceMovementId: pay.parti.hareketId,
            // Mal hangi raftan çıktıysa o raf; varyantın güncel rafı değil.
            locationId: pay.parti.locationId,
            // Maliyet partiden kopyalanır — kâr motoru bunu okuyacak.
            unitCostAmount: pay.parti.birimMaliyet,
            unitCostCurrency: pay.parti.birimMaliyetParaBirimi,
          },
        });
      }
    }

    return satis.id;
  });
}

/**
 * Bir satış kaleminin FIFO düşümleri — detay ekranı için.
 * Hangi partiden kaç adet düştüğü, o partinin maliyeti ve rafı.
 */
export async function kalemDusumleri(kalemIdleri: string[]) {
  // Boş liste geldiğinde `in: []` hiç satır döndürmez; ayrı erken çıkış
  // gerekmiyor ve dönüş tipi tek yerden türüyor.
  const hareketler = await prisma.stockMovement.findMany({
    where: { saleItemId: { in: kalemIdleri }, type: "SALE_OUT" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      saleItemId: true,
      quantityDelta: true,
      unitCostAmount: true,
      unitCostCurrency: true,
      location: { select: { code: true } },
      sourceMovement: {
        select: {
          id: true,
          occurredAt: true,
          type: true,
          purchaseItem: {
            select: { purchase: { select: { id: true, code: true } } },
          },
        },
      },
    },
  });

  const harita = new Map<string, typeof hareketler>();
  for (const hareket of hareketler) {
    if (!hareket.saleItemId) continue;
    const liste = harita.get(hareket.saleItemId) ?? [];
    liste.push(hareket);
    harita.set(hareket.saleItemId, liste);
  }
  return harita;
}

/** Tek bir FIFO düşümü — ekranların kullandığı satır tipi. */
export type Dusum = Awaited<
  ReturnType<typeof kalemDusumleri>
> extends Map<string, (infer T)[]>
  ? T
  : never;
