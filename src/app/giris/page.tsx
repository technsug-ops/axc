import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { kullaniciVarMi, oturumdakiKullanici } from "@/lib/oturum";
import { UYGULAMA } from "@/lib/uygulama";

import { GirisFormu } from "./giris-formu";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/** Giriş durumu her istekte taze okunmalı. */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("giris") };
}

export default async function GirisSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ devam?: string; kurulum?: string }>;
}) {
  const { devam, kurulum } = await searchParams;
  const t = await getTranslations("Giris");

  // OTURUM_SIRRI yoksa giriş çalışamaz; sebebi ekranda yazar (İlke #5).
  const kurulumEksik = kurulum === "1" || !process.env.OTURUM_SIRRI;

  if (!kurulumEksik) {
    // Zaten girmişse giriş ekranında oyalanmasın.
    const kullanici = await oturumdakiKullanici();
    if (kullanici) redirect("/");
  }

  const kullaniciTanimliMi = kurulumEksik ? true : await kullaniciVarMi();

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{UYGULAMA.ad}</h1>
          <p className="text-muted-foreground text-sm">{t("altBaslik")}</p>
        </div>

        {kurulumEksik ? (
          <div className={`space-y-2 rounded-lg p-4 ${DURUM_KUTUSU.uyari}`}>
            <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
              <TriangleAlert className="size-4 shrink-0" />
              {t("kurulumEksikBaslik")}
            </p>
            <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
              {t("kurulumEksikMetin")}
            </p>
          </div>
        ) : !kullaniciTanimliMi ? (
          <div className={`space-y-2 rounded-lg p-4 ${DURUM_KUTUSU.uyari}`}>
            <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
              <TriangleAlert className="size-4 shrink-0" />
              {t("kullaniciYokBaslik")}
            </p>
            <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
              {t("kullaniciYokMetin")}
            </p>
          </div>
        ) : (
          <Card>
            <CardContent>
              <GirisFormu devam={devam ?? ""} />
            </CardContent>
          </Card>
        )}

        <p className="text-muted-foreground text-center text-xs">
          {t("girisNotu")}
        </p>
      </div>
    </div>
  );
}
