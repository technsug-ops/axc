"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Save } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DURUM_YAZISI } from "@/lib/renkler";

import { paketBilgisiEylemi, yeniPaketEylemi, type PaketEylemDurumu } from "./actions";

const SECIM_SINIFI = "border-input bg-background min-h-11 w-full rounded-md border px-3 text-sm";

/**
 * Paketin adı, açıklaması ve ÖNERİLEN fiyatı (abonelik formuna öneri; tutar
 * firma başına elle kalır — 06.10 kararı). `paket` null → yeni paket formu.
 */
export function PaketBilgisiFormu({
  paket,
}: {
  paket: { id: string; ad: string; aciklama: string | null; tutar: string; paraBirimi: string; donem: string } | null;
}) {
  const t = useTranslations("Yonetim");
  const [durum, eylem, bekliyor] = useActionState<PaketEylemDurumu, FormData>(paket ? paketBilgisiEylemi : yeniPaketEylemi, {});
  const k = paket?.id ?? "yeni";
  return (
    <form action={eylem} className="space-y-3 rounded-lg border p-3">
      {paket ? <input type="hidden" name="paketId" value={paket.id} /> : null}
      <div className="space-y-1">
        <Label htmlFor={`paket-ad-${k}`}>{t("paketAdi")}</Label>
        <Input id={`paket-ad-${k}`} name="ad" required defaultValue={paket?.ad ?? ""} placeholder={t("paketAdiIpucu")} className="min-h-11" />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`paket-aciklama-${k}`}>{t("aciklamaEtiketi")}</Label>
        <Textarea id={`paket-aciklama-${k}`} name="aciklama" defaultValue={paket?.aciklama ?? ""} maxLength={500} placeholder={t("paketAciklamaIpucu")} />
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem]">
        <div className="space-y-1">
          <Label htmlFor={`paket-tutar-${k}`}>{t("onerilenTutarEtiketi")}</Label>
          <Input id={`paket-tutar-${k}`} name="tutar" inputMode="decimal" defaultValue={paket?.tutar ?? ""} placeholder={t("tutarIpucu")} className="min-h-11" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`paket-para-${k}`}>{t("paraBirimiEtiketi")}</Label>
          <select id={`paket-para-${k}`} name="paraBirimi" defaultValue={paket?.paraBirimi ?? "TRY"} className={SECIM_SINIFI}>
            <option value="TRY">TRY</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`paket-donem-${k}`}>{t("donemEtiketi")}</Label>
          <select id={`paket-donem-${k}`} name="donem" defaultValue={paket?.donem ?? "AYLIK"} className={SECIM_SINIFI}>
            <option value="AYLIK">{t("donemAYLIK")}</option>
            <option value="YILLIK">{t("donemYILLIK")}</option>
          </select>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{t("onerilenFiyatNotu")}</p>
      {paket ? null : (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="firmayaOzel" className="size-5" />
          {t("firmayaOzelSecenek")}
        </label>
      )}
      <Button type="submit" className="min-h-11" disabled={bekliyor}>
        {paket ? <Save /> : <Plus />}
        {paket ? t("paketiKaydet") : t("paketAc")}
      </Button>
      {durum.tamam ? <p role="status" className={`text-sm ${DURUM_YAZISI.olumlu}`}>{durum.tamam}</p> : null}
      <HataOzeti hatalar={durum.hatalar} baslik={t("kaydedilemedi")} />
    </form>
  );
}
