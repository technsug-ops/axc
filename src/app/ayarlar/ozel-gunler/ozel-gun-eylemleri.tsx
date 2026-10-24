"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBicim } from "@/lib/bicim-istemci";
import { AD_EN_UZUN, EN_UZUN_ARALIK_GUN, gunMetni, OZEL_GUN_TURLERI, YAKLASAN_GUN, type OzelGunTuru } from "@/lib/ozel-gun/ozel-gun";
import { DURUM_YAZISI } from "@/lib/renkler";

import {
  ozelGunAktifEylemi,
  ozelGunEkleEylemi,
  ozelGunGuncelleEylemi,
  ozelGunSilEylemi,
  tarihEkleEylemi,
  tarihGuncelleEylemi,
  tarihSilEylemi,
  type EylemSonucu,
} from "./eylemler";

/**
 * Özel gün takvimi — istemci parçaları (K363 Faz 2-b). Her sonuç olduğu yerde
 * YAZAR (İlke #5); silme onay ister (İlke #6); dokunma hedefleri telefonda
 * 44 px (İlke #8 — `h-11`, masaüstünde `md:h-9`).
 */

export type KanalSecenegi = { id: string; ad: string };
export type TarihVerisi = { id: string; baslangic: Date; bitis: Date; kaynak: string | null; dogrulandi: boolean };
export type GunVerisi = {
  id: string;
  ad: string;
  tur: OzelGunTuru;
  aktif: boolean;
  aciklama: string | null;
  kanalId: string | null;
  kanalAdi: string | null;
  tarihler: TarihVerisi[];
  /** Bugünden önce başlayan tarihi var mı — varsa silinmez, pasife alınır (sunucu da denetler). */
  gecmisiVar: boolean;
};

type Mesaj = { tur: "olumlu" | "olumsuz"; metin: string } | null;

const ALAN = "border-input bg-background focus-visible:ring-ring h-11 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none md:h-9";

function MesajSatiri({ mesaj }: { mesaj: Mesaj }) {
  if (!mesaj) return null;
  return (
    <p role="status" className={`text-sm ${mesaj.tur === "olumlu" ? DURUM_YAZISI.olumlu : DURUM_YAZISI.olumsuz}`}>
      {mesaj.metin}
    </p>
  );
}

/** Eylem çalıştırıcı — bekleme, mesaj ve sayfa tazeleme tek yerde. */
function useEylem() {
  const t = useTranslations("OzelGun");
  const router = useRouter();
  const [mesaj, setMesaj] = useState<Mesaj>(null);
  const [bekliyor, basla] = useTransition();
  const calistir = (is: () => Promise<EylemSonucu>, basari: string, sonra?: () => void) => {
    setMesaj(null);
    basla(async () => {
      const s = await is();
      if (!s.tamam) {
        setMesaj({ tur: "olumsuz", metin: t(`hata.${s.hata}`, { enUzun: AD_EN_UZUN, gun: EN_UZUN_ARALIK_GUN }) });
        return;
      }
      setMesaj({ tur: "olumlu", metin: basari });
      sonra?.();
      router.refresh();
    });
  };
  return { mesaj, bekliyor, calistir };
}

