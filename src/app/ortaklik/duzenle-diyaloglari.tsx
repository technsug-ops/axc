"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EYLEM_SINIFI, EylemEtiketi } from "@/components/satir-eylemi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adDuzenle, katilimDuzenle, ortakGirisiKaydet, type Sonuc } from "./eylemler";
import { KATKI_TURLERI } from "./katki";

function DuzenleKabi({ baslik, aciklama, eylem, children, tetik }: {
  /** Varsayılan tetik «Düzenle» (kalem). Başka bir eylem kendi simgesi ve adıyla açılır (İlke #10). */
  tetik?: { simge: React.ReactNode; etiket: string };
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
      <Button type="button" variant="outline" size="sm" title={tetik?.etiket ?? ortak("duzenle")} aria-label={tetik?.etiket ?? ortak("duzenle")} className={EYLEM_SINIFI}>{tetik?.simge ?? <Pencil />}<EylemEtiketi>{tetik?.etiket ?? ortak("duzenle")}</EylemEtiketi></Button>
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

/**
 * K347 · 5 — ortak kartının GİRİŞ HESABI. Kullanıcı Ayarlar → Kullanıcılar'da «Ortak» rolüyle
 * açılır, burada karta bağlanır. «Bağlı değil» seçimi bağı çözer (ortağın girişi kapanır).
 */
export function OrtakGirisi({ ortakId, mevcut, kullanicilar }: { ortakId: string; mevcut: string | null; kullanicilar: { id: string; ad: string }[] }) {
  const t = useTranslations("Ortaklik");
  return <DuzenleKabi eylem={ortakGirisiKaydet} tetik={{ simge: <KeyRound />, etiket: t("girisHesabi") }} baslik={t("girisHesabi")} aciklama={t("girisHesabiNotu")}>
    <input type="hidden" name="ortakId" value={ortakId} />
    <label className="block space-y-1 text-sm">{t("girisKullanici")}
      <select name="userId" defaultValue={mevcut ?? ""} className="min-h-11 w-full rounded-md border bg-background px-3">
        <option value="">{t("girisBagliDegil")}</option>
        {kullanicilar.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
      </select>
    </label>
  </DuzenleKabi>;
}
