"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * ============================================================================
 *  TEMA SEÇİCİ — KOBALT / GECE
 * ----------------------------------------------------------------------------
 *  Kullanıcı 22.08.2026: _"bu iki temayı kullanmak istiyorum. Panel kullanıcısı
 *  ikisinden birini istediği zaman seçebilsin."_
 *
 *  ── ÜST ÇUBUKTA, AYARLARDA DEĞİL ────────────────────────────────────────
 *  Tema bir AYAR değil bir TERCİHTİR ve gün içinde değişir (sabah aydınlık
 *  ofis, akşam karanlık oda). "Ayarlar → Görünüm → Tema" zinciri kurulunca
 *  kimse değiştirmez; İlke #9 (az tıkla) burada doğrudan işliyor.
 *
 *  ── SEÇİM TARAYICIDA KALIR, VERİTABANINDA DEĞİL ─────────────────────────
 *  ⚠ Tema KİŞİSEL ve CİHAZA BAĞLIDIR: aynı kullanıcı masaüstünde aydınlık,
 *  telefonda karanlık isteyebilir. Veritabanına yazılsaydı iki cihaz
 *  birbirinin tercihini ezerdi ve çok kullanıcılı yapıda kimin tercihi
 *  olduğu ayrıca sorulurdu. `localStorage` doğru yer.
 *
 *  ── SUNUCU BUNU BİLMEZ, BİLMEK ZORUNDA DA DEĞİL ─────────────────────────
 *  İlk boyama `layout.tsx`teki küçük betikle React'ten ÖNCE yapılıyor
 *  (FOUC yok). Bu bileşen yalnız DEĞİŞTİRMEK için var ve temayı DOM'dan
 *  okur — kendi durumunda kopya tutmaz.
 * ============================================================================
 */

export type Tema = "kobalt" | "gece";

export const TEMA_ANAHTARI = "selliora-tema";

/**
 * Temayı belgeye uygular.
 *
 * ⚠ `.dark` SINIFI DA EKLENİR ve bu şart. Uygulamanın durum renkleri
 * (`lib/renkler.ts`) koyu tema varyantlarını Tailwind'in `dark:` öneki ile
 * taşıyor ve o önek `&:is(.dark *)` olarak tanımlı. Yalnız `data-tema`
 * yazsaydık yüzeyler kararır, yeşil/kırmızı rozetler AÇIK tema tonunda
 * kalırdı — koyu zeminde okunmaz hâle gelirlerdi.
 */
export function temayiUygula(tema: Tema) {
  const kok = document.documentElement;
  kok.setAttribute("data-tema", tema);
  kok.classList.toggle("dark", tema === "gece");
}

/**
 * ── TEMA DOM'DAN OKUNUR, REACT DURUMUNDAN DEĞİL ─────────────────────────
 *
 * ⚠ İLK YAZIMDA `useEffect` + `setState` kullanılmıştı ve lint haklı olarak
 * reddetti: efekt gövdesinde setState zincirleme render tetikler. Ama asıl
 * mesele mimari — temanın DOĞRU KAYNAĞI React durumu değil, `<html>`
 * üzerindeki `data-tema` özniteliğidir. Onu `<head>`teki betik React
 * yüklenmeden ÖNCE yazıyor.
 *
 * `useSyncExternalStore` tam bu iş için var: dışarıdaki bir kaynağı okur ve
 * değiştiğinde bileşeni tazeler. Yan fayda — tema başka bir yerden
 * değiştirilse (ikinci bir sekme, klavye kısayolu) düğme kendiliğinden
 * doğru ikonu gösterir.
 */
function abone(geriCagir: () => void): () => void {
  const gozlemci = new MutationObserver(geriCagir);
  gozlemci.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-tema"],
  });
  return () => gozlemci.disconnect();
}

const anlikOku = (): Tema =>
  document.documentElement.getAttribute("data-tema") === "gece"
    ? "gece"
    : "kobalt";

/** Sunucuda DOM yok; varsayılan Kobalt — betik istemcide düzeltir. */
const sunucudaOku = (): Tema => "kobalt";

export function TemaSecici() {
  const t = useTranslations("Ortak");
  const tema = useSyncExternalStore(abone, anlikOku, sunucudaOku);

  const cevir = () => {
    const yeni: Tema = tema === "gece" ? "kobalt" : "gece";
    temayiUygula(yeni);
    try {
      localStorage.setItem(TEMA_ANAHTARI, yeni);
    } catch {
      /* Gizli sekmede yazılamayabilir — tema yine de değişsin, sessiz kalsın. */
    }
  };

  /** Etiket HEDEFİ söyler: düğme "neye geçeceğini" anlatır, ne olduğunu değil. */
  const etiket = tema === "gece" ? t("temaKobalta") : t("temaGeceye");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={cevir}
          aria-label={etiket}
          className="size-11 shrink-0 md:size-8"
        >
          {/* Sunucuda Kobalt varsayılır; betik istemcide düzeltir. Düğme
              her hâlükârda bir ikon taşır, yerleşim zıplamaz. */}
          {tema === "gece" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{etiket}</TooltipContent>
    </Tooltip>
  );
}
