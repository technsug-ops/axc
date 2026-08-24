"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
import { Button } from "@/components/ui/button";
import { DURUM_YAZISI } from "@/lib/renkler";

import { gonderiNoKaydet } from "./gonderi-no-actions";

/**
 * ============================================================================
 *  GÖNDERİ (TAKİP) NUMARASI — SATIŞ DETAYINDA SONRADAN GİRİLİR (K41①)
 * ----------------------------------------------------------------------------
 *  ⚠ OKUTULABİLİR (İlke #7): kargo etiketindeki barkod doğrudan okutulur.
 *
 *  ⚠ OKUNAN DEĞER ARA DURUMA YAZILIP ORADAN OKUNMAZ. `onOkundu` gelen kodu
 *  PARAMETREYLE kaydetme yoluna verir. React durumu senkron güncellenmiyor;
 *  `setKod(x)` deyip hemen `kaydet()` çağırsaydık bir ÖNCEKİ değer
 *  kaydedilirdi — fiyat denemesinde tam bu yaşandı (anayasa: "bir okuma,
 *  okunan değeri DOĞRUDAN taşır").
 * ============================================================================
 */
export function GonderiNo({
  saleId,
  mevcut,
}: {
  saleId: string;
  mevcut: string | null;
}) {
  const t = useTranslations("Satis");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [kod, setKod] = useState(mevcut ?? "");
  const [bekliyor, basla] = useTransition();
  const [mesaj, setMesaj] = useState<{ hata?: string; basari?: string } | null>(
    null,
  );

  /** ⚠ Değer PARAMETREDEN gelir; durumdan okunmaz. */
  const kaydet = (deger: string) => {
    setMesaj(null);
    basla(async () => {
      const sonuc = await gonderiNoKaydet(saleId, deger);
      setMesaj({ hata: sonuc.hatalar?.join(" "), basari: sonuc.basari });
      if (sonuc.basari) router.refresh();
    });
  };

  const degisti = kod.trim() !== (mevcut ?? "").trim();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-2">
        <BarkodGirisi
          className="max-w-xs min-w-44 flex-1"
          value={kod}
          onChange={setKod}
          /* Okunan kod DOĞRUDAN kaydetmeye gider — hem alana yazılır. */
          onOkundu={(okunan) => {
            setKod(okunan);
            kaydet(okunan);
          }}
          placeholder={t("gonderiNoIpucu")}
          kameraBasligi={t("gonderiNoKamera")}
        />
        <Button
          type="button"
          variant="secondary"
          className="h-11 md:h-9"
          disabled={!degisti || bekliyor}
          onClick={() => kaydet(kod)}
        >
          <Save className="size-4" />
          {bekliyor ? ortak("kaydediliyor") : t("gonderiNoKaydet")}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t("gonderiNoNotu")}</p>
      {mesaj?.basari ? (
        <p className={`text-xs font-medium ${DURUM_YAZISI.olumlu}`} role="status">
          {mesaj.basari}
        </p>
      ) : null}
      {mesaj?.hata ? (
        <p className="text-destructive text-xs font-medium" role="alert">
          {mesaj.hata}
        </p>
      ) : null}
    </div>
  );
}
