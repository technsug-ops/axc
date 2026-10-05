"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DURUM_YAZISI } from "@/lib/renkler";

import { firmaAdiDegistir, type FirmaAdiDurumu } from "../actions";

/** Firma adı — veridir, süper admin değiştirir; kod değişmez (girişte yazılıyor). */
export function FirmaAdiFormu({ firmaId, ad }: { firmaId: string; ad: string }) {
  const t = useTranslations("Yonetim");
  const [durum, eylem, bekliyor] = useActionState<FirmaAdiDurumu, FormData>(firmaAdiDegistir, {});
  return (
    <form action={eylem} className="space-y-2">
      <input type="hidden" name="firmaId" value={firmaId} />
      <Label htmlFor="firma-adi">{t("firmaAdi")}</Label>
      <div className="flex flex-wrap gap-2">
        <Input id="firma-adi" name="ad" defaultValue={ad} required className="min-h-11 max-w-sm" />
        <Button type="submit" variant="outline" className="min-h-11" disabled={bekliyor}>
          <Save />
          {bekliyor ? t("kaydediliyor") : t("kaydet")}
        </Button>
      </div>
      {durum.tamam ? (
        <p role="status" className={`text-sm ${DURUM_YAZISI.olumlu}`}>
          {durum.tamam}
        </p>
      ) : null}
      <HataOzeti hatalar={durum.hatalar} baslik={t("kaydedilemedi")} />
    </form>
  );
}
