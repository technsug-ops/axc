"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { DurumRozeti } from "@/components/durum-rozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBicim } from "@/lib/bicim-istemci";
import {
  faizGecerliMi,
  odemeOnizlemesi,
  type FaizGirdisi,
  type OdemeOnizlemesi,
} from "@/lib/kart-odeme/hesap";

import { odemeKaydet } from "./eylemler";

/**
 * ============================================================================
 *  EKSTRE ÖDEME FORMU — PREVIEW-BEFORE-WRITE
 * ----------------------------------------------------------------------------
 *  Kaydetmeden önce "şu ödeniyor · kalan şu · şu faiz gideri yazılacak"
 *  dökümü gösterilir. Onaysız yazma yok.
 *
 *  HESAP EKRANDA YAZILMAZ: `odemeOnizlemesi` saf kuralından geliyor —
 *  sunucunun kaydederken kullandığı fonksiyonun AYNISI. İki ayrı hesap
 *  olsaydı önizleme ile kayıt sapabilir ve kullanıcı gördüğünden başkasını
 *  kaydetmiş olurdu.
 * ============================================================================
 */
export function OdemeFormu({
  cardId,
  donem,
  donemEtiketi,
  ekstreBorcu,
  paraBirimi,
  mevcutKayitlar,
  bugun,
  kategoriler,
}: {
  cardId: string;
  /** Ekstre dönemi — ayın 1'i, ISO. */
  donem: string;
  donemEtiketi: string;
  /** Türetilen ekstre borcu; forma ÖN-DOLU gelir ve snapshot'lanır. */
  ekstreBorcu: number;
  paraBirimi: "TRY" | "EUR";
  mevcutKayitlar: { odenenAnaBorc: number }[];
  bugun: string;
  /** Faiz giderinin yazılabileceği AKTİF kategoriler. */
  kategoriler: { id: string; ad: string; onerilenMi: boolean }[];
}) {
  const t = useTranslations("KartOdeme");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  // ÖN-DOLU: sistemin hesabı gelir, kullanıcı DÜZELTEBİLİR.
  const [odenen, setOdenen] = useState(String(ekstreBorcu));
  const [tarih, setTarih] = useState(bugun);
  const [faizYolu, setFaizYolu] = useState<FaizGirdisi["yol"]>("yok");
  const [oran, setOran] = useState("");
  const [gun, setGun] = useState("");
  const [faizTutarMetni, setFaizTutarMetni] = useState("");
  /**
   * KATEGORİ SEÇİMİ. Önerilen ad varsa ön-seçili gelir; yoksa kullanıcı
   * kendi kategorisini seçer. Tek bir ada bağlamak, kategori ekleme ekranı
   * olmadığı için kullanıcıyı çıkmaza sokuyordu (16.08.2026 bulgusu).
   */
  const [kategoriId, setKategoriId] = useState(
    kategoriler.find((k) => k.onerilenMi)?.id ?? "",
  );

  const sayi = (m: string) => {
    const d = Number(m.replace(",", "."));
    return Number.isFinite(d) ? d : 0;
  };

  const faiz: FaizGirdisi =
    faizYolu === "yok"
      ? { yol: "yok" }
      : faizYolu === "elle"
        ? { yol: "elle", tutar: sayi(faizTutarMetni) }
        : {
            yol: "hesapla",
            // Faizin matrahı ödenmeden kalan ana paradır.
            matrah: ekstreBorcu - sayi(odenen),
            oran: sayi(oran),
            gun: Math.trunc(sayi(gun)),
          };

  const onizleme: OdemeOnizlemesi = odemeOnizlemesi({
    ekstreBorcu,
    odenenAnaBorc: sayi(odenen),
    faiz,
    mevcutKayitlar,
  });

  const para = (n: number) => bicim.para(n, paraBirimi);
  const faizSorunlu = !faizGecerliMi(faiz);
  // Faiz varsa kategori ZORUNLU; faiz yoksa hiç sorulmuyor.
  const kategoriEngeli = onizleme.faiz > 0 && kategoriId === "";

  function kaydet() {
    setHata(null);
    basla(async () => {
      const sonuc = await odemeKaydet({
        cardId,
        donem,
        ekstreBorcu,
        odenenAnaBorc: sayi(odenen),
        odemeTarihi: tarih,
        faiz,
        faizKategoriId: kategoriId || null,
      });
      if (sonuc.tamam) {
        setAcik(false);
        router.refresh();
      } else {
        setHata(sonuc.hata);
      }
    });
  }

  if (!acik) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-11 md:h-8"
        onClick={() => setAcik(true)}
      >
        {t("odemeIsaretle")}
      </Button>
    );
  }

  return (
    <div className="bg-card min-w-0 space-y-3 rounded-lg border p-3">
      <div className="text-sm font-medium">
        {t("formBaslik", { donem: donemEtiketi })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`odenen-${donem}`}>{t("odenenAnaBorc")}</Label>
          <Input
            id={`odenen-${donem}`}
            inputMode="decimal"
            value={odenen}
            onChange={(e) => setOdenen(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            {t("onDoluNotu", { tutar: para(ekstreBorcu) })}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`tarih-${donem}`}>{t("odemeTarihi")}</Label>
          <Input
            id={`tarih-${donem}`}
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
          />
        </div>
      </div>

      {/* FAİZ — AYRIK SEÇİM. "İkisi de doluysa hangisi kazanır" sorusu
          doğmasın diye yol SEÇİLİYOR; sessiz öncelik kuralı yok. */}
      <div className="space-y-2">
        <div className="text-sm font-medium">{t("faizBaslik")}</div>
        <div className="flex flex-wrap gap-2">
          {(["yok", "hesapla", "elle"] as const).map((y) => (
            <Button
              key={y}
              type="button"
              size="sm"
              variant={faizYolu === y ? "default" : "outline"}
              className="h-11 md:h-8"
              onClick={() => setFaizYolu(y)}
            >
              {t(`faizYolu_${y}`)}
            </Button>
          ))}
        </div>

        {faizYolu === "hesapla" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`oran-${donem}`}>{t("faizOrani")}</Label>
              <Input
                id={`oran-${donem}`}
                inputMode="decimal"
                placeholder={t("faizOraniOrnek")}
                value={oran}
                onChange={(e) => setOran(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`gun-${donem}`}>{t("faizGun")}</Label>
              <Input
                id={`gun-${donem}`}
                inputMode="numeric"
                placeholder={t("faizGunOrnek")}
                value={gun}
                onChange={(e) => setGun(e.target.value)}
              />
            </div>
            <p className="text-muted-foreground text-xs sm:col-span-2">
              {/* Sistem ORANI üretmez, yalnız çarpar — matrah ekranda yazılı. */}
              {t("faizHesapNotu", {
                matrah: para(Math.max(0, ekstreBorcu - sayi(odenen))),
              })}
            </p>
          </div>
        ) : null}

        {/* KATEGORİ SEÇİMİ — yalnız faiz varken sorulur. */}
        {faizYolu !== "yok" ? (
          <div className="space-y-1">
            <Label htmlFor={`kategori-${donem}`}>{t("faizKategorisi")}</Label>
            <select
              id={`kategori-${donem}`}
              className="border-input bg-background h-11 w-full rounded-md border px-3 text-sm md:h-9"
              value={kategoriId}
              onChange={(e) => setKategoriId(e.target.value)}
            >
              <option value="">{t("kategoriSecin")}</option>
              {kategoriler.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">
              {t("faizKategorisiNotu")}
            </p>
          </div>
        ) : null}

        {faizYolu === "elle" ? (
          <div className="space-y-1">
            <Label htmlFor={`faiz-${donem}`}>{t("faizTutari")}</Label>
            <Input
              id={`faiz-${donem}`}
              inputMode="decimal"
              placeholder={t("faizTutariOrnek")}
              value={faizTutarMetni}
              onChange={(e) => setFaizTutarMetni(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      {/* ------------------------- ÖNİZLEME ------------------------- */}
      <div className="space-y-2 rounded-md border p-3">
        <div className="text-sm font-medium">{t("onizlemeBaslik")}</div>
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("ekstreBorcu")}</dt>
            <dd className="tabular-nums">{para(onizleme.ekstreBorcu)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("odeniyor")}</dt>
            <dd className="tabular-nums">{para(onizleme.odenenAnaBorc)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("kalan")}</dt>
            {/* Eksi kalan KIRPILMAZ: fazla ödeme gerçek bir olaydır. */}
            <dd className="tabular-nums font-medium">{para(onizleme.kalan)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("faiz")}</dt>
            <dd className="tabular-nums">{para(onizleme.faiz)}</dd>
          </div>
        </dl>

        {/* ANA BORÇ KÂRI ETKİLEMEZ — ekranda AÇIKÇA yazılı ki kullanıcı
            "ödediğim para kârdan düştü mü" diye sormasın. */}
        <p className="text-muted-foreground text-xs">
          {onizleme.giderYazilacakMi
            ? t("karaEtkiVar", { tutar: para(Math.abs(onizleme.karaEtki)) })
            : t("karaEtkiYok")}
        </p>

        {onizleme.mukerrer.uyar ? (
          <DurumRozeti durum="uyari">
            {t("mukerrerUyari", {
              onceki: para(onizleme.mukerrer.oncekiToplam),
              kalan: para(onizleme.mukerrer.kalanBorc),
            })}
          </DurumRozeti>
        ) : null}

        {onizleme.mukerrer.asiyorMu ? (
          <DurumRozeti durum="olumsuz">{t("asiyorUyari")}</DurumRozeti>
        ) : null}
      </div>

      {/* Kategori seçilmediyse uyarır — ÇIKMAZ YOK, seçenek listede. */}
      {kategoriEngeli ? (
        <DurumRozeti durum="olumsuz">{t("kategoriSec")}</DurumRozeti>
      ) : null}

      {faizSorunlu ? (
        <DurumRozeti durum="olumsuz">{t("faizGecersiz")}</DurumRozeti>
      ) : null}
      {hata ? <DurumRozeti durum="olumsuz">{hata}</DurumRozeti> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="h-11 md:h-9"
          disabled={bekliyor || faizSorunlu || kategoriEngeli}
          onClick={kaydet}
        >
          {bekliyor ? ortak("kaydediliyor") : t("onaylaKaydet")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-11 md:h-9"
          disabled={bekliyor}
          onClick={() => setAcik(false)}
        >
          {ortak("vazgec")}
        </Button>
      </div>
    </div>
  );
}
