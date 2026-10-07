"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, FileText, Palette, RotateCcw, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  HAZIR_RENKLER,
  KISISEL_DEGISKENLERI,
  KISISEL_VARSAYILAN,
  KOSE_SINIRI,
  kisiselKayit,
  kisiselTema,
  type KisiselKayit,
} from "@/lib/marka/kisisel-tema";
import { KABUK_RENKLERI, KISISEL_ANAHTARI, TEMA_ANAHTARI } from "@/lib/marka/renkler";
import { cn } from "@/lib/utils";

/**
 * ============================================================================
 *  TEMA SEÇİCİ — KOBALT / KAĞIT / KİŞİSEL
 * ----------------------------------------------------------------------------
 *  Kullanıcı 22.08.2026: _"bu iki temayı kullanmak istiyorum. Panel kullanıcısı
 *  ikisinden birini istediği zaman seçebilsin."_
 *
 *  ⭐ 07.10.2026 — kullanıcı: gece «röntgen çekilmiş gibi, sağlıklı değil»,
 *  pembe «uymadı»; «marka mavisi ve kahve dışında kaliteli bir kontrast ile
 *  kişiler istedikleri tema rengini ve kart yuvarlaklığını oluşturamazlar mı?»
 *  Gece ve pembe KALDIRILDI. Düğme döngü olmaktan çıktı, AÇILIR PANEL oldu:
 *  üç tema yan yana, Kişisel seçilince renk + köşe ayarı aynı panelde
 *  (kullanıcı kararı: «üst çubuktaki tema düğmesi»). Kontrast sözü
 *  `lib/marka/kisisel-tema.ts`te tutulur, burada değil.
 *
 *  ── ÜST ÇUBUKTA, AYARLARDA DEĞİL ────────────────────────────────────────
 *  Tema bir AYAR değil bir TERCİHTİR ve gün içinde değişir. "Ayarlar →
 *  Görünüm → Tema" zinciri kurulunca kimse değiştirmez; İlke #9.
 *
 *  ── SEÇİM TARAYICIDA KALIR, VERİTABANINDA DEĞİL ─────────────────────────
 *  ⚠ Tema KİŞİSEL ve CİHAZA BAĞLIDIR: aynı kullanıcı masaüstünde bir renk,
 *  telefonda başka renk isteyebilir. `localStorage` doğru yer. Kişisel
 *  temanın renk/köşe kaydı da aynı kurala uyar.
 *
 *  ── SUNUCU BUNU BİLMEZ, BİLMEK ZORUNDA DA DEĞİL ─────────────────────────
 *  İlk boyama `layout.tsx`teki küçük betikle React'ten ÖNCE yapılıyor
 *  (FOUC yok). Bu bileşen yalnız DEĞİŞTİRMEK için var ve temayı DOM'dan
 *  okur — kendi durumunda kopya tutmaz.
 * ============================================================================
 */

export const TEMALAR = ["kobalt", "kagit", "kisisel"] as const;
export type Tema = (typeof TEMALAR)[number];

/**
 * Temanın PALET dosyası (`src/styles/tema-<ad>.css`). Kişisel temanın kendi
 * dosyası yok: kobalt yüzeyleri üstüne kurulur, vurgu ve köşe satır içi
 * değişkenle ezilir. Exhaustive — yeni tema paletini beyan etmeden derlenmez;
 * `pwa:dogrula` her temayı BU haritadan okur.
 */
export const PALET_DOSYASI: Record<Tema, string> = {
  kobalt: "kobalt",
  kagit: "kagit",
  kisisel: "kobalt",
};

/**
 * ⚠ KOYU TEMA LİSTESİ AYRI VE AÇIK. `.dark` sınıfı, hangi temanın KOYU
 * olduğuna bağlı — tema ADINDAN türetilemez. 07.10.2026'dan beri liste BOŞ
 * (gece kaldırıldı); mekanizma yerinde durur, koyu bir tema yeniden
 * kurulursa buraya yazılır ve `pwa:dogrula` paletinden doğrular.
 */
export const KOYU_TEMALAR: readonly Tema[] = [];

export function koyuMu(tema: Tema): boolean {
  return KOYU_TEMALAR.includes(tema);
}

/** Kişisel temanın satır içi değişkenleri — yalnız izinli adlar yazılır/silinir. */
function kisiselDegiskenleriYaz(kayit: KisiselKayit | null) {
  const stil = document.documentElement.style;
  for (const ad of KISISEL_DEGISKENLERI) {
    const deger = kayit?.degiskenler[ad];
    if (deger) stil.setProperty(ad, deger);
    else stil.removeProperty(ad);
  }
}

