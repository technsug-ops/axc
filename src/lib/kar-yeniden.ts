import { karHesapla, type KarGirdisi, type KarSonucu } from "@/lib/kar";
import { prisma } from "@/lib/prisma";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  KÂR YENİDEN HESAPLAMA
 * ----------------------------------------------------------------------------
 *  Kâr satış anında snapshot'lanır. Yanlış bir oran veya eksik kargo sonradan
 *  fark edilirse bu servis kullanılır: DEĞERLERİ DÜZELTİP yeniden hesaplar.
 *
 *  NE DEĞİŞİR : komisyon oran/tutarı, kargo firması/desi/tutarı, kâr snapshot'ı
 *  NE DEĞİŞMEZ: stok hareketleri, FIFO partileri, satılan adet, satış fiyatı
 *
 *  Yani ledger'a DOKUNULMAZ — kâr hesabı yeniden yazılır, mal hareketi değil.
 *  Bu ayrım bilinçlidir: stok düzeltmesi ters ADJUSTMENT ile yapılır.
 *
 *  `onizle` ile yazmadan sonuç alınır; ekran eski/yeni değerleri yan yana
 *  gösterip kullanıcıdan onay ister (Kullanıcı Kolaylığı #6).
 * ============================================================================
 */

export type YenidenHesaplaGirdisi = {
  saleId: string;
  /** Kalem kimliği -> düzeltilmiş komisyon. */
  kalemler: {
    saleItemId: string;
    commissionRate: number | null;
    commissionAmount: number | null;
  }[];
  cargoCarrierId: string | null;
  cargoDesi: number | null;
  /**
   * Elle girilen kargo tutarı — KDV DAHİL. Doluysa tarife kullanılmaz
   * (komisyondaki oran/tutar ikilisinin aynısı: panel gerçeği kazanır).
   */
  cargoAmountManual: number | null;
};

export type YenidenHesaplaSonucu = {
  onceki: { net1: number | null; net2: number | null; durum: string | null };
  yeni: KarSonucu;
  paraBirimi: Currency;
};

/** Kâr girdisini veritabanından toplar; hesaplar ama YAZMAZ. */
export async function karOnizle(
  girdi: YenidenHesaplaGirdisi,
): Promise<YenidenHesaplaSonucu | null> {
  const satis = await prisma.sale.findUnique({
    where: { id: girdi.saleId },
    include: {
      channelAccount: { select: { channelId: true } },
      items: {
        orderBy: { id: "asc" },
        include: {
          // Maliyet FIFO çıkışlarından okunur — ledger'ın kendisi.
          stockMovements: {
            where: { type: "SALE_OUT" },
            select: {
              quantityDelta: true,
              unitCostAmount: true,
              unitCostCurrency: true,
            },
          },
        },
      },
    },
  });
  if (!satis) return null;

  const kurallar = await prisma.channelFee.findMany({
    where: {
      channelId: satis.channelAccount.channelId,
      isActive: true,
      validFrom: { lte: satis.soldAt },
    },
    orderBy: { validFrom: "desc" },
  });
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
      basis:
        k.basis === "FIXED" ? ("FIXED" as const) : ("SALE_AMOUNT" as const),
      rate: k.rate ? Number(k.rate.toString()) : null,
      amount: k.amount ? Number(k.amount.toString()) : null,
    }));

  // --- kargo: elle tutar tarifeyi EZER ---
  let kargoTarifesi: number | null = null;
  let kargoTarifesiBulunamadi = false;

  // != null bilerek: undefined de null gibi ele alinir.
  if (girdi.cargoAmountManual != null) {
    // Elle girilen tutar KDV DAHİL; motor KDV hariç bekliyor.
    kargoTarifesi = girdi.cargoAmountManual / 1.2;
  } else if (girdi.cargoCarrierId && girdi.cargoDesi != null) {
    const tarife = await prisma.cargoTariff.findFirst({
      where: {
        channelId: satis.channelAccount.channelId,
        carrierId: girdi.cargoCarrierId,
        desi: Math.max(0, Math.ceil(girdi.cargoDesi)),
      },
      select: { amount: true },
    });
    if (tarife) kargoTarifesi = Number(tarife.amount.toString());
    else kargoTarifesiBulunamadi = true;
  }

  const duzeltmeler = new Map(girdi.kalemler.map((k) => [k.saleItemId, k]));

  const kalemler: KarGirdisi["kalemler"] = satis.items.map((kalem) => {
    let maliyet: number | null = 0;
    let maliyetParaBirimi: Currency | null = null;
    for (const h of kalem.stockMovements) {
      if (h.unitCostAmount === null) {
        maliyet = null;
        break;
      }
      maliyet =
        (maliyet ?? 0) +
        Number(h.unitCostAmount.toString()) * Math.abs(h.quantityDelta);
      maliyetParaBirimi = h.unitCostCurrency;
    }

    const duzeltme = duzeltmeler.get(kalem.id);

    return {
      satisTutari: Number(kalem.unitPriceAmount.toString()) * kalem.quantity,
      satisParaBirimi: kalem.unitPriceCurrency,
      maliyet,
      maliyetParaBirimi,
      // KDV oranı satış anındaki snapshot'tan gelir; yeniden hesapta DEĞİŞMEZ.
      kdvOrani: kalem.vatRate ? Number(kalem.vatRate.toString()) : 20,
      komisyonTutari: duzeltme?.commissionAmount ?? null,
      komisyonOrani: duzeltme?.commissionRate ?? null,
    };
  });

  const yeni = karHesapla({
    kalemler,
    komisyonKdvOrani,
    siparisKesintileri,
    kargoTarifesi,
    kargoTarifesiBulunamadi,
  });

  return {
    onceki: {
      net1: satis.net1Amount ? Number(satis.net1Amount.toString()) : null,
      net2: satis.net2Amount ? Number(satis.net2Amount.toString()) : null,
      durum: satis.profitStatus,
    },
    yeni,
    paraBirimi: satis.profitCurrency ?? kalemler[0]?.satisParaBirimi ?? "TRY",
  };
}

