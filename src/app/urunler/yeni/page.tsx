import { GeriBaglanti } from "@/components/baglanti";
import { prisma } from "@/lib/prisma";

import { urunOlustur } from "../actions";
import { UrunFormu } from "../urun-formu";

export const metadata = { title: "Yeni Ürün — Axcali ERP" };

export default async function YeniUrunSayfasi() {
  const konumlar = await prisma.location.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <GeriBaglanti href="/urunler">Ürünler</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">Yeni Ürün</h1>
      </div>

      <UrunFormu
        konumlar={konumlar}
        action={urunOlustur}
        gonderEtiketi="Ürünü Kaydet"
      />
    </div>
  );
}
