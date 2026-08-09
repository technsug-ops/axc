import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GeriBaglanti } from "@/components/baglanti";
import { prisma } from "@/lib/prisma";

import { urunGuncelle } from "../../actions";
import { UrunFormu, type UrunGirdisi } from "../../urun-formu";

export default async function UrunDuzenleSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Urunler");

  const [urun, konumlar] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          include: { options: true },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
      },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  if (!urun) notFound();

  const baslangic: UrunGirdisi = {
    ad: urun.name,
    marka: urun.brand ?? "",
    aciklama: urun.description ?? "",
    varyantliMi: urun.hasVariants,
    varyantlar: urun.variants.map((v) => ({
      id: v.id,
      ad: v.name ?? "",
      sku: v.sku,
      companySku: v.companySku,
      barcode: v.barcode ?? "",
      locationId: v.locationId ?? "",
      secenekler: v.options.map((o) => ({ ad: o.name, deger: o.value })),
    })),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <GeriBaglanti href={`/urunler/${urun.id}`}>{urun.name}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">{t("urunuDuzenle")}</h1>
      </div>

      <UrunFormu
        konumlar={konumlar}
        action={urunGuncelle}
        baslangic={baslangic}
        urunId={urun.id}
        gonderEtiketi={t("degisiklikleriKaydet")}
      />
    </div>
  );
}
