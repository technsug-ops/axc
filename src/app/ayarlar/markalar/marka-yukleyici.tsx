"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DURUM_YAZISI } from "@/lib/renkler";

import { markaListesiOnizle, markaListesiUygula, type MarkaOnizleme, type MarkaUygulama } from "./yukleme-eylemleri";

/**
 * «Markası boş ürünler» listesi geri yükleme (K288): önce ÖNİZLEME (hiçbir şey
 * yazmaz), sonra ONAYLI uygulama (İlke #6). Hatalı satır sebebiyle listelenir
 * ve yazılmaz (İlke #5). Şüpheli ürün yükleyicisiyle aynı düzen (İlke #10).
 */
export function MarkaYukleyici() {
  const t = useTranslations("MarkaKodu");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [dosya, setDosya] = useState<File | null>(null);
  const [onizleme, setOnizleme] = useState<MarkaOnizleme | null>(null);
  const [sonuc, setSonuc] = useState<MarkaUygulama | null>(null);
  const [bekliyor, basla] = useTransition();

  const form = () => {
    const f = new FormData();
    if (dosya) f.set("dosya", dosya);
    return f;
  };
  const onizle = () => {
    setSonuc(null);
    basla(async () => setOnizleme(await markaListesiOnizle(form())));
  };
  const uygula = () => {
    basla(async () => {
      const s = await markaListesiUygula(form());
      setSonuc(s);
      if (s.tamam) {
        setOnizleme(null);
        router.refresh();
      }
    });
  };

  const o = onizleme && onizleme.tamam ? onizleme : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="file"
          accept=".xlsx,.xls"
          aria-label={t("yukleme.dosyaSec")}
          onChange={(e) => {
            setDosya(e.target.files?.[0] ?? null);
            setOnizleme(null);
            setSonuc(null);
          }}
          className="h-11 md:h-10"
        />
        <Button type="button" className="h-11 md:h-10" disabled={!dosya || bekliyor} onClick={onizle}>
          <Upload />
          {bekliyor && !o ? t("yukleme.onizleniyor") : t("yukleme.onizle")}
        </Button>
      </div>

      {onizleme && !onizleme.tamam ? <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>{t(`yukleme.dosyaHata.${onizleme.hata}`)}</p> : null}

      {o ? (
        <div className="space-y-2 rounded-lg border p-3">
          <ul className="space-y-1 text-sm">
            <li className={DURUM_YAZISI.olumlu}>{t("yukleme.ozetYaz", { sayi: o.yaz, bagli: o.bagli })}</li>
            {o.bos > 0 ? <li className="text-muted-foreground">{t("yukleme.ozetBos", { sayi: o.bos })}</li> : null}
            {o.ayni > 0 ? <li className="text-muted-foreground">{t("yukleme.ozetAyni", { sayi: o.ayni })}</li> : null}
            {o.hataSayisi > 0 ? <li className={DURUM_YAZISI.olumsuz}>{t("yukleme.ozetHata", { sayi: o.hataSayisi })}</li> : null}
          </ul>
          {o.hatalar.length > 0 ? (
            <ul className="max-h-72 space-y-1 overflow-y-auto text-xs">
              {o.hatalar.map((h, i) => (
                <li key={i} className="bg-muted/50 rounded px-2 py-1">
                  <span className="font-medium">{t("yukleme.hataSatir", { satir: h.satir })}</span> · {h.urun} —{" "}
                  <span className={DURUM_YAZISI.olumsuz}>{t(`yukleme.hata.${h.kod}`, { deger: h.deger ?? "" })}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {o.yaz === 0 ? (
            <p className="text-muted-foreground text-sm">{t("yukleme.yazilacakYok")}</p>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" className="h-11 md:h-10" disabled={bekliyor}>
                  {bekliyor ? t("yukleme.uygulaniyor") : t("yukleme.uygula")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("yukleme.onayBaslik")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("yukleme.onayMetni", { sayi: o.yaz, bagli: o.bagli })}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
                  <AlertDialogAction onClick={uygula}>{t("yukleme.uygula")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ) : null}

      {sonuc && !sonuc.tamam ? <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>{t(`yukleme.dosyaHata.${sonuc.hata}`)}</p> : null}
      {sonuc && sonuc.tamam ? (
        <p className={`text-sm ${DURUM_YAZISI.olumlu}`}>{t("yukleme.sonuc", { sayi: sonuc.yazilan, bagli: sonuc.bagli, atlanan: sonuc.atlanan })}</p>
      ) : null}
    </div>
  );
}
