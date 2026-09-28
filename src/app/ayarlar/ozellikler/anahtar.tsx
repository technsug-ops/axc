"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import { finansmanCokBirimAyarla } from "./eylemler";

/** Tek özellik satırı: durum görünür, düğme durumu SÖYLER (İlke #2, #5). */
export function FinansmanCokBirimAnahtari({ acik }: { acik: boolean }) {
  const t = useTranslations("Ozellikler");
  const [mesaj, setMesaj] = useState<{ tamam: boolean; metin: string } | null>(null);
  const [bekliyor, basla] = useTransition();
  return (
    <div className="bg-card max-w-2xl space-y-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">{t("cokBirim.baslik")}</h2>
          <p className="text-muted-foreground text-sm">{t("cokBirim.aciklama")}</p>
        </div>
        <span className={`rounded-md border px-2 py-1 text-xs font-medium ${acik ? "border-primary text-primary" : "text-muted-foreground"}`}>
          {acik ? t("acik") : t("kapali")}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">{t("cokBirim.not")}</p>
      <Button
        variant={acik ? "outline" : "default"}
        disabled={bekliyor}
        className="min-h-11 md:min-h-9"
        onClick={() =>
          basla(async () => {
            const r = await finansmanCokBirimAyarla(!acik);
            setMesaj(r.tamam ? { tamam: true, metin: !acik ? t("acildi") : t("kapandi") } : { tamam: false, metin: r.hata ?? "" });
          })
        }
      >
        {acik ? t("kapat") : t("ac")}
      </Button>
      {mesaj ? (
        <p className={`text-sm ${mesaj.tamam ? "" : "text-destructive"}`} role={mesaj.tamam ? "status" : "alert"}>
          {mesaj.metin}
        </p>
      ) : null}
    </div>
  );
}
