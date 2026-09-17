"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { DurumRozeti } from "@/components/durum-rozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_YAZISI } from "@/lib/renkler";

import { kargoTarifeOnizle, kargoTarifeyiYaz } from "./eylemler";

/**
 * ============================================================================
 *  KARGO TARİFESİ PDF YÜKLEYİCİ — İKİ ADIM (K202)
 * ----------------------------------------------------------------------------
 *  ⚠ DOSYA DURUMDA TUTULMUYOR, FORMDAN OKUNUYOR — `ayarlar/tarife/yukleyici.
 *  tsx` ile AYNI gerekçe: React durumu senkron güncellenmez, son seçilen
 *  dosya yerine bir öncekini göndermek sessiz bir hata olurdu.
 *
 *  ⚠ İKİNCİ ADIM DOSYAYI YENİDEN OKUR VE YENİDEN ÇÖZER — çözümü istemcide
 *  saklamadık; kullanıcı dosyayı değiştirirse ekran ESKİ planı gösterip
 *  YENİ dosyayı yazamaz.
 * ============================================================================
 */

type Sonuc =
  | Awaited<ReturnType<typeof kargoTarifeOnizle>>
  | Awaited<ReturnType<typeof kargoTarifeyiYaz>>;

export function Yukleyici() {
  const t = useTranslations("HbKargoTarife");
  const bicim = useBicim();
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [uzerineYazOnay, setUzerineYazOnay] = useState(false);
  const [bekliyor, basla] = useTransition();

  function gonder(form: HTMLFormElement, yaz: boolean) {
    const veri = new FormData(form);
    basla(async () => {
      setSonuc(await (yaz ? kargoTarifeyiYaz(veri) : kargoTarifeOnizle(veri)));
    });
  }

  const onizleme = sonuc?.durum === "ONIZLEME" ? sonuc : null;
  const yazildi = sonuc?.durum === "YAZILDI" ? sonuc : null;
  const yazilabilir =
    onizleme !== null && (!onizleme.uzerineYazmaGerekli || uzerineYazOnay) && !onizleme.zatenAyni;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        gonder(e.currentTarget, false);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="dosya">{t("dosya")}</Label>
        <Input
          id="dosya"
          name="dosya"
          type="file"
          accept=".pdf"
          required
          className="h-11"
          onChange={() => {
            setSonuc(null);
            setUzerineYazOnay(false);
          }}
        />
        <p className="text-muted-foreground text-xs">{t("dosyaIpucu")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={bekliyor} className="min-h-11">
          {bekliyor ? t("yukleniyor") : t("onizle")}
        </Button>
        {onizleme ? (
          <Button
            type="button"
            disabled={bekliyor || !yazilabilir}
            className="min-h-11"
            onClick={(e) => {
              const form = e.currentTarget.closest("form");
              if (form) gonder(form, true);
            }}
          >
            {t("yaz")}
          </Button>
        ) : null}
        {sonuc ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            onClick={() => {
              setSonuc(null);
              setUzerineYazOnay(false);
            }}
          >
            {t("vazgec")}
          </Button>
        ) : null}
      </div>

      {sonuc?.durum === "HATA" ? (
        <div className="space-y-1" role="alert">
          <p className="text-destructive text-sm">{sonuc.engel}</p>
          {sonuc.eslesmeyenler && sonuc.eslesmeyenler.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              {t("eslesmeyenListe", { adlar: sonuc.eslesmeyenler.join(" · ") })}
            </p>
          ) : null}
        </div>
      ) : null}

      {onizleme ? (
        <div className="border-border space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">
            {t("onizlemeBaslik", { tarih: onizleme.etkinTarih.slice(0, 10) })}
          </p>

          {/* KOMPAKT KUTUCUK IZGARASI — İlke #12, tam genişlik satır yasak. */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(
              [
                ["okunanSatir", onizleme.rapor.okunanSatir],
                ["yazilacakDeger", onizleme.rapor.yazilacakDeger],
                ["ayniKalan", onizleme.rapor.ayniKalan],
                ["degisen", onizleme.rapor.degisen],
                ["yeni", onizleme.rapor.yeni],
              ] as const
            ).map(([anahtar, deger]) => (
              <div key={anahtar} className="bg-muted/40 rounded-md px-2.5 py-2">
                <p className="text-muted-foreground text-xs">{t(anahtar)}</p>
                <p className="text-base font-semibold tabular-nums">
                  {bicim.sayi(deger)}
                </p>
              </div>
            ))}
          </div>

          {onizleme.ornekDegisenler.length > 0 ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">{t("ornekDegisenlerBaslik")}</p>
              <ul className="text-muted-foreground space-y-0.5 text-xs tabular-nums">
                {onizleme.ornekDegisenler.map((o, i) => (
                  <li key={i}>
                    {o.tasiyici} — desi {o.desi}: {bicim.para(o.eski, "TRY")} →{" "}
                    <span className="text-foreground font-medium">
                      {bicim.para(o.yeni, "TRY")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {onizleme.uyarilar.length > 0 ? (
            <div className="space-y-1">
              <p className={`text-xs font-medium ${DURUM_YAZISI.uyari}`}>
                {t("uyariBaslik", { adet: onizleme.uyarilar.length })}
              </p>
              <ul className="text-muted-foreground space-y-0.5 text-xs">
                {onizleme.uyarilar.slice(0, 5).map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {onizleme.zatenAyni ? (
            <p className={`text-sm font-medium ${DURUM_YAZISI.notr}`}>{t("zatenAyni")}</p>
          ) : onizleme.uzerineYazmaGerekli ? (
            <label className="flex min-h-11 items-start gap-2">
              <input
                type="checkbox"
                checked={uzerineYazOnay}
                onChange={(e) => setUzerineYazOnay(e.target.checked)}
                name="uzerineYazOnay"
                className="mt-1 size-4"
              />
              <span className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("uzerineYazUyari")}</span>
            </label>
          ) : null}
        </div>
      ) : null}

      {yazildi ? (
        <div className="border-border space-y-2 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <DurumRozeti durum="olumlu">{t("yazildiBaslik")}</DurumRozeti>
          </div>
          <p className="text-sm">
            {t("yazildiOzet", {
              adet: bicim.sayi(yazildi.yazilanSatir),
              tarih: yazildi.etkinTarih.slice(0, 10),
            })}
          </p>
          {yazildi.arsiv === "YAZILDI" ? (
            <p className="text-muted-foreground text-xs">{t("arsivYazildi")}</p>
          ) : yazildi.arsiv === "DEPO_YOK" ? (
            <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("arsivDepoYok")}</p>
          ) : (
            <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("arsivHata")}</p>
          )}
        </div>
      ) : null}
    </form>
  );
}
