"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PackageCheck, TriangleAlert } from "lucide-react";

import { BarkodGirisi } from "@/components/barkod-okuyucu";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { malKabulEt, type MalKabulDurumu } from "./actions";

export type KonumSecenegi = { id: string; code: string; name: string | null };

export type KabulSatiri = {
  purchaseItemId: string;
  urunAdi: string;
  varyantAdi: string | null;
  sku: string;
  axcaliSku: string;
  barcode: string | null;
  beklenen: number;
  oncekiSaglam: number;
  oncekiHasarli: number;
  kalan: number;
  varsayilanLocationId: string;
};

const KONUM_YOK = "__konum_yok__";

type Girdi = {
  saglam: number;
  hasarli: number;
  locationId: string;
  hasarNotu: string;
};

export function MalKabulFormu({
  alimId,
  alimKodu,
  satirlar,
  konumlar,
  bugun,
}: {
  alimId: string;
  alimKodu: string;
  satirlar: KabulSatiri[];
  konumlar: KonumSecenegi[];
  bugun: string;
}) {
  const tOnay = useTranslations("MalKabulOnay");
  const tOrtak = useTranslations("Ortak");

  const [durum, formAction, bekliyor] = useActionState<
    MalKabulDurumu,
    FormData
  >(malKabulEt, {});

  const [teslimTarihi, setTeslimTarihi] = useState(bugun);
  const [girdiler, setGirdiler] = useState<Record<string, Girdi>>(() =>
    Object.fromEntries(
      satirlar.map((s) => [
        s.purchaseItemId,
        {
          saglam: 0,
          hasarli: 0,
          locationId: s.varsayilanLocationId,
          hasarNotu: "",
        },
      ]),
    ),
  );

  // --- Barkod modu ---
  const [hasarliModu, setHasarliModu] = useState(false);
  const [barkod, setBarkod] = useState("");
  const [barkodMesaji, setBarkodMesaji] = useState<string | null>(null);
  const barkodRef = useRef<HTMLInputElement>(null);

  function girdiGuncelle(kalemId: string, degisim: Partial<Girdi>) {
    setGirdiler((onceki) => ({
      ...onceki,
      [kalemId]: { ...onceki[kalemId], ...degisim },
    }));
  }

  /** Okutulan kod bu alımın kalemlerinden birine ait mi? */
  function barkoddanArtir(kod: string) {
    const temiz = kod.trim();
    const satir = satirlar.find(
      (s) =>
        s.barcode === temiz || s.axcaliSku === temiz || s.sku === temiz,
    );

    if (!satir) {
      setBarkodMesaji(`"${temiz}" bu alımın kalemleri arasında bulunamadı.`);
    } else {
      const girdi = girdiler[satir.purchaseItemId];
      const girilenToplam = girdi.saglam + girdi.hasarli;

      if (girilenToplam >= satir.kalan) {
        setBarkodMesaji(
          `${satir.urunAdi}: kalan ${satir.kalan} adedin tamamı girildi.`,
        );
      } else if (hasarliModu) {
        girdiGuncelle(satir.purchaseItemId, { hasarli: girdi.hasarli + 1 });
        setBarkodMesaji(`${satir.urunAdi} — HASARLI +1`);
      } else {
        girdiGuncelle(satir.purchaseItemId, { saglam: girdi.saglam + 1 });
        setBarkodMesaji(`${satir.urunAdi} — sağlam +1`);
      }
    }

    setBarkod("");
    barkodRef.current?.focus();
  }

  const ozet = useMemo(() => {
    let saglam = 0;
    let hasarli = 0;
    for (const g of Object.values(girdiler)) {
      saglam += g.saglam;
      hasarli += g.hasarli;
    }
    return { saglam, hasarli };
  }, [girdiler]);

  const gonderilecek = {
    teslimTarihi,
    satirlar: satirlar.map((s) => {
      const g = girdiler[s.purchaseItemId];
      return {
        purchaseItemId: s.purchaseItemId,
        saglam: g.saglam,
        hasarli: g.hasarli,
        locationId: g.locationId,
        hasarNotu: g.hasarNotu,
      };
    }),
  };

  return (
    <form id="mal-kabul-formu" action={formAction} className="space-y-6">
      <input type="hidden" name="alimId" value={alimId} />
      <input type="hidden" name="veri" value={JSON.stringify(gonderilecek)} />

      {durum.hatalar?.length ? (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-4 text-sm"
        >
          <p className="mb-2 font-medium">Kaydedilemedi:</p>
          <ul className="list-inside list-disc space-y-1">
            {durum.hatalar.map((hata, i) => (
              <li key={i}>{hata}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Teslimat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kabul-tarih">Teslim tarihi *</Label>
              <Input
                id="kabul-tarih"
                type="date"
                value={teslimTarihi}
                onChange={(e) => setTeslimTarihi(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kabul-barkod">Barkodla say</Label>
            <div className="flex flex-wrap items-start gap-2">
              <BarkodGirisi
                id="kabul-barkod"
                className="min-w-56 flex-1"
                value={barkod}
                onChange={setBarkod}
                onOkundu={barkoddanArtir}
                inputRef={barkodRef}
                placeholder="Okutun; her okutma 1 adet ekler"
                kameraBasligi="Gelen ürünü okut"
              />
              <Button
                type="button"
                variant={hasarliModu ? "destructive" : "outline"}
                onClick={() => setHasarliModu((o) => !o)}
              >
                <TriangleAlert />
                {hasarliModu ? "HASARLI MODU AÇIK" : "Hasarlı modu"}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Hasarlı modu kapalıyken okutma <strong>sağlam</strong> sayacını,
              açıkken <strong>hasarlı</strong> sayacını artırır. Kalan adedi
              aşarsa uyarır.
            </p>
            {barkodMesaji ? (
              <p className="text-sm" role="status">
                {barkodMesaji}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kalemler ({satirlar.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {satirlar.map((satir) => {
            const girdi = girdiler[satir.purchaseItemId];
            const girilen = girdi.saglam + girdi.hasarli;
            const asimVar = girilen > satir.kalan;

            return (
              <div
                key={satir.purchaseItemId}
                className="space-y-3 rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {satir.urunAdi}
                      {satir.varyantAdi ? ` — ${satir.varyantAdi}` : ""}
                    </div>
                    <div className="text-muted-foreground font-mono text-xs">
                      {satir.sku} · {satir.axcaliSku}
                      {satir.barcode ? ` · ${satir.barcode}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">beklenen {satir.beklenen}</Badge>
                    <Badge variant="secondary">
                      gelen {satir.oncekiSaglam}
                    </Badge>
                    {satir.oncekiHasarli > 0 ? (
                      <Badge variant="destructive">
                        hasarlı {satir.oncekiHasarli}
                      </Badge>
                    ) : null}
                    <Badge variant={satir.kalan === 0 ? "secondary" : "default"}>
                      kalan {satir.kalan}
                    </Badge>
                  </div>
                </div>

                {satir.kalan === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Bu kalem tamamlandı.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor={`saglam-${satir.purchaseItemId}`}>
                          Gelen sağlam
                        </Label>
                        <Input
                          id={`saglam-${satir.purchaseItemId}`}
                          value={String(girdi.saglam)}
                          inputMode="numeric"
                          onChange={(e) =>
                            girdiGuncelle(satir.purchaseItemId, {
                              saglam: Math.max(
                                0,
                                Math.trunc(Number(e.target.value) || 0),
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`hasarli-${satir.purchaseItemId}`}>
                          Gelen hasarlı
                        </Label>
                        <Input
                          id={`hasarli-${satir.purchaseItemId}`}
                          value={String(girdi.hasarli)}
                          inputMode="numeric"
                          onChange={(e) =>
                            girdiGuncelle(satir.purchaseItemId, {
                              hasarli: Math.max(
                                0,
                                Math.trunc(Number(e.target.value) || 0),
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`raf-${satir.purchaseItemId}`}>
                          Yerleştirilen raf
                        </Label>
                        <Select
                          value={girdi.locationId || KONUM_YOK}
                          onValueChange={(d) =>
                            girdiGuncelle(satir.purchaseItemId, {
                              locationId: d === KONUM_YOK ? "" : d,
                            })
                          }
                        >
                          <SelectTrigger
                            id={`raf-${satir.purchaseItemId}`}
                            className="w-full"
                          >
                            <SelectValue placeholder="Raf seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={KONUM_YOK}>
                              Raf atanmadı
                            </SelectItem>
                            {konumlar.map((k) => (
                              <SelectItem key={k.id} value={k.id}>
                                {k.code}
                                {k.name ? ` — ${k.name}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {girdi.hasarli > 0 ? (
                      <div className="space-y-2">
                        <Label htmlFor={`hasarnot-${satir.purchaseItemId}`}>
                          Hasar notu
                        </Label>
                        <Textarea
                          id={`hasarnot-${satir.purchaseItemId}`}
                          rows={2}
                          value={girdi.hasarNotu}
                          onChange={(e) =>
                            girdiGuncelle(satir.purchaseItemId, {
                              hasarNotu: e.target.value,
                            })
                          }
                          placeholder="Kutu ezik, ekran çizik..."
                        />
                      </div>
                    ) : null}

                    {asimVar ? (
                      <p className="text-destructive text-sm" role="alert">
                        Girilen {girilen} adet, kalan {satir.kalan} adedi
                        aşıyor.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}

          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium">Bu teslimatta</div>
            <div className="mt-2 flex flex-wrap gap-3">
              <div className="rounded-md border px-3 py-2">
                <div className="text-muted-foreground text-xs">Sağlam</div>
                <div className="text-lg font-semibold">{ozet.saglam}</div>
              </div>
              <div className="rounded-md border px-3 py-2">
                <div className="text-muted-foreground text-xs">Hasarlı</div>
                <div className="text-lg font-semibold">{ozet.hasarli}</div>
              </div>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              Sağlam adet stoğa alım girişi olarak eklenir. Hasarlı adet stoğa
              GİRMEZ, sadece kalemde kayda geçer.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {/* Stok hareketi geri alınamaz — onay zorunlu (#6). */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              disabled={bekliyor || ozet.saglam + ozet.hasarli === 0}
            >
              <PackageCheck />
              {bekliyor ? "Kaydediliyor..." : "Mal Kabulü Kaydet"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{tOnay("baslik")}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    {tOnay.rich("saglamSatiri", {
                      saglam: ozet.saglam,
                      kalin: (p) => <strong>{p}</strong>,
                    })}
                    {ozet.hasarli > 0
                      ? tOnay.rich("hasarliEki", {
                          hasarli: ozet.hasarli,
                          kalin: (p) => <strong>{p}</strong>,
                        })
                      : null}
                    .
                  </p>
                  <p>
                    {tOnay.rich("geriAlinamaz", {
                      kalin: (p) => <strong>{p}</strong>,
                    })}
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tOrtak("vazgec")}</AlertDialogCancel>
              {/* Diyalog portal içinde açıldığı için düğmeyi forma
                  form="..." ile bağlıyoruz; yoksa gönderim çalışmaz. */}
              <Button type="submit" form="mal-kabul-formu" disabled={bekliyor}>
                {tOnay("onayla")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button type="button" variant="outline" asChild>
          <Link href={`/alimlar/${alimId}`}>Vazgeç</Link>
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        {alimKodu} · Kısmi kabul yapabilirsiniz; kalan adetler için daha sonra
        tekrar mal kabul edersiniz.
      </p>
    </form>
  );
}
