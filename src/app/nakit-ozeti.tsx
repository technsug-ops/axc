import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, ArrowRight, CalendarClock } from "lucide-react";

import { DurumRozeti } from "@/components/durum-rozeti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import {
  TAKVIM_PARA_BIRIMI,
  type NakitTakvimi,
} from "@/lib/panel/nakit-takvimi";
import {
  DURUM_YAZISI,
  tutarDurumu,
  type DurumRengi,
} from "@/lib/renkler";

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
  const netDurumu: DurumRengi = tutarDurumu(takvim.netPozisyon);
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
        {/* Dar kartta üç kutu: dolgu küçük, tutar text-xl ve break-words —
            ₺210.942,81 gibi uzun tutar kutunun dışına taşmasın (15.08.2026). */}
        <div className="grid gap-2 sm:grid-cols-3">
          {/* ÇIKACAK amber (uyarı), GİRECEK mavi (öngörü) — renk sistemi
              (bkz. lib/panel/renkler.ts). Zemin nötr, yalnız rakam renkli. */}
          <Kutu etiket={t("cikacak")} deger={para(takvim.cikacakToplam)} durum="uyari" />
          <Kutu etiket={t("girecek")} deger={para(takvim.girecekToplam)} durum="bilgi" />
          {/* NET POZİSYON: açıkta kırmızı, fazlada yeşil, sıfırda nötr.
              Kenarlık da renkleniyor ama ZEMİN pastel kalıyor (kısıt #2). */}
          <div className="min-w-0 space-y-1 rounded-lg border p-3">
            <div className="text-muted-foreground text-xs">
              {t("netPozisyon")}
            </div>
            <div
              className={`flex flex-wrap items-baseline gap-1 text-xl font-semibold break-words tabular-nums ${DURUM_YAZISI[netDurumu]}`}
            >
              {para(takvim.netPozisyon)}
              {/* RENK TEK BAŞINA KONUŞMAZ (kısıt #1): durumu kelime söyler. */}
              <DurumRozeti durum={netDurumu} isaretsiz>
                {acikMi ? t("acikVarKisa") : t("acikYokKisa")}
              </DurumRozeti>
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

function Kutu({
  etiket,
  deger,
  durum,
}: {
  etiket: string;
  deger: string;
  durum: DurumRengi;
}) {
  return (
    <div className="min-w-0 space-y-1 rounded-lg border p-3">
      <div className="text-muted-foreground text-xs">{etiket}</div>
      <div
        className={`text-xl font-semibold break-words tabular-nums ${DURUM_YAZISI[durum]}`}
      >
        {deger}
      </div>
    </div>
  );
}
