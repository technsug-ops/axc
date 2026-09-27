"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * TELEFONDA KATLANAN SÜZGEÇ KABI (K293, kullanıcı 28.09.2026: «mobilde ürün
 * analizi filtrelerden dolayı çok verimsiz»). Telefonda liste ancak dokuz
 * süzgeç bloğunun ALTINDA başlıyordu. Arama dışındaki her şey bu kabın içinde:
 * telefonda varsayılan KAPALI, masaüstünde HER ZAMAN AÇIK (düğme yok).
 *
 * Ortak süzgeç çubuğuyla AYNI görünüm (İlke #10): «Süzgeçler» düğmesi + açık
 * süzgeç sayısı rozeti; ÖZET düğmenin içinde yazar — liste okunurken hangi
 * süzgecin açık olduğu, paneli açmadan görünür (unutulan süzgeç rakamı
 * «yanlış» gösterirdi).
 *
 * ⚠ İçerik KAPALIYKEN DE DOM'DA (yalnız `hidden`): form alanları gönderilir,
 * ekran okuyucu ve JavaScript'siz davranış bozulmaz.
 */
export function TelefonSuzgecKabi({
  baslik,
  ozet,
  acikSayi,
  children,
}: {
  baslik: string;
  /** Açık süzgeçlerin kısa özeti («Trendyol · Bu ay · Marka: 2»); boşsa başlık yazar. */
  ozet: string;
  acikSayi: number;
  children: React.ReactNode;
}) {
  const [acik, setAcik] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full justify-between md:hidden"
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
      >
        <span className="flex min-w-0 items-center gap-2">
          <SlidersHorizontal className="size-4 shrink-0" />
          <span className="truncate">{ozet !== "" ? ozet : baslik}</span>
        </span>
        {acikSayi > 0 ? (
          <Badge variant="secondary" className="shrink-0">
            {acikSayi}
          </Badge>
        ) : null}
      </Button>
      <div className={`${acik ? "block" : "hidden"} space-y-4 md:block`}>{children}</div>
    </>
  );
}
