import { getTranslations } from "next-intl/server";

import { ayKaydir, gunDegeri, gunMetni } from "@/lib/donem";
import { hesapEtiketi } from "@/lib/ice-aktarma/referans";
import { prisma } from "@/lib/prisma";

import type { Sayfa } from "./xlsx";

/**
 * ============================================================================
 *  LİSTE DIŞA AKTARIMLARI — "EKRANDA NE GÖRÜYORSAN O"
 * ----------------------------------------------------------------------------
 *  Her indirme, ekrandaki FİLTREYİ uygular. Filtre koşulları ekran koduyla
 *  aynı biçimde kurulur; ayrı bir "hepsini indir" davranışı YOK, çünkü
 *  kullanıcı süzdüğü listeyi indirmeyi bekler.
 *
 *  Tutarlar METİN olarak yazılır ve para birimi AYRI sütunda durur —
 *  TRY ile EUR'yu tek sütuna karıştırıp toplatmak kur çevirisi yanılgısına
 *  davetiye olurdu (anayasa: para birimleri çevrilmez).
 * ============================================================================
 */

export const LISTELER = [
  "urunler",
  "alimlar",
  "satislar",
  "stok",
  "giderler",
] as const;
export type ListeAnahtari = (typeof LISTELER)[number];

export function listeGecerliMi(deger: string): deger is ListeAnahtari {
  return (LISTELER as readonly string[]).includes(deger);
}

type Parametreler = Record<string, string | undefined>;

const sayi = (d: { toString(): string } | null | undefined) =>
  d === null || d === undefined ? "" : String(Number(d.toString()));

const gun = (d: Date | null | undefined) => (d ? gunMetni(d) : "");

export async function listeSayfasi(
  liste: ListeAnahtari,
  p: Parametreler,
): Promise<Sayfa> {
  switch (liste) {
    case "urunler":
      return urunlerSayfasi(p);
    case "alimlar":
      return alimlarSayfasi(p);
    case "satislar":
      return satislarSayfasi(p);
    case "stok":
      return stokSayfasi(p);
    case "giderler":
      return giderlerSayfasi(p);
  }
}

// ---------------------------------------------------------------------------

