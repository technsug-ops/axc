import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { Database, Download, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { YEDEK_TABLOLARI } from "@/lib/yedek";

import { OtomatikYedekDurumu } from "./otomatik-durum";

/** Yedek listesi canlı okunur; statik çizilirse hep aynı anı gösterirdi. */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("disaAktarma") };
}

export default async function DisaAktarmaSayfasi() {
  await sayfaIzni("veri.aktar");

  const t = await getTranslations("DisaAktarma");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
      </div>

      {/* ---------------------- TÜM VERİ (EXCEL) ---------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("tumBaslik")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">{t("tumMetin")}</p>
          <Button variant="outline" asChild>
            {/* Bilerek <a>: bu bir SAYFA değil, dosya döndüren bir uç nokta.
                next/link istemci tarafı geçiş yapıp RSC yükü beklerdi ve
                indirme hiç başlamazdı. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/disa-aktarma/tumu">
              <Download />
              {t("tumIndir")}
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* -------------------------- YEDEK (JSON) ---------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("yedekBaslik")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">{t("yedekMetin")}</p>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href="/api/yedek">
                <Database />
                {t("yedekIndir")}
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/yedek?tarifesiz=1">
                <Download />
                {t("hafifYedekIndir")}
              </a>
            </Button>
          </div>

          <p className="text-muted-foreground text-xs">{t("hafifYedekNotu")}</p>

          <p className="flex gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{t("yedekNotu")}</span>
          </p>

          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {t("yedekKapsam")} ({YEDEK_TABLOLARI.length})
            </summary>
            <p className="text-muted-foreground mt-2 font-mono text-xs">
              {YEDEK_TABLOLARI.join(" · ")}
            </p>
          </details>
        </CardContent>
      </Card>

      {/* --------------------- GERİ YÜKLEME / OTOMATİK ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("geriYuklemeBaslik")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">
            {t("geriYuklemeMetin")}
          </p>
          <OtomatikYedekDurumu />
        </CardContent>
      </Card>
    </div>
  );
}
