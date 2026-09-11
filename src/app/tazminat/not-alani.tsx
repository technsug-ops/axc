"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { tazminatNotGuncelle } from "./actions";

/**
 * ============================================================================
 *  TALEP NOTU — SONRADAN DÜZENLENEBİLİR (K208)
 * ----------------------------------------------------------------------------
 *  _Kullanıcı vakası 11.09.2026: talebi kabul ettirdi, faturasını kesti,
 *  ödeme gelene kadar fatura numarasını buraya yazıp takip etmek istedi._
 *  `note` alanı şemada vardı ama yalnız talep AÇILIRKEN yazılıyordu; bu
 *  bileşen olmadan liste ekranı notu hiç göstermiyor, hiç değiştirmiyordu.
 *
 *  ⚠ `useActionState` DEĞİL, DOĞRUDAN ÇAĞRI + `useTransition` (K207'yle
 *  aynı desen). Kayıt bitince düzenleme kapanmalı; bunu `useActionState`in
 *  dönen state'ini bir `useEffect`le izleyerek yapmak "effect içinde
 *  senkron setState" uyarısı verir (React: cascading render riski).
 *  Sonucu ASENKRON ÇAĞRININ KENDİSİNDE okuyup kapatmak hem daha basit hem
 *  effect'siz.
 * ============================================================================
 */
export function NotAlani({
  kayitId,
  not,
}: {
  kayitId: string;
  not: string | null;
}) {
  const t = useTranslations("Tazminat");
  const ortak = useTranslations("Ortak");

  const [duzenleniyor, setDuzenleniyor] = useState(false);
  const [taslak, setTaslak] = useState(not ?? "");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  function kaydet() {
    setHata(null);
    const veri = new FormData();
    veri.set("id", kayitId);
    veri.set("note", taslak);
    basla(async () => {
      const sonuc = await tazminatNotGuncelle({}, veri);
      if (sonuc.hatalar?.length) setHata(sonuc.hatalar.join(" "));
      // Başarıda düzenleme kapanır; sunucudan gelen TAZE `not` değeri
      // (revalidatePath sonrası) görünür hâle geçer.
      else setDuzenleniyor(false);
    });
  }

  if (!duzenleniyor) {
    return (
      <button
        type="button"
        onClick={() => {
          setTaslak(not ?? "");
          setHata(null);
          setDuzenleniyor(true);
        }}
        aria-label={ortak("duzenle") + " — " + t("notEtiketi")}
        /* ⚠ MOBİLDE 44px — İlke #8. */
        className="text-muted-foreground hover:text-foreground inline-flex min-h-11 max-w-48 items-start gap-1 py-1 text-left text-xs sm:min-h-0"
      >
        <Pencil className="mt-0.5 size-3 shrink-0" aria-hidden />
        <span className="line-clamp-2">{not || t("notEkle")}</span>
      </button>
    );
  }

  return (
    <div className="flex w-48 flex-col gap-1">
      <Textarea
        value={taslak}
        onChange={(e) => setTaslak(e.target.value)}
        aria-label={t("notEtiketi")}
        placeholder={ortak("istegeBagli")}
        rows={2}
        className="text-xs"
        autoFocus
      />
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          className="h-11 md:h-8"
          disabled={bekliyor}
          onClick={kaydet}
        >
          {bekliyor ? ortak("kaydediliyor") : ortak("degisiklikleriKaydet")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-11 md:h-8"
          disabled={bekliyor}
          onClick={() => setDuzenleniyor(false)}
        >
          {ortak("vazgec")}
        </Button>
      </div>
      {hata ? (
        <p className="text-destructive text-xs font-medium" role="alert">
          {hata}
        </p>
      ) : null}
    </div>
  );
}