async function urunlerSayfasi(p: Parametreler): Promise<Sayfa> {
  const t = await getTranslations("IceAktarma");
  const tBaslik = await getTranslations("Basliklar");
  const ortak = await getTranslations("Ortak");
  const arama = (p.q ?? "").trim();

  const urunler = await prisma.product.findMany({
    where: arama
      ? {
          OR: [
            { name: { contains: arama } },
            { brand: { contains: arama } },
            { variants: { some: { sku: { contains: arama } } } },
            { variants: { some: { companySku: { contains: arama } } } },
            { variants: { some: { barcode: { contains: arama } } } },
          ],
        }
      : undefined,
    include: {
      category: { select: { name: true } },
      variants: {
        include: { location: { select: { code: true } } },
        orderBy: { sku: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // HER SATIR BİR VARYANT — içe aktarma şablonuyla aynı yapı, böylece
  // dışa aktarılan dosya düzenlenip geri yüklenebilir.
  const satirlar = urunler.flatMap((u) =>
    u.variants.map((v) => [
      u.name,
      u.brand,
      v.name,
      v.sku,
      v.companySku,
      v.barcode,
      u.category?.name,
      sayi(u.desi),
      v.location?.code,
      v.isActive ? ortak("aktif") : ortak("pasif"),
    ]),
  );

  return {
    ad: tBaslik("urunler"),
    basliklar: [
      t("sutunUrunAdi"),
      t("sutunMarka"),
      t("sutunVaryantAdi"),
      t("sutunSku"),
      t("sutunFirmaSku"),
      t("sutunBarkod"),
      t("sutunKategori"),
      t("sutunDesi"),
      t("sutunRaf"),
      ortak("durum"),
    ],
    satirlar,
  };
}

async function alimlarSayfasi(p: Parametreler): Promise<Sayfa> {
  const tBaslik = await getTranslations("Basliklar");
  const ortak = await getTranslations("Ortak");
  const tAlim = await getTranslations("Alim");
  const tDurum = await getTranslations("AlimDurumu");
  const arama = (p.q ?? "").trim();
  const durum = p.durum ?? "";

  const alimlar = await prisma.purchase.findMany({
    where: {
      ...(arama ? { code: { contains: arama } } : {}),
      ...(durum ? { status: durum as never } : {}),
    },
    include: {
      items: {
        include: {
          variant: { select: { sku: true } },
          // "Gelen sağlam" KOLON DEĞİL: ledger'dan türetilir (şema kuralı).
          stockMovements: { select: { quantityDelta: true } },
        },
      },
      creditCard: { select: { label: true } },
      supplier: { select: { name: true } },
    },
    orderBy: { purchasedAt: "desc" },
  });

  const satirlar = alimlar.flatMap((a) =>
    a.items.map((k) => [
      a.code,
      gun(a.purchasedAt),
      tDurum.has(a.status) ? tDurum(a.status) : a.status,
      a.supplier?.name ?? a.supplierName,
      a.supplierOrderNo,
      a.creditCard?.label,
      k.variant.sku,
      k.quantity,
      sayi(k.unitCostAmount),
      k.unitCostCurrency,
      k.stockMovements.reduce((toplam, h) => toplam + h.quantityDelta, 0),
      k.damagedQuantity,
    ]),
  );

  return {
    ad: tBaslik("alimlar"),
    basliklar: [
      ortak("kod"),
      ortak("tarih"),
      ortak("durum"),
      tAlim("tedarikci"),
      tAlim("tedarikciSiparisNo"),
      ortak("kart"),
      ortak("sku"),
      ortak("adet"),
      ortak("sutunBirimFiyat"),
      ortak("paraBirimi"),
      tAlim("sutunSaglam"),
      tAlim("sutunHasarli"),
    ],
    satirlar,
  };
}

async function satislarSayfasi(p: Parametreler): Promise<Sayfa> {
  const tBaslik = await getTranslations("Basliklar");
  const ortak = await getTranslations("Ortak");
  const tSatis = await getTranslations("Satis");
  const arama = (p.q ?? "").trim();
  const karEksik = p.kar === "eksik";

  const satislar = await prisma.sale.findMany({
    where: {
      ...(arama ? { code: { contains: arama } } : {}),
      ...(karEksik
        ? {
            OR: [
              { profitStatus: null },
              { NOT: { profitStatus: "CALCULATED" } },
            ],
          }
        : {}),
    },
    include: {
      items: { include: { variant: { select: { sku: true } } } },
      channelAccount: {
        select: { name: true, channel: { select: { name: true } } },
      },
    },
    orderBy: { soldAt: "desc" },
  });

  const satirlar = satislar.flatMap((s) =>
    s.items.map((k) => [
      s.code,
      gun(s.soldAt),
      hesapEtiketi(s.channelAccount.channel.name, s.channelAccount.name),
      k.variant.sku,
      k.quantity,
      sayi(k.unitPriceAmount),
      k.unitPriceCurrency,
      sayi(k.commissionRate),
      sayi(k.vatRate),
      sayi(s.net1Amount),
      sayi(s.net2Amount),
      s.profitCurrency,
      s.profitStatus,
    ]),
  );

  return {
    ad: tBaslik("satislar"),
    basliklar: [
      ortak("siparisNo"),
      ortak("tarih"),
      ortak("kanalHesabi"),
      ortak("sku"),
      ortak("adet"),
      ortak("sutunBirimFiyat"),
      ortak("paraBirimi"),
      tSatis("komisyonOrani"),
      ortak("oran"),
      "NET-1",
      "NET-2",
      ortak("paraBirimi"),
      ortak("durum"),
    ],
    satirlar,
  };
}

async function stokSayfasi(p: Parametreler): Promise<Sayfa> {
  const tBaslik = await getTranslations("Basliklar");
  const ortak = await getTranslations("Ortak");
  const t = await getTranslations("IceAktarma");
  const arama = (p.q ?? "").trim();

  const varyantlar = await prisma.productVariant.findMany({
    where: arama
      ? {
          OR: [
            { sku: { contains: arama } },
            { companySku: { contains: arama } },
            { barcode: { contains: arama } },
            { product: { name: { contains: arama } } },
          ],
        }
      : undefined,
    include: {
      product: { select: { name: true, brand: true } },
      location: { select: { code: true } },
      stockMovements: { select: { quantityDelta: true } },
    },
    orderBy: { sku: "asc" },
  });

  const satirlar = varyantlar.map((v) => [
    v.product.name,
    v.product.brand,
    v.name,
    v.sku,
    v.companySku,
    v.barcode,
    v.location?.code,
    // Stok = ledger toplamı; kolon olarak tutulmuyor, türetiliyor.
    v.stockMovements.reduce((toplam, h) => toplam + h.quantityDelta, 0),
    v.isActive ? ortak("aktif") : ortak("pasif"),
  ]);

  return {
    ad: tBaslik("stok"),
    basliklar: [
      t("sutunUrunAdi"),
      t("sutunMarka"),
      t("sutunVaryantAdi"),
      t("sutunSku"),
      t("sutunFirmaSku"),
      t("sutunBarkod"),
      t("sutunRaf"),
      ortak("stok"),
      ortak("durum"),
    ],
    satirlar,
  };
}

async function giderlerSayfasi(p: Parametreler): Promise<Sayfa> {
  const tBaslik = await getTranslations("Basliklar");
  const ortak = await getTranslations("Ortak");
  const tGider = await getTranslations("Gider");
  const kategori = p.kategori ?? "";

  // Ay filtresi ekranla aynı biçimde: "2026-08"
  const eslesme = /^(\d{4})-(\d{2})$/.exec(p.ay ?? "");
  const tarihFiltresi = eslesme
    ? {
        gte: gunDegeri({
          yil: Number(eslesme[1]),
          ay: Number(eslesme[2]),
          gun: 1,
        }),
        lt: gunDegeri({
          ...ayKaydir(Number(eslesme[1]), Number(eslesme[2]), 1),
          gun: 1,
        }),
      }
    : undefined;

  const giderler = await prisma.expense.findMany({
    where: {
      ...(tarihFiltresi ? { spentAt: tarihFiltresi } : {}),
      ...(kategori ? { categoryId: kategori } : {}),
    },
    include: {
      category: { select: { name: true, isFixed: true } },
      template: { select: { name: true } },
    },
    orderBy: { spentAt: "desc" },
  });

  const satirlar = giderler.map((g) => [
    gun(g.spentAt),
    g.category.name,
    g.category.isFixed ? tGider("sabit") : tGider("degisken"),
    g.description ?? g.template?.name,
    sayi(g.amount),
    g.currency,
    sayi(g.vatRate),
  ]);

  return {
    ad: tBaslik("giderler"),
    basliklar: [
      ortak("tarih"),
      ortak("kategori"),
      tGider("sabit"),
      ortak("aciklama"),
      ortak("tutar"),
      ortak("paraBirimi"),
      tGider("kdvOraniEtiketi"),
    ],
    satirlar,
  };
}
