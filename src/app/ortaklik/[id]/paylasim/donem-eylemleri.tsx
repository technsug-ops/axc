"use client";

import { startTransition, useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, Undo2 } from "lucide-react";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { donemGeriAlEylem, donemKesinlestirEylem } from "@/app/ortaklik/eylemler";
import { OnayliEylem } from "@/app/ortaklik/onayli-eylem";

/** K347 · 4b — ayı kesinleştir (onaylı). İkon tarayıcı tarafında seçilir. */
export function DonemKesinlestir({ projeId, ay }: { projeId: string; ay: string }) {
  const t = useTranslations("Ortaklik");
  return <OnayliEylem eylem={donemKesinlestirEylem} alanlar={{ projeId, ay }} ikon={Lock} etiket={t("kesinlestir")}
    baslik={t("kesinlestirBaslik", { ay })} aciklama={t("kesinlestirNotu")} onayEtiketi={t("kesinlestir")} yikici={false} satirDugmesi={false} />;
}

/** Son kesin ayı GEREKÇEYLE geri al — gerekçe boşken onay düğmesi kapalı ve nedeni yazar. */
export function DonemGeriAl({ donemId, ay }: { donemId: string; ay: string }) {
  const t = useTranslations("Ortaklik");
  const ortak = useTranslations("Ortak");
  const [acik, setAcik] = useState(false);
  const [gerekce, setGerekce] = useState("");
  const [sonuc, action, bekliyor] = useActionState(donemGeriAlEylem, { tamam: false });
  const [sonSonuc, setSonSonuc] = useState(sonuc);
  if (sonSonuc !== sonuc) { setSonSonuc(sonuc); if (sonuc.tamam) setAcik(false); }
  const yeterli = gerekce.trim().length >= 5;
  return <div className="space-y-1">
    <AlertDialog open={acik} onOpenChange={setAcik}>
      <AlertDialogTrigger asChild><Button type="button" variant="outline" className="min-h-11"><Undo2 />{t("geriAl")}</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("geriAlBaslik", { ay })}</AlertDialogTitle>
          <AlertDialogDescription>{t("geriAlNotu")}</AlertDialogDescription>
        </AlertDialogHeader>
        <label className="block space-y-1 text-sm">{t("geriAlGerekce")}<Textarea value={gerekce} onChange={(e) => setGerekce(e.target.value)} maxLength={1000} /></label>
        {!yeterli ? <p className="text-muted-foreground text-xs">{t("GERI_GEREKCE")}</p> : null}
        {sonuc.hata ? <p className="text-destructive text-sm font-medium" role="alert">{sonuc.hata}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={bekliyor || !yeterli} onClick={() => {
            const veri = new FormData(); veri.set("donemId", donemId); veri.set("gerekce", gerekce);
            startTransition(() => action(veri));
          }}><Undo2 />{bekliyor ? ortak("kaydediliyor") : t("geriAl")}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
