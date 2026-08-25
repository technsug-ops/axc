"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowRightLeft } from "lucide-react";

import { gocuOnizle, gocuUygula, type GocSonucu } from "@/app/ayarlar/depo/goc/eylemler";
import { DurumRozeti } from "@/components/durum-rozeti";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import type { KaynakRaf, HedefRaf } from "@/lib/depo/goc";

/**
 * ============================================================================
 *  RAF GÖÇÜ FORMU (K50 ⑦)
 * ----------------------------------------------------------------------------
 *  ⚠ EŞLEŞTİRMEYİ SİSTEM YAPMAZ. `A5`in fiziksel olarak hangi yeni rafa denk
 *  geldiğini yalnız depoyu bilen kişi söyleyebilir; sistem tahmin ederse
 *  1090 ürünün konumu sessizce yanlışa döner ve kimse fark etmez.
 *
 *  ⚠ İKİ ADIM, TEK YAZMA. "Önce göster" hiçbir şey taşımaz.
 * ============================================================================
 */
export function GocFormu({
  kaynaklar,
  hedefler,
}: {
  kaynaklar: KaynakRaf[];
  hedefler: HedefRaf[];
}) {
  const t = useTranslations("Goc");
  const [sonuc, setSonuc] = useState<GocSonucu | null>(null);
  const [bekliyor, basla] = useTransition();

  if (kaynaklar.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("kaynakYok")}</p>;
  }
  if (hedefler.length === 0) {
    return <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("hedefYok")}</p>;
  }

  return (
    <form
      className="space-y-5"
      action={(form) => basla(async () => setSonuc(await gocuOnizle(form)))}
    >
      <div className="border-border space-y-3 rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">{t("eslemeNotu")}</p>

        <ul className="space-y-2">
          {kaynaklar.map((k) => (
            <li
              key={k.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border p-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {k.kod}
                  {k.ad ? (
                    <span className="text-muted-foreground"> · {k.ad}</span>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("varyantSayisi", { adet: k.varyant })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <ArrowRightLeft className="text-muted-foreground size-4" aria-hidden />
                <Label htmlFor={`hedef-${k.id}`} className="sr-only">
                  {t("hedefSec")}
                </Label>
                {/*
                  ⚠ VARSAYILAN BOŞ — "taşıma" varsayılan davranış olamaz.
                  Eşleştirilmemiş raf DOKUNULMADAN kalır; boş bırakmak
                  meşru bir cevaptır ("bunu şimdi taşımıyorum").
                */}
                <select
                  id={`hedef-${k.id}`}
                  name={`hedef-${k.id}`}
                  defaultValue=""
                  disabled={bekliyor}
                  className="border-input bg-background h-11 rounded-md border px-2 text-sm md:h-9"
                >
                  <option value="">{t("tasima")}</option>
                  {hedefler.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.kod}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={bekliyor} className="min-h-11">
            {bekliyor ? t("hesaplaniyor") : t("onizle")}
          </Button>

          {sonuc?.durum === "ONIZLEME" ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={bekliyor}
              onClick={(e) => {
                const form = e.currentTarget.closest("form");
                if (!form) return;
                const veri = new FormData(form);
                basla(async () => setSonuc(await gocuUygula(veri)));
              }}
            >
              {t("uygula", { adet: sonuc.plan.varyantToplami })}
            </Button>
          ) : null}
        </div>

        {sonuc?.durum === "HATA" ? (
          <p className={`text-sm ${DURUM_YAZISI.olumsuz}`} role="alert">
            {sonuc.engel}
          </p>
        ) : null}
      </div>

      {sonuc?.durum === "ONIZLEME" ? (
        <div className="border-border space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">{t("onizlemeBaslik")}</p>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["tasinacakRaf", sonuc.plan.tasinacak.length],
                ["tasinacakVaryant", sonuc.plan.varyantToplami],
                ["atlanacakRaf", sonuc.plan.atlanacak.length],
              ] as const
            ).map(([anahtar, deger]) => (
              <div key={anahtar} className="bg-muted/40 rounded-md px-2.5 py-2">
                <p className="text-muted-foreground text-xs">{t(anahtar)}</p>
                <p className="text-base font-semibold tabular-nums">{deger}</p>
              </div>
            ))}
          </div>

          <ul className="space-y-1 text-sm">
            {sonuc.plan.tasinacak.map((s) => (
              <li key={s.kaynak.id} className="font-mono">
                {s.kaynak.kod} → {s.hedefKod}{" "}
                <span className="text-muted-foreground font-sans">
                  ({t("varyantSayisi", { adet: s.kaynak.varyant })})
                </span>
              </li>
            ))}
          </ul>

          {/*
            ⚠ BOŞALAN RAF PASİFE ALINIR, SİLİNMEZ — ve bu ÖNCEDEN söylenir.
            Silmek o rafa dair her geçmiş kaydı sahipsiz bırakırdı.
          */}
          <p className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.notr}`}>
            {t("pasifNotu")}
          </p>
        </div>
      ) : null}

      {sonuc?.durum === "TASINDI" ? (
        <div className="border-border space-y-2 rounded-lg border p-4">
          <DurumRozeti durum="olumlu">{t("tasindiBaslik")}</DurumRozeti>
          <p className="text-sm">
            {t("tasindiOzet", {
              raf: sonuc.tasinanRaf,
              varyant: sonuc.tasinanVaryant,
              pasif: sonuc.pasifEdilen,
            })}
          </p>
        </div>
      ) : null}
    </form>
  );
}
