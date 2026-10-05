"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Power, PowerOff, Wrench } from "lucide-react";

import { HataOzeti } from "@/components/hata-ozeti";
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
import { YONETIM_YOLU } from "@/lib/oturum-imza";

import { firmaDurumu, kurulumuTamamla, type YeniFirmaDurumu } from "./actions";
import { AcilisSonucu } from "./acilis-sonucu";

/**
 * Satırdaki GÖRÜNÜR eylemler (İlke #1). Yarım kurulumda «Kurulumu tamamla»,
 * öteki durumlarda «Pasife al» / «Aktifleştir» — pasife alma onay ister
 * (İlke #6: o firmanın bütün açık oturumları o anda düşer).
 */
export function FirmaEylemleri({
  firmaId,
  firmaAdi,
  durum,
}: {
  firmaId: string;
  firmaAdi: string;
  durum: "TAM" | "YARIM" | "PASIF";
}) {
  const t = useTranslations("Yonetim");
  const ortak = useTranslations("Ortak");
  const [tamamla, tamamlaEylemi, tamamlaniyor] = useActionState<YeniFirmaDurumu, FormData>(kurulumuTamamla, {});
  const [acik, setAcik] = useState(false);
  const [bekliyor, gecis] = useTransition();
  const [mesaj, setMesaj] = useState<{ hata?: string; tamam?: string }>({});

  if (tamamla.durum === "ACILDI") return <AcilisSonucu {...tamamla} />;

  if (durum === "YARIM") {
    return (
      <form action={tamamlaEylemi} className="space-y-2">
        <input type="hidden" name="firmaId" value={firmaId} />
        <Button type="submit" size="sm" variant="outline" className="min-h-11" disabled={tamamlaniyor}>
          <Wrench />
          {tamamlaniyor ? t("aciliyor") : t("kurulumuTamamla")}
        </Button>
        <HataOzeti hatalar={tamamla.hatalar} baslik={t("acilamadi")} />
      </form>
    );
  }

  const aktiflestir = durum === "PASIF";
  /**
   * 05.10.2026 (askı süreci, kullanıcı kararı): sebepsiz «Pasife al» KALKTI —
   * aktif firmada satır, kartın «Askı süreci» bölümüne götürür (sebep, uyarı,
   * onay orada). «Aktifleştir» (askıyı kaldır) burada kalır; sebep istemez.
   */
  if (!aktiflestir) {
    return (
      <Button asChild size="sm" variant="outline" className="min-h-11">
        <Link href={`${YONETIM_YOLU}/firmalar/${firmaId}#aski`}>
          <PowerOff />
          {t("askiSurecineGit")}
        </Link>
      </Button>
    );
  }
  const uygula = () =>
    gecis(async () => {
      setMesaj(await firmaDurumu(firmaId, aktiflestir));
      setAcik(false);
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog open={acik} onOpenChange={setAcik}>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" className="min-h-11">
            {aktiflestir ? <Power /> : <PowerOff />}
            {aktiflestir ? t("aktiflestir") : t("pasifeAl")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{aktiflestir ? t("aktiflestirOnayBaslik", { firma: firmaAdi }) : t("pasifeAlOnayBaslik", { firma: firmaAdi })}</AlertDialogTitle>
            <AlertDialogDescription>{aktiflestir ? t("aktiflestirOnayMetin") : t("pasifeAlOnayMetin")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
            <Button variant={aktiflestir ? "default" : "destructive"} onClick={uygula} disabled={bekliyor}>
              {aktiflestir ? t("aktiflestir") : t("pasifeAl")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {mesaj.hata ? <p role="alert" className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{mesaj.hata}</p> : null}
      {mesaj.tamam ? <p role="status" className={`text-xs ${DURUM_YAZISI.olumlu}`}>{mesaj.tamam}</p> : null}
    </div>
  );
}
