"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { kapsamKuraliKaydet, kapsamKuraliSil, alimKalemiKapsamKaydet, type Sonuc } from "./eylemler";
import { OnayliEylem } from "./onayli-eylem";
import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { Button } from "@/components/ui/button";

const SECIM = "min-h-11 w-full rounded-md border bg-background px-3 text-sm";

function SonucMetni({ sonuc }: { sonuc: Sonuc }) {
  const t = useTranslations("Ortaklik");
  return <p role="status" aria-live="polite" className={sonuc.hata ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{sonuc.hata ?? (sonuc.tamam ? t("kaydedildi") : "")}</p>;
}

/** Kod kutusu USB okuyucu (Enter) ve kamerayı destekler (İlke #7); SKU · Firma SKU · barkod üçü de çözülür. */
export function KapsamKuralFormu({ projeler }: { projeler: { id: string; ad: string }[] }) {
  const t = useTranslations("Ortaklik");
  const ortak = useTranslations("Ortak");
  const [sonuc, action, bekliyor] = useActionState(kapsamKuraliKaydet, { tamam: false });
  const [kod, setKod] = useState("");
  const [sonSonuc, setSonSonuc] = useState(sonuc);
  if (sonSonuc !== sonuc) {
    setSonSonuc(sonuc);
    if (sonuc.tamam) setKod("");
  }
  return <form action={action} className="space-y-3 rounded-lg border p-4">
    <h2 className="font-semibold">{t("kapsamKurali")}</h2><p className="text-sm text-muted-foreground">{t("kuralNotu")}</p>
    <label className="block space-y-1 text-sm">{t("projeSec")}<select className={SECIM} name="projeId" required><option value="">{t("sec")}</option>{projeler.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}</select></label>
    <div className="space-y-1 text-sm"><span>{t("urunKodu")}</span>
      <input type="hidden" name="kod" value={kod} />
      <BarkodGirisi value={kod} onChange={setKod} placeholder={t("urunKoduIpucu")} kameraBasligi={ortak("barkodKamera")} />
    </div>
    <Button disabled={bekliyor || !projeler.length || !kod.trim()}>{t(bekliyor ? "kaydediliyor" : "kaydet")}</Button><SonucMetni sonuc={sonuc} />
  </form>;
}

export function KapsamKuralSil({ id, sku }: { id: string; sku: string }) {
  const t = useTranslations("Ortaklik");
  return <OnayliEylem eylem={kapsamKuraliSil} alanlar={{ id }} ikon={Trash2} etiket={t("kuraliSil")} baslik={t("kuraliSilBaslik", { sku })} aciklama={t("kuralSilOnay")} onayEtiketi={t("kuraliSil")} />;
}

export function AlimKapsamFormu({ kalemId, projeId, projeler }: { kalemId: string; projeId: string | null; projeler: { id: string; ad: string }[] }) {
  const t = useTranslations("Ortaklik");
  const [sonuc, action, bekliyor] = useActionState(alimKalemiKapsamKaydet, { tamam: false });
  return <form action={action} className="flex flex-wrap items-end gap-2"><input type="hidden" name="kalemId" value={kalemId} />
    <label className="block min-w-0 flex-1 space-y-1 text-sm">{t("kalemKapsami")}<select className={SECIM} name="projeId" defaultValue={projeId ?? ""}><option value="">{t("projeDisi")}</option>{projeler.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}</select></label>
    <Button disabled={bekliyor} className="min-h-11">{t(bekliyor ? "kaydediliyor" : "kaydet")}</Button>
    <div className="basis-full"><SonucMetni sonuc={sonuc} /></div>
  </form>;
}
