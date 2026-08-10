import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

import { GeriBaglanti } from "@/components/baglanti";
import { tarihGirdisi } from "@/lib/bicim";
import { gunMetni } from "@/lib/donem";
import { prisma } from "@/lib/prisma";

import { alimGuncelle } from "../../actions";
import { AlimFormu, type AlimBaslangici } from "../../alim-formu";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Alim");
  return { title: t("duzenle") };
}

export default async function AlimDuzenleSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Alim");

  const [alim, hesapKayitlari, kartKayitlari] = await Promise.all([
    prisma.purchase.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: { product: { select: { name: true } } },
            },
            // Kabul edilmiş adet ledger'dan türetilir; kolon yok.
            stockMovements: { select: { quantityDelta: true } },
          },
        },
      },
    }),
    prisma.channelAccount.findMany({
      where: { isActive: true },
      include: { channel: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.creditCard.findMany({
      where: { isActive: true },
      orderBy: { label: "asc" },
    }),
  ]);

  if (!alim) notFound();

  const malKabulVar = alim.items.some((k) =>
    k.stockMovements.some((h) => h.quantityDelta > 0),
  );

  const baslangic: AlimBaslangici = {
    code: alim.code,
    purchasedAt: gunMetni(alim.purchasedAt),
    channelAccountId: alim.channelAccountId ?? "",
    creditCardId: alim.creditCardId ?? "",
    installmentCount: String(alim.installmentCount),
    supplierName: alim.supplierName ?? "",
    note: alim.note ?? "",
    malKabulVar,
    kalemler: alim.items.map((k) => ({
      variantId: k.variantId,
      etiket: k.variant.name
        ? `${k.variant.product.name} — ${k.variant.name}`
        : k.variant.product.name,
      sku: k.variant.sku,
      quantity: k.quantity,
      unitCostAmount: String(Number(k.unitCostAmount.toString())),
      unitCostCurrency: k.unitCostCurrency,
      gelen: k.stockMovements.reduce((t2, h) => t2 + h.quantityDelta, 0),
    })),
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <GeriBaglanti href={`/alimlar/${alim.id}`}>{alim.code}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">{t("duzenle")}</h1>
      </div>

      {malKabulVar ? (
        <div className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            <TriangleAlert className="size-4 shrink-0" />
            {t("duzenleUyariBaslik")}
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {t("duzenleUyari")}
          </p>
        </div>
      ) : null}

      <AlimFormu
        hesaplar={hesapKayitlari.map((h) => ({
          id: h.id,
          etiket: `${h.channel.name} — ${h.name}`,
          paraBirimi: h.defaultCurrency,
        }))}
        kartlar={kartKayitlari.map((k) => ({
          id: k.id,
          etiket: `${k.label} (••${k.last4})`,
        }))}
        action={alimGuncelle}
        bugun={tarihGirdisi(new Date())}
        baslangic={baslangic}
        alimId={alim.id}
      />
    </div>
  );
}
