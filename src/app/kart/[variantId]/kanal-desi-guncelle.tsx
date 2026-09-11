"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import { useBicim } from "@/lib/bicim-istemci";
import { desiFarkliMi } from "@/lib/desi-karsilastirma";

import { kanalDesiyleGuncelle } from "./desi-actions";

/**
 * ============================================================================
 *  K197-⑤ — KANAL DESİSİ KARŞILAŞTIRMASI (ürün kartında)
 * ----------------------------------------------------------------------------
 *  Kullanıcı sordu: "API'den desileri çekemiyoruz." Veri geliyordu, hiçbir
 *  ekran göstermiyordu (bkz. urun-karti-verisi.ts, kart-actions.ts).
 *
 *  ⚠ DEĞERLER AYNIYSA DÜĞME ÇIKMAZ — güncellenecek bir şey yoksa eylem
 *  teklif edilmez (İlke #1'in tersi: gizli eylem olmaz, ama gereksiz eylem
 *  de görünür kılınmaz).
 *
 *  ⚠ AZ ÖRNEKLEM UYARISI — 3'ten az örnek "az veri" diye işaretlenir ama
 *  ENGELLENMEZ; kullanıcı yine de güncelleyebilir (İlke: uyarı sorar,
 *  kullanıcı ısrar ederse geçer — burada ısrar zaten tek tık).
 * ============================================================================
 */
const AZ_ORNEKLEM_TAVANI = 3;

export function KanalDesiGuncelle({
  variantId,
  bizimDesi,
  kanalOrtalama,
  ornekSayisi,
}: {
  variantId: string;
  bizimDesi: number | null;
  kanalOrtalama: number;
  ornekSayisi: number;
}) {
  const t = useTranslations("UrunKarti");
  const bicim = useBicim();
  const [bekliyor, basla] = useTransition();
  const [sonuc, setSonuc] = useState<
    { tamam: true; yeniDesi: number } | { tamam: false } | null
  >(null);

  const farkliMi = desiFarkliMi(bizimDesi, kanalOrtalama);

  const guncelle = () => {
    setSonuc(null);
    basla(async () => {
      const cevap = await kanalDesiyleGuncelle(variantId);
      setSonuc(cevap.tamam ? { tamam: true, yeniDesi: cevap.yeniDesi } : { tamam: false });
    });
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>
        {t("kanalDesiSatiri", {
          desi: bicim.sayi(kanalOrtalama),
          adet: ornekSayisi,
        })}
      </span>
      {ornekSayisi < AZ_ORNEKLEM_TAVANI ? (
        <span className="text-muted-foreground text-xs">
          {t("kanalDesiAzOrneklem")}
        </span>
      ) : null}

      {sonuc?.tamam ? (
        <span className="text-primary inline-flex items-center gap-1 text-xs font-medium">
          <CheckCircle2 className="size-3.5" aria-hidden />
          {t("kanalDesiGuncellendi", { desi: bicim.sayi(sonuc.yeniDesi) })}
        </span>
      ) : farkliMi ? (
        <button
          type="button"
          disabled={bekliyor}
          onClick={guncelle}
          /* ⚠ MOBİLDE 44px — İlke #8. Metin küçük ama dokunma alanı geniş. */
          className="text-primary hover:underline underline-offset-2 disabled:opacity-50 min-h-11 px-1 text-xs font-medium sm:min-h-0 sm:py-0"
        >
          {bekliyor ? t("kanalDesiGuncelleniyor") : t("kanalDesiyleGuncelle")}
        </button>
      ) : null}

      {sonuc?.tamam === false ? (
        <span role="alert" className="text-destructive text-xs">
          {t("kanalDesiHata")}
        </span>
      ) : null}
    </span>
  );
}
