"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ExternalLink, Plus } from "lucide-react";

import Link from "@/components/niyetli-baglanti";
import { DurumRozeti } from "@/components/durum-rozeti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TOPLU_TAVAN, type OneriDurumu } from "@/lib/alim-hedefi-oneri";
import type { TakipKanali } from "@/lib/alim-hedefi-verisi";
import type { BuyboxKanali } from "@/lib/buybox";
import { DURUM_YAZISI } from "@/lib/renkler";

import { hedefTopluEylemi, hedefYazEylemi } from "./fiyat-takibi-eylemleri";

/**
 * Öneri listesi — istemci (K363 Faz 3-e). Seçim kutuları + toplu ekleme (onaylı)
 * + satır başına «Takip et» (2 tık: aç → onayla, hedef en düşük alışla dolu).
 * Rakam metinleri SUNUCUDA biçimlenir; burada yalnız seçim durumu yaşar.
 * Tek düzen hem telefonda hem masaüstünde (satır = kart); dokunma 44 px (İlke #8).
 */
export type OneriSatiri = {
  variantId: string;
  urunId: string | null;
  urunAdi: string;
  sku: string;
  firmaSku: string | null;
  barkod: string | null;
  satisMetni: string;
  enDusukMetni: string | null;
  /** Hedef kutusunun başlangıç metni (en düşük alış); alış yoksa `null`. */
  hedefGirdi: string | null;
  hedefMetni: string | null;
  durum: OneriDurumu;
  kanallar: Record<BuyboxKanali, TakipKanali>;
};

type Mesaj = { tur: "olumlu" | "olumsuz"; metin: string } | null;

