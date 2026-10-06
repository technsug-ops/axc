"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DURUM_YAZISI } from "@/lib/renkler";

import { firmaSinirlariEylemi } from "./firmalar/actions";
import { paketSinirlariEylemi } from "./paketler/actions";

type Durum = { hatalar?: string[]; tamam?: string };
const ALANLAR = ["kanalHesabi", "kullanici", "aylikSiparis"] as const;

/**
 * ADET SINIRLARI FORMU — paket (hazır paket) ya da firma (Individuel). Ortak
 * bileşen (İlke #10). Boş alan = sınırsız; yer tutucu «örn. 3» (İlke #11).
 */
export function SinirFormu({ hedef, baslangic }: { hedef: { tur: "paket" | "firma"; id: string }; baslangic: Record<(typeof ALANLAR)[number], number | null> }) {
  const t = useTranslations("Yonetim");
  const [durum, eylem, bekliyor] = useActionState<Durum, FormData>(hedef.tur === "paket" ? paketSinirlariEylemi : firmaSinirlariEylemi, {});
  return (
    <form action={eylem} className="space-y-3 rounded-lg border p-3">
      <input type="hidden" name="hedefId" value={hedef.id} />
      <div className="grid gap-2 sm:grid-cols-3">
        {ALANLAR.map((a) => (
          <div key={a} className="space-y-1">
            <Label htmlFor={`sinir-${hedef.id}-${a}`}>{t(`sinirEtiketi_${a}`)}</Label>
            <Input
              id={`sinir-${hedef.id}-${a}`}
              name={a}
              inputMode="numeric"
              defaultValue={baslangic[a] === null ? "" : String(baslangic[a])}
              placeholder={t(`sinirIpucu_${a}`)}
              className="min-h-11"
            />
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">{t("sinirNotu")}</p>
      <Button type="submit" variant="outline" className="min-h-11" disabled={bekliyor}>
        <Save />
        {t("sinirlariKaydet")}
      </Button>
      {durum.tamam ? <p role="status" className={`text-sm ${DURUM_YAZISI.olumlu}`}>{durum.tamam}</p> : null}
      <HataOzeti hatalar={durum.hatalar} baslik={t("kaydedilemedi")} />
    </form>
  );
}
