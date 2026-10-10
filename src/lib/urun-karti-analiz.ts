import { prisma } from "@/lib/prisma";
import { gunEkle, type Pencere } from "@/lib/donem";
import { IADE_GECERLI } from "@/lib/iade-geri-alma";
import { KALEM_GECERLI } from "@/lib/kalem-gecerli";
import { kalemMaliyeti } from "@/lib/kalem-maliyeti";
import { kartResimleri } from "@/lib/urun-gorseli";
import {
  dagilim,
  degisimYuzdesi,
  gunAnahtari,
  gunListesi,
  gunlukSeri,
  gunlukStok,
  kanalFiyatSerileri,
  karMerdiveni,
  oran,
  stokYeterGun,
  type KartKalemi,
} from "@/lib/urun-karti-seri";

/**
 * ============================================================================
 *  ÜRÜN KÂRLILIK KARTI — DÖNEM ANALİZİ (K330, 10.10.2026)
 * ----------------------------------------------------------------------------
 *  Algoritmo ürün sayfasının veri tarafı. Bütün hesaplar SAF gövdede
 *  (`urun-karti-seri.ts`); burada yalnız okuma. Firma süzgeçli `prisma`.
 *
 *  KAPSAM — kartın mevcut ölçütüyle AYNI: iptal edilmemiş satış · kaldırılmamış
 *  kalem (`KALEM_GECERLI`) · geri alınmamış iade (`IADE_GECERLI`). Maliyet kâr
 *  motorunun ortak gövdesinden (`kalemMaliyeti`, kalemin BAĞLI hareketleri) —
 *  satışlar ekranıyla aynı kaynak.
 *
 *  ⚠ KÂR RAKAMLARI İZNE BAĞLI: `karGorunur` yoksa NET/maliyet alanları HİÇ
 *  doldurulmaz (`null`) — sunucudan çıkmaz, CSS ile gizlenmez.
 * ============================================================================
 */

/** Siparişler sekmesi satır tavanı — toplam yine TÜM dönemden (İlke #15). */
export const SIPARIS_SATIR_TAVANI = 200;

const s = (d: { toString(): string } | null | undefined) => (d === null || d === undefined ? null : Number(d.toString()));

async function donemKalemleri(variantIdler: string[], bas: Date, bitHaric: Date, karGorunur: boolean) {
  const satirlar = await prisma.saleItem.findMany({
    where: {
      variantId: { in: variantIdler },
      ...KALEM_GECERLI,
      sale: { iptalTarihi: null, soldAt: { gte: bas, lt: bitHaric } },
    },
    select: {
      id: true,
      variantId: true,
      quantity: true,
      unitPriceAmount: true,
      net1Amount: true,
      net2Amount: true,
      stockMovements: karGorunur ? { select: { quantityDelta: true, unitCostAmount: true, unitCostCurrency: true } } : false,
      sale: { select: { id: true, code: true, soldAt: true, channelAccount: { select: { name: true, channel: { select: { name: true } } } } } },
    },
    orderBy: { sale: { soldAt: "desc" } },
  });
  return satirlar.map((r) => {
    const maliyet = karGorunur
      ? kalemMaliyeti(
          (r.stockMovements ?? []).map((h) => ({
            quantityDelta: h.quantityDelta,
            birimMaliyet: h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
            birimMaliyetParaBirimi: h.unitCostCurrency,
          })),
        ).maliyet
      : null;
    const kalem: KartKalemi & { saleId: string; kod: string | null; an: Date; variantId: string; birim: number } = {
      gun: gunAnahtari(r.sale.soldAt),
      ciro: Number(r.unitPriceAmount.toString()) * r.quantity,
      adet: r.quantity,
      maliyet,
      net1: karGorunur ? s(r.net1Amount) : null,
      net2: karGorunur ? s(r.net2Amount) : null,
      kanal: r.sale.channelAccount.channel.name,
      hesap: r.sale.channelAccount.name,
      saleId: r.sale.id,
      kod: r.sale.code,
      an: r.sale.soldAt,
      variantId: r.variantId,
      birim: Number(r.unitPriceAmount.toString()),
    };
    return kalem;
  });
}

