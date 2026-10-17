"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EYLEM_SINIFI, EylemEtiketi } from "@/components/satir-eylemi";
import { Button } from "@/components/ui/button";
import type { Sonuc } from "./eylemler";

/**
 * Ortaklık ekranlarının onaylı eylemi (İlke #6 · #10): silme, kural kaldırma,
 * finansman bağlama/çözme aynı diyalogla sorulur — alım iptal düğmesinin deseni.
 * Hata olursa diyalog açık kalır ve NEDENİ yazar (İlke #5).
 */
export function OnayliEylem({ eylem, alanlar, ikon: Ikon, etiket, baslik, aciklama, onayEtiketi, yikici = true, satirDugmesi = true, disabled = false }: {
  eylem: (onceki: Sonuc, veri: FormData) => Promise<Sonuc>;
  alanlar: Record<string, string>;
  ikon: LucideIcon;
  etiket: string;
  baslik: string;
  aciklama: string;
  onayEtiketi: string;
  yikici?: boolean;
  /** Satır eylemi (ikon, telefonda etiketli) ya da tam genişlik form düğmesi. */
  satirDugmesi?: boolean;
  disabled?: boolean;
}) {
  const ortak = useTranslations("Ortak");
  const [acik, setAcik] = useState(false);
  const [sonuc, action, bekliyor] = useActionState(eylem, { tamam: false });
  const [sonSonuc, setSonSonuc] = useState(sonuc);
  if (sonSonuc !== sonuc) {
    setSonSonuc(sonuc);
    if (sonuc.tamam) setAcik(false);
  }
  return <div className="space-y-1">
    <AlertDialog open={acik} onOpenChange={setAcik}>
      <AlertDialogTrigger asChild>
        {satirDugmesi
          ? <Button type="button" variant="outline" size="sm" title={etiket} aria-label={etiket} disabled={disabled} className={EYLEM_SINIFI}><Ikon /><EylemEtiketi>{etiket}</EylemEtiketi></Button>
          : <Button type="button" disabled={disabled}><Ikon />{etiket}</Button>}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{baslik}</AlertDialogTitle>
          <AlertDialogDescription>{aciklama}</AlertDialogDescription>
        </AlertDialogHeader>
        {sonuc.hata ? <p className="text-destructive text-sm font-medium" role="alert">{sonuc.hata}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
          <Button type="button" variant={yikici ? "destructive" : "default"} disabled={bekliyor} onClick={() => {
            const veri = new FormData();
            for (const [ad, deger] of Object.entries(alanlar)) veri.set(ad, deger);
            startTransition(() => action(veri));
          }}><Ikon />{bekliyor ? ortak("kaydediliyor") : onayEtiketi}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    {!acik && sonuc.hata ? <p className="text-destructive text-xs font-medium" role="alert">{sonuc.hata}</p> : null}
  </div>;
}
