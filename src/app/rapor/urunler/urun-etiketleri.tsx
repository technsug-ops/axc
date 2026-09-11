"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Flag, Star } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  urunFavoriGuncelle,
  urunIncelenecekGuncelle,
  urunSezonGuncelle,
} from "./actions";

/**
 * ============================================================================
 *  ÜRÜN ETİKETLERİ — SATIR İÇİ TOGGLE (K212)
 * ----------------------------------------------------------------------------
 *  `KargoDurumu`/`PaketlendiDurumu` (`/satislar`) İLE AYNI DESEN: tek tık,
 *  onay diyaloğu yok (ledger kaydı değil, geri alınabilir), sonuç ekranda
 *  görünür (İlke #5).
 * ============================================================================
 */
export function UrunEtiketleri({
  urunId,
  isFavorite,
  needsReview,
  season,
}: {
  urunId: string;
  isFavorite: boolean;
  needsReview: boolean;
  season: "YAZ" | "KIS" | null;
}) {
  const t = useTranslations("UrunAnalizi");
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  function calistir(eylem: () => Promise<{ hata?: string }>) {
    setHata(null);
    basla(async () => {
      const sonuc = await eylem();
      if (sonuc.hata) setHata(sonuc.hata);
      else router.refresh();
    });
  }

  const sezonDegistir = (yeni: "YAZ" | "KIS") =>
    calistir(() => urunSezonGuncelle(urunId, season === yeni ? null : yeni));

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={bekliyor}
        aria-pressed={isFavorite}
        aria-label={
          isFavorite ? t("favoriKaldir") : t("favoriIsaretle")
        }
        title={isFavorite ? t("favoriKaldir") : t("favoriIsaretle")}
        /* ⚠ İlke #8 — 44px mobilde, 32px masaüstünde. `KargoDurumu`
           (`satislar/kargo-durumu.tsx`) ile AYNI desen. */
        className={
          "size-11 md:size-8 " +
          (isFavorite ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground")
        }
        onClick={() => calistir(() => urunFavoriGuncelle(urunId, !isFavorite))}
      >
        <Star className={isFavorite ? "fill-current" : ""} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={bekliyor}
        aria-pressed={needsReview}
        aria-label={
          needsReview ? t("incelenecekKaldir") : t("incelenecekIsaretle")
        }
        title={needsReview ? t("incelenecekKaldir") : t("incelenecekIsaretle")}
        className={
          "size-11 md:size-8 " +
          (needsReview ? "text-orange-500 hover:text-orange-600" : "text-muted-foreground")
        }
        onClick={() =>
          calistir(() => urunIncelenecekGuncelle(urunId, !needsReview))
        }
      >
        <Flag className={needsReview ? "fill-current" : ""} />
      </Button>

      <Button
        type="button"
        variant={season === "YAZ" ? "default" : "outline"}
        size="sm"
        disabled={bekliyor}
        aria-pressed={season === "YAZ"}
        title={t("sezonSecYaz")}
        className="h-11 px-2 text-xs md:h-8"
        onClick={() => sezonDegistir("YAZ")}
      >
        {t("sezonYaz")}
      </Button>
      <Button
        type="button"
        variant={season === "KIS" ? "default" : "outline"}
        size="sm"
        disabled={bekliyor}
        aria-pressed={season === "KIS"}
        title={t("sezonSecKis")}
        className="h-11 px-2 text-xs md:h-8"
        onClick={() => sezonDegistir("KIS")}
      >
        {t("sezonKis")}
      </Button>

      {hata ? (
        <span role="alert" className="text-destructive text-xs">
          {hata}
        </span>
      ) : null}
    </span>
  );
}
