"use client";

import { useState } from "react";

import { gorselKirikBildir } from "@/app/gorsel-eylemleri";
import { kucukGorselAdresi, type GorselKaynagi } from "@/lib/urun-gorseli";

/**
 * ============================================================================
 *  ÜRÜN KÜÇÜK RESMİ (K273) — listelerde adın solunda
 * ----------------------------------------------------------------------------
 *  · Adres KÜÇÜK sürüm (`kucukGorselAdresi` — Trendyol 749 KB → 7,5 KB).
 *  · Tembel yükleme: resim ekrana girince iner; 50 satır liste yavaşlamaz.
 *  · Görsel yoksa ya da açılmazsa: adın BAŞ HARFİ ile gri kutu — kırık resim
 *    ikonu çizilmez. Açılmazsa sunucuya bildirilir (sunucu kendisi doğrular),
 *    bir sonraki senkron sırayı baştan işletir.
 *  · Süsleme: ad hemen yanında yazıyor → `alt=""` + `aria-hidden` (ekran
 *    okuyucu adı iki kez okumasın).
 * ============================================================================
 */
export function UrunGorseli({
  variantId,
  url,
  kaynak,
  ad,
  boyut = 40,
}: {
  variantId: string | null;
  url: string | null;
  kaynak: GorselKaynagi | null;
  ad: string;
  boyut?: number;
}) {
  const [kirik, setKirik] = useState(false);
  const stil = { width: boyut, height: boyut };
  if (!url || !kaynak || kirik) {
    return (
      <span
        aria-hidden
        style={stil}
        className="bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center rounded-md border text-xs font-semibold uppercase"
      >
        {ad.trim().charAt(0) || "·"}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pazaryeri CDN'i zaten küçük sürüm veriyor; Next görsel iyileştirmesi kota harcardı
    <img
      src={kucukGorselAdresi(url, kaynak)}
      alt=""
      aria-hidden
      width={boyut}
      height={boyut}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      style={stil}
      className="bg-muted shrink-0 rounded-md border object-contain"
      onError={() => {
        setKirik(true);
        if (variantId) void gorselKirikBildir(variantId);
      }}
    />
  );
}
