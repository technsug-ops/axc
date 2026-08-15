"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { konumEkle, type KonumDurumu } from "./actions";
import { RafKoduAlani, koduBirlestir } from "./raf-kodu-alani";
import { DURUM_KUTUSU } from "@/lib/renkler";

const BOS = { taban: "", goz: "", name: "", description: "" };

export function KonumFormu() {
  const [durum, formAction, bekliyor] = useActionState<KonumDurumu, FormData>(
    konumEkle,
    {},
  );

  const t = useTranslations("Raf");
  const ortak = useTranslations("Ortak");

  const [alanlar, setAlanlar] = useState(BOS);

  // Başarılı kayıttan sonra alanları temizle ki arka arkaya raf girmek kolay
  // olsun. useActionState her dönüşte YENİ bir durum nesnesi verir; nesne
  // kimliği değiştiğinde render sırasında state'i ayarlıyoruz.
  // (React'in "adjusting state when a prop changes" kalıbı — useEffect içinde
  // setState çağırmak zincirleme render üretirdi.)
  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari) setAlanlar(BOS);
  }

  function guncelle(degisim: Partial<typeof BOS>) {
    setAlanlar((onceki) => ({ ...onceki, ...degisim }));
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Kod taban + gözden BİRLEŞTİRİLİR; gizli alanla gider. */}
      <input
        type="hidden"
        name="code"
        value={koduBirlestir(alanlar.taban, alanlar.goz)}
      />

      <RafKoduAlani
        taban={alanlar.taban}
        goz={alanlar.goz}
        onTaban={(deger) => guncelle({ taban: deger })}
        onGoz={(deger) => guncelle({ goz: deger })}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="konum-name">{ortak("ad")}</Label>
          <Input
            id="konum-name"
            name="name"
            value={alanlar.name}
            onChange={(e) => guncelle({ name: e.target.value })}
            placeholder={t("adIpucu")}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="konum-description">{ortak("aciklama")}</Label>
        <Input
          id="konum-description"
          name="description"
          value={alanlar.description}
          onChange={(e) => guncelle({ description: e.target.value })}
          placeholder={ortak("istegeBagli")}
          autoComplete="off"
        />
      </div>

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

      {durum.basari ? (
        <p className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.olumlu}`}>
          {durum.basari}
        </p>
      ) : null}

      <Button type="submit" disabled={bekliyor}>
        <Plus />
        {bekliyor ? ortak("ekleniyor") : t("rafEkle")}
      </Button>
    </form>
  );
}
