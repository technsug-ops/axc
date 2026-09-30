import type { IadeGeriAlmaNedeni } from "@/generated/prisma/enums";
import type { DonemIsrari } from "@/lib/donem-korumasi";
import { DONEM_ISTISNA_EYLEMI, donemIstisnaIzi, donemKapisi } from "@/lib/donem-kapisi";
import {
  iadeGeriAlmaImzasi,
  iadeGeriAlmaPlani,
  type IadeGeriAlmaPlani,
  type IadeHareketi,
} from "@/lib/iade-geri-alma";
import { izYaz } from "@/lib/iz";
import { satisKarTazele } from "@/lib/kar-yeniden";
import { prisma, type IslemIstemcisi } from "@/lib/prisma";
import { acikPartilerToplu } from "@/lib/stok";

/**
 * ============================================================================
 *  İADEYİ GERİ AL — VERİ VE YAZIM (K44 · 2. adım)
 * ----------------------------------------------------------------------------
 *  Kurallar `lib/iade-geri-alma.ts`te (saf). Burada yalnız okunur/yazılır:
 *  ① plan girdisi defterden kurulur (iadenin kalemlerine bağlı HER hareket;
 *     giriş partisinin FIFO'da kalan adedi `acikPartilerToplu`dan);
 *  ② yazma anında plan YENİDEN kurulur, imzası onaylananla aynı değilse
 *     YAZILMAZ (arada stok oynadıysa kullanıcı görmediği bir plana onay
 *     vermiş olmaz);
 *  ③ tek işlem: ters hareketler · iade «geri alındı» · bildirim yeniden
 *     açılır · iz. Satış kalemine bağlı hareket döndüyse satışın kârı
 *     işlemden SONRA tazelenir (kâr motoru kendi işlemini kurar).
 * ============================================================================
 */

export const IADE_GERI_ALINDI_EYLEMI = "IADE_GERI_ALINDI";

async function sistemNedeniId(tx: IslemIstemcisi): Promise<string> {
  const mevcut = await tx.stockAdjustmentReason.findUnique({
    where: { systemKey: "IADE_GERI_ALMA" },
    select: { id: true },
  });
  if (mevcut) return mevcut.id;
  const yeni = await tx.stockAdjustmentReason.create({
    data: { name: "İade geri alındı", systemKey: "IADE_GERI_ALMA", movementType: "ADJUSTMENT", requiresNote: false },
    select: { id: true },
  });
  return yeni.id;
}

type IadeOkumasi = {
  id: string;
  saleId: string;
  occurredAt: Date;
  geriAlindiAt: Date | null;
  hareketler: IadeHareketi[];
  tazminatSayisi: number;
};

