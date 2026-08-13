"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formGonderimi } from "@/lib/form-gonderimi";

import { rolEkle, type RolDurumu } from "./actions";
import { IzinSecici, type IzinSecenegi } from "./izin-secici";

/** Yeni rol — izinsiz rol açılamaz (bkz. actions.ts). */
export function RolFormu({ izinler }: { izinler: IzinSecenegi[] }) {
  const t = useTranslations("Rol");
  const ortak = useTranslations("Ortak");

  const [durum, formAction, bekliyor] = useActionState<RolDurumu, FormData>(
    rolEkle,
    {},
  );
  const [secili, setSecili] = useState<Set<string>>(new Set());

  function degistir(anahtar: string, secildi: boolean) {
    setSecili((onceki) => {
      const yeni = new Set(onceki);
      if (secildi) yeni.add(anahtar);
      else yeni.delete(anahtar);
      return yeni;
    });
  }

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-4">
      <HataOzeti hatalar={durum.hatalar} />

      <div className="space-y-2">
        <Label htmlFor="r-ad">{t("adEtiketi")} *</Label>
        <Input
          id="r-ad"
          name="name"
          placeholder={t("adIpucu")}
          autoComplete="off"
          className="h-11 max-w-sm md:h-10"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("izinlerEtiketi")}</Label>
        <IzinSecici izinler={izinler} secili={secili} onDegisti={degistir} />
      </div>

      <Button type="submit" disabled={bekliyor} className="h-11 md:h-10">
        <Plus />
        {bekliyor ? ortak("kaydediliyor") : t("ekle")}
      </Button>
    </form>
  );
}