/** Tarih alanları — başlangıç, bitiş (boş = tek gün), kaynak, doğrulandı. */
function TarihAlanlari({
  onEk,
  deger,
  setDeger,
  bekliyor,
}: {
  onEk: string;
  deger: { baslangic: string; bitis: string; kaynak: string; dogrulandi: boolean };
  setDeger: (d: { baslangic: string; bitis: string; kaynak: string; dogrulandi: boolean }) => void;
  bekliyor: boolean;
}) {
  const t = useTranslations("OzelGun");
  return (
    <div className="grid gap-2 md:grid-cols-[10rem_10rem_minmax(0,1fr)_auto] md:items-end">
      <label className="space-y-1 text-sm">
        <span className="block">{t("baslangic")}</span>
        <input id={`${onEk}-bas`} type="date" required value={deger.baslangic} disabled={bekliyor} onChange={(e) => setDeger({ ...deger, baslangic: e.target.value })} className={ALAN} />
      </label>
      <label className="space-y-1 text-sm">
        <span className="block">{t("bitis")}</span>
        <input id={`${onEk}-bit`} type="date" value={deger.bitis} disabled={bekliyor} onChange={(e) => setDeger({ ...deger, bitis: e.target.value })} className={ALAN} />
      </label>
      <label className="space-y-1 text-sm">
        <span className="block">{t("kaynak")}</span>
        <Input value={deger.kaynak} maxLength={191} disabled={bekliyor} placeholder={t("kaynakOrnek")} onChange={(e) => setDeger({ ...deger, kaynak: e.target.value })} className="h-11 md:h-9" />
      </label>
      <label className="flex h-11 items-center gap-2 text-sm md:h-9">
        <input type="checkbox" checked={deger.dogrulandi} disabled={bekliyor} onChange={(e) => setDeger({ ...deger, dogrulandi: e.target.checked })} className="size-5" />
        {t("dogrulandi")}
      </label>
    </div>
  );
}

