"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { girisYap, type GirisDurumu } from "./actions";

export function GirisFormu({ devam }: { devam: string }) {
  const t = useTranslations("Giris");

  const [durum, formAction, bekliyor] = useActionState<GirisDurumu, FormData>(
    girisYap,
    {},
  );

  // Radix Select yok, tarayıcı parola yöneticisi çalışsın diye düz `action`
  // kullanılıyor — formGonderimi sarmalayıcısına gerek yok.
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="devam" value={devam} />

      <div className="space-y-2">
        <Label htmlFor="giris-eposta">{t("eposta")}</Label>
        <Input
          id="giris-eposta"
          name="email"
          type="email"
          autoComplete="username"
          placeholder={t("epostaIpucu")}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="giris-parola">{t("parola")}</Label>
        <Input
          id="giris-parola"
          name="password"
          type="password"
          autoComplete="current-password"
        />
      </div>

      <HataOzeti hatalar={durum.hatalar} />

      <Button type="submit" className="w-full" disabled={bekliyor}>
        <LogIn />
        {bekliyor ? t("giriliyor") : t("girisYap")}
      </Button>
    </form>
  );
}
