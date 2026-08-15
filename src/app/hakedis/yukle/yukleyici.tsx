"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert, Upload } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

export type HesapSecenegi = { id: string; etiket: string };

type Uyari =
  | { kod: "SIPARIS_BULUNAMADI"; siparisNo: string; sayi: number; toplam: number }
  | { kod: "TANINMAYAN_TIP"; hamTip: string; sayi: number; toplam: number }
  | { kod: "TURKIYE_DISI"; sayi: number }
  | { kod: "ZATEN_YUKLU"; sayi: number };

type Hata =
  | { kod: "DOSYA_OKUNAMADI"; ayrinti: string }
  | { kod: "SAYFA_YOK" }
  | { kod: "SUTUN_EKSIK"; sutunlar: string[] }
  | { kod: "SATIR_YOK" }
  | { kod: "HESAP_YOK" };

type Onizleme = {
  kanal: string;
  okunan: number;
  atlanan: number;
  yazilacak: number;
  eslesenSatir: number;
  eslesmeyenSatir: number;
  siparisDisiSatir: number;
  eslesenSiparis: number;
  netToplam: { paraBirimi: string; tutar: number }[];
  uyarilar: Uyari[];
};

type Yanit =
  | { durum: "HATA"; hatalar: Hata[] }
  | { durum: "ONIZLEME"; onizleme: Onizleme }
  | { durum: "YAZILDI"; yazilan: number }
  | { durum: "COKTU"; mesaj: string };

/**
 * DENETLE → ÖNİZLE → ONAYLA akışı. İçe aktarma ekranıyla aynı kalıp (#10).
 * Dosya iki kez gönderilir; sunucuda durum tutulmaz (bkz. route.ts).
 */
