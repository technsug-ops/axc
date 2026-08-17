import { karYenidenYaz } from "@/lib/kar-yeniden";
import { kdvDahilKargo } from "@/lib/kargo-kdv";
import { prisma } from "@/lib/prisma";
import {
  geriAlmaImzasi,
  geriAlmaPlani,
  type GeriAlmaGirdisi,
  type GeriAlmaNedeni,
  type GeriAlmaPlani,
} from "@/lib/iptal-geri-alma";

/**
 * ============================================================================
 *  İPTALİ GERİ AL — VERİ TARAFI
 * ----------------------------------------------------------------------------
 *  17.08.2026'da tek seferlik bir script'in yaptığı işi kalıcı hâle getirir.
 *  Kurallar `lib/iptal-geri-alma.ts`te; burası okur ve yazar.
 *
 *  ÖNİZLEME İLE YAZMA AYNI PLANI KURAR; yazma anında plan yeniden kurulup
 *  imza karşılaştırılır (EK 1).
 * ============================================================================
 */

async function planKur(
  saleId: string,
  neden: GeriAlmaNedeni | null,
  aciklama: string | null,
): Promise<{
  plan: GeriAlmaPlani;
  imza: string;
  satisKodu: string | null;
} | null> {
  const satis = await prisma.sale.findUnique({
    where: { id: saleId },
    select: {
      id: true,
      code: true,
      iptalTarihi: true,
      cargoCarrierId: true,
      cargoDesi: true,
      cargoAmount: true,
      items: { select: { id: true, variantId: true, commissionRate: true } },
    },
  });
  if (satis === null) return null;

  const varyantlar = [...new Set(satis.items.map((k) => k.variantId))];

  /**
   * AYNA HAREKETLER — iptalin yazdığı girişler. İptal tarihinden sonrasına
   * bakılır; aynı varyantın daha eski iptallerinden gelen hareketler
   * karışmasın.
   */
  const aynaKayitlari =
    satis.iptalTarihi === null
      ? []
      : await prisma.stockMovement.findMany({
          where: {
            variantId: { in: varyantlar },
            type: "SALE_CANCEL_IN",
            occurredAt: { gte: satis.iptalTarihi },
          },
          select: {
            id: true,
            variantId: true,
            quantityDelta: true,
            unitCostAmount: true,
            unitCostCurrency: true,
            locationId: true,
            sourceMovementId: true,
          },
        });

  /**
   * KİLİT 3'ÜN KANITI — iptalden sonra o maldan yapılmış çıkışlar.
   * Ters hareketin kendisi de negatif olduğu için, DAHA ÖNCE yapılmış bir
   * geri alma bu listeye girmemeli: yalnız ayna hareketlere bağlı OLMAYAN
   * çıkışlar sayılır.
   */
  const aynaIdleri = new Set(aynaKayitlari.map((a) => a.id));
  const sonrakiHamCikislar =
    satis.iptalTarihi === null
      ? []
      : await prisma.stockMovement.findMany({
          where: {
            variantId: { in: varyantlar },
            quantityDelta: { lt: 0 },
            occurredAt: { gt: satis.iptalTarihi },
          },
          select: {
            id: true,
            type: true,
            quantityDelta: true,
            occurredAt: true,
            sourceMovementId: true,
            saleItem: { select: { sale: { select: { id: true, code: true } } } },
          },
        });

  const sonrakiCikislar = sonrakiHamCikislar
    .filter((c) => c.sourceMovementId === null || !aynaIdleri.has(c.sourceMovementId))
    .map((c) => ({
      hareketId: c.id,
      tip: c.type,
      adet: c.quantityDelta,
      tarih: c.occurredAt,
      satisId: c.saleItem?.sale.id ?? null,
      satisKodu: c.saleItem?.sale.code ?? null,
    }));

  const girdi: GeriAlmaGirdisi = {
    iptalliMi: satis.iptalTarihi !== null,
    aynalar: aynaKayitlari.map((a) => ({
      hareketId: a.id,
      variantId: a.variantId,
      adet: a.quantityDelta,
      birimMaliyet:
        a.unitCostAmount === null ? null : a.unitCostAmount.toString(),
      birimMaliyetParaBirimi: a.unitCostCurrency,
      locationId: a.locationId,
      kaynakHareketId: a.sourceMovementId,
    })),
    sonrakiCikislar,
    neden,
    aciklama,
  };

  const plan = geriAlmaPlani(girdi);
  return { plan, imza: geriAlmaImzasi(plan), satisKodu: satis.code };
}

export async function geriAlmaOnizle(
  saleId: string,
  neden: GeriAlmaNedeni | null,
  aciklama: string | null,
) {
  return planKur(saleId, neden, aciklama);
}

