"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { baglantiHedefi, cihazSec, hedefTemizle, KULLANIM_PAKET_SINIRI, sayfaKalibi, type KullanimTuru } from "@/lib/kullanim/olay";

/**
 * ============================================================================
 *  KULLANIM İZİ — tarayıcı tarafı (kullanıcı kararı 13.10.2026)
 * ----------------------------------------------------------------------------
 *  Hiçbir şey ÇİZMEZ. Sayfa açılışlarını (bir önceki sayfayla: nereden nereye)
 *  ve düğme/bağlantı tıklamalarını biriktirir, `/api/kullanim`a toplu gönderir.
 *
 *  · Gönderim: 10 olayda bir, 15 sn'de bir ve sayfa gizlenirken/kapanırken
 *    (`sendBeacon` — kapanan sekmede de ulaşır, sayfa hızını etkilemez).
 *  · Yalnız TIKLAMA dinlenir; yazma alanları (input/textarea) dinlenmez.
 *  · Kurallar saf gövdede (`lib/kullanim/olay.ts`); sunucu aynı kurallarla
 *    YENİDEN süzer — buradaki süzme yalnız ilk katman.
 *  · İz kullanıcının işini ASLA durdurmaz: gönderim hatası yutulmaz ama
 *    ekrana da çıkmaz; olaylar bir sonraki gönderimde yeniden denenir.
 * ============================================================================
 */

type Olay = { tur: KullanimTuru; sayfa: string; oncekiSayfa?: string; hedef?: string; cihaz: string };

const UC = "/api/kullanim";
const GONDERIM_ADEDI = 10;
const GONDERIM_ARALIGI_MS = 15_000;

export function KullanimIzi() {
  const yol = usePathname();
  const kuyruk = useRef<Olay[]>([]);
  const onceki = useRef<string | null>(null);

  /* Sayfa açılışı — yol değiştikçe bir kez; önceki sayfa «nereden». */
  useEffect(() => {
    if (!yol) return;
    const sayfa = sayfaKalibi(yol);
    if (onceki.current === sayfa) return;
    kuyruk.current.push({
      tur: "SAYFA",
      sayfa,
      ...(onceki.current ? { oncekiSayfa: onceki.current } : {}),
      cihaz: cihazSec(window.innerWidth),
    });
    onceki.current = sayfa;
    if (kuyruk.current.length >= GONDERIM_ADEDI) gonder(kuyruk);
  }, [yol]);

  /* Tıklama + düzenli gönderim + sayfa kapanırken gönderim. */
  useEffect(() => {
    const tikla = (e: MouseEvent) => {
      const hedef = e.target instanceof Element ? e.target.closest("a[href], button, [role='button'], [data-iz]") : null;
      if (!hedef) return;
      const etiket =
        hedef.getAttribute("data-iz") ??
        (hedef instanceof HTMLAnchorElement
          ? baglantiHedefi(hedef.getAttribute("href") ?? "", window.location.origin)
          : hedefTemizle(hedef.getAttribute("aria-label") ?? hedef.textContent));
      if (!etiket) return;
      kuyruk.current.push({ tur: "TIKLAMA", sayfa: sayfaKalibi(window.location.pathname), hedef: etiket, cihaz: cihazSec(window.innerWidth) });
      if (kuyruk.current.length >= GONDERIM_ADEDI) gonder(kuyruk);
    };
    const gizlenince = () => {
      if (document.visibilityState === "hidden") gonder(kuyruk);
    };
    const kapanirken = () => gonder(kuyruk);
    document.addEventListener("click", tikla, { capture: true });
    document.addEventListener("visibilitychange", gizlenince);
    window.addEventListener("pagehide", kapanirken);
    const saat = window.setInterval(() => gonder(kuyruk), GONDERIM_ARALIGI_MS);
    return () => {
      document.removeEventListener("click", tikla, { capture: true });
      document.removeEventListener("visibilitychange", gizlenince);
      window.removeEventListener("pagehide", kapanirken);
      window.clearInterval(saat);
      gonder(kuyruk);
    };
  }, []);

  return null;
}

function gonder(kuyruk: { current: Olay[] }) {
  if (kuyruk.current.length === 0) return;
  const paket = kuyruk.current.splice(0, KULLANIM_PAKET_SINIRI);
  const govde = JSON.stringify({ olaylar: paket });
  let gitti = false;
  try {
    gitti = typeof navigator.sendBeacon === "function" && navigator.sendBeacon(UC, new Blob([govde], { type: "text/plain" }));
  } catch (hata) {
    console.warn("[kullanim] sendBeacon düştü:", hata);
  }
  if (!gitti) {
    fetch(UC, { method: "POST", body: govde, keepalive: true, headers: { "content-type": "text/plain" } }).catch((hata) => {
      console.warn("[kullanim] gönderim düştü, olaylar kuyruğa geri alındı:", hata);
      kuyruk.current.unshift(...paket);
    });
  }
}
