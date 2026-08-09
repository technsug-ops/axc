import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { KategoriFormu } from "./kategori-formu";
import { KategoriSatiri, type KategoriSatiriVerisi } from "./kategori-satiri";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("kategoriler") };
}

export default async function KategorilerSayfasi() {
  const t = await getTranslations("Kategori");

  const kayitlar = await prisma.category.findMany({
    orderBy: [{ isActive: "desc" }, { vatRate: "desc" }],
    include: { _count: { select: { products: true } } },
  });

  const kategoriler: KategoriSatiriVerisi[] = kayitlar.map((k) => ({
    id: k.id,
    name: k.name,
    // Decimal -> "20.00" yerine "20" göster; oran okunur kalsın.
    vatRate: String(Number(k.vatRate.toString())),
    isActive: k.isActive,
    urunSayisi: k._count.products,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("yeniKategori")}</CardTitle>
        </CardHeader>
        <CardContent>
          <KategoriFormu />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("tanimliKategoriler", { sayi: kategoriler.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {kategoriler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("bosBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("bosIpucu")}
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {kategoriler.map((k) => (
                <KategoriSatiri key={k.id} kategori={k} />
              ))}
            </div>
          )}

          <p className="text-muted-foreground text-xs">{t("listeNotu")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
