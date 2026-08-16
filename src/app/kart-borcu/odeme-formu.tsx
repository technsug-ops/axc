"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { TriangleAlert } from "lucide-react";

import { DurumRozeti } from "@/components/durum-rozeti";
import { UyariKarti } from "@/components/istatistik-kutusu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBicim } from "@/lib/bicim-istemci";
import {
  faizGecerliMi,
  odemeOnizlemesi,
  oncekiOdenen,
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

  /**
   * ÖN-DOLU = KALAN BORÇ, ekstrenin tamamı DEĞİL.
   *
   * ⚠ 16.08.2026 canlı bulgusu. Form ekstrenin TAMAMINI ön-dolu getiriyordu;
   * ₺5.097,66 zaten ödenmiş bir ekstrede ikinci kez ₺9.097,66 öneriyordu.
   * Yani fazla ödemeyi bizzat teşvik ediyordu — kullanıcı ₺5.097,66'yı
   * tekrar girdi ve kalan −₺1.097,66'ya düştü.
   *
   * "Sistemin hesabı ön-dolu gelir" demek, İKİNCİ ödemede KALAN demektir.
   * Sıfırın altına inmez: kapalı ekstrede öneri 0'dır, kullanıcı isterse
   * yazar.
   */
  const kalanBorc = Math.max(0, ekstreBorcu - oncekiOdenen(mevcutKayitlar));
  const [odenen, setOdenen] = useState(String(kalanBorc));
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
  /**
   * Ekstre zaten kapalıyken AÇIK ONAY istenir. Uyarıyı okumadan
   * "kaydet"e basmak mümkün olmasın: mükerrer tam ödeme bir KAZADIR ve
   * kaza, ek bir bilinçli hareketle durdurulur (İlke #6).
   */
  const [kapaliOnay, setKapaliOnay] = useState(false);
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
            /**
             * MATRAH = ÖDEME ÖNCESİ KALAN BORÇ.
             *
             * ⚠ 16.08.2026 düzeltmesi. Önce `ekstreBorcu − buÖdeme` idi;
             * geciken bir ekstreyi TAM ödeyince matrah 0 çıkıyor ve faiz
             * sıfırlanıyordu. Oysa gecikme faizi, ödeme anında BORÇLU
             * OLDUĞUN tutar üzerinden işler — bugün ödemen, geçmiş günleri
             * geriye dönük silmez.
             */
            matrah: kalanBorc,
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
  /**
   * AÇIK ONAY İKİ HÂLDE İSTENİR: ekstre zaten kapalıysa ya da girilen tutar
   * KALANI AŞIYORSA. İkisi de "kaza" ihtimali yüksek hâller. Kısmi ödeme
   * (kalandan az) ve tam kalan ödeme SORULMADAN geçer — onlar meşru ve
   * sıradan işlerdir.
   */
  const kapaliEngeli =
    (onizleme.mukerrer.zatenKapali || onizleme.mukerrer.asiyorMu) && !kapaliOnay;

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
            {/* Ne önerildiği ve NEDEN önerildiği yazılı: kısmen ödenmiş bir
                ekstrede öneri kalan borçtur, ekstrenin tamamı değil. */}
            {mevcutKayitlar.length > 0
              ? t("onDoluKalanNotu", {
                  kalan: para(kalanBorc),
                  borc: para(ekstreBorcu),
                })
              : t("onDoluNotu", { tutar: para(ekstreBorcu) })}
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
              {t("faizHesapNotu", { matrah: para(kalanBorc) })}
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

      {/* ═══════════ MÜKERRER UYARISI — RAKAMLARIN ÜSTÜNDE ═══════════
          16.08.2026: uyarı 11 px'lik bir rozetti ve önizleme rakamlarının
          ALTINDA duruyordu; kullanıcı aynı ekstreye iki kez tam ödeme
          girdi ve uyarıyı görmedi. Bayrak doğruydu, SUNUM zayıftı.
          Görülmesi kolay kaçan uyarı, çalışmayan uyarıdır (İlke #5).
          Artık üç katmanlı uyarı kartı ve rakamlardan ÖNCE. */}
      {onizleme.mukerrer.zatenKapali ? (
        <UyariKarti
          durum="olumsuz"
          ikon={TriangleAlert}
          baslik={t("zatenKapaliBaslik")}
          altSatir={t("zatenKapaliNot", {
            onceki: para(onizleme.mukerrer.oncekiToplam),
          })}
        />
      ) : onizleme.mukerrer.asiyorMu ? (
        <UyariKarti
          durum="olumsuz"
          ikon={TriangleAlert}
          baslik={t("asiyorBaslik", {
            kalan: para(onizleme.mukerrer.kalanBorc),
          })}
          altSatir={t("asiyorNot", {
            onceki: para(onizleme.mukerrer.oncekiToplam),
          })}
        />
      ) : onizleme.mukerrer.uyar ? (
        <UyariKarti
          durum="uyari"
          ikon={TriangleAlert}
          baslik={t("mukerrerUyari", {
            onceki: para(onizleme.mukerrer.oncekiToplam),
            kalan: para(onizleme.mukerrer.kalanBorc),
          })}
        />
      ) : null}

      {/* ------------------------- ÖNİZLEME ------------------------- */}
      <div className="space-y-2 rounded-md border p-3">
        <div className="text-sm font-medium">{t("onizlemeBaslik")}</div>
        <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("ekstreBorcu")}</dt>
            <dd className="tabular-nums">{para(onizleme.ekstreBorcu)}</dd>
          </div>
          {/* Önceki ödemeler GÖRÜNÜR: "kalan" rakamının neden o olduğu
              ekranda anlaşılsın, kafada hesap yapılmasın. */}
          {onizleme.oncekiToplam !== 0 ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{t("oncekiOdenen")}</dt>
              <dd className="tabular-nums">{para(onizleme.oncekiToplam)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("odeniyor")}</dt>
            <dd className="tabular-nums">{para(onizleme.odenenAnaBorc)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("kalanSonra")}</dt>
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

      </div>

      {/* Kategori seçilmediyse uyarır — ÇIKMAZ YOK, seçenek listede. */}
      {kategoriEngeli ? (
        <DurumRozeti durum="olumsuz">{t("kategoriSec")}</DurumRozeti>
      ) : null}

      {/* Kapalı ekstreye ödeme: onay kutusu işaretlenmeden kaydedilemez. */}
      {onizleme.mukerrer.zatenKapali || onizleme.mukerrer.asiyorMu ? (
        <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-0">
          <input
            type="checkbox"
            className="size-4"
            checked={kapaliOnay}
            onChange={(e) => setKapaliOnay(e.target.checked)}
          />
          {t("zatenKapaliOnay")}
        </label>
      ) : null}

      {faizSorunlu ? (
        <DurumRozeti durum="olumsuz">{t("faizGecersiz")}</DurumRozeti>
      ) : null}
      {hata ? <DurumRozeti durum="olumsuz">{hata}</DurumRozeti> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="h-11 md:h-9"
          disabled={bekliyor || faizSorunlu || kategoriEngeli || kapaliEngeli}
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
