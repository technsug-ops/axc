"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Ürün etiketi basıcı (K291). Adet ürün başına girilir; «Yazdır» her adet
 * için AYRI sayfa üretir (`@page` = seçili etiket ölçüsü) — termal yazıcı her
 * sayfayı bir etiket olarak keser. Ekranda liste, baskıda yalnız etiketler.
 */
export function EtiketBasici({
  urunler,
  en,
  boy,
}: {
  urunler: { id: string; kod: string; ad: string; svg: string }[];
  en: number;
  boy: number;
}) {
  const t = useTranslations("UrunEtiketi");
  const [adet, setAdet] = useState<Record<string, number>>(() =>
    urunler.length === 1 ? { [urunler[0]!.id]: 1 } : {},
  );
  const toplam = Object.values(adet).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-3">
      <style>{`@media print { @page { size: ${en}mm ${boy}mm; margin: 0; } }`}</style>
      <div className="divide-y rounded-lg border print:hidden">
        {urunler.map((u) => (
          <div key={u.id} className="grid items-center gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{u.ad}</p>
              <p className="font-mono text-xs">{u.kod}</p>
            </div>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={500}
              value={adet[u.id] ?? ""}
              placeholder={t("adetYerTutucu")}
              aria-label={t("adetEtiketi", { ad: u.ad })}
              onChange={(e) => {
                const n = Math.max(0, Math.min(500, Math.floor(Number(e.target.value) || 0)));
                setAdet((a) => ({ ...a, [u.id]: n }));
              }}
              className="h-11 w-24 md:h-9"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button type="button" className="h-11 md:h-10" disabled={toplam === 0} onClick={() => window.print()}>
          <Printer />
          {t("yazdir", { sayi: toplam })}
        </Button>
        {toplam === 0 ? <p className="text-muted-foreground text-sm">{t("adetGir")}</p> : null}
      </div>

      {/* Baskı alanı: her adet ayrı sayfa. Ekranda gizli. */}
      <div className="hidden print:block">
        {urunler.flatMap((u) =>
          Array.from({ length: adet[u.id] ?? 0 }, (_, i) => (
            <div
              key={`${u.id}-${i}`}
              style={{ width: `${en}mm`, height: `${boy}mm`, breakAfter: "page", overflow: "hidden" }}
              // SVG sunucuda üretildi (Code128 çizici + kaçışlı metin); dış girdi yok.
              dangerouslySetInnerHTML={{ __html: u.svg }}
            />
          )),
        )}
      </div>
    </div>
  );
}
