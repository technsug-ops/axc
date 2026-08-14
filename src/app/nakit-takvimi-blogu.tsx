import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import { gunMetninden } from "@/lib/donem";
import {
  TAKVIM_PARA_BIRIMI,
  TAKVIM_PENCERELERI,
  type NakitTakvimi,
  type TakvimPenceresi,
  type TakvimSatiri,
} from "@/lib/panel/nakit-takvimi";

/**
 * ============================================================================
 *  NAKİT TAKVİMİ — "NE ZAMAN SIKIŞACAĞIM?"
 * ----------------------------------------------------------------------------
 *  Panelin ikinci bloğu: eylemden sonra ÖNGÖRÜ, rapordan önce.
 *
 *  DÖNEM SÜZGECİNDEN ETKİLENMEZ ve bu EKRANDA YAZAR. Süzgeç geçmişi
 *  süzer, takvim İLERİYE bakar; ikisi aynı düğmeye bağlansaydı "bugün"
 *  seçildiğinde takvim boşalır ve kullanıcı ekranı bozuk sanardı. Notu
 *  yazmazsak da "neden değişmiyor?" sorusu doğar — sessiz davranış yok.
 *
 *  BİLİNEN SINIR AÇIKÇA YAZILI: kart ekstreleri için ödeme kaydı
 *  tutulmadığından gecikmiş takibi yalnız hakedişten beslenir. Kullanıcı
 *  "kartlarım neden gecikmişte yok" diye sormasın diye ekranda duruyor
 *  ("sessiz yokluk yok, açık sınır").
 * ============================================================================
 */

