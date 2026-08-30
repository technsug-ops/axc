"use client";

import Link from "next/link";
import { gecTeslimMi } from "@/lib/uyari/gec-teslim";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { SAYIM_ISRAR_SEBEPLERI } from "@/lib/sayim-korumasi";
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
import { HataOzeti } from "@/components/hata-ozeti";
import { Button } from "@/components/ui/button";
import { formGonderimi } from "@/lib/form-gonderimi";
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
  companySku: string;
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
  siparisTarihi,
}: {
  alimId: string;
  alimKodu: string;
  satirlar: KabulSatiri[];
  konumlar: KonumSecenegi[];
  bugun: string;
  /**
   * ⚠ TESLİM TARİHİ BUGÜNE VARSAYILAN GELİYOR ve geçmiş veri girilirken
   * değiştirilmiyor — iki bozuk kayıt bu yüzden doğdu. Sipariş tarihi,
   * formun "teslim gerçekten bugün mü?" diye sorabilmesi için burada.
   */
  siparisTarihi: string;
}) {
  const t = useTranslations("MalKabul");

  /**
   * ⭐ SAYIM KAPISI ISRARI — MAL KABUL BAŞINA (kalem başına DEĞİL).
   * Kapıyı tetikleyen şey TESLİM TARİHİ ve mal kabulün tek tarihi var.
   */
  const [israrOnay, setIsrarOnay] = useState(false);
  const [israrSebep, setIsrarSebep] = useState("");
  const [israrAciklama, setIsrarAciklama] = useState("");
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
      (s) => s.barcode === temiz || s.companySku === temiz || s.sku === temiz,
    );

    if (!satir) {
      setBarkodMesaji(t("kodBulunamadi", { kod: temiz }));
    } else {
      const girdi = girdiler[satir.purchaseItemId];
      const girilenToplam = girdi.saglam + girdi.hasarli;

      if (girilenToplam >= satir.kalan) {
        setBarkodMesaji(
          t("tamamiGirildi", { urun: satir.urunAdi, kalan: satir.kalan }),
        );
      } else if (hasarliModu) {
        girdiGuncelle(satir.purchaseItemId, { hasarli: girdi.hasarli + 1 });
        setBarkodMesaji(t("hasarliArtti", { urun: satir.urunAdi }));
      } else {
        girdiGuncelle(satir.purchaseItemId, { saglam: girdi.saglam + 1 });
        setBarkodMesaji(t("saglamArtti", { urun: satir.urunAdi }));
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
    <form
      id="mal-kabul-formu"
      onSubmit={formGonderimi(formAction)}
      className="space-y-6"
    >
      <input type="hidden" name="alimId" value={alimId} />
      <input type="hidden" name="veri" value={JSON.stringify(gonderilecek)} />

      <Card>
        <CardHeader>
          <CardTitle>{t("teslimat")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kabul-tarih">{t("teslimTarihi")} *</Label>
              <Input
                id="kabul-tarih"
                type="date"
                value={teslimTarihi}
                onChange={(e) => setTeslimTarihi(e.target.value)}
              />
              {/* ---------- TESLİM GERÇEKTEN BUGÜN MÜ? ----------
                  ⚠ ÖNLEMEK DÜZELTMEKTEN UCUZ. İki bozuk kayıt (Schafer,
                  LEGO) bu alan bugüne varsayılan geldiği ve geçmiş veri
                  girilirken değiştirilmediği için doğdu; ikisinin de
                  düzeltmesi ledger'a elle müdahale gerektirdi.

                  ENGEL DEĞİL: mal gerçekten geç gelmiş olabilir
                  (ölçümde 21–48 gün arası dört gerçek kayıt var). */}
              {(() => {
                const h = gecTeslimMi(
                  siparisTarihi ? new Date(siparisTarihi) : null,
                  teslimTarihi ? new Date(teslimTarihi) : null,
                );
                if (h === null) return null;
                return (
                  <p className={`text-xs ${DURUM_YAZISI.uyari}`}>
                    {h.tur === "TERS"
                      ? t("teslimTersUyari")
                      : t("teslimGecUyari", { gun: h.gun })}
                  </p>
                );
              })()}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kabul-barkod">{t("barkodlaSay")}</Label>
            <div className="flex flex-wrap items-start gap-2">
              <BarkodGirisi
                id="kabul-barkod"
                className="min-w-56 flex-1"
                value={barkod}
                onChange={setBarkod}
                onOkundu={barkoddanArtir}
                inputRef={barkodRef}
                placeholder={t("barkodIpucu")}
                kameraBasligi={t("barkodKamera")}
              />
              <Button
                type="button"
                variant={hasarliModu ? "destructive" : "outline"}
                onClick={() => setHasarliModu((o) => !o)}
              >
                <TriangleAlert />
                {hasarliModu ? t("hasarliModuAcik") : t("hasarliModu")}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              {t.rich("hasarliModuNotu", {
                kalin: (parca) => <strong>{parca}</strong>,
              })}
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
          <CardTitle>
            {tOrtak("kalemlerBasligi", { sayi: satirlar.length })}
          </CardTitle>
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
                      {satir.sku} · {satir.companySku}
                      {satir.barcode ? ` · ${satir.barcode}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">
                      {t("rozetBeklenen", { sayi: satir.beklenen })}
                    </Badge>
                    <Badge variant="secondary">
                      {t("rozetGelen", { sayi: satir.oncekiSaglam })}
                    </Badge>
                    {satir.oncekiHasarli > 0 ? (
                      <Badge variant="destructive">
                        {t("rozetHasarli", { sayi: satir.oncekiHasarli })}
                      </Badge>
                    ) : null}
                    <Badge
                      variant={satir.kalan === 0 ? "secondary" : "default"}
                    >
                      {t("rozetKalan", { sayi: satir.kalan })}
                    </Badge>
                  </div>
                </div>

                {satir.kalan === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("kalemTamamlandi")}
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor={`saglam-${satir.purchaseItemId}`}>
                          {t("gelenSaglam")}
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
                          {t("gelenHasarli")}
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
                          {t("yerlestirilenRaf")}
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
                            <SelectValue placeholder={tOrtak("rafSecin")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={KONUM_YOK}>
                              {tOrtak("rafAtanmadi")}
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
                          {t("hasarNotu")}
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
                          placeholder={t("hasarNotuIpucu")}
                        />
                      </div>
                    ) : null}

                    {asimVar ? (
                      <p className="text-destructive text-sm" role="alert">
                        {t("asimUyarisi", { girilen, kalan: satir.kalan })}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}

          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium">{t("buTeslimatta")}</div>
            <div className="mt-2 flex flex-wrap gap-3">
              <div className="rounded-md border px-3 py-2">
                <div className="text-muted-foreground text-xs">
                  {t("saglam")}
                </div>
                <div className="text-lg font-semibold">{ozet.saglam}</div>
              </div>
              <div className="rounded-md border px-3 py-2">
                <div className="text-muted-foreground text-xs">
                  {t("hasarli")}
                </div>
                <div className="text-lg font-semibold">{ozet.hasarli}</div>
              </div>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              {t("ozetNotu")}
            </p>
          </div>
        </CardContent>
      </Card>

      <HataOzeti hatalar={durum.hatalar} />

      {/*
        ═══ SAYIM KORUMASI — ISRAR BLOĞU ═════════════════════════════════
        ⭐ ANAYASA: "uyarı SORAR, kullanıcı ISRAR ederse istisna kaydedilir."

        ⚠ YÖN ARTIRAN VE MEŞRU — ölçüldü: sayımdan sonra yazılan 15 geriye
        dönük hareketin hepsi gerçek mal kabulüydü. Yasaklamak çalışan bir
        işi kilitlerdi. Ama sessiz de geçmez: mal sayım sırasında raftaysa
        SAYAN KİŞİ ONU ZATEN SAYDI ve aynı mal ikinci kez eklenir.
      */}
      {durum.sayimDuraksatti ? (
        <div
          className={`space-y-3 rounded-md border border-dashed p-3 text-xs ${DURUM_KUTUSU.uyari}`}
        >
          <p className="font-medium">{t("sayimIsrariBaslik")}</p>
          <div className="space-y-1">
            <Label htmlFor="mk-israr-sebep">{t("sayimIsrariSebepEtiketi")}</Label>
            <select
              id="mk-israr-sebep"
              name="sayimIsrariSebep"
              form="mal-kabul-formu"
              value={israrSebep}
              onChange={(e) => setIsrarSebep(e.target.value)}
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-xs md:h-10"
            >
              <option value="">—</option>
              {SAYIM_ISRAR_SEBEPLERI.map((sb) => (
                <option key={sb} value={sb}>
                  {t(`sayimSebep_${sb}`)}
                </option>
              ))}
            </select>
          </div>
          {/* ⚠ `DIGER` kapalı listenin kaçak deliği — açıklama ZORUNLU. */}
          {israrSebep === "DIGER" ? (
            <div className="space-y-1">
              <Label htmlFor="mk-israr-aciklama">
                {t("sayimIsrariAciklamaEtiketi")}
              </Label>
              <Input
                id="mk-israr-aciklama"
                name="sayimIsrariAciklama"
                form="mal-kabul-formu"
                value={israrAciklama}
                onChange={(e) => setIsrarAciklama(e.target.value)}
                className="h-11 md:h-10"
              />
            </div>
          ) : (
            <input type="hidden" name="sayimIsrariAciklama" form="mal-kabul-formu" value="" />
          )}
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              name="sayimIsrariOnay"
              form="mal-kabul-formu"
              value="1"
              className="mt-0.5 size-4 shrink-0"
              checked={israrOnay}
              onChange={(e) => setIsrarOnay(e.target.checked)}
            />
            <span>{t("sayimIsrariOnayMetni")}</span>
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {/* Stok hareketi geri alınamaz — onay zorunlu (#6). */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              disabled={bekliyor || ozet.saglam + ozet.hasarli === 0}
            >
              <PackageCheck />
              {bekliyor ? tOrtak("kaydediliyor") : t("kaydet")}
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
          <Link href={`/alimlar/${alimId}`}>{tOrtak("vazgec")}</Link>
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        {t("altNot", { kod: alimKodu })}
      </p>
    </form>
  );
}
