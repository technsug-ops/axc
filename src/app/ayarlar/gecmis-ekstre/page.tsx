import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";

import { IceAktarici } from "./ice-aktarici";

/**
 * ============================================================================
 *  GEÇMİŞ KART EKSTRESİ İÇE AKTARMA
 * ----------------------------------------------------------------------------
 *  Canlı ekstreler ALIMLARDAN türetilir; geçmişte alım kaydı yok ama kart
 *  ekstreleri 2025'e kadar gidiyor. Bu ekran o boşluğu beyan verisiyle
 *  dolduruyor — kaynağı `GECMIS_EXCEL` damgasıyla ayrı duruyor.
 *
 *  YETKİ: `veri.aktar` — bütün veriyi etkileyen bir işlem.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Basliklar");
  return { title: t("gecmisEkstre") };
}

export default async function GecmisEkstreSayfasi() {
  await sayfaIzni("veri.aktar");
  const t = await getTranslations("GecmisEkstre");

  /** Daha önce yapılmış aktarımlar — parti kodu geri alma için görünür. */
  const partiler = await prisma.gecmisEkstre.groupBy({
    by: ["iceAktarimKodu"],
    _count: { _all: true },
    _min: { donem: true },
    _max: { donem: true },
    orderBy: { iceAktarimKodu: "desc" },
  });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("sayfaBaslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("sayfaNotu")}</p>
      </div>

      <Card className="min-w-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("aktarimBaslik")}</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <IceAktarici />
        </CardContent>
      </Card>

      {partiler.length > 0 ? (
        <Card className="min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("gecmisAktarimlar")}</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 space-y-2">
            {partiler.map((p) => (
              <div
                key={p.iceAktarimKodu ?? "partisiz"}
                className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm last:border-0"
              >
                <span className="font-mono text-xs">
                  {p.iceAktarimKodu ?? t("partisiz")}
                </span>
                <span className="text-muted-foreground text-xs">
                  {t("partiOzeti", {
                    sayi: p._count._all,
                    ilk: p._min.donem?.toISOString().slice(0, 7) ?? "—",
                    son: p._max.donem?.toISOString().slice(0, 7) ?? "—",
                  })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
