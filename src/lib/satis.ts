import { karHesapla, type KarGirdisi, type KarDurumu } from "@/lib/kar";
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

  // --- kâr hesabı için, formdan gelen SON değerler (snapshot) ---
  /** Satış anında çözülen KDV oranı (%). */
  vatRate: number;
  /** Kanal SKU'sundan önerilen komisyon oranı (%). Tutar verilirse yok sayılır. */
  commissionRate: number | null;
  /** Panelde görülen komisyon TUTARI (KDV dahil). Doluysa oran kullanılmaz. */
  commissionAmount: number | null;
};

export type SatisGirdisi = {
  code: string | null;
  channelAccountId: string;
  soldAt: Date;
  note: string | null;
  kalemler: SatisKalemGirdisi[];

  // --- kargo (satışta seçilir, snapshot'lanır) ---
  cargoCarrierId: string | null;
  /** Pakete giren toplam desi — formdaki son değer. */
  cargoDesi: number | null;
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

    // ------------------------------------------------------------------
    //  KÂR HESABI — aynı transaction içinde, satış anındaki oranlarla
    // ------------------------------------------------------------------
    //  Snapshot'tır: kategori oranı, komisyon oranı veya kargo tarifesi
    //  sonradan değişse bu satışın hesabı DEĞİŞMEZ. Yeniden hesaplama
    //  ayrı ve bilinçli bir eylemdir.
    await karHesabiniYaz(tx, satis.id, girdi, planlar);

    return satis.id;
  });
}

/** Kanalın kesinti kuralları + kargo tarifesi + FIFO maliyetiyle kârı yazar. */
async function karHesabiniYaz(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  saleId: string,
  girdi: SatisGirdisi,
  planlar: { kalem: SatisKalemGirdisi; dagitim: { parti: Parti; adet: number }[] }[],
) {
  const hesap = await tx.channelAccount.findUnique({
    where: { id: girdi.channelAccountId },
    select: { channelId: true },
  });
  if (!hesap) return;

  const kurallar = await tx.channelFee.findMany({
    where: {
      channelId: hesap.channelId,
      isActive: true,
      validFrom: { lte: girdi.soldAt },
    },
    orderBy: { validFrom: "desc" },
  });

  // Aynı koddan birden fazla sürüm varsa en yenisi geçerlidir.
  const gecerli = new Map<string, (typeof kurallar)[number]>();
  for (const k of kurallar) if (!gecerli.has(k.code)) gecerli.set(k.code, k);

  const komisyonKdvKurali = gecerli.get("KOMISYON_KDV");
  const komisyonKdvOrani = komisyonKdvKurali?.rate
    ? Number(komisyonKdvKurali.rate.toString())
    : null;

  const siparisKesintileri = [...gecerli.values()]
    .filter((k) => k.scope === "PER_SALE")
    .map((k) => ({
      code: k.code,
      basis: k.basis === "FIXED" ? ("FIXED" as const) : ("SALE_AMOUNT" as const),
      rate: k.rate ? Number(k.rate.toString()) : null,
      amount: k.amount ? Number(k.amount.toString()) : null,
    }));

  // --- kargo tarifesi ---
  let kargoTarifesi: number | null = null;
  let kargoTarifesiBulunamadi = false;
  if (girdi.cargoCarrierId && girdi.cargoDesi !== null) {
    const tamDesi = Math.max(0, Math.ceil(girdi.cargoDesi));
    const tarife = await tx.cargoTariff.findFirst({
      where: {
        channelId: hesap.channelId,
        carrierId: girdi.cargoCarrierId,
        desi: tamDesi,
      },
      select: { amount: true },
    });
    if (tarife) kargoTarifesi = Number(tarife.amount.toString());
    else kargoTarifesiBulunamadi = true;
  }

  // --- kalem maliyetleri FIFO dağıtımından ---
  const kalemler: KarGirdisi["kalemler"] = planlar.map((plan) => {
    let maliyet: number | null = 0;
    let maliyetParaBirimi: Currency | null = null;

    for (const pay of plan.dagitim) {
      if (pay.parti.birimMaliyet === null) {
        maliyet = null;
        break;
      }
      maliyet = (maliyet ?? 0) + Number(pay.parti.birimMaliyet) * pay.adet;
      maliyetParaBirimi = pay.parti.birimMaliyetParaBirimi;
    }

    return {
      satisTutari: Number(plan.kalem.unitPriceAmount) * plan.kalem.quantity,
      satisParaBirimi: plan.kalem.unitPriceCurrency,
      maliyet,
      maliyetParaBirimi,
      kdvOrani: plan.kalem.vatRate,
      komisyonTutari: plan.kalem.commissionAmount,
      komisyonOrani: plan.kalem.commissionRate,
    };
  });

  const sonuc = karHesapla({
    kalemler,
    komisyonKdvOrani,
    siparisKesintileri,
    kargoTarifesi,
    kargoTarifesiBulunamadi,
  });

  const paraBirimi = girdi.kalemler[0]?.unitPriceCurrency ?? "TRY";

  // --- satış seviyesi snapshot ---
  await tx.sale.update({
    where: { id: saleId },
    data: {
      cargoCarrierId: girdi.cargoCarrierId,
      cargoDesi: girdi.cargoDesi === null ? null : String(girdi.cargoDesi),
      cargoAmount: kargoTarifesi === null ? null : String(kargoTarifesi),
      cargoCurrency: kargoTarifesi === null ? null : "TRY",
      net1Amount: String(sonuc.net1),
      net2Amount: String(sonuc.net2),
      profitCurrency: paraBirimi,
      profitStatus: sonuc.durum,
      calculatedAt: girdi.soldAt,
    },
  });

  // --- kalem seviyesi snapshot + kesinti satırları ---
  const kalemKayitlari = await tx.saleItem.findMany({
    where: { saleId },
    orderBy: { id: "asc" },
    select: { id: true, variantId: true, quantity: true },
  });

  for (const [i, plan] of planlar.entries()) {
    // planlar ile kayıtlar aynı sırada oluşturuldu.
    const kayit = kalemKayitlari[i];
    if (!kayit) continue;
    const kalemSonucu = sonuc.kalemler[i];

    await tx.saleItem.update({
      where: { id: kayit.id },
      data: {
        vatRate: String(plan.kalem.vatRate),
        commissionRate:
          plan.kalem.commissionRate === null
            ? null
            : String(plan.kalem.commissionRate),
        net1Amount: String(kalemSonucu.net1),
        net2Amount: String(kalemSonucu.net2),
        profitStatus: kalemSonucu.durum,
      },
    });

    for (const kesinti of kalemSonucu.kesintiler) {
      if (kesinti.tutar === 0 && kesinti.code === "KOMISYON") continue;
      await tx.saleFee.create({
        data: {
          saleId,
          saleItemId: kayit.id,
          code: kesinti.code,
          amount: String(kesinti.tutar),
          currency: paraBirimi,
        },
      });
    }
  }

  // --- sipariş başına kesintiler (saleItemId boş) ---
  for (const kesinti of sonuc.siparisKesintileri) {
    await tx.saleFee.create({
      data: {
        saleId,
        code: kesinti.code,
        amount: String(kesinti.tutar),
        currency: paraBirimi,
      },
    });
  }
}

/** Ekranların kâr durumunu okurken kullandığı tip. */
export type { KarDurumu };

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
