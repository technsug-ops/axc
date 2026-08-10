"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Ban } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EYLEM_SINIFI, EylemEtiketi } from "@/components/satir-eylemi";
import { Button } from "@/components/ui/button";

import { alimIptalEt, type AlimDurumu } from "./actions";

/**
 * Alım iptal düğmesi (Kullanıcı Kolaylığı İlkeleri #1, #5, #6).
 *
 * Mal kabul yapılmışsa düğme KAYBOLMAZ — pasifleşir ve nedenini yazar.
 * Kaybolan düğme "acaba nerede?" sorusu doğurur; pasif düğme cevabı verir.
 */
export function AlimIptalButonu({
  alimId,
  kod,
  malKabulVar,
}: {
  alimId: string;
  kod: string;
  malKabulVar: boolean;
}) {
  const t = useTranslations("Alim");
  const ortak = useTranslations("Ortak");

  const [acik, setAcik] = useState(false);
  const [durum, formAction, bekliyor] = useActionState<AlimDurumu, FormData>(
    alimIptalEt,
    {},
  );

  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (!durum.hatalar?.length) setAcik(false);
  }

  if (malKabulVar) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        title={t("iptalEdilemez")}
        aria-label={t("iptalEt")}
        className={EYLEM_SINIFI}
      >
        <Ban />
        <EylemEtiketi>{t("iptalEt")}</EylemEtiketi>
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <AlertDialog open={acik} onOpenChange={setAcik}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            title={t("iptalEt")}
            aria-label={t("iptalEt")}
            className={EYLEM_SINIFI}
          >
            <Ban />
            <EylemEtiketi>{t("iptalEt")}</EylemEtiketi>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("iptalBaslik")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("iptalAciklama", { kod })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={bekliyor}
              onClick={() => {
                const veri = new FormData();
                veri.set("id", alimId);
                startTransition(() => formAction(veri));
              }}
            >
              <Ban />
              {bekliyor ? ortak("kaydediliyor") : t("iptalOnayla")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {durum.hatalar?.length ? (
        <p className="text-destructive text-xs font-medium" role="alert">
          {durum.hatalar.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
