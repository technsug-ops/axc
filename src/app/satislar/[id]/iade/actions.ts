"use server";

import { yetkiIste } from "@/lib/yetki";
import { basariAdresi } from "@/lib/bildirim";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  cezaOnerisi,
  DegisimStokYokHatasi,
  FazlaIadeHatasi,
  iadeEtkisiHesapla,
  iadeKaydet,
  type IadeSatiri,
} from "@/lib/iade";
import { prisma } from "@/lib/prisma";
import { varyantStogu } from "@/lib/stok";

import type { ReturnType } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  İADE FORMU — SUNUCU EYLEMLERİ
 * ----------------------------------------------------------------------------
 *  ÖNİZLE-ÖNCE-YAZ kalıbı: kullanıcı kaydetmeden önce iade etkisini satır
 *  satır görür. RETURN_IN / EXCHANGE_OUT ledger'a yazılır ve geri alınamaz;
 *  bu yüzden onay diyaloğu zorunludur (#6).
 * ============================================================================
 */

export type IadeKalemGirisi = {
  saleItemId: string;
  iadeAdedi: number;
  saglamAdet: number;
  hasarliAdet: number;
  hasarNotu: string;
  locationId: string;
  exchangeVariantId: string;
};

export type IadeFormGirdisi = {
  saleId: string;
  code: string;
  returnType: ReturnType;
  occurredAt: string;
  /** Değişim ürününün müşteriye teslim tarihi — hakediş vadesi bundan. */
  degisimTeslimTarihi: string;
  note: string;
  iadeKargosu: number | null;
  yenidenGonderimKargosu: number | null;
  ceza: number | null;
  cezaNotu: string;
  kalemler: IadeKalemGirisi[];
};

export type OnizlemeSonucu = {
  hata?: string;
  satirlar?: IadeSatiri[];
  net1?: number;
  net2?: number;
  durum?: string;
  paraBirimi?: string;
};

/** Formdaki değerlerle iade etkisini hesaplar — hiçbir şey YAZMAZ. */
export async function iadeOnizle(
  girdi: IadeFormGirdisi,
): Promise<OnizlemeSonucu> {
  await yetkiIste("iade.yaz");

  const t = await getTranslations("Iade");

  const satis = await prisma.sale.findUnique({
    where: { id: girdi.saleId },
    include: {
      items: {
        include: {
          fees: true,
          variant: { include: { product: { select: { name: true } } } },
          stockMovements: {
            where: { type: "SALE_OUT" },
            select: { quantityDelta: true, unitCostAmount: true },
          },
        },
      },
      fees: { where: { saleItemId: null } },
    },
  });
  if (!satis) return { hata: t("satisBulunamadi") };

  const secili = girdi.kalemler.filter((k) => k.iadeAdedi > 0);
  if (secili.length === 0) return { hata: t("hicKalemSecilmedi") };

  const odemeGideri = satis.fees
    .filter((f) => f.code === "ODEME_GIDERI")
    .reduce((t2, f) => t2 + Number(f.amount.toString()), 0);
  const siparisToplami = satis.items.reduce(
    (t2, k) => t2 + Number(k.unitPriceAmount.toString()) * k.quantity,
    0,
  );

  const kalemler = [];
  for (const g of secili) {
    const kalem = satis.items.find((k) => k.id === g.saleItemId);
    if (!kalem) return { hata: t("kalemBulunamadi") };

    let maliyet: number | null = 0;
    for (const h of kalem.stockMovements) {
      if (h.unitCostAmount === null) {
        maliyet = null;
        break;
      }
      maliyet =
        (maliyet ?? 0) +
        Number(h.unitCostAmount.toString()) * Math.abs(h.quantityDelta);
    }

    // Değişim maliyeti önizlemede yaklaşık: en eski partinin birim maliyeti.
    // Kesin değer kayıt anında FIFO'dan okunur.
    let degisimMaliyeti: number | null = null;
    if (g.exchangeVariantId) {
      const hareket = await prisma.stockMovement.findFirst({
        where: {
          variantId: g.exchangeVariantId,
          quantityDelta: { gt: 0 },
          unitCostAmount: { not: null },
        },
        orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
        select: { unitCostAmount: true },
      });
      if (hareket?.unitCostAmount) {
        degisimMaliyeti =
          Number(hareket.unitCostAmount.toString()) * g.iadeAdedi;
      }
    }

    kalemler.push({
      satilanAdet: kalem.quantity,
      iadeAdedi: g.iadeAdedi,
      saglamAdet: g.saglamAdet,
      satisTutari: Number(kalem.unitPriceAmount.toString()) * kalem.quantity,
      maliyet,
      kdvOrani: kalem.vatRate ? Number(kalem.vatRate.toString()) : 20,
      komisyon: kalem.fees
        .filter((f) => f.code === "KOMISYON")
        .reduce((t2, f) => t2 + Number(f.amount.toString()), 0),
      degisimMaliyeti,
    });
  }

  const sonuc = iadeEtkisiHesapla({
    returnType: girdi.returnType,
    kalemler,
    odemeGideri,
    siparisToplami,
    iadeKargosu: girdi.iadeKargosu,
    yenidenGonderimKargosu: girdi.yenidenGonderimKargosu,
    ceza: girdi.ceza,
  });

  return {
    satirlar: [...sonuc.kalemSatirlari.flat(), ...sonuc.genelSatirlar],
    net1: sonuc.net1Etkisi,
    net2: sonuc.net2Etkisi,
    durum: sonuc.durum,
    paraBirimi: satis.profitCurrency ?? "TRY",
  };
}

export type KayitSonucu = { hata?: string };

/** Önizlenen iadeyi KALICI yazar. Ledger'a dokunur — geri alınamaz. */
export async function iadeOlustur(
  girdi: IadeFormGirdisi,
): Promise<KayitSonucu> {
  const baglam = await yetkiIste("iade.yaz");

  const t = await getTranslations("Iade");

  const tarih = new Date(girdi.occurredAt);
  if (Number.isNaN(tarih.getTime())) return { hata: t("tarihGecersiz") };

  /**
   * DEĞİŞİM TESLİM TARİHİ — hakediş vadesi buradan yeniden başlar.
   * Yalnız gerçekten değişim varsa anlamlıdır; değişim yokken girilmiş
   * bir tarih sessizce yok sayılır, kayda yazılmaz.
   */
  const degisimVar = girdi.kalemler.some(
    (k) => k.iadeAdedi > 0 && k.exchangeVariantId,
  );
  let teslimTarihi: Date | null = null;
  if (degisimVar && girdi.degisimTeslimTarihi) {
    const d = new Date(girdi.degisimTeslimTarihi);
    if (Number.isNaN(d.getTime())) return { hata: t("tarihGecersiz") };
    teslimTarihi = d;
  }

  const secili = girdi.kalemler.filter((k) => k.iadeAdedi > 0);
  if (secili.length === 0) return { hata: t("hicKalemSecilmedi") };

  // Sağlam + hasarlı = iade adedi olmalı; aksi hâlde sessiz kayıp olur.
  const urunAdlari = new Map(
    (
      await prisma.saleItem.findMany({
        where: { id: { in: secili.map((k) => k.saleItemId) } },
        include: { variant: { include: { product: { select: { name: true } } } } },
      })
    ).map((k) => [k.id, k.variant.product.name]),
  );

  for (const k of secili) {
    if (k.saglamAdet + k.hasarliAdet !== k.iadeAdedi) {
      return {
        hata: t("ayrimHatasi", {
          urun: urunAdlari.get(k.saleItemId) ?? "",
          saglam: k.saglamAdet,
          hasarli: k.hasarliAdet,
          adet: k.iadeAdedi,
        }),
      };
    }

    // HASAR NOTU ZORUNLU (karar 13.08.2026). Hasarlı işaretlemek maliyeti
    // üstünüzde bırakan bir para kararıdır; gerekçesiz kalırsa aylar sonra
    // "bu 1.799 TL neydi" sorusunun cevabı kimsede olmaz. Canlıda tam olarak
    // bu oldu: hasarlı=1 girilmiş, not boş bırakılmıştı.
    if (k.hasarliAdet > 0 && k.hasarNotu.trim() === "") {
      return {
        hata: t("hasarNotuZorunlu", {
          urun: urunAdlari.get(k.saleItemId) ?? "",
        }),
      };
    }
  }

  let yeniId: string;
  try {
    yeniId = await iadeKaydet({
      saleId: girdi.saleId,
      code: girdi.code || null,
      returnType: girdi.returnType,
      occurredAt: tarih,
      note: girdi.note || null,
      // Kim girdi: OTURUMDAN gelir, formdan değil — form değeri
      // istemciden gelir ve değiştirilebilir.
      userId: baglam.kullaniciId,
      degisimTeslimTarihi: teslimTarihi,
      iadeKargosu: girdi.iadeKargosu,
      yenidenGonderimKargosu: girdi.yenidenGonderimKargosu,
      ceza: girdi.ceza,
      cezaNotu: girdi.cezaNotu || null,
      kalemler: secili.map((k) => ({
        saleItemId: k.saleItemId,
        iadeAdedi: k.iadeAdedi,
        saglamAdet: k.saglamAdet,
        hasarliAdet: k.hasarliAdet,
        hasarNotu: k.hasarNotu || null,
        locationId: k.locationId || null,
        exchangeVariantId: k.exchangeVariantId || null,
      })),
    });
  } catch (e) {
    if (e instanceof FazlaIadeHatasi) {
      return {
        hata: t("fazlaIade", {
          urun: urunAdlari.get(e.saleItemId) ?? "",
          kalan: e.kalan,
          girilen: e.girilen,
        }),
      };
    }
    if (e instanceof DegisimStokYokHatasi) {
      const varyant = await prisma.productVariant.findUnique({
        where: { id: e.variantId },
        include: { product: { select: { name: true } } },
      });
      return {
        hata: t("degisimStokYok", {
          urun: varyant?.product.name ?? e.variantId,
          istenen: e.istenen,
          mevcut: e.mevcut,
        }),
      };
    }
    console.error("[iade] beklenmeyen hata:", e);
    return { hata: t("kaydedilemedi") };
  }

  revalidatePath(`/satislar/${girdi.saleId}`);
  revalidatePath("/satislar");
  revalidatePath("/stok");
  void yeniId;
  redirect(basariAdresi(`/satislar/${girdi.saleId}`, "iadeAlindi"));
}

// ---------------------------------------------------------------------------

/** Sipariş tutarına düşen ceza kademesi. Kademesi yoksa null. */
export async function cezaOnerisiGetir(
  saleId: string,
): Promise<number | null> {
  await yetkiIste("iade.yaz");

  const satis = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      channelAccount: { select: { channelId: true } },
      items: { select: { unitPriceAmount: true, quantity: true } },
    },
  });
  if (!satis) return null;

  const toplam = satis.items.reduce(
    (t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity,
    0,
  );
  return cezaOnerisi(satis.channelAccount.channelId, toplam, satis.soldAt);
}

/** Değişim ürünü seçilince stok bilgisi — erken uyarı için. */
export async function degisimStoguGetir(variantId: string): Promise<number> {
  await yetkiIste("iade.yaz");

  return varyantStogu(variantId);
}
