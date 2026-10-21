"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PartyPopper, Target } from "lucide-react";
import Link from "@/components/niyetli-baglanti";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UYGULAMA } from "@/lib/uygulama";
import { guncelTebrikler, type GorunenTebrik } from "@/app/hedefler/tebrik-eylem";

/**
 * ============================================================================
 *  ÜST ÇUBUK — HEDEFLER DÜĞMESİ + KUTLAMA PENCERESİ (K349-③, kullanıcı 21.10.2026)
 * ----------------------------------------------------------------------------
 *  _«Hedefler bilgilendirmesini buraya buton olarak koy, tıklandığında ayrı sayfada
 *  çıksın, hedef tamamlandığında pop-up açılarak kutlansın; panelde direkt kart
 *  olarak bulunmasına gerek yok.»_
 *  · Düğme → `/hedefler`. İçinde bulunulan dönemde geçilmiş hedef varsa yeşil nokta.
 *  · Dakikada bir sorar (`guncelTebrikler`); bu cihazda GÖRÜLMEMİŞ tebrik varsa
 *    pencere açılır, «Teşekkürler» görüldü sayar. Gerçeğin kaynağı BELLEK,
 *    `localStorage` yalnız kalıcılık — depo çalışmasa da o oturumda tekrar açılmaz.
 * ============================================================================
 */
const ANAHTAR = `${UYGULAMA.teknikAd}-gorulen-tebrikler`;
const ARALIK_MS = 60_000;
/** Saklanan kimlik tavanı — liste sonsuz büyümesin; en eskiler düşer. */
const TAVAN = 100;

let gorulen: Set<string> | null = null;
function gorulenler(): Set<string> {
  if (gorulen === null) {
    try {
      const ham = JSON.parse(window.localStorage.getItem(ANAHTAR) ?? "[]");
      gorulen = new Set(Array.isArray(ham) ? ham.filter((x): x is string => typeof x === "string") : []);
    } catch {
      gorulen = new Set();
    }
  }
  return gorulen;
}
function gorulduSay(idler: readonly string[]) {
  const kume = gorulenler();
  for (const id of idler) kume.add(id);
  try {
    window.localStorage.setItem(ANAHTAR, JSON.stringify([...kume].slice(-TAVAN)));
  } catch {
    /* Kalıcılık yok — bu oturumda yine tekrar açılmaz (bellek). */
  }
}

export function HedefDugmesi() {
  const t = useTranslations("Hedef");
  const [tebrikler, setTebrikler] = useState<GorunenTebrik[]>([]);
  const [yeniler, setYeniler] = useState<GorunenTebrik[]>([]);

  useEffect(() => {
    let iptal = false;
    const sor = async () => {
      try {
        const liste = await guncelTebrikler();
        if (iptal) return;
        setTebrikler(liste);
        const gorulmemis = liste.filter((x) => !gorulenler().has(x.id));
        if (gorulmemis.length) setYeniler(gorulmemis);
      } catch (hata) {
        console.error("[hedef-dugmesi] tebrikler sorulamadı:", hata);
      }
    };
    void sor();
    const zaman = window.setInterval(() => void sor(), ARALIK_MS);
    return () => { iptal = true; window.clearInterval(zaman); };
  }, []);

  const kapat = () => { gorulduSay(yeniler.map((x) => x.id)); setYeniler([]); };

  return <>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button asChild variant="outline" size="icon" className="relative size-11 shrink-0 md:size-8">
          <Link href="/hedefler" aria-label={tebrikler.length ? t("dugmeTebrikli", { sayi: tebrikler.length }) : t("dugme")}>
            <Target className="size-4" />
            {tebrikler.length ? <span data-tebrik-noktasi className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[#1D9E75] ring-2 ring-background" aria-hidden="true" /> : null}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tebrikler.length ? t("dugmeTebrikli", { sayi: tebrikler.length }) : t("dugme")}</TooltipContent>
    </Tooltip>
    <Dialog open={yeniler.length > 0} onOpenChange={(acik) => { if (!acik) kapat(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto"><PartyPopper className="size-12 text-[#1D9E75]" aria-hidden="true" /></div>
          <DialogTitle className="text-center text-2xl">{t("tebrikBaslik")}</DialogTitle>
          <DialogDescription className="text-center">{t("popupAciklama")}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1 text-center font-medium">
          {yeniler.map((x) => <li key={x.id}>{t("tebrikSatiri", { olcut: x.olcut, donem: x.donem })}</li>)}
        </ul>
        <DialogFooter className="gap-2 sm:justify-center">
          <Button asChild variant="outline" className="min-h-11"><Link href="/hedefler" onClick={kapat}>{t("popupHedefleriGor")}</Link></Button>
          <Button className="min-h-11" onClick={kapat}>{t("popupKapat")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
