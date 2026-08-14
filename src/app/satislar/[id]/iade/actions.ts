"use server";

import { yetkiIste } from "@/lib/yetki";
import { basariAdresi } from "@/lib/bildirim";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import {
  cezaOnerisi,
  DegisimStokYokHatasi,
  DonenMaliyetYokHatasi,
  FazlaIadeHatasi,
  fifoMaliyeti,
  iadeEtkisiHesapla,
  iadeKaydet,
  komisyonToplami,
  satisCikisMaliyeti,
  type IadeSatiri,
} from "@/lib/iade";
import { prisma } from "@/lib/prisma";
import { acikPartiler, fifoDagit, varyantStogu } from "@/lib/stok";

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
  /**
   * 6. SENARYO — DÖNEN (yanlış giden) varyant. Satılan varyanttan
   * farklıysa motor beş hareketlik defteri yazar (bkz. lib/iade.ts).
   * Boşsa akış değişmez: dönen mal satılan maldır.
   */
  donenVaryantId: string;
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
  /** Hangi bildirimden geldi — kaydedilince o bildirim kapatılır. */
  bildirimId: string;
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

    /**
     * ÖNİZLEME = KAYIT. Girdiyi kuran parçalar `lib/iade.ts`'ten geliyor;
     * kayıt yolu da aynılarını çağırıyor. Eskiden bu blok kendi kopyasını
     * taşıyordu ve değişim maliyetini YAKLAŞIK hesaplıyordu (en eski
     * hareketin birim maliyeti × adet) — kapanmış partileri de sayıyor,
     * çok partili çıkışta tutmuyordu. Ekranda bir rakam, kayıtta başka
     * rakam demekti.
     */
    const maliyet = satisCikisMaliyeti(kalem.stockMovements);

    let degisimMaliyeti: number | null = null;
    if (g.exchangeVariantId) {
      // Kayıtla AYNI kaynak: açık partiler + FIFO dağıtımı.
      const partiler = await acikPartiler(prisma, g.exchangeVariantId);
      const dagitim = fifoDagit(partiler, g.iadeAdedi);
      // Stok yetmiyorsa değişim zaten kaydedilemez; önizlemede uydurma
      // rakam göstermek yerine satır hiç çizilmez, hüküm kayıtta verilir.
      if (dagitim.yeterliMi) degisimMaliyeti = fifoMaliyeti(dagitim.dagitim);
    }

    kalemler.push({
      satilanAdet: kalem.quantity,
      iadeAdedi: g.iadeAdedi,
      saglamAdet: g.saglamAdet,
      satisTutari: Number(kalem.unitPriceAmount.toString()) * kalem.quantity,
      maliyet,
      kdvOrani: kalem.vatRate ? Number(kalem.vatRate.toString()) : 20,
      komisyon: komisyonToplami(kalem.fees),
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
        donenVaryantId: k.donenVaryantId || null,
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
    /**
     * GERİ GELEN MALIN MALİYETİ YOK — ayrı hata, ayrı mesaj. Eskiden bu
     * durum "değişim ürününde stok yok" diye görünüyordu ve kullanıcıyı
     * yanlış ürüne baktırıyordu (T4, 14.08.2026).
     */
    if (e instanceof DonenMaliyetYokHatasi) {
      const varyant = await prisma.productVariant.findUnique({
        where: { id: e.variantId },
        include: { product: { select: { name: true } } },
      });
      return {
        hata: t("donenMaliyetYok", {
          urun: varyant
            ? `${varyant.product.name} (${varyant.sku})`
            : e.variantId,
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

  /**
   * BİLDİRİM İADEYE BAĞLANIR VE KAPANIR.
   *
   * `returnId` bire birdir: bir bildirimden bir iade doğar. `returnId: null`
   * koşulu ikinci kez işlemeyi engeller — aksi hâlde aynı bildirimden iki
   * iade açılıp stok iki kez düzeltilebilirdi. Ayrılmış rozeti de bu
   * kapanışla kendiliğinden düşer (türetilmiş, sayaç değil).
   */
  if (girdi.bildirimId) {
    await prisma.returnNotice.updateMany({
      where: { id: girdi.bildirimId, returnId: null },
      data: { returnId: yeniId, status: "KAPANDI" },
    });
    revalidatePath("/iadeler");
  }

  revalidatePath(`/satislar/${girdi.saleId}`);
  revalidatePath("/satislar");
  revalidatePath("/stok");
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
