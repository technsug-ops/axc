"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formGonderimi } from "@/lib/form-gonderimi";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

import { kanalHesabiMagazaAdiKaydet, type MagazaAdiDurumu } from "./actions";

/**
 * MAĞAZA ADI — ilan linkindeki `?magaza=` (K320, kullanıcı kararı 09.10.2026).
 * Satış hesabı başına bir kutu. Ad firma VERİSİDİR, koda yazılmaz. N11'de kanalın
 * kendi cevabından kendiliğinden dolar; Hepsiburada'nın ucu vermediği için
 * buradan yazılır. Boş bırakmak bilerek bir seçimdir: link mağaza belirtmez.
 */
export function MagazaAdiFormu({
  hesap,
}: {
  hesap: { id: string; etiket: string; magazaAdi: string | null };
}) {
  const t = useTranslations("MagazaAdi");
  const [durum, formAction, bekliyor] = useActionState<MagazaAdiDurumu, FormData>(kanalHesabiMagazaAdiKaydet, {});
  const kimlik = `magaza-${hesap.id}`;

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-2">
      <input type="hidden" name="id" value={hesap.id} />
      <Label htmlFor={kimlik}>{hesap.etiket}</Label>
      <div className="flex gap-2">
        <Input
          id={kimlik}
          name="magazaAdi"
          defaultValue={hesap.magazaAdi ?? ""}
          placeholder={t("ipucu")}
          autoComplete="off"
          className="h-11 md:h-9"
        />
        <Button type="submit" disabled={bekliyor} className="h-11 shrink-0 md:h-9">
          {t("kaydet")}
        </Button>
      </div>
      {durum.hata ? (
        <p role="alert" className={`rounded-lg p-2 text-sm ${DURUM_KUTUSU.olumsuz} ${DURUM_YAZISI.olumsuz}`}>{durum.hata}</p>
      ) : null}
      {durum.basari ? (
        <p role="status" className={`rounded-lg p-2 text-sm ${DURUM_KUTUSU.olumlu} ${DURUM_YAZISI.olumlu}`}>{durum.basari}</p>
      ) : null}
    </form>
  );
}
