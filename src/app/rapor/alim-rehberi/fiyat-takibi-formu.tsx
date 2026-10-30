"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pause, Pencil, Play, Search, Trash2 } from "lucide-react";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
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

import { varyantAra, varyantKodlaBul } from "../../varyant-arama";
import { hedefAktifEylemi, hedefSilEylemi, hedefYazEylemi, type HedefEylemSonucu } from "./fiyat-takibi-eylemleri";

/**
 * Fiyat takibi — istemci parçaları (K363 Faz 3-d). Her sonuç olduğu yerde
 * YAZAR (İlke #5); silme onay ister (İlke #6); ürün kodu okutulur ya da kamerayla
 * okunur (İlke #7); dokunma hedefleri telefonda 44 px (İlke #8 — `h-11`,
 * masaüstünde `md:h-9`).
 */

type Mesaj = { tur: "olumlu" | "olumsuz"; metin: string } | null;
type Aday = { id: string; ad: string; sku: string; barkod: string | null };

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
  const t = useTranslations("FiyatTakibi");
  const router = useRouter();
  const [mesaj, setMesaj] = useState<Mesaj>(null);
  const [bekliyor, basla] = useTransition();
  const calistir = (is: () => Promise<HedefEylemSonucu>, basari: string, sonra?: () => void) => {
    setMesaj(null);
    basla(async () => {
      const s = await is();
      if (!s.tamam) {
        setMesaj({ tur: "olumsuz", metin: t(`hata.${s.hata}`) });
        return;
      }
      setMesaj({ tur: "olumlu", metin: basari });
      sonra?.();
      router.refresh();
    });
  };
  return { mesaj, setMesaj, bekliyor, calistir };
}

