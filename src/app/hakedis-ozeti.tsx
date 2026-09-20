import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, HandCoins, TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import { HAKEDIS_ESIKLERI } from "@/lib/hakedis/model";
import type { BeklenenHakedisOzeti } from "@/lib/panel/hakedis-ozeti";

/**
 * ============================================================================
 *  BEKLENEN HAKEDİŞ ÖZETİ — RAPOR SAYFASINDAKİ HÂLİ (K222-③)
 * ----------------------------------------------------------------------------
 *  `NakitOzeti`nin AYNI kabuğu: özet burada bir HÜKÜMDÜR, döküm değil.
 *  Ayrıntı (hangi sipariş, hangi kanal) `/hakedis`te — buraya tek tıkla
 *  gidiliyor (İlke #13).
 * ============================================================================
 */
export async function HakedisOzeti({ ozet }: { ozet: BeklenenHakedisOzeti }) {
  const t = await getTranslations("Hakedis");
  const bicim = await bicimlendirici();

  return (
    /** ⚠ AYNI KABUK: `NakitOzeti` ile yan yana durduğunda ikisi de aynı
        yükseklikte olsun diye `flex h-full flex-col`. */
    <Card className="flex h-full min-w-0 flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <HandCoins className="size-5" />
            {t("bekleyenPara")}
          </span>
          <Link
            href="/hakedis"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm font-normal"
          >
            {t("hakedisiAc")}
            <ArrowRight className="size-4" />
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-center gap-3">
        {ozet.toplamlar.length > 0 ? (
          <div className="flex flex-1 flex-wrap items-center justify-center gap-2">
            {ozet.toplamlar.map((tp) => (
              <div
                key={tp.paraBirimi}
                className="flex min-w-32 flex-1 flex-col items-center justify-center gap-1 rounded-lg border p-3 text-center"
              >
                <div className="text-muted-foreground text-xs">
                  {tp.paraBirimi}
                </div>
                <div className="text-[clamp(1.125rem,2.1vw,1.875rem)] leading-tight font-semibold break-words tabular-nums">
                  {bicim.para(tp.tutar, tp.paraBirimi)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center text-sm">
            {t("bekleyenParaNotu")}
          </p>
        )}

        {ozet.gecikenSayisi > 0 ? (
          <p className="text-destructive flex items-center justify-center gap-2 text-center text-sm">
            <TriangleAlert className="size-4 shrink-0" />
            {ozet.gecikenSayisi} {t("gecikti")}
            {" · "}
            {t("gecikmeNotu", { gun: HAKEDIS_ESIKLERI.gecikmeIsGunu })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
