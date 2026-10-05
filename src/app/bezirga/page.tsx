import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CircleCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
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
export default async function YonetimGirisSayfasi({ searchParams }: { searchParams: Promise<{ parola?: string }> }) {
  const { parola } = await searchParams;
  const acik = await yonetimOturumu();
  if (acik) redirect(acik.parolaDegismeli ? `${YONETIM_YOLU}/parola` : `${YONETIM_YOLU}/firmalar`);
  const t = await getTranslations("Yonetim");
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">{t("girisBasligi", { uygulama: UYGULAMA.ad })}</h1>
          <p className="text-muted-foreground text-sm">{t("girisAltBaslik")}</p>
        </div>
        <Card>
          <CardContent className="space-y-3">
            {parola === "degisti" ? (
              <p role="status" className={`flex items-start gap-2 rounded-lg p-3 text-sm ${DURUM_KUTUSU.olumlu} ${DURUM_YAZISI.olumlu}`}>
                <CircleCheck className="mt-0.5 size-4 shrink-0" />
                {t("parolaDegistiBilgi")}
              </p>
            ) : null}
            <YonetimGirisFormu />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
