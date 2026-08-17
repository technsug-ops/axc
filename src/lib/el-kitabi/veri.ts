import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  EL KİTABI — CANLI VERİ
 * ----------------------------------------------------------------------------
 *  El kitabının "sisteme bağlı" olmasının anlamı budur: kategorilerinizi,
 *  raflarınızı, kanal hesaplarınızı ve kesinti kurallarınızı VERİTABANINDAN
 *  okur. Ayarlardan bir raf eklediğinizde el kitabı da onu yazar.
 *
 *  Elle yazılmış bir belge birkaç ay içinde gerçekten sapar; sapmış bir
 *  kılavuz, olmayan kılavuzdan daha kötüdür çünkü okuyan ona güvenir.
 * ============================================================================
 */

export type ElKitabiVerisi = {
  kdvKategorileri: { ad: string; oran: string }[];
  raflar: { kod: string; ad: string | null }[];
  kanalHesaplari: { etiket: string; paraBirimi: string }[];
  giderKategorileri: { ad: string; sabitMi: boolean; kdv: string }[];
  kargoFirmalari: string[];
  /** Kanal başına kesinti kuralları — şablon değil, sizde tanımlı olan. */
  kanalKesintileri: {
    kanal: string;
    kod: string;
    kapsam: "PER_SALE" | "PER_ITEM";
    oran: string | null;
    tutar: string | null;
    paraBirimi: string | null;
  }[];
  cezaTarifeleri: { kanal: string; kademeler: { ustSinir: string; tutar: string }[] }[];
  /** Kanal hesabı başına eşleme sayısı ve kaç tanesinde komisyon oranı yok. */
  kanalSkuOzeti: { hesap: string; adet: number; oransiz: number }[];
  /** Hiçbir kanala eşlenmemiş varyant sayısı — satılamaz demek değil,
      ama satılırsa kârı hesaplanamaz demek. */
  eslenmemisVaryant: number;
  sayimlar: {
    urun: number;
    varyant: number;
    kanalSku: number;
    kanalSkuOransiz: number;
    satis: number;
    kullanici: number;
  };
};

const sayi = (d: { toString(): string } | null) =>
  d === null ? null : String(Number(d.toString()));

export async function elKitabiVerisi(): Promise<ElKitabiVerisi> {
  const [
    kategoriler,
    raflar,
    hesaplar,
    giderKategorileri,
    kargolar,
    kesintiler,
    cezalar,
    urun,
    varyant,
    kanalSku,
    kanalSkuOransiz,
    satis,
    kullanici,
    kanalSkulari,
    eslenmemisVaryant,
  ] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { name: true, vatRate: true },
      orderBy: { vatRate: "desc" },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.channelAccount.findMany({
      where: { isActive: true },
      include: { channel: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.expenseCategory.findMany({
      where: { isActive: true },
      select: { name: true, isFixed: true, defaultVatRate: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.cargoCarrier.findMany({
      where: { isActive: true },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.channelFee.findMany({
      where: { isActive: true },
      include: { channel: { select: { name: true } } },
      orderBy: [{ channelId: "asc" }, { code: "asc" }],
    }),
    prisma.penaltyTariff.findMany({
      include: { channel: { select: { name: true } } },
      orderBy: [{ channelId: "asc" }, { orderAmountUpTo: "asc" }],
    }),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.channelSku.count(),
    prisma.channelSku.count({ where: { commissionRate: null } }),
    // "Kaç satış yapıldı" istatistiği: iptal edilen satış YAPILMIŞ değildir.
    prisma.sale.count({ where: { iptalTarihi: null } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.channelSku.findMany({
      select: {
        commissionRate: true,
        channelAccount: {
          select: { name: true, channel: { select: { name: true } } },
        },
      },
    }),
    prisma.productVariant.count({ where: { channelSkus: { none: {} } } }),
  ]);

  // Ceza kademelerini kanal başına grupla.
  const cezaHaritasi = new Map<string, { ustSinir: string; tutar: string }[]>();
  for (const c of cezalar) {
    const liste = cezaHaritasi.get(c.channel.name) ?? [];
    liste.push({
      ustSinir: sayi(c.orderAmountUpTo) ?? "",
      tutar: sayi(c.amount) ?? "",
    });
    cezaHaritasi.set(c.channel.name, liste);
  }

  // Kanal hesabı başına eşleme özeti — "hangi mağazada kaç ürün tanımlı".
  const ozetHaritasi = new Map<string, { adet: number; oransiz: number }>();
  for (const k of kanalSkulari) {
    const etiket = `${k.channelAccount.channel.name} — ${k.channelAccount.name}`;
    const mevcut = ozetHaritasi.get(etiket) ?? { adet: 0, oransiz: 0 };
    mevcut.adet++;
    if (k.commissionRate === null) mevcut.oransiz++;
    ozetHaritasi.set(etiket, mevcut);
  }

  return {
    kdvKategorileri: kategoriler.map((k) => ({
      ad: k.name,
      oran: sayi(k.vatRate) ?? "",
    })),
    raflar: raflar.map((r) => ({ kod: r.code, ad: r.name })),
    kanalHesaplari: hesaplar.map((h) => ({
      etiket: `${h.channel.name} — ${h.name}`,
      paraBirimi: h.defaultCurrency,
    })),
    giderKategorileri: giderKategorileri.map((g) => ({
      ad: g.name,
      sabitMi: g.isFixed,
      kdv: sayi(g.defaultVatRate) ?? "",
    })),
    kargoFirmalari: kargolar.map((k) => k.name),
    kanalKesintileri: kesintiler.map((k) => ({
      kanal: k.channel.name,
      kod: k.code,
      kapsam: k.scope,
      oran: sayi(k.rate),
      tutar: sayi(k.amount),
      paraBirimi: k.currency,
    })),
    cezaTarifeleri: [...cezaHaritasi.entries()].map(([kanal, kademeler]) => ({
      kanal,
      kademeler,
    })),
    kanalSkuOzeti: [...ozetHaritasi.entries()].map(([hesap, o]) => ({
      hesap,
      ...o,
    })),
    eslenmemisVaryant,
    sayimlar: {
      urun,
      varyant,
      kanalSku,
      kanalSkuOransiz,
      satis,
      kullanici,
    },
  };
}
