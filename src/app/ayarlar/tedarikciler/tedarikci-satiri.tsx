"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, X } from "lucide-react";

import { DurumDegistirButonu } from "@/components/durum-degistir-butonu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formGonderimi } from "@/lib/form-gonderimi";

import {
  tedarikciDurumDegistir,
  tedarikciGuncelle,
  type TedarikciDurumu,
} from "./actions";
import { TedarikciKodAlani } from "./kod-alani";

export type TedarikciSatiriVerisi = {
  id: string;
  ad: string;
  kod: string | null;
  iletisim: string | null;
  aktif: boolean;
  alimSayisi: number;
};

/**
 * Tedarikçi satırı — yerinde düzenleme (Kullanıcı Kolaylığı #9).
 * Ad, kod ve iletişim üç alandan ibaret; ayrı sayfa açmak gereksiz tıklama.
 */
export function TedarikciSatiri({
  tedarikci,
}: {
  tedarikci: TedarikciSatiriVerisi;
}) {
  const t = useTranslations("Tedarikci");
  const ortak = useTranslations("Ortak");

  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [durum, formAction, bekliyor] = useActionState<
    TedarikciDurumu,
    FormData
  >(tedarikciGuncelle, {});

  // Kod önerisi ada bakarak üretilir; ad da denetimli alan olmalı.
  const [ad, setAd] = useState(tedarikci.ad);
  const [kod, setKod] = useState(tedarikci.kod ?? "");

  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari) setDuzenleniyor(false);
  }

  if (!duzenleniyor) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{tedarikci.ad}</span>
            {/* Kod bir kimliktir: varsa kopyalanabilir, yoksa eksikliği
                görünür — sessizce boş hücre bırakmak eksiği gizlerdi (#5). */}
            {tedarikci.kod ? (
              <KopyalanabilirKod deger={tedarikci.kod} etiket={ortak("kod")} />
            ) : (
              <Badge
                variant="outline"
                className="border-amber-500/50 text-amber-700 dark:text-amber-400"
              >
                {ortak("kod")} —
              </Badge>
            )}
            {tedarikci.aktif ? null : (
              <Badge variant="outline">{ortak("pasif")}</Badge>
            )}
          </div>
          <div className="text-muted-foreground text-xs">
            {t("alimSayisi")}: {tedarikci.alimSayisi}
            {tedarikci.iletisim ? ` · ${tedarikci.iletisim}` : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDuzenleniyor(true)}
          >
            <Pencil />
            {ortak("duzenle")}
          </Button>
          <DurumDegistirButonu
            kayitId={tedarikci.id}
            aktifMi={tedarikci.aktif}
            action={tedarikciDurumDegistir}
          />
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={formGonderimi(formAction)}
      className="bg-muted/40 space-y-2 p-3"
    >
      <input type="hidden" name="id" value={tedarikci.id} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1 space-y-1">
          <label
            className="text-muted-foreground text-xs"
            htmlFor={`ted-ad-${tedarikci.id}`}
          >
            {ortak("ad")}
          </label>
          <Input
            id={`ted-ad-${tedarikci.id}`}
            name="name"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="w-44">
          <TedarikciKodAlani
            inputId={`ted-kod-${tedarikci.id}`}
            ad={ad}
            deger={kod}
            onDegisim={setKod}
          />
        </div>
        <div className="min-w-40 flex-1 space-y-1">
          <label
            className="text-muted-foreground text-xs"
            htmlFor={`ted-iletisim-${tedarikci.id}`}
          >
            {t("iletisim")}
          </label>
          <Input
            id={`ted-iletisim-${tedarikci.id}`}
            name="contact"
            defaultValue={tedarikci.iletisim ?? ""}
            autoComplete="off"
          />
        </div>
        <Button type="submit" size="sm" disabled={bekliyor}>
          <Check />
          {bekliyor ? ortak("kaydediliyor") : ortak("degisiklikleriKaydet")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setDuzenleniyor(false)}
        >
          <X />
          {ortak("vazgec")}
        </Button>
      </div>

      {durum.hatalar?.length ? (
        <ul
          role="alert"
          className="text-destructive list-inside list-disc text-sm"
        >
          {durum.hatalar.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
