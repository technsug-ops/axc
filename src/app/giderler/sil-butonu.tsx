"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";

import { giderSil, type GiderDurumu } from "./actions";

/**
 * Gider silme (Kullanıcı Kolaylığı İlkeleri #1, #5, #6).
 *
 * Silme geri alınamaz VE dönem raporundaki rakamı değiştirir, bu yüzden
 * onay diyaloğu zorunludur. Diyalogda hangi kaydın silineceği tutarıyla
 * birlikte yazar — "hangisini siliyorum?" tereddüdü kalmasın.
 */
export function SilButonu({
  giderId,
  aciklama,
  tutar,
}: {
  giderId: string;
  aciklama: string;
  tutar: string;
}) {
  const t = useTranslations("Gider");
  const ortak = useTranslations("Ortak");

  const [acik, setAcik] = useState(false);
  const [durum, formAction, bekliyor] = useActionState<GiderDurumu, FormData>(
    giderSil,
    {},
  );

  // Silme başarılıysa diyalog kapanır; liste zaten tazelenmiş olur.
  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari) setAcik(false);
  }

  return (
    <div className="space-y-1">
      <AlertDialog open={acik} onOpenChange={setAcik}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Trash2 />
            {ortak("sil")}
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("silBaslik")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("silAciklama", { aciklama, tutar })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
            <div>
              <Button
                type="button"
                variant="destructive"
                disabled={bekliyor}
                onClick={() => {
                  const veri = new FormData();
                  veri.set("id", giderId);
                  // GEÇİŞ İÇİNDE: dışarıda çağrılınca React "bekliyor"
                  // durumunu güncellemiyor ve konsola uyarı düşüyor.
                  startTransition(() => formAction(veri));
                }}
              >
                <Trash2 />
                {bekliyor ? ortak("kaydediliyor") : t("silOnayla")}
              </Button>
            </div>
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
