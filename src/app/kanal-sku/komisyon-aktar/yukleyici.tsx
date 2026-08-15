"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, TriangleAlert, Upload } from "lucide-react";

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
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

export type HesapSecenegi = { id: string; etiket: string };

type Hata =
  | { kod: "HESAP_YOK" }
  | { kod: "HESAP_SATIS_DEGIL"; hesap: string }
  | { kod: "DOSYA_OKUNAMADI"; ayrinti: string }
  | { kod: "TANINMAYAN_DOSYA"; sayfalar: string[] }
  | { kod: "PLATFORM_UYUSMAZ"; dosya: string; hesap: string }
  | { kod: "SUTUN_EKSIK"; sutunlar: string[] }
  | { kod: "SATIR_YOK" };

type Onizleme = {
  platform: "TRENDYOL" | "HEPSIBURADA";
  sayfa: string;
  sayim: {
    okunan: number;
    oranOkunamadi: number;
    bosDolan: number;
    degisen: number;
    ayniKalan: number;
    yeniEsleme: number;
    katalogdaYok: number;
    tekrarEden: number;
    kalanBosOran: number;
  };
  yazilacak: number;
  kodCakisti: number;
  degisenOrnekleri: {
    kanalKodu: string;
    urunAdi: string | null;
    eskiOran: number;
    yeniOran: number;
  }[];
  oranOrnekleri: { satirNo: number; hamOran: string }[];
  bulunamayanOrnekleri: {
    satirNo: number;
    kod: string;
    urunAdi: string | null;
  }[];
  yeniEslemeOrnekleri: { kanalKodu: string; varyantSku: string; oran: number }[];
  kalanBosOranOrnekleri: { kanalKodu: string; varyantSku: string }[];
};

type Yanit =
  | { durum: "HATA"; hatalar: Hata[] }
  | { durum: "ONIZLEME"; onizleme: Onizleme }
  | {
      durum: "YAZILDI";
      guncellenen: number;
      yaratilan: number;
      kalanBosOran: number;
    }
  | { durum: "COKTU"; mesaj: string };

/**
 * DENETLE → ÖNİZLE → ONAYLA akışı. Hakediş ve içe aktarma ekranlarıyla aynı
 * kalıp (İlke #10): aynı işlem her ekranda aynı görünür ve aynı çalışır.
 */