export function Yukleyici({ hesaplar }: { hesaplar: HesapSecenegi[] }) {
  const t = useTranslations("Hakedis");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();
  const router = useRouter();

  const dosyaGirdisi = useRef<HTMLInputElement>(null);
  const [dosya, setDosya] = useState<File | null>(null);
  const [hesap, setHesap] = useState("");
  const [calisiyor, setCalisiyor] = useState<"denetle" | "yaz" | null>(null);
  const [yanit, setYanit] = useState<Yanit | null>(null);

  async function gonder(yazilsinMi: boolean) {
    if (!dosya || !hesap) return;
    setCalisiyor(yazilsinMi ? "yaz" : "denetle");
    try {
      const govde = new FormData();
      govde.set("dosya", dosya);
      govde.set("hesap", hesap);
      if (yazilsinMi) govde.set("yaz", "1");

      const cevap = await fetch("/api/hakedis", { method: "POST", body: govde });
      const veri: Yanit = await cevap.json();
      setYanit(veri);
      if (veri.durum === "YAZILDI") router.refresh();
    } catch {
      setYanit({ durum: "COKTU", mesaj: "BEKLENMEYEN" });
    } finally {
      setCalisiyor(null);
    }
  }

  const onizleme = yanit?.durum === "ONIZLEME" ? yanit.onizleme : null;

  const ozetler = onizleme
    ? ([
        [t("ozetOkunan"), onizleme.okunan],
        [t("ozetAtlanan"), onizleme.atlanan],
        [t("ozetYazilacak"), onizleme.yazilacak],
        [t("ozetEslesen"), onizleme.eslesenSatir],
        [t("ozetEslesmeyen"), onizleme.eslesmeyenSatir],
        [t("ozetSiparisDisi"), onizleme.siparisDisiSatir],
        [t("ozetEslesenSiparis"), onizleme.eslesenSiparis],
      ] as const)
    : [];

  function hataMetni(h: Hata): string {
    switch (h.kod) {
      case "DOSYA_OKUNAMADI":
        return t("hataDosyaOkunamadi", { ayrinti: h.ayrinti });
      case "SAYFA_YOK":
        return t("hataSayfaYok");
      case "SUTUN_EKSIK":
        return t("hataSutunEksik", { sutunlar: h.sutunlar.join(", ") });
      case "SATIR_YOK":
        return t("hataSatirYok");
      case "HESAP_YOK":
        return t("hataHesapYok");
    }
  }

  function uyariMetni(u: Uyari, paraBirimi: string): string {
    switch (u.kod) {
      case "SIPARIS_BULUNAMADI":
        return t("uyariSiparisBulunamadi", {
          siparisNo: u.siparisNo,
          sayi: u.sayi,
          tutar: bicim.para(u.toplam, paraBirimi),
        });
      case "TANINMAYAN_TIP":
        return t("uyariTaninmayanTip", {
          hamTip: u.hamTip,
          sayi: u.sayi,
          tutar: bicim.para(u.toplam, paraBirimi),
        });
      case "TURKIYE_DISI":
        return t("uyariTurkiyeDisi", { sayi: u.sayi });
      case "ZATEN_YUKLU":
        return t("uyariZatenYuklu", { sayi: u.sayi });
    }
  }

  const paraBirimi = onizleme?.netToplam[0]?.paraBirimi ?? "TRY";

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("yukleBaslik")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">{t("yukleAciklama")}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hakedis-hesap">{t("hesapSec")} *</Label>
              <Select value={hesap} onValueChange={setHesap}>
                <SelectTrigger id="hakedis-hesap" className="w-full">
                  <SelectValue placeholder={t("hesapSecin")} />
                </SelectTrigger>
                <SelectContent>
                  {hesaplar.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.etiket}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hakedis-dosya">{t("dosyaSec")} *</Label>
              <Input
                id="hakedis-dosya"
                ref={dosyaGirdisi}
                type="file"
                accept=".xlsx"
                onChange={(e) => {
                  setDosya(e.target.files?.[0] ?? null);
                  setYanit(null);
                }}
              />
            </div>
          </div>

          <Button
            type="button"
            disabled={!dosya || !hesap || calisiyor !== null}
            onClick={() => gonder(false)}
          >
            <Upload />
            {calisiyor === "denetle" ? t("denetleniyor") : t("denetle")}
          </Button>
        </CardContent>
      </Card>

      {/* --------------------------- HATA --------------------------- */}
      {yanit?.durum === "HATA" ? (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 space-y-2 rounded-md border p-4"
        >
          <p className="text-destructive text-sm font-medium">
            {t("hataBaslik")}
          </p>
          <ul className="text-destructive list-inside list-disc space-y-1 text-sm">
            {yanit.hatalar.map((h, i) => (
              <li key={i}>{hataMetni(h)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {yanit?.durum === "COKTU" ? (
        <p role="alert" className="text-destructive text-sm">
          {t("hataCoktu")}
        </p>
      ) : null}

      {/* ------------------------- ÖNİZLEME ------------------------- */}
      {onizleme ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("onizlemeBaslik")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ozetler.map(([etiket, deger]) => (
                <div key={etiket} className="rounded-lg border p-3">
                  <dt className="text-muted-foreground text-xs">{etiket}</dt>
                  <dd className="text-xl font-semibold">{deger}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-4">
              {onizleme.netToplam.map((n) => (
                <div key={n.paraBirimi}>
                  <div className="text-muted-foreground text-xs">
                    {t("netToplam")}
                  </div>
                  <div className="text-xl font-semibold">
                    {bicim.para(n.tutar, n.paraBirimi)}
                  </div>
                </div>
              ))}
            </div>

            {/* UYARILAR — yüklemeyi DURDURMAZ. */}
            {onizleme.uyarilar.length > 0 ? (
              <div className={`space-y-2 rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
                <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
                  <TriangleAlert className="size-4 shrink-0" />
                  {t("uyariBaslik", { sayi: onizleme.uyarilar.length })}
                </p>
                <ul className={`list-inside list-disc space-y-1 text-sm ${DURUM_YAZISI.uyari}`}>
                  {onizleme.uyarilar.slice(0, 30).map((u, i) => (
                    <li key={i}>{uyariMetni(u, paraBirimi)}</li>
                  ))}
                </ul>
                <p className={`text-xs ${DURUM_YAZISI.uyari}`}>
                  {t("uyariNotu")}
                </p>
              </div>
            ) : null}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={calisiyor !== null || onizleme.yazilacak === 0}>
                  <Upload />
                  {calisiyor === "yaz" ? t("yaziliyor") : t("yaz")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("yaz")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("ozetYazilacak")}: {onizleme.yazilacak}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => gonder(true)}>
                    {t("yaz")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      ) : null}

      {/* -------------------------- SONUÇ --------------------------- */}
      {yanit?.durum === "YAZILDI" ? (
        <p
          role="status"
          className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.olumlu}`}
        >
          {yanit.yazilan === 0
            ? t("hicYeniYok")
            : t("yazildi", { sayi: yanit.yazilan })}
        </p>
      ) : null}
    </div>
  );
}
