"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBicim } from "@/lib/bicim-istemci";
import { anlasmaKaydet, anlasmaSil } from "@/app/ortaklik/eylemler";
import { OnayliEylem } from "@/app/ortaklik/onayli-eylem";
import { formSayisi } from "@/lib/ortaklik/paylasim";

const SECIM = "min-h-11 w-full rounded-md border bg-background px-3 text-sm";

export type FormOrtagi = { katilimId: string; ad: string; sabitOran: string; emekUcreti: string; sorumlulukPayi: string };

/**
 * K347 · 4a — anlaşma sürümü formu. Son sürümün değerleriyle dolu açılır; değişiklik YENİ
 * geçerlilik ayıyla yeni sürüm olarak kaydedilir (geçmiş aylar eski şartla kalır).
 * Toplamlar anlık yazılır; kural sunucuda yeniden doğrulanır (`anlasmaDogrula`).
 */
export function AnlasmaFormu({ projeId, varsayilanAy, baslangic, ortaklar }: {
  projeId: string;
  varsayilanAy: string;
  baslangic: { kalanYontemi: string; karmaSermayeYuzdesi: string; zararYontemi: string; karKullanimi: string };
  ortaklar: FormOrtagi[];
}) {
  const t = useTranslations("Ortaklik");
  const bicim = useBicim();
  const [sonuc, action, bekliyor] = useActionState(anlasmaKaydet, { tamam: false });
  const [kalan, setKalan] = useState(baslangic.kalanYontemi);
  const [zarar, setZarar] = useState(baslangic.zararYontemi);
  const [degerler, setDegerler] = useState(ortaklar);
  const degistir = (i: number, alan: "sabitOran" | "emekUcreti" | "sorumlulukPayi", v: string) =>
    setDegerler((eski) => eski.map((o, j) => (j === i ? { ...o, [alan]: v } : o)));
  const toplam = (alan: "sabitOran" | "sorumlulukPayi") => degerler.reduce((t2, o) => t2 + (formSayisi(o[alan]) || 0), 0);
  const sabitGerekli = kalan === "SABIT" || kalan === "KARMA";

  if (!ortaklar.length) return <p className="text-sm text-muted-foreground">{t("anlasmaOrtakYok")}</p>;

  return <form action={action} className="space-y-4 rounded-lg border p-4">
    <h2 className="font-semibold">{t("anlasmaYeni")}</h2>
    <p className="text-sm text-muted-foreground">{t("anlasmaYeniNotu")}</p>
    <input type="hidden" name="projeId" value={projeId} />
    <div className="grid gap-3 md:grid-cols-2">
      <label className="block space-y-1 text-sm">{t("anlasmaGecerlilik")}<Input type="month" name="gecerlilikAyi" required defaultValue={varsayilanAy} /></label>
      <label className="block space-y-1 text-sm">{t("anlasmaKalan")}
        <select name="kalanYontemi" className={SECIM} value={kalan} onChange={(e) => setKalan(e.target.value)}>
          {(["SABIT", "SERMAYE", "KARMA"] as const).map((k) => <option key={k} value={k}>{t(`kalan_${k}`)}</option>)}
        </select>
      </label>
      {kalan === "KARMA" ? <label className="block space-y-1 text-sm">{t("anlasmaKarmaYuzde")}<Input name="karmaSermayeYuzdesi" inputMode="decimal" required placeholder={t("ornekYuzde")} defaultValue={baslangic.karmaSermayeYuzdesi} /></label> : null}
      <label className="block space-y-1 text-sm">{t("anlasmaZarar")}
        <select name="zararYontemi" className={SECIM} value={zarar} onChange={(e) => setZarar(e.target.value)}>
          {(["DEVREDER", "KAR_ORANI", "SORUMLULUK"] as const).map((k) => <option key={k} value={k}>{t(`zarar_${k}`)}</option>)}
        </select>
      </label>
      <label className="block space-y-1 text-sm">{t("anlasmaKarKullanimi")}
        <select name="karKullanimi" className={SECIM} defaultValue={baslangic.karKullanimi}>
          {(["DAGIT", "YENIDEN_YATIRIM"] as const).map((k) => <option key={k} value={k}>{t(`kullanim_${k}`)}</option>)}
        </select>
      </label>
      <label className="block space-y-1 text-sm md:col-span-2">{t("anlasmaAciklama")}<Input name="aciklama" maxLength={1000} /></label>
    </div>

    <div className="space-y-3">
      {degerler.map((o, i) => <fieldset key={o.katilimId} className="space-y-2 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">{o.ad}</legend>
        <input type="hidden" name="katilimId" value={o.katilimId} />
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block space-y-1 text-sm">{t("anlasmaSabitOran")}<Input name={`sabitOran_${o.katilimId}`} inputMode="decimal" placeholder={t("ornekYuzde")} value={o.sabitOran} onChange={(e) => degistir(i, "sabitOran", e.target.value)} /></label>
          <label className="block space-y-1 text-sm">{t("anlasmaEmekUcreti")}<Input name={`emekUcreti_${o.katilimId}`} inputMode="decimal" placeholder={t("ornekUcret")} value={o.emekUcreti} onChange={(e) => degistir(i, "emekUcreti", e.target.value)} /></label>
          <label className="block space-y-1 text-sm">{t("anlasmaSorumluluk")}<Input name={`sorumlulukPayi_${o.katilimId}`} inputMode="decimal" placeholder={t("ornekYuzde")} value={o.sorumlulukPayi} onChange={(e) => degistir(i, "sorumlulukPayi", e.target.value)} /></label>
        </div>
      </fieldset>)}
    </div>
    <div className="space-y-1 text-sm" role="status">
      {sabitGerekli ? <p className={Math.round(toplam("sabitOran") * 100) === 10000 ? "text-muted-foreground" : "text-destructive font-medium"}>{t("anlasmaSabitToplam", { toplam: bicim.yuzde(toplam("sabitOran"), 2) })}</p> : null}
      {zarar === "SORUMLULUK" ? <p className={Math.round(toplam("sorumlulukPayi") * 100) === 10000 ? "text-muted-foreground" : "text-destructive font-medium"}>{t("anlasmaSorumlulukToplam", { toplam: bicim.yuzde(toplam("sorumlulukPayi"), 2) })}</p> : null}
    </div>
    <Button disabled={bekliyor} className="min-h-11">{t(bekliyor ? "kaydediliyor" : "anlasmaKaydet")}</Button>
    <p role="status" aria-live="polite" className={sonuc.hata ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{sonuc.hata ?? (sonuc.tamam ? t("kaydedildi") : "")}</p>
  </form>;
}

/** Sürüm silme — ikon tarayıcı tarafında seçilir (sunucudan fonksiyon geçmez; 18.10 dersi). */
export function AnlasmaSil({ id, ay }: { id: string; ay: string }) {
  const t = useTranslations("Ortaklik");
  return <OnayliEylem eylem={anlasmaSil} alanlar={{ id }} ikon={Trash2} etiket={t("anlasmaSil")} baslik={t("anlasmaSilBaslik", { ay })} aciklama={t("anlasmaSilNotu")} onayEtiketi={t("anlasmaSil")} />;
}
