"use client";

import { useEffect, useRef, useState } from "react";

import { gorselKirikBildir } from "@/app/gorsel-eylemleri";
import {
  buyukGorselAdresi,
  kucukGorselAdresi,
  onizlemeKonumu,
  ONIZLEME_BOYU,
  type GorselKaynagi,
} from "@/lib/urun-gorseli";

/**
 * ============================================================================
 *  ÜRÜN KÜÇÜK RESMİ (K273) — listelerde adın solunda
 * ----------------------------------------------------------------------------
 *  · Adres KÜÇÜK sürüm (`kucukGorselAdresi` — Trendyol 749 KB → 7,5 KB).
 *  · KUTUYU DOLDURUR (`object-cover`, kullanıcı 25.09: _«resimler kutucuğun
 *    içine dolmalı»_). Pazaryeri görselleri dikey (2:3); `object-contain` kare
 *    kutuda iki yanda boşluk bırakıp ürünü küçültüyordu.
 *  · ÜSTÜNE GELİNCE BÜYÜR (K273-②, kullanıcı 25.09): önizlemede ürün TAM görünür
 *    (`object-contain` — orada kırpma bilgi kaybettirir). Büyük adres YALNIZ
 *    önizleme açıkken istenir: liste açılışı ek yük taşımaz.
 *  · TELEFONDA fare yok → DOKUNUNCA açılır, ikinci dokunuş / başka yere dokunma /
 *    kaydırma kapatır. ⚠ Dokunma tarayıcıda hem "üstüne gelme" hem "tıklama"
 *    üretir; ikisi aynı anda işlenseydi önizleme açılıp hemen kapanırdı. Bu
 *    yüzden fare olayları yalnız `pointerType === "mouse"` iken, tıklama yalnız
 *    fare DEĞİLKEN işlenir.
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
  const [onizleme, setOnizleme] = useState<{ left: number; top: number } | null>(null);
  const kap = useRef<HTMLSpanElement>(null);
  const dokunma = useRef(false);

  /* Dokunarak açılan önizleme: başka yere dokunma ya da kaydırma kapatır. */
  useEffect(() => {
    if (!onizleme) return;
    const kapat = () => setOnizleme(null);
    const disari = (e: PointerEvent) => {
      if (!kap.current?.contains(e.target as Node)) kapat();
    };
    window.addEventListener("scroll", kapat, true);
    document.addEventListener("pointerdown", disari);
    return () => {
      window.removeEventListener("scroll", kapat, true);
      document.removeEventListener("pointerdown", disari);
    };
  }, [onizleme]);

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
  const ac = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setOnizleme(onizlemeKonumu(r, { genislik: window.innerWidth, yukseklik: window.innerHeight }));
  };
  return (
    <span
      ref={kap}
      aria-hidden
      className="shrink-0"
      onPointerDown={(e) => {
        dokunma.current = e.pointerType !== "mouse";
      }}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") ac(e.currentTarget);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setOnizleme(null);
      }}
      onClick={(e) => {
        if (!dokunma.current) return;
        if (onizleme) setOnizleme(null);
        else ac(e.currentTarget);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- pazaryeri CDN'i zaten küçük sürüm veriyor; Next görsel iyileştirmesi kota harcardı */}
      <img
        src={kucukGorselAdresi(url, kaynak)}
        alt=""
        width={boyut}
        height={boyut}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        style={stil}
        className="bg-muted block cursor-zoom-in rounded-md border object-cover"
        onError={() => {
          setKirik(true);
          setOnizleme(null);
          if (variantId) void gorselKirikBildir(variantId);
        }}
      />
      {onizleme ? (
        /* eslint-disable-next-line @next/next/no-img-element -- önizleme de CDN küçültmesinden */
        <img
          src={buyukGorselAdresi(url, kaynak)}
          alt=""
          width={ONIZLEME_BOYU}
          height={ONIZLEME_BOYU}
          decoding="async"
          referrerPolicy="no-referrer"
          style={{ left: onizleme.left, top: onizleme.top, width: ONIZLEME_BOYU, height: ONIZLEME_BOYU }}
          className="pointer-events-none fixed z-50 rounded-lg border bg-white object-contain p-2 shadow-xl"
        />
      ) : null}
    </span>
  );
}
