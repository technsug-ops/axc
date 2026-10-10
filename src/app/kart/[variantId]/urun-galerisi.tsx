"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buyukGorselAdresi, kucukGorselAdresi, type GorselKaynagi } from "@/lib/urun-gorseli";

/**
 * ============================================================================
 *  ÜRÜN GALERİSİ — ALGORİTMO ÖLÇÜSÜ (K330, kullanıcı 10.10.2026)
 * ----------------------------------------------------------------------------
 *  «Kârlılık kartında mutlaka ürünün Algoritmo ölçüsünde resmi olsun.»
 *  Büyük resim 208 px kare (Algoritmo ~200 px) + yanda küçük resimler +
 *  «‹ 1/9 ›» geçiş. Ana resim önce, kanal galerisi ardından (`kartResimleri`).
 *
 *  ⚠ İlke #8: oklar telefonda 44 px. ⚠ Resim yüklenemezse (kırık adres)
 *  kutu boş kalmaz — ürün adının ilk harfi çizilir.
 * ============================================================================
 */
export function UrunGalerisi({
  resimler,
  kaynak,
  ad,
}: {
  resimler: readonly string[];
  kaynak: GorselKaynagi | null;
  ad: string;
}) {
  const t = useTranslations("UrunKarti");
  const [sira, setSira] = useState(0);
  const [kirik, setKirik] = useState<ReadonlySet<number>>(new Set());
  const k = (kaynak ?? "ELLE") as GorselKaynagi;
  const adet = resimler.length;
  const git = (n: number) => setSira(((n % adet) + adet) % adet);
  const harf = (ad.trim()[0] ?? "?").toLocaleUpperCase("tr");

  return (
    <div className="flex gap-3 max-sm:flex-col">
      <div className="relative size-52 shrink-0 overflow-hidden rounded-lg border bg-white">
        {adet === 0 || kirik.has(sira) ? (
          <div className="text-muted-foreground grid size-full place-items-center text-5xl font-semibold" aria-label={t("resimYok")}>
            {harf}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={buyukGorselAdresi(resimler[sira]!, k)}
            alt={ad}
            className="size-full object-contain"
            onError={() => setKirik((s) => new Set(s).add(sira))}
          />
        )}
        {adet > 1 ? (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-black/60 px-1 text-xs font-medium text-white">
            <button
              type="button"
              onClick={() => git(sira - 1)}
              aria-label={t("resimOnceki")}
              className="grid size-8 place-items-center max-sm:size-11"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="tabular-nums">
              {sira + 1}/{adet}
            </span>
            <button
              type="button"
              onClick={() => git(sira + 1)}
              aria-label={t("resimSonraki")}
              className="grid size-8 place-items-center max-sm:size-11"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
      {adet > 1 ? (
        <div className="flex max-h-52 gap-2 overflow-auto sm:flex-col max-sm:max-w-full">
          {resimler.map((u, i) => (
            <button
              key={u}
              type="button"
              onClick={() => setSira(i)}
              aria-label={t("resimNumarasi", { sira: i + 1 })}
              aria-current={i === sira}
              className={`size-16 shrink-0 overflow-hidden rounded-md border-2 bg-white ${
                i === sira ? "border-[var(--se-vurgu)]" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={kucukGorselAdresi(u, k)} alt="" loading="lazy" className="size-full object-contain" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
