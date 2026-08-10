import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { prisma } from "@/lib/prisma";

import type { Referans } from "./dogrula";
import type { SablonVerisi } from "./sablon";

/**
 * Kanal hesabının şablonda ve dosyada kullanılan etiketi.
 * "Trendyol — TR Ana Mağaza". Tek yerde üretilir ki şablondaki değerle
 * dosyadan okunan değer BİREBİR aynı olsun.
 */
export function hesapEtiketi(kanalAdi: string, hesapAdi: string): string {
  return `${kanalAdi} — ${hesapAdi}`;
}

/** Doğrulayıcının ihtiyaç duyduğu "sistemde ne var" bilgisi. */
export async function referansYukle(): Promise<Referans> {
  const [kategoriler, raflar, hesaplar, varyantlar, kanalSkulari] =
    await Promise.all([
      // Ürünün KDV kategorisi (gider kategorisi DEĞİL).
      prisma.category.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.location.findMany({
        where: { isActive: true },
        select: { id: true, code: true },
        orderBy: { code: "asc" },
      }),
      prisma.channelAccount.findMany({
        where: { isActive: true },
        include: { channel: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.productVariant.findMany({
        select: {
          id: true,
          productId: true,
          sku: true,
          companySku: true,
          barcode: true,
        },
      }),
      prisma.channelSku.findMany({
        select: { channelAccountId: true, variantId: true },
      }),
    ]);

  const bugun = isTakvimGunu(new Date());

  return {
    kategoriler: kategoriler.map((k) => ({ id: k.id, ad: k.name })),
    raflar: raflar.map((r) => ({ id: r.id, kod: r.code })),
    kanalHesaplari: hesaplar.map((h) => ({
      id: h.id,
      etiket: hesapEtiketi(h.channel.name, h.name),
    })),
    mevcutVaryantlar: varyantlar.map((v) => ({
      id: v.id,
      urunId: v.productId,
      sku: v.sku,
      firmaSku: v.companySku,
      barkod: v.barcode,
    })),
    mevcutKanalSkulari: kanalSkulari.map((k) => ({
      kanalHesabiId: k.channelAccountId,
      varyantId: k.variantId,
    })),
    bugun: gunDegeri(bugun),
  };
}

/** Şablonun "Listeler" sayfasını dolduran veri. */
export async function sablonVerisi(): Promise<SablonVerisi> {
  const [kategoriler, raflar, hesaplar] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { name: true, vatRate: true },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: { code: true },
      orderBy: { code: "asc" },
    }),
    prisma.channelAccount.findMany({
      where: { isActive: true },
      include: { channel: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    kategoriler: kategoriler.map((k) => ({
      ad: k.name,
      kdvOrani: String(Number(k.vatRate.toString())),
    })),
    raflar: raflar.map((r) => r.code),
    kanalHesaplari: hesaplar.map((h) => hesapEtiketi(h.channel.name, h.name)),
  };
}