function GunAlanlari({
  deger,
  setDeger,
  kanallar,
  bekliyor,
}: {
  deger: { ad: string; tur: OzelGunTuru; kanalId: string; aciklama: string };
  setDeger: (d: { ad: string; tur: OzelGunTuru; kanalId: string; aciklama: string }) => void;
  kanallar: KanalSecenegi[];
  bekliyor: boolean;
}) {
  const t = useTranslations("OzelGun");
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
      <label className="space-y-1 text-sm">
        <span className="block">{t("ad")}</span>
        <Input value={deger.ad} maxLength={AD_EN_UZUN} disabled={bekliyor} placeholder={t("adOrnek")} onChange={(e) => setDeger({ ...deger, ad: e.target.value })} className="h-11 md:h-9" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="block">{t("tur")}</span>
        <select value={deger.tur} disabled={bekliyor} onChange={(e) => setDeger({ ...deger, tur: e.target.value as OzelGunTuru })} className={ALAN}>
          {OZEL_GUN_TURLERI.map((x) => (
            <option key={x} value={x}>
              {t(`tur_${x}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="block">{t("kanal")}</span>
        <select value={deger.kanalId} disabled={bekliyor} onChange={(e) => setDeger({ ...deger, kanalId: e.target.value })} className={ALAN}>
          <option value="">{t("kanalHepsi")}</option>
          {kanallar.map((k) => (
            <option key={k.id} value={k.id}>
              {k.ad}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm md:col-span-3">
        <span className="block">{t("aciklamaAlani")}</span>
        <Input value={deger.aciklama} disabled={bekliyor} placeholder={t("aciklamaOrnek")} onChange={(e) => setDeger({ ...deger, aciklama: e.target.value })} className="h-11 md:h-9" />
      </label>
    </div>
  );
}

const bosTarih = { baslangic: "", bitis: "", kaynak: "", dogrulandi: true };
const tarihGirdisi = (d: typeof bosTarih) => ({ baslangic: d.baslangic, bitis: d.bitis, kaynak: d.kaynak || null, dogrulandi: d.dogrulandi });

export function YeniOzelGunFormu({ kanallar }: { kanallar: KanalSecenegi[] }) {
  const t = useTranslations("OzelGun");
  const { mesaj, bekliyor, calistir } = useEylem();
  const [gun, setGun] = useState({ ad: "", tur: "SATIS_GUNU" as OzelGunTuru, kanalId: "", aciklama: "" });
  const [tarih, setTarih] = useState(bosTarih);
  const ekle = () =>
    calistir(
      () => ozelGunEkleEylemi({ ad: gun.ad, tur: gun.tur, channelId: gun.kanalId || null, aciklama: gun.aciklama || null }, tarihGirdisi(tarih)),
      t("eklendi", { ad: gun.ad.trim() }),
      () => {
        setGun({ ad: "", tur: gun.tur, kanalId: "", aciklama: "" });
        setTarih(bosTarih);
      },
    );
  return (
    <div className="space-y-3">
      <GunAlanlari deger={gun} setDeger={setGun} kanallar={kanallar} bekliyor={bekliyor} />
      <TarihAlanlari onEk="yeni" deger={tarih} setDeger={setTarih} bekliyor={bekliyor} />
      <p className="text-muted-foreground text-xs">{t("bitisNotu", { gun: EN_UZUN_ARALIK_GUN, ufuk: YAKLASAN_GUN })}</p>
      <Button type="button" className="h-11 md:h-9" disabled={bekliyor || gun.ad.trim() === "" || tarih.baslangic === ""} onClick={ekle}>
        {bekliyor ? t("kaydediliyor") : t("ekle")}
      </Button>
      <MesajSatiri mesaj={mesaj} />
    </div>
  );
}

function TarihSatiri({ tarih, gunAdi }: { tarih: TarihVerisi; gunAdi: string }) {
  const t = useTranslations("OzelGun");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();
  const { mesaj, bekliyor, calistir } = useEylem();
  const [duzen, setDuzen] = useState(false);
  const [deger, setDeger] = useState({ baslangic: gunMetni(tarih.baslangic), bitis: gunMetni(tarih.bitis), kaynak: tarih.kaynak ?? "", dogrulandi: tarih.dogrulandi });
  const aralik =
    tarih.baslangic.getTime() === tarih.bitis.getTime() ? bicim.tarih(tarih.baslangic) : t("aralik", { bas: bicim.tarih(tarih.baslangic), bit: bicim.tarih(tarih.bitis) });
  return (
    <li className="space-y-2 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium tabular-nums">{aralik}</span>
        {tarih.dogrulandi ? null : <Badge variant="outline" className={DURUM_YAZISI.uyari}>{t("dogrulanacak")}</Badge>}
        {tarih.kaynak ? <span className="text-muted-foreground text-xs">{t("kaynakYazisi", { kaynak: tarih.kaynak })}</span> : null}
        <div className="ml-auto flex gap-1">
          <Button type="button" variant="outline" className="h-11 gap-1 md:h-8" disabled={bekliyor} onClick={() => setDuzen(!duzen)} aria-expanded={duzen}>
            <Pencil className="size-4" />
            {t("duzenle")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" className="h-11 gap-1 md:h-8" disabled={bekliyor}>
                <Trash2 className="size-4" />
                {t("sil")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("tarihSilBaslik")}</AlertDialogTitle>
                <AlertDialogDescription>{t("tarihSilMetin", { ad: gunAdi, aralik })}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => calistir(() => tarihSilEylemi(tarih.id), t("tarihSilindi"))}>{t("sil")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {duzen ? (
        <div className="space-y-2 rounded-md border p-3">
          <TarihAlanlari onEk={`t-${tarih.id}`} deger={deger} setDeger={setDeger} bekliyor={bekliyor} />
          <Button type="button" className="h-11 md:h-9" disabled={bekliyor || deger.baslangic === ""} onClick={() => calistir(() => tarihGuncelleEylemi(tarih.id, tarihGirdisi(deger)), t("tarihKaydedildi"), () => setDuzen(false))}>
            {t("kaydet")}
          </Button>
        </div>
      ) : null}
      <MesajSatiri mesaj={mesaj} />
    </li>
  );
}

export function OzelGunKarti({ gun, kanallar }: { gun: GunVerisi; kanallar: KanalSecenegi[] }) {
  const t = useTranslations("OzelGun");
  const ortak = useTranslations("Ortak");
  const { mesaj, bekliyor, calistir } = useEylem();
  const [duzen, setDuzen] = useState(false);
  const [tarihEkleAcik, setTarihEkleAcik] = useState(false);
  const [deger, setDeger] = useState({ ad: gun.ad, tur: gun.tur, kanalId: gun.kanalId ?? "", aciklama: gun.aciklama ?? "" });
  const [yeniTarih, setYeniTarih] = useState(bosTarih);

  return (
    <div className={`space-y-2 rounded-lg border p-4 ${gun.aktif ? "" : "opacity-70"}`}>
      {/* Telefonda başlık ÜSTTE tam genişlik, düğmeler altında (kullanıcı 24.10: `flex-1` taban 0
          olduğu için düğmeler satıra sığıyor, başlık kelime kelime eziliyordu). */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 space-y-1 sm:flex-1">
          <p className="font-semibold">{gun.ad}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">{t(`tur_${gun.tur}`)}</Badge>
            <span className="text-muted-foreground">{gun.kanalAdi ?? t("kanalHepsi")}</span>
            {gun.aktif ? null : <Badge variant="outline">{t("pasif")}</Badge>}
          </div>
          {gun.aciklama ? <p className="text-muted-foreground text-sm">{gun.aciklama}</p> : null}
        </div>
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="outline" className="h-11 gap-1 md:h-8" disabled={bekliyor} onClick={() => setTarihEkleAcik(!tarihEkleAcik)} aria-expanded={tarihEkleAcik}>
            <CalendarPlus className="size-4" />
            {t("tarihEkle")}
          </Button>
          <Button type="button" variant="outline" className="h-11 gap-1 md:h-8" disabled={bekliyor} onClick={() => setDuzen(!duzen)} aria-expanded={duzen}>
            <Pencil className="size-4" />
            {t("duzenle")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-8"
            disabled={bekliyor}
            onClick={() => calistir(() => ozelGunAktifEylemi(gun.id, !gun.aktif), gun.aktif ? t("pasifeAlindi") : t("aktifEdildi"))}
          >
            {gun.aktif ? t("pasifeAl") : t("aktifEt")}
          </Button>
          {gun.gecmisiVar ? null : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" className="h-11 gap-1 md:h-8" disabled={bekliyor}>
                  <Trash2 className="size-4" />
                  {t("sil")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("gunSilBaslik")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("gunSilMetin", { ad: gun.ad, sayi: gun.tarihler.length })}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => calistir(() => ozelGunSilEylemi(gun.id), t("gunSilindi", { ad: gun.ad }))}>{t("sil")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      {gun.gecmisiVar ? <p className="text-muted-foreground text-xs">{t("gecmisiVarNotu")}</p> : null}

      {duzen ? (
        <div className="space-y-2 rounded-md border p-3">
          <GunAlanlari deger={deger} setDeger={setDeger} kanallar={kanallar} bekliyor={bekliyor} />
          <Button
            type="button"
            className="h-11 md:h-9"
            disabled={bekliyor || deger.ad.trim() === ""}
            onClick={() =>
              calistir(
                () => ozelGunGuncelleEylemi(gun.id, { ad: deger.ad, tur: deger.tur, channelId: deger.kanalId || null, aciklama: deger.aciklama || null }),
                t("gunKaydedildi"),
                () => setDuzen(false),
              )
            }
          >
            {t("kaydet")}
          </Button>
        </div>
      ) : null}

      {tarihEkleAcik ? (
        <div className="space-y-2 rounded-md border p-3">
          <TarihAlanlari onEk={`y-${gun.id}`} deger={yeniTarih} setDeger={setYeniTarih} bekliyor={bekliyor} />
          <Button
            type="button"
            className="h-11 md:h-9"
            disabled={bekliyor || yeniTarih.baslangic === ""}
            onClick={() =>
              calistir(() => tarihEkleEylemi(gun.id, tarihGirdisi(yeniTarih)), t("tarihEklendi"), () => {
                setYeniTarih(bosTarih);
                setTarihEkleAcik(false);
              })
            }
          >
            {t("tarihKaydet")}
          </Button>
        </div>
      ) : null}
      <MesajSatiri mesaj={mesaj} />

      {gun.tarihler.length === 0 ? (
        <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("tarihYok")}</p>
      ) : (
        <ul className="divide-y">
          {gun.tarihler.map((x) => (
            <TarihSatiri key={x.id} tarih={x} gunAdi={gun.ad} />
          ))}
        </ul>
      )}
    </div>
  );
}
