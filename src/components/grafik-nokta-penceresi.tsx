"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

/**
 * ============================================================================
 *  GRAFİKTE NOKTAYA DOKUN → KÜÇÜK PENCEREDE RAKAMLAR (K109)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği (31.08.2026): _"buradaki noktalarda üzerine
 *  tıklandığında küçük bir pencerede rakamlar görünebilsin."_
 *
 *  ⭐ GRAFİK SUNUCUDA KALIR. Çizgi grafikleri «sıfır istemci JS» kararıyla
 *  sunucuda çiziliyor ve biçimleyici FONKSİYON alıyor — fonksiyon istemciye
 *  geçemez. Bu yüzden grafik istemciye taşınmadı: sunucu SVG'yi bu sarmalayıcıya
 *  `children` olarak verir, pencere metinleri sunucuda BİÇİMLENMİŞ gelir
 *  (`pencereler`). Sarmalayıcı yalnız hangi noktanın seçildiğini tutar.
 *
 *  ⚠ PENCERE SVG'NİN İÇİNDE DEĞİL, ÜSTÜNDE (HTML). SVG telefonda ~%45'e
 *  küçülüyor (min 560 px ↔ 1240 birim); içine yazılan 13 birimlik yazı
 *  ekranda ~6 px olurdu. HTML pencere her ekranda gerçek 14 px'tir.
 *
 *  ⚠ DOKUNMA ALANI BOŞLUKSUZ ŞERİTLER (`data-nokta`): grafiğin iç alanı
 *  noktalar arası orta çizgilerden dilimlenir; nereye dokunulursa en yakın
 *  noktanın penceresi açılır — ölü bölge yok. Telefonda 12 noktalı grafikte
 *  şerit ~45 px; 31 noktalı günlük grafikte ~17 px geniş ama ~100 px uzun ve
 *  komşusuna bitişik (İlke #8'in derdi ISKALANAN hedef; burada ıska yok).
 *
 *  Kapanış: aynı noktaya yeniden dokun · × · Esc · grafiğin dışına dokun.
 *  Erişilebilirlik: SVG `aria-hidden` kalır; asıl okunabilir hâl grafiğin
 *  altındaki tablodur (değişmedi).
 * ============================================================================
 */

export type NoktaPenceresi = {
  baslik: string;
  satirlar: { ad: string; deger: string }[];
};

export function GrafikNoktaPenceresi({
  pencereler,
  children,
}: {
  /** Sıra, SVG'deki `data-nokta` sırasıyla AYNI; `null` = o noktada pencere yok. */
  pencereler: (NoktaPenceresi | null)[];
  children: ReactNode;
}) {
  const ortak = useTranslations("Ortak");
  const kap = useRef<HTMLDivElement>(null);
  const [secili, setSecili] = useState<{ i: number; sol: number; ust: number; ustte: boolean; hiza: "sol" | "orta" | "sag" } | null>(null);

  useEffect(() => {
    if (secili === null) return;
    const tus = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSecili(null);
    };
    const disari = (e: PointerEvent) => {
      if (kap.current && !kap.current.contains(e.target as Node)) setSecili(null);
    };
    document.addEventListener("keydown", tus);
    document.addEventListener("pointerdown", disari);
    return () => {
      document.removeEventListener("keydown", tus);
      document.removeEventListener("pointerdown", disari);
    };
  }, [secili]);

  function tikla(e: React.MouseEvent<HTMLDivElement>) {
    const hedef = (e.target as Element).closest("[data-nokta]");
    const kutu = kap.current;
    if (!hedef || !kutu) return;
    const i = Number(hedef.getAttribute("data-nokta"));
    if (!Number.isInteger(i) || pencereler[i] == null) return;
    if (secili?.i === i) {
      setSecili(null);
      return;
    }
    /** Noktanın EKRANDAKİ yeri — SVG ölçeği ne olursa olsun doğru. */
    const isaret = kutu.querySelector(`[data-nokta-isaret="${i}"]`) ?? hedef;
    const n = isaret.getBoundingClientRect();
    const k = kutu.getBoundingClientRect();
    const sol = n.left + n.width / 2 - k.left + kutu.scrollLeft;
    const ust = n.top + n.height / 2 - k.top;
    /** Nokta grafiğin üst yarısındaysa pencere ALTINA açılır (tepeden taşmasın). */
    /** Kenardaki noktada pencere ortalanırsa yarısı kaydırılamayan alana taşar. */
    const hiza = sol < 140 ? "sol" : sol > kutu.scrollWidth - 140 ? "sag" : "orta";
    setSecili({ i, sol, ust, ustte: ust > k.height / 2, hiza });
  }

  const p = secili === null ? null : pencereler[secili.i];

  return (
    <div ref={kap} className="relative overflow-x-auto" onClick={tikla}>
      {children}
      {secili !== null && p ? (
        <>
          <div
            aria-hidden
            className="bg-primary/40 pointer-events-none absolute top-0 bottom-0 w-px"
            style={{ left: secili.sol }}
          />
          <div
            role="status"
            className="bg-popover text-popover-foreground absolute z-10 w-max max-w-[16rem] rounded-md border p-2 text-sm shadow-md"
            style={{
              left: secili.sol,
              top: secili.ust,
              transform: `translate(${secili.hiza === "sol" ? "-12px" : secili.hiza === "sag" ? "calc(-100% + 12px)" : "-50%"}, ${secili.ustte ? "calc(-100% - 10px)" : "10px"})`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium">{p.baslik}</span>
              <button
                type="button"
                aria-label={ortak("kapat")}
                onClick={(e) => {
                  e.stopPropagation();
                  setSecili(null);
                }}
                className="text-muted-foreground hover:text-foreground -m-2 flex size-11 items-center justify-center md:size-7"
              >
                <X className="size-4" />
              </button>
            </div>
            <dl className="mt-1 space-y-0.5">
              {p.satirlar.map((s) => (
                <div key={s.ad} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{s.ad}</dt>
                  <dd className="font-medium whitespace-nowrap tabular-nums">{s.deger}</dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      ) : null}
    </div>
  );
}
