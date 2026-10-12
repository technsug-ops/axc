"use client";

import NextLink from "next/link";
import { useState, type ComponentProps } from "react";

/**
 * ============================================================================
 *  NİYETLİ BAĞLANTI — ÖNCEDEN YÜKLEME YALNIZ NİYET GÖRÜLÜNCE (K332, 12.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: «bilgisayar inanılmaz yavaş». Canlı sunucu kaydı (12.10, 10:44–
 *  11:23) ölçtü: bilgisayarda bir sayfa açılınca ~30–45 sn içinde ~140 istek
 *  gidiyor — Next `<Link>` ekrana GİREN her bağlantıyı önceden yüklüyor: satış
 *  listesinde satır başına ÜÇ (detay · iade · ürün kartı) + sol menünün BÜTÜN
 *  bağlantıları. Her biri sunucuda kabuğu (oturum, menü sayıları) çiziyor ve
 *  3 bağlantılık veritabanını tıkıyor; aynı anda açılan panelin tek bir
 *  `SELECT 1`'i 0,53–0,74 sn bekledi (süre izi, canlı).
 *
 *  Çare Next belgesindeki «hover-triggered prefetch» deseni (kararlı;
 *  `node_modules/next/dist/docs/01-app/02-guides/prefetching.md`): bağlantı
 *  ekrana girince YÜKLENMEZ; fare üzerine gelince, klavyeyle odaklanınca ya da
 *  parmak dokununca yüklenir (`prefetch={null}` = varsayılan davranışa dön).
 *  Çağıran `prefetch`'i AÇIKÇA verirse ona dokunulmaz.
 *
 *  ⚠ İSTİSNA BEYANLI: telefonun alt çubuğu (`alt-cubuk.tsx`, 4 ana bağlantı)
 *  `next/link`'i doğrudan kullanır — orada ekrana girince yükleme ucuz ve
 *  telefondaki hızlı geçişleri (satışlar ~0,3 sn) korur. Yasak ve istisna
 *  bekçide (`yukleniyor:dogrula`).
 * ============================================================================
 */
export default function Link({ prefetch, onMouseEnter, onTouchStart, onFocus, ...props }: ComponentProps<typeof NextLink>) {
  const [niyet, setNiyet] = useState(false);
  const acikVerildi = prefetch === true || prefetch === false;
  return (
    <NextLink
      {...props}
      prefetch={acikVerildi ? prefetch : niyet ? null : false}
      onMouseEnter={(e) => {
        setNiyet(true);
        onMouseEnter?.(e);
      }}
      onTouchStart={(e) => {
        setNiyet(true);
        onTouchStart?.(e);
      }}
      onFocus={(e) => {
        setNiyet(true);
        onFocus?.(e);
      }}
    />
  );
}
