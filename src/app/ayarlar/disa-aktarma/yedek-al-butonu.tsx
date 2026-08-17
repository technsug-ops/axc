"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { DatabaseBackup, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

import { simdiYedekAl, type ElleYedekSonucu } from "./yedek-al-actions";

/**
 * "Şimdi yedek al" düğmesi. Uyarı zili "yedeğin eski" dediğinde kullanıcının
 * SORUNU ÇÖZEBİLECEĞİ tek yer burasıdır (bkz. yedek-al-actions.ts).
 *
 * Sonuç GÖRÜNÜR bildirilir: kaç satır, kaç KB, hangi gün. "Yedek alındı"
 * demek yetmez — 17.08'de "200 döndü" diyen bir cevabın arkasında gerçekten
 * dosya var mı diye ayrıca bakmak gerekmişti.
 */
export function YedekAlButonu() {
  const t = useTranslations("DisaAktarma");
  const [bekliyor, basla] = useTransition();
  const [sonuc, setSonuc] = useState<ElleYedekSonucu | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        // 44px dokunma hedefi (İlke #8).
        className="h-11"
        disabled={bekliyor}
        onClick={() =>
          basla(async () => {
            setSonuc(null);
            setSonuc(await simdiYedekAl());
          })
        }
      >
        <DatabaseBackup />
        {bekliyor ? t("yedekAliniyor") : t("simdiYedekAl")}
      </Button>

      {sonuc?.tamam === true ? (
        <p className={`rounded-md p-2 text-sm ${DURUM_KUTUSU.olumlu} ${DURUM_YAZISI.olumlu}`}>
          {t("yedekAlindi", {
            gun: sonuc.gun,
            satir: sonuc.satir,
            kb: sonuc.boyutKb,
          })}
        </p>
      ) : null}

      {sonuc?.tamam === false ? (
        <p className={`flex items-center gap-2 rounded-md p-2 text-sm ${DURUM_KUTUSU.olumsuz} ${DURUM_YAZISI.olumsuz}`}>
          <TriangleAlert className="size-4 shrink-0" />
          {sonuc.hata}
        </p>
      ) : null}
    </div>
  );
}
