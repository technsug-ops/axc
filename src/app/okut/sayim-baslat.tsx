"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DURUM_YAZISI } from "@/lib/renkler";

import { sayimAc } from "./sayim-actions";

/**
 * SAYIM BAŞLAT — açık oturum yokken çizilir.
 *
 * ⚠ KAPSAM RAKAMI DÜĞMENİN YANINDA: bir günlük işe girilmeden önce kaç
 * varyant sayılacağı GÖRÜNÜR (İlke #9 · #5). "Başlat"a basıp sonra 202
 * varyantla karşılaşmak, kararı geri alınamaz bir yerde vermek olurdu.
 */
export function SayimBaslat({ kapsam }: { kapsam: number }) {
  const t = useTranslations("Sayim");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground max-w-3xl text-sm">
        {t("baslatNotu", { sayi: kapsam })}
      </p>
      <Button
        type="button"
        className="h-11"
        disabled={bekliyor || kapsam === 0}
        onClick={() => {
          setHata(null);
          basla(async () => {
            const sonuc = await sayimAc();
            /**
             * ⛔ SABİT EŞLEME — anahtar çalışma anında birleştirilmiyor;
             * dinamik anahtarı `i18n:kontrol` göremez ve eksik anahtar ancak
             * kullanıcının karşısında patlardı.
             */
            if (sonuc.hata === "ZATEN_ACIK") {
              setHata(t("hataZatenAcik"));
              return;
            }
            if (sonuc.hata) {
              setHata(t("hataSayimYok"));
              return;
            }
            router.refresh();
          });
        }}
      >
        <ClipboardCheck className="size-4" />
        {bekliyor ? ortak("kaydediliyor") : t("baslat")}
      </Button>
      {hata ? <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>{hata}</p> : null}
    </div>
  );
}
