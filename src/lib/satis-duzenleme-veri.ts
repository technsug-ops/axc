import { acikCikislar } from "@/lib/kalem-maliyeti";
import { kdvDahilKargo } from "@/lib/kargo-kdv";
import { adetPlani } from "@/lib/satis-adet";
import { acikPartilerToplu, gunSonu } from "@/lib/stok";
import { karYenidenYaz } from "@/lib/kar-yeniden";
import { prisma } from "@/lib/prisma";
import {
  duzenlemeImzasi,
  duzenlemePlani,
  kaydedilebilirMi,
  type DuzenlemeGirdisi,
  type DuzenlemeNedeni,
  type DuzenlemePlani,
} from "@/lib/satis-duzenleme";

/**
 * ============================================================================
 *  SATIŞ DÜZENLEME — VERİ TARAFI
 * ----------------------------------------------------------------------------
 *  Kullanıcı talebi 17.08.2026: "Bir daha yanlış yaptığımda script
 *  çalışmamalı, daha kolay halletmeliyim."
 *
 *  Bugün satış 11511906855'in fiyatı tek seferlik bir script'le düzeltildi
 *  (2085 → 2805). Bu modül o işi EKRANA taşıyor.
 *
 *  ── KAPSAM: FİYAT + ADET + KARGO ────────────────────────────────────────
 *  Adet 17.08.2026'da eklendi (son dilim). Fiyat ve kargo stok defterine
 *  DOKUNMAZ; adet dokunur: artarsa FIFO'dan ek çıkış, azalırsa ayna giriş.
 *  Kurallar te, yazma aşağıda.
 *
 *  ── ÖNİZLEME İLE YAZMA AYNI PLANI KURAR ─────────────────────────────────
 *  İkisi de `planKur` çağırır; yazma anında plan YENİDEN kurulur ve imza
 *  karşılaştırılır. Onay GÖSTERİLENE verilmiştir.
 * ============================================================================
 */

export type YeniDegerler = {
  /** saleItemId → yeni birim fiyat. */
  fiyatlar: Record<string, number>;
  /** saleItemId → yeni adet. Verilmezse mevcut adet korunur. */
  adetler?: Record<string, number>;
  kargoFirmaId: string | null;
  kargoDesi: number | null;
  kargoTutar: number | null;
};

