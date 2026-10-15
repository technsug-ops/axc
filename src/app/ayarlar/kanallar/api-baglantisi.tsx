"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, PlugZap, Trash2 } from "lucide-react";

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
import { HB_ORTAMLARI } from "@/lib/kanal-anahtari/kimlik";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

import { kanalAnahtariDene, kanalAnahtariKaldir, kanalAnahtariKaydet, type AnahtarDurumu } from "./anahtar-actions";

/**
 * API BAĞLANTISI — satış hesabı başına bir kutu (K303 2. adım, 14.10.2026).
 * Durum (bağlı · son 4 hane) + «Anahtar gir / Değiştir» (form yerinde açılır) +
 * «Kaldır» (onay diyaloğu, İlke #6). Gizli alanlar parola kutusudur; kaydedilen
 * anahtar ekrana HİÇ geri gelmez — yalnız son 4 hanesi.
 */
export function ApiBaglantisi({
  hesap,
}: {
  hesap: {
    id: string;
    etiket: string;
    alanlar: readonly { ad: string; gizli: boolean }[];
    /** `sonDeneme`: «Son deneme 15.10 · 02:10 — bağlandı» (sayfa sözlükten kurar) ya da hiç denenmediyse null. */
    bagli: { sonDort: string; kayitMetni: string; sonDeneme: { metin: string; basarili: boolean } | null } | null;
  };
}) {
  const t = useTranslations("KanalAnahtari");
  const [acik, setAcik] = useState(false);
  /* Ekranda YALNIZ son işlemin sonucu (Halil testi 14.10.2026: kaydetme hatası, ardından
     yapılan kaldırmanın «kaldırıldı» mesajının önünde kalıyordu). Form açılınca temizlenir. */
  const [son, setSon] = useState<AnahtarDurumu>({});
  const [, kaydetAction, kaydediyor] = useActionState<AnahtarDurumu, FormData>(async (onceki, form) => {
    const s = await kanalAnahtariKaydet(onceki, form);
    setSon(s);
    if (s.tamam) setAcik(false);
    return s;
  }, {});
  const [, kaldirAction, kaldiriyor] = useActionState<AnahtarDurumu, FormData>(async (onceki, form) => {
    const s = await kanalAnahtariKaldir(onceki, form);
    setSon(s);
    if (s.tamam) setAcik(false);
    return s;
  }, {});
  /* K337 3. adım ②: «Bağlantıyı dene» — sonucu aynı «son işlem» durumuna yazar. */
  const [, deneAction, deneniyor] = useActionState<AnahtarDurumu, FormData>(async (onceki, form) => {
    const s = await kanalAnahtariDene(onceki, form);
    setSon(s);
    return s;
  }, {});
  const mesaj = son.basari;
  const hata = son.hata;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{hesap.etiket}</p>
          {hesap.bagli ? (
            <p className={`text-sm ${DURUM_YAZISI.olumlu}`}>
              {t("bagli", { son: hesap.bagli.sonDort })} · <span className="text-muted-foreground">{hesap.bagli.kayitMetni}</span>
            </p>
          ) : null}
          {hesap.bagli?.sonDeneme ? (
            <p className={`text-xs ${hesap.bagli.sonDeneme.basarili ? DURUM_YAZISI.olumlu : DURUM_YAZISI.olumsuz}`}>{hesap.bagli.sonDeneme.metin}</p>
          ) : hesap.bagli ? (
            <p className="text-muted-foreground text-xs">{t("hicDenenmedi")}</p>
          ) : (
            <p className="text-muted-foreground text-sm">{t("bagliDegil")}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {hesap.bagli ? (
            <form action={deneAction}>
              <input type="hidden" name="hesapId" value={hesap.id} />
              <Button type="submit" variant="outline" className="h-11 md:h-9" disabled={deneniyor}>
                <PlugZap />
                {deneniyor ? t("deneniyor") : t("baglantiyiDene")}
              </Button>
            </form>
          ) : null}
          <Button type="button" variant={hesap.bagli ? "outline" : "default"} className="h-11 md:h-9" onClick={() => { setSon({}); setAcik((a) => !a); }} aria-expanded={acik}>
            <KeyRound />
            {hesap.bagli ? t("degistir") : t("anahtarGir")}
          </Button>
          {hesap.bagli ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" className="h-11 md:h-9" aria-label={t("kaldir")}>
                  <Trash2 />
                  {t("kaldir")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("kaldirOnayBaslik")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("kaldirOnayMetin", { hesap: hesap.etiket })}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("vazgec")}</AlertDialogCancel>
                  <form action={kaldirAction}>
                    <input type="hidden" name="hesapId" value={hesap.id} />
                    <Button type="submit" variant="destructive" disabled={kaldiriyor}>
                      {t("kaldirOnayla")}
                    </Button>
                  </form>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>

      {acik ? (
        <form action={kaydetAction} className="grid gap-3 sm:grid-cols-2" autoComplete="off">
          <input type="hidden" name="hesapId" value={hesap.id} />
          {hesap.alanlar.map((a) => {
            const kimlik = `anahtar-${hesap.id}-${a.ad}`;
            return (
              <div key={a.ad} className="space-y-1">
                <Label htmlFor={kimlik}>{t(`alan_${a.ad}`)}</Label>
                {a.ad === "ortam" ? (
                  <select id={kimlik} name="ortam" defaultValue="CANLI" className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm md:h-9">
                    {HB_ORTAMLARI.map((o) => (
                      <option key={o} value={o}>{t(`ortam_${o}`)}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={kimlik}
                    name={a.ad}
                    type={a.gizli ? "password" : "text"}
                    autoComplete={a.gizli ? "new-password" : "off"}
                    placeholder={a.ad === "saticiId" ? t("ipucu_saticiId") : undefined}
                    required
                    className="h-11 md:h-9"
                  />
                )}
              </div>
            );
          })}
          {hesap.bagli ? <p className="text-muted-foreground text-xs sm:col-span-2">{t("degistirNotu")}</p> : null}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={kaydediyor} className="h-11 md:h-9">
              {kaydediyor ? t("kaydediliyor") : t("kaydet")}
            </Button>
            <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => setAcik(false)}>
              {t("vazgec")}
            </Button>
          </div>
        </form>
      ) : null}

      {hata ? (
        <p role="alert" className={`rounded-md p-2 text-sm ${DURUM_KUTUSU.olumsuz} ${DURUM_YAZISI.olumsuz}`}>{hata}</p>
      ) : mesaj ? (
        <p role="status" className={`text-sm ${DURUM_YAZISI.olumlu}`}>{mesaj}</p>
      ) : null}
    </div>
  );
}
