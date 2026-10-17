"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link2, Unlink } from "lucide-react";
import { finansmanKaynakBagla, finansmanBagiCoz } from "./eylemler";
import { OnayliEylem } from "./onayli-eylem";

const SECIM = "min-h-11 w-full rounded-md border bg-background px-3";

/** Bağ kaynağın TÜM hareketlerini kapsar; bu yüzden seçim onay diyaloğuyla teyit edilir (İlke #6). */
export function FinansmanBagFormu({ katilimlar, kaynaklar }: {
  katilimlar: { id: string; ad: string }[];
  kaynaklar: { id: string; ad: string }[];
}) {
  const t = useTranslations("Ortaklik");
  const [katilimId, setKatilimId] = useState("");
  const [finansmanId, setFinansmanId] = useState("");
  const katilimAdi = katilimlar.find(k => k.id === katilimId)?.ad ?? "";
  const kaynakAdi = kaynaklar.find(k => k.id === finansmanId)?.ad ?? "";
  return <div className="space-y-3 rounded-lg border p-4">
    <h2 className="font-semibold">{t("finansmanBagi")}</h2>
    <p className="text-sm text-muted-foreground">{t("finansmanBagNotu")}</p>
    <label className="block space-y-1 text-sm">{t("katilimSec")}<select value={katilimId} onChange={e => setKatilimId(e.target.value)} className={SECIM}><option value="">{t("sec")}</option>{katilimlar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}</select></label>
    <label className="block space-y-1 text-sm">{t("kaynakSec")}<select value={finansmanId} onChange={e => setFinansmanId(e.target.value)} className={SECIM}><option value="">{t("sec")}</option>{kaynaklar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}</select></label>
    {!kaynaklar.length && <p className="text-sm text-muted-foreground">{t("bagKaynakYok")}</p>}
    {!katilimlar.length && <p className="text-sm text-muted-foreground">{t("bagKatilimYok")}</p>}
    <OnayliEylem eylem={finansmanKaynakBagla} alanlar={{ katilimId, finansmanId }} ikon={Link2} etiket={t("bagla")}
      baslik={t("baglaBaslik")} aciklama={t("bagOnayi", { kaynak: kaynakAdi, katilim: katilimAdi })} onayEtiketi={t("bagla")}
      yikici={false} satirDugmesi={false} disabled={!katilimId || !finansmanId} />
  </div>;
}

export function FinansmanBagiCoz({ finansmanId, kaynak }: { finansmanId: string; kaynak: string }) {
  const t = useTranslations("Ortaklik");
  return <OnayliEylem eylem={finansmanBagiCoz} alanlar={{ finansmanId }} ikon={Unlink} etiket={t("baguCoz")}
    baslik={t("baguCozBaslik", { kaynak })} aciklama={t("baguCozNotu")} onayEtiketi={t("baguCoz")} />;
}