export async function NakitTakvimiBlogu({
  takvim,
  pencere,
  pencereAdresi,
}: {
  takvim: NakitTakvimi;
  pencere: TakvimPenceresi;
  /** Pencere düğmelerinin adresi — diğer süzgeçler korunur. */
  pencereAdresi: (gun: TakvimPenceresi) => string;
}) {
  const t = await getTranslations("NakitTakvimi");
  const bicim = await bicimlendirici();

  const para = (n: number) => bicim.para(n, TAKVIM_PARA_BIRIMI);
  const acikMi = takvim.netPozisyon < 0;

  /** Yalnız hareketi olan günler çizilir; boş gün listesi ekranı doldurur. */
  const doluGunler = takvim.gunler.filter((g) => g.satirlar.length > 0);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <CalendarClock className="size-5" />
          {t("baslik", { gun: pencere })}
        </CardTitle>
        {/* SÜZGEÇ İLİŞKİSİ EKRANDA YAZAR (bkz. dosya başlığı). */}
        <p className="text-muted-foreground text-sm">{t("donemBagimsiz")}</p>

        <div className="flex flex-wrap gap-2 pt-1">
          {TAKVIM_PENCERELERI.map((gun) => (
            <Link
              key={gun}
              href={pencereAdresi(gun)}
              className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm md:min-h-9 ${
                gun === pencere ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
            >
              {t("pencereDugmesi", { gun })}
            </Link>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ------------------------- ALT SATIR ÜSTTE -------------------------
            Toplam ve net pozisyon EN ÖNEMLİ rakam; listenin altında kalırsa
            telefonda görünmesi için kaydırmak gerekir. */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Ozet
            etiket={t("cikacak")}
            deger={para(takvim.cikacakToplam)}
            ikon={<ArrowUpRight className="size-4" />}
          />
          <Ozet
            etiket={t("girecek")}
            deger={para(takvim.girecekToplam)}
            ikon={<ArrowDownLeft className="size-4" />}
          />
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
            <div className="text-muted-foreground text-xs">
              {acikMi ? t("acikVar") : t("acikYok")}
            </div>
          </div>
        </div>

        {takvim.gecikmisCikacak + takvim.gecikmisGirecek > 0 ? (
          <p className="text-muted-foreground text-xs">
            {t("gecikmisDahil", {
              tutar: para(takvim.gecikmisCikacak + takvim.gecikmisGirecek),
            })}
          </p>
        ) : null}

        {/* --------------------------- GECİKMİŞ --------------------------- */}
        {takvim.gecikmis.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-amber-500/50 bg-amber-500/5 p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="size-4" />
              {t("gecikmisBaslik", { sayi: takvim.gecikmis.length })}
            </p>
            <ul className="space-y-1">
              {takvim.gecikmis.map((s, i) => (
                <SatirGoster key={`gec-${i}`} satir={s} bicim={bicim} />
              ))}
            </ul>
          </div>
        ) : null}

        {/* KART SINIRI — sessiz yokluk yok, açık sınır. */}
        <p className="text-muted-foreground text-xs">{t("kartSiniriNotu")}</p>

        {/* ---------------------------- GÜNLER ---------------------------- */}
        {doluGunler.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            {t("hareketYok", { gun: pencere })}
          </p>
        ) : (
          <div className="space-y-3">
            {doluGunler.map((g) => {
              const tarih = gunMetninden(g.gun);
              return (
                <div key={g.gun} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {tarih ? bicim.tarih(tarih) : g.gun}
                    </span>
                    <span className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                      {g.cikacak > 0 ? (
                        <span>
                          {t("cikacak")}: {para(g.cikacak)}
                        </span>
                      ) : null}
                      {g.girecek > 0 ? (
                        <span>
                          {t("girecek")}: {para(g.girecek)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {g.satirlar.map((s, i) => (
                      <SatirGoster key={`${g.gun}-${i}`} satir={s} bicim={bicim} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* --------------------------- VADESİZLER ---------------------------
            SIFIR VARSAYILMAZ: vadesi ya da tutarı bilinmeyen satır takvime
            girmez ama YOK SAYILMAZ; "?" ile burada durur. */}
        {takvim.vadesizler.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <p className="text-sm font-medium">
              {t("vadesizBaslik", { sayi: takvim.vadesizler.length })}
            </p>
            <p className="text-muted-foreground text-xs">{t("vadesizNotu")}</p>
            <ul className="space-y-1">
              {takvim.vadesizler.map((s, i) => (
                <li key={`vadesiz-${i}`} className="text-sm">
                  <Link href={s.adres} className="underline underline-offset-2">
                    {s.baslik}
                  </Link>
                  <span className="text-muted-foreground"> · ?</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {takvim.disaridaKalanlar.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            {t("disaridaNotu", { sayi: takvim.disaridaKalanlar.length })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Ozet({
  etiket,
  deger,
  ikon,
}: {
  etiket: string;
  deger: string;
  ikon: React.ReactNode;
}) {
  return (
    <div className="space-y-1 rounded-lg border p-4">
      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        {ikon}
        {etiket}
      </div>
      <div className="text-2xl font-semibold">{deger}</div>
    </div>
  );
}

/** Tek satır: kaynağı rozetle belli, tıklanınca kaynağına gider. */
function SatirGoster({
  satir,
  bicim,
}: {
  satir: TakvimSatiri;
  bicim: { para: (n: number, p: "TRY" | "EUR") => string };
}) {
  const cikis = satir.yon === "CIKACAK";
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <Link href={satir.adres} className="truncate underline underline-offset-2">
          {satir.baslik}
        </Link>
        {/* TAHMİN GERÇEK GİBİ GÖSTERİLMEZ: kaynak rozeti hep görünür. */}
        {satir.kaynak === "HAKEDIS_TAHMIN" ? (
          <Badge variant="outline" className="text-[10px]">
            tahmin
          </Badge>
        ) : null}
      </span>
      <span
        className={`shrink-0 tabular-nums ${cikis ? "text-destructive" : "text-emerald-600"}`}
      >
        {cikis ? "−" : "+"}
        {bicim.para(satir.tutar, TAKVIM_PARA_BIRIMI as "TRY")}
      </span>
    </li>
  );
}
