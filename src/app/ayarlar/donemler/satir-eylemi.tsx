"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, LockOpen } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DURUM_YAZISI } from "@/lib/renkler";

import { donemiAc, donemiKapat, type DonemDurumuSonucu } from "./eylemler";

/**
 * ============================================================================
 *  DÖNEM SATIRI EYLEMİ — KAPAT / YENİDEN AÇ (K108)
 * ----------------------------------------------------------------------------
 *  ⚠ YIKICI EYLEM = ONAY (İlke #6). Kapatmak geri alınabilir ama etkisi
 *  anlıktır: o dönemin HER kaydı ısrar ister. Diyalog neyin olacağını
 *  YAZIYOR — "emin misiniz" demek yetmez.
 *
 *  ⚠ VE YENİDEN AÇMA DA ONAY İSTER: kapanmış bir dönemi açmak, o dönemin
 *  korumasını kaldırmaktır. İki yön de bir karardır.
 * ============================================================================
 */
export function DonemSatiriEylemi({
  yil,
  ay,
  durum,
  etiket,
}: {
  yil: number;
  ay: number;
  durum: "ACIK" | "KAPALI";
  /** "Temmuz 2026" — diyalogda hangi dönem olduğu YAZILI. */
  etiket: string;
}) {
  const t = useTranslations("Donem");
  const ortak = useTranslations("Ortak");
  const [acik, setAcik] = useState(false);
  const [not, setNot] = useState("");

  const [durumSonucu, eylem, bekliyor] = useActionState<
    DonemDurumuSonucu,
    FormData
  >(durum === "KAPALI" ? donemiAc : donemiKapat, {});

  return (
    <div className="space-y-1">
      <AlertDialog open={acik} onOpenChange={setAcik}>
        <AlertDialogTrigger asChild>
          {/* ⚠ 44 px dokunma hedefi (İlke #8). */}
          <Button variant="secondary" className="h-11 md:h-10">
            {durum === "KAPALI" ? (
              <>
                <LockOpen />
                {t("yenidenAc")}
              </>
            ) : (
              <>
                <Lock />
                {t("kapat")}
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <form action={eylem}>
            <input type="hidden" name="yil" value={yil} />
            <input type="hidden" name="ay" value={ay} />
            <AlertDialogHeader>
              <AlertDialogTitle>
                {durum === "KAPALI"
                  ? t("acOnayBaslik", { donem: etiket })
                  : t("kapatOnayBaslik", { donem: etiket })}
              </AlertDialogTitle>
              {/*
                ⚠ NE OLACAĞI YAZILI, "emin misiniz" DEĞİL. Kapatınca o
                dönemin her kaydı ısrar isteyecek; açınca koruma kalkacak.
                Kullanıcı sonucu bilmeden karar veremez.
              */}
              <AlertDialogDescription>
                {durum === "KAPALI" ? t("acOnayMetni") : t("kapatOnayMetni")}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {durum === "ACIK" ? (
              <div className="space-y-1 py-2">
                <Label htmlFor={`donem-not-${yil}-${ay}`}>
                  {t("kapanisNotu")}
                </Label>
                <Input
                  id={`donem-not-${yil}-${ay}`}
                  name="not"
                  value={not}
                  onChange={(e) => setNot(e.target.value)}
                  placeholder={t("kapanisNotuIpucu")}
                  className="h-11 md:h-10"
                />
              </div>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel type="button">
                {ortak("vazgec")}
              </AlertDialogCancel>
              <AlertDialogAction type="submit" disabled={bekliyor}>
                {bekliyor ? ortak("kaydediliyor") : t("onayla")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* ⚠ SESSİZ BAŞARISIZLIK YASAK (İlke #5): sonuç her hâlde yazılır. */}
      {durumSonucu.hata ? (
        <p className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{durumSonucu.hata}</p>
      ) : null}
      {durumSonucu.basari ? (
        <p className={`text-xs ${DURUM_YAZISI.olumlu}`}>
          {durumSonucu.basari}
        </p>
      ) : null}
    </div>
  );
}
