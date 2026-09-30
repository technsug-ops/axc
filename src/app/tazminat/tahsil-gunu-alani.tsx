"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_YAZISI } from "@/lib/renkler";

import { tazminatTahsilGunuKaydet } from "./actions";

/**
 * ============================================================================
 *  TAHSİL GÜNÜ — PAZARYERİ BİLDİRİMİ TARİHİ (30.09.2026)
 * ----------------------------------------------------------------------------
 *  Kapanmış talebin satırında durur. Gün kayıtlıysa yazar ve düzeltilebilir;
 *  kayıtlı değilse UYARI renginde «girilmedi» der — kart borcu ve rapor o
 *  talebi o güne kadar görmez, bu yüzden sessiz kalamaz (İlke #5).
 *  NotAlani ile aynı desen: doğrudan çağrı + `useTransition` (effect'siz).
 * ============================================================================
 */
export function TahsilGunuAlani({
  kayitId,
  gun,
  bugun,
}: {
  kayitId: string;
  /** "YYYY-MM-DD" ya da `null` (girilmedi). */
  gun: string | null;
  /** İstanbul bugünü — tarih seçicinin üst sınırı. */
  bugun: string;
}) {
  const t = useTranslations("Tazminat");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();

  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [taslak, setTaslak] = useState(gun ?? bugun);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  function kaydet() {
    setHata(null);
    const veri = new FormData();
    veri.set("id", kayitId);
    veri.set("gun", taslak);
    basla(async () => {
      const sonuc = await tazminatTahsilGunuKaydet({}, veri);
      if (sonuc.hatalar?.length) setHata(sonuc.hatalar.join(" "));
      else setDuzenleniyor(false);
    });
  }

  if (!duzenleniyor) {
    return (
      <button
        type="button"
        onClick={() => {
          setTaslak(gun ?? bugun);
          setHata(null);
          setDuzenleniyor(true);
        }}
        aria-label={t("tahsilGunuEtiketi")}
        /* ⚠ MOBİLDE 44px — İlke #8. */
        className={`inline-flex min-h-11 items-center gap-1 text-xs underline-offset-4 hover:underline sm:min-h-0 ${
          gun === null ? `font-medium ${DURUM_YAZISI.uyari}` : "text-muted-foreground"
        }`}
      >
        <CalendarDays className="size-3.5 shrink-0" aria-hidden />
        {gun === null
          ? t("tahsilGunuGirilmedi")
          : t("tahsilGunuDegeri", { gun: bicim.tarih(new Date(`${gun}T00:00:00Z`)) })}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Input
        type="date"
        value={taslak}
        max={bugun}
        onChange={(e) => setTaslak(e.target.value)}
        aria-label={t("tahsilGunuEtiketi")}
        className="h-11 w-40 md:h-8"
        autoFocus
      />
      <Button type="button" size="sm" className="h-11 md:h-8" disabled={bekliyor || taslak === ""} onClick={kaydet}>
        {bekliyor ? ortak("kaydediliyor") : ortak("degisiklikleriKaydet")}
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-11 md:h-8" disabled={bekliyor} onClick={() => setDuzenleniyor(false)}>
        {ortak("vazgec")}
      </Button>
      <span className="text-muted-foreground w-full text-xs">{t("tahsilGunuIpucu")}</span>
      {hata ? (
        <span className="text-destructive w-full text-xs font-medium" role="alert">
          {hata}
        </span>
      ) : null}
    </span>
  );
}
