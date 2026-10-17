"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EYLEM_SINIFI, EylemEtiketi } from "@/components/satir-eylemi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adDuzenle, katilimDuzenle, type Sonuc } from "./eylemler";
import { KATKI_TURLERI } from "./katki";

function DuzenleKabi({ baslik, aciklama, eylem, children }: {
  baslik: string;
  aciklama: string;
  eylem: (onceki: Sonuc, veri: FormData) => Promise<Sonuc>;
  children: React.ReactNode;
}) {
  const t = useTranslations("Ortaklik");
  const ortak = useTranslations("Ortak");
  const [acik, setAcik] = useState(false);
  const [sonuc, action, bekliyor] = useActionState(eylem, { tamam: false });
  const [sonSonuc, setSonSonuc] = useState(sonuc);
  if (sonSonuc !== sonuc) {
    setSonSonuc(sonuc);
    if (sonuc.tamam) setAcik(false);
  }
  return <Dialog open={acik} onOpenChange={setAcik}>
    <DialogTrigger asChild>
      <Button type="button" variant="outline" size="sm" title={ortak("duzenle")} aria-label={ortak("duzenle")} className={EYLEM_SINIFI}><Pencil /><EylemEtiketi>{ortak("duzenle")}</EylemEtiketi></Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>{baslik}</DialogTitle><DialogDescription>{aciklama}</DialogDescription></DialogHeader>
      <form action={action} className="space-y-3">
        {children}
        {sonuc.hata ? <p className="text-destructive text-sm font-medium" role="alert">{sonuc.hata}</p> : null}
        <Button disabled={bekliyor}>{bekliyor ? ortak("kaydediliyor") : t("kaydet")}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}

export function AdDuzenle({ tur, id, ad }: { tur: "proje" | "ortak"; id: string; ad: string }) {
  const t = useTranslations("Ortaklik");
  return <DuzenleKabi eylem={adDuzenle} baslik={t(tur === "proje" ? "projeDuzenle" : "ortakDuzenle")} aciklama={t(tur === "proje" ? "projeDuzenleNotu" : "ortakDuzenleNotu")}>
    <input type="hidden" name="tur" value={tur} /><input type="hidden" name="id" value={id} />
    <label className="block space-y-1 text-sm">{t("ad")}<Input name="ad" required maxLength={191} defaultValue={ad} /></label>
  </DuzenleKabi>;
}

export function KatilimDuzenle({ id, sorumluluk, katkilar }: { id: string; sorumluluk: string; katkilar: Record<(typeof KATKI_TURLERI)[number], boolean> }) {
  const t = useTranslations("Ortaklik");
  return <DuzenleKabi eylem={katilimDuzenle} baslik={t("katilimDuzenle")} aciklama={t("katilimDuzenleNotu")}>
    <input type="hidden" name="id" value={id} />
    <label className="block space-y-1 text-sm">{t("sorumluluk")}<Input name="sorumluluk" required maxLength={1000} defaultValue={sorumluluk} /></label>
    <fieldset><legend className="mb-2 text-sm">{t("katkilar")}</legend><div className="flex flex-wrap gap-3">{KATKI_TURLERI.map(k => <label key={k} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name={k} defaultChecked={katkilar[k]} className="size-5" />{t(k)}</label>)}</div></fieldset>
  </DuzenleKabi>;
}
