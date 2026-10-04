"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { yeniFirmaAc, type YeniFirmaDurumu } from "../actions";
import { AcilisSonucu } from "../acilis-sonucu";

export function YeniFirmaFormu() {
  const t = useTranslations("Yonetim");
  const [durum, formAction, bekliyor] = useActionState<YeniFirmaDurumu, FormData>(yeniFirmaAc, {});
  if (durum.durum === "ACILDI") return <AcilisSonucu {...durum} />;
  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="firma-ad">{t("firmaAdi")}</Label>
        <Input id="firma-ad" name="ad" placeholder={t("firmaAdiIpucu")} autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="firma-kod">{t("firmaKodu")}</Label>
        <Input id="firma-kod" name="kod" autoCapitalize="characters" spellCheck={false} placeholder={t("firmaKoduIpucu")} />
        <p className="text-muted-foreground text-xs">{t("firmaKoduAciklama")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="firma-yonetici-eposta">{t("yoneticiEposta")}</Label>
        <Input id="firma-yonetici-eposta" name="yoneticiEposta" type="email" placeholder={t("epostaIpucu")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="firma-yonetici-ad">{t("yoneticiAd")}</Label>
        <Input id="firma-yonetici-ad" name="yoneticiAd" placeholder={t("yoneticiAdIpucu")} />
      </div>
      <p className="text-muted-foreground text-xs">{t("acilisAciklama")}</p>
      <HataOzeti hatalar={durum.hatalar} baslik={t("acilamadi")} />
      <Button type="submit" className="min-h-11 w-full" disabled={bekliyor}>
        <Building2 />
        {bekliyor ? t("aciliyor") : t("firmayiAc")}
      </Button>
    </form>
  );
}
