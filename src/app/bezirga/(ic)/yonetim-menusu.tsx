"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, CalendarCheck, Mail, NotebookText, Package, Wallet, type LucideIcon } from "lucide-react";

import { YONETIM_ADRESLERI, YONETIM_ANA, YONETIM_MENUSU, seciliOge, type YonetimMenuOgesi } from "@/lib/yonetim/menu";

const IKON: Record<YonetimMenuOgesi, LucideIcon> = {
  bugun: CalendarCheck,
  firmalar: Building2,
  paketler: Package,
  odemeler: Wallet,
  eposta: Mail,
  kayitDefteri: NotebookText,
};

export type Rozetler = Partial<Record<YonetimMenuOgesi, { sayi: number; sicak: boolean }>>;

/**
 * YÖNETİM MENÜSÜ — referans iskeletin `aside.side`ı (06.10.2026). Masaüstünde
 * solda sabit, gruplu ve rozetli; telefonda üstte yatay ikon çubuğu, etiket
 * yalnız seçili öğede (referansın 760px kuralı). Kabuk paleti `data-kabuk`
 * ile devralınır — yeni renk uydurulmaz.
 */
export function YonetimMenusu({ rozetler, eposta, marka, cikis }: { rozetler: Rozetler; eposta: string; marka: string; cikis: React.ReactNode }) {
  const t = useTranslations("YonetimMenu");
  const secili = seciliOge(usePathname());
  return (
    <aside
      data-kabuk="ust"
      className="bg-background text-foreground sticky top-0 z-20 flex items-center gap-2 overflow-x-auto px-3 py-2 md:h-svh md:flex-col md:items-stretch md:gap-0 md:overflow-visible md:px-3 md:py-4"
    >
      <Link href={YONETIM_ANA} className="flex shrink-0 items-center gap-2.5 rounded-lg px-1 md:px-2 md:pb-4">
        <span className="bg-foreground text-background grid size-8 place-items-center rounded-lg text-sm font-extrabold">{marka.slice(0, 1)}</span>
        <span className="hidden leading-tight md:block">
          <b className="block text-[0.98rem]">{marka}</b>
          <small className="text-muted-foreground text-xs">{t("altBaslik")}</small>
        </span>
      </Link>
      <nav aria-label={t("menuEtiketi")} className="flex gap-0.5 md:grid md:gap-0.5 md:overflow-y-auto">
        {YONETIM_MENUSU.map((g) => (
          <div key={g.grup} className="contents">
            <div className="text-muted-foreground hidden px-2.5 pt-3.5 pb-1 text-[0.68rem] tracking-[0.08em] uppercase md:block">{t(g.grup)}</div>
            {g.ogeler.map((o) => {
              const Ikon = IKON[o];
              const on = secili === o;
              const r = rozetler[o];
              return (
                <Link
                  key={o}
                  href={YONETIM_ADRESLERI[o]}
                  aria-current={on ? "page" : undefined}
                  title={t(o)}
                  className={`flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-sm whitespace-nowrap ${on ? "bg-secondary font-semibold" : "hover:bg-muted font-medium"}`}
                >
                  <Ikon className="size-[18px] shrink-0 opacity-85" aria-hidden />
                  <span className={on ? "inline" : "hidden md:inline"}>{t(o)}</span>
                  {r && r.sayi > 0 ? (
                    <span
                      className={`ml-auto rounded-full px-2 text-[0.72rem] font-bold tabular-nums ${r.sicak ? "bg-[#E3A83A] text-[#2A1E00]" : "bg-secondary"}`}
                      aria-label={t("rozetEtiketi", { sayi: r.sayi })}
                    >
                      {r.sayi}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="ml-auto flex shrink-0 items-center md:mt-auto md:ml-0 md:grid md:gap-2 md:border-t md:border-[color:var(--border)]/30 md:px-2 md:pt-3">
        <span className="text-muted-foreground hidden text-xs break-all md:block">{eposta}</span>
        {cikis}
      </div>
    </aside>
  );
}
