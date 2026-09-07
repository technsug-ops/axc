import { acikCikislar } from "@/lib/kalem-maliyeti";
import { izYaz } from "@/lib/iz";
import { KALEM_GECERLI } from "@/lib/kalem-gecerli";
import {
  geriAlmaPlani,
  kaldirmaImzasi,
  kaldirmaPlani,
  type GeriAlmaPlani,
  type KaldirmaGirdisi,
  type KaldirmaPlani,
} from "@/lib/kalem-kaldirma";
import { satisKarTazele } from "@/lib/kar-yeniden";
import { prisma } from "@/lib/prisma";
import { acikPartilerToplu } from "@/lib/stok";
import type { SatisKalemKaldirmaSebebi } from "@/generated/prisma/enums";

/**
 * SAYIM KORUMASI YOK: bu yol hareketin İŞ TARİHİNİ **ŞU AN** yazıyor
 * (`girdi.an = new Date()`, çağıran:
 * `app/satislar/[id]/kalem-kaldir-actions.ts`). Sayım damgası da geçmişte ya
 * da bugünde; dolayısıyla `hareketIsTarihi >= sonSayimIsTarihi` HER ZAMAN
 * doğru ve kapı `SERBEST` döner — çağırmak, ölçüm yapmadan bir satır
 * eklemek olurdu. Kardeş yollar aynı gerekçeyle muaf: `satis-iptali-veri.ts`,
 * `iptal-geri-alma-veri.ts`, `satis-duzenleme-veri.ts`.
 *
 * ⚠ ÖLÇÜLDÜ, VARSAYILMADI (07.09.2026): bu dosyadaki `occurredAt`
 * yazımlarının İKİSİ de `girdi.an`. Kaldırmanın aynası KALDIRMANIN yapıldığı
 * ana yazılır, satışın tarihine değil — geri alma da öyle.
 *
 * ⛔ AÇILIŞ ŞARTI: bu yol bir gün kullanıcıdan tarih almaya başlarsa beyan
 * DÜŞER ve kapı bağlanır. Bekçi bunu kendiliğinden yakalar — `occurredAt`
 * sabit olmaktan çıktığı an dosya yeniden kapsama girer.
 */

/**
 * ============================================================================
 *  KALEM KALDIRMA — VERİ KATMANI (K78, 07.09.2026)
 * ----------------------------------------------------------------------------
 *  Saf mekanik `lib/kalem-kaldirma.ts`te; burada yalnız DEFTERDEN OKUMA ve
 *  YAZMA var. Kural buraya kopyalanmaz — kopyalansaydı iki yerde iki ölçüt
 *  olur ve biri güncellenirken öteki eski kuralla kalırdı.
 * ============================================================================
 */

