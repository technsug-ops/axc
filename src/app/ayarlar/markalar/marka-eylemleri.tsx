"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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

import { hepsiniEkle, markaEkle, markaKoduKaydet, type EylemSonucu } from "./eylemler";

/**
 * Marka kod tablosu satır eylemleri (K285). Her sonuç satırın altında
 * YAZAR (İlke #5); hata kodu sözlükten metne çevrilir.
 */

type Mesaj = { tur: "olumlu" | "olumsuz"; metin: string } | null;

function KodKutusu({
  deger,
  setDeger,
  etiket,
  bekliyor,
}: {
  deger: string;
  setDeger: (s: string) => void;
  etiket: string;
  bekliyor: boolean;
}) {
  const t = useTranslations("MarkaKodu");
  return (
    <Input
      value={deger}
      maxLength={3}
      disabled={bekliyor}
      aria-label={etiket}
      placeholder={t("kodYerTutucu")}
      onChange={(e) => setDeger(e.target.value.toUpperCase())}
      className="h-11 w-20 text-center font-mono tracking-widest uppercase md:h-9"
    />
  );
}

function MesajSatiri({ mesaj }: { mesaj: Mesaj }) {
  if (!mesaj) return null;
  return <p className={`text-xs ${mesaj.tur === "olumlu" ? DURUM_YAZISI.olumlu : DURUM_YAZISI.olumsuz}`}>{mesaj.metin}</p>;
}

function useHataMetni() {
  const t = useTranslations("MarkaKodu");
  return (s: Extract<EylemSonucu, { tamam: false }>) => t(`hata.${s.hata}`);
}

/** Tablodaki markanın kodunu değiştirir. */
export function KodDuzenle({ id, kod, ad }: { id: string; kod: string; ad: string }) {
  const t = useTranslations("MarkaKodu");
  const hataMetni = useHataMetni();
  const router = useRouter();
  const [deger, setDeger] = useState(kod);
  const [mesaj, setMesaj] = useState<Mesaj>(null);
  const [bekliyor, basla] = useTransition();
  const kaydet = () => {
    setMesaj(null);
    basla(async () => {
      const s = await markaKoduKaydet(id, deger);
      if (!s.tamam) {
        setMesaj({ tur: "olumsuz", metin: hataMetni(s) });
        return;
      }
      setMesaj({ tur: "olumlu", metin: s.kod ? t("kodKaydedildi", { kod: s.kod }) : t("kodAyni") });
      router.refresh();
    });
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <KodKutusu deger={deger} setDeger={setDeger} etiket={t("kodEtiketi", { ad })} bekliyor={bekliyor} />
        <Button type="button" variant="outline" className="h-11 md:h-9" disabled={bekliyor || deger === kod} onClick={kaydet}>
          {t("kaydet")}
        </Button>
      </div>
      <MesajSatiri mesaj={mesaj} />
    </div>
  );
}

/** Tabloda olmayan markayı ekler (ya da tabloda olup bağı eksik ürünleri bağlar). */
export function MarkaEkle({
  anahtar,
  ad,
  oneri,
  tablodaVar,
}: {
  anahtar: string;
  ad: string;
  oneri: string | null;
  tablodaVar: boolean;
}) {
  const t = useTranslations("MarkaKodu");
  const hataMetni = useHataMetni();
  const router = useRouter();
  const [deger, setDeger] = useState(oneri ?? "");
  const [mesaj, setMesaj] = useState<Mesaj>(null);
  const [bekliyor, basla] = useTransition();
  const ekle = () => {
    setMesaj(null);
    basla(async () => {
      const s = await markaEkle(anahtar, tablodaVar ? null : deger);
      if (!s.tamam) {
        setMesaj({ tur: "olumsuz", metin: hataMetni(s) });
        return;
      }
      setMesaj({ tur: "olumlu", metin: t("eklendi", { kod: s.kod ?? "", sayi: s.baglanan ?? 0 }) });
      router.refresh();
    });
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {tablodaVar ? null : (
          <KodKutusu deger={deger} setDeger={setDeger} etiket={t("kodEtiketi", { ad })} bekliyor={bekliyor} />
        )}
        <Button type="button" className="h-11 md:h-9" disabled={bekliyor || (!tablodaVar && deger.length !== 3)} onClick={ekle}>
          {tablodaVar ? t("bagla") : t("ekle")}
        </Button>
      </div>
      {!tablodaVar && oneri === null && !mesaj ? (
        <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("oneriYok")}</p>
      ) : null}
      <MesajSatiri mesaj={mesaj} />
    </div>
  );
}

/** Önerisi olan bütün bağsız markaları ekle — onaylı (İlke #6). */
export function HepsiniEkle({ eklenecek, baglanacak, kodsuz }: { eklenecek: number; baglanacak: number; kodsuz: number }) {
  const t = useTranslations("MarkaKodu");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [mesaj, setMesaj] = useState<Mesaj>(null);
  const [bekliyor, basla] = useTransition();
  const calistir = () => {
    setMesaj(null);
    basla(async () => {
      const s = await hepsiniEkle();
      if (!s.tamam) {
        setMesaj({ tur: "olumsuz", metin: t(`hata.${s.hata}`) });
        return;
      }
      setMesaj({
        tur: "olumlu",
        metin: t("topluSonuc", { eklenen: s.eklenen, baglanan: s.baglanan, atlanan: s.atlanan, kodsuz: s.kodsuz }),
      });
      router.refresh();
    });
  };
  if (eklenecek + baglanacak === 0) return null;
  return (
    <div className="space-y-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" className="h-11 md:h-10" disabled={bekliyor}>
            {bekliyor ? t("ekleniyor") : t("hepsiniEkle", { sayi: eklenecek + baglanacak })}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("hepsiniEkleBaslik")}</AlertDialogTitle>
            <AlertDialogDescription>{t("hepsiniEkleMetin", { eklenecek, baglanacak, kodsuz })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
            <AlertDialogAction onClick={calistir}>{t("hepsiniEkleOnay")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <MesajSatiri mesaj={mesaj} />
    </div>
  );
}