/** Önizlemedeki sonucu KALICI yazar. Ledger'a dokunmaz. */
export async function karYenidenYaz(
  girdi: YenidenHesaplaGirdisi,
): Promise<boolean> {
  const onizleme = await karOnizle(girdi);
  if (!onizleme) return false;

  const { yeni, paraBirimi } = onizleme;

  await prisma.$transaction(async (tx) => {
    const satis = await tx.sale.findUnique({
      where: { id: girdi.saleId },
      include: { items: { orderBy: { id: "asc" }, select: { id: true } } },
    });
    if (!satis) return;

    // Eski kesinti dökümü silinir; yerine yenisi yazılır.
    // Bu SaleFee kayıtları hesabın fotoğrafıdır, ledger değildir —
    // yeniden hesapta değişmeleri beklenir.
    await tx.saleFee.deleteMany({ where: { saleId: girdi.saleId } });

    const kargoKalemi = yeni.siparisKesintileri.find((k) => k.code === "KARGO");
    const kargoHaric =
      kargoKalemi === undefined ? null : kargoKalemi.tutar / 1.2;

    await tx.sale.update({
      where: { id: girdi.saleId },
      data: {
        cargoCarrierId: girdi.cargoCarrierId,
        cargoDesi: girdi.cargoDesi === null ? null : String(girdi.cargoDesi),
        cargoAmount: kargoHaric === null ? null : String(kargoHaric),
        cargoCurrency: kargoHaric === null ? null : "TRY",
        net1Amount: String(yeni.net1),
        net2Amount: String(yeni.net2),
        profitCurrency: paraBirimi,
        profitStatus: yeni.durum,
        calculatedAt: new Date(),
      },
    });

    const duzeltmeler = new Map(girdi.kalemler.map((k) => [k.saleItemId, k]));

    for (const [i, kalem] of satis.items.entries()) {
      const sonuc = yeni.kalemler[i];
      if (!sonuc) continue;
      const duzeltme = duzeltmeler.get(kalem.id);

      await tx.saleItem.update({
        where: { id: kalem.id },
        data: {
          commissionRate:
            duzeltme?.commissionRate === null ||
            duzeltme?.commissionRate === undefined
              ? null
              : String(duzeltme.commissionRate),
          net1Amount: String(sonuc.net1),
          net2Amount: String(sonuc.net2),
          profitStatus: sonuc.durum,
        },
      });

      for (const kesinti of sonuc.kesintiler) {
        await tx.saleFee.create({
          data: {
            saleId: girdi.saleId,
            saleItemId: kalem.id,
            code: kesinti.code,
            amount: String(kesinti.tutar),
            currency: paraBirimi,
          },
        });
      }
    }

    for (const kesinti of yeni.siparisKesintileri) {
      await tx.saleFee.create({
        data: {
          saleId: girdi.saleId,
          code: kesinti.code,
          amount: String(kesinti.tutar),
          currency: paraBirimi,
        },
      });
    }
  });

  return true;
}
