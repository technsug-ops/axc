"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, TriangleAlert, UserCheck, UserX } from "lucide-react";

import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

import {
  firmaKullaniciParolaSifirla,
  firmaUyeligiDurumu,
  type ParolaSifirlamaDurumu,
  type UyelikDurumuSonucu,
} from "../actions";

type Satir = {
  id: string;
  ad: string | null;
  eposta: string;
  rol: string;
  /** Bu firmadaki üyelik aktif mi. */
  aktif: boolean;
  /** Kişi kaydı tamamen kapalı mı — kart bunu değiştirmez. */
  hesapKapali: boolean;
  /** Sunucuda biçimlendirilmiş (İstanbul günü). */
  sonGiris: string | null;
  parolaDegismeli: boolean;
  uyelikSayisi: number;
};

/**
 * Firma kartındaki kullanıcı listesi. Satır eylemleri (onaylı — İlke #6):
 * «Parolayı sıfırla» (geçici parola YALNIZ bir kez görünür) ve «Bu firmada
 * pasife al / aktif et» — YALNIZ bu firmadaki üyelik (05.10.2026, kullanıcı
 * kararı; ilk sürümde aktiflik kişideydi ve bu düğme bilerek yoktu).
 */
export function KartKullanicilari({ firmaId, kullanicilar }: { firmaId: string; kullanicilar: Satir[] }) {
  const t = useTranslations("Yonetim");
  if (kullanicilar.length === 0) return <p className="text-muted-foreground text-sm">{t("kullaniciYok")}</p>;
  return (
    <ul className="divide-y rounded-lg border">
      {kullanicilar.map((k) => (
        <KullaniciSatiri key={k.id} firmaId={firmaId} k={k} />
      ))}
    </ul>
  );
}

function KullaniciSatiri({ firmaId, k }: { firmaId: string; k: Satir }) {
  const t = useTranslations("Yonetim");
  const ortak = useTranslations("Ortak");
  const [acik, setAcik] = useState(false);
  const [bekliyor, gecis] = useTransition();
  const [sonuc, setSonuc] = useState<ParolaSifirlamaDurumu>({});

  const sifirla = () =>
    gecis(async () => {
      setSonuc(await firmaKullaniciParolaSifirla(firmaId, k.id));
      setAcik(false);
    });
  const [durumAcik, setDurumAcik] = useState(false);
  const [durumSonucu, setDurumSonucu] = useState<UyelikDurumuSonucu>({});
  const durumDegistir = () =>
    gecis(async () => {
      setDurumSonucu(await firmaUyeligiDurumu(firmaId, k.id));
      setDurumAcik(false);
    });

  return (
    <li className="space-y-2 px-3 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="min-w-36 font-medium">{k.ad ?? k.eposta}</span>
        <KopyalanabilirKod deger={k.eposta} etiket={t("eposta")} />
        <Badge variant="outline">{k.rol}</Badge>
        {!k.aktif ? <Badge variant="destructive">{t("buFirmadaPasif")}</Badge> : null}
        {k.hesapKapali ? <Badge variant="destructive">{t("hesapKapali")}</Badge> : null}
        {k.parolaDegismeli ? <Badge variant="secondary">{t("parolaDegismeli")}</Badge> : null}
        <span className="text-muted-foreground text-xs">
          {k.sonGiris ? t("sonGiris", { tarih: k.sonGiris }) : t("hicGirisYok")}
          {k.uyelikSayisi > 1 ? ` · ${t("cokFirmaUyesi", { sayi: k.uyelikSayisi })}` : ""}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <AlertDialog open={durumAcik} onOpenChange={setDurumAcik}>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="min-h-11">
                {k.aktif ? <UserX /> : <UserCheck />}
                {k.aktif ? t("buFirmadaPasifeAl") : t("buFirmadaAktifEt")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {k.aktif ? t("uyelikPasifOnayBaslik", { kisi: k.ad ?? k.eposta }) : t("uyelikAktifOnayBaslik", { kisi: k.ad ?? k.eposta })}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {k.aktif ? t("uyelikPasifOnayMetin") : t("uyelikAktifOnayMetin")}
                  {k.uyelikSayisi > 1 ? ` ${t("uyelikCokFirmaNotu", { sayi: k.uyelikSayisi })}` : ""}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-11">{ortak("vazgec")}</AlertDialogCancel>
                <Button className="min-h-11" variant={k.aktif ? "destructive" : "default"} onClick={durumDegistir} disabled={bekliyor}>
                  {k.aktif ? t("buFirmadaPasifeAl") : t("buFirmadaAktifEt")}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={acik} onOpenChange={setAcik}>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="min-h-11">
                <KeyRound />
                {t("parolaSifirla")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("parolaSifirlaOnayBaslik", { kisi: k.ad ?? k.eposta })}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("parolaSifirlaOnayMetin")}
                  {k.uyelikSayisi > 1 ? ` ${t("parolaSifirlaCokFirma", { sayi: k.uyelikSayisi })}` : ""}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-11">{ortak("vazgec")}</AlertDialogCancel>
                <Button className="min-h-11" onClick={sifirla} disabled={bekliyor}>
                  {bekliyor ? t("sifirlaniyor") : t("parolaSifirla")}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {sonuc.geciciParola ? (
        <div role="status" className={`space-y-1 rounded-lg p-3 ${DURUM_KUTUSU.olumlu}`}>
          <p className={`font-medium ${DURUM_YAZISI.olumlu}`}>{t("parolaSifirlandi", { eposta: sonuc.eposta ?? k.eposta })}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">{t("geciciParola")}:</span>
            <KopyalanabilirKod deger={sonuc.geciciParola} etiket={t("geciciParola")} />
          </div>
          <p className="text-muted-foreground text-xs">{t("geciciParolaUyari")}</p>
        </div>
      ) : null}
      {durumSonucu.tamam ? (
        <p role="status" className={`text-sm ${DURUM_YAZISI.olumlu}`}>{durumSonucu.tamam}</p>
      ) : null}
      {durumSonucu.hata ? (
        <p role="alert" className={`flex items-center gap-1.5 ${DURUM_YAZISI.olumsuz}`}>
          <TriangleAlert className="size-4 shrink-0" />
          {durumSonucu.hata}
        </p>
      ) : null}
      {sonuc.hata ? (
        <p role="alert" className={`flex items-center gap-1.5 ${DURUM_YAZISI.olumsuz}`}>
          <TriangleAlert className="size-4 shrink-0" />
          {sonuc.hata}
        </p>
      ) : null}
    </li>
  );
}
