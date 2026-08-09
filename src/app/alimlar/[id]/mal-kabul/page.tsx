import Link from "next/link";
import { notFound } from "next/navigation";

import { GeriBaglanti } from "@/components/baglanti";
import { Button } from "@/components/ui/button";
import { tarihGirdisi } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";
import { kalemTeslimAlinanlar } from "@/lib/stok";

import {
  MalKabulFormu,
  type KabulSatiri,
  type KonumSecenegi,
} from "./mal-kabul-formu";

export default async function MalKabulSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const alim = await prisma.purchase.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          variant: {
            include: { product: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!alim) notFound();

  const kapaliMi = alim.status === "CANCELLED" || alim.status === "RECEIVED";
  if (kapaliMi) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Mal kabul yapılamaz</h1>
        <p className="text-muted-foreground text-sm">
          {alim.status === "CANCELLED"
            ? `${alim.code} iptal edilmiş.`
            : `${alim.code} için tüm kalemler zaten tamamlanmış.`}
        </p>
        <Button variant="outline" asChild>
          <Link href={`/alimlar/${alim.id}`}>← Alım detayına dön</Link>
        </Button>
      </div>
    );
  }

  const [teslimAlinanlar, konumKayitlari] = await Promise.all([
    kalemTeslimAlinanlar(alim.items.map((k) => k.id)),
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const satirlar: KabulSatiri[] = alim.items.map((kalem) => {
    const oncekiSaglam = teslimAlinanlar.get(kalem.id) ?? 0;
    return {
      purchaseItemId: kalem.id,
      urunAdi: kalem.variant.product.name,
      varyantAdi: kalem.variant.name,
      sku: kalem.variant.sku,
      axcaliSku: kalem.variant.axcaliSku,
      barcode: kalem.variant.barcode,
      beklenen: kalem.quantity,
      oncekiSaglam,
      oncekiHasarli: kalem.damagedQuantity,
      kalan: Math.max(
        0,
        kalem.quantity - oncekiSaglam - kalem.damagedQuantity,
      ),
      // Varyantın kayıtlı rafı varsayılan gelir; kabulde değiştirilebilir.
      varsayilanLocationId: kalem.variant.locationId ?? "",
    };
  });

  const konumlar: KonumSecenegi[] = konumKayitlari;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <GeriBaglanti href={`/alimlar/${alim.id}`}>{alim.code}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">Mal Kabul</h1>
        <p className="text-muted-foreground text-sm">
          Gelen ürünleri sayın ve sağlam / hasarlı ayrımını yapın.
        </p>
      </div>

      <MalKabulFormu
        alimId={alim.id}
        alimKodu={alim.code}
        satirlar={satirlar}
        konumlar={konumlar}
        bugun={tarihGirdisi(new Date())}
      />
    </div>
  );
}