async function planKur(
  saleId: string,
  yeni: YeniDegerler,
  neden: DuzenlemeNedeni | null,
  aciklama: string | null,
): Promise<{
  plan: DuzenlemePlani;
  imza: string;
  satisKodu: string | null;
} | null> {
  const satis = await prisma.sale.findUnique({
    where: { id: saleId },
    select: {
      id: true,
      code: true,
      iptalTarihi: true,
      profitCurrency: true,
      cargoCarrierId: true,
      cargoDesi: true,
      cargoAmount: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          quantity: true,
          unitPriceAmount: true,
          unitPriceCurrency: true,
          commissionRate: true,
          variantId: true,
          variant: { select: { product: { select: { name: true } } } },
          /** İade edilen adet — adet bunun ALTINA inemez. */
          returnItems: { select: { quantity: true } },
          /**
           * Mevcut hareketler — adet azalırsa ayna girişin maliyet kaynağı.
           * SÜZGEÇ YOK: ikinci kez azaltmada, ilk azaltmayla geri dönmüş
           * çıkış tekrar kaynak olmamalı (`acikCikislar` ayıklar).
           */
          stockMovements: {
            orderBy: { createdAt: "asc" },
            select: {
              quantityDelta: true,
              unitCostAmount: true,
              unitCostCurrency: true,
              locationId: true,
            },
          },
        },
      },
    },
  });
  if (satis === null) return null;

  const sayi = (d: { toString(): string } | null) =>
    d === null ? null : Number(d.toString());

  const girdi: DuzenlemeGirdisi = {
    iptalliMi: satis.iptalTarihi !== null,
    neden,
    aciklama,
    kalemler: satis.items.map((k) => {
      const eskiFiyat = Number(k.unitPriceAmount.toString());
      return {
        saleItemId: k.id,
        eskiAdet: k.quantity,
        yeniAdet: yeni.adetler?.[k.id] ?? k.quantity,
        eskiFiyat,
        yeniFiyat: yeni.fiyatlar[k.id] ?? eskiFiyat,
        iadeEdilenAdet: k.returnItems.reduce((t, r) => t + r.quantity, 0),
        urunAdi: k.variant.product.name,
      };
    }),
    kargo: {
      eskiFirmaId: satis.cargoCarrierId,
      yeniFirmaId: yeni.kargoFirmaId,
      eskiDesi: sayi(satis.cargoDesi),
      yeniDesi: yeni.kargoDesi,
      /**
       * ⚠ KDV ÇEVİRİSİ — 17.08.2026 canlı hatası.
       *
       * `Sale.cargoAmount` KDV HARİÇ saklanır (ölçüldü: 32/32 satışta
       * KARGO kesintisi = cargoAmount × 1,20). Ekran ise KULLANICININ
       * BİLDİĞİ tutarı, yani KDV DAHİL olanı gösterir — faturada o yazar.
       *
       * Çeviri yapılmadığı için ekran KDV hariç değeri "KDV dahil" diye
       * gösterdi, kullanıcı dokunmadan geri gönderdi ve motor onu bir kez
       * daha 1,2'ye böldü: 74,13 → 61,78. Her düzenlemede kargo %20
       * küçülüyordu.
       */
      eskiTutar: kdvDahilKargo(sayi(satis.cargoAmount)),
      yeniTutar: yeni.kargoTutar,
    },
    paraBirimi:
      satis.profitCurrency ?? satis.items[0]?.unitPriceCurrency ?? "TRY",
  };

  const plan = duzenlemePlani(girdi);
  return { plan, imza: duzenlemeImzasi(plan), satisKodu: satis.code };
}

export async function duzenlemeOnizle(
  saleId: string,
  yeni: YeniDegerler,
  neden: DuzenlemeNedeni | null,
  aciklama: string | null,
) {
  return planKur(saleId, yeni, neden, aciklama);
}

export type DuzenlemeYazmaSonucu =
  | { tamam: true; satisKodu: string | null; eskiNet2: number | null; yeniNet2: number | null }
  | {
      tamam: false;
      kod: "SATIS_YOK" | "ENGEL" | "DURUM_DEGISTI";
      engel?: string;
      /**
       * Stok yetmezliğinde KAÇ ADET olduğu — ekran "yapamazsın" demekle
       * yetinmez, rakamı söyler.
       */
      ayrinti?: { urunAdi: string; gereken: number; mevcut: number };
    };

/**
 * DÜZENLEMEYİ YAZAR.
 *
 * ⚠ EK 1 — "ONAY GÖSTERİLENE VERİLMİŞTİR": plan burada YENİDEN kurulur ve
 * imzası, ekranın onayladığı imzayla karşılaştırılır. Farklıysa yazma DURUR.
 * Kullanıcı önizlemeyi açtıktan sonra araya iade/iptal girmiş ya da başka
 * biri fiyatı değiştirmiş olabilir; sessizce YENİ plana göre yazmak,
 * onaylanmamış bir işlemi onaylanmış saymaktır.
 */
