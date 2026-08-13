"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formGonderimi } from "@/lib/form-gonderimi";

import { parolamiDegistir, type ParolaDurumu } from "./actions";

export function ParolaFormu() {
  const t = useTranslations("ParolaDegistir");
  const ortak = useTranslations("Ortak");

  const [durum, formAction, bekliyor] = useActionState<ParolaDurumu, FormData>(
    parolamiDegistir,
    {},
  );

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-4">
      <HataOzeti hatalar={durum.hatalar} />

      <div className="space-y-2">
        <Label htmlFor="p-eski">{t("eskiEtiketi")}</Label>
        <Input id="p-eski" name="eski" type="password" autoComplete="current-password" className="h-11 md:h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-yeni">{t("yeniEtiketi")}</Label>
        <Input id="p-yeni" name="yeni" type="password" autoComplete="new-password" className="h-11 md:h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-tekrar">{t("tekrarEtiketi")}</Label>
        <Input id="p-tekrar" name="tekrar" type="password" autoComplete="new-password" className="h-11 md:h-10" />
      </div>

      <Button type="submit" disabled={bekliyor} className="h-11 md:h-10">
        <Save />
        {bekliyor ? ortak("kaydediliyor") : t("kaydet")}
      </Button>
      <p className="text-muted-foreground text-xs">{t("cikisNotu")}</p>
    </form>
  );
}
