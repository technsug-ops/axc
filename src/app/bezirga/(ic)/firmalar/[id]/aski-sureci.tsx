"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Ban, BellOff, BellRing, Power, TriangleAlert } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

import { askiyaAlEylemi, firmaDurumu, uyariBaslatEylemi, uyariKaldirEylemi, type AskiEylemDurumu } from "../actions";

/** Sunucuda hesaplanmış, biçimlendirilmiş durum (İstanbul günü). */
export type AskiGorunumu =
  | { tur: "NORMAL" }
  | { tur: "UYARIDA"; kalanGun: number; sonGun: string; sebep: string | null }
  | { tur: "SURESI_DOLDU"; gecenGun: number; sonGun: string; sebep: string | null }
  | { tur: "ASKIDA"; sebep: string | null };

export type GecmisSatiri = { tur: string; an: string; yapan: string | null; sebep: string | null; aciklama: string | null; sonGun: string | null };

const SEBEPLER = ["ODEME_GECIKMESI", "SOZLESME_IHLALI", "FIRMA_ISTEGI", "GUVENLIK", "DIGER"] as const;
const SECIM_SINIFI = "border-input bg-background min-h-11 w-full rounded-md border px-3 text-sm";

/**
 * Süper admin firma kartı — ASKI SÜRECİ (kullanıcı kararı 05.10.2026).
 * Uyarı → süre → askı (onaylı). Her yıkıcı adım onay ister (İlke #6); sonuç
 * ve e-posta özeti görünür yazar (İlke #5).
 */
