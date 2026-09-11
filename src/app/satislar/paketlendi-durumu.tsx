"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Package, PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

import { paketlendiDurumuGuncelle } from "./actions";

/**
 * ============================================================================
 *  PAKETLENDİ İŞARETİ — LİSTEDE GÖRÜNÜR, TEK TIKLA (K207)
 * ----------------------------------------------------------------------------
 *  KargoDurumu ile AYNI DESEN (İlke #10): satırın eylem hücresinde duran,
 *  geri alınabilir bir toggle. Onay diyaloğu yok — bu bir ledger kaydı
 *  değil, operasyonel durum; yanlış basıldıysa aynı yerden geri alınır.
 * ============================================================================
 */
export function PaketlendiDurumu({
  saleId,
  paketliMi,
}: {
  saleId: string;
  paketliMi: boolean;
}) {
  const t = useTranslations("Satis");
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  const guncelle = (yeniDeger: boolean) => {
    setHata(null);
    basla(async () => {
      const sonuc = await paketlendiDurumuGuncelle(saleId, yeniDeger);
      if (sonuc.hata) setHata(sonuc.hata);
      else router.refresh();
    });
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant={paketliMi ? "default" : "outline"}
        size="sm"
        /* ⚠ MOBİLDE 44px — İlke #8. */
        className="h-11 md:h-8"
        disabled={bekliyor}
        onClick={() => guncelle(!paketliMi)}
        aria-label={paketliMi ? t("paketliKaldir") : t("paketliIsaretle")}
        title={paketliMi ? t("paketliKaldir") : t("paketliIsaretle")}
      >
        {paketliMi ? (
          <PackageCheck className="size-4" />
        ) : (
          <Package className="size-4" />
        )}
        {paketliMi ? t("paketSuzgeciHazirlanan") : t("paketSuzgeciBekleyen")}
      </Button>
      {hata ? (
        <span role="alert" className="text-destructive text-xs">
          {hata}
        </span>
      ) : null}
    </span>
  );
}
