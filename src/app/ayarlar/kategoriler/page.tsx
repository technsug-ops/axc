import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { KategoriFormu } from "./kategori-formu";
import { KategoriSatiri, type KategoriSatiriVerisi } from "./kategori-satiri";

/**
 * VERİTABANI OKUYAN SAYFA — HER İSTEKTE ÇİZİLİR.
 *
 * Statik kipte Next bu sayfayı DERLEME ANINDA üretmeye çalışır ve o sırada
 * veritabanına bağlanması gerekir. Derlemenin veritabanına bağımlı olması
 * kırılgandır (Vercel yapı makinesi uzak MySQL'e erişemeyebilir) ve zaten
 * bir ERP'de liste ekranı canlı veri göstermelidir.
 */
export const dynamic = "force-dynamic";

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
    code: k.code,
    isActive: k.isActive,
    urunSayisi: k._count.products,
  }));

  // Kodu olmayan AKTİF kategoriler: o kategorideki ürüne SKU önerilemez.
  // Sessizce beklemek yerine ekranda söylenir ve düzeltme yeri gösterilir.
  const kodsuzSayi = kategoriler.filter(
    (k) => k.isActive && k.code === null,
  ).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
      </div>

      {kodsuzSayi > 0 ? (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            <TriangleAlert className="size-4 shrink-0" />
            {t("kodEksikBaslik", { sayi: kodsuzSayi })}
          </p>
          <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-300/90">
            {t("kodEksikMetin")}
          </p>
        </div>
      ) : null}

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
