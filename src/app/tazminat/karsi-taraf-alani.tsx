"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { tazminatKarsiTarafDegistir } from "./actions";
import type { KarsiTarafSecenegi } from "./talep-formu";

/**
 * ============================================================================
 *  KARŞI TARAF — SATIRDAN DÜZELTME (30.09.2026)
 * ----------------------------------------------------------------------------
 *  Açılmış talebin karşı tarafı yanlışsa buradan düzeltilir (ütü vakası:
 *  Hepsiburada ödedi, form «Amazon» yazmıştı). Tutar/adet/durum değişmez.
 *  NotAlani ile aynı desen: doğrudan çağrı + `useTransition` (effect'siz).
 * ============================================================================
 */
export function KarsiTarafAlani({
  kayitId,
  ad,
  deger,
  secenekler,
}: {
  kayitId: string;
  ad: string;
  deger: string | null;
  secenekler: KarsiTarafSecenegi[];
}) {
  const t = useTranslations("Tazminat");
  const ortak = useTranslations("Ortak");

  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [secili, setSecili] = useState(deger ?? "");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  function kaydet() {
    setHata(null);
    const veri = new FormData();
    veri.set("id", kayitId);
    veri.set("karsiTaraf", secili);
    basla(async () => {
      const sonuc = await tazminatKarsiTarafDegistir({}, veri);
      if (sonuc.hatalar?.length) setHata(sonuc.hatalar.join(" "));
      else setDuzenleniyor(false);
    });
  }

  if (!duzenleniyor) {
    return (
      <button
        type="button"
        onClick={() => {
          setSecili(deger ?? "");
          setHata(null);
          setDuzenleniyor(true);
        }}
        aria-label={`${ortak("duzenle")} — ${t("karsiTarafEtiketi")}`}
        /* ⚠ MOBİLDE 44px — İlke #8. */
        className="inline-flex min-h-11 items-center gap-1 underline-offset-4 hover:underline sm:min-h-0"
      >
        {ad}
        <Pencil className="text-muted-foreground size-3 shrink-0" aria-hidden />
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Select value={secili} onValueChange={setSecili}>
        <SelectTrigger className="h-11 w-48 md:h-8" aria-label={t("karsiTarafEtiketi")}>
          <SelectValue placeholder={t("karsiTarafSec")} />
        </SelectTrigger>
        <SelectContent>
          {secenekler.map((s) => (
            <SelectItem key={s.deger} value={s.deger}>
              {s.tur === "kargo" ? t("karsiTarafKargo", { ad: s.ad }) : s.ad}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" size="sm" className="h-11 md:h-8" disabled={bekliyor || secili === ""} onClick={kaydet}>
        {bekliyor ? ortak("kaydediliyor") : ortak("degisiklikleriKaydet")}
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-11 md:h-8" disabled={bekliyor} onClick={() => setDuzenleniyor(false)}>
        {ortak("vazgec")}
      </Button>
      {hata ? (
        <span className="text-destructive w-full text-xs font-medium" role="alert">
          {hata}
        </span>
      ) : null}
    </span>
  );
}