export function OneriListesi({ satirlar, yazabilir }: { satirlar: OneriSatiri[]; yazabilir: boolean }) {
  const t = useTranslations("FiyatTakibi");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [secim, setSecim] = useState<Set<string>>(new Set());
  const [mesaj, setMesaj] = useState<Mesaj>(null);
  const [bekliyor, basla] = useTransition();
  const [onay, setOnay] = useState(false);

  const secilebilir = satirlar.filter((s) => s.durum === "UYGUN").map((s) => s.variantId);
  /** Seçim yalnız ekranda HÂLÂ uygun olan satırlardan sayılır (yenilemeden sonra takipte olan düşer). */
  const secili = secilebilir.filter((id) => secim.has(id));
  const degistir = (id: string) =>
    setSecim((eski) => {
      const yeni = new Set(eski);
      if (yeni.has(id)) yeni.delete(id);
      else yeni.add(id);
      return yeni;
    });

  const topluAl = () => {
    setMesaj(null);
    basla(async () => {
      const s = await hedefTopluEylemi(secili);
      if (!s.tamam) {
        setMesaj({ tur: "olumsuz", metin: t(`toplu.${s.hata}`, { tavan: TOPLU_TAVAN }) });
        return;
      }
      const atlanan = [
        s.takipte > 0 ? t("toplu.atlananTakipte", { sayi: s.takipte }) : null,
        s.ilanYok > 0 ? t("toplu.atlananIlanYok", { sayi: s.ilanYok }) : null,
        s.alisYok > 0 ? t("toplu.atlananAlisYok", { sayi: s.alisYok }) : null,
        s.bulunamadi > 0 ? t("toplu.atlananBulunamadi", { sayi: s.bulunamadi }) : null,
      ].filter((x) => x !== null);
      setMesaj({
        tur: s.alindi > 0 ? "olumlu" : "olumsuz",
        metin: t("toplu.sonuc", { alindi: s.alindi }) + (atlanan.length > 0 ? ` · ${atlanan.join(" · ")}` : ""),
      });
      setSecim(new Set());
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {yazabilir ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            disabled={bekliyor || secilebilir.length === 0}
            onClick={() => setSecim(secili.length === secilebilir.length ? new Set() : new Set(secilebilir))}
          >
            {secili.length === secilebilir.length && secilebilir.length > 0 ? t("secimiKaldir") : t("hepsiniSec", { sayi: secilebilir.length })}
          </Button>
          <Button type="button" className="h-11 gap-1 md:h-9" disabled={bekliyor || secili.length === 0} onClick={() => setOnay(true)}>
            <Plus className="size-4" />
            {bekliyor ? t("kaydediliyor") : t("secilenleriAl", { sayi: secili.length })}
          </Button>
          <AlertDialog open={onay} onOpenChange={setOnay}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("topluOnayBaslik", { sayi: secili.length })}</AlertDialogTitle>
                <AlertDialogDescription>{t("topluOnayMetin")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
                <AlertDialogAction onClick={topluAl}>{t("topluOnayla")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t("yazmaIzniYok")}</p>
      )}
      {mesaj ? (
        <p role="status" className={`text-sm ${mesaj.tur === "olumlu" ? DURUM_YAZISI.olumlu : DURUM_YAZISI.olumsuz}`}>
          {mesaj.metin}
        </p>
      ) : null}

      <ul className="divide-y rounded-md border">
        {satirlar.map((s) => (
          <OneriSatirGorunumu key={s.variantId} s={s} yazabilir={yazabilir} secili={secim.has(s.variantId)} degistir={() => degistir(s.variantId)} kilitli={bekliyor} />
        ))}
      </ul>
    </div>
  );
}

function OneriSatirGorunumu({ s, yazabilir, secili, degistir, kilitli }: { s: OneriSatiri; yazabilir: boolean; secili: boolean; degistir: () => void; kilitli: boolean }) {
  const t = useTranslations("FiyatTakibi");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [fiyat, setFiyat] = useState(s.hedefGirdi ?? "");
  const [mesaj, setMesaj] = useState<Mesaj>(null);
  const [bekliyor, basla] = useTransition();
  const uygun = s.durum === "UYGUN";
  /** Tek ekleme: alışı olmayan ürün de eklenebilir — hedefi kullanıcı yazar. */
  const tekEklenebilir = s.durum === "UYGUN" || s.durum === "ALIS_YOK";
  const okunacak = s.kanallar.TY.ilan && s.kanallar.HB.ilan ? t("okunacak_ikisi") : s.kanallar.TY.ilan ? t("okunacak_TY") : t("okunacak_HB");

  const onayla = () => {
    setMesaj(null);
    basla(async () => {
      const r = await hedefYazEylemi(s.variantId, fiyat);
      if (!r.tamam) {
        setMesaj({ tur: "olumsuz", metin: t(`hata.${r.hata}`) });
        return;
      }
      setMesaj({ tur: "olumlu", metin: t("eklendi", { ad: s.urunAdi }) });
      setAcik(false);
      router.refresh();
    });
  };

  return (
    <li className="flex gap-2 p-3">
      {yazabilir ? (
        <label className="flex size-11 shrink-0 items-start justify-center pt-1">
          <input
            type="checkbox"
            className="size-5"
            checked={secili && uygun}
            disabled={!uygun || kilitli}
            onChange={degistir}
            aria-label={t("satirSec", { ad: s.urunAdi })}
          />
        </label>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        {s.urunId === null ? (
          <p className="line-clamp-2 font-medium">{s.urunAdi}</p>
        ) : (
          <Link href={`/urunler/${s.urunId}`} className="line-clamp-2 font-medium underline underline-offset-2 hover:no-underline">
            {s.urunAdi}
          </Link>
        )}
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <KopyalanabilirKod deger={s.sku} etiket={ortak("sku")} />
          {s.firmaSku ? <KopyalanabilirKod deger={s.firmaSku} etiket={ortak("firmaSku")} /> : null}
          {s.barkod ? <KopyalanabilirKod deger={s.barkod} etiket={ortak("barkod")} /> : null}
        </div>
        <p className="tabular-nums">{s.satisMetni}</p>
        <p className="tabular-nums">{s.enDusukMetni ?? <span className="text-muted-foreground">{t("alisKaydiYok")}</span>}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-muted-foreground">{okunacak}</span>
          {(["TY", "HB"] as const).map((k) =>
            s.kanallar[k].adres ? (
              <a
                key={k}
                href={s.kanallar[k].adres as string}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("pazaryerindeAc", { kanal: t(`kanal_${k}`) })}
                className="text-primary inline-flex min-h-11 items-center gap-1 underline-offset-4 hover:underline md:min-h-6"
              >
                {t(`kanal_${k}`)}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : null,
          )}
        </div>
        {acik ? (
          <div className="flex flex-wrap items-end gap-2 pt-1">
            <label className="space-y-1">
              <span className="block">{t("hedefEtiketi")}</span>
              <Input
                value={fiyat}
                inputMode="decimal"
                autoComplete="off"
                autoFocus
                disabled={bekliyor}
                placeholder={t("hedefYerTutucu")}
                onChange={(e) => setFiyat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onayla();
                  }
                }}
                className="h-11 w-36 md:h-9"
              />
            </label>
            <Button type="button" className="h-11 md:h-9" disabled={bekliyor || fiyat.trim() === ""} onClick={onayla}>
              {bekliyor ? t("kaydediliyor") : t("onayla")}
            </Button>
            <Button type="button" variant="outline" className="h-11 md:h-9" disabled={bekliyor} onClick={() => setAcik(false)}>
              {ortak("vazgec")}
            </Button>
          </div>
        ) : null}
        {acik && s.hedefMetni ? <p className="text-muted-foreground text-xs">{t("hedefOnerisiNotu")}</p> : null}
        {mesaj ? (
          <p role="status" className={mesaj.tur === "olumlu" ? DURUM_YAZISI.olumlu : DURUM_YAZISI.olumsuz}>
            {mesaj.metin}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">
        {s.durum === "TAKIPTE" ? (
          <DurumRozeti durum="notr">{t("takipte")}</DurumRozeti>
        ) : yazabilir && tekEklenebilir && !acik ? (
          <Button type="button" variant="outline" className="h-11 gap-1 md:h-9" disabled={kilitli} onClick={() => setAcik(true)}>
            <Plus className="size-4" />
            {t("takipEt")}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