/** Kalemin bugünkü hâli + plan + imza. Ekran da yazma da bunu çağırır. */
async function planKur(
  saleItemId: string,
  sebep: SatisKalemKaldirmaSebebi | null,
  not: string | null,
) {
  const kalem = await prisma.saleItem.findUnique({
    where: { id: saleItemId },
    select: {
      id: true,
      saleId: true,
      variantId: true,
      quantity: true,
      unitPriceAmount: true,
      unitPriceCurrency: true,
      net2Amount: true,
      kaldirildiAt: true,
      variant: { select: { product: { select: { name: true } } } },
      returnItems: { select: { quantity: true } },
      /**
       * SÜZGEÇ YOK — kaleme bağlı TÜM hareketler. Stoğa dönecek mal
       * `acikCikislar` ile çözülür; ham `SALE_OUT` listesi, adedi düşürülmüş
       * ya da kısmen iade edilmiş bir kalemde stoğu ŞİŞİRİRDİ.
       */
      stockMovements: {
        orderBy: { createdAt: "asc" },
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
      sale: { select: { id: true, code: true, iptalTarihi: true } },
    },
  });
  if (kalem === null) return null;

  /**
   * SATIŞTA KAÇ GEÇERLİ KALEM KALDI — "son kalem" kapısının girdisi.
   * ⛔ Süzgeç ORTAK GÖVDEDEN (`KALEM_GECERLI`): burada elle
   * `kaldirildiAt: null` yazılsaydı, ölçüt değiştiği gün bu kapı eski
   * kuralla kalırdı.
   */
  const gecerliKalemSayisi = await prisma.saleItem.count({
    where: { saleId: kalem.saleId, ...KALEM_GECERLI },
  });

  const cikislar = acikCikislar(
    kalem.stockMovements.map((h) => ({
      ...h,
      birimMaliyet:
        h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
    })),
  ).map((h) => ({
    variantId: h.variantId,
    adet: h.adet,
    birimMaliyet: h.birimMaliyet,
    birimMaliyetParaBirimi: h.unitCostCurrency as string | null,
    locationId: h.locationId,
  }));

  const girdi: KaldirmaGirdisi = {
    kaldirilmisMi: kalem.kaldirildiAt !== null,
    satisIptalliMi: kalem.sale.iptalTarihi !== null,
    kalemIadeAdedi: kalem.returnItems.reduce((t, r) => t + r.quantity, 0),
    gecerliKalemSayisi,
    sebep,
    not,
    cikislar,
    etki: {
      ciro: Number(kalem.unitPriceAmount.toString()) * kalem.quantity,
      net2:
        kalem.net2Amount === null ? null : Number(kalem.net2Amount.toString()),
      paraBirimi: kalem.unitPriceCurrency,
      // Bu kalem gittikten sonra kaç tane kalır.
      kalanKalemSayisi: Math.max(gecerliKalemSayisi - 1, 0),
    },
  };

  const plan = kaldirmaPlani(girdi);
  return {
    plan,
    imza: kaldirmaImzasi(plan),
    saleId: kalem.saleId,
    satisKodu: kalem.sale.code,
    urunAdi: kalem.variant.product.name,
    adet: kalem.quantity,
  };
}

export type KaldirmaOnizlemesi = {
  plan: KaldirmaPlani;
  imza: string;
  saleId: string;
  satisKodu: string | null;
  urunAdi: string;
  adet: number;
};

/** ÖNİZLEME — hiçbir şey yazmaz. */
export async function kaldirmaOnizle(
  saleItemId: string,
  sebep: SatisKalemKaldirmaSebebi | null,
  not: string | null,
): Promise<KaldirmaOnizlemesi | null> {
  return planKur(saleItemId, sebep, not);
}

export type KaldirmaYazmaSonucu =
  | { tamam: true; satisKodu: string | null; geriDonenAdet: number }
  | { tamam: false; engel: string };

/**
 * KALDIRMAYI YAZAR — tek transaction.
 *
 * ⚠ PLAN BURADA YENİDEN KURULUR; ekrandan gelen plana GÜVENİLMEZ. Önizleme
 * açıldıktan sonra o kaleme iade girilmiş, satış iptal edilmiş ya da başka
 * bir kalem kaldırılmış (ve bu artık SON kalem hâline gelmiş) olabilir.
 */
export async function kaldirmaUygula(girdi: {
  saleItemId: string;
  sebep: SatisKalemKaldirmaSebebi;
  not: string | null;
  /** Ekranın onayladığı plan imzası. */
  onaylananImza: string;
  kullaniciId: string;
  an: Date;
}): Promise<KaldirmaYazmaSonucu> {
  const kurulum = await planKur(girdi.saleItemId, girdi.sebep, girdi.not);
  if (kurulum === null) return { tamam: false, engel: "KALEM_YOK" };

  const { plan, imza, saleId, satisKodu, urunAdi, adet } = kurulum;

  /** ONAY GÖSTERİLENE VERİLMİŞTİR — araya bir şey girdiyse yazma DURUR. */
  if (imza !== girdi.onaylananImza) {
    return { tamam: false, engel: "DURUM_DEGISTI" };
  }
  if (!plan.olur) return { tamam: false, engel: plan.engel };

  await prisma.$transaction(async (tx) => {
    /**
     * SALE_OUT SİLİNMEZ. Ters işaretli giriş hareketleri yazılır; defter
     * "çıktı ve geri döndü" der.
     *
     * ⛔ `sourceMovementId` VERİLMİYOR — K96 (satış iptali) ölçümü: pozitif
     * hareket zaten YENİ PARTİ sayılıyor; kaynak bağı da taşırsa eski
     * partinin tüketimini geri alır ve aynı adet FIFO'ya iki kez girer.
     *
     * ⭐ AMA `saleItemId` VERİLİYOR — iptalden ayrıldığı tek nokta. Kaldırma
     * TEK KALEMİ hedefler; ayna kaleme bağlı olmazsa `acikCikislar` o kalemin
     * çıkışını hâlâ AÇIK görür, `kalemMaliyeti` maliyeti düşmez ve geri alma
     * yolu aynayı yeniden bulamaz. Bağ, "hangi satır neyi geri getirdi"
     * sorusunun tek cevabıdır.
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
          saleItemId: girdi.saleItemId,
          userId: girdi.kullaniciId,
          note: `Kalem kaldırıldı (${girdi.sebep}) — satış ${satisKodu ?? saleId}`,
        },
      });
    }

    await tx.saleItem.update({
      where: { id: girdi.saleItemId },
      data: { kaldirildiAt: girdi.an, kaldirmaSebebi: girdi.sebep },
    });

    /** ⛔ İZ ORTAK GÖVDEDEN — `userId` kendiliğinden damgalanır (K90). */
    await izYaz(
      {
        userId: girdi.kullaniciId,
        action: "SATIS_KALEMI_KALDIRMA",
        targetType: "SaleItem",
        targetId: girdi.saleItemId,
        /**
         * ⚠ ÖNCEKİ DEĞER SATIR BAZINDA SAKLANIR (anayasa): tek satırlık bir
         * yazım bile "ne vardı" sorusunu cevaplayabilmeli. Geri alma yolu
         * BUNA BAĞLI DEĞİL — o, aynanın açıklığından yeniden hesaplanıyor.
         */
        detail: JSON.stringify({
          satisKodu,
          saleId,
          urunAdi,
          adet,
          sebep: girdi.sebep,
          not: girdi.not,
          geriDonenAdet: plan.geriDonenAdet,
          etki: plan.etki,
        }),
      },
      tx,
    );
  });

  /**
   * KÂR ELLE YAZILMAZ — motor kalan kalemler üstünden yeniden çözer.
   * Transaction DIŞINDA: `satisKarTazele` kendi transaction'ını açıyor.
   *
   * ⚠ VE BU ADIM ŞART: kalem süzülse bile satışın `net1Amount`/`net2Amount`
   * damgası eski kalem kümesiyle hesaplanmış hâlde kalırdı — ciro düşer,
   * NET düşmez ve marj sessizce şişerdi.
   */
  await satisKarTazele(saleId);

  return { tamam: true, satisKodu, geriDonenAdet: plan.geriDonenAdet };
}

/**
 * ============================================================================
 *  GERİ ALMA — ölçüt AYNANIN AÇIKLIĞI, saklanan liste değil
 * ----------------------------------------------------------------------------
 *  Kaldırma anında yazılan ayna, `saleItemId` + `SALE_CANCEL_IN` ile bugün
 *  YENİDEN BULUNUR. Hiçbir yerde "şu hareketleri yazmıştım" listesi
 *  tutulmuyor — o liste bozulur (boyut sınırı, kırpılma, biçim), ölçüt
 *  bozulmaz.
 * ============================================================================
 */
async function geriAlmaKur(saleItemId: string) {
  const kalem = await prisma.saleItem.findUnique({
    where: { id: saleItemId },
    select: {
      id: true,
      saleId: true,
      variantId: true,
      kaldirildiAt: true,
      sale: { select: { code: true } },
      stockMovements: {
        where: { type: "SALE_CANCEL_IN" },
        select: {
          id: true,
          variantId: true,
          quantityDelta: true,
          unitCostAmount: true,
          unitCostCurrency: true,
          locationId: true,
        },
      },
    },
  });
  if (kalem === null) return null;

  const aynalar = kalem.stockMovements;
  const aynaAdedi = aynalar.reduce((t, h) => t + h.quantityDelta, 0);

  /**
   * AÇIK ADET ORTAK GÖVDEDEN (`acikPartilerToplu`) — ikinci bir "parti açık
   * mı" ölçütü yazılsaydı biri kapalı derken öteki açık derdi.
   */
  const partiler = await acikPartilerToplu(
    prisma,
    aynalar.length === 0 ? [] : [...new Set(aynalar.map((a) => a.variantId))],
  );
  const acik = new Map<string, number>();
  for (const [, liste] of partiler) {
    for (const p of liste) acik.set(p.hareketId, p.kalanAdet);
  }
  const acikAynaAdedi = aynalar.reduce(
    (t, h) => t + (acik.get(h.id) ?? 0),
    0,
  );

  const plan = geriAlmaPlani({
    kaldirilmisMi: kalem.kaldirildiAt !== null,
    acikAynaAdedi,
    aynaAdedi,
  });

  return { plan, kalem, aynalar, satisKodu: kalem.sale.code };
}

export type GeriAlmaOnizlemesi = {
  plan: GeriAlmaPlani;
  satisKodu: string | null;
};

/** ÖNİZLEME — hiçbir şey yazmaz. */
export async function geriAlmaOnizle(
  saleItemId: string,
): Promise<GeriAlmaOnizlemesi | null> {
  const kurulum = await geriAlmaKur(saleItemId);
  if (kurulum === null) return null;
  return { plan: kurulum.plan, satisKodu: kurulum.satisKodu };
}

export type GeriAlmaSonucu =
  | { tamam: true; satisKodu: string | null; dusulecekAdet: number }
  | { tamam: false; engel: string };

export async function geriAlmaUygula(girdi: {
  saleItemId: string;
  kullaniciId: string;
  an: Date;
}): Promise<GeriAlmaSonucu> {
  const kurulum = await geriAlmaKur(girdi.saleItemId);
  if (kurulum === null) return { tamam: false, engel: "KALEM_YOK" };

  const { plan, kalem, aynalar, satisKodu } = kurulum;
  if (!plan.olur) return { tamam: false, engel: plan.engel };

  await prisma.$transaction(async (tx) => {
    /**
     * TERS HAREKET — LEDGER SİLİNMEZ. Kaldırmanın yazdığı giriş defterde
     * kalır; onun tersi ayrı bir satır olarak yazılır.
     *
     * ⭐ VE BU SEFER `sourceMovementId` YAZILIR — burada hareket NEGATİF,
     * yani bir parti TÜKETİMİ. Aynayı kapatan bağ tam olarak budur; bağ
     * yazılmazsa ayna partisi FIFO'da sonsuza kadar açık kalır ve o mal
     * ikinci kez satılabilir görünür. (K96 yasağı POZİTİF hareket içindi.)
     */
    for (const h of aynalar) {
      await tx.stockMovement.create({
        data: {
          variantId: h.variantId,
          type: "ADJUSTMENT",
          quantityDelta: -h.quantityDelta,
          occurredAt: girdi.an,
          locationId: h.locationId,
          unitCostAmount: h.unitCostAmount,
          unitCostCurrency: h.unitCostCurrency,
          sourceMovementId: h.id,
          saleItemId: girdi.saleItemId,
          userId: girdi.kullaniciId,
          note: `Kalem kaldırma geri alındı — satış ${satisKodu ?? kalem.saleId}`,
        },
      });
    }

    /**
     * DURUM KALKAR, İZ KALIR: kalem geçerli hâle döner ama defterde
     * "kaldırıldı" ve "geri alındı" satırları yan yana durur.
     */
    await tx.saleItem.update({
      where: { id: girdi.saleItemId },
      data: { kaldirildiAt: null, kaldirmaSebebi: null },
    });

    await izYaz(
      {
        userId: girdi.kullaniciId,
        action: "SATIS_KALEMI_KALDIRMA_GERI",
        targetType: "SaleItem",
        targetId: girdi.saleItemId,
        detail: JSON.stringify({
          satisKodu,
          saleId: kalem.saleId,
          dusulecekAdet: plan.dusulecekAdet,
          hareketSayisi: aynalar.length,
        }),
      },
      tx,
    );
  });

  // Kâr ELLE yazılmaz — motor yeniden hesaplar.
  await satisKarTazele(kalem.saleId);

  return { tamam: true, satisKodu, dusulecekAdet: plan.dusulecekAdet };
}
