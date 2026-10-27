"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fiyatMetniCoz } from "@/lib/buybox-fiyat";
import { MALIYET_TERCIHLERI, type GenelKural } from "@/lib/buybox-kural";
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_YAZISI } from "@/lib/renkler";

import { buyboxGenelKuralKaydet, type KuralHatasi } from "./kural-eylemleri";

/**
 * ============================================================================
 *  BUYBOX FİYAT KURALI — GENEL AYAR PENCERESİ (K366)
 * ----------------------------------------------------------------------------
 *  Ayar kullanıldığı yerde: Buybox ekranının başlığındaki «Fiyat kuralı»
 *  düğmesi (menüde ayrı sayfa açılmadı). Üç alan: en az marj · adım · maliyet.
 *  Ürüne ayrı değeri olmayan her ürün bunu izler.
 * ============================================================================
 */
export function GenelKuralPenceresi({ genel }: { genel: GenelKural }) {
  const t = useTranslations("Buybox");
  const tk = useTranslations("KanalGonderim");
  const bicim = useBicim();
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [marjMetni, setMarjMetni] = useState(bicim.sayi(genel.minMarj, 2));
  const [adimMetni, setAdimMetni] = useState(bicim.sayi(genel.adim, 2));
  const [maliyet, setMaliyet] = useState<string>(genel.maliyet);
  const [kaydediliyor, kaydet] = useTransition();
  const [sonuc, setSonuc] = useState<{ tamam: true } | { tamam: false; kod: KuralHatasi | "SAYI" } | null>(null);

  const kapat = (a: boolean) => {
    if (kaydediliyor) return;
    setAcik(a);
    if (!a) {
      setMarjMetni(bicim.sayi(genel.minMarj, 2));
      setAdimMetni(bicim.sayi(genel.adim, 2));
      setMaliyet(genel.maliyet);
      setSonuc(null);
    }
  };

  const gonder = () => {
    const marjHam = marjMetni.trim().replace(/\s|%/g, "").replace(",", ".");
    const marj = marjHam === "" ? Number.NaN : Number(marjHam);
    const adim = fiyatMetniCoz(adimMetni);
    if (!Number.isFinite(marj) || adim === null || Number.isNaN(adim)) {
      setSonuc({ tamam: false, kod: "SAYI" });
      return;
    }
    kaydet(async () => {
      const s = await buyboxGenelKuralKaydet({ minMarj: marj, adim, maliyet });
      setSonuc(s);
      if (s.tamam) router.refresh();
    });
  };

  return (
    <Dialog open={acik} onOpenChange={kapat}>
      <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => setAcik(true)}>
        <SlidersHorizontal className="size-4" aria-hidden />
        {t("genelKuralDugme")}
      </Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("genelKuralBaslik")}</DialogTitle>
          <DialogDescription>{t("genelKuralNotu")}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-xs">
            <span className="font-medium">{t("alanMarj")}</span>
            <Input inputMode="decimal" value={marjMetni} onChange={(e) => { setMarjMetni(e.target.value); setSonuc(null); }} placeholder={t("marjIpucu")} className="h-11 tabular-nums md:h-9" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium">{t("alanAdim")}</span>
            <Input inputMode="decimal" value={adimMetni} onChange={(e) => { setAdimMetni(e.target.value); setSonuc(null); }} placeholder={t("adimIpucu")} className="h-11 tabular-nums md:h-9" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium">{t("alanMaliyet")}</span>
            <select value={maliyet} onChange={(e) => { setMaliyet(e.target.value); setSonuc(null); }} className="border-input bg-background h-11 w-full rounded-md border px-2 text-sm md:h-9">
              {MALIYET_TERCIHLERI.map((m) => (
                <option key={m} value={m}>{t(`maliyetTercihi_${m}`)}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-muted-foreground text-xs">{t("genelKuralModNotu")}</p>
        {sonuc?.tamam ? <p className={`text-sm ${DURUM_YAZISI.olumlu}`} role="status">{t("kuralKaydedildi")}</p> : null}
        {sonuc && !sonuc.tamam ? <p className={`text-sm ${DURUM_YAZISI.olumsuz}`} role="alert">{t(`kuralHata_${sonuc.kod}`)}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" className="h-11 md:h-9" disabled={kaydediliyor} onClick={() => kapat(false)}>{tk("kapat")}</Button>
          <Button type="button" className="h-11 md:h-9" disabled={kaydediliyor} onClick={gonder}>
            {kaydediliyor ? t("kuralKaydediliyor") : t("kuralKaydet")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
