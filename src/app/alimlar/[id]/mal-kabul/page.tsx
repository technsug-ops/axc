import Link from "next/link";
import { sayfaIzni } from "@/lib/yetki";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GeriBaglanti } from "@/components/baglanti";
import { donusTasiyan } from "@/lib/suzgec";
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ donus?: string }>;
}) {
  await sayfaIzni("malkabul.yaz");

  const [{ id }, { donus }] = await Promise.all([params, searchParams]);

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

  const t = await getTranslations("MalKabul");

  const kapaliMi = alim.status === "CANCELLED" || alim.status === "RECEIVED";
  if (kapaliMi) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">{t("yapilamazBaslik")}</h1>
        <p className="text-muted-foreground text-sm">
          {alim.status === "CANCELLED"
            ? t("iptalEdilmis", { kod: alim.code })
            : t("tamamlanmis", { kod: alim.code })}
        </p>
        <Button variant="outline" asChild>
          <Link href={donusTasiyan(`/alimlar/${alim.id}`, donus)}>
            {t("detayaDon")}
          </Link>
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
      companySku: kalem.variant.companySku,
      barcode: kalem.variant.barcode,
      beklenen: kalem.quantity,
      oncekiSaglam,
      oncekiHasarli: kalem.damagedQuantity,
      kalan: Math.max(0, kalem.quantity - oncekiSaglam - kalem.damagedQuantity),
      // Varyantın kayıtlı rafı varsayılan gelir; kabulde değiştirilebilir.
      varsayilanLocationId: kalem.variant.locationId ?? "",
    };
  });

  const konumlar: KonumSecenegi[] = konumKayitlari;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <GeriBaglanti href={donusTasiyan(`/alimlar/${alim.id}`, donus)}>
          {alim.code}
        </GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
      </div>

      <MalKabulFormu
        alimId={alim.id}
        alimKodu={alim.code}
        satirlar={satirlar}
        konumlar={konumlar}
        siparisTarihi={alim.purchasedAt.toISOString().slice(0, 10)}
        bugun={tarihGirdisi(new Date())}
      />
    </div>
  );
}
