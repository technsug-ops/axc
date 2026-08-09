"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { konumGuncelle, type KonumDurumu } from "../../actions";

export function KonumDuzenleFormu({
  konumId,
  baslangic,
}: {
  konumId: string;
  baslangic: { code: string; name: string; description: string };
}) {
  const [durum, formAction, bekliyor] = useActionState<KonumDurumu, FormData>(
    konumGuncelle,
    {},
  );

  const t = useTranslations("Raf");
  const ortak = useTranslations("Ortak");

  const [alanlar, setAlanlar] = useState(baslangic);

  function guncelle(degisim: Partial<typeof baslangic>) {
    setAlanlar((onceki) => ({ ...onceki, ...degisim }));
  }

  const kodDegisti = alanlar.code.trim() !== baslangic.code;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={konumId} />
      <input type="hidden" name="code" value={alanlar.code} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="duzenle-code">{t("rafKodu")} *</Label>
          <BarkodGirisi
            id="duzenle-code"
            value={alanlar.code}
            onChange={(deger) => guncelle({ code: deger })}
            placeholder="A-01"
            kameraBasligi={t("kameraBasligi")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duzenle-name">{ortak("ad")}</Label>
          <Input
            id="duzenle-name"
            name="name"
            value={alanlar.name}
            onChange={(e) => guncelle({ name: e.target.value })}
            placeholder={t("adIpucu")}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duzenle-description">{ortak("aciklama")}</Label>
        <Input
          id="duzenle-description"
          name="description"
          value={alanlar.description}
          onChange={(e) => guncelle({ description: e.target.value })}
          placeholder={ortak("istegeBagli")}
          autoComplete="off"
        />
      </div>

      {/* Basılı etiketler kodu içeriyor; kod değişirse fiziksel etiket
          artık eşleşmez. Sessizce olmasın, uyaralım. */}
      {kodDegisti ? (
        <p
          role="status"
          className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400"
        >
          {t.rich("kodDegistiUyarisi", {
            kod: baslangic.code,
            kalin: (parca) => <strong>{parca}</strong>,
          })}
        </p>
      ) : null}

      {durum.hatalar?.length ? (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
        >
          <ul className="list-inside list-disc space-y-1">
            {durum.hatalar.map((hata, i) => (
              <li key={i}>{hata}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={bekliyor}>
          {bekliyor ? ortak("kaydediliyor") : ortak("degisiklikleriKaydet")}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/ayarlar/konumlar">{ortak("vazgec")}</Link>
        </Button>
      </div>
    </form>
  );
}
