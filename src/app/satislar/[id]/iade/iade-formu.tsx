"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Calculator, Undo2 } from "lucide-react";

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
import { useBicim } from "@/lib/bicim-istemci";

import {
  cezaOnerisiGetir,
  iadeOlustur,
  iadeOnizle,
  type OnizlemeSonucu,
} from "./actions";

import type { ReturnType } from "@/generated/prisma/enums";

export type IadeKalemSecenegi = {
  saleItemId: string;
  baslik: string;
  sku: string;
  satilanAdet: number;
  /** Daha önce iade edilenler düşülmüş kalan. */
  kalanAdet: number;
  varsayilanLocationId: string;
};

export type KonumSecenegi = { id: string; kod: string };
export type VaryantSecenegi = { id: string; etiket: string };

type Girdi = {
  iadeAdedi: string;
  saglamAdet: string;
  hasarliAdet: string;
  hasarNotu: string;
  locationId: string;
  exchangeVariantId: string;
};

const YOK = "__yok__";

/**
 * ============================================================================
 *  İADE FORMU
 * ----------------------------------------------------------------------------
 *  Mal kabul kalıbı: kalem başına adet + SAĞLAM/HASARLI ayrımı + raf seçimi.
 *  Fark: iade türü seçimi, kargo/ceza kalemleri ve ÖNİZLEME.
 *
 *  Kayıt ledger'a yazar (RETURN_IN / EXCHANGE_OUT) ve geri alınamaz —
 *  bu yüzden önce önizleme, sonra onay diyaloğu (#6).
 * ============================================================================
 */
