"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { odemeKaydetEylem, odemeTersleEylem } from "@/app/ortaklik/eylemler";
import { DURUM_KUTUSU } from "@/lib/renkler";
import { OnayliEylem } from "@/app/ortaklik/onayli-eylem";

const SECIM = "min-h-11 w-full rounded-md border bg-background px-3 text-sm";

/**
 * K347 · 4b — ortağa ödeme. «Gider olarak da kaydet» her ödemede seçilir (kullanıcı kararı):
 * dış ortağa ödeme firmanın gideridir, kendinize ödeme değildir. Ödeme günü «tamamen yeniden
 * yatırım» dönemine düşüyorsa ONAY kutusu çıkar; sunucu aynı kuralı yeniden sorar.
 */
export function OdemeFormu({ projeId, ortaklar, kategoriler, giderYetkisi, surumler, bugun }: {
  projeId: string;
  ortaklar: { id: string; ad: string }[];
  kategoriler: { id: string; ad: string }[];
  giderYetkisi: boolean;
  /** Geçerlilik ayı ("YYYY-AA") + kâr kullanımı — ödeme ayının dönemini anında göstermek için. */
  surumler: { ay: string; karKullanimi: string }[];
  bugun: string;
}) {
  const t = useTranslations("Ortaklik");
  const [sonuc, action, bekliyor] = useActionState(odemeKaydetEylem, { tamam: false });
  const [tarih, setTarih] = useState(bugun);
  const [gider, setGider] = useState(false);
  const surum = [...surumler].filter((s) => s.ay <= tarih.slice(0, 7)).sort((a, b) => b.ay.localeCompare(a.ay))[0];
  const yatirimDonemi = surum?.karKullanimi === "YENIDEN_YATIRIM";
  if (!ortaklar.length) return <p className="text-sm text-muted-foreground">{t("anlasmaOrtakYok")}</p>;
  return <form action={action} className="space-y-3 rounded-lg border p-4">
    <h2 className="font-semibold">{t("odemeBaslik")}</h2>
    <p className="text-sm text-muted-foreground">{t("odemeNotu")}</p>
    <input type="hidden" name="projeId" value={projeId} />
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block space-y-1 text-sm">{t("ortakSec")}<select name="katilimId" required className={SECIM}><option value="">{t("sec")}</option>{ortaklar.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}</select></label>
      <label className="block space-y-1 text-sm">{t("odemeTarihi")}<Input type="date" name="tarih" required value={tarih} onChange={(e) => setTarih(e.target.value)} /></label>
      <label className="block space-y-1 text-sm">{t("odemeTutari")}<Input name="tutar" inputMode="decimal" required placeholder={t("ornekUcret")} /></label>
      <label className="block space-y-1 text-sm">{t("anlasmaAciklama")}<Input name="aciklama" maxLength={1000} /></label>
    </div>
    {giderYetkisi ? <div className="space-y-2">
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="gider" className="size-5" checked={gider} onChange={(e) => setGider(e.target.checked)} />{t("odemeGiderMi")}</label>
      {gider ? <label className="block space-y-1 text-sm">{t("odemeKategori")}<select name="kategoriId" required className={SECIM}><option value="">{t("sec")}</option>{kategoriler.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}</select></label> : null}
      <p className="text-xs text-muted-foreground">{t("odemeGiderNotu")}</p>
    </div> : <p className="text-xs text-muted-foreground">{t("odemeGiderYetkisiYok")}</p>}
    {yatirimDonemi ? <label className={`flex items-start gap-2 rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}><input type="checkbox" name="yatirimOnayi" className="mt-0.5 size-5" required />{t("odemeYatirimUyari")}</label> : null}
    <Button disabled={bekliyor} className="min-h-11">{t(bekliyor ? "kaydediliyor" : "odemeKaydet")}</Button>
    <p role="status" aria-live="polite" className={sonuc.hata ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{sonuc.hata ?? (sonuc.tamam ? t("kaydedildi") : "")}</p>
  </form>;
}

/** Yanlış ödemenin ters kaydı — onaylı; ikon tarayıcı tarafında. */
export function OdemeTersle({ hareketId }: { hareketId: string }) {
  const t = useTranslations("Ortaklik");
  return <OnayliEylem eylem={odemeTersleEylem} alanlar={{ hareketId }} ikon={Undo2} etiket={t("odemeTersle")} baslik={t("odemeTersleBaslik")} aciklama={t("odemeTersleNotu")} onayEtiketi={t("odemeTersle")} />;
}
