"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, type LucideIcon } from "lucide-react";

import { MENU_ADRESLERI } from "@/lib/menu/katalog";
import { ALT_CUBUK_SEKMELERI, MENU_IKONLARI, type AltCubukSekmesi } from "@/lib/menu/ikonlar";

/**
 * ============================================================================
 *  TELEFON ALT BARI — SABİT, BEŞ SEKME (K270, kullanıcı 25.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı Trendyol/Hepsiburada satıcı uygulamalarını gösterip «alt
 *  butonların fonksiyonelliği güven veriyor» dedi; onaylanan demoda bar beş
 *  sekme: Panel · Satışlar · Okut · Alımlar · Menü. Yalnız telefonda
 *  (`md:hidden`); masaüstünde sol menü var, iki gezinme aynı anda durmaz.
 *  ⚠ 44 px dokunma (İlke #8): her sekme `min-h-14`. Alt güvenli alan
 *  (`safe-area-inset-bottom`) bar içinde — çentikli telefonda ev çubuğunun
 *  altına girmez. İçerik sarmalayıcısı `pb-24` ile barın ARKASINA kaymaz
 *  (`layout.tsx`).
 *  ⚠ ADRES ve İKON KATALOGDAN (`MENU_ADRESLERI` · `MENU_IKONLARI`): sol menüyle
 *  aynı gövde, «menu» tek istisna (kendi sayfası).
 * ============================================================================
 */
const ADRESLER: Record<AltCubukSekmesi, string> = {
  panel: MENU_ADRESLERI.panel ?? "/",
  satislar: MENU_ADRESLERI.satislar ?? "/satislar",
  okut: MENU_ADRESLERI.okut ?? "/okut",
  alimlar: MENU_ADRESLERI.alimlar ?? "/alimlar",
  menu: "/menu",
};

const IKONLAR: Record<AltCubukSekmesi, LucideIcon> = {
  panel: MENU_IKONLARI.panel ?? Menu,
  satislar: MENU_IKONLARI.satislar ?? Menu,
  okut: MENU_IKONLARI.okut ?? Menu,
  alimlar: MENU_IKONLARI.alimlar ?? Menu,
  menu: Menu,
};

/** Kök («/») yalnız tam eşleşir; ötekiler alt yollarıyla (`/satislar/123`). */
export function sekmeAktifMi(yol: string, adres: string): boolean {
  if (adres === "/") return yol === "/";
  return yol === adres || yol.startsWith(adres + "/");
}

export function AltCubuk() {
  const yol = usePathname();
  const t = useTranslations("AltCubuk");
  return (
    <nav
      aria-label={t("baslik")}
      className="bg-card fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-0.5 border-t px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden print:hidden"
    >
      {ALT_CUBUK_SEKMELERI.map((sekme) => {
        const Ikon = IKONLAR[sekme];
        const aktif = sekmeAktifMi(yol, ADRESLER[sekme]);
        return (
          <Link
            key={sekme}
            href={ADRESLER[sekme]}
            aria-current={aktif ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] leading-none ${
              aktif ? "bg-accent text-foreground font-semibold" : "text-muted-foreground font-medium"
            }`}
          >
            <Ikon className="size-[22px]" aria-hidden />
            <span>{t(sekme)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
