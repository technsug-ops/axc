"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { DonemIsrarBloku } from "@/components/donem-israr-bloku";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DURUM_KUTUSU } from "@/lib/renkler";

import { iadeDuzenleEylemi, type DuzenlemeDurumu } from "./actions";

/**
 * İADE DÜZENLEME FORMU (K44). Alanlar kayıtlı değerle DOLU açılır;
 * boşaltılan tutar «yok» demektir (sıfır değil). Kapalı dönemde sunucu
 * duraksar ve ısrar bloğu açılır (K108 — aynı ortak blok).
 */
export function IadeDuzenleFormu({
  returnId,
  beklenenGuncelleme,
  baslangic,
  degisimVar,
  yenidenGonderimGorunur,
  hasarliKalemler,
  iptalAdresi,
}: {
  returnId: string;
  beklenenGuncelleme: string;
  baslangic: {
    code: string;
    note: string;
    cezaNotu: string;
    degisimTeslimTarihi: string;
    iadeKargosu: string;
    yenidenGonderimKargosu: string;
    ceza: string;
  };
  degisimVar: boolean;
  yenidenGonderimGorunur: boolean;
  hasarliKalemler: { id: string; baslik: string; not: string }[];
  iptalAdresi: string;
}) {
  const t = useTranslations("IadeDuzenle");
  const ti = useTranslations("Iade");
  const ortak = useTranslations("Ortak");
  const [durum, eylem, bekliyor] = useActionState<DuzenlemeDurumu, FormData>(iadeDuzenleEylemi, {});
  const [israrGecerli, setIsrarGecerli] = useState(false);
  const donemBekliyor = durum.donem !== undefined && !israrGecerli;

  return (
    <form action={eylem} className="space-y-4">
      <input type="hidden" name="returnId" value={returnId} />
      <input type="hidden" name="beklenenGuncelleme" value={beklenenGuncelleme} />

      <Card>
        <CardHeader>
          <CardTitle>{t("bilgiBaslik")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="duz-kod">{ti("iadeNo")}</Label>
            <Input id="duz-kod" name="code" defaultValue={baslangic.code} maxLength={191} className="min-h-11 md:min-h-9" />
          </div>
          {degisimVar ? (
            <div className="space-y-1">
              <Label htmlFor="duz-teslim">{ti("degisimTeslimi")}</Label>
              <Input
                id="duz-teslim"
                name="degisimTeslimTarihi"
                type="date"
                defaultValue={baslangic.degisimTeslimTarihi}
                className="min-h-11 md:min-h-9"
              />
              <p className="text-muted-foreground text-xs">{ti("degisimTeslimiNotu")}</p>
            </div>
          ) : null}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="duz-not">{ortak("aciklama")}</Label>
            <Textarea id="duz-not" name="note" defaultValue={baslangic.note} rows={3} />
          </div>
          {hasarliKalemler.map((k) => (
            <div key={k.id} className="space-y-1 sm:col-span-2">
              <Label htmlFor={`duz-hasar-${k.id}`}>
                {ti("hasarNotu")} — {k.baslik} *
              </Label>
              <Textarea
                id={`duz-hasar-${k.id}`}
                name={`hasarNotu:${k.id}`}
                defaultValue={k.not}
                rows={2}
                placeholder={ti("hasarNotuIpucu")}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("paraBaslik")}</CardTitle>
          <p className="text-muted-foreground text-sm">{t("paraNotu")}</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="duz-kargo">{ti("iadeKargosu")}</Label>
            <Input
              id="duz-kargo"
              name="iadeKargosu"
              inputMode="decimal"
              defaultValue={baslangic.iadeKargosu}
              placeholder={ti("kargoIpucu")}
              className="min-h-11 md:min-h-9"
            />
          </div>
          {yenidenGonderimGorunur ? (
            <div className="space-y-1">
              <Label htmlFor="duz-yeniden">{ti("yenidenGonderim")}</Label>
              <Input
                id="duz-yeniden"
                name="yenidenGonderimKargosu"
                inputMode="decimal"
                defaultValue={baslangic.yenidenGonderimKargosu}
                placeholder={ti("kargoIpucu")}
                className="min-h-11 md:min-h-9"
              />
            </div>
          ) : (
            <input type="hidden" name="yenidenGonderimKargosu" value={baslangic.yenidenGonderimKargosu} />
          )}
          <div className="space-y-1">
            <Label htmlFor="duz-ceza">{ti("cezaTutari")}</Label>
            <Input
              id="duz-ceza"
              name="ceza"
              inputMode="decimal"
              defaultValue={baslangic.ceza}
              placeholder={ti("cezaIpucu")}
              className="min-h-11 md:min-h-9"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="duz-ceza-not">{ti("cezaNotu")}</Label>
            <Textarea id="duz-ceza-not" name="cezaNotu" defaultValue={baslangic.cezaNotu} rows={2} />
          </div>
        </CardContent>
      </Card>

      {durum.donem !== undefined ? (
        <DonemIsrarBloku donem={durum.donem} satisSayisi={durum.donemSatisSayisi ?? 0} onGecerlilik={setIsrarGecerli} />
      ) : null}

      {durum.hata ? (
        <p role="alert" className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.olumsuz}`}>
          {durum.hata}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={bekliyor || donemBekliyor} className="min-h-11 md:min-h-9">
          {bekliyor ? t("kaydediliyor") : t("kaydet")}
        </Button>
        <Button asChild variant="outline" className="min-h-11 md:min-h-9">
          <Link href={iptalAdresi}>{ortak("vazgec")}</Link>
        </Button>
      </div>
      {donemBekliyor ? <p className="text-muted-foreground text-sm">{t("donemBekliyor")}</p> : null}
    </form>
  );
}
