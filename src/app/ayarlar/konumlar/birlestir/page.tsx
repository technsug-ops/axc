import { getTranslations } from "next-intl/server";

import { GeriBaglanti } from "@/components/baglanti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { BirlestirFormu, type RafSecenegi } from "./birlestir-formu";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("RafBirlestir");
  return { title: t("baslik") };
}

export default async function RafBirlestirSayfasi() {
  const t = await getTranslations("RafBirlestir");
  const tRaf = await getTranslations("Raf");

  const kayitlar = await prisma.location.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const raflar: RafSecenegi[] = kayitlar.map((r) => ({
    id: r.id,
    kod: r.code,
    ad: r.name,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <GeriBaglanti href="/ayarlar/konumlar">{tRaf("baslik")}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("aciklamaMetni")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("kartBasligi")}</CardTitle>
        </CardHeader>
        <CardContent>
          {raflar.length < 2 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("yetersizRaf")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("yetersizRafIpucu")}
              </p>
            </div>
          ) : (
            <BirlestirFormu raflar={raflar} />
          )}
        </CardContent>
      </Card>

      {/* Ledger kuralı ekranda da yazar — "geçmişim ne olacak?" sorusunun
          cevabı onaydan önce görünsün. */}
      <div className="rounded-md border p-4">
        <p className="text-sm font-medium">{t("ledgerBasligi")}</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("ledgerMetni")}
        </p>
      </div>
    </div>
  );
}
