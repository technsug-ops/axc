"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { LogIn } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { girisYap, type GirisDurumu } from "./actions";

export function GirisFormu({ devam, sonFirmaKodu }: { devam: string; sonFirmaKodu: string }) {
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

      {/*
        FİRMA KODU (K303 4c-1, kullanıcı kararı 04.10.2026). Oturum bu firmaya
        bağlanır; firma içinden başka firmaya geçiş yoktur.
        KAMERA YOK — BİLEREK (İlke #7 istisnası): firma kodu ürün/sipariş kodu
        değildir, okutulacak bir etiketi yoktur; elle yazılır ve cihazda
        hatırlanır (İlke #9).
      */}
      <div className="space-y-2">
        <Label htmlFor="giris-firma-kodu">{t("firmaKodu")}</Label>
        <Input
          id="giris-firma-kodu"
          name="firmaKodu"
          type="text"
          autoComplete="organization"
          autoCapitalize="characters"
          spellCheck={false}
          defaultValue={sonFirmaKodu}
          placeholder={t("firmaKoduIpucu")}
          autoFocus={!sonFirmaKodu}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="giris-eposta">{t("eposta")}</Label>
        <Input
          id="giris-eposta"
          name="email"
          type="email"
          autoComplete="username"
          placeholder={t("epostaIpucu")}
          autoFocus={Boolean(sonFirmaKodu)}
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
