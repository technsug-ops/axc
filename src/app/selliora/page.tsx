import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";
import { UYGULAMA } from "@/lib/uygulama";
import { yonetimOturumu } from "@/lib/yonetim-oturumu";

import { YonetimGirisFormu } from "./giris-formu";

/** Giriş durumu her istekte taze okunmalı. */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Yonetim");
  return { title: t("sekmeBasligi") };
}

/**
 * SELLİORA YÖNETİM GİRİŞİ (K303 4c-2). Proxy'nin AÇIK bıraktığı tek yönetim
 * yolu. Süper admin zaten girmişse firma listesine geçer.
 */
export default async function YonetimGirisSayfasi() {
  if (await yonetimOturumu()) redirect("/selliora/firmalar");
  const t = await getTranslations("Yonetim");
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{t("girisBasligi", { uygulama: UYGULAMA.ad })}</h1>
          <p className="text-muted-foreground text-sm">{t("girisAltBaslik")}</p>
        </div>
        <Card>
          <CardContent>
            <YonetimGirisFormu />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
