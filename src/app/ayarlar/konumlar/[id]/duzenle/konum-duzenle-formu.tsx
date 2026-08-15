"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { konumGuncelle, type KonumDurumu } from "../../actions";
import {
  RafKoduAlani,
  koduAyir,
  koduBirlestir,
} from "../../raf-kodu-alani";
import { DURUM_KUTUSU } from "@/lib/renkler";

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

  // Mevcut kod taban + göze AYRILIR; kullanıcı tireyi görmeden düzenler.
  const bolunmus = koduAyir(baslangic.code);
  const [alanlar, setAlanlar] = useState({
    ...baslangic,
    taban: bolunmus.taban,
    goz: bolunmus.goz,
  });

  function guncelle(degisim: Partial<typeof alanlar>) {
    setAlanlar((onceki) => ({ ...onceki, ...degisim }));
  }

  const tamKod = koduBirlestir(alanlar.taban, alanlar.goz);
  const kodDegisti = tamKod !== baslangic.code;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={konumId} />
      <input type="hidden" name="code" value={tamKod} />

      <RafKoduAlani
        taban={alanlar.taban}
        goz={alanlar.goz}
        onTaban={(deger) => guncelle({ taban: deger })}
        onGoz={(deger) => guncelle({ goz: deger })}
      />

      <div className="grid gap-4 sm:grid-cols-2">
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
          className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}
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
