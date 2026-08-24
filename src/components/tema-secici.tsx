"use client";

import { useSyncExternalStore } from "react";
import { FileText, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { KABUK_RENKLERI } from "@/lib/marka/renkler";
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

export const TEMALAR = ["kobalt", "gece", "kagit"] as const;
export type Tema = (typeof TEMALAR)[number];

/**
 * ⚠ KOYU TEMA LİSTESİ AYRI VE AÇIK. `.dark` sınıfı, hangi temanın KOYU
 * olduğuna bağlı — tema ADINDAN türetilemez. Üçüncü tema (kağıt) AÇIK bir
 * tema; `tema !== "kobalt"` gibi bir ölçüt yazsaydık kağıt yanlışlıkla
 * koyu sayılır ve durum renkleri `dark:` varyantına düşerdi: açık zeminde
 * okunmayan soluk yeşil/kırmızı.
 */
export const KOYU_TEMALAR: readonly Tema[] = ["gece"];

export function koyuMu(tema: Tema): boolean {
  return KOYU_TEMALAR.includes(tema);
}

/** Döngü sırası — düğme buradan ilerler. */
export function sonrakiTema(tema: Tema): Tema {
  const i = TEMALAR.indexOf(tema);
  return TEMALAR[(i + 1) % TEMALAR.length];
}

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
  kok.classList.toggle("dark", koyuMu(tema));

  /**
   * ⚠ TELEFONUN SİSTEM ÇUBUĞU DA DÖNER. Uygulama ana ekrandan (PWA olarak)
   * açıldığında üstteki saat/pil şeridinin rengi bu etiketten okunur.
   * Güncellenmeseydi gece temasına geçen kullanıcı koyu bir ekranın
   * tepesinde parlak mavi bir şerit görürdü — ilk bakışta "yarım kalmış"
   * duran tam olarak budur.
   *
   * İlk boyamayı `layout.tsx`teki betik yapıyor; burası yalnız DEĞİŞİMİ
   * taşır, iki yer de aynı sabitten okuyor.
   */
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", KABUK_RENKLERI[tema]);
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

/**
 * ⚠ LİSTEDEN DOĞRULANIR, TEK TEMA ADIYLA KARŞILAŞTIRILMAZ (24.08.2026).
 * Eski hâli `=== "gece" ? "gece" : "kobalt"` idi: üçüncü tema yazılıyken
 * bile "kobalt" okurdu, düğme yanlış ikonu gösterir ve döngü baştan
 * başlardı. Ölçüt artık `TEMALAR` listesi — dördüncü tema eklendiğinde de
 * bedava doğru çalışır.
 */
const anlikOku = (): Tema => {
  const ham = document.documentElement.getAttribute("data-tema");
  return (TEMALAR as readonly string[]).includes(ham ?? "")
    ? (ham as Tema)
    : "kobalt";
};

/** Sunucuda DOM yok; varsayılan Kobalt — betik istemcide düzeltir. */
const sunucudaOku = (): Tema => "kobalt";

export function TemaSecici() {
  const t = useTranslations("Ortak");
  const tema = useSyncExternalStore(abone, anlikOku, sunucudaOku);

  const cevir = () => {
    /**
     * ⚠ İKİLİ ANAHTAR DÖNGÜYE ÇEVRİLDİ (24.08.2026). Üç temada "öteki"
     * diye bir şey yok; `gece ? kobalt : gece` üçüncüyü hiç göstermezdi.
     */
    const yeni: Tema = sonrakiTema(tema);
    temayiUygula(yeni);
    try {
      localStorage.setItem(TEMA_ANAHTARI, yeni);
    } catch {
      /* Gizli sekmede yazılamayabilir — tema yine de değişsin, sessiz kalsın. */
    }
  };

  /**
   * Etiket HEDEFİ söyler: düğme "neye geçeceğini" anlatır, ne olduğunu değil.
   *
   * ⚠ EXHAUSTIVE `Record` — dördüncü tema eklenince DERLENMEZ. Etiket
   * eksik kalsaydı düğme "undefined"a geçmeyi teklif ederdi.
   */
  const hedefEtiketi: Record<Tema, string> = {
    kobalt: t("temaKobalta"),
    gece: t("temaGeceye"),
    kagit: t("temaKagida"),
  };
  const etiket = hedefEtiketi[sonrakiTema(tema)];

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
          {/*
            İKON MEVCUT TEMAYI gösterir, hedefi değil — etiket zaten hedefi
            söylüyor. Üç temanın üçü de kendi ikonunu taşır; exhaustive
            `Record` olduğu için dördüncü tema eklenince derlenmez.
          */}
          {
            (
              {
                kobalt: <Moon className="size-4" />,
                gece: <Sun className="size-4" />,
                kagit: <FileText className="size-4" />,
              } satisfies Record<Tema, React.ReactNode>
            )[tema]
          }
        </Button>
      </TooltipTrigger>
      <TooltipContent>{etiket}</TooltipContent>
    </Tooltip>
  );
}
