"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Lock, Pencil, X } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formGonderimi } from "@/lib/form-gonderimi";

import { rolDurumDegistir, rolGuncelle, type RolDurumu } from "./actions";
import { IzinSecici, type IzinSecenegi } from "./izin-secici";

export type RolSatiriVerisi = {
  id: string;
  ad: string;
  sistemMi: boolean;
  aktif: boolean;
  izinler: string[];
  kullaniciSayisi: number;
};

/**
 * Rol satırı — yerinde düzenleme.
 *
 * SİSTEM ROLÜNDE (Sahip) izin kutuları KİLİTLİ ve nedeni yazıyor: sahibin
 * yetkisini kısmak, kimsenin giremediği bir sistem üretmenin en kolay yolu.
 * Adı yine de değiştirilebilir.
 */
export function RolSatiri({
  rol,
  izinler,
}: {
  rol: RolSatiriVerisi;
  izinler: IzinSecenegi[];
}) {
  const t = useTranslations("Rol");
  const ortak = useTranslations("Ortak");

  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [durum, formAction, bekliyor] = useActionState<RolDurumu, FormData>(
    rolGuncelle,
    {},
  );
  const [durumDurum, durumAction, durumBekliyor] = useActionState<
    RolDurumu,
    FormData
  >(rolDurumDegistir, {});

  const [ad, setAd] = useState(rol.ad);
  const [secili, setSecili] = useState<Set<string>>(new Set(rol.izinler));

  const [sonDurum, setSonDurum] = useState(durum);
  if (sonDurum !== durum) {
    setSonDurum(durum);
    if (!durum.hatalar?.length) setDuzenleniyor(false);
  }

  function degistir(anahtar: string, secildi: boolean) {
    setSecili((onceki) => {
      const yeni = new Set(onceki);
      if (secildi) yeni.add(anahtar);
      else yeni.delete(anahtar);
      return yeni;
    });
  }

  if (!duzenleniyor) {
    return (
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{rol.ad}</span>
            {rol.sistemMi ? (
              <Badge variant="outline">{t("sistemRolu")}</Badge>
            ) : null}
            {!rol.aktif ? (
              <Badge variant="secondary">{ortak("pasif")}</Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-11 md:h-9"
              onClick={() => setDuzenleniyor(true)}
            >
              <Pencil />
              {ortak("duzenle")}
            </Button>
            {rol.sistemMi ? (
              <Button variant="outline" size="sm" className="h-11 md:h-9" disabled>
                <Lock />
                {t("kilitli")}
              </Button>
            ) : (
              <form onSubmit={formGonderimi(durumAction)}>
                <input type="hidden" name="id" value={rol.id} />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="h-11 md:h-9"
                  disabled={durumBekliyor}
                >
                  {rol.aktif ? ortak("pasifeAl") : ortak("aktiflestir")}
                </Button>
              </form>
            )}
          </div>
        </div>

        <p className="text-muted-foreground text-xs">
          {t("ozet", { izin: rol.izinler.length, kullanici: rol.kullaniciSayisi })}
        </p>

        <HataOzeti hatalar={durumDurum.hatalar} />
      </div>
    );
  }

  return (
    <form onSubmit={formGonderimi(formAction)} className="space-y-4 p-4">
      <input type="hidden" name="id" value={rol.id} />
      <HataOzeti hatalar={durum.hatalar} />

      <div className="space-y-2">
        <Label htmlFor={`rolad-${rol.id}`}>{t("adEtiketi")}</Label>
        <Input
          id={`rolad-${rol.id}`}
          name="name"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
          className="h-11 max-w-sm md:h-9"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("izinlerEtiketi")}</Label>
        {rol.sistemMi ? (
          <p className="text-muted-foreground text-xs">{t("sistemRolIzinNotu")}</p>
        ) : null}
        <IzinSecici
          izinler={izinler}
          secili={secili}
          onDegisti={degistir}
          devreDisi={rol.sistemMi}
        />
        {/* Sistem rolünde kutular kilitli; değerler yine de gönderilmeli. */}
        {rol.sistemMi
          ? [...secili].map((i) => (
              <input key={i} type="hidden" name="izinler" value={i} />
            ))
          : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" className="h-11 md:h-9" disabled={bekliyor}>
          <Check />
          {bekliyor ? ortak("kaydediliyor") : ortak("degisiklikleriKaydet")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 md:h-9"
          onClick={() => {
            setAd(rol.ad);
            setSecili(new Set(rol.izinler));
            setDuzenleniyor(false);
          }}
        >
          <X />
          {ortak("vazgec")}
        </Button>
      </div>
    </form>
  );
}
