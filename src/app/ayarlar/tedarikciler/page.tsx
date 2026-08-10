import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { TedarikciFormu } from "./tedarikci-formu";
import {
  TedarikciSatiri,
  type TedarikciSatiriVerisi,
} from "./tedarikci-satiri";

/**
 * VERİTABANI OKUYAN SAYFA — HER İSTEKTE ÇİZİLİR.
 * Statik kipte derleme anında veritabanına bağlanmak gerekirdi; Vercel yapı
 * makinesi uzak MySQL'e erişemeyebilir ve zaten liste ekranı canlı veri
 * göstermelidir.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("tedarikciler") };
}

export default async function TedarikcilerSayfasi() {
  const t = await getTranslations("Tedarikci");

  const kayitlar = await prisma.supplier.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { purchases: true } } },
  });

  const tedarikciler: TedarikciSatiriVerisi[] = kayitlar.map((s) => ({
    id: s.id,
    ad: s.name,
    kod: s.code,
    iletisim: s.contact,
    aktif: s.isActive,
    alimSayisi: s._count.purchases,
  }));

  // Kodu olmayan AKTİF tedarikçiyle yeni alım girilemez: alım numarası
  // kodu içeriyor. Sessizce beklemek yerine ekranda söylenir (#5).
  const kodsuzSayi = tedarikciler.filter(
    (s) => s.aktif && s.kod === null,
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
            {t("kodsuzBaslik", { sayi: kodsuzSayi })}
          </p>
          <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-300/90">
            {t("kodsuzMetin")}
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("yeniTedarikci")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TedarikciFormu />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("tanimliTedarikciler", { sayi: tedarikciler.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tedarikciler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("bosBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("bosIpucu")}
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {tedarikciler.map((s) => (
                <TedarikciSatiri key={s.id} tedarikci={s} />
              ))}
            </div>
          )}

          <p className="text-muted-foreground text-xs">{t("listeNotu")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