export function Yukleyici({ hesaplar }: { hesaplar: HesapSecenegi[] }) {
  const t = useTranslations("Komisyon");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();
  const router = useRouter();

  const [dosya, setDosya] = useState<File | null>(null);
  const [hesap, setHesap] = useState("");
  const [calisiyor, setCalisiyor] = useState<"denetle" | "yaz" | null>(null);
  const [yanit, setYanit] = useState<Yanit | null>(null);

  /** Yüzde gösterimi dil altyapısından geçer (anayasa: elle biçim yasak). */
  const oran = (deger: number) => bicim.yuzde(deger, 2);

  const platformAdlari: Record<Onizleme["platform"], string> = {
    TRENDYOL: t("platformTrendyol"),
    HEPSIBURADA: t("platformHepsiburada"),
  };

  async function gonder(yazilsinMi: boolean) {
    if (!dosya || !hesap) return;
    setCalisiyor(yazilsinMi ? "yaz" : "denetle");
    try {
      const govde = new FormData();
      govde.set("dosya", dosya);
      govde.set("hesap", hesap);
      if (yazilsinMi) govde.set("yaz", "1");

      const cevap = await fetch("/api/komisyon", { method: "POST", body: govde });
      const veri: Yanit = await cevap.json();
      setYanit(veri);
      if (veri.durum === "YAZILDI") router.refresh();
    } catch {
      setYanit({ durum: "COKTU", mesaj: "BEKLENMEYEN" });
    } finally {
      setCalisiyor(null);
    }
  }

  function hataMetni(h: Hata): string {
    switch (h.kod) {
      case "HESAP_YOK":
        return t("hataHesapYok");
      case "HESAP_SATIS_DEGIL":
        return t("hataHesapSatisDegil", { hesap: h.hesap });
      case "DOSYA_OKUNAMADI":
        return t("hataDosyaOkunamadi", { ayrinti: h.ayrinti });
      case "TANINMAYAN_DOSYA":
        return t("hataTaninmayanDosya", { sayfalar: h.sayfalar.join(", ") });
      case "PLATFORM_UYUSMAZ":
        return t("hataPlatformUyusmaz", {
          dosya: platformAdlari[h.dosya as Onizleme["platform"]] ?? h.dosya,
          hesap: h.hesap,
        });
      case "SUTUN_EKSIK":
        return t("hataSutunEksik", { sutunlar: h.sutunlar.join(", ") });
      case "SATIR_YOK":
        return t("hataSatirYok");
    }
  }

  const onizleme = yanit?.durum === "ONIZLEME" ? yanit.onizleme : null;

  const ozetler = onizleme
    ? ([
        [t("ozetOkunan"), String(onizleme.sayim.okunan)],
        [t("ozetBosDolan"), String(onizleme.sayim.bosDolan)],
        [t("ozetDegisen"), String(onizleme.sayim.degisen)],
        [t("ozetYeniEsleme"), String(onizleme.sayim.yeniEsleme)],
        [t("ozetAyniKalan"), String(onizleme.sayim.ayniKalan)],
        [t("ozetKatalogdaYok"), String(onizleme.sayim.katalogdaYok)],
        [t("ozetOranOkunamadi"), String(onizleme.sayim.oranOkunamadi)],
        [t("ozetYazilacak"), String(onizleme.yazilacak)],
        // AÇIK SIFIR: bu kutu sıfır olsa bile gösterilir. "Oranı boş kalan
        // yok" cümlesini görmek, hiç görmemekten iyidir (mimar kararı).
        [t("ozetKalanBosOran"), String(onizleme.sayim.kalanBosOran)],
      ] as const)
    : [];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("yukleBaslik")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">{t("yukleAciklama")}</p>
          <p className="text-muted-foreground text-sm">{t("nasilIndirilir")}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="komisyon-hesap">{t("hesapSec")} *</Label>
              <Select value={hesap} onValueChange={setHesap}>
                <SelectTrigger id="komisyon-hesap" className="w-full">
                  <SelectValue placeholder={t("hesapSecin")} />
                </SelectTrigger>
                <SelectContent>
                  {hesaplar.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.etiket}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="komisyon-dosya">{t("dosyaSec")} *</Label>
              <Input
                id="komisyon-dosya"
                type="file"
                accept=".xlsx"
                onChange={(e) => {
                  setDosya(e.target.files?.[0] ?? null);
                  setYanit(null);
                }}
              />
            </div>
          </div>

          <Button
            type="button"
            disabled={!dosya || !hesap || calisiyor !== null}
            onClick={() => gonder(false)}
          >
            <Upload />
            {calisiyor === "denetle" ? t("denetleniyor") : t("denetle")}
          </Button>
        </CardContent>
      </Card>

      {/* --------------------------- HATA --------------------------- */}
      {yanit?.durum === "HATA" ? (
        <div
          role="alert"
          className="border-destructive/50 bg-destructive/10 space-y-2 rounded-md border p-4"
        >
          <p className="text-destructive text-sm font-medium">{t("hataBaslik")}</p>
          <ul className="text-destructive list-inside list-disc space-y-1 text-sm">
            {yanit.hatalar.map((h, i) => (
              <li key={i}>{hataMetni(h)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {yanit?.durum === "COKTU" ? (
        <p role="alert" className="text-destructive text-sm">
          {t("hataCoktu")}
        </p>
      ) : null}

      {/* ------------------------- ÖNİZLEME ------------------------- */}
      {onizleme ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("onizlemeBaslik")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              {t("platformSatiri", {
                platform: platformAdlari[onizleme.platform],
                sayfa: onizleme.sayfa,
              })}
            </p>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ozetler.map(([etiket, deger]) => (
                <div key={etiket} className="rounded-lg border p-3">
                  <dt className="text-muted-foreground text-xs">{etiket}</dt>
                  <dd className="text-xl font-semibold">{deger}</dd>
                </div>
              ))}
            </dl>

            {/* DEĞİŞEN ORANLAR — dolu bir oranın üzerine yazılıyor, onaydan
                önce hangi kayıtta ne olacağı GÖRÜNMELİ. */}
            {onizleme.degisenOrnekleri.length > 0 ? (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">
                  {t("degisenBaslik", { sayi: onizleme.sayim.degisen })}
                </p>
                <ul className="space-y-1 text-sm">
                  {onizleme.degisenOrnekleri.map((d, i) => (
                    <li key={i}>
                      <span className="font-medium">{d.kanalKodu}</span>
                      {d.urunAdi ? ` · ${d.urunAdi}` : ""} —{" "}
                      {t("degisenSatiri", {
                        eski: oran(d.eskiOran),
                        yeni: oran(d.yeniOran),
                      })}
                    </li>
                  ))}
                </ul>
                {onizleme.sayim.degisen > onizleme.degisenOrnekleri.length ? (
                  <p className="text-muted-foreground text-xs">
                    {t("ilkNGosteriliyor", {
                      gosterilen: onizleme.degisenOrnekleri.length,
                      toplam: onizleme.sayim.degisen,
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* YENİ AÇILACAK EŞLEMELER */}
            {onizleme.yeniEslemeOrnekleri.length > 0 ? (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">
                  {t("yeniEslemeBaslik", { sayi: onizleme.sayim.yeniEsleme })}
                </p>
                <p className="text-muted-foreground text-xs">
                  {t("yeniEslemeNotu")}
                </p>
                <ul className="space-y-1 text-sm">
                  {onizleme.yeniEslemeOrnekleri.map((y, i) => (
                    <li key={i}>
                      {t("yeniEslemeSatiri", {
                        kod: y.kanalKodu,
                        sku: y.varyantSku,
                        oran: oran(y.oran),
                      })}
                    </li>
                  ))}
                </ul>
                {onizleme.sayim.yeniEsleme >
                onizleme.yeniEslemeOrnekleri.length ? (
                  <p className="text-muted-foreground text-xs">
                    {t("ilkNGosteriliyor", {
                      gosterilen: onizleme.yeniEslemeOrnekleri.length,
                      toplam: onizleme.sayim.yeniEsleme,
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* ORANI BOŞ KALACAKLAR — açık sıfır, sessiz yokluk değil.
                Sıfırsa da bir satır yazılır; kullanıcı "hepsi doldu"
                bilgisini ekrandan ALIR, çıkarsamak zorunda kalmaz. */}
            {onizleme.sayim.kalanBosOran > 0 ? (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">
                  {t("kalanBaslik", { sayi: onizleme.sayim.kalanBosOran })}
                </p>
                <p className="text-muted-foreground text-xs">{t("kalanNotu")}</p>
                <ul className="space-y-1 text-sm">
                  {onizleme.kalanBosOranOrnekleri.map((k, i) => (
                    <li key={i}>
                      {t("kalanSatiri", { kod: k.kanalKodu, sku: k.varyantSku })}
                    </li>
                  ))}
                </ul>
                {onizleme.sayim.kalanBosOran >
                onizleme.kalanBosOranOrnekleri.length ? (
                  <p className="text-muted-foreground text-xs">
                    {t("ilkNGosteriliyor", {
                      gosterilen: onizleme.kalanBosOranOrnekleri.length,
                      toplam: onizleme.sayim.kalanBosOran,
                    })}
                  </p>
                ) : null}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/kanal-sku?hesap=${hesap}&eksik=1`}>
                    <ExternalLink />
                    {t("kalanListeye")}
                  </Link>
                </Button>
              </div>
            ) : (
              <p className={`text-sm ${DURUM_YAZISI.olumlu}`}>
                {t("kalanYok")}
              </p>
            )}

            {/* UYARILAR — yüklemeyi DURDURMAZ. */}
            {onizleme.sayim.katalogdaYok > 0 ||
            onizleme.sayim.oranOkunamadi > 0 ||
            onizleme.sayim.tekrarEden > 0 ||
            onizleme.kodCakisti > 0 ? (
              <div className={`space-y-2 rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
                <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
                  <TriangleAlert className="size-4 shrink-0" />
                  {t("uyariBaslik")}
                </p>
                <ul className={`list-inside list-disc space-y-1 text-sm ${DURUM_YAZISI.uyari}`}>
                  {onizleme.sayim.katalogdaYok > 0 ? (
                    <li>
                      {t("uyariKatalogdaYok", {
                        sayi: onizleme.sayim.katalogdaYok,
                      })}
                      {onizleme.bulunamayanOrnekleri.length > 0 ? (
                        <span className="text-xs">
                          {" — "}
                          {onizleme.bulunamayanOrnekleri
                            .slice(0, 5)
                            .map((b) => b.kod)
                            .join(", ")}
                        </span>
                      ) : null}
                    </li>
                  ) : null}
                  {onizleme.sayim.oranOkunamadi > 0 ? (
                    <li>
                      {t("uyariOranOkunamadi", {
                        sayi: onizleme.sayim.oranOkunamadi,
                      })}
                      {onizleme.oranOrnekleri.length > 0 ? (
                        <span className="text-xs">
                          {" — "}
                          {onizleme.oranOrnekleri
                            .slice(0, 5)
                            .map((o) =>
                              t("oranOrnegi", {
                                satir: o.satirNo,
                                deger: o.hamOran === "" ? t("bosDeger") : o.hamOran,
                              }),
                            )
                            .join(" · ")}
                        </span>
                      ) : null}
                    </li>
                  ) : null}
                  {onizleme.sayim.tekrarEden > 0 ? (
                    <li>{t("uyariTekrarEden", { sayi: onizleme.sayim.tekrarEden })}</li>
                  ) : null}
                  {onizleme.kodCakisti > 0 ? (
                    <li>{t("uyariKodCakisti", { sayi: onizleme.kodCakisti })}</li>
                  ) : null}
                </ul>
                <p className={`text-xs ${DURUM_YAZISI.uyari}`}>
                  {t("uyariNotu")}
                </p>
              </div>
            ) : null}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={calisiyor !== null || onizleme.yazilacak === 0}>
                  <Upload />
                  {calisiyor === "yaz" ? t("yaziliyor") : t("yaz")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("yazOnayBaslik")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("yazOnayAciklama", {
                      guncellenecek:
                        onizleme.sayim.bosDolan + onizleme.sayim.degisen,
                      yeni: onizleme.sayim.yeniEsleme,
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => gonder(true)}>
                    {t("yaz")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {onizleme.yazilacak === 0 ? (
              <p className="text-muted-foreground text-sm">{t("yazilacakYok")}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* -------------------------- SONUÇ --------------------------- */}
      {yanit?.durum === "YAZILDI" ? (
        <div
          role="status"
          className={`space-y-2 rounded-md p-3 text-sm ${DURUM_KUTUSU.olumlu}`}
        >
          <p>
            {yanit.guncellenen === 0 && yanit.yaratilan === 0
              ? t("hicYeniYok")
              : t("yazildi", {
                  guncellenen: yanit.guncellenen,
                  yaratilan: yanit.yaratilan,
                })}
          </p>
          {/* KAPANIŞ RAKAMI — yazımdan sonra ÖLÇÜLEN gerçek sayı. Sıfır da
              yazılır: kullanıcı işin bittiğini ekrandan görmeli. */}
          {yanit.kalanBosOran > 0 ? (
            <div className="space-y-2">
              <p>{t("sonucKalan", { sayi: yanit.kalanBosOran })}</p>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/kanal-sku?hesap=${hesap}&eksik=1`}>
                  <ExternalLink />
                  {t("kalanListeye")}
                </Link>
              </Button>
            </div>
          ) : (
            <p>{t("sonucKalanYok")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
