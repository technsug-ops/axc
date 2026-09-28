"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ClipboardPaste, Plus, Trash2, Undo2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SatirEylemDugmesi } from "@/components/satir-eylemi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { odemePlaniCoz, type HareketTuru } from "@/lib/finansman/kural";

import { gerceklestir, hareketEkle, kaynakSil, planSil, planYapistir, tersKayit } from "../eylemler";

const SECIM = "border-input bg-background h-11 w-full rounded-md border px-3 text-sm md:h-9";
const bugunMetni = () => new Date().toISOString().slice(0, 10);

type Kategori = { id: string; ad: string; onerilenMi: boolean };

function KategoriSecimi({ id, kategoriler, deger, degistir }: { id: string; kategoriler: Kategori[]; deger: string; degistir: (v: string) => void }) {
  const t = useTranslations("Finansman");
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{t("alan.faizKategorisi")}</Label>
      <select id={id} className={SECIM} value={deger} onChange={(e) => degistir(e.target.value)}>
        <option value="">{t("alan.kategoriSec")}</option>
        {kategoriler.map((k) => (
          <option key={k.id} value={k.id}>
            {k.ad}
          </option>
        ))}
      </select>
      <p className="text-muted-foreground text-xs">{t("alan.faizKategorisiNot")}</p>
    </div>
  );
}

const onerilen = (kategoriler: Kategori[]) => kategoriler.find((k) => k.onerilenMi)?.id ?? "";

/**
 * K304-② — USD/altın borçta faiz+verginin o gün FİİLEN ödenen TL karşılığı.
 * Sistem çevirmez: Giderler TL/EUR konuşur, doğru rakamı ödeyen bilir.
 */
function GiderTlAlani({ id, deger, degistir }: { id: string; deger: string; degistir: (v: string) => void }) {
  const t = useTranslations("Finansman");
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{t("alan.giderTl")}</Label>
      <Input id={id} inputMode="decimal" value={deger} onChange={(e) => degistir(e.target.value)} placeholder={t("alan.giderTlOrnek")} className="min-h-11 md:min-h-9" />
      <p className="text-muted-foreground text-xs">{t("alan.giderTlNot")}</p>
    </div>
  );
}