export function YeniHedefFormu() {
  const t = useTranslations("FiyatTakibi");
  const { mesaj, setMesaj, bekliyor, calistir } = useEylem();
  const [arama, setArama] = useState("");
  const [adaylar, setAdaylar] = useState<Aday[] | null>(null);
  const [secili, setSecili] = useState<Aday | null>(null);
  const [fiyat, setFiyat] = useState("");
  const [araniyor, aramaBasla] = useTransition();

  /** Okutulan kod TAM eşleşme ister (`varyantKodlaBul`); kod okunan değer PARAMETRE olarak gelir (anayasa: okuma değeri doğrudan taşır). */
  const kodOkundu = (kod: string) => {
    setMesaj(null);
    aramaBasla(async () => {
      const s = await varyantKodlaBul(kod);
      if (s.durum === "TEK") {
        setSecili({ id: s.varyant.id, ad: s.varyant.urunAdi, sku: s.varyant.sku, barkod: s.varyant.barcode });
        setAdaylar(null);
      } else if (s.durum === "COK") {
        setAdaylar(s.adaylar.map((a) => ({ id: a.id, ad: a.ad, sku: a.sku, barkod: a.barcode })));
      } else {
        setAdaylar([]);
      }
    });
  };

  /** Serbest metin: ad ya da kodun bir kısmı (`varyantAra`, en az 2 harf). */
  const ara = () => {
    const q = arama.trim();
    if (q.length < 2) {
      setMesaj({ tur: "olumsuz", metin: t("aramaKisa") });
      return;
    }
    setMesaj(null);
    aramaBasla(async () => {
      const s = await varyantAra(q);
      setAdaylar(s.slice(0, 10).map((v) => ({ id: v.id, ad: v.urunAdi, sku: v.sku, barkod: v.barcode })));
    });
  };

  const kaydet = () => {
    if (!secili) return;
    calistir(() => hedefYazEylemi(secili.id, fiyat), t("eklendi", { ad: secili.ad }), () => {
      setSecili(null);
      setFiyat("");
      setArama("");
      setAdaylar(null);
    });
  };

  return (
    <div className="space-y-3">
      {secili === null ? (
        <div className="space-y-2">
          <label className="block space-y-1 text-sm">
            <span className="block font-medium">{t("urunEtiketi")}</span>
            <div className="flex gap-2">
              <BarkodGirisi
                className="min-w-0 flex-1"
                value={arama}
                onChange={setArama}
                onOkundu={kodOkundu}
                placeholder={t("urunYerTutucu")}
                kameraBasligi={t("kameraBasligi")}
                disabled={araniyor}
              />
              <Button type="button" variant="outline" className="h-11 gap-1 md:h-9" disabled={araniyor} onClick={ara}>
                <Search className="size-4" />
                {t("ara")}
              </Button>
            </div>
          </label>
          <p className="text-muted-foreground text-xs">{t("urunNotu")}</p>
          {araniyor ? <p className="text-muted-foreground text-sm">{t("araniyor")}</p> : null}
          {adaylar !== null && !araniyor ? (
            adaylar.length === 0 ? (
              <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("urunBulunamadi")}</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {adaylar.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSecili(a);
                        setAdaylar(null);
                      }}
                      className="hover:bg-muted flex min-h-11 w-full flex-col items-start px-3 py-2 text-left text-sm"
                    >
                      <span className="font-medium underline underline-offset-2">{a.ad}</span>
                      <span className="text-muted-foreground text-xs">
                        {a.sku}
                        {a.barkod ? ` · ${a.barkod}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{secili.ad}</p>
              <p className="text-muted-foreground text-xs">
                {secili.sku}
                {secili.barkod ? ` · ${secili.barkod}` : ""}
              </p>
            </div>
            <Button type="button" variant="outline" className="h-11 md:h-9" disabled={bekliyor} onClick={() => setSecili(null)}>
              {t("urunDegistir")}
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1 text-sm">
              <span className="block font-medium">{t("hedefEtiketi")}</span>
              <Input
                value={fiyat}
                inputMode="decimal"
                autoComplete="off"
                disabled={bekliyor}
                placeholder={t("hedefYerTutucu")}
                onChange={(e) => setFiyat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    kaydet();
                  }
                }}
                className="h-11 w-40 md:h-9"
              />
            </label>
            <Button type="button" className="h-11 md:h-9" disabled={bekliyor || fiyat.trim() === ""} onClick={kaydet}>
              {bekliyor ? t("kaydediliyor") : t("takibeAl")}
            </Button>
          </div>
        </div>
      )}
      <MesajSatiri mesaj={mesaj} />
    </div>
  );
}

/** Satırın görünür eylemleri (İlke #1): hedefi düzenle · takibi durdur/başlat · sil (onaylı). */
export function HedefEylemleri({ id, variantId, urunAdi, hedefMetni, aktif }: { id: string; variantId: string; urunAdi: string; hedefMetni: string; aktif: boolean }) {
  const t = useTranslations("FiyatTakibi");
  const ortak = useTranslations("Ortak");
  const { mesaj, bekliyor, calistir } = useEylem();
  const [duzen, setDuzen] = useState(false);
  const [fiyat, setFiyat] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Button type="button" variant="outline" className="h-11 gap-1 md:h-8" disabled={bekliyor} aria-expanded={duzen} onClick={() => setDuzen(!duzen)}>
          <Pencil className="size-4" />
          {t("hedefDegistir")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 gap-1 md:h-8"
          disabled={bekliyor}
          onClick={() => calistir(() => hedefAktifEylemi(id, !aktif), aktif ? t("durduruldu") : t("baslatildi"))}
        >
          {aktif ? <Pause className="size-4" /> : <Play className="size-4" />}
          {aktif ? t("durdur") : t("baslat")}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" className="h-11 gap-1 md:h-8" disabled={bekliyor}>
              <Trash2 className="size-4" />
              {ortak("sil")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("silBaslik")}</AlertDialogTitle>
              <AlertDialogDescription>{t("silMetin", { ad: urunAdi, hedef: hedefMetni })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => calistir(() => hedefSilEylemi(id), t("silindi", { ad: urunAdi }))}>{ortak("sil")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {duzen ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1 text-sm">
            <span className="block">{t("yeniHedef")}</span>
            <Input
              value={fiyat}
              inputMode="decimal"
              autoComplete="off"
              disabled={bekliyor}
              placeholder={t("hedefYerTutucu")}
              onChange={(e) => setFiyat(e.target.value)}
              className="h-11 w-36 md:h-9"
            />
          </label>
          <Button
            type="button"
            className="h-11 md:h-9"
            disabled={bekliyor || fiyat.trim() === ""}
            onClick={() => calistir(() => hedefYazEylemi(variantId, fiyat), t("hedefKaydedildi"), () => setDuzen(false))}
          >
            {t("kaydet")}
          </Button>
        </div>
      ) : null}
      <MesajSatiri mesaj={mesaj} />
    </div>
  );
}
