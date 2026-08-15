"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Download, RotateCcw, Search, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBicim } from "@/lib/bicim-istemci";
import { ONAY_METNI, type FarkRaporu } from "@/lib/geri-yukle";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  GERİ YÜKLEME AKIŞI — ÜÇ ADIM
 * ----------------------------------------------------------------------------
 *  1. KAYNAK SEÇ   depodaki gece yedeği ya da diskteki dosya
 *  2. DENETLE      hiçbir şey yazmaz; ne olacağını tablo hâlinde gösterir
 *  3. ONAYLA       metin yazdırma + otomatik güvenlik yedeği
 *
 *  DOSYA İKİ KEZ GÖNDERİLİR (denetlerken ve uygularken) ve bu BİLEREK
 *  böyledir: sunucuda geçici dosya tutmuyoruz. Sunucuda bekleyen bir dosya,
 *  "hangi dosyayı onayladım" sorusunu belirsizleştirir ve temizlenmesi
 *  unutulacak bir iz bırakır.
 *
 *  Onay kutusu ANALİZDEN SONRA belirir. Önce göstermek, okumadan yazmayı
 *  kolaylaştırırdı.
 * ============================================================================
 */

type Onizleme = {
  surum: number;
  olusturulmaAni: string;
  kargoTarifesiHaric: boolean;
};

type AnalizYaniti = {
  durum: string;
  kaynakAdi?: string;
  boyutBayt?: number;
  onizleme?: Onizleme;
  fark?: FarkRaporu;
  kod?: string;
  hata?: { kod: string; tablo?: string; sutunlar?: string[] };
};

type UygulaYaniti = {
  durum: string;
  toplam?: number;
  guvenlikAdi?: string;
  tarifeSeedGerekli?: boolean;
  veriDegismedi?: boolean;
  kod?: string;
  hata?: { kod: string; tablo?: string; beklenen?: number; gelen?: number; ayrinti?: string };
};

