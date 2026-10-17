"use client";

import Link from "@/components/niyetli-baglanti";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Volume2, VolumeX, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { yeniSiparisOzeti } from "@/app/kasa-sesi-eylem";
import { sesCal, sesiHazirla } from "@/lib/okuma-sinyali";
import { UYGULAMA } from "@/lib/uygulama";

/**
 * ============================================================================
 *  KASA SESİ — YENİ SİPARİŞ GELİNCE (kullanıcı isteği 15.10.2026)
 * ----------------------------------------------------------------------------
 *  _«Sipariş geldiğinde para kazanıldığı için kasa açılış sesi gelsin.»_
 *  Karar (kullanıcı): AÇIK HER SAYFADA çalar · üst çubukta aç/kapa düğmesi.
 *  · Dakikada bir sunucuya sorar (`yeniSiparisOzeti`, imleç sunucunun saati).
 *  · Ses + kısa bildirim «N yeni sipariş» → Satışlar (İlke #16: rakam kaynağa götürür).
 *  · Tercih CİHAZDA: gerçeğin kaynağı BELLEK, `localStorage` yalnız kalıcılık —
 *    depolama çalışmasa da düğme o oturum boyunca çalışır (anayasa, menü vakası).
 *  · Telefon kilitli/arka plandayken ÇALMAZ (tarayıcı sınırı) — o, anlık bildirim
 *    (push) işidir ve ayrı pakettir.
 * ============================================================================
 */
const ANAHTAR = `${UYGULAMA.teknikAd}-kasa-sesi`;
const ARALIK_MS = 60_000;

/* Tercih deposu — gerçeğin kaynağı BELLEK (`tercih`); `localStorage` yalnız kalıcılık. */
let tercih: boolean | null = null;
const dinleyiciler = new Set<() => void>();
function tercihOku(): boolean {
  if (tercih === null) {
    try {
      tercih = window.localStorage.getItem(ANAHTAR) !== "kapali";
    } catch {
      tercih = true;
    }
  }
  return tercih;
}
function tercihYaz(yeni: boolean) {
  tercih = yeni;
  try {
    window.localStorage.setItem(ANAHTAR, yeni ? "acik" : "kapali");
  } catch {
    /* Kalıcılık yok — bu oturumda yine çalışır. */
  }
  for (const d of dinleyiciler) d();
}
function abone(d: () => void) {
  dinleyiciler.add(d);
  return () => dinleyiciler.delete(d);
}

export function KasaSesi() {
  const t = useTranslations("KasaSesi");
  const acik = useSyncExternalStore(abone, tercihOku, () => true);
  const [bildirim, setBildirim] = useState<number | null>(null);
  const imlec = useRef<string | null>(null);

  useEffect(() => {
    sesiHazirla();
    let iptal = false;
    const sor = async () => {
      try {
        const cevap = await yeniSiparisOzeti(imlec.current);
        if (iptal || cevap === null) return;
        imlec.current = cevap.imlec;
        if (cevap.sayi > 0 && tercihOku()) {
          sesCal("kasa");
          setBildirim(cevap.sayi);
        }
      } catch (hata) {
        /* Ağ yoksa bir sonraki turda yeniden sorulur; imleç ilerlemediği için sipariş kaçmaz. */
        console.error("[kasa-sesi] sorulamadı:", hata);
      }
    };
    void sor();
    const zaman = window.setInterval(() => void sor(), ARALIK_MS);
    return () => {
      iptal = true;
      window.clearInterval(zaman);
    };
  }, []);

  useEffect(() => {
    if (bildirim === null) return;
    const z = window.setTimeout(() => setBildirim(null), 10_000);
    return () => window.clearTimeout(z);
  }, [bildirim]);

  const degistir = () => {
    const yeni = !acik;
    tercihYaz(yeni);
    /* Açınca bir kez çalar: kullanıcı sesi duyar, ses bağlamı da bu dokunuşla açılır. */
    if (yeni) sesCal("kasa");
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0 md:size-8"
            onClick={degistir}
            aria-pressed={acik}
            aria-label={acik ? t("kapat") : t("ac")}
          >
            {acik ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{acik ? t("kapat") : t("ac")}</TooltipContent>
      </Tooltip>
      {bildirim !== null ? (
        <div
          role="status"
          className="bg-card fixed right-4 bottom-24 z-50 flex items-center gap-3 rounded-lg border p-3 shadow-lg md:bottom-6"
        >
          <Link href="/satislar" className="text-primary font-semibold underline-offset-4 hover:underline" onClick={() => setBildirim(null)}>
            {t("yeniSiparis", { sayi: bildirim })}
          </Link>
          <Button type="button" variant="ghost" size="icon" className="size-11 md:size-8" aria-label={t("bildirimiKapat")} onClick={() => setBildirim(null)}>
            <X className="size-4" />
          </Button>
        </div>
      ) : null}
    </>
  );
}
