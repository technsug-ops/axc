"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, X } from "lucide-react";

import { DurumDegistirButonu } from "@/components/durum-degistir-butonu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formGonderimi } from "@/lib/form-gonderimi";

import {
  kategoriDurumDegistir,
  kategoriGuncelle,
  type KategoriDurumu,
} from "./actions";

export type KategoriSatiriVerisi = {
  id: string;
  name: string;
  vatRate: string;
  isActive: boolean;
  urunSayisi: number;
};

/**
 * Kategori satırı — yerinde düzenleme.
 * Ad ve oran iki alandan ibaret olduğu için ayrı bir düzenleme sayfası
 * açmak gereksiz tıklama olurdu (Kullanıcı Kolaylığı #9).
 */
export function KategoriSatiri({
  kategori,
}: {
  kategori: KategoriSatiriVerisi;
}) {
  const t = useTranslations("Kategori");
  const ortak = useTranslations("Ortak");

  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [durum, formAction, bekliyor] = useActionState<
    KategoriDurumu,
    FormData
  >(kategoriGuncelle, {});

  // Kayıt başarılıysa düzenleme kipinden çık.
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
            <span className="font-medium">{kategori.name}</span>
            <Badge variant="secondary">%{kategori.vatRate}</Badge>
            {kategori.isActive ? null : (
              <Badge variant="outline">{ortak("pasif")}</Badge>
            )}
          </div>
          <div className="text-muted-foreground text-xs">
            {t("urunSayisi")}: {kategori.urunSayisi}
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
            kayitId={kategori.id}
            aktifMi={kategori.isActive}
            action={kategoriDurumDegistir}
          />
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={formGonderimi(formAction)}
      className="space-y-2 bg-muted/40 p-3"
    >
      <input type="hidden" name="id" value={kategori.id} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1 space-y-1">
          <label
            className="text-muted-foreground text-xs"
            htmlFor={`ad-${kategori.id}`}
          >
            {ortak("ad")}
          </label>
          <Input
            id={`ad-${kategori.id}`}
            name="name"
            defaultValue={kategori.name}
            autoComplete="off"
          />
        </div>
        <div className="w-28 space-y-1">
          <label
            className="text-muted-foreground text-xs"
            htmlFor={`oran-${kategori.id}`}
          >
            {t("kdvOrani")}
          </label>
          <Input
            id={`oran-${kategori.id}`}
            name="vatRate"
            defaultValue={kategori.vatRate}
            inputMode="decimal"
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
