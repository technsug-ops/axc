"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBicim } from "@/lib/bicim-istemci";
import type { HedefDonemi, HedefOlcutu } from "@/lib/hedef/hedef-karar";
import { hedefleriKaydet, type HedefSonucu } from "./eylemler";

export type FormHucresi = { olcut: HedefOlcutu; mevcut: number | null; gerceklesen: number };
export type FormDonemi = { donem: HedefDonemi; hucreler: FormHucresi[] };

/**
 * K349 — hedef formu. Her dönem bir kart (telefonda alt alta), her kartta ölçüt
 * kutuları. Kutu SAYI kutusudur (binlik ayırıcı tahmini yok — `hedefTutariOku`).
 * Boş kutu = hedef yok. Altında bu dönemin ŞU ANKİ rakamı ve hedefe oranı yazar.
 */
export function HedefFormu({ donemler }: { donemler: FormDonemi[] }) {
  const t = useTranslations("Hedef");
  const bicim = useBicim();
  const [sonuc, eylem, bekliyor] = useActionState<HedefSonucu, FormData>(hedefleriKaydet, { tamam: false });
  const deger = (olcut: HedefOlcutu, n: number) => (olcut === "SIPARIS" ? bicim.sayi(n) : bicim.para(n, "TRY"));
  return <form action={eylem} className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {donemler.map((d) => <fieldset key={d.donem} className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 font-semibold">{t(`donem_${d.donem}`)}</legend>
        {d.hucreler.map((h) => <label key={h.olcut} className="block space-y-1 text-sm">
          <span className="font-medium">{t(`olcut_${h.olcut}`)}</span>
          <Input
            name={`${h.olcut}_${d.donem}`}
            type="number"
            inputMode={h.olcut === "SIPARIS" ? "numeric" : "decimal"}
            min={0}
            step={h.olcut === "SIPARIS" ? 1 : 0.01}
            defaultValue={h.mevcut ?? ""}
            placeholder={t(h.olcut === "SIPARIS" ? "ornekAdet" : "ornekTutar")}
            className="min-h-11"
          />
          <span className="block text-muted-foreground">
            {h.mevcut
              ? t("simdikiOranli", { deger: deger(h.olcut, h.gerceklesen), oran: bicim.yuzde((h.gerceklesen / h.mevcut) * 100, 0) })
              : t("simdiki", { deger: deger(h.olcut, h.gerceklesen) })}
          </span>
        </label>)}
      </fieldset>)}
    </div>
    {sonuc.hata ? <p role="alert" className="text-destructive text-sm font-medium">{sonuc.hata}</p> : null}
    {sonuc.tamam && sonuc.mesaj ? <p role="status" className="text-sm font-medium">{sonuc.mesaj}</p> : null}
    <Button className="min-h-11" disabled={bekliyor}>{bekliyor ? t("kaydediliyor") : t("kaydet")}</Button>
  </form>;
}
