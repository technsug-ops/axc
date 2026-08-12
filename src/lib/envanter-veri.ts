import {
  envanterHesapla,
  type EnvanterSonucu,
  type EnvanterVaryantGirdisi,
} from "@/lib/envanter";
import { kdvOraniniCoz } from "@/lib/kdv";
import { prisma } from "@/lib/prisma";
import { acikPartilerToplu } from "@/lib/stok";

/**
 * ============================================================================
 *  ENVANTER DEĞERİ — VERİ OKUMA
 * ----------------------------------------------------------------------------
 *  Ekran ve Excel indirmesi AYNI fonksiyondan beslenir. İkisi ayrı sorgu
 *  yazsaydı biri güncellenip diğeri unutulur, indirilen dosya ekrandakinden
 *  farklı çıkardı (İlke #10 — aynı iş her yerde aynı çalışır).
 *
 *  KDV ORANI ÇÖZÜMÜ: `kdvOraniniCoz` ürün istisnası > kategori > varsayılan
 *  sırasını uygular ve hangi yoldan geldiğini `kaynak` ile söyler. Burada
 *  VARSAYILAN kabul EDİLMEZ — o satırın mal bedeli "hesaplanamadı" olur.
 * ============================================================================
 */

/** Satırın ekranda ve dosyada görünen kimlik bilgileri. */
export type VaryantKimligi = {
  urunAdi: string;
  marka: string | null;
  varyantAdi: string | null;
  sku: string;
  firmaSku: string | null;
  barkod: string | null;
  kategoriAdi: string | null;
  rafKodu: string | null;
};

export type EnvanterVerisi = {
  sonuc: EnvanterSonucu;
  kimlikler: Map<string, VaryantKimligi>;
};

export async function envanterVerisi(): Promise<EnvanterVerisi> {
  // Stokta kalan partisi olan HER varyant — pasif varyant da dahil.
  // Pasife alınmış ürünün deposunda malı duruyorsa parası da duruyordur.
  const partiler = await acikPartilerToplu(prisma, null);
  const idler = [...partiler.keys()];

  if (idler.length === 0) {
    return {
      sonuc: { bloklar: [], bilinmeyenler: [], bilinmeyenToplamAdet: 0 },
      kimlikler: new Map(),
    };
  }

  const varyantlar = await prisma.productVariant.findMany({
    where: { id: { in: idler } },
    select: {
      id: true,
      sku: true,
      companySku: true,
      barcode: true,
      name: true,
      location: { select: { code: true } },
      product: {
        select: {
          name: true,
          brand: true,
          vatRateOverride: true,
          category: { select: { name: true, vatRate: true } },
        },
      },
    },
  });

  const kimlikler = new Map<string, VaryantKimligi>();
  const girdiler: EnvanterVaryantGirdisi[] = [];

  for (const varyant of varyantlar) {
    const kdv = kdvOraniniCoz(varyant.product);

    kimlikler.set(varyant.id, {
      urunAdi: varyant.product.name,
      marka: varyant.product.brand,
      varyantAdi: varyant.name,
      sku: varyant.sku,
      firmaSku: varyant.companySku,
      barkod: varyant.barcode,
      kategoriAdi: kdv.kategoriAdi,
      rafKodu: varyant.location?.code ?? null,
    });

    girdiler.push({
      variantId: varyant.id,
      // VARSAYILANA DÜŞMEK BURADA KABUL EDİLMEZ — bkz. envanter.ts başlığı.
      kdvOrani: kdv.kaynak === "VARSAYILAN" ? null : kdv.oran,
      partiler: partiler.get(varyant.id) ?? [],
    });
  }

  return { sonuc: envanterHesapla(girdiler), kimlikler };
}
