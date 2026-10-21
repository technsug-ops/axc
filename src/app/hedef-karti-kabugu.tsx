"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UYGULAMA } from "@/lib/uygulama";

/**
 * ============================================================================
 *  HEDEFLER KARTI — KÜÇÜLT / GENİŞLET (K349-②, kullanıcı 21.10.2026)
 * ----------------------------------------------------------------------------
 *  _«Tebrik geldikten sonra çok küçük şekle getirebilmeliyiz; sürekli birçok
 *  satırın görünmesi efektif değil.»_ Küçük hâl TEK SATIR: başlık + «2/6 geçildi»
 *  (+ tebrik işareti) + Genişlet. Rakamlar kaybolmaz, yalnız gizlenir.
 *  · Tercih CİHAZDA: gerçeğin kaynağı BELLEK, `localStorage` yalnız kalıcılık —
 *    depolama çalışmasa da düğme o oturumda çalışır (anayasa, menü vakası).
 *  · Sunucu çıktısı GENİŞ hâli çizer (ilk kare tutarlı); cihaz tercihi okununca küçülür.
 * ============================================================================
 */
const ANAHTAR = `${UYGULAMA.teknikAd}-hedef-karti-kucuk`;
let tercih: boolean | null = null;
const dinleyiciler = new Set<() => void>();

function kucukMu(): boolean {
  if (tercih === null) {
    try {
      tercih = window.localStorage.getItem(ANAHTAR) === "evet";
    } catch {
      tercih = false;
    }
  }
  return tercih;
}
function kucukYaz(yeni: boolean) {
  tercih = yeni;
  try {
    window.localStorage.setItem(ANAHTAR, yeni ? "evet" : "hayir");
  } catch {
    /* Kalıcılık yok — bu oturumda yine çalışır. */
  }
  for (const d of dinleyiciler) d();
}
function abone(d: () => void) {
  dinleyiciler.add(d);
  return () => dinleyiciler.delete(d);
}

export function HedefKartiKabugu({ baslik, gecilen, toplam, ust, children }: {
  baslik: string;
  gecilen: number;
  toplam: number;
  /** Başlık satırının sağındaki bağlantı (Hedefleri düzenle) — iki hâlde de görünür. */
  ust?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("Hedef");
  const kucuk = useSyncExternalStore(abone, kucukMu, () => false);
  return <div data-kart="hedefler" data-kucuk={kucuk ? "evet" : "hayir"} className="bg-card text-card-foreground rounded-xl border shadow-sm">
    <div className={`flex flex-wrap items-center justify-between gap-2 px-4 ${kucuk ? "py-2" : "pt-4 pb-2"}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-semibold">{baslik}</h2>
        {kucuk ? <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
          {gecilen > 0 ? <PartyPopper className="size-4" aria-hidden="true" /> : null}
          {t("ozetSatiri", { gecilen, toplam })}
        </span> : null}
      </div>
      <div className="flex items-center gap-2">
        {ust}
        <Button type="button" variant="ghost" className="min-h-11" aria-expanded={!kucuk} onClick={() => kucukYaz(!kucuk)}>
          {kucuk ? <ChevronDown /> : <ChevronUp />}{kucuk ? t("genislet") : t("kucult")}
        </Button>
      </div>
    </div>
    {kucuk ? null : <div className="space-y-3 px-4 pb-4">{children}</div>}
  </div>;
}
