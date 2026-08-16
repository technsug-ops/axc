"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { DurumRozeti } from "@/components/durum-rozeti";
import { Button } from "@/components/ui/button";
import { useBicim } from "@/lib/bicim-istemci";

import { odemeTersAl } from "./eylemler";

/**
 * Kaydedilmiş bir ödeme satırı + "ters al" eylemi.
 *
 * SİLME YOK. Yanlış kayıt ters işaretli bir satırla nötrlenir ve İKİSİ DE
 * defterde kalır — stok defterindeki ADJUSTMENT ilkesinin aynısı. Ters
 * kayıt ekranda `ters kayıt` etiketiyle görünür ki geçmiş okunabilir olsun.
 */
export function OdemeSatiri({
  odemeId,
  odenen,
  faiz,
  tarih,
  paraBirimi,
  tersMi,
  tersAlinmisMi,
}: {
  odemeId: string;
  odenen: number;
  faiz: number;
  tarih: string;
  paraBirimi: "TRY" | "EUR";
  tersMi: boolean;
  tersAlinmisMi: boolean;
}) {
  const t = useTranslations("KartOdeme");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  const para = (n: number) => bicim.para(n, paraBirimi);

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-sm">
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-muted-foreground">{tarih}</span>
        <span className="tabular-nums">{para(odenen)}</span>
        {faiz !== 0 ? (
          <span className="text-muted-foreground tabular-nums text-xs">
            {t("faiz")} {para(faiz)}
          </span>
        ) : null}
        {tersMi ? (
          <DurumRozeti durum="notr" isaretsiz>
            {t("tersKayitEtiketi")}
          </DurumRozeti>
        ) : null}
      </span>

      {/* Ters kaydın tersi alınmaz; zaten ters alınmış kayıt da tekrarlanmaz. */}
      {!tersMi && !tersAlinmisMi ? (
        <Button
          size="sm"
          variant="outline"
          className="h-11 md:h-8"
          disabled={bekliyor}
          onClick={() =>
            basla(async () => {
              setHata(null);
              const sonuc = await odemeTersAl(odemeId);
              if (sonuc.tamam) router.refresh();
              else setHata(sonuc.hata);
            })
          }
        >
          {bekliyor ? ortak("kaydediliyor") : t("tersAl")}
        </Button>
      ) : null}

      {hata ? (
        <DurumRozeti durum="olumsuz">{hata}</DurumRozeti>
      ) : null}
    </div>
  );
}
