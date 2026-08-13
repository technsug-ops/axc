import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { NedenFormu } from "./neden-formu";
import { NedenSatiri, type NedenSatiriVerisi } from "./neden-satiri";

/**
 * ============================================================================
 *  STOK DÜZELTME NEDENLERİ
 * ----------------------------------------------------------------------------
 *  KDV Kategorileri ekranının deseni. Neden VERİDİR, sabit kod değil:
 *  SaaS'ta her müşteri kendi fire nedenlerini tanımlayacak.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("duzeltmeNedenleri") };
}

export default async function DuzeltmeNedenleriSayfasi() {
  const t = await getTranslations("DuzeltmeNedeni");

  const kayitlar = await prisma.stockAdjustmentReason.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { movements: true } } },
  });

  const nedenler: NedenSatiriVerisi[] = kayitlar.map((n) => ({
    id: n.id,
    name: n.name,
    movementType:
      n.movementType === "COUNT_CORRECTION" ? "COUNT_CORRECTION" : "ADJUSTMENT",
    requiresNote: n.requiresNote,
    isActive: n.isActive,
    hareketSayisi: n._count.movements,
  }));

  // Hiç aktif neden kalmazsa stok düzeltme ekranı kullanılamaz hâle gelir.
  // Sessizce boş bir açılır liste göstermek yerine burada söylenir.
  const aktifSayi = nedenler.filter((n) => n.isActive).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
      </div>

      {aktifSayi === 0 && nedenler.length > 0 ? (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            <TriangleAlert className="size-4 shrink-0" />
            {t("aktifYokBaslik")}
          </p>
          <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-300/90">
            {t("aktifYokMetin")}
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("yeniNeden")}</CardTitle>
        </CardHeader>
        <CardContent>
          <NedenFormu />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("tanimliNedenler", { sayi: nedenler.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {nedenler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("bosBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("bosIpucu")}
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {nedenler.map((n) => (
                <NedenSatiri key={n.id} neden={n} />
              ))}
            </div>
          )}

          <p className="text-muted-foreground text-xs">{t("listeNotu")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