export function AskiSureci({
  firmaId,
  firmaAdi,
  durum,
  aciklama,
  gecmis,
  enAzGun,
  enCokGun,
}: {
  firmaId: string;
  firmaAdi: string;
  durum: AskiGorunumu;
  aciklama: string | null;
  gecmis: GecmisSatiri[];
  enAzGun: number;
  enCokGun: number;
}) {
  const t = useTranslations("Yonetim");
  const ts = useTranslations("AskiSebebi");
  const ortak = useTranslations("Ortak");
  const [uyari, uyariEylemi, uyariBekliyor] = useActionState<AskiEylemDurumu, FormData>(uyariBaslatEylemi, {});
  const [aski, askiEylemi, askiBekliyor] = useActionState<AskiEylemDurumu, FormData>(askiyaAlEylemi, {});
  const [bekliyor, gecis] = useTransition();
  const [mesaj, setMesaj] = useState<{ hata?: string; tamam?: string }>({});
  const [uyariAcik, setUyariAcik] = useState(false);
  const [askiAcik, setAskiAcik] = useState(false);
  const [kaldirAcik, setKaldirAcik] = useState(false);
  const [aktifAcik, setAktifAcik] = useState(false);

  const uyariVar = durum.tur === "UYARIDA" || durum.tur === "SURESI_DOLDU";
  const varsayilanSebep = uyariVar ? durum.sebep ?? "" : "";

  const durumMetni =
    durum.tur === "NORMAL" ? t("durumNormal")
    : durum.tur === "UYARIDA" ? (durum.kalanGun === 0 ? t("durumUyaridaBugun") : t("durumUyarida", { kalan: durum.kalanGun }))
    : durum.tur === "SURESI_DOLDU" ? t("durumSuresiDoldu", { gecen: durum.gecenGun })
    : t("durumAskida");
  const kutu = durum.tur === "NORMAL" ? "" : durum.tur === "UYARIDA" ? DURUM_KUTUSU.uyari : DURUM_KUTUSU.olumsuz;

  const sebepAlani = (id: string, varsayilan: string) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{t("sebepEtiketi")}</Label>
      <select id={id} name="sebep" required defaultValue={varsayilan} className={SECIM_SINIFI}>
        <option value="" disabled>—</option>
        {SEBEPLER.map((s) => (
          <option key={s} value={s}>{ts(s)}</option>
        ))}
      </select>
    </div>
  );
  const aciklamaAlani = (id: string, varsayilan: string) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{t("aciklamaEtiketi")}</Label>
      <Textarea id={id} name="aciklama" defaultValue={varsayilan} placeholder={t("aciklamaIpucu")} maxLength={500} />
      <p className="text-muted-foreground text-xs">{t("aciklamaDigerNotu")}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{t("askiAciklamaNotu")}</p>

      <div className={`rounded-lg border p-3 text-sm ${kutu}`}>
        <p className="font-medium">{durumMetni}</p>
        {durum.tur !== "NORMAL" && durum.sebep ? (
          <p>{t("sebepEtiketi")}: {ts(durum.sebep)}{aciklama ? ` — ${aciklama}` : ""}</p>
        ) : null}
        {uyariVar ? <p className="text-xs">{t("izSonGun", { tarih: durum.sonGun })}</p> : null}
      </div>

      {/* UYARI BAŞLAT — normal ya da uyarıdaki firmaya (yenisi eskinin yerine geçer) */}
      {durum.tur !== "ASKIDA" ? (
        <form id="uyari-formu" action={uyariEylemi} className="space-y-2 rounded-lg border p-3">
          <input type="hidden" name="firmaId" value={firmaId} />
          <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
            {sebepAlani("uyari-sebep", varsayilanSebep)}
            <div className="space-y-1">
              <Label htmlFor="uyari-gun">{t("gunEtiketi")}</Label>
              <Input id="uyari-gun" name="gun" type="number" inputMode="numeric" min={enAzGun} max={enCokGun} required placeholder={t("gunIpucu")} className="min-h-11" />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">{t("gunNotu", { enAz: enAzGun, enCok: enCokGun })}</p>
          {aciklamaAlani("uyari-aciklama", "")}
          <AlertDialog open={uyariAcik} onOpenChange={setUyariAcik}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" className="min-h-11" disabled={uyariBekliyor}>
                <BellRing />
                {t("uyariBaslat")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("uyariBaslatOnayBaslik", { firma: firmaAdi })}</AlertDialogTitle>
                <AlertDialogDescription>{t("uyariBaslatOnayMetin")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-11">{ortak("vazgec")}</AlertDialogCancel>
                <Button className="min-h-11" onClick={() => { (document.getElementById("uyari-formu") as HTMLFormElement | null)?.requestSubmit(); setUyariAcik(false); }}>
                  {t("uyariBaslat")}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {uyari.tamam ? <p role="status" className={`text-sm ${DURUM_YAZISI.olumlu}`}>{uyari.tamam}</p> : null}
          <HataOzeti hatalar={uyari.hatalar} baslik={t("kaydedilemedi")} />
        </form>
      ) : null}

      {/* UYARIYI KALDIR */}
      {uyariVar ? (
        <AlertDialog open={kaldirAcik} onOpenChange={setKaldirAcik}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="min-h-11">
              <BellOff />
              {t("uyariyiKaldir")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("uyariKaldirOnayBaslik")}</AlertDialogTitle>
              <AlertDialogDescription>{t("uyariKaldirOnayMetin")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-11">{ortak("vazgec")}</AlertDialogCancel>
              <Button className="min-h-11" disabled={bekliyor} onClick={() => gecis(async () => { setMesaj(await uyariKaldirEylemi(firmaId)); setKaldirAcik(false); })}>
                {t("uyariyiKaldir")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {/* ASKIYA AL — onaylı; süre dolmadıysa ayrıca söyler */}
      {durum.tur !== "ASKIDA" ? (
        <form id="aski-formu" action={askiEylemi} className="space-y-2 rounded-lg border p-3">
          <input type="hidden" name="firmaId" value={firmaId} />
          {sebepAlani("aski-sebep", varsayilanSebep)}
          {aciklamaAlani("aski-aciklama", uyariVar ? aciklama ?? "" : "")}
          <AlertDialog open={askiAcik} onOpenChange={setAskiAcik}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" className="min-h-11" disabled={askiBekliyor}>
                <Ban />
                {t("askiyaAl")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("askiyaAlOnayBaslik", { firma: firmaAdi })}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("askiyaAlOnayMetin")}
                  {durum.tur === "UYARIDA" ? ` ${t("askiyaAlSureDolmadi", { tarih: durum.sonGun })}` : ""}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="min-h-11">{ortak("vazgec")}</AlertDialogCancel>
                <Button variant="destructive" className="min-h-11" onClick={() => { (document.getElementById("aski-formu") as HTMLFormElement | null)?.requestSubmit(); setAskiAcik(false); }}>
                  {t("askiyaAl")}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {aski.tamam ? <p role="status" className={`text-sm ${DURUM_YAZISI.olumlu}`}>{aski.tamam}</p> : null}
          <HataOzeti hatalar={aski.hatalar} baslik={t("kaydedilemedi")} />
        </form>
      ) : (
        <AlertDialog open={aktifAcik} onOpenChange={setAktifAcik}>
          <AlertDialogTrigger asChild>
            <Button className="min-h-11">
              <Power />
              {t("askiyiKaldir")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("aktiflestirOnayBaslik", { firma: firmaAdi })}</AlertDialogTitle>
              <AlertDialogDescription>{t("aktiflestirOnayMetin")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-11">{ortak("vazgec")}</AlertDialogCancel>
              <Button className="min-h-11" disabled={bekliyor} onClick={() => gecis(async () => { setMesaj(await firmaDurumu(firmaId, true)); setAktifAcik(false); })}>
                {t("askiyiKaldir")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {mesaj.tamam ? <p role="status" className={`text-sm ${DURUM_YAZISI.olumlu}`}>{mesaj.tamam}</p> : null}
      {mesaj.hata ? (
        <p role="alert" className={`flex items-center gap-1.5 text-sm ${DURUM_YAZISI.olumsuz}`}>
          <TriangleAlert className="size-4 shrink-0" />
          {mesaj.hata}
        </p>
      ) : null}

      {/* SÜREÇ GEÇMİŞİ — izden */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{t("gecmisBaslik")}</h3>
        {gecmis.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("gecmisYok")}</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {gecmis.map((g, i) => (
              <li key={i} className="flex flex-wrap gap-x-3 gap-y-0.5 px-3 py-2">
                <span className="text-muted-foreground tabular-nums">{g.an}</span>
                <span className="font-medium">
                  {g.tur === "FIRMA_UYARI_BASLADI" ? t("izUyari") : g.tur === "FIRMA_UYARI_KALDIRILDI" ? t("izUyariKaldirildi") : g.tur === "FIRMA_PASIFE_ALINDI" ? t("izAski") : t("izAktif")}
                </span>
                {g.sebep ? <span>{ts(g.sebep)}</span> : null}
                {g.sonGun ? <span className="text-muted-foreground">{t("izSonGun", { tarih: g.sonGun })}</span> : null}
                {g.aciklama ? <span className="text-muted-foreground">— {g.aciklama}</span> : null}
                {g.yapan ? <span className="text-muted-foreground ml-auto text-xs">{g.yapan}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
