"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

import { urunTavsiyesiAl } from "./tavsiye-actions";

/**
 * ============================================================================
 *  ÜRÜN TAVSİYESİ DÜĞMESİ (K-TAVSIYE)
 * ----------------------------------------------------------------------------
 *  `kanal-desi-guncelle.tsx` İLE AYNI DESEN: useState + useTransition,
 *  düğme → beklemede → sonuç satır içi. Gerçek para harcayan bir çağrı
 *  olduğu için OTOMATİK ÇALIŞMAZ — yalnız mimar isterse tetiklenir.
 * ============================================================================
 */
export function TavsiyeAl({ variantId }: { variantId: string }) {
  const t = useTranslations("UrunKarti");
  const [bekliyor, basla] = useTransition();
  const [sonuc, setSonuc] = useState<
    | { tamam: true; metin: string; kaynak: "YAPAY_ZEKA" | "YEDEK" }
    | { tamam: false }
    | null
  >(null);

  const tavsiyeIste = () => {
    setSonuc(null);
    basla(async () => {
      const cevap = await urunTavsiyesiAl(variantId);
      setSonuc(cevap.tamam ? cevap : { tamam: false });
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 shrink-0" aria-hidden />
        <span className="text-sm font-medium">{t("tavsiyeBaslik")}</span>
      </div>

      {sonuc === null ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={bekliyor}
          onClick={tavsiyeIste}
        >
          {bekliyor ? t("tavsiyeIsteniyor") : t("tavsiyeAl")}
        </Button>
      ) : sonuc.tamam ? (
        <div className="space-y-2">
          {sonuc.kaynak === "YEDEK" ? (
            <p className="text-muted-foreground text-xs">{t("tavsiyeYedekOnsozu")}</p>
          ) : null}
          <p className="text-sm whitespace-pre-line">{sonuc.metin}</p>
          <p className={`text-xs ${DURUM_YAZISI.notr}`}>{t("tavsiyeUyari")}</p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSonuc(null)}>
            {t("tavsiyeAl")}
          </Button>
        </div>
      ) : (
        <div className={`rounded-md p-2 text-xs ${DURUM_KUTUSU.uyari}`}>
          <p className={DURUM_YAZISI.uyari}>{t("tavsiyeHata")}</p>
        </div>
      )}
    </div>
  );
}
