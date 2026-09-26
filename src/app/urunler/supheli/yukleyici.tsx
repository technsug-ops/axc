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

import { supheliOnizle, supheliUygula, type OnizlemeSonucu, type UygulamaSonucu } from "./eylemler";

/**
 * Şüpheli listesi geri yükleme (K284): önce ÖNİZLEME (hiçbir şey yazmaz),
 * sonra ONAYLI uygulama (İlke #6). Hatalı satırlar sebebiyle listelenir ve
 * yazılmaz (İlke #5). Aynı dosya iki adımda da gönderilir; plan sunucuda
 * yeniden kurulur.
 */
export function SupheliYukleyici() {
  const t = useTranslations("SupheliUrun");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [dosya, setDosya] = useState<File | null>(null);
  const [onizleme, setOnizleme] = useState<OnizlemeSonucu | null>(null);
  const [sonuc, setSonuc] = useState<UygulamaSonucu | null>(null);
  const [bekliyor, basla] = useTransition();

  const form = () => {
    const f = new FormData();
    if (dosya) f.set("dosya", dosya);
    return f;
  };
  const onizle = () => {
    setSonuc(null);
    basla(async () => setOnizleme(await supheliOnizle(form())));
  };
  const uygula = () => {
    basla(async () => {
      const s = await supheliUygula(form());
      setSonuc(s);
      if (s.tamam) {
        setOnizleme(null);
        router.refresh();
      }
    });
  };

  const o = onizleme && onizleme.tamam ? onizleme : null;
  const yazilacak = o ? o.ean + o.pasif : 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="file"
          accept=".xlsx,.xls"
          aria-label={t("dosyaSec")}
          onChange={(e) => {
            setDosya(e.target.files?.[0] ?? null);
            setOnizleme(null);
            setSonuc(null);
          }}
          className="h-11 md:h-10"
        />
        <Button type="button" className="h-11 md:h-10" disabled={!dosya || bekliyor} onClick={onizle}>
          <Upload />
          {bekliyor && !o ? t("onizleniyor") : t("onizle")}
        </Button>
      </div>

      {onizleme && !onizleme.tamam ? (
        <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>{t(`dosyaHata.${onizleme.hata}`)}</p>
      ) : null}

      {o ? (
        <div className="space-y-2 rounded-lg border p-3">
          <ul className="space-y-1 text-sm">
            <li className={DURUM_YAZISI.olumlu}>{t("ozetEan", { sayi: o.ean })}</li>
            <li className={o.pasif > 0 ? DURUM_YAZISI.uyari : ""}>{t("ozetPasif", { sayi: o.pasif })}</li>
            {o.pasifStoklu > 0 ? <li className={DURUM_YAZISI.uyari}>{t("ozetPasifStoklu", { sayi: o.pasifStoklu })}</li> : null}
            {o.bos > 0 ? <li className="text-muted-foreground">{t("ozetBos", { sayi: o.bos })}</li> : null}
            {o.ayni > 0 ? <li className="text-muted-foreground">{t("ozetAyni", { sayi: o.ayni })}</li> : null}
            {o.hataSayisi > 0 ? <li className={DURUM_YAZISI.olumsuz}>{t("ozetHata", { sayi: o.hataSayisi })}</li> : null}
          </ul>

          {o.hatalar.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("hataBaslik")}</p>
              <ul className="max-h-72 space-y-1 overflow-y-auto text-xs">
                {o.hatalar.map((h, i) => (
                  <li key={i} className="bg-muted/50 rounded px-2 py-1">
                    <span className="font-medium">{t("hataSatir", { satir: h.satir })}</span> · {h.urun} —{" "}
                    <span className={DURUM_YAZISI.olumsuz}>{t(`hata.${h.kod}`, { deger: h.deger ?? "" })}</span>
                  </li>
                ))}
              </ul>
              {o.hataSayisi > o.hatalar.length ? (
                <p className="text-muted-foreground text-xs">{t("hataFazla", { sayi: o.hataSayisi - o.hatalar.length })}</p>
              ) : null}
            </div>
          ) : null}

          {yazilacak === 0 ? (
            <p className="text-muted-foreground text-sm">{t("yazilacakYok")}</p>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" className="h-11 md:h-10" disabled={bekliyor}>
                  {bekliyor ? t("uygulaniyor") : t("uygula")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("uygulaOnayBaslik")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("uygulaOnayMetni", { ean: o.ean, pasif: o.pasif })}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
                  <AlertDialogAction onClick={uygula}>{t("uygula")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ) : null}

      {sonuc && !sonuc.tamam ? <p className={`text-sm ${DURUM_YAZISI.olumsuz}`}>{t(`dosyaHata.${sonuc.hata}`)}</p> : null}
      {sonuc && sonuc.tamam ? (
        <div className="space-y-1">
          <p className={`text-sm ${DURUM_YAZISI.olumlu}`}>{t("sonuc", { ean: sonuc.ean, pasif: sonuc.pasif })}</p>
          {sonuc.atlanan > 0 ? <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("sonucAtlanan", { sayi: sonuc.atlanan })}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
