"use client";

import { useState, useTransition } from "react";
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
import { DURUM_YAZISI } from "@/lib/renkler";

import { siparisiOnayla, type SiparisOnaySonucu } from "./actions";

/**
 * ============================================================================
 *  SİPARİŞ ONAYI — API'DEN GELEN SATIŞI STOĞA VE KÂRA BAĞLAR (K164)
 * ----------------------------------------------------------------------------
 *  ⚠ ONAY DİYALOĞU VAR (İlke #6): bu bir LEDGER yazımıdır — stok düşer,
 *  maliyet damgalanır; geri alması iptal akışı ister. `KargoDurumu`nun
 *  diyalogsuz olması onun tek tıkla geri alınabilir OLMASINDANDIR; burada
 *  o gerekçe geçerli değil.
 *
 *  ⚠ HATA KODLA GELİR, SABİT EŞLEMEYLE METNE ÇEVRİLİR (K57-③): ham hata
 *  ekrana basılmaz. Sonuç GÖRÜNÜR (İlke #5): başarıda kaç kalem/adet
 *  işlendiği ve kârın hesaplanıp hesaplanmadığı yazar.
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
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [bekliyor, basla] = useTransition();
  const [sonuc, setSonuc] = useState<SiparisOnaySonucu | null>(null);

  const onayla = () => {
    basla(async () => {
      const s = await siparisiOnayla(saleId);
      setSonuc(s);
      if (s.tamam) router.refresh();
    });
  };

  return (
    <AlertDialog
      open={acik}
      onOpenChange={(a) => {
        setAcik(a);
        if (!a) setSonuc(null);
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
              <Button type="button" disabled={bekliyor} onClick={onayla}>
                {bekliyor ? t("onayIsleniyor") : t("onayla")}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