// ------------------------------------------------------------------ HAREKET FORMU
export function HareketFormu({ finansmanId, izinliTurler, kategoriler, giderTlSorulur }: { finansmanId: string; izinliTurler: HareketTuru[]; kategoriler: Kategori[]; giderTlSorulur: boolean }) {
  const t = useTranslations("Finansman");
  const ortak = useTranslations("Ortak");
  const [acik, setAcik] = useState(false);
  const [tur, setTur] = useState<HareketTuru>(izinliTurler[0]);
  const [vade, setVade] = useState(bugunMetni());
  const [gerceklesti, setGerceklesti] = useState(false);
  const [anapara, setAnapara] = useState("");
  const [faiz, setFaiz] = useState("");
  const [vergi, setVergi] = useState("");
  const [not, setNot] = useState("");
  const [kategori, setKategori] = useState(onerilen(kategoriler));
  const [giderTl, setGiderTl] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState(false);
  const [bekliyor, basla] = useTransition();

  if (!acik) {
    return (
      <Button variant="outline" onClick={() => setAcik(true)} className="min-h-11 md:min-h-9">
        <Plus />
        {t("hareketEkle")}
      </Button>
    );
  }

  const geriOdeme = tur === "GERI_ODEME";
  const giderSorulur = gerceklesti && geriOdeme && (faiz.trim() !== "" || vergi.trim() !== "");

  return (
    <form
      className="bg-card max-w-2xl space-y-3 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setHata(null);
        setBasari(false);
        basla(async () => {
          const r = await hareketEkle({
            finansmanId,
            tur,
            vade,
            gerceklesti,
            anapara,
            faiz: geriOdeme ? faiz : "",
            vergi: geriOdeme ? vergi : "",
            note: not,
            faizKategoriId: giderSorulur ? kategori || null : null,
            giderTl: giderSorulur && giderTlSorulur ? giderTl : "",
          });
          if (r.tamam) {
            setBasari(true);
            setAnapara("");
            setFaiz("");
            setVergi("");
            setNot("");
            setGiderTl("");
          } else setHata(r.hata ?? null);
        });
      }}
    >
      <h2 className="font-medium">{t("hareketEkle")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="hr-tur">{t("alan.hareketTuru")}</Label>
          <select id="hr-tur" className={SECIM} value={tur} onChange={(e) => setTur(e.target.value as HareketTuru)}>
            {izinliTurler.map((x) => (
              <option key={x} value={x}>
                {t(`hareketTuru.${x}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="hr-vade">{t("vade")}</Label>
          <Input id="hr-vade" type="date" value={vade} onChange={(e) => setVade(e.target.value)} required className="min-h-11 md:min-h-9" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="hr-anapara">{geriOdeme ? t("anapara") : t("tutar")}</Label>
          <Input id="hr-anapara" inputMode="decimal" value={anapara} onChange={(e) => setAnapara(e.target.value)} placeholder={t("alan.tutarOrnek")} required className="min-h-11 md:min-h-9" />
        </div>
        {geriOdeme ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="hr-faiz">{t("faiz")}</Label>
              <Input id="hr-faiz" inputMode="decimal" value={faiz} onChange={(e) => setFaiz(e.target.value)} placeholder={t("alan.faizOrnek")} className="min-h-11 md:min-h-9" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hr-vergi">{t("vergi")}</Label>
              <Input id="hr-vergi" inputMode="decimal" value={vergi} onChange={(e) => setVergi(e.target.value)} placeholder={t("alan.vergiOrnek")} className="min-h-11 md:min-h-9" />
            </div>
          </>
        ) : null}
        <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={gerceklesti} onChange={(e) => setGerceklesti(e.target.checked)} className="size-5" />
          {t("alan.gerceklestiMi")}
        </label>
        {giderSorulur ? (
          <div className="space-y-3 sm:col-span-2">
            <KategoriSecimi id="hr-kategori" kategoriler={kategoriler} deger={kategori} degistir={setKategori} />
            {giderTlSorulur ? <GiderTlAlani id="hr-gider-tl" deger={giderTl} degistir={setGiderTl} /> : null}
          </div>
        ) : null}
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="hr-not">{t("alan.not")}</Label>
          <Textarea id="hr-not" rows={2} value={not} onChange={(e) => setNot(e.target.value)} />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{gerceklesti ? t("alan.gerceklestiNot") : t("alan.planliNot")}</p>
      {hata ? (
        <p className="text-destructive text-sm" role="alert">
          {hata}
        </p>
      ) : null}
      {basari ? (
        <p className="text-sm" role="status">
          {t("hareketEklendi")}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={bekliyor} className="min-h-11 md:min-h-9">
          {bekliyor ? ortak("kaydediliyor") : t("hareketKaydet")}
        </Button>
        <Button type="button" variant="outline" onClick={() => setAcik(false)} className="min-h-11 md:min-h-9">
          {ortak("kapat")}
        </Button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ PLAN YAPIŞTIR
export function PlanYapistirFormu({ finansmanId }: { finansmanId: string }) {
  const t = useTranslations("Finansman");
  const ortak = useTranslations("Ortak");
  const [acik, setAcik] = useState(false);
  const [metin, setMetin] = useState("");
  const [sonuc, setSonuc] = useState<{ tamam: boolean; mesaj: string } | null>(null);
  const [bekliyor, basla] = useTransition();
  const onizleme = metin.trim() === "" ? null : odemePlaniCoz(metin);

  if (!acik) {
    return (
      <Button variant="outline" onClick={() => setAcik(true)} className="min-h-11 md:min-h-9">
        <ClipboardPaste />
        {t("planYapistir")}
      </Button>
    );
  }

  return (
    <div className="bg-card max-w-2xl space-y-3 rounded-lg border p-4">
      <h2 className="font-medium">{t("planYapistir")}</h2>
      <p className="text-muted-foreground text-sm">{t("planYapistirAciklama")}</p>
      <Textarea rows={8} value={metin} onChange={(e) => setMetin(e.target.value)} placeholder={t("planYapistirOrnek")} className="font-mono text-xs" />
      {onizleme ? (
        <p className={`text-sm ${onizleme.hatalar.length > 0 ? "text-destructive" : ""}`} role="status">
          {onizleme.hatalar.length > 0
            ? t("planOnizlemeHata", { adet: onizleme.satirlar.length, satirlar: onizleme.hatalar.join(", ") })
            : t("planOnizleme", { adet: onizleme.satirlar.length })}
        </p>
      ) : null}
      {sonuc ? (
        <p className={`text-sm ${sonuc.tamam ? "" : "text-destructive"}`} role={sonuc.tamam ? "status" : "alert"}>
          {sonuc.mesaj}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={bekliyor || !onizleme || onizleme.hatalar.length > 0 || onizleme.satirlar.length === 0}
          onClick={() =>
            basla(async () => {
              const r = await planYapistir(finansmanId, metin);
              if (r.tamam) {
                setSonuc({ tamam: true, mesaj: t("planEklendi", { adet: r.eklenen ?? 0 }) });
                setMetin("");
              } else setSonuc({ tamam: false, mesaj: r.hata ?? "" });
            })
          }
          className="min-h-11 md:min-h-9"
        >
          {bekliyor ? ortak("kaydediliyor") : t("planKaydet")}
        </Button>
        <Button type="button" variant="outline" onClick={() => setAcik(false)} className="min-h-11 md:min-h-9">
          {ortak("kapat")}
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ SATIR EYLEMLERİ
export function GerceklestirDugmesi({ hareketId, varsayilanTarih, giderVar, giderTlSorulur, kategoriler }: { hareketId: string; varsayilanTarih: string; giderVar: boolean; giderTlSorulur: boolean; kategoriler: Kategori[] }) {
  const t = useTranslations("Finansman");
  const ortak = useTranslations("Ortak");
  const [acik, setAcik] = useState(false);
  const [tarih, setTarih] = useState(varsayilanTarih);
  const [kategori, setKategori] = useState(onerilen(kategoriler));
  const [giderTl, setGiderTl] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();
  return (
    <>
      <SatirEylemDugmesi ikon={CheckCircle2} etiket={t("gerceklestir")} onClick={() => setAcik(true)} />
      <Dialog open={acik} onOpenChange={setAcik}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("gerceklestir")}</DialogTitle>
            <DialogDescription>{giderVar ? t("gerceklestirGiderli") : t("gerceklestirAciklama")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`gr-${hareketId}`}>{t("gerceklesmeTarihi")}</Label>
              <Input id={`gr-${hareketId}`} type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="min-h-11 md:min-h-9" />
            </div>
            {giderVar ? <KategoriSecimi id={`gk-${hareketId}`} kategoriler={kategoriler} deger={kategori} degistir={setKategori} /> : null}
            {giderVar && giderTlSorulur ? <GiderTlAlani id={`gt-${hareketId}`} deger={giderTl} degistir={setGiderTl} /> : null}
            {hata ? (
              <p className="text-destructive text-sm" role="alert">
                {hata}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcik(false)} className="min-h-11 md:min-h-9">
              {ortak("vazgec")}
            </Button>
            <Button
              disabled={bekliyor}
              onClick={() =>
                basla(async () => {
                  const r = await gerceklestir(hareketId, tarih, giderVar ? kategori || null : null, giderVar && giderTlSorulur ? giderTl : null);
                  if (r.tamam) setAcik(false);
                  else setHata(r.hata ?? null);
                })
              }
              className="min-h-11 md:min-h-9"
            >
              {bekliyor ? ortak("kaydediliyor") : t("gerceklestir")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OnayliEylem({ ikon, etiket, baslik, aciklama, onayla, yikici }: { ikon: typeof Trash2; etiket: string; baslik: string; aciklama: string; onayla: () => Promise<{ tamam: boolean; hata?: string }>; yikici: boolean }) {
  const ortak = useTranslations("Ortak");
  const [acik, setAcik] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();
  const Ikon = ikon;
  return (
    <>
      <SatirEylemDugmesi ikon={ikon} etiket={etiket} onClick={() => setAcik(true)} />
      <AlertDialog open={acik} onOpenChange={setAcik}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{baslik}</AlertDialogTitle>
            <AlertDialogDescription>{aciklama}</AlertDialogDescription>
          </AlertDialogHeader>
          {hata ? (
            <p className="text-destructive text-sm" role="alert">
              {hata}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
            <Button
              variant={yikici ? "destructive" : "default"}
              disabled={bekliyor}
              onClick={() =>
                basla(async () => {
                  const r = await onayla();
                  if (r.tamam) setAcik(false);
                  else setHata(r.hata ?? null);
                })
              }
            >
              <Ikon />
              {bekliyor ? ortak("kaydediliyor") : etiket}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function TersKayitDugmesi({ hareketId, ozet }: { hareketId: string; ozet: string }) {
  const t = useTranslations("Finansman");
  return <OnayliEylem ikon={Undo2} etiket={t("tersKayit")} baslik={t("tersKayitBaslik")} aciklama={t("tersKayitAciklama", { ozet })} onayla={() => tersKayit(hareketId)} yikici={false} />;
}

export function KaynakSilDugmesi({ finansmanId, ozet }: { finansmanId: string; ozet: string }) {
  const t = useTranslations("Finansman");
  return <OnayliEylem ikon={Trash2} etiket={t("kaynakSil")} baslik={t("kaynakSilBaslik")} aciklama={t("kaynakSilAciklama", { ozet })} onayla={() => kaynakSil(finansmanId)} yikici />;
}

export function PlanSilDugmesi({ hareketId, ozet }: { hareketId: string; ozet: string }) {
  const t = useTranslations("Finansman");
  return <OnayliEylem ikon={Trash2} etiket={t("planSil")} baslik={t("planSilBaslik")} aciklama={t("planSilAciklama", { ozet })} onayla={() => planSil(hareketId)} yikici />;
}