export async function duzenlemeUygula(girdi: {
  saleId: string;
  yeni: YeniDegerler;
  neden: DuzenlemeNedeni;
  aciklama: string | null;
  onaylananImza: string;
  kullaniciId: string;
  an: Date;
}): Promise<DuzenlemeYazmaSonucu> {
  /**
   * NEDEN KONTROLÜ BURADA — ÖNİZLEMEDE DEĞİL.
   *
   * ⚠ 17.08.2026: kontrol saf planın içindeydi, dolayısıyla önizlemeyi de
   * kesiyordu. Kullanıcı adedi 1→2 yaptı, "Önizle"ye bastı ve "neden
   * seçilmeden kaydedilemez" dedi ekran — henüz kaydetmiyordu. İz şartı
   * değişmedi: nedensiz KAYIT yok; nedensiz BAKMAK serbest.
   */
  const izin = kaydedilebilirMi(girdi.neden, girdi.aciklama);
  if (!izin.olur) return { tamam: false, kod: "ENGEL", engel: izin.engel };

  const kurulum = await planKur(girdi.saleId, girdi.yeni, girdi.neden, girdi.aciklama);
  if (kurulum === null) return { tamam: false, kod: "SATIS_YOK" };

  const { plan, imza, satisKodu } = kurulum;
  if (imza !== girdi.onaylananImza) {
    return { tamam: false, kod: "DURUM_DEGISTI" };
  }
  if (!plan.olur) return { tamam: false, kod: "ENGEL", engel: plan.engel };

  // Öncesi — rapor için (kullanıcı NET-2 farkını görecek).
  const once = await prisma.sale.findUnique({
    where: { id: girdi.saleId },
    /** `soldAt` FIFO SINIRI icin okunuyor — bkz. asagidaki `gunSonu`. */
    select: { net2Amount: true, soldAt: true },
  });

  const kalemler = await prisma.saleItem.findMany({
    where: { saleId: girdi.saleId },
    orderBy: { id: "asc" },
    select: { id: true, commissionRate: true },
  });

  /** Adet planı için kalem ayrıntısı — mevcut çıkışlar ve varyant. */
  const kalemDetaylari = await prisma.saleItem.findMany({
    where: { saleId: girdi.saleId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      quantity: true,
      variantId: true,
      variant: { select: { product: { select: { name: true } } } },
      stockMovements: {
        orderBy: { createdAt: "asc" },
        select: {
          quantityDelta: true,
          unitCostAmount: true,
          unitCostCurrency: true,
          locationId: true,
        },
      },
    },
  });

  /**
   * ADET DEĞİŞİMİNİN STOK ETKİSİ — kurallar `lib/satis-adet.ts`te.
   * Stok yetmezse plan düşer ve HİÇBİR ŞEY yazılmaz.
   */
  const adetDegisenler = kalemDetaylari.filter(
    (k) => (girdi.yeni.adetler?.[k.id] ?? k.quantity) !== k.quantity,
  );

  let stokPlani: ReturnType<typeof adetPlani> | null = null;
  if (adetDegisenler.length > 0) {
    /** SINIR: satis gununun sonu — adet artisi da FIFO'dan duser ve
     *  geri tarihli bir satis bugunku partiyi yiyemez (29.08.2026). */
    const partiHaritasi = await acikPartilerToplu(
      prisma,
      [...new Set(adetDegisenler.map((k) => k.variantId))],
      gunSonu(once!.soldAt),
    );
    stokPlani = adetPlani(
      adetDegisenler.map((k) => ({
        saleItemId: k.id,
        variantId: k.variantId,
        urunAdi: k.variant.product.name,
        eskiAdet: k.quantity,
        yeniAdet: girdi.yeni.adetler?.[k.id] ?? k.quantity,
        cikislar: acikCikislar(
          k.stockMovements.map((h) => ({
            ...h,
            birimMaliyet:
              h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
          })),
        ).map((h) => ({
          birimMaliyet: h.birimMaliyet,
          birimMaliyetParaBirimi: h.unitCostCurrency,
          locationId: h.locationId,
          adet: h.adet,
        })),
        partiler: partiHaritasi.get(k.variantId) ?? [],
      })),
    );
    if (!stokPlani.olur) {
      return {
        tamam: false,
        kod: "ENGEL",
        engel: "STOK_YETMIYOR",
        ayrinti: stokPlani.ayrinti,
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const [saleItemId, fiyat] of Object.entries(girdi.yeni.fiyatlar)) {
      await tx.saleItem.update({
        where: { id: saleItemId },
        data: { unitPriceAmount: String(fiyat) },
      });
    }

    // ADET: önce kalem, sonra stok hareketleri.
    for (const k of adetDegisenler) {
      await tx.saleItem.update({
        where: { id: k.id },
        data: { quantity: girdi.yeni.adetler?.[k.id] ?? k.quantity },
      });
    }
    if (stokPlani !== null && stokPlani.olur) {
      for (const c of stokPlani.cikislar) {
        await tx.stockMovement.create({
          data: {
            variantId: c.variantId,
            type: "SALE_OUT",
            quantityDelta: c.quantityDelta,
            occurredAt: girdi.an,
            saleItemId: c.saleItemId,
            locationId: c.locationId,
            unitCostAmount: c.birimMaliyet,
            unitCostCurrency: c.birimMaliyetParaBirimi as never,
            sourceMovementId: c.sourceMovementId,
          },
        });
      }
      for (const g of stokPlani.girisler) {
        await tx.stockMovement.create({
          data: {
            variantId: g.variantId,
            type: "ADJUSTMENT",
            quantityDelta: g.quantityDelta,
            occurredAt: girdi.an,
            saleItemId: g.saleItemId,
            locationId: g.locationId,
            unitCostAmount: g.birimMaliyet,
            unitCostCurrency: g.birimMaliyetParaBirimi as never,
            note: "Satış adedi düşürüldü — stoğa iade",
          },
        });
      }
    }
    await tx.sale.update({
      where: { id: girdi.saleId },
      data: {
        cargoCarrierId: girdi.yeni.kargoFirmaId,
        cargoDesi: girdi.yeni.kargoDesi === null ? null : String(girdi.yeni.kargoDesi),
        cargoAmount: girdi.yeni.kargoTutar === null ? null : String(girdi.yeni.kargoTutar),
      },
    });

    /**
     * DENETİM İZİ — ESKİ ve YENİ değerle. Bugünkü script'in bıraktığı satırla
     * aynı yerde durur; satış detayı ikisini de gösterir.
     */
    await tx.auditLog.create({
      data: {
        userId: girdi.kullaniciId,
        action: "SATIS_DUZENLEME",
        targetType: "Sale",
        targetId: girdi.saleId,
        detail: JSON.stringify({
          satisKodu,
          neden: girdi.neden,
          aciklama: girdi.aciklama,
          farklar: plan.farklar,
          eskiCiro: plan.eskiCiro,
          yeniCiro: plan.yeniCiro,
          paraBirimi: plan.paraBirimi,
        }),
      },
    });
  });

  /**
   * KÂR ELLE YAZILMAZ — motor komisyon, KDV, stopaj ve kargoyu birlikte
   * çözer. Transaction DIŞINDA: `karYenidenYaz` kendi transaction'ını açıyor.
   */
  await karYenidenYaz({
    saleId: girdi.saleId,
    kalemler: kalemler.map((k) => ({
      saleItemId: k.id,
      commissionRate:
        k.commissionRate === null ? null : Number(k.commissionRate.toString()),
      commissionAmount: null,
    })),
    cargoCarrierId: girdi.yeni.kargoFirmaId,
    cargoDesi: girdi.yeni.kargoDesi,
    cargoAmountManual: girdi.yeni.kargoTutar,
  });

  const sonra = await prisma.sale.findUnique({
    where: { id: girdi.saleId },
    select: { net2Amount: true },
  });

  return {
    tamam: true,
    satisKodu,
    eskiNet2: once?.net2Amount === null ? null : Number(once!.net2Amount!.toString()),
    yeniNet2: sonra?.net2Amount === null ? null : Number(sonra!.net2Amount!.toString()),
  };
}

/**
 * SATIŞIN DENETİM İZİ — detay ekranında gösterilir.
 *
 * Kullanıcı şartı 17.08.2026: "AuditLog satırı satış detayında GÖRÜNÜR olsun
 * (bugünkü düzeltmenin izi de dahil)". Bugünkü tek seferlik script
 * `SATIS_FIYAT_DUZELTME` yazdı; bu sorgu onu da getirir.
 */
export async function satisIzleri(saleId: string) {
  return prisma.auditLog.findMany({
    where: { targetType: "Sale", targetId: saleId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      action: true,
      createdAt: true,
      detail: true,
      user: { select: { name: true, email: true } },
    },
  });
}
