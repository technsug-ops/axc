"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Package, TriangleAlert } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { OZELLIKLER } from "@/lib/paket/ozellikler";

import { firmaPaketiEylemi } from "../actions";
import { OzellikSecici } from "../../ozellik-secici";

type Sinirlar = { kanalHesabi: number | null; kullanici: number | null; aylikSiparis: number | null };
type PaketSecenegi = { id: string; ad: string; firmayaOzel: boolean; ozellikler: string[]; sinirlar: Sinirlar };

const SECIM_SINIFI = "border-input bg-background min-h-11 w-full rounded-md border px-3 text-sm";

/**
 * Firma kartı — PAKET (K303 ②). Paket değişince kapanacak ekranlar kaydetmeden
 * ÖNCE adlarıyla söylenir (İlke #6; veri silinmez). Individuel'e geçişte firma
 * seçimi bugünkü açık kümeden kurulur — o yüzden kapanan yok.
 */
export function FirmaPaketi({
  firmaId,
  firmaAdi,
  paketId,
  acik,
  paketler,
  kullanim,
}: {
  kullanim: { kanalHesabi: number; kullanici: number; aylikSiparis: number };
  firmaId: string;
  firmaAdi: string;
  paketId: string | null;
  acik: string[];
  paketler: PaketSecenegi[];
}) {
  const t = useTranslations("Yonetim");
  const to = useTranslations("PaketOzelligi");
  const ortak = useTranslations("Ortak");
  const [secilen, setSecilen] = useState(paketId ?? "");
  const [onayAcik, setOnayAcik] = useState(false);
  const [mesaj, setMesaj] = useState<{ hata?: string; tamam?: string }>({});
  const [bekliyor, gecis] = useTransition();

  const simdiki = paketler.find((p) => p.id === paketId) ?? null;
  const hedef = paketler.find((p) => p.id === secilen) ?? null;
  // Individuel'e geçişte seçim bugünkü açık kümeden kurulur (sunucu kuralı) → hiçbir şey kapanmaz.
  const sonra = hedef ? (hedef.firmayaOzel ? acik : hedef.ozellikler) : [];
  const kapanan = acik.filter((o) => !sonra.includes(o));
  const acilan = sonra.filter((o) => !acik.includes(o));
  // Yeni paketin SINIRINI aşan mevcut kayıt (silinmez; yeni eklenemez). Individuel'de sınır firmada kalır.
  const fazla = hedef && !hedef.firmayaOzel
    ? (["kanalHesabi", "kullanici", "aylikSiparis"] as const).filter((a) => hedef.sinirlar[a] !== null && kullanim[a] > (hedef.sinirlar[a] as number))
    : [];
  const tps = useTranslations("PaketSiniri");

  return (
    <div className="space-y-3">
      {!simdiki ? (
        <p className={`rounded-lg border p-3 text-sm font-medium ${DURUM_KUTUSU.olumsuz}`}>{t("firmaPaketsiz")}</p>
      ) : (
        <p className="text-sm">
          {t("firmaPaketiSatiri", { ad: simdiki.ad })}{" "}
          <span className="text-muted-foreground">{t("ozellikSayisi", { secili: acik.length, toplam: OZELLIKLER.length })}</span>
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1 space-y-1">
          <Label htmlFor="firma-paket-sec">{t("paketEtiketi")}</Label>
          <select id="firma-paket-sec" value={secilen} onChange={(e) => setSecilen(e.target.value)} className={SECIM_SINIFI}>
            <option value="" disabled>—</option>
            {paketler.map((p) => (
              <option key={p.id} value={p.id}>{p.firmayaOzel ? t("paketFirmayaOzelAdi", { ad: p.ad }) : p.ad}</option>
            ))}
          </select>
        </div>
        <Button className="min-h-11" disabled={bekliyor || !hedef || secilen === paketId} onClick={() => setOnayAcik(true)}>
          <Package />
          {t("paketiDegistir")}
        </Button>
      </div>
      {hedef && secilen !== paketId ? (
        <p className="text-muted-foreground text-xs">{t("paketDegisimOnizleme", { acilan: acilan.length, kapanan: kapanan.length })}</p>
      ) : null}

      <AlertDialog open={onayAcik} onOpenChange={setOnayAcik}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("paketDegisimOnayBaslik", { firma: firmaAdi, paket: hedef?.ad ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {kapanan.length > 0 ? t("paketDegisimKapanan", { liste: kapanan.map((o) => to(o)).join(", ") }) : t("paketDegisimKapananYok")}{" "}
              {acilan.length > 0 ? t("paketDegisimAcilan", { liste: acilan.map((o) => to(o)).join(", ") }) : ""}{" "}
              {t("paketDegisimVeriNotu")}
              {fazla.length > 0
                ? ` ${t("paketDegisimSinirFazla", { liste: fazla.map((a) => `${tps(`etiket_${a}`)} ${kullanim[a]}/${hedef!.sinirlar[a]}`).join(", ") })}`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">{ortak("vazgec")}</AlertDialogCancel>
            <Button
              variant={kapanan.length > 0 ? "destructive" : "default"}
              className="min-h-11"
              disabled={bekliyor}
              onClick={() => gecis(async () => { setMesaj(await firmaPaketiEylemi(firmaId, secilen)); setOnayAcik(false); })}
            >
              {t("paketiDegistir")}
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

      {simdiki?.firmayaOzel ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("firmaOzellikleriBaslik")}</h3>
          <p className="text-muted-foreground text-xs">{t("firmaOzellikleriNotu")}</p>
          <OzellikSecici key={acik.join(",")} hedef={{ tur: "firma", id: firmaId }} baslangic={acik} />
        </div>
      ) : simdiki ? (
        <p className="text-muted-foreground text-xs">{t("firmaPaketIcerikNotu", { liste: acik.map((o) => to(o)).join(", ") })}</p>
      ) : null}
    </div>
  );
}