export function IadeFormu({
  saleId,
  kalemler: secenekler,
  konumlar,
  varyantlar,
  yenidenGonderimGorunur,
  bugun,
}: {
  saleId: string;
  kalemler: IadeKalemSecenegi[];
  konumlar: KonumSecenegi[];
  varyantlar: VaryantSecenegi[];
  /** Kanal politikası: itirazlı iadede yeniden gönderimi satıcı öder mi? */
  yenidenGonderimGorunur: boolean;
  bugun: string;
}) {
  const t = useTranslations("Iade");
  const tTur = useTranslations("IadeTuru");
  const tKesinti = useTranslations("Kesinti");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();

  const [returnType, setReturnType] = useState<ReturnType>("NORMAL");
  const [code, setCode] = useState("");
  const [occurredAt, setOccurredAt] = useState(bugun);
  // Degisim urununun musteriye teslim tarihi — hakedis vadesi bundan baslar.
  const [degisimTeslimTarihi, setDegisimTeslimTarihi] = useState("");
  const [note, setNote] = useState("");

  const [iadeKargosu, setIadeKargosu] = useState("");
  const [yenidenGonderim, setYenidenGonderim] = useState("");
  const [ceza, setCeza] = useState("");
  const [cezaNotu, setCezaNotu] = useState("");
  const [cezaOneri, setCezaOneri] = useState<number | null | undefined>(
    undefined,
  );

  const [girdiler, setGirdiler] = useState<Record<string, Girdi>>(() =>
    Object.fromEntries(
      secenekler.map((s) => [
        s.saleItemId,
        {
          iadeAdedi: "",
          saglamAdet: "",
          hasarliAdet: "",
          hasarNotu: "",
          locationId: s.varsayilanLocationId,
          exchangeVariantId: "",
        },
      ]),
    ),
  );

  const [onizleme, setOnizleme] = useState<OnizlemeSonucu | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [bekliyor, gecis] = useTransition();

  function sayi(deger: string): number {
    const n = Number(deger.trim().replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  function sayiVeyaNull(deger: string): number | null {
    if (deger.trim() === "") return null;
    const n = Number(deger.trim().replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  function guncelle(id: string, degisim: Partial<Girdi>) {
    setGirdiler((o) => ({ ...o, [id]: { ...o[id], ...degisim } }));
  }

  /** Adet girilince sağlam varsayılan olarak tamamı kabul edilir. */
  function adetGuncelle(id: string, deger: string) {
    const adet = Math.trunc(sayi(deger));
    guncelle(id, {
      iadeAdedi: deger,
      saglamAdet: adet > 0 ? String(adet) : "",
      hasarliAdet: adet > 0 ? "0" : "",
    });
  }

  function girdiTopla() {
    return {
      saleId,
      code,
      returnType,
      occurredAt,
      degisimTeslimTarihi,
      note,
      iadeKargosu: sayiVeyaNull(iadeKargosu),
      yenidenGonderimKargosu: sayiVeyaNull(yenidenGonderim),
      ceza: sayiVeyaNull(ceza),
      cezaNotu,
      kalemler: secenekler.map((s) => {
        const g = girdiler[s.saleItemId];
        return {
          saleItemId: s.saleItemId,
          iadeAdedi: Math.trunc(sayi(g.iadeAdedi)),
          saglamAdet: Math.trunc(sayi(g.saglamAdet)),
          hasarliAdet: Math.trunc(sayi(g.hasarliAdet)),
          hasarNotu: g.hasarNotu,
          locationId: g.locationId,
          exchangeVariantId: g.exchangeVariantId,
        };
      }),
    };
  }

  /**
   * Hasarlı işaretlenmiş ama notu boş kalem var mı?
   * Sunucu da aynı kontrolü yapar (tek doğruluk kaynağı orası); buradaki
   * kopya sadece kullanıcıyı kaydet düğmesine kadar yürütmemek için.
   */
  /** Gerçekten değişim var mı — teslim tarihi alanı buna bağlı. */
  const degisimVar = secenekler.some((s) => {
    const g = girdiler[s.saleItemId];
    return Math.trunc(sayi(g.iadeAdedi)) > 0 && g.exchangeVariantId !== "";
  });

  const notsuzHasar = secenekler.some((s) => {
    const g = girdiler[s.saleItemId];
    return (
      Math.trunc(sayi(g.iadeAdedi)) > 0 &&
      Math.trunc(sayi(g.hasarliAdet)) > 0 &&
      g.hasarNotu.trim() === ""
    );
  });

  function onizle() {
    setMesaj(null);
    gecis(async () => {
      setOnizleme(await iadeOnizle(girdiTopla()));
    });
  }

  function kaydet() {
    gecis(async () => {
      const sonuc = await iadeOlustur(girdiTopla());
      if (sonuc?.hata) setMesaj(sonuc.hata);
    });
  }

  function cezaOneriGetir() {
    gecis(async () => {
      setCezaOneri(await cezaOnerisiGetir(saleId));
    });
  }

  const para = (n: number) =>
    bicim.para(n, (onizleme?.paraBirimi as "TRY" | "EUR") ?? "TRY");

  // İtirazlı iadede mal müşteride kalır — raf/sağlam alanları anlamsızlaşır.
  const stogaGirer = returnType !== "DISPUTED";

  return (
    <div className="space-y-6">
      {/* ------------------------ İADE BİLGİLERİ ------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>{t("iadeBilgileri")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="iade-tur">{t("iadeTuru")} *</Label>
              <Select
                value={returnType}
                onValueChange={(d) => setReturnType(d as ReturnType)}
              >
                <SelectTrigger id="iade-tur" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNDELIVERED">
                    {tTur("UNDELIVERED")}
                  </SelectItem>
                  <SelectItem value="NORMAL">{tTur("NORMAL")}</SelectItem>
                  <SelectItem value="DISPUTED">{tTur("DISPUTED")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="iade-tarih">{t("iadeTarihi")} *</Label>
              <Input
                id="iade-tarih"
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
              />
            </div>

            {/* DEĞİŞİMDE VADE YENİDEN BAŞLAR — alan yalnız gerçekten
                değişim varken görünür, yoksa boş bir soru işareti olurdu. */}
            {degisimVar ? (
              <div className="space-y-2">
                <Label htmlFor="degisim-teslim">{t("degisimTeslimi")}</Label>
                <Input
                  id="degisim-teslim"
                  type="date"
                  value={degisimTeslimTarihi}
                  onChange={(e) => setDegisimTeslimTarihi(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  {t("degisimTeslimiNotu")}
                </p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="iade-no">{t("iadeNo")}</Label>
              <Input
                id="iade-no"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("iadeNoIpucu")}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Seçilen türün ne demek olduğu açıkça yazar. */}
          <p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
            {returnType === "UNDELIVERED"
              ? t("turUndeliveredNotu")
              : returnType === "NORMAL"
                ? t("turNormalNotu")
                : t("turDisputedNotu")}
          </p>

          <div className="space-y-2">
            <Label htmlFor="iade-not">{ortak("aciklama")}</Label>
            <Textarea
              id="iade-not"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={ortak("istegeBagli")}
            />
          </div>
        </CardContent>
      </Card>

      {/* --------------------------- KALEMLER --------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("kalemler")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {secenekler.map((s) => {
            const g = girdiler[s.saleItemId];
            const adet = Math.trunc(sayi(g.iadeAdedi));
            const asim = adet > s.kalanAdet;

            return (
              <div key={s.saleItemId} className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{s.baslik}</div>
                    <div className="text-muted-foreground font-mono text-xs">
                      {s.sku}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">
                      {t("satilanAdet", { sayi: s.satilanAdet })}
                    </Badge>
                    <Badge variant={s.kalanAdet > 0 ? "secondary" : "outline"}>
                      {t("kalanAdet", { sayi: s.kalanAdet })}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`adet-${s.saleItemId}`}>
                      {t("iadeAdedi")}
                    </Label>
                    <Input
                      id={`adet-${s.saleItemId}`}
                      value={g.iadeAdedi}
                      inputMode="numeric"
                      placeholder="örn. 1"
                      onChange={(e) =>
                        adetGuncelle(s.saleItemId, e.target.value)
                      }
                    />
                  </div>

                  {stogaGirer ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor={`saglam-${s.saleItemId}`}>
                          {t("saglamAdet")}
                        </Label>
                        <Input
                          id={`saglam-${s.saleItemId}`}
                          value={g.saglamAdet}
                          inputMode="numeric"
                          placeholder="örn. 1"
                          onChange={(e) =>
                            guncelle(s.saleItemId, {
                              saglamAdet: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`hasarli-${s.saleItemId}`}>
                          {t("hasarliAdet")}
                        </Label>
                        <Input
                          id={`hasarli-${s.saleItemId}`}
                          value={g.hasarliAdet}
                          inputMode="numeric"
                          placeholder="örn. 0"
                          onChange={(e) =>
                            guncelle(s.saleItemId, {
                              hasarliAdet: e.target.value,
                            })
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground self-end text-xs sm:col-span-2">
                      {t("stokEtkisiYok")}
                    </p>
                  )}
                </div>

                {stogaGirer && adet > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`raf-${s.saleItemId}`}>
                        {t("yerlestirilenRaf")}
                      </Label>
                      <Select
                        value={g.locationId || YOK}
                        onValueChange={(d) =>
                          guncelle(s.saleItemId, {
                            locationId: d === YOK ? "" : d,
                          })
                        }
                      >
                        <SelectTrigger id={`raf-${s.saleItemId}`} className="w-full">
                          <SelectValue placeholder={ortak("rafSecin")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={YOK}>
                            {ortak("rafAtanmadi")}
                          </SelectItem>
                          {konumlar.map((k) => (
                            <SelectItem key={k.id} value={k.id}>
                              {k.kod}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`degisim-${s.saleItemId}`}>
                        {t("degisimUrunu")}
                      </Label>
                      <Select
                        value={g.exchangeVariantId || YOK}
                        onValueChange={(d) =>
                          guncelle(s.saleItemId, {
                            exchangeVariantId: d === YOK ? "" : d,
                          })
                        }
                      >
                        <SelectTrigger
                          id={`degisim-${s.saleItemId}`}
                          className="w-full"
                        >
                          <SelectValue placeholder={t("degisimYok")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={YOK}>{t("degisimYok")}</SelectItem>
                          {varyantlar.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.etiket}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : null}

                {/* HASAR NOTU ZORUNLU: hasarlı işaretlemek, o malın
                    maliyetini üstünüzde bırakan bir para kararıdır.
                    Gerekçesiz kalırsa aylar sonra kimse hatırlamaz. */}
                {stogaGirer && sayi(g.hasarliAdet) > 0 ? (
                  <div className="space-y-2">
                    <Label htmlFor={`hasarnot-${s.saleItemId}`}>
                      {t("hasarNotu")} *
                    </Label>
                    <Textarea
                      id={`hasarnot-${s.saleItemId}`}
                      rows={2}
                      value={g.hasarNotu}
                      onChange={(e) =>
                        guncelle(s.saleItemId, { hasarNotu: e.target.value })
                      }
                      placeholder={t("hasarNotuIpucu")}
                      aria-invalid={g.hasarNotu.trim() === ""}
                    />
                    {g.hasarNotu.trim() === "" ? (
                      <p className="text-destructive text-sm" role="alert">
                        {t("hasarNotuZorunluKisa")}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {asim ? (
                  <p className="text-destructive text-sm" role="alert">
                    {t("fazlaIade", {
                      urun: s.baslik,
                      kalan: s.kalanAdet,
                      girilen: adet,
                    })}
                  </p>
                ) : null}
              </div>
            );
          })}
          <p className="text-muted-foreground text-xs">{t("degisimNotu")}</p>
        </CardContent>
      </Card>

      {/* ---------------------------- KARGO ----------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("iadeKargosu")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="iade-kargo">{t("iadeKargosu")}</Label>
              <Input
                id="iade-kargo"
                value={iadeKargosu}
                inputMode="decimal"
                placeholder={t("kargoIpucu")}
                onChange={(e) => setIadeKargosu(e.target.value)}
              />
              {/* Kullanıcının Excel alışkanlığı git-gel toplamı yazmak. */}
              <p className="text-muted-foreground text-xs">
                {t("iadeKargosuNotu")}
              </p>
            </div>

            {returnType === "DISPUTED" ? (
              <div className="space-y-2">
                <Label htmlFor="yeniden-gonderim">
                  {t("yenidenGonderim")}
                </Label>
                <Input
                  id="yeniden-gonderim"
                  value={yenidenGonderim}
                  inputMode="decimal"
                  placeholder={t("kargoIpucu")}
                  disabled={!yenidenGonderimGorunur}
                  onChange={(e) => setYenidenGonderim(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  {yenidenGonderimGorunur
                    ? t("yenidenGonderimNotu")
                    : t("yenidenGonderimNotuYok")}
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------- CEZA ----------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("cezaBasligi")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-xs">{t("cezaAciklama")}</p>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40 space-y-2">
              <Label htmlFor="ceza-tutar">{t("cezaTutari")}</Label>
              <Input
                id="ceza-tutar"
                value={ceza}
                inputMode="decimal"
                placeholder={t("cezaIpucu")}
                onChange={(e) => setCeza(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={cezaOneriGetir}
              disabled={bekliyor}
            >
              <Calculator />
              {t("onizle")}
            </Button>
          </div>

          {cezaOneri !== undefined ? (
            cezaOneri === null ? (
              <p className="text-amber-700 text-xs dark:text-amber-500">
                {t("cezaOnerisiYok")}
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  {t("cezaOnerisi", { tutar: bicim.para(cezaOneri, "TRY") })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCeza(String(cezaOneri))}
                >
                  {ortak("ekle")}
                </Button>
              </div>
            )
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="ceza-not">{t("cezaNotu")}</Label>
            <Input
              id="ceza-not"
              value={cezaNotu}
              onChange={(e) => setCezaNotu(e.target.value)}
              placeholder={ortak("istegeBagli")}
              autoComplete="off"
            />
          </div>
        </CardContent>
      </Card>

      {/* --------------------------- ÖNİZLEME --------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>{t("onizlemeBasligi")}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onizle}
              disabled={bekliyor}
            >
              <Calculator />
              {t("onizle")}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {onizleme?.hata ? (
            <p className="text-destructive text-sm" role="alert">
              {onizleme.hata}
            </p>
          ) : null}

          {onizleme?.satirlar?.length ? (
            <>
              <dl className="space-y-1 text-sm">
                {onizleme.satirlar.map((s, i) => (
                  <div key={i} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {tKesinti.has(s.code) ? tKesinti(s.code) : s.code}
                      {/* AÇIK SIFIR: "maliyet geri gelmedi"yi satırın
                          YOKLUĞUNDAN anlamak imkânsızdı. Artık satır durur
                          ve nedenini yazar — kullanıcı kaydetmeden önce ne
                          kaybedeceğini görür. */}
                      {s.code === "MALIYET_GERI" && s.tutar === 0 ? (
                        <span className="text-muted-foreground block text-xs">
                          {t("maliyetGeriYok")}
                        </span>
                      ) : null}
                    </dt>
                    <dd
                      className={
                        s.tutar < 0
                          ? "text-destructive whitespace-nowrap"
                          : s.tutar === 0
                            ? "text-muted-foreground whitespace-nowrap"
                            : "whitespace-nowrap text-emerald-600"
                      }
                    >
                      {s.tutar > 0 ? "+" : ""}
                      {para(s.tutar)}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap gap-6 border-t pt-3">
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t("net1Etkisi")}
                  </div>
                  <div className="text-destructive text-xl font-semibold">
                    {para(onizleme.net1 ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {t("net2Etkisi")}
                  </div>
                  <div className="text-destructive text-xl font-semibold">
                    {para(onizleme.net2 ?? 0)}
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground text-xs">
                {t("kdvVarsayimNotu")}
              </p>
            </>
          ) : onizleme?.hata ? null : (
            <p className="text-muted-foreground text-xs">
              {t("onizlemeBekleniyor")}
            </p>
          )}
        </CardContent>
      </Card>

      {mesaj ? (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border p-4 text-sm"
        >
          {mesaj}
        </div>
      ) : null}

      {/* Devre dışı düğme sebebini SÖYLEMELİ (#5): sessiz kilit,
          kullanıcıya "sistem bozuk" dedirtir. */}
      {notsuzHasar ? (
        <p className="text-destructive text-sm" role="alert">
          {t("hasarNotuZorunluKisa")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {/* Ledger'a yazar, geri alınamaz — onay zorunlu (#6). */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              disabled={bekliyor || !onizleme?.satirlar?.length || notsuzHasar}
            >
              <Undo2 />
              {t("iadeKaydet")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("onayBasligi")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("onayAciklama")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
              <Button type="button" onClick={kaydet} disabled={bekliyor}>
                {bekliyor ? ortak("kaydediliyor") : t("onayla")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button type="button" variant="outline" asChild>
          <Link href={`/satislar/${saleId}`}>{ortak("vazgec")}</Link>
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">{t("formNotu")}</p>
    </div>
  );
}