export async function kartAnalizi(variantId: string, pencere: Pencere, karGorunur: boolean) {
  const varyant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: {
      productId: true,
      gorselUrl: true,
      gorselKaynak: true,
      gorselKirikUrl: true,
      gorselGalerisi: { select: { url: true }, orderBy: { sira: "asc" } },
      product: { select: { createdAt: true } },
    },
  });
  if (!varyant) return null;

  const uzunluk = pencere.bitisHaric.getTime() - pencere.baslangic.getTime();
  const onceBas = new Date(pencere.baslangic.getTime() - uzunluk);
  const gunler = gunListesi(pencere.ilkGun, pencere.sonGun);

  const [kalemler, onceKalemler, firmaKalemleri, ilkSon, iadeSatirlari, iptalAdedi, stokOnce, stokHareket, eldeki, alimlar, kardesler] =
    await Promise.all([
      donemKalemleri([variantId], pencere.baslangic, pencere.bitisHaric, karGorunur),
      donemKalemleri([variantId], onceBas, pencere.baslangic, false),
      /* «Toplam cirodaki pay» — firmanın aynı dönemdeki bütün geçerli kalemleri. */
      prisma.saleItem.findMany({
        where: { ...KALEM_GECERLI, sale: { iptalTarihi: null, soldAt: { gte: pencere.baslangic, lt: pencere.bitisHaric } } },
        select: { quantity: true, unitPriceAmount: true },
      }),
      prisma.sale.aggregate({
        where: { iptalTarihi: null, items: { some: { variantId, ...KALEM_GECERLI } } },
        _min: { soldAt: true },
        _max: { soldAt: true },
      }),
      prisma.returnItem.findMany({
        where: { variantId, return: { ...IADE_GECERLI, occurredAt: { gte: pencere.baslangic, lt: pencere.bitisHaric } } },
        select: { quantity: true, return: { select: { occurredAt: true } } },
      }),
      prisma.saleItem.aggregate({
        /* İptal edilen adet — kaldırılmış kalem SAYILMAZ (`kalem-gecerli` bekçisi yakaladı). */
        where: { variantId, ...KALEM_GECERLI, sale: { iptalTarihi: { gte: pencere.baslangic, lt: pencere.bitisHaric } } },
        _sum: { quantity: true },
      }),
      prisma.stockMovement.aggregate({ where: { variantId, occurredAt: { lt: pencere.baslangic } }, _sum: { quantityDelta: true } }),
      prisma.stockMovement.findMany({
        where: { variantId, occurredAt: { gte: pencere.baslangic, lt: pencere.bitisHaric } },
        select: { occurredAt: true, quantityDelta: true },
      }),
      prisma.stockMovement.aggregate({ where: { variantId }, _sum: { quantityDelta: true } }),
      /* Alış fiyatı geçmişi herkese açık — eski kartın «Maliyet ve hız» bölümü de açıktı. */
      prisma.purchaseItem.findMany({
        where: { variantId, purchase: { status: { not: "CANCELLED" } } },
        select: { unitCostAmount: true, quantity: true, purchase: { select: { purchasedAt: true, receivedAt: true, code: true } } },
        orderBy: { purchase: { purchasedAt: "asc" } },
      }),
      prisma.productVariant.findMany({
        where: { productId: varyant.productId },
        select: { id: true, sku: true, name: true, barcode: true, gorselUrl: true },
        orderBy: { sku: "asc" },
      }),
    ]);

  const adet = kalemler.reduce((t, k) => t + k.adet, 0);
  const ciro = kalemler.reduce((t, k) => t + k.ciro, 0);
  const onceAdet = onceKalemler.reduce((t, k) => t + k.adet, 0);
  const onceCiro = onceKalemler.reduce((t, k) => t + k.ciro, 0);
  const firmaCiro = firmaKalemleri.reduce((t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity, 0);
  const iadeler = iadeSatirlari.map((r) => ({ gun: gunAnahtari(r.return.occurredAt), adet: r.quantity }));
  const iadeAdet = iadeler.reduce((t, i) => t + i.adet, 0);
  const eldekiAdet = eldeki._sum.quantityDelta ?? 0;
  const merdiven = karGorunur ? karMerdiveni(kalemler) : null;

  /* Kardeş varyantlar — dönem satışı ve eldeki stok. */
  const kardesIdler = kardesler.map((k) => k.id);
  const [kardesKalemleri, kardesStok] = await Promise.all([
    kardesIdler.length > 1 ? donemKalemleri(kardesIdler, pencere.baslangic, pencere.bitisHaric, karGorunur) : Promise.resolve(kalemler),
    prisma.stockMovement.groupBy({ by: ["variantId"], where: { variantId: { in: kardesIdler } }, _sum: { quantityDelta: true } }),
  ]);
  const stokHaritasi = new Map(kardesStok.map((r) => [r.variantId, r._sum.quantityDelta ?? 0]));

  return {
    resimler: kartResimleri(
      varyant.gorselUrl && varyant.gorselUrl !== varyant.gorselKirikUrl ? varyant.gorselUrl : null,
      varyant.gorselGalerisi.map((g) => g.url),
    ),
    resimKaynagi: varyant.gorselKaynak,
    aktifSiden: varyant.product.createdAt,
    ilkSatis: ilkSon._min.soldAt,
    sonSatis: ilkSon._max.soldAt,
    gunSayisi: gunler.length,
    adet,
    ciro,
    adetDegisim: degisimYuzdesi(adet, onceAdet),
    ciroDegisim: degisimYuzdesi(ciro, onceCiro),
    onceAdet,
    onceCiro,
    iptalAdet: iptalAdedi._sum.quantity ?? 0,
    iadeAdet,
    iadeOrani: oran(iadeAdet, adet),
    ciroPayi: oran(ciro, firmaCiro),
    eldekiAdet,
    stokYeterGun: stokYeterGun(eldekiAdet, adet, gunler.length),
    ortalamaFiyat: adet > 0 ? ciro / adet : null,
    merdiven,
    gunluk: gunlukSeri(kalemler, iadeler, gunler).map((n) => (karGorunur ? n : { ...n, net2: null })),
    stokSerisi: gunlukStok(
      stokOnce._sum.quantityDelta ?? 0,
      stokHareket.map((h) => ({ gun: gunAnahtari(h.occurredAt), delta: h.quantityDelta })),
      gunler,
    ),
    kanallar: dagilim(kalemler, "kanal"),
    hesaplar: dagilim(kalemler, "hesap"),
    kanalFiyatlari: kanalFiyatSerileri(kalemler, gunler),
    alimFiyatlari: alimlar.map((a) => ({
      an: a.purchase.receivedAt ?? a.purchase.purchasedAt,
      birim: Number(a.unitCostAmount.toString()),
      adet: a.quantity,
      kod: a.purchase.code,
    })),
    siparisler: kalemler.slice(0, SIPARIS_SATIR_TAVANI).map((k) => ({
      saleId: k.saleId,
      kod: k.kod,
      an: k.an,
      kanal: k.kanal,
      hesap: k.hesap,
      adet: k.adet,
      birim: k.birim,
      ciro: k.ciro,
      net2: k.net2,
    })),
    siparisToplam: { satir: kalemler.length, adet, ciro, net2: merdiven ? merdiven.net2 : null, net2Haric: merdiven ? merdiven.haricKalem : 0 },
    varyantlar: kardesler.map((v) => {
      const ks = kardesKalemleri.filter((k) => k.variantId === v.id);
      const m = karGorunur ? karMerdiveni(ks) : null;
      return {
        id: v.id,
        sku: v.sku,
        ad: v.name,
        barkod: v.barcode,
        resim: v.gorselUrl,
        eldeki: stokHaritasi.get(v.id) ?? 0,
        adet: ks.reduce((t, k) => t + k.adet, 0),
        ciro: ks.reduce((t, k) => t + k.ciro, 0),
        net2: m ? m.net2 : null,
        net2Haric: m ? m.haricKalem : 0,
        buMu: v.id === variantId,
      };
    }),
    gunler,
    oncekiDonem: { baslangic: onceBas, bitisHaric: pencere.baslangic, ilkGun: gunEkle(pencere.ilkGun, -gunler.length) },
  };
}

export type KartAnalizi = NonNullable<Awaited<ReturnType<typeof kartAnalizi>>>;
