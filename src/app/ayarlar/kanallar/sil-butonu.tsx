"use client";

import { useActionState } from "react";
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

import { kanalHesabiSil, type KanalHesabiDurumu } from "./actions";

/**
 * Kanal hesabı silme (Kullanıcı Kolaylığı #1, #6).
 *
 * KAYDI OLAN HESAPTA DÜĞME KAYBOLMAZ, PASİFLEŞİR ve NEDENİ başlıkta yazar.
 * Kaybolan düğme "burada böyle bir şey yok" der; pasif düğme "var ama şu
 * yüzden olmaz" der — ikincisi doğrudur.
 */
export function HesapSilButonu({
  hesapId,
  ad,
  kayitSayisi,
}: {
  hesapId: string;
  ad: string;
  /** Hesaba bağlı toplam kayıt. Sıfırdan büyükse silinemez. */
  kayitSayisi: number;
}) {
  const t = useTranslations("KanalHesabi");
  const ortak = useTranslations("Ortak");

  const [durum, formAction, bekliyor] = useActionState<
    KanalHesabiDurumu,
    FormData
  >(kanalHesabiSil, {});

  if (kayitSayisi > 0) {
    return (
      <Button variant="outline" size="sm" disabled title={t("silNotu")}>
        <Trash2 />
        {t("sil")}
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Trash2 />
            {t("sil")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("silBaslik")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("silAciklama", { ad })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {durum.hatalar?.length ? (
            <div
              role="alert"
              className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
            >
              {durum.hatalar.join(" ")}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
            <form action={formAction}>
              <input type="hidden" name="id" value={hesapId} />
              <Button type="submit" variant="destructive" disabled={bekliyor}>
                {bekliyor ? t("siliniyor") : t("sil")}
              </Button>
            </form>
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
