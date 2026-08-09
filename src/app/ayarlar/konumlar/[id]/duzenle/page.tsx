import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { GeriBaglanti } from "@/components/baglanti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { KonumDuzenleFormu } from "./konum-duzenle-formu";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("rafiDuzenle") };
}

export default async function KonumDuzenleSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const konum = await prisma.location.findUnique({
    where: { id },
    include: { _count: { select: { variants: true, stockMovements: true } } },
  });

  if (!konum) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <GeriBaglanti href="/ayarlar/konumlar">Raf Konumları</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">Rafı Düzenle</h1>
        <p className="text-muted-foreground text-sm">
          {konum._count.variants} varyant ve {konum._count.stockMovements} stok
          hareketi bu rafa bağlı.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Raf bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <KonumDuzenleFormu
            konumId={konum.id}
            baslangic={{
              code: konum.code,
              name: konum.name ?? "",
              description: konum.description ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
