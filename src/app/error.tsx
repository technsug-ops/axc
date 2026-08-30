"use client";

import { useTranslations } from "next-intl";

import { HataEkrani } from "@/components/hata-ekrani";

/**
 * ============================================================================
 *  SAYFA HATA SINIRI (K98)
 * ----------------------------------------------------------------------------
 *  Kök yerleşim AYAKTA ama sayfa çizilemedi. Metinler sözlükten geliyor —
 *  burada `NextIntlClientProvider` mevcut.
 *
 *  ⚠ Kardeşi `global-error.tsx`: orada yerleşim de düşmüştür ve sağlayıcı
 *  yoktur; metin oraya sözlükten DOĞRUDAN okunarak veriliyor.
 * ============================================================================
 */
export default function SayfaHatasi({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Hata");
  return (
    <HataEkrani
      digest={error.digest}
      yenidenDene={reset}
      metin={{
        baslik: t("baslik"),
        KONTROL_EDILIYOR: t("KONTROL_EDILIYOR"),
        VERITABANI_YOK: t("VERITABANI_YOK"),
        SUNUCUYA_ULASILAMADI: t("SUNUCUYA_ULASILAMADI"),
        SUNUCU_HATASI: t("SUNUCU_HATASI"),
        neYapmali_VERITABANI_YOK: t("neYapmaliVERITABANI_YOK"),
        neYapmali_SUNUCUYA_ULASILAMADI: t("neYapmaliSUNUCUYA_ULASILAMADI"),
        neYapmali_SUNUCU_HATASI: t("neYapmaliSUNUCU_HATASI"),
        tekrarDene: t("tekrarDene"),
        kodEtiketi: t("kodEtiketi"),
      }}
    />
  );
}
