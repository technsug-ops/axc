import { notFound } from "next/navigation";
import { sayfaIzni } from "@/lib/yetki";
import { getTranslations } from "next-intl/server";

import { GeriBaglanti } from "@/components/baglanti";
import { prisma } from "@/lib/prisma";

import { urunGuncelle } from "../../actions";
import { urunHareketliMi } from "@/lib/urun-hareket";

import { UrunFormu, type UrunGirdisi } from "../../urun-formu";

export default async function UrunDuzenleSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await sayfaIzni("urun.yaz");

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

  const kategoriKayitlari = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { vatRate: "desc" },
    select: { id: true, name: true, vatRate: true },
  });
  const kategoriler = kategoriKayitlari.map((k) => ({
    id: k.id,
    ad: k.name,
    oran: String(Number(k.vatRate.toString())),
  }));

  const baslangic: UrunGirdisi = {
    ad: urun.name,
    marka: urun.brand ?? "",
    aciklama: urun.description ?? "",
    kategoriId: urun.categoryId ?? "",
    kdvIstisnasi: urun.vatRateOverride
      ? String(Number(urun.vatRateOverride.toString()))
      : "",
    desi: urun.desi ? String(Number(urun.desi.toString())) : "",
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
        kategoriler={kategoriler}
        action={urunGuncelle}
        baslangic={baslangic}
        urunId={urun.id}
        hareketliMi={await urunHareketliMi(urun.id)}
        gonderEtiketi={t("degisiklikleriKaydet")}
      />
    </div>
  );
}
