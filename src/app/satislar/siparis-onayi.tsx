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
  SECIM_GECERSIZ: "onayHataSecim",
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
  /**
   * Kalem → seçilen parti hareketId. Boş = FIFO (önerilen). K110: operatör
   * hangi partiden düşeceğini seçer; maliyet ekranda anında güncellenir.
   */
  const [secimler, setSecimler] = useState<Record<string, string>>({});

  /** Diyalog açılınca maliyet planı SUNUCUDAN gelir — karar rakamla verilir. */
  useEffect(() => {
    if (!acik || onizleme !== null) return;
    basla(async () => {
      setOnizleme(await onayOnizleme(saleId));
    });
  }, [acik, onizleme, saleId]);

  const onayla = () => {
    basla(async () => {
      const s = await siparisiOnayla(saleId, secimler);
      setSonuc(s);
      if (s.tamam) router.refresh();
    });
  };

  const para = (kurus: number) => bicim.para(kurus, "TRY");

  /**
   * Bir kalemde seçili partinin (ya da FIFO önerisinin) birim maliyeti —
   * ekran "düşülecek maliyet"i seçime göre anında günceller. Çok parti
   * gönderiminde adet 1 olduğundan kalem maliyeti = birim maliyet.
   */
  const kalemSeciliMaliyet = (
    kalem: Extract<OnayOnizlemesi, { tamam: true }>["kalemler"][number],
  ): number | null => {
    const secili = secimler[kalem.kalemId];
    if (secili) {
      const s = kalem.secenekler.find((x) => x.hareketId === secili);
      return s ? s.birimMaliyet : kalem.kalemMaliyet;
    }
    return kalem.kalemMaliyet;
  };

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
          <div className="space-y-3 text-sm">
            {onizleme.kalemler.map((kalem) => (
              <div key={kalem.kalemId} className="space-y-1">
                <div className="font-medium tabular-nums">
                  {kalem.sku} · {t("onayKalemAdet", { adet: kalem.adet })}
                </div>
                {/* ── PARTİ SEÇİMİ (K110) — çok parti varsa tıklanabilir
                     seçenekler; tek parti varsa düz bilgi satırı. ────────── */}
                {kalem.secenekler.length > 1 ? (
                  <div
                    className="space-y-1"
                    role="radiogroup"
                    aria-label={t("onaySecimBaslik")}
                  >
                    {(() => {
                      const secili =
                        secimler[kalem.kalemId] ??
                        kalem.secenekler.find((s) => s.onerilen)?.hareketId ??
                        "";
                      return kalem.secenekler.map((s) => (
                        <label
                          key={s.hareketId}
                          className={`flex min-h-11 items-center gap-2 rounded-md border px-2 py-1 tabular-nums md:min-h-9 ${
                            s.secilebilir
                              ? "cursor-pointer border-border hover:bg-muted"
                              : "cursor-not-allowed border-transparent opacity-50"
                          } ${secili === s.hareketId ? "border-primary bg-muted" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`parti-${kalem.kalemId}`}
                            className="size-4"
                            checked={secili === s.hareketId}
                            disabled={!s.secilebilir}
                            onChange={() =>
                              setSecimler((o) => ({ ...o, [kalem.kalemId]: s.hareketId }))
                            }
                          />
                          <span className="flex-1">
                            {s.birimMaliyet === null
                              ? t("onaySecenekMaliyetsiz", {
                                  tarih: bicim.tarih(new Date(s.tarih)),
                                  kalan: s.kalanAdet,
                                })
                              : t("onaySecenek", {
                                  tarih: bicim.tarih(new Date(s.tarih)),
                                  kalan: s.kalanAdet,
                                  maliyet: para(s.birimMaliyet),
                                })}
                          </span>
                          {s.onerilen ? (
                            <span className="text-muted-foreground text-xs">
                              {t("onayOnerilen")}
                            </span>
                          ) : null}
                        </label>
                      ));
                    })()}
                  </div>
                ) : (
                  kalem.onerilenDagitim.map((p, i) => (
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
                  ))
                )}
              </div>
            ))}
            <div className="border-border border-t pt-2 font-semibold tabular-nums">
              {t("onayMaliyetToplam")}:{" "}
              {(() => {
                /** Toplam SEÇİME göre — her kalemin seçili birim maliyeti
                 *  toplanır (çok-parti gönderiminde adet 1); bir kalem
                 *  maliyetsizse toplam bilinmiyor. */
                let toplam: number | null = 0;
                for (const kalem of onizleme.kalemler) {
                  const m = kalemSeciliMaliyet(kalem);
                  if (m === null) {
                    toplam = null;
                    break;
                  }
                  toplam = Math.round((toplam + m) * 100) / 100;
                }
                return toplam === null
                  ? t("onayMaliyetBilinmiyor")
                  : para(toplam);
              })()}
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
