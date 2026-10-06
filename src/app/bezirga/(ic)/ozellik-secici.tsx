"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Save, TriangleAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { BASLANGIC_PAKETLERI, eksikBagimliliklar, OZELLIK_EKRANLARI, OZELLIKLER, type Ozellik } from "@/lib/paket/ozellikler";

import { firmaOzellikleriEylemi } from "./firmalar/actions";
import { paketIcerigiEylemi } from "./paketler/actions";

/** Özelliğin başlangıç katmanı — yalnız GÖRSEL gruplama (içerik veridir). */
function katman(o: Ozellik): string {
  return BASLANGIC_PAKETLERI.find((p) => !p.firmayaOzel && p.ozellikler.includes(o))?.ad ?? "Individuel";
}

/**
 * ÖZELLİK SEÇİCİ — paket içeriği (Basic/Silver/…) ya da Individuel firmanın
 * seçimi. Kapanan özellik varsa kaydetmeden önce ADLARIYLA onay ister
 * (İlke #6: o ekranlar firmada kapanır; veri silinmez). Bağımlılıklar uyarıdır,
 * engel değildir (docs/saas-paketleri.md §3).
 */
export function OzellikSecici({ hedef, baslangic }: { hedef: { tur: "paket" | "firma"; id: string }; baslangic: string[] }) {
  const t = useTranslations("Yonetim");
  const to = useTranslations("PaketOzelligi");
  const tm = useTranslations("Menu");
  const ortak = useTranslations("Ortak");
  const [secim, setSecim] = useState(() => new Set(baslangic));
  const [kayitli, setKayitli] = useState(() => new Set(baslangic));
  const [onayAcik, setOnayAcik] = useState(false);
  const [mesaj, setMesaj] = useState<{ hata?: string; tamam?: string }>({});
  const [bekliyor, gecis] = useTransition();

  const kapanan = useMemo(() => [...kayitli].filter((o) => !secim.has(o)), [kayitli, secim]);
  const acilan = useMemo(() => [...secim].filter((o) => !kayitli.has(o)), [kayitli, secim]);
  const eksikler = eksikBagimliliklar(secim);
  const gruplar = ["Basic", "Silver", "Gold", "Premium", "Individuel"].map((ad) => ({ ad, ozellikler: OZELLIKLER.filter((o) => katman(o) === ad) }));

  const degistir = (o: string, acik: boolean) =>
    setSecim((s) => {
      const y = new Set(s);
      if (acik) y.add(o);
      else y.delete(o);
      return y;
    });
  const kaydet = () =>
    gecis(async () => {
      const liste = [...secim];
      const r = hedef.tur === "paket" ? await paketIcerigiEylemi(hedef.id, liste) : await firmaOzellikleriEylemi(hedef.id, liste);
      setMesaj(r);
      if (r.tamam) setKayitli(new Set(liste));
      setOnayAcik(false);
    });

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{t("ozellikSayisi", { secili: secim.size, toplam: OZELLIKLER.length })}</p>
      {gruplar.map((g) => (
        <fieldset key={g.ad} className="space-y-1 rounded-lg border p-3">
          <legend className="px-1 text-sm font-semibold">{t("ozellikKatmani", { ad: g.ad })}</legend>
          {g.ozellikler.map((o) => (
            <label key={o} className="hover:bg-muted flex min-h-11 cursor-pointer items-start gap-3 rounded-md px-2 py-2">
              <input type="checkbox" className="mt-1 size-5 shrink-0" checked={secim.has(o)} onChange={(e) => degistir(o, e.target.checked)} />
              <span className="text-sm">
                <span className="font-medium">{to(o)}</span>
                <span className="text-muted-foreground block text-xs">{OZELLIK_EKRANLARI[o].map((e) => tm(e)).join(" · ")}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ))}

      {eksikler.length > 0 ? (
        <div className={`rounded-lg border p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
          <p className="font-medium">{t("bagimlilikBaslik")}</p>
          <ul className="list-disc pl-5">
            {eksikler.map((b) => (
              <li key={b.anahtar}>{t(b.anahtar)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button className="min-h-11" disabled={bekliyor || (kapanan.length === 0 && acilan.length === 0)} onClick={() => (kapanan.length > 0 ? setOnayAcik(true) : kaydet())}>
        <Save />
        {t("ozellikleriKaydet")}
      </Button>
      {kapanan.length === 0 && acilan.length === 0 ? <p className="text-muted-foreground text-xs">{t("ozellikDegisiklikYok")}</p> : null}

      <AlertDialog open={onayAcik} onOpenChange={setOnayAcik}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ozellikKapanacakBaslik", { sayi: kapanan.length })}</AlertDialogTitle>
            <AlertDialogDescription>{t("ozellikKapanacakMetin", { liste: kapanan.map((o) => to(o)).join(", ") })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">{ortak("vazgec")}</AlertDialogCancel>
            <Button variant="destructive" className="min-h-11" disabled={bekliyor} onClick={kaydet}>
              {t("ozellikleriKaydet")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {mesaj.tamam ? <p role="status" className={`text-sm ${DURUM_YAZISI.olumlu}`}>{mesaj.tamam}</p> : null}
      {mesaj.hata ? (
        <p role="alert" className={`flex items-center gap-1.5 text-sm ${DURUM_YAZISI.olumsuz}`}>
          <TriangleAlert className="size-4 shrink-0" />
          {mesaj.hata}
        </p>
      ) : null}
    </div>
  );
}
