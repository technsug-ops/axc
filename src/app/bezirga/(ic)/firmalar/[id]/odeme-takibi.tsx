"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Mail, Plus, Save, TriangleAlert, Undo2 } from "lucide-react";

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

import { abonelikKaydetEylemi, odemeDuzeltEylemi, odemeHatirlatEylemi, odemeKaydetEylemi, type OdemeEylemDurumu } from "../actions";

/** Sunucuda hesaplanmış, biçimlendirilmiş ödeme durumu (İstanbul günü). */
export type OdemeGorunumu =
  | { tur: "TANIMSIZ" }
  | { tur: "ZAMANINDA" | "YAKLASIYOR"; kalanGun: number; vade: string }
  | { tur: "GECIKTI"; gecenGun: number; vade: string };

export type OdemeSatiri = {
  id: string;
  gun: string;
  tutar: string;
  yontem: string;
  aciklama: string | null;
  tersKayit: boolean;
  duzeltildi: boolean;
  yazan: string;
};

const SECIM_SINIFI = "border-input bg-background min-h-11 w-full rounded-md border px-3 text-sm";
const YONTEMLER = ["HAVALE", "KART", "NAKIT", "DIGER"] as const;

/**
 * Süper admin firma kartı — ELLE ÖDEME TAKİBİ (kullanıcı kararı 06.10.2026).
 * Abonelik tanımı · «ödeme alındı» · ödeme defteri (toplamıyla, İlke #15) ·
 * ters kayıt (onaylı, İlke #6) · hatırlatma e-postası. Gecikmede askı
 * sürecine bağlantı verir; askıyı KENDİLİĞİNDEN başlatmaz.
 */
