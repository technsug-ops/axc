"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { DurumRozeti } from "@/components/durum-rozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DURUM_YAZISI } from "@/lib/renkler";

import { tarifeOnizle, tarifeyiYaz } from "./eylemler";

/**
 * ============================================================================
 *  TARİFE YÜKLEYİCİ — İKİ ADIM (K47)
 * ----------------------------------------------------------------------------
 *  ⚠ DOSYA DURUMDA TUTULMUYOR, FORMDAN OKUNUYOR. `useState(dosya)` yazıp
 *  sonra o durumdan göndermek, anayasadaki kamera vakasının aynısı olurdu:
 *  React durumu senkron güncellenmediği için kullanıcının SON seçtiği dosya
 *  yerine bir öncekini gönderirdik ve ekranda hiçbir hata görünmezdi.
 *  Okunan değer, onu kullanacak yere doğrudan gider.
 *
 *  ⚠ İKİNCİ ADIM DOSYAYI YENİDEN OKUYOR. Önizleme sunucuda yapıldı ama
 *  sonucu saklamadık; yazma adımı dosyayı baştan çözüyor. Bu bilerek:
 *  çözümü istemcide saklasaydık, kullanıcı dosyayı değiştirdiğinde ekran
 *  ESKİ planı gösterip YENİ dosyayı yazabilirdi.
 * ============================================================================
 */

type Sonuc =
  | Awaited<ReturnType<typeof tarifeOnizle>>
  | Awaited<ReturnType<typeof tarifeyiYaz>>;

export function Yukleyici({
  hesaplar,
}: {
  hesaplar: { id: string; etiket: string }[];
}) {
  const t = useTranslations("Tarife");
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);
  const [bekliyor, basla] = useTransition();

  function gonder(form: HTMLFormElement, yaz: boolean) {
    const veri = new FormData(form);
    basla(async () => {
      setSonuc(await (yaz ? tarifeyiYaz(veri) : tarifeOnizle(veri)));
    });
  }

  const onizleme = sonuc?.durum === "ONIZLEME" ? sonuc : null;
  const yazildi = sonuc?.durum === "YAZILDI" ? sonuc : null;
  const arsiv = sonuc && "arsiv" in sonuc ? sonuc.arsiv : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        gonder(e.currentTarget, false);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="hesap">{t("hesap")}</Label>
          {/*
            ⚠ DÜZ `select` — shadcn `Select` gizli bir input kullanıyor ve
            `new FormData(form)` ile okunması ek bağlama istiyor. Burada tek
            alan var; karmaşıklık kazandırmıyor.
          */}
          <select
            id="hesap"
            name="hesap"
            required
            className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm"
            defaultValue={hesaplar.length === 1 ? hesaplar[0].id : ""}
          >
            <option value="">{t("hesapSec")}</option>
            {hesaplar.map((h) => (
              <option key={h.id} value={h.id}>
                {h.etiket}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dosya">{t("dosya")}</Label>
          <Input
            id="dosya"
            name="dosya"
            type="file"
            accept=".xlsx"
            required
            className="h-11"
            /** Yeni dosya seçilince eski önizleme DÜŞER — bayat plan gösterilmez. */
            onChange={() => setSonuc(null)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={bekliyor} className="min-h-11">
          {bekliyor ? t("yukleniyor") : t("onizle")}
        </Button>
        {onizleme ? (
          <Button
            type="button"
            disabled={bekliyor}
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
            onClick={() => setSonuc(null)}
          >
            {t("vazgec")}
          </Button>
        ) : null}
      </div>

      {sonuc?.durum === "HATA" ? (
        <p className="text-destructive text-sm" role="alert">
          {sonuc.engel}
        </p>
      ) : null}

      {onizleme ? (
        <div className="border-border space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">{t("onizlemeBaslik")}</p>
          {onizleme.pencere ? (
            <p className="text-muted-foreground text-sm">
              {t("pencere")}: {onizleme.pencere.baslangic.slice(0, 10)} –{" "}
              {onizleme.pencere.bitis.slice(0, 10)}
            </p>
          ) : null}

          {/*
            ⚠ KOMPAKT KUTUCUK IZGARASI — "etiket solda, rakam en sağda" tam
            genişlik satırı YASAK (İlke #12). Yedi rakam yan yana okunmalı.
          */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["okunanSatir", onizleme.rapor.okunanSatir],
                ["yazilacakKalem", onizleme.rapor.yazilacakKalem],
                ["eslesenUrun", onizleme.rapor.eslesenUrun],
                ["bagsizUrun", onizleme.rapor.bagsizUrun],
                ["bagsizKalem", onizleme.rapor.bagsizKalem],
                ["mukerrerElenen", onizleme.rapor.mukerrerElenen],
                ["atlananSatir", onizleme.rapor.atlananSatir],
              ] as const
            ).map(([anahtar, deger]) => (
              <div key={anahtar} className="bg-muted/40 rounded-md px-2.5 py-2">
                <p className="text-muted-foreground text-xs">{t(anahtar)}</p>
                <p className="text-base font-semibold tabular-nums">{deger}</p>
              </div>
            ))}
          </div>

          {onizleme.rapor.bagsizUrun > 0 ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">{t("bagsizUyari")}</p>
              {onizleme.bagsizOrnekler.length > 0 ? (
                <p className="text-muted-foreground text-xs">
                  {t("bagsizOrnekBaslik")}:{" "}
                  {onizleme.bagsizOrnekler
                    .map((b) => b.urunAdi ?? b.barkod)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
          ) : null}

          {onizleme.dahaOnceYuklendi ? (
            <p className={`text-sm font-medium ${DURUM_YAZISI.uyari}`}>
              {t("dahaOnceYuklendi")}
            </p>
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
              kalem: yazildi.kalem,
              baslangic: yazildi.pencere.baslangic.slice(0, 10),
              bitis: yazildi.pencere.bitis.slice(0, 10),
              sayi: yazildi.yuklemeSayisi,
            })}
          </p>
          {/*
            ⚠ ARŞİVİN SONUCU SESSİZ KALMIYOR. Arşivsiz bir yükleme
            "kaynakta ne vardı" sorusunu cevapsız bırakır; bunu yutmak,
            arşivi olmayan bir yüklemeyi arşivli sanmak olurdu.
          */}
          {arsiv === "YAZILDI" ? (
            <p className="text-muted-foreground text-xs">{t("arsivYazildi")}</p>
          ) : null}
          {arsiv === "DEPO_YOK" ? (
            <p className={`text-xs ${DURUM_YAZISI.uyari}`}>
              {t("arsivDepoYok")}
            </p>
          ) : null}
          {arsiv === "HATA" ? (
            <p className={`text-xs ${DURUM_YAZISI.uyari}`}>
              {t("arsivHata")}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
