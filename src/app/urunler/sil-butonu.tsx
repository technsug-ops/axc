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

import { urunSil, type FormDurumu } from "./actions";

/**
 * Ürün silme (Kullanıcı Kolaylığı İlkeleri #1, #6).
 * Hem liste satırında hem ürün detayında kullanılır — her yerde aynı
 * görünsün diye tek bileşen (#10).
 */
export function SilButonu({
  urunId,
  urunAdi,
  boyut = "sm",
}: {
  urunId: string;
  urunAdi: string;
  boyut?: "sm" | "default";
}) {
  const t = useTranslations("UrunSil");
  const ortak = useTranslations("Ortak");

  const [durum, formAction, bekliyor] = useActionState<FormDurumu, FormData>(
    urunSil,
    {},
  );

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size={boyut}>
          <Trash2 />
          {t("dugme")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("baslik")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.rich("aciklama", {
              ad: urunAdi,
              kalin: (parcalar) => <strong>{parcalar}</strong>,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {durum.hatalar?.length ? (
          <div
            role="alert"
            className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
          >
            <ul className="list-inside list-disc space-y-1">
              {durum.hatalar.map((hata, i) => (
                <li key={i}>{hata}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="id" value={urunId} />
            <Button type="submit" variant="destructive" disabled={bekliyor}>
              {bekliyor ? t("siliniyor") : t("onayla")}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
