"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { BenzerUrun } from "./actions";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  BENZER ÜRÜN SORUSU — ENGEL DEĞİL, SORGU
 * ----------------------------------------------------------------------------
 *  Kodlar benzersiz olduğu için aynı ürün ikinci kez FARKLI kodla açılabiliyor
 *  ve sistem bunu hiç fark etmiyordu. Artık ad+marka benzeyen kayıt varsa
 *  kaydetmeden önce soruluyor.
 *
 *  KARARI KULLANICI VERİR. "Farklı ürün — devam et" düğmesi aynı formu
 *  onay bayrağıyla tekrar gönderir; kullanıcı yeniden veri girmez.
 * ============================================================================
 */
export function BenzerlikSorusu({
  benzerler,
  onDevam,
  bekliyor,
}: {
  benzerler: BenzerUrun[];
  /** Onay bayrağıyla yeniden gönder. */
  onDevam: () => void;
  bekliyor: boolean;
}) {
  const t = useTranslations("Urunler");
  const ortak = useTranslations("Ortak");

  if (!benzerler.length) return null;

  return (
    <div className={`space-y-3 rounded-md p-4 ${DURUM_KUTUSU.uyari}`}>
      <div>
        <p className={`text-sm font-medium ${DURUM_YAZISI.uyari}`}>
          {t("benzerBaslik", { sayi: benzerler.length })}
        </p>
        <p className={`mt-1 text-sm ${DURUM_YAZISI.uyari}`}>
          {t("benzerMetin")}
        </p>
      </div>

      <ul className="divide-y rounded-md border bg-background">
        {benzerler.map((b) => (
          <li
            key={b.urunId}
            className="flex flex-wrap items-center justify-between gap-2 p-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{b.ad}</div>
              {b.marka ? (
                <div className="text-muted-foreground text-xs">{b.marka}</div>
              ) : null}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/urunler/${b.urunId}`} target="_blank" rel="noopener">
                <ExternalLink />
                {t("benzerVarOlanaGit")}
              </Link>
            </Button>
          </li>
        ))}
      </ul>

      <Button type="button" disabled={bekliyor} onClick={onDevam}>
        {bekliyor ? ortak("bekleyin") : t("benzerFarkliUrun")}
      </Button>
    </div>
  );
}
