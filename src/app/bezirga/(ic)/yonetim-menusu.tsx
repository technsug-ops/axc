"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, CalendarCheck, LogOut, Mail, NotebookText, Package, Wallet, type LucideIcon } from "lucide-react";

import { YONETIM_ADRESLERI, YONETIM_ANA, YONETIM_MENUSU, seciliOge, type YonetimMenuOgesi } from "@/lib/yonetim/menu";

import { yonetimCikisYap } from "../actions";

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
 * YÖNETİM MENÜSÜ — referans `aside.side` BİREBİR (yonetim.css `.yn-side`):
 * koyu yeşil zemin, logo kutusu + ad + «Yönetim», gruplu öğeler, sayı rozeti
 * (dikkat isteyen hardal), altta kim + Çıkış. Telefonda (≤900px) üstte yatay
 * ikon çubuğu, etiket yalnız seçili öğede.
 */
export function YonetimMenusu({ rozetler, eposta, marka }: { rozetler: Rozetler; eposta: string; marka: string }) {
  const t = useTranslations("YonetimMenu");
  const secili = seciliOge(usePathname());
  return (
    <aside className="yn-side">
      <Link href={YONETIM_ANA} className="yn-brand">
        <span className="logo">{marka.slice(0, 1)}</span>
        <div>
          <b>{marka}</b>
          <small>{t("altBaslik")}</small>
        </div>
      </Link>
      <nav aria-label={t("menuEtiketi")} className="yn-snav">
        {YONETIM_MENUSU.map((g) => (
          <div key={g.grup} style={{ display: "contents" }}>
            <div className="grp">{t(g.grup)}</div>
            {g.ogeler.map((o) => {
              const Ikon = IKON[o];
              const r = rozetler[o];
              return (
                <Link key={o} href={YONETIM_ADRESLERI[o]} aria-current={secili === o ? "page" : undefined} title={t(o)} className={secili === o ? "on" : undefined}>
                  <Ikon aria-hidden />
                  <span className="lbl">{t(o)}</span>
                  {r && r.sayi > 0 ? (
                    <span className={`badge${r.sicak ? " hot" : ""}`} aria-label={t("rozetEtiketi", { sayi: r.sayi })}>{r.sayi}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="yn-sfoot">
        <span className="who">{eposta}</span>
        <form action={yonetimCikisYap} className="yn-row">
          <button type="submit" className="yn-btn sm" title={t("cikis")}>
            <LogOut aria-hidden />
            <span className="lbl">{t("cikis")}</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