export type GeriAlmaYazmaSonucu =
  | { tamam: true; satisKodu: string | null; stoktanCikan: number }
  | {
      tamam: false;
      engel: string;
      engelleyenler?: { tip: string; tarih: Date; satisKodu: string | null }[];
    };

export async function geriAlmaUygula(girdi: {
  saleId: string;
  neden: GeriAlmaNedeni;
  aciklama: string | null;
  onaylananImza: string;
  kullaniciId: string;
  an: Date;
}): Promise<GeriAlmaYazmaSonucu> {
  const kurulum = await planKur(girdi.saleId, girdi.neden, girdi.aciklama);
  if (kurulum === null) return { tamam: false, engel: "SATIS_YOK" };

  const { plan, imza, satisKodu } = kurulum;

  // EK 1 — onay GÖSTERİLENE verilmiştir.
  if (imza !== girdi.onaylananImza) {
    return { tamam: false, engel: "DURUM_DEGISTI" };
  }
  if (!plan.olur) {
    return {
      tamam: false,
      engel: plan.engel,
      engelleyenler: plan.engelleyenler?.map((e) => ({
        tip: e.tip,
        tarih: e.tarih,
        satisKodu: e.satisKodu,
      })),
    };
  }

  const satis = await prisma.sale.findUnique({
    where: { id: girdi.saleId },
    select: {
      cargoCarrierId: true,
      cargoDesi: true,
      cargoAmount: true,
      items: { select: { id: true, commissionRate: true } },
    },
  });
  if (satis === null) return { tamam: false, engel: "SATIS_YOK" };

  await prisma.$transaction(async (tx) => {
    for (const h of plan.hareketler) {
      /**
       * HAYALET PARTİ BAĞI TEMİZLENİR (eski kayıtlar). Yeni iptaller bu bağı
       * hiç yazmıyor; eskiler geri alınırken düzeltilir.
       */
      if (h.temizlenecekAynaId !== null) {
        await tx.stockMovement.update({
          where: { id: h.temizlenecekAynaId },
          data: { sourceMovementId: null },
        });
      }

      /**
       * TERS HAREKET — LEDGER SİLİNMEZ. İptalin yazdığı giriş defterde
       * kalır; onun tersi ayrı bir satır olarak yazılır.
       */
      await tx.stockMovement.create({
        data: {
          variantId: h.variantId,
          type: "ADJUSTMENT",
          quantityDelta: h.quantityDelta,
          occurredAt: girdi.an,
          locationId: h.locationId,
          unitCostAmount: h.birimMaliyet,
          unitCostCurrency: h.birimMaliyetParaBirimi as never,
          sourceMovementId: h.sourceMovementId,
          note: `İptal geri alındı — satış ${satisKodu ?? girdi.saleId}`,
        },
      });
    }

    /**
     * DURUM KUTUSU KALKAR, İZ KALIR (mimar şartı). Satış iptalsiz hâle
     * gelir ama defterde "iptal edildi" ve "geri alındı" satırları yan yana
     * durur — hikâye birikir, temizlenmez.
     */
    await tx.sale.update({
      where: { id: girdi.saleId },
      data: {
        iptalTarihi: null,
        iptalSebebi: null,
        iptalNotu: null,
        iptalEdenId: null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: girdi.kullaniciId,
        action: "SATIS_IPTAL_GERI_ALINDI",
        targetType: "Sale",
        targetId: girdi.saleId,
        detail: JSON.stringify({
          satisKodu,
          neden: girdi.neden,
          aciklama: girdi.aciklama,
          stoktanCikan: plan.stoktanCikacakAdet,
          hareketSayisi: plan.hareketler.length,
        }),
      },
    });
  });

  // Kâr ELLE yazılmaz — motor yeniden hesaplar.
  await karYenidenYaz({
    saleId: girdi.saleId,
    kalemler: satis.items.map((k) => ({
      saleItemId: k.id,
      commissionRate:
        k.commissionRate === null ? null : Number(k.commissionRate.toString()),
      commissionAmount: null,
    })),
    cargoCarrierId: satis.cargoCarrierId,
    cargoDesi:
      satis.cargoDesi === null ? null : Number(satis.cargoDesi.toString()),
    // DB KDV hariç saklar; motor KDV dahil bekler (bkz. lib/kargo-kdv.ts).
    cargoAmountManual: kdvDahilKargo(
      satis.cargoAmount === null ? null : Number(satis.cargoAmount.toString()),
    ),
  });

  return { tamam: true, satisKodu, stoktanCikan: plan.stoktanCikacakAdet };
}
