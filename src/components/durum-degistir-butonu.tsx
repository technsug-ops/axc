"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Power, PowerOff } from "lucide-react";

import { EYLEM_SINIFI, EylemEtiketi } from "@/components/satir-eylemi";
import { Button } from "@/components/ui/button";
import { DURUM_YAZISI } from "@/lib/renkler";

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

  // Masaüstünde metin gizlendiği için etiket `title`/`aria-label` ile
  // taşınır — ikon tek başına ne yaptığını söylemez.
  const etiket = aktifMi ? t("pasifeAl") : t("aktiflestir");

  return (
    <div className="space-y-1">
      <form action={formAction}>
        <input type="hidden" name="id" value={kayitId} />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={bekliyor}
          title={etiket}
          aria-label={etiket}
          className={EYLEM_SINIFI}
        >
          {aktifMi ? <PowerOff /> : <Power />}
          <EylemEtiketi>{bekliyor ? t("kaydediliyor") : etiket}</EylemEtiketi>
        </Button>
      </form>

      {durum.basari ? (
        <p className={`text-xs font-medium ${DURUM_YAZISI.olumlu}`} role="status">
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
