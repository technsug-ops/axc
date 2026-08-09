import { getTranslations } from "next-intl/server";
import { GeriBaglanti } from "@/components/baglanti";
import { prisma } from "@/lib/prisma";

import { urunOlustur } from "../actions";
import { UrunFormu } from "../urun-formu";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("yeniUrun") };
}

export default async function YeniUrunSayfasi() {
  const t = await getTranslations("Urunler");

  const konumlar = await prisma.location.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <GeriBaglanti href="/urunler">{t("baslik")}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">{t("yeniUrun")}</h1>
      </div>

      <UrunFormu
        konumlar={konumlar}
        kategoriler={kategoriler}
        action={urunOlustur}
        gonderEtiketi={t("urunuKaydet")}
      />
    </div>
  );
}
