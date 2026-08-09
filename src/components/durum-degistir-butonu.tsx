"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Power, PowerOff } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Aktif/pasif düğmesi (Kullanıcı Kolaylığı İlkeleri #1, #5, #10).
 *
 * Kart ve kanal hesabı ekranlarında AYNI görünür ve AYNI çalışır.
 * İşlem sonucu ekranda yazılır — sessiz başarı yasak.
 *
 * Not: Pasife alma geri alınabilir bir işlemdir, bu yüzden onay diyaloğu
 * istemez (#6 yalnızca geri alınamaz işlemler için).
 */

type Durum = { basari?: string; hatalar?: string[] };

export function DurumDegistirButonu({
  kayitId,
  aktifMi,
  action,
}: {
  kayitId: string;
  aktifMi: boolean;
  action: (durum: Durum, formData: FormData) => Promise<Durum>;
}) {
  const t = useTranslations("Ortak");

  const [durum, formAction, bekliyor] = useActionState<Durum, FormData>(
    action,
    {},
  );

  return (
    <div className="space-y-1">
      <form action={formAction}>
        <input type="hidden" name="id" value={kayitId} />
        <Button type="submit" variant="outline" size="sm" disabled={bekliyor}>
          {aktifMi ? <PowerOff /> : <Power />}
          {bekliyor
            ? t("kaydediliyor")
            : aktifMi
              ? t("pasifeAl")
              : t("aktiflestir")}
        </Button>
      </form>

      {durum.basari ? (
        <p className="text-xs font-medium text-emerald-600" role="status">
          {durum.basari}
        </p>
      ) : null}
      {durum.hatalar?.length ? (
        <p className="text-destructive text-xs font-medium" role="alert">
          {durum.hatalar.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
