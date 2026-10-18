"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBicim } from "@/lib/bicim-istemci";

export type TahsisProjesi = { id: string; ad: string };
export type TahsisBaslangici = { kip: "yok" | "tek" | "cok"; satirlar: { projeId: string; pay: string }[] };

const SECIM = "min-h-11 w-full rounded-md border bg-background px-3 text-sm";

/**
 * K347 · 3b — giderin ortaklık projesine düşen payı. Kullanıcı kararı 18.10.2026:
 * «ikisi de olsun ama seçebileyim» → Yok · Tek proje + % · Birden çok projeye böl.
 * ⛔ `tahsisDuzenlenebilir=1` YALNIZ bu bölüm çizildiğinde gider; sunucu onu görmezse
 * var olan tahsise dokunmaz (izni olmayan kullanıcı gideri kaydedince tahsis silinmez).
 */
export function TahsisBolumu({ projeler, baslangic }: { projeler: TahsisProjesi[]; baslangic?: TahsisBaslangici }) {
  const t = useTranslations("Ortaklik");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();
  const [kip, setKip] = useState<TahsisBaslangici["kip"]>(baslangic?.kip ?? "yok");
  const [satirlar, setSatirlar] = useState(
    baslangic?.satirlar.length ? baslangic.satirlar : [{ projeId: "", pay: "" }, { projeId: "", pay: "" }],
  );
  const gorunen = kip === "tek" ? satirlar.slice(0, 1) : satirlar;
  const toplam = gorunen.reduce((t2, s) => t2 + (Number(s.pay.replace(",", ".")) || 0), 0);
  const degistir = (i: number, alan: "projeId" | "pay", deger: string) =>
    setSatirlar((eski) => eski.map((s, j) => (j === i ? { ...s, [alan]: deger } : s)));

  return (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">{t("tahsisBaslik")}</legend>
      <input type="hidden" name="tahsisDuzenlenebilir" value="1" />
      <input type="hidden" name="tahsisKipi" value={kip} />
      <p className="text-muted-foreground text-sm">{t("tahsisNotu")}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("tahsisBaslik")}>
        {(["yok", "tek", "cok"] as const).map((k) => (
          <Button key={k} type="button" role="radio" aria-checked={kip === k} variant={kip === k ? "default" : "outline"} className="min-h-11" onClick={() => setKip(k)}>
            {t(k === "yok" ? "tahsisYok" : k === "tek" ? "tahsisTek" : "tahsisCok")}
          </Button>
        ))}
      </div>
      {kip !== "yok" && !projeler.length ? <p className="text-sm">{t("tahsisProjeYok")}</p> : null}
      {kip !== "yok" && projeler.length ? (
        <div className="space-y-2">
          {gorunen.map((s, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <label className="block min-w-0 flex-1 space-y-1 text-sm">
                {t("projeSec")}
                <select className={SECIM} name="tahsisProje" value={s.projeId} onChange={(e) => degistir(i, "projeId", e.target.value)}>
                  <option value="">{t("sec")}</option>
                  {projeler.map((p) => <option key={p.id} value={p.id}>{p.ad}</option>)}
                </select>
              </label>
              <label className="block w-28 space-y-1 text-sm">
                {t("tahsisPay")}
                <Input name="tahsisPay" inputMode="decimal" placeholder={t("tahsisPayIpucu")} value={s.pay} onChange={(e) => degistir(i, "pay", e.target.value)} />
              </label>
              {kip === "cok" && satirlar.length > 2 ? (
                <Button type="button" variant="outline" className="min-h-11 min-w-11" aria-label={ortak("kaldir")} title={ortak("kaldir")}
                  onClick={() => setSatirlar((eski) => eski.filter((_, j) => j !== i))}><Trash2 /></Button>
              ) : null}
            </div>
          ))}
          {kip === "cok" ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setSatirlar((eski) => [...eski, { projeId: "", pay: "" }])}>
              <Plus />{t("tahsisSatirEkle")}
            </Button>
          ) : null}
          <p className={toplam > 100 ? "text-destructive text-sm font-medium" : "text-muted-foreground text-sm"} role="status">
            {t("tahsisToplam", { toplam: bicim.yuzde(toplam, 2) })}
          </p>
        </div>
      ) : null}
    </fieldset>
  );
}