export function OdemeTakibi({
  firmaId,
  firmaAdi,
  durum,
  abonelik,
  bugun,
  satirlar,
  toplamlar,
}: {
  firmaId: string;
  firmaAdi: string;
  durum: OdemeGorunumu;
  /** Form varsayılanları: tutar «1500,00», vade ISO gün. */
  abonelik: { tutar: string; tutarMetni: string | null; paraBirimi: string; donem: string; vade: string; oneriMetni: string | null };
  bugun: string;
  satirlar: OdemeSatiri[];
  toplamlar: string[];
}) {
  const t = useTranslations("Yonetim");
  const ortak = useTranslations("Ortak");
  const [ab, abEylemi, abBekliyor] = useActionState<OdemeEylemDurumu, FormData>(abonelikKaydetEylemi, {});
  const [od, odEylemi, odBekliyor] = useActionState<OdemeEylemDurumu, FormData>(odemeKaydetEylemi, {});
  const [bekliyor, gecis] = useTransition();
  const [mesaj, setMesaj] = useState<{ hata?: string; tamam?: string }>({});
  const [hatirlatAcik, setHatirlatAcik] = useState(false);
  const [tersAcik, setTersAcik] = useState<string | null>(null);
  const [tersNeden, setTersNeden] = useState("");

  const durumMetni =
    durum.tur === "TANIMSIZ" ? t("odemeDurumTanimsiz")
    : durum.tur === "GECIKTI" ? t("odemeDurumGecikti", { gecen: durum.gecenGun, tarih: durum.vade })
    : durum.kalanGun === 0 ? t("odemeDurumBugun", { tarih: durum.vade })
    : t("odemeDurumKalan", { kalan: durum.kalanGun, tarih: durum.vade });
  const kutu = durum.tur === "GECIKTI" ? DURUM_KUTUSU.olumsuz : durum.tur === "YAKLASIYOR" ? DURUM_KUTUSU.uyari : "";
  const tanimli = durum.tur !== "TANIMSIZ";

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{t("odemeAciklamaNotu")}</p>

      <div className={`rounded-lg border p-3 text-sm ${kutu}`}>
        <p className="font-medium">{durumMetni}</p>
        {abonelik.tutarMetni ? (
          <p>{t("abonelikOzeti", { tutar: abonelik.tutarMetni, donem: t(`donem${abonelik.donem}`) })}</p>
        ) : null}
        {durum.tur === "GECIKTI" ? (
          <a href="#aski" className="text-sm font-medium underline underline-offset-4">{t("odemeAskiyaGec")}</a>
        ) : null}
      </div>

      {/* HATIRLATMA — yöneticilere e-posta (onaylı: dışarı gider) */}
      {tanimli ? (
        <AlertDialog open={hatirlatAcik} onOpenChange={setHatirlatAcik}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="min-h-11">
              <Mail />
              {t("hatirlatmaGonder")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("hatirlatmaOnayBaslik", { firma: firmaAdi })}</AlertDialogTitle>
              <AlertDialogDescription>{t("hatirlatmaOnayMetin")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-11">{ortak("vazgec")}</AlertDialogCancel>
              <Button className="min-h-11" disabled={bekliyor} onClick={() => gecis(async () => { setMesaj(await odemeHatirlatEylemi(firmaId)); setHatirlatAcik(false); })}>
                {t("hatirlatmaGonder")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {/* ÖDEME ALINDI */}
      <form action={odEylemi} className="space-y-2 rounded-lg border p-3">
        <h3 className="text-sm font-semibold">{t("odemeAlindiBaslik")}</h3>
        <input type="hidden" name="firmaId" value={firmaId} />
        <div className="grid gap-2 sm:grid-cols-[10rem_1fr_6rem_8rem]">
          <div className="space-y-1">
            <Label htmlFor="odeme-gun">{t("odemeGunuEtiketi")}</Label>
            <Input id="odeme-gun" name="gun" type="date" required defaultValue={bugun} max={bugun} className="min-h-11" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="odeme-tutar">{t("tutarEtiketi")}</Label>
            <Input id="odeme-tutar" name="tutar" inputMode="decimal" required defaultValue={abonelik.tutar} placeholder={t("tutarIpucu")} className="min-h-11" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="odeme-para">{t("paraBirimiEtiketi")}</Label>
            <select id="odeme-para" name="paraBirimi" defaultValue={abonelik.paraBirimi} className={SECIM_SINIFI}>
              <option value="TRY">TRY</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="odeme-yontem">{t("yontemEtiketi")}</Label>
            <select id="odeme-yontem" name="yontem" defaultValue="HAVALE" className={SECIM_SINIFI}>
              {YONTEMLER.map((y) => (
                <option key={y} value={y}>{t(`odemeYontemi${y}`)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="odeme-aciklama">{t("aciklamaEtiketi")}</Label>
          <Input id="odeme-aciklama" name="aciklama" maxLength={500} placeholder={t("odemeAciklamaIpucu")} className="min-h-11" />
        </div>
        <p className="text-muted-foreground text-xs">{tanimli ? t("odemeVadeNotu") : t("odemeVadeYokNotu")}</p>
        <Button type="submit" className="min-h-11" disabled={odBekliyor}>
          <Plus />
          {t("odemeKaydet")}
        </Button>
        {od.tamam ? <p role="status" className={`text-sm ${DURUM_YAZISI.olumlu}`}>{od.tamam}</p> : null}
        <HataOzeti hatalar={od.hatalar} baslik={t("kaydedilemedi")} />
      </form>

      {mesaj.tamam ? <p role="status" className={`text-sm ${DURUM_YAZISI.olumlu}`}>{mesaj.tamam}</p> : null}
      {mesaj.hata ? (
        <p role="alert" className={`flex items-center gap-1.5 text-sm ${DURUM_YAZISI.olumsuz}`}>
          <TriangleAlert className="size-4 shrink-0" />
          {mesaj.hata}
        </p>
      ) : null}

      {/* ÖDEME DEFTERİ — toplamıyla (İlke #15) */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{t("odemeDefteriBaslik")}</h3>
        {satirlar.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("odemeYok")}</p>
        ) : (
          <>
            <p className="text-sm">
              {t("odemeToplami", { sayi: satirlar.length })} <span className="font-semibold tabular-nums">{toplamlar.join(" · ")}</span>
            </p>
            <ul className="divide-y rounded-lg border text-sm">
              {satirlar.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2">
                  <span className="text-muted-foreground tabular-nums">{s.gun}</span>
                  <span className={`font-semibold tabular-nums ${s.tersKayit ? DURUM_YAZISI.olumsuz : ""}`}>{s.tutar}</span>
                  <span>{t(`odemeYontemi${s.yontem}`)}</span>
                  {s.tersKayit ? <span className="text-muted-foreground">{t("tersKayitEtiketi")}</span> : null}
                  {s.duzeltildi ? <span className="text-muted-foreground">{t("duzeltildiEtiketi")}</span> : null}
                  {s.aciklama ? <span className="text-muted-foreground">— {s.aciklama}</span> : null}
                  <span className="text-muted-foreground ml-auto text-xs">{s.yazan}</span>
                  {!s.tersKayit && !s.duzeltildi ? (
                    <AlertDialog open={tersAcik === s.id} onOpenChange={(a) => { setTersAcik(a ? s.id : null); setTersNeden(""); }}>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="min-h-11">
                          <Undo2 />
                          {t("tersKayitDugmesi")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("tersKayitOnayBaslik", { tutar: s.tutar, gun: s.gun })}</AlertDialogTitle>
                          <AlertDialogDescription>{t("tersKayitOnayMetin")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-1">
                          <Label htmlFor={`ters-${s.id}`}>{t("tersKayitNedeni")}</Label>
                          <Textarea id={`ters-${s.id}`} value={tersNeden} onChange={(e) => setTersNeden(e.target.value)} maxLength={500} placeholder={t("tersKayitNedeniIpucu")} />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="min-h-11">{ortak("vazgec")}</AlertDialogCancel>
                          <Button
                            variant="destructive"
                            className="min-h-11"
                            disabled={bekliyor || !tersNeden.trim()}
                            onClick={() => gecis(async () => { setMesaj(await odemeDuzeltEylemi(firmaId, s.id, tersNeden)); setTersAcik(null); })}
                          >
                            {t("tersKayitDugmesi")}
                          </Button>
                        </AlertDialogFooter>
                        {!tersNeden.trim() ? <p className="text-muted-foreground text-xs">{t("tersKayitNedenGerekli")}</p> : null}
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* ABONELİK TANIMI */}
      <form action={abEylemi} className="space-y-2 rounded-lg border p-3">
        <h3 className="text-sm font-semibold">{t("abonelikBaslik")}</h3>
        <input type="hidden" name="firmaId" value={firmaId} />
        <div className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem_10rem]">
          <div className="space-y-1">
            <Label htmlFor="abone-tutar">{t("tutarEtiketi")}</Label>
            <Input id="abone-tutar" name="tutar" inputMode="decimal" required defaultValue={abonelik.tutar} placeholder={t("tutarIpucu")} className="min-h-11" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="abone-para">{t("paraBirimiEtiketi")}</Label>
            <select id="abone-para" name="paraBirimi" defaultValue={abonelik.paraBirimi} className={SECIM_SINIFI}>
              <option value="TRY">TRY</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="abone-donem">{t("donemEtiketi")}</Label>
            <select id="abone-donem" name="donem" defaultValue={abonelik.donem} className={SECIM_SINIFI}>
              <option value="AYLIK">{t("donemAYLIK")}</option>
              <option value="YILLIK">{t("donemYILLIK")}</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="abone-vade">{t("sonrakiOdemeEtiketi")}</Label>
            <Input id="abone-vade" name="vade" type="date" required defaultValue={abonelik.vade} className="min-h-11" />
          </div>
        </div>
        {abonelik.oneriMetni ? <p className="text-sm">{t("paketOnerisiMetni", { oneri: abonelik.oneriMetni })}</p> : null}
        <p className="text-muted-foreground text-xs">{t("abonelikNotu")}</p>
        <Button type="submit" variant="outline" className="min-h-11" disabled={abBekliyor}>
          <Save />
          {t("abonelikKaydet")}
        </Button>
        {ab.tamam ? <p role="status" className={`text-sm ${DURUM_YAZISI.olumlu}`}>{ab.tamam}</p> : null}
        <HataOzeti hatalar={ab.hatalar} baslik={t("kaydedilemedi")} />
      </form>
    </div>
  );
}
