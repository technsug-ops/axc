import { prisma } from "@/lib/prisma";
import { satisKalemToplamlari } from "@/lib/tutar";
import {
  iptalPlani,
  type IptalGirdisi,
  type IptalPlani,
} from "@/lib/satis-iptali";
import type { SatisIptalSebebi } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  SATIŞ İPTALİ — VERİ TARAFI
 * ----------------------------------------------------------------------------
 *  Kural `lib/satis-iptali.ts`te; burası yalnız OKUR ve YAZAR.
 *
 *  ── ÖNİZLEME İLE YAZMA AYNI PLANI KULLANIR ──────────────────────────────
 *  `iptalOnizle` ve `iptalUygula` ikisi de `planKur` çağırır. Ekranda
 *  gösterilen plan ile yazılan hareketler ayrışamaz — kullanıcı "2 adet
 *  dönecek" yazısını okuyup onayladıysa tam olarak o yazılır.
 *
 *  Bu ayrım iade modülünde de var (`lib/iade.ts` — "ÖNİZLEME İLE KAYIT AYNI
 *  KAYNAKTAN BESLENİR").
 * ============================================================================
 */

/** Plan kurmak için gereken her şeyi tek sorguda toplar. */
async function planKur(
  saleId: string,
  sebep: SatisIptalSebebi | null,
  not: string | null,
): Promise<{ plan: IptalPlani; satisKodu: string | null } | null> {
  const satis = await prisma.sale.findUnique({
    where: { id: saleId },
    select: {
      id: true,
      code: true,
      iptalTarihi: true,
      net2Amount: true,
      profitCurrency: true,
      items: {
        select: {
          quantity: true,
          unitPriceAmount: true,
          unitPriceCurrency: true,
          /**
           * ÇIKIŞ HAREKETLERİ — ayna hareketin kaynağı. `quantityDelta`
           * negatiftir (stoktan düştü); plan POZİTİF adet beklediği için
           * mutlak değeri alınır.
           */
          stockMovements: {
            where: { type: "SALE_OUT" },
            select: {
              id: true,
              variantId: true,
              quantityDelta: true,
              unitCostAmount: true,
              unitCostCurrency: true,
              locationId: true,
              sourceMovementId: true,
            },
          },
        },
      },
      returns: { select: { id: true, code: true } },
      /** Hakediş eşleşmesi: iptal beklenen tahsilatı da düşürür mü. */
      settlementItems: { select: { id: true }, take: 1 },
    },
  });
  if (satis === null) return null;

  const cikislar = satis.items.flatMap((k) =>
    k.stockMovements.map((h) => ({
      hareketId: h.id,
      variantId: h.variantId,
      adet: Math.abs(h.quantityDelta),
      birimMaliyet:
        h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
      birimMaliyetParaBirimi: h.unitCostCurrency,
      locationId: h.locationId,
      kaynakHareketId: h.sourceMovementId,
    })),
  );

  const toplamlar = satisKalemToplamlari(satis.items);
  const paraBirimi = satis.profitCurrency ?? toplamlar[0]?.paraBirimi ?? "TRY";

  const girdi: IptalGirdisi = {
    iptalEdilmisMi: satis.iptalTarihi !== null,
    iadeler: satis.returns.map((i) => ({ id: i.id, kod: i.code })),
    sebep,
    not,
    cikislar,
    etki: {
      // Ciro, satışın kendi para biriminden okunur; kur çevirisi YOK.
      ciro:
        toplamlar.find((t) => t.paraBirimi === paraBirimi)?.tutar ??
        toplamlar[0]?.tutar ??
        0,
      net2: satis.net2Amount === null ? null : Number(satis.net2Amount.toString()),
      paraBirimi,
      hakedisEslesmisMi: satis.settlementItems.length > 0,
    },
  };

  return { plan: iptalPlani(girdi), satisKodu: satis.code };
}

/** ÖNİZLEME — hiçbir şey yazmaz. */
export async function iptalOnizle(
  saleId: string,
  sebep: SatisIptalSebebi | null,
  not: string | null,
) {
  return planKur(saleId, sebep, not);
}

export type IptalYazmaSonucu =
  | { tamam: true; satisKodu: string | null; geriDonenAdet: number }
  | { tamam: false; engel: string; iade?: { id: string; kod: string | null } };

/**
 * İPTALİ YAZAR — tek transaction.
 *
 * ⚠ PLAN BURADA YENİDEN KURULUR, ekrandan gelen plana GÜVENİLMEZ. Ekran
 * planı gösterdikten sonra başka bir sekmede iade girilmiş olabilir; yazma
 * anında kural yeniden sorulur. İstemciden gelen bir plana göre stok
 * yazmak, kuralı istemcinin insafına bırakmak olurdu.
 */
export async function iptalUygula(girdi: {
  saleId: string;
  sebep: SatisIptalSebebi;
  not: string | null;
  kullaniciId: string;
  an: Date;
}): Promise<IptalYazmaSonucu> {
  const kurulum = await planKur(girdi.saleId, girdi.sebep, girdi.not);
  if (kurulum === null) return { tamam: false, engel: "SATIS_YOK" };

  const { plan, satisKodu } = kurulum;
  if (!plan.olur) {
    return { tamam: false, engel: plan.engel, iade: plan.iade };
  }

  await prisma.$transaction(async (tx) => {
    /**
     * SALE_OUT SİLİNMEZ. Ters işaretli giriş hareketleri yazılır; defter
     * "çıktı ve geri döndü" der. Silmek geçmişi değiştirmek olurdu.
     */
    for (const h of plan.hareketler) {
      await tx.stockMovement.create({
        data: {
          variantId: h.variantId,
          type: "SALE_CANCEL_IN",
          quantityDelta: h.quantityDelta,
          occurredAt: girdi.an,
          locationId: h.locationId,
          unitCostAmount: h.birimMaliyet,
          unitCostCurrency: h.birimMaliyetParaBirimi as never,
          sourceMovementId: h.sourceMovementId,
        },
      });
    }

    await tx.sale.update({
      where: { id: girdi.saleId },
      data: {
        iptalTarihi: girdi.an,
        iptalSebebi: girdi.sebep,
        iptalNotu: girdi.not,
        iptalEdenId: girdi.kullaniciId,
      },
    });

    /**
     * DENETİM İZİ — `AuditLog`un ilk gerçek kullanıcısı. Geri alınamaz bir
     * işlemin kim tarafından, ne zaman ve hangi gerekçeyle yapıldığı
     * kayıtta durmalı; satış kaydındaki alanlar "ne" der, bu satır "kim ve
     * hangi bağlamda" der.
     */
    await tx.auditLog.create({
      data: {
        userId: girdi.kullaniciId,
        action: "SATIS_IPTAL",
        targetType: "Sale",
        targetId: girdi.saleId,
        detail: JSON.stringify({
          satisKodu,
          sebep: girdi.sebep,
          not: girdi.not,
          geriDonenAdet: plan.geriDonenAdet,
          hareketSayisi: plan.hareketler.length,
          etki: plan.etki,
        }),
      },
    });
  });

  return { tamam: true, satisKodu, geriDonenAdet: plan.geriDonenAdet };
}
