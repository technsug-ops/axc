import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, ArrowRight, CalendarClock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import {
  TAKVIM_PARA_BIRIMI,
  type NakitTakvimi,
} from "@/lib/panel/nakit-takvimi";

/**
 * ============================================================================
 *  NAKİT ÖZETİ — PANELDEKİ HÂLİ (ÜÇ RAKAM)
 * ----------------------------------------------------------------------------
 *  14.08.2026 — KULLANICI HAKLIYDI, PANEL BOZULMUŞTU.
 *
 *  Nakit takvimi ilk teslimde 14 günü GÜN GÜN panele basıyordu. Hakediş
 *  kalemleri sipariş SATIRI başına geldiği için tek bir günde onlarca satır
 *  oluşuyor, üstelik çoğunun başlığı "—" çıkıyordu (kalem bir satışa
 *  bağlanmamışsa gösterilecek ad yok). Sonuç: isimsiz rakam duvarı ve
 *  "özet" olmaktan çıkmış bir panel.
 *
 *  DERS: PANEL YÖNETİCİ ÖZETİDİR. Buraya bir LİSTE değil, bir HÜKÜM konur —
 *  "önümüzdeki 14 günde durumum ne?" sorusunun üç rakamlık cevabı. Ayrıntı
 *  kendi sayfasında yaşar (`/nakit-takvimi`).
 *
 *  ÖLÇÜT: panelde duran her blok tek bakışta okunabilmeli. Satır sayısı
 *  veriyle birlikte BÜYÜYEN hiçbir şey panele konmaz — bugün 3 satırla
 *  masum görünen liste, hacim artınca ekranı yutar.
 * ============================================================================
 */

export async function NakitOzeti({
  takvim,
  pencereGun,
}: {
  takvim: NakitTakvimi;
  pencereGun: number;
}) {
  const t = await getTranslations("NakitTakvimi");
  const bicim = await bicimlendirici();

  const para = (n: number) => bicim.para(n, TAKVIM_PARA_BIRIMI);
  const acikMi = takvim.netPozisyon < 0;
  const gecikmisSayisi = takvim.gecikmis.length;
  const vadesizSayisi = takvim.vadesizler.length;

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CalendarClock className="size-5" />
            {t("ozetBaslik", { gun: pencereGun })}
          </span>
          {/* Ayrıntıya TEK TIK: panelde hüküm, sayfada döküm. */}
          <Link
            href="/nakit-takvimi"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm font-normal"
          >
            {t("takvimiAc")}
            <ArrowRight className="size-4" />
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Kutu etiket={t("cikacak")} deger={para(takvim.cikacakToplam)} />
          <Kutu etiket={t("girecek")} deger={para(takvim.girecekToplam)} />
          <div
            className={`space-y-1 rounded-lg border p-4 ${
              acikMi ? "border-destructive/50 bg-destructive/10" : ""
            }`}
          >
            <div className="text-muted-foreground text-xs">
              {t("netPozisyon")}
            </div>
            <div
              className={`text-2xl font-semibold ${acikMi ? "text-destructive" : ""}`}
            >
              {para(takvim.netPozisyon)}
            </div>
          </div>
        </div>

        {/* UYARI SATIRI — yalnız gerçekten bir şey varsa çıkar. Panelde
            "sorun yok" demek için satır harcanmaz; sorun VARSA görünür. */}
        {gecikmisSayisi > 0 ? (
          <p className="text-destructive flex items-center gap-2 text-sm">
            <AlertTriangle className="size-4 shrink-0" />
            {t("gecikmisUyarisi", {
              sayi: gecikmisSayisi,
              tutar: para(takvim.gecikmisCikacak + takvim.gecikmisGirecek),
            })}
          </p>
        ) : null}

        {vadesizSayisi > 0 ? (
          <p className="text-muted-foreground text-xs">
            {t("vadesizUyarisi", { sayi: vadesizSayisi })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Kutu({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="space-y-1 rounded-lg border p-4">
      <div className="text-muted-foreground text-xs">{etiket}</div>
      <div className="text-2xl font-semibold">{deger}</div>
    </div>
  );
}
