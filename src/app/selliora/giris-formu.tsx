"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { yonetimGirisYap, type YonetimGirisDurumu } from "./actions";

/** Firma giriş formunun aynısı (İlke #10) — firma kodu alanı YOK: yönetim katmanı firmaya bağlı değil. */
export function YonetimGirisFormu() {
  const t = useTranslations("Yonetim");
  const [durum, formAction, bekliyor] = useActionState<YonetimGirisDurumu, FormData>(yonetimGirisYap, {});
  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="yonetim-eposta">{t("eposta")}</Label>
        <Input id="yonetim-eposta" name="email" type="email" autoComplete="username" placeholder={t("epostaIpucu")} autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="yonetim-parola">{t("parola")}</Label>
        <Input id="yonetim-parola" name="password" type="password" autoComplete="current-password" />
      </div>
      <HataOzeti hatalar={durum.hatalar} />
      <Button type="submit" className="w-full" disabled={bekliyor}>
        <LogIn />
        {bekliyor ? t("giriliyor") : t("girisYap")}
      </Button>
    </form>
  );
}