export function GeriYuklemeAkisi({
  depodakiler,
}: {
  depodakiler: { ad: string; boyutKb: number }[];
}) {
  const t = useTranslations("GeriYukleme");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();

  const [secilenAd, setSecilenAd] = useState<string>("");
  const [dosya, setDosya] = useState<File | null>(null);
  const [analiz, setAnaliz] = useState<AnalizYaniti | null>(null);
  const [onay, setOnay] = useState("");
  const [sonuc, setSonuc] = useState<UygulaYaniti | null>(null);
  const [calisiyor, setCalisiyor] = useState<"analiz" | "uygula" | null>(null);

  /**
   * Hata kodundan sözlük metnine SABİT eşleme.
   * Anahtar değişkenle birleştirilseydi i18n denetimi bu çağrıları göremez,
   * eksik anahtar sessizce canlıya giderdi — ve bu ekranda "anlamadığım bir
   * hata" görmek, felaket anında en kötü deneyimdir.
   */
  const hataMetni = (kod: string): string =>
    kod === "JSON_DEGIL"
      ? t("hataJsonDegil")
      : kod === "YEDEK_DEGIL"
        ? t("hataYedekDegil")
        : kod === "SURUM_YENI"
          ? t("hataSurumYeni")
          : kod === "TABLO_YOK"
            ? t("hataTabloYok")
            : kod === "TABLO_BOZUK"
              ? t("hataTabloBozuk")
              : kod === "GOVDE_OKUNAMADI"
                ? t("hataGovdeOkunamadi")
                : kod === "DOSYA_YOK"
                  ? t("hataDosyaYok")
                  : kod === "GECERSIZ_AD"
                    ? t("hataGecersizAd")
                    : kod === "DEPODA_BULUNAMADI"
                      ? t("hataDepodaYok")
                      : kod === "DEPO_OKUNAMADI"
                        ? t("hataDepoOkunamadi")
                        : kod === "DEPO_YOK"
                          ? t("hataDepoYok")
                          : kod === "SUTUN_TANINMADI"
                            ? t("hataSutunTaninmadi")
                            : kod === "TABLO_TANINMADI"
                              ? t("hataTabloTaninmadi")
                              : kod === "SAYIM_TUTMADI"
                                ? t("hataSayimTutmadi")
                                : kod === "ONAY_YANLIS"
                                  ? t("hataOnayYanlis")
                                  : t("hataBilinmeyen");

  function govdeKur(onayMetni?: string) {
    const govde = new FormData();
    if (secilenAd !== "") govde.set("ad", secilenAd);
    else if (dosya) govde.set("dosya", dosya);
    if (onayMetni !== undefined) govde.set("onay", onayMetni);
    return govde;
  }

  const kaynakVar = secilenAd !== "" || dosya !== null;

  async function denetle() {
    setCalisiyor("analiz");
    setAnaliz(null);
    setSonuc(null);
    setOnay("");
    try {
      const yanit = await fetch("/api/geri-yukle/analiz", {
        method: "POST",
        body: govdeKur(),
      });
      setAnaliz((await yanit.json()) as AnalizYaniti);
    } catch {
      setAnaliz({ durum: "KAYNAK_HATASI", kod: "GOVDE_OKUNAMADI" });
    } finally {
      setCalisiyor(null);
    }
  }

  async function uygula() {
    setCalisiyor("uygula");
    try {
      const yanit = await fetch("/api/geri-yukle/uygula", {
        method: "POST",
        body: govdeKur(onay),
      });
      setSonuc((await yanit.json()) as UygulaYaniti);
    } catch (e) {
      setSonuc({ durum: "GERI_YUKLEME_HATASI", hata: { kod: "ISLEM_HATASI", ayrinti: String(e) } });
    } finally {
      setCalisiyor(null);
    }
  }

  const fark = analiz?.durum === "TAMAM" ? analiz.fark : undefined;
  const basarili = sonuc?.durum === "TAMAM";

  // İşlem bittiyse akışı kilitle: aynı ekranda ikinci kez basmak,
  // "acaba oldu mu" diye tekrar denemenin en olası yoludur.
  if (sonuc) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {basarili ? (
              <CheckCircle2 className={`size-5 shrink-0 ${DURUM_YAZISI.olumlu}`} />
            ) : (
              <TriangleAlert className={`size-5 shrink-0 ${DURUM_YAZISI.uyari}`} />
            )}
            {basarili ? t("sonucBasarili") : t("sonucBasarisiz")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {basarili ? (
            <>
              <p>{t("sonucSatir", { sayi: sonuc.toplam ?? 0 })}</p>
              {sonuc.tarifeSeedGerekli ? (
                <p className="text-muted-foreground">{t("sonucTarifeSeed")}</p>
              ) : null}
              <p className="text-muted-foreground">{t("sonucGirisNotu")}</p>
            </>
          ) : (
            <>
              {/* Felaket anında duyulması gereken ilk cümle. */}
              <p className="font-medium">
                {sonuc.veriDegismedi ? t("sonucVeriDegismedi") : t("sonucBelirsiz")}
              </p>
              <p>{hataMetni(sonuc.hata?.kod ?? sonuc.kod ?? sonuc.durum)}</p>
              {sonuc.hata?.tablo ? (
                <p className="text-muted-foreground">
                  {t("sonucTablo", { tablo: sonuc.hata.tablo })}
                </p>
              ) : null}
              {sonuc.hata?.ayrinti ? (
                <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">
                  {sonuc.hata.ayrinti}
                </pre>
              ) : null}
            </>
          )}

          {sonuc.guvenlikAdi ? (
            <div className="rounded-md border p-3">
              <p className="font-medium">{t("guvenlikYedegiBaslik")}</p>
              <p className="text-muted-foreground mt-1">
                {t("guvenlikYedegiMetin")}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2 h-11 md:h-9">
                <a
                  href={`/api/yedek/indir?ad=${encodeURIComponent(sonuc.guvenlikAdi)}`}
                >
                  <Download />
                  {sonuc.guvenlikAdi}
                </a>
              </Button>
            </div>
          ) : null}

          <Button
            variant="outline"
            className="h-11 md:h-9"
            onClick={() => {
              setSonuc(null);
              setAnaliz(null);
              setOnay("");
            }}
          >
            <RotateCcw />
            {t("bastanBasla")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===================== 1. KAYNAK ===================== */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adim1")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("depodanSec")}</Label>
            {depodakiler.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("depoBos")}</p>
            ) : (
              <ul className="divide-y rounded-md border text-sm">
                {depodakiler.map((y) => (
                  <li key={y.ad}>
                    <button
                      type="button"
                      onClick={() => {
                        setSecilenAd(y.ad);
                        setDosya(null);
                        setAnaliz(null);
                      }}
                      className={`hover:bg-muted flex min-h-11 w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                        secilenAd === y.ad ? "bg-muted font-medium" : ""
                      }`}
                    >
                      <span className="font-mono text-xs">{y.ad}</span>
                      <span className="text-muted-foreground text-xs">
                        {t("boyutKb", { kb: y.boyutKb })}
                        {secilenAd === y.ad ? ` · ${t("secili")}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="yedek-dosya">{t("dosyadanYukle")}</Label>
            <Input
              id="yedek-dosya"
              type="file"
              accept="application/json,.json"
              className="h-11 md:h-9"
              onChange={(e) => {
                setDosya(e.target.files?.[0] ?? null);
                setSecilenAd("");
                setAnaliz(null);
              }}
            />
            <p className="text-muted-foreground text-xs">{t("dosyaNotu")}</p>
          </div>

          <Button
            onClick={denetle}
            disabled={!kaynakVar || calisiyor !== null}
            className="h-11 md:h-9"
          >
            <Search />
            {calisiyor === "analiz" ? t("denetleniyor") : t("denetle")}
          </Button>
        </CardContent>
      </Card>

      {/* ===================== 2. ÖNİZLEME ===================== */}
      {analiz && analiz.durum !== "TAMAM" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className={`size-5 shrink-0 ${DURUM_YAZISI.uyari}`} />
              {t("dosyaOkunamadi")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{hataMetni(analiz.hata?.kod ?? analiz.kod ?? analiz.durum)}</p>
            {analiz.hata?.tablo ? (
              <p className="text-muted-foreground">
                {t("sonucTablo", { tablo: analiz.hata.tablo })}
              </p>
            ) : null}
            <p className="text-muted-foreground">{t("hicbirSeyDegismedi")}</p>
          </CardContent>
        </Card>
      ) : null}

      {fark && analiz?.onizleme ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("adim2")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground text-xs">{t("yedekTarihi")}</dt>
                <dd className="font-medium">
                  {analiz.onizleme.olusturulmaAni
                    ? bicim.tarih(new Date(analiz.onizleme.olusturulmaAni))
                    : "—"}
                </dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground text-xs">{t("yedekTuru")}</dt>
                <dd className="font-medium">
                  {analiz.onizleme.kargoTarifesiHaric ? t("hafif") : t("tam")}
                </dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground text-xs">{t("dosyaBoyutu")}</dt>
                <dd className="font-medium">
                  {t("boyutKb", {
                    kb: Math.max(1, Math.round((analiz.boyutBayt ?? 0) / 1024)),
                  })}
                </dd>
              </div>
            </dl>

            {/* GİRİŞ KAYBI EN ÜSTTE VE EN SERT: diğer kayıplar veri
                kaybıdır, bu KİLİTLENMEDİR. Sarı kutunun içinde bir satır
                olarak kalsaydı, uzun listede gözden kaçardı. */}
            {fark.girisKaybi ? (
              <div
                role="alert"
                className={`space-y-1 rounded-md border-2 p-4 text-sm ${DURUM_KUTUSU.olumsuz}`}
              >
                <p className="flex items-center gap-2 text-base font-semibold">
                  <TriangleAlert className="size-5 shrink-0" />
                  {t("girisKaybiBaslik")}
                </p>
                <p>{t("girisKaybiMetin")}</p>
                <p>{t("girisKaybiCare")}</p>
              </div>
            ) : null}

            {/* En önemli cümle: ne kadar silinip ne kadar geleceği. */}
            <div className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
              <p className="font-medium">
                {t("ozet", {
                  silinecek: fark.toplamMevcut,
                  gelecek: fark.toplamGelecek,
                })}
              </p>
              {fark.kayipVar ? <p className="mt-1">{t("kayipUyarisi")}</p> : null}
              {fark.eksikTablolar.length > 0 ? (
                <p className="mt-1">
                  {t("eksikTabloUyarisi", {
                    sayi: fark.eksikTablolar.length,
                    tablolar: fark.eksikTablolar.join(", "),
                  })}
                </p>
              ) : null}
              {fark.tarifeSeedGerekli ? (
                <p className="mt-1">{t("tarifeUyarisi")}</p>
              ) : null}
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("tablo")}</TableHead>
                    <TableHead className="text-right">{t("silinecek")}</TableHead>
                    <TableHead className="text-right">{t("gelecek")}</TableHead>
                    <TableHead>{ortak("durum")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fark.satirlar.map((s) => (
                    <TableRow key={s.tablo}>
                      <TableCell className="font-mono text-xs">{s.tablo}</TableCell>
                      <TableCell className="text-right">{s.mevcut}</TableCell>
                      <TableCell className="text-right">{s.gelecek}</TableCell>
                      <TableCell className="text-xs">
                        {s.dosyadaYok ? (
                          <span className={`${DURUM_YAZISI.uyari}`}>
                            {t("dosyadaYok")}
                          </span>
                        ) : s.gelecek < s.mevcut ? (
                          <span className={`${DURUM_YAZISI.uyari}`}>
                            {t("azalacak", { fark: s.mevcut - s.gelecek })}
                          </span>
                        ) : (
                          ""
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* ===================== 3. ONAY ===================== */}
      {fark ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("adim3")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{t("guvenlikOtomatik")}</p>

            <div className="space-y-2">
              <Label htmlFor="onay-metni">
                {t("onayEtiketi", { metin: ONAY_METNI })}
              </Label>
              <Input
                id="onay-metni"
                value={onay}
                onChange={(e) => setOnay(e.target.value)}
                placeholder={t("onayYerTutucu", { metin: ONAY_METNI })}
                className="h-11 max-w-xs md:h-9"
                autoComplete="off"
              />
            </div>

            <Button
              variant="destructive"
              className="h-11 md:h-10"
              disabled={onay.trim() === "" || calisiyor !== null}
              onClick={uygula}
            >
              {calisiyor === "uygula" ? t("yukleniyor") : t("geriYukleDugmesi")}
            </Button>
            {calisiyor === "uygula" ? (
              <p className="text-muted-foreground text-sm">{t("sabirNotu")}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
