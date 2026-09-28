"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FinansmanBirimi } from "@/lib/finansman/kural";

import { fiyatEkle } from "./eylemler";

const SECIM = "border-input bg-background h-11 w-full rounded-md border px-3 text-sm md:h-9";
const bugunMetni = () => new Date().toISOString().slice(0, 10);

/**
 * Birim fiyatı girişi (K304-②). Fiyat TL karşılığını TAHMİN olarak gösterir;
 * borç rakamını değiştirmez. Eski fiyat silinmez, en yenisi okunur.
 */
export function FiyatFormu({ birimler }: { birimler: FinansmanBirimi[] }) {
  const t = useTranslations("Finansman");
  const ortak = useTranslations("Ortak");
  const [birim, setBirim] = useState<FinansmanBirimi>(birimler[0]);
  const [gun, setGun] = useState(bugunMetni());
  const [fiyat, setFiyat] = useState("");
  const [sonuc, setSonuc] = useState<{ tamam: boolean; mesaj: string } | null>(null);
  const [bekliyor, basla] = useTransition();

  return (
    <form
      className="bg-card grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        basla(async () => {
          const r = await fiyatEkle(birim, gun, fiyat);
          if (r.tamam) {
            setSonuc({ tamam: true, mesaj: t("fiyatKaydedildi") });
            setFiyat("");
          } else setSonuc({ tamam: false, mesaj: r.hata ?? "" });
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="fy-birim">{t("alan.birim")}</Label>
        <select id="fy-birim" className={SECIM} value={birim} onChange={(e) => setBirim(e.target.value as FinansmanBirimi)}>
          {birimler.map((b) => (
            <option key={b} value={b}>
              {t(`birim.${b}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="fy-gun">{t("alan.fiyatGunu")}</Label>
        <Input id="fy-gun" type="date" value={gun} onChange={(e) => setGun(e.target.value)} className="min-h-11 md:min-h-9" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="fy-fiyat">{t("alan.tlFiyati")}</Label>
        <Input id="fy-fiyat" inputMode="decimal" value={fiyat} onChange={(e) => setFiyat(e.target.value)} placeholder={t("alan.fiyatOrnek")} required className="min-h-11 md:min-h-9" />
      </div>
      <Button type="submit" disabled={bekliyor} className="min-h-11 md:min-h-9">
        {bekliyor ? ortak("kaydediliyor") : t("fiyatKaydet")}
      </Button>
      {sonuc ? (
        <p className={`text-sm sm:col-span-4 ${sonuc.tamam ? "" : "text-destructive"}`} role={sonuc.tamam ? "status" : "alert"}>
          {sonuc.mesaj}
        </p>
      ) : null}
    </form>
  );
}
