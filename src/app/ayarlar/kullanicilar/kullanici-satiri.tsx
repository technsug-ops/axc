"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, Lock, Save, X } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formGonderimi } from "@/lib/form-gonderimi";

import {
  kullaniciDurumDegistir,
  kullaniciParolaSifirla,
  kullaniciRolDegistir,
  type KullaniciDurumu,
} from "./actions";

export type KullaniciSatiriVerisi = {
  id: string;
  uyelikId: string | null;
  eposta: string;
  ad: string | null;
  rolId: string | null;
  rolAdi: string | null;
  aktif: boolean;
  parolaDegismeli: boolean;
  sonGiris: string | null;
  kendisiMi: boolean;
  /** Sistemdeki TEK tam yetkili aktif kullanıcı — kilitli. */
  sonSahipMi: boolean;
};

/**
 * Kullanıcı satırı.
 *
 * SON SAHİP KİLİDİ EKRANDA GÖRÜNÜR ve NEDENİ YAZAR. Düğmeyi sessizce
 * kapatmak "neden çalışmıyor?" sorusu doğurur; sunucu da ayrıca reddediyor.
 */
export function KullaniciSatiri({
  kullanici,
  roller,
}: {
  kullanici: KullaniciSatiriVerisi;
  roller: { id: string; name: string }[];
}) {
  const t = useTranslations("Kullanici");
  const ortak = useTranslations("Ortak");

  const [rolDurum, rolAction, rolBekliyor] = useActionState<
    KullaniciDurumu,
    FormData
  >(kullaniciRolDegistir, {});
  const [durumDurum, durumAction, durumBekliyor] = useActionState<
    KullaniciDurumu,
    FormData
  >(kullaniciDurumDegistir, {});
  const [parolaDurum, parolaAction, parolaBekliyor] = useActionState<
    KullaniciDurumu,
    FormData
  >(kullaniciParolaSifirla, {});

  const [rolId, setRolId] = useState(kullanici.rolId ?? "");
  const [parolaAcik, setParolaAcik] = useState(false);

  const rolDegisti = rolId !== kullanici.rolId;

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{kullanici.eposta}</span>
            {kullanici.rolAdi ? (
              <Badge variant="outline">{kullanici.rolAdi}</Badge>
            ) : (
              <Badge variant="secondary">{t("rolsuz")}</Badge>
            )}
            {kullanici.kendisiMi ? (
              <Badge variant="outline">{t("sizsiniz")}</Badge>
            ) : null}
            {kullanici.parolaDegismeli ? (
              <Badge variant="outline">{t("parolaBekliyor")}</Badge>
            ) : null}
            {!kullanici.aktif ? (
              <Badge variant="secondary">{ortak("pasif")}</Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            {kullanici.ad ? `${kullanici.ad} · ` : ""}
            {kullanici.sonGiris
              ? t("sonGiris", { tarih: kullanici.sonGiris })
              : t("hicGirmemis")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-11 md:h-9"
            onClick={() => setParolaAcik((a) => !a)}
          >
            <KeyRound />
            {t("parolaSifirla")}
          </Button>

          {/* SON SAHİP PASİFE ALINAMAZ — kilit görünür ve gerekçeli. */}
          {kullanici.sonSahipMi ? (
            <Button variant="outline" size="sm" className="h-11 md:h-9" disabled>
              <Lock />
              {t("kilitli")}
            </Button>
          ) : (
            <form onSubmit={formGonderimi(durumAction)}>
              <input type="hidden" name="id" value={kullanici.id} />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="h-11 md:h-9"
                disabled={durumBekliyor}
              >
                {kullanici.aktif ? ortak("pasifeAl") : ortak("aktiflestir")}
              </Button>
            </form>
          )}
        </div>
      </div>

      {kullanici.sonSahipMi ? (
        <p className="text-muted-foreground text-xs">{t("sonSahipNotu")}</p>
      ) : null}

      <HataOzeti hatalar={durumDurum.hatalar} />

      {/* --------------------------- ROL --------------------------- */}
      {kullanici.uyelikId ? (
        <form
          onSubmit={formGonderimi(rolAction)}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="uyelikId" value={kullanici.uyelikId} />
          <input type="hidden" name="roleId" value={rolId} />
          <div className="space-y-1">
            <Label htmlFor={`rol-${kullanici.id}`} className="text-xs">
              {t("rolEtiketi")}
            </Label>
            <Select
              value={rolId}
              onValueChange={setRolId}
              disabled={kullanici.sonSahipMi}
            >
              <SelectTrigger
                id={`rol-${kullanici.id}`}
                className="h-11 w-56 md:h-9"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roller.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-11 md:h-9"
            disabled={!rolDegisti || rolBekliyor || kullanici.sonSahipMi}
          >
            <Save />
            {rolBekliyor ? ortak("kaydediliyor") : ortak("degisiklikleriKaydet")}
          </Button>
        </form>
      ) : null}

      <HataOzeti hatalar={rolDurum.hatalar} />

      {/* ----------------------- PAROLA SIFIRLA ---------------------- */}
      {parolaAcik ? (
        <form
          onSubmit={formGonderimi(parolaAction)}
          className="flex flex-wrap items-end gap-2 rounded-md border p-3"
        >
          <input type="hidden" name="id" value={kullanici.id} />
          <div className="space-y-1">
            <Label htmlFor={`parola-${kullanici.id}`} className="text-xs">
              {t("yeniParola")}
            </Label>
            <Input
              id={`parola-${kullanici.id}`}
              name="password"
              type="text"
              placeholder={t("parolaIpucu")}
              autoComplete="off"
              className="h-11 w-64 md:h-9"
            />
          </div>
          <Button type="submit" size="sm" className="h-11 md:h-9" disabled={parolaBekliyor}>
            <Save />
            {parolaBekliyor ? ortak("kaydediliyor") : t("parolaKaydet")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 md:h-9"
            onClick={() => setParolaAcik(false)}
          >
            <X />
            {ortak("vazgec")}
          </Button>
          <p className="text-muted-foreground w-full text-xs">
            {t("parolaSifirlaNotu")}
          </p>
        </form>
      ) : null}

      <HataOzeti hatalar={parolaDurum.hatalar} />
    </div>
  );
}