/** Plan girdisini defterden kurar — HİÇBİR ŞEY YAZMAZ. */
export async function iadeGeriAlmaOku(db: IslemIstemcisi, returnId: string): Promise<IadeOkumasi | null> {
  const iade = await db.return.findUnique({
    where: { id: returnId },
    select: {
      id: true,
      saleId: true,
      occurredAt: true,
      geriAlindiAt: true,
      items: {
        select: {
          _count: { select: { compensations: true } },
          stockMovements: {
            select: {
              id: true,
              variantId: true,
              returnItemId: true,
              quantityDelta: true,
              unitCostAmount: true,
              unitCostCurrency: true,
              locationId: true,
              saleItemId: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!iade) return null;

  const hamlar = iade.items.flatMap((k) => k.stockMovements);
  const girisVaryantlari = [...new Set(hamlar.filter((h) => h.quantityDelta > 0).map((h) => h.variantId))];
  /** Sınır YOK — "bugün itibarıyla bu parti ne kadar açık" sorusu. */
  const partiler = await acikPartilerToplu(db, girisVaryantlari);
  const kalan = new Map<string, number>();
  for (const liste of partiler.values()) for (const p of liste) kalan.set(p.hareketId, p.kalanAdet);

  return {
    id: iade.id,
    saleId: iade.saleId,
    occurredAt: iade.occurredAt,
    geriAlindiAt: iade.geriAlindiAt,
    tazminatSayisi: iade.items.reduce((t, k) => t + k._count.compensations, 0),
    hareketler: hamlar.map((h) => ({
      hareketId: h.id,
      variantId: h.variantId,
      returnItemId: h.returnItemId!,
      quantityDelta: h.quantityDelta,
      kalanAdet: kalan.get(h.id) ?? 0,
      birimMaliyet: h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
      birimMaliyetParaBirimi: h.unitCostCurrency,
      locationId: h.locationId,
      saleItemId: h.saleItemId,
    })),
  };
}

/** Önizleme: nedenden bağımsız engelleri de göstermek için neden «YANLIS_GIRIS» varsayılarak kurulur. */
export async function iadeGeriAlmaOnizle(returnId: string): Promise<{
  plan: IadeGeriAlmaPlani;
  imza: string;
  saleId: string;
} | null> {
  const o = await iadeGeriAlmaOku(prisma, returnId);
  if (!o) return null;
  const plan = iadeGeriAlmaPlani({
    geriAlindiMi: o.geriAlindiAt !== null,
    hareketler: o.hareketler,
    tazminatSayisi: o.tazminatSayisi,
    neden: "YANLIS_GIRIS",
    not: null,
  });
  return { plan, imza: iadeGeriAlmaImzasi(plan), saleId: o.saleId };
}

export type IadeGeriAlSonucu =
  | { durum: "TAMAM"; saleId: string; satisKariTazelendi: boolean | null }
  | { durum: "YOK" | "PLAN_DEGISTI" | "YARISTI" }
  | { durum: "ENGEL"; plan: Extract<IadeGeriAlmaPlani, { olur: false }> };

export async function iadeyiGeriAl(girdi: {
  returnId: string;
  neden: IadeGeriAlmaNedeni | null;
  not: string | null;
  onaylananImza: string;
  kullaniciId: string | null;
  donemIsrari?: DonemIsrari;
}): Promise<IadeGeriAlSonucu> {
  const sonuc = await prisma.$transaction(
    async (tx) => {
      const o = await iadeGeriAlmaOku(tx, girdi.returnId);
      if (!o) return { durum: "YOK" as const };
      const not = girdi.not === null || girdi.not.trim() === "" ? null : girdi.not.trim();
      const plan = iadeGeriAlmaPlani({
        geriAlindiMi: o.geriAlindiAt !== null,
        hareketler: o.hareketler,
        tazminatSayisi: o.tazminatSayisi,
        neden: girdi.neden,
        not,
      });
      if (!plan.olur) return { durum: "ENGEL" as const, plan };
      /** ⛔ ONAY GÖSTERİLENE VERİLMİŞTİR — arada defter oynadıysa yazılmaz. */
      if (iadeGeriAlmaImzasi(plan) !== girdi.onaylananImza) return { durum: "PLAN_DEGISTI" as const };

      /**
       * ⛔ DÖNEM KAPISI — iadenin kâr etkisi İADE GÜNÜNÜN dönemindedir;
       * geri almak o dönemin rakamını değiştirir. Kapalıysa ısrar ister.
       */
      const kapi = await donemKapisi(tx, o.occurredAt, girdi.donemIsrari);
      if (kapi.durum === "ISRARLA_GECILDI") {
        await izYaz(
          {
            action: DONEM_ISTISNA_EYLEMI,
            targetType: "Return",
            targetId: o.id,
            detail: donemIstisnaIzi({
              yol: "/satislar/[id]/iade/[iadeId]/geri-al",
              donem: kapi.donem,
              isTarihi: o.occurredAt,
              israr: girdi.donemIsrari,
            }),
          },
          tx,
        );
      }

      /** ⛔ ŞARTLI — başka bir sekme aynı anda geri aldıysa ikinci kez yazılmaz. */
      const an = new Date();
      const r = await tx.return.updateMany({
        where: { id: o.id, geriAlindiAt: null },
        data: { geriAlindiAt: an, geriAlmaNedeni: girdi.neden, geriAlmaNotu: not, geriAlanId: girdi.kullaniciId },
      });
      if (r.count !== 1) return { durum: "YARISTI" as const };

      const nedenId = plan.hareketler.length > 0 ? await sistemNedeniId(tx) : null;
      for (const h of plan.hareketler) {
        await tx.stockMovement.create({
          data: {
            variantId: h.variantId,
            type: "ADJUSTMENT",
            quantityDelta: h.quantityDelta,
            occurredAt: an,
            returnItemId: h.returnItemId,
            saleItemId: h.saleItemId,
            sourceMovementId: h.sourceMovementId,
            locationId: h.locationId,
            adjustmentReasonId: nedenId,
            unitCostAmount: h.birimMaliyet,
            unitCostCurrency: h.birimMaliyetParaBirimi,
            note: `İade geri alındı (${o.id})`,
          },
        });
      }

      /**
       * BİLDİRİM YENİDEN AÇILIR — iade yeniden girilebilsin. Müşteri vazgeçtiyse
       * mal gelmeyecek: İPTAL. Değilse mal elimizde, iade bekliyor: MAL_GELDI.
       */
      await tx.returnNotice.updateMany({
        where: { returnId: o.id },
        data: { returnId: null, status: girdi.neden === "MUSTERI_VAZGECTI" ? "IPTAL" : "MAL_GELDI" },
      });

      await izYaz(
        {
          action: IADE_GERI_ALINDI_EYLEMI,
          targetType: "Return",
          targetId: o.id,
          detail: JSON.stringify({
            neden: girdi.neden,
            not,
            hareketler: plan.hareketler,
            satisKariTazelenir: plan.satisKariTazelenir,
          }),
        },
        tx,
      );
      return { durum: "TAMAM" as const, saleId: o.saleId, satisKariTazelenir: plan.satisKariTazelenir };
    },
    { timeout: 30_000 },
  );

  if (sonuc.durum !== "TAMAM") return sonuc;
  const tazelendi = sonuc.satisKariTazelenir ? await satisKarTazele(sonuc.saleId) : null;
  return { durum: "TAMAM", saleId: sonuc.saleId, satisKariTazelendi: tazelendi };
}
