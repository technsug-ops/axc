"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, Check, Power, PowerOff } from "lucide-react";

import { Button } from "@/components/ui/button";

import { sablonDurumDegistir, sablondanEkle, type GiderDurumu } from "../actions";

/**
 * Şablon satırının eylemleri (Kullanıcı Kolaylığı İlkeleri #1, #5, #6).
 *
 * ÇİFT KAYIT KORUMASI GÖRÜNÜR: bu şablondan bu ay zaten bir gider
 * üretilmişse düğme kaybolmaz — PASİF olur ve nedeni yanında yazar.
 * Kirayı ikinci kez girmek en pahalı sessiz hatalardan biri olurdu.
 *
 * Not: Şablondan gider üretmek geri alınabilir bir işlemdir (gider satırı
 * listeden silinebilir), bu yüzden onay diyaloğu istemez — #6 yalnızca
 * geri alınamaz işlemler için.
 */
export function SablonEylemleri({
  sablonId,
  aktifMi,
  buAyEklendiMi,
}: {
  sablonId: string;
  aktifMi: boolean;
  buAyEklendiMi: boolean;
}) {
  const t = useTranslations("Gider");
  const ortak = useTranslations("Ortak");

  const [ekleDurumu, ekleAction, ekleniyor] = useActionState<
    GiderDurumu,
    FormData
  >(sablondanEkle, {});
  const [durumDurumu, durumAction, degisiyor] = useActionState<
    GiderDurumu,
    FormData
  >(sablonDurumDegistir, {});

  const mesajlar = [ekleDurumu, durumDurumu];

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        {buAyEklendiMi ? (
          <Button variant="outline" size="sm" disabled title={t("buAyEklendiNotu")}>
            <Check />
            {t("buAyEklendi")}
          </Button>
        ) : (
          <form action={ekleAction}>
            <input type="hidden" name="id" value={sablonId} />
            <Button
              type="submit"
              size="sm"
              disabled={ekleniyor || !aktifMi}
              title={aktifMi ? undefined : t("sablonPasifNotu")}
            >
              <CalendarPlus />
              {ekleniyor ? ortak("ekleniyor") : t("buAyEkle")}
            </Button>
          </form>
        )}

        <form action={durumAction}>
          <input type="hidden" name="id" value={sablonId} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={degisiyor}
          >
            {aktifMi ? <PowerOff /> : <Power />}
            {degisiyor
              ? ortak("kaydediliyor")
              : aktifMi
                ? ortak("pasifeAl")
                : ortak("aktiflestir")}
          </Button>
        </form>
      </div>

      {mesajlar.map((durum, sira) => (
        <div key={sira}>
          {durum.basari ? (
            <p className="text-xs font-medium text-emerald-600" role="status">
              {durum.basari}
            </p>
          ) : null}
          {durum.hatalar?.length ? (
            <p className="text-destructive text-xs font-medium" role="alert">
              {durum.hatalar.join(" ")}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