function kisiselOku(): KisiselKayit {
  try {
    const ham = JSON.parse(localStorage.getItem(KISISEL_ANAHTARI) ?? "null") as { renk?: unknown; kose?: unknown } | null;
    if (ham) return kisiselKayit(kisiselTema({ renk: ham.renk, kose: ham.kose }));
  } catch {
    /* Bozuk ya da okunamayan kayıt: varsayılan kişisel temayla devam edilir ve
       panelde o renk/köşe görünür — kullanıcı neyin uygulandığını görür. */
  }
  return kisiselKayit(kisiselTema(KISISEL_VARSAYILAN));
}

/**
 * Temayı belgeye uygular.
 *
 * ⚠ `.dark` SINIFI DA EKLENİR (koyu tema varsa) — durum renklerinin `dark:`
 * varyantları ona bakar. ⚠ Kişisel temadan çıkılınca satır içi değişkenler
 * SİLİNİR: kalsalardı Kobalt'a dönen kullanıcı eski kişisel rengini görürdü
 * (satır içi stil `[data-tema]` kurallarını ezer).
 */
export function temayiUygula(tema: Tema, kisisel: KisiselKayit | null = null) {
  const kok = document.documentElement;
  kok.setAttribute("data-tema", tema);
  kok.classList.toggle("dark", koyuMu(tema));
  kisiselDegiskenleriYaz(tema === "kisisel" ? kisisel : null);
  /**
   * ⚠ TELEFONUN SİSTEM ÇUBUĞU DA DÖNER (PWA). İlk boyamayı `layout.tsx`teki
   * betik yapıyor; burası yalnız DEĞİŞİMİ taşır, iki yer de aynı sabitten okur.
   */
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", KABUK_RENKLERI[tema]);
}

/**
 * ── TEMA DOM'DAN OKUNUR, REACT DURUMUNDAN DEĞİL ─────────────────────────
 * Doğru kaynak `<html>`deki `data-tema`; onu `<head>`teki betik React'ten önce
 * yazıyor. `useSyncExternalStore` dışarıdaki kaynağı okur ve değişince tazeler.
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
 * Kaldırılan bir tema adı (gece/pembe) DOM'da kalmışsa Kobalt okunur.
 */
const anlikOku = (): Tema => {
  const ham = document.documentElement.getAttribute("data-tema");
  return (TEMALAR as readonly string[]).includes(ham ?? "")
    ? (ham as Tema)
    : "kobalt";
};

/** Sunucuda DOM yok; varsayılan Kobalt — betik istemcide düzeltir. */
const sunucudaOku = (): Tema => "kobalt";

function yazDepoya(anahtar: string, deger: string) {
  try {
    localStorage.setItem(anahtar, deger);
  } catch {
    /* Gizli sekmede yazılamayabilir — tema bu oturumda yine de uygulanır
       (gerçeğin kaynağı DOM; depolama yalnız kalıcılık). */
  }
}

