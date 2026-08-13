"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { RAPOR_PENCERELERI, type PencereTuru } from "@/lib/donem";
import { PENCERE_ANAHTARI } from "@/lib/pencere-etiket";

/**
 * Dönem seçici (Kullanıcı Kolaylığı İlkeleri #2, #9, #10).
 *
 * Üç sık kullanılan pencere tek tıkla seçilir; özel aralık yalnızca
 * gerektiğinde açılır. Seçili pencere düğmesinden bellidir — "hangi
 * dönemi görüyorum?" sorusu ekranda cevaplı durur.
 */
export function PencereSecici({
  secili,
  baslangic,
  bitis,
}: {
  secili: PencereTuru;
  baslangic: string;
  bitis: string;
}) {
  const t = useTranslations("Rapor");
  const tPencere = useTranslations("Pencere");
  const router = useRouter();

  const [ozelAcik, setOzelAcik] = useState(secili === "OZEL");
  const [alanlar, setAlanlar] = useState({ baslangic, bitis });

  // Rapor'un menüsü bilinçli olarak DAR — gerekçesi lib/donem.ts'te.
  // "OZEL" burada yok çünkü kendi düğmesi var (aşağıda).
  const SECENEKLER: { tur: PencereTuru; etiket: string }[] =
    RAPOR_PENCERELERI.filter((p) => p !== "OZEL").map((tur) => ({
      tur,
      etiket: tPencere(PENCERE_ANAHTARI[tur]),
    }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SECENEKLER.map((secenek) => (
          <Button
            key={secenek.tur}
            variant={secili === secenek.tur ? "default" : "outline"}
            onClick={() => {
              setOzelAcik(false);
              router.push(`/rapor?pencere=${secenek.tur}`);
            }}
          >
            {secenek.etiket}
          </Button>
        ))}
        <Button
          variant={secili === "OZEL" ? "default" : "outline"}
          onClick={() => setOzelAcik((o) => !o)}
        >
          <CalendarRange />
          {t("ozel")}
        </Button>
      </div>

      {ozelAcik ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
          <div className="space-y-1">
            <Label htmlFor="rapor-baslangic" className="text-xs">
              {t("baslangic")}
            </Label>
            <Input
              id="rapor-baslangic"
              type="date"
              value={alanlar.baslangic}
              onChange={(e) =>
                setAlanlar((o) => ({ ...o, baslangic: e.target.value }))
              }
              className="w-44"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rapor-bitis" className="text-xs">
              {t("bitis")}
            </Label>
            <Input
              id="rapor-bitis"
              type="date"
              value={alanlar.bitis}
              onChange={(e) =>
                setAlanlar((o) => ({ ...o, bitis: e.target.value }))
              }
              className="w-44"
            />
          </div>
          <Button
            onClick={() =>
              router.push(
                `/rapor?pencere=OZEL&baslangic=${alanlar.baslangic}&bitis=${alanlar.bitis}`,
              )
            }
          >
            {t("uygula")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
