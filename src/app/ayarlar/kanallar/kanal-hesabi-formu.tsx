"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formGonderimi } from "@/lib/form-gonderimi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { kanalHesabiEkle, type KanalHesabiDurumu } from "./actions";
import { DURUM_KUTUSU } from "@/lib/renkler";

export type KanalSecenegi = { id: string; name: string };

const BOS = {
  /** VARSAYILANI YOK: kullanıcı bakmadan yanlış rolde hesap açmasın. */
  rol: "" as "" | "ALIS" | "SATIS",
  channelId: "",
  paraBirimi: "TRY" as "TRY" | "EUR",
  name: "",
  code: "",
  externalId: "",
};

export function KanalHesabiFormu({ kanallar }: { kanallar: KanalSecenegi[] }) {
  const [durum, formAction, bekliyor] = useActionState<
    KanalHesabiDurumu,
    FormData
  >(kanalHesabiEkle, {});

  const t = useTranslations("KanalHesabi");
  const ortak = useTranslations("Ortak");

  const [alanlar, setAlanlar] = useState(BOS);

  // Başarılı kayıttan sonra formu sıfırla. Render sırasında ayarlıyoruz;
  // useEffect içinde setState çağırmak zincirleme render üretirdi.
  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (durum.basari) setAlanlar(BOS);
  }

  function guncelle(degisim: Partial<typeof BOS>) {
    setAlanlar((onceki) => ({ ...onceki, ...degisim }));
  }

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-4">
      {/* Radix Select kontrollü; değerleri gizli alanlarla gönderiyoruz. */}
      <input type="hidden" name="channelId" value={alanlar.channelId} />
      <input type="hidden" name="defaultCurrency" value={alanlar.paraBirimi} />
      <input type="hidden" name="rol" value={alanlar.rol} />

      {/* ROL — ZORUNLU TEK SEÇİM, VARSAYILANSIZ.
          Bir hesap ya mal ALDIĞINIZ hesaptır ya mal SATTIĞINIZ mağaza.
          Aynı pazaryerinde ikisi de varsa AYRI hesap olarak tanımlanır. */}
      <fieldset className="space-y-2 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">
          {t("rolBaslik")} *
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["ALIS", t("rolAlis"), t("rolAlisAciklama")],
              ["SATIS", t("rolSatis"), t("rolSatisAciklama")],
            ] as const
          ).map(([deger, baslik, aciklama]) => (
            <label
              key={deger}
              className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors ${
                alanlar.rol === deger ? "border-primary bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <input
                type="radio"
                name="rol-secim"
                className="mt-1 size-4 shrink-0"
                checked={alanlar.rol === deger}
                onChange={() => guncelle({ rol: deger })}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{baslik}</span>
                <span className="text-muted-foreground block text-xs">
                  {aciklama}
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">{t("rolNotu")}</p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hesap-kanal">{t("kanal")} *</Label>
          <Select
            value={alanlar.channelId}
            onValueChange={(d) => guncelle({ channelId: d })}
          >
            <SelectTrigger id="hesap-kanal" className="w-full">
              <SelectValue placeholder={t("pazaryeriSecin")} />
            </SelectTrigger>
            <SelectContent>
              {kanallar.map((kanal) => (
                <SelectItem key={kanal.id} value={kanal.id}>
                  {kanal.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hesap-para">{ortak("paraBirimi")} *</Label>
          <Select
            value={alanlar.paraBirimi}
            onValueChange={(d) => guncelle({ paraBirimi: d as "TRY" | "EUR" })}
          >
            <SelectTrigger id="hesap-para" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRY">TRY</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hesap-ad">{t("hesapAdi")} *</Label>
          <Input
            id="hesap-ad"
            name="name"
            value={alanlar.name}
            onChange={(e) => guncelle({ name: e.target.value })}
            placeholder={t("hesapAdiIpucu")}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hesap-kod">{t("hesapKodu")} *</Label>
          <Input
            id="hesap-kod"
            name="code"
            value={alanlar.code}
            onChange={(e) => guncelle({ code: e.target.value })}
            placeholder={t("hesapKoduIpucu")}
            autoComplete="off"
          />
          <p className="text-muted-foreground text-xs">{t("kodNotu")}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hesap-dis-id">{t("saticiKimligi")}</Label>
        <Input
          id="hesap-dis-id"
          name="externalId"
          value={alanlar.externalId}
          onChange={(e) => guncelle({ externalId: e.target.value })}
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
        {bekliyor ? ortak("ekleniyor") : t("hesapEkle")}
      </Button>
    </form>
  );
}
