"use client";

import { useActionState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { kaydet } from "./eylemler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KATKI_TURLERI } from "./katki";

export function OrtaklikFormu({ tur, ortaklar = [], projeler = [] }: {
  tur: "proje" | "ortak" | "katilim";
  ortaklar?: { id: string; ad: string }[];
  projeler?: { id: string; ad: string }[];
}) {
  const t = useTranslations("Ortaklik");
  const [sonuc, action, bekliyor] = useActionState(kaydet, { tamam: false });
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (sonuc.tamam) form.current?.reset(); }, [sonuc]);
  return <form ref={form} action={action} className="space-y-3 rounded-lg border p-4">
    <h2 className="font-semibold">{t(tur)}</h2>
    <input type="hidden" name="tur" value={tur} />
    {tur !== "katilim" && <label className="block space-y-1 text-sm">{t("ad")}<Input name="ad" required maxLength={191} /></label>}
    {tur === "proje" && <>
      <label className="block space-y-1 text-sm">{t("baslangic")}<Input name="baslangic" type="date" required /></label>
      <p className="text-sm text-muted-foreground">{t("paraBirimiSabit")}</p>
    </>}
    {tur === "katilim" && <>
      <label className="block space-y-1 text-sm">{t("projeSec")}<select name="projeId" required className="min-h-11 w-full rounded-md border bg-background px-3"><option value="">{t("sec")}</option>{projeler.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}</select></label>
      <label className="block space-y-1 text-sm">{t("ortakSec")}<select name="ortakId" required className="min-h-11 w-full rounded-md border bg-background px-3"><option value="">{t("sec")}</option>{ortaklar.map(o => <option key={o.id} value={o.id}>{o.ad}</option>)}</select></label>
      <label className="block space-y-1 text-sm">{t("sorumluluk")}<Input name="sorumluluk" required maxLength={1000} /></label>
      <fieldset><legend className="mb-2 text-sm">{t("katkilar")}</legend><div className="flex flex-wrap gap-3">{KATKI_TURLERI.map(k => <label key={k} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name={k} className="size-5" />{t(k)}</label>)}</div></fieldset>
    </>}
    <Button disabled={bekliyor || (tur === "katilim" && (!ortaklar.length || !projeler.length))}>{t(bekliyor ? "kaydediliyor" : "kaydet")}</Button>
    <p role="status" aria-live="polite" className={sonuc.hata ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{sonuc.hata ?? (sonuc.tamam ? t("kaydedildi") : "")}</p>
  </form>;
}
