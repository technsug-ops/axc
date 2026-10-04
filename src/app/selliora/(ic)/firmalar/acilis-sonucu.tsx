"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { CircleCheck } from "lucide-react";

import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Button } from "@/components/ui/button";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * Açılış sonucu — geçici parola YALNIZ burada, BİR KEZ görünür (adrese,
 * ize, günlüğe yazılmaz). Sayfa yenilenince kaybolur; bu yüzden ekran
 * bunu açıkça söyler.
 */
export function AcilisSonucu({
  kod,
  yoneticiEposta,
  yeniKullanici,
  geciciParola,
}: {
  kod: string;
  yoneticiEposta: string;
  yeniKullanici: boolean;
  geciciParola: string | null;
}) {
  const t = useTranslations("Yonetim");
  return (
    <div role="status" className={`space-y-3 rounded-lg p-4 ${DURUM_KUTUSU.olumlu}`}>
      <p className={`flex items-center gap-2 font-medium ${DURUM_YAZISI.olumlu}`}>
        <CircleCheck className="size-5 shrink-0" />
        {t("firmaAcildi")}
      </p>
      <div className="grid gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">{t("firmaKodu")}:</span>
          <KopyalanabilirKod deger={kod} etiket={t("firmaKodu")} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">{t("yoneticiEposta")}:</span>
          <KopyalanabilirKod deger={yoneticiEposta} etiket={t("yoneticiEposta")} />
        </div>
        {yeniKullanici && geciciParola ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">{t("geciciParola")}:</span>
              <KopyalanabilirKod deger={geciciParola} etiket={t("geciciParola")} />
            </div>
            <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("geciciParolaUyari")}</p>
          </>
        ) : (
          <p className="text-muted-foreground text-xs">{t("varOlanYonetici")}</p>
        )}
      </div>
      <Button asChild variant="outline" className="min-h-11">
        <Link href="/selliora/firmalar">{t("listeyeDon")}</Link>
      </Button>
    </div>
  );
}
