"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PackageCheck } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_YAZISI } from "@/lib/renkler";

import {
  onayOnizleme,
  siparisiOnayla,
  type OnayOnizlemesi,
  type SiparisOnaySonucu,
} from "./actions";

/**
 * ============================================================================
 *  SİPARİŞ ONAYI — MALİYET GÖRÜLMEDEN ONAY VERİLMEZ (K164-③)
 * ----------------------------------------------------------------------------
 *  ⚠ Halil düzeltmesi 04.09.2026: ilk sürüm genel bir cümleyle onaylatıyordu
 *  — _"maliyet onaylayarak gitmemiz gerekiyordu."_ Diyalog artık açılır
 *  açılmaz FIFO planını SUNUCUDAN çeker (salt okuma) ve kararın kendisini
 *  basar: hangi parti, kaç adet, hangi birim maliyet, toplam ne düşecek.
 *  Onay düğmesi rakam GELMEDEN etkinleşmez.
 *
 *  ⚠ ONAY DİYALOĞU VAR (İlke #6): bu bir LEDGER yazımıdır — stok düşer,
 *  maliyet damgalanır; geri alması iptal akışı ister.
 *
 *  ⚠ HATA KODLA GELİR, SABİT EŞLEMEYLE METNE ÇEVRİLİR (K57-③).
 * ============================================================================
 */

const HATA_ANAHTARI: Record<
  Exclude<SiparisOnaySonucu, { tamam: true }>["kod"],
  string
> = {
  BULUNAMADI: "onayHataBulunamadi",
  ICE_AKTARMA_DEGIL: "onayHataUygunDegil",
  KARGOLANMIS: "onayHataKargolanmis",
  IPTALLI: "onayHataIptalli",
  ZATEN_ONAYLI: "onayHataZatenOnayli",
  TARIHSEL: "onayHataUygunDegil",
  SAYIM_DURAKSADI: "onayHataSayim",
  DONEM_KAPALI: "onayHataDonem",
  STOK_YETERSIZ: "onayHataStok",
  YAZILAMADI: "onayHataYazilamadi",
};

export function SiparisOnayi({ saleId, kod }: { saleId: string; kod: string }) {
  const t = useTranslations("Satis");
  const bicim = useBicim();
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [bekliyor, basla] = useTransition();
  const [onizleme, setOnizleme] = useState<OnayOnizlemesi | null>(null);
  const [sonuc, setSonuc] = useState<SiparisOnaySonucu | null>(null);

  /** Diyalog açılınca maliyet planı SUNUCUDAN gelir — karar rakamla verilir. */
  useEffect(() => {
    if (!acik || onizleme !== null) return;
    basla(async () => {
      setOnizleme(await onayOnizleme(saleId));
    });
  }, [acik, onizleme, saleId]);

  const onayla = () => {
    basla(async () => {
      const s = await siparisiOnayla(saleId);
      setSonuc(s);
      if (s.tamam) router.refresh();
    });
  };

  const para = (kurus: number) => bicim.para(kurus, "TRY");

  return (
    <AlertDialog
      open={acik}
      onOpenChange={(a) => {
        setAcik(a);
        if (!a) {
          setSonuc(null);
          setOnizleme(null);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-11 md:h-8"
          title={t("onayla")}
        >
          <PackageCheck className="size-4" />
          {t("onayla")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("onayBaslik", { kod })}</AlertDialogTitle>
          <AlertDialogDescription>
            {sonuc === null ? t("onayMetin") : null}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* ── MALİYET PLANI — kararın kendisi ────────────────────────────── */}
        {sonuc !== null ? null : onizleme === null ? (
          <p className="text-sm" role="status">
            {t("onayOnizlemeYukleniyor")}
          </p>
        ) : onizleme.tamam ? (
          <div className="space-y-2 text-sm">
            {onizleme.kalemler.map((kalem) => (
              <div key={kalem.sku} className="space-y-0.5">
                <div className="font-medium tabular-nums">
                  {kalem.sku} · {t("onayKalemAdet", { adet: kalem.adet })}
                </div>
                {kalem.partiler.map((p, i) => (
                  <div key={i} className="text-muted-foreground pl-3 tabular-nums">
                    {p.birimMaliyet === null
                      ? t("onayPartiMaliyetsiz", {
                          tarih: bicim.tarih(new Date(p.tarih)),
                          adet: p.adet,
                        })
                      : t("onayPartiSatiri", {
                          tarih: bicim.tarih(new Date(p.tarih)),
                          adet: p.adet,
                          maliyet: para(p.birimMaliyet),
                        })}
                  </div>
                ))}
              </div>
            ))}
            <div className="border-border border-t pt-2 font-semibold tabular-nums">
              {t("onayMaliyetToplam")}:{" "}
              {onizleme.toplamMaliyet === null
                ? t("onayMaliyetBilinmiyor")
                : para(onizleme.toplamMaliyet)}
            </div>
          </div>
        ) : (
          <p className={`text-sm ${DURUM_YAZISI.olumsuz}`} role="alert">
            {t(HATA_ANAHTARI[onizleme.kod])}
            {onizleme.ayrinti ? ` (${onizleme.ayrinti})` : ""}
          </p>
        )}

        {/* ── SONUÇ ──────────────────────────────────────────────────────── */}
        {sonuc === null ? null : sonuc.tamam ? (
          <p className={`text-sm ${DURUM_YAZISI.olumlu}`} role="status">
            {sonuc.karTazelendi
              ? t("onayBasari", { kalem: sonuc.kalem, adet: sonuc.adet })
              : t("onayBasariKarYok", { kalem: sonuc.kalem, adet: sonuc.adet })}
          </p>
        ) : (
          <p className={`text-sm ${DURUM_YAZISI.olumsuz}`} role="alert">
            {t(HATA_ANAHTARI[sonuc.kod])}
            {sonuc.ayrinti ? ` (${sonuc.ayrinti})` : ""}
          </p>
        )}

        <AlertDialogFooter>
          {sonuc?.tamam ? (
            <AlertDialogCancel>{t("onayKapat")}</AlertDialogCancel>
          ) : (
            <>
              <AlertDialogCancel disabled={bekliyor}>
                {t("onayVazgec")}
              </AlertDialogCancel>
              {/**
               * ⛔ RAKAM GELMEDEN ONAY YOK: plan yüklenmemiş ya da hatalıysa
               * düğme pasif — "maliyet görülmeden onay verilmez" kuralının
               * mekanik hâli.
               */}
              <Button
                type="button"
                disabled={bekliyor || onizleme === null || !onizleme.tamam}
                onClick={onayla}
              >
                {bekliyor ? t("onayIsleniyor") : t("onayla")}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