export function TemaSecici() {
  const t = useTranslations("Ortak");
  const tema = useSyncExternalStore(abone, anlikOku, sunucudaOku);
  /* Panel açılınca okunur — sunucuda localStorage yok; ilk boyamada hidrasyon
     farkı doğmasın diye açılışa kadar beklenir. */
  const [kisisel, setKisisel] = useState<KisiselKayit | null>(null);

  const temaSec = (yeni: Tema) => {
    const kayit = yeni === "kisisel" ? (kisisel ?? kisiselOku()) : null;
    if (kayit) setKisisel(kayit);
    temayiUygula(yeni, kayit);
    yazDepoya(TEMA_ANAHTARI, yeni);
  };

  const kisiselDegistir = (girdi: { renk?: string; kose?: number }) => {
    const onceki = kisisel ?? kisiselOku();
    const kayit = kisiselKayit(kisiselTema({ renk: girdi.renk ?? onceki.renk, kose: girdi.kose ?? onceki.kose }));
    setKisisel(kayit);
    temayiUygula("kisisel", kayit);
    yazDepoya(TEMA_ANAHTARI, "kisisel");
    yazDepoya(KISISEL_ANAHTARI, JSON.stringify(kayit));
  };

  /**
   * ⚠ EXHAUSTIVE `Record` — yeni tema eklenince DERLENMEZ; adı ya da ikonu
   * eksik bir seçenek panelde "undefined" yazmaz.
   */
  const temaAdi: Record<Tema, string> = {
    kobalt: t("temaKobalt"),
    kagit: t("temaKagit"),
    kisisel: t("temaKisisel"),
  };
  const ikon = (
    {
      kobalt: <Sun className="size-4" />,
      kagit: <FileText className="size-4" />,
      kisisel: <Palette className="size-4" />,
    } satisfies Record<Tema, React.ReactNode>
  );
  const ornekRenk: Record<Tema, string> = {
    kobalt: "#12356B",
    kagit: KABUK_RENKLERI.kagit,
    kisisel: kisisel?.degiskenler["--se-vurgu"] ?? KISISEL_VARSAYILAN.renk,
  };
  const sonuc = kisisel ? kisiselTema({ renk: kisisel.renk, kose: kisisel.kose }) : null;

  return (
    <Popover onOpenChange={(acik) => { if (acik && !kisisel) setKisisel(kisiselOku()); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("temaAc", { tema: temaAdi[tema] })}
          title={t("temaAc", { tema: temaAdi[tema] })}
          className="size-11 shrink-0 md:size-8"
        >
          {ikon[tema]}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <p className="mb-2 text-sm font-semibold">{t("temaBaslik")}</p>
        <div role="radiogroup" aria-label={t("temaBaslik")} className="grid grid-cols-3 gap-2">
          {TEMALAR.map((ad) => (
            <button
              key={ad}
              type="button"
              role="radio"
              aria-checked={tema === ad}
              onClick={() => temaSec(ad)}
              className={cn(
                "flex min-h-11 flex-col items-center gap-1 rounded-md border p-2 text-xs transition-colors hover:bg-accent",
                tema === ad && "border-primary ring-1 ring-primary",
              )}
            >
              <span className="flex size-6 items-center justify-center rounded-full text-white" style={{ background: ornekRenk[ad] }}>
                {tema === ad ? <Check className="size-3.5" /> : null}
              </span>
              {temaAdi[ad]}
            </button>
          ))}
        </div>

        {tema === "kisisel" && sonuc ? (
          <div className="mt-4 space-y-3 border-t pt-3">
            <div>
              <p className="mb-1.5 text-xs font-medium">{t("temaRenk")}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {HAZIR_RENKLER.map((renk) => (
                  <button
                    key={renk}
                    type="button"
                    onClick={() => kisiselDegistir({ renk })}
                    aria-label={t("temaRenkSec", { renk })}
                    aria-pressed={sonuc.secilen === renk}
                    className={cn(
                      "size-11 rounded-full border-2 border-transparent md:size-8",
                      sonuc.secilen === renk && "border-foreground",
                    )}
                    style={{ background: renk }}
                  />
                ))}
                <label className="relative flex size-11 cursor-pointer items-center justify-center rounded-full border md:size-8" title={t("temaKendiRengin")}>
                  <Palette className="size-4" aria-hidden="true" />
                  <span className="sr-only">{t("temaKendiRengin")}</span>
                  <input
                    type="color"
                    value={sonuc.secilen.toLowerCase()}
                    onChange={(e) => kisiselDegistir({ renk: e.target.value })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
              </div>
              {sonuc.koyulasti ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {t("temaKoyulasti", { secilen: sonuc.secilen, uygulanan: sonuc.uygulanan })}
                </p>
              ) : null}
              {sonuc.anlamUyarisi ? (
                <p className="mt-1.5 text-xs text-[var(--se-bil-ink)]">
                  {t(sonuc.anlamUyarisi === "kar" ? "temaKarYakin" : "temaZararYakin")}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="tema-kose" className="mb-1.5 flex justify-between text-xs font-medium">
                <span>{t("temaKose")}</span>
                <span className="tabular-nums text-muted-foreground">{t("temaKosePx", { px: sonuc.kose })}</span>
              </label>
              <input
                id="tema-kose"
                type="range"
                min={KOSE_SINIRI.alt}
                max={KOSE_SINIRI.ust}
                step={1}
                value={sonuc.kose}
                onChange={(e) => kisiselDegistir({ kose: Number(e.target.value) })}
                className="h-11 w-full accent-primary md:h-6"
              />
            </div>
            {/* Önizleme — kart ve düğme o anki değişkenlerle çizilir. */}
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3 shadow-sm">
              <span className="text-xs text-muted-foreground">{t("temaOnizleme")}</span>
              <Button type="button" size="sm" tabIndex={-1}>{t("temaOrnekDugme")}</Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 w-full md:min-h-8"
              onClick={() => kisiselDegistir({ renk: KISISEL_VARSAYILAN.renk, kose: KISISEL_VARSAYILAN.kose })}
            >
              <RotateCcw className="size-3.5" />
              {t("temaVarsayilan")}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
