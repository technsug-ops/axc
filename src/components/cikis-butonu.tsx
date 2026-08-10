"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";

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

import { cikisYap } from "@/app/giris/actions";

/**
 * Çıkış (Kullanıcı Kolaylığı İlkeleri #1, #6).
 *
 * Görünür bir düğme — gizli menüye saklanmaz. Onay ister: depoda telefonla
 * çalışırken yanlışlıkla basıp oturumu kapatmak sinir bozucu olurdu.
 */
export function CikisButonu({ eposta }: { eposta: string }) {
  const t = useTranslations("Giris");
  const ortak = useTranslations("Ortak");
  const [acik, setAcik] = useState(false);

  return (
    <AlertDialog open={acik} onOpenChange={setAcik}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="justify-start">
          <LogOut />
          <span className="truncate">{eposta}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("cikisOnayBaslik")}</AlertDialogTitle>
          <AlertDialogDescription>{t("cikisOnayMetin")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
          <form action={cikisYap}>
            <Button type="submit" variant="destructive">
              <LogOut />
              {t("cikis")}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
