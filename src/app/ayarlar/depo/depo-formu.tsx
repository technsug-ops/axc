"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Warehouse } from "lucide-react";

import { depoOnizle, depoyuKur, type DepoSonucu } from "@/app/ayarlar/depo/eylemler";
import { DurumRozeti } from "@/components/durum-rozeti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { KUTU_ETIKETI, KUTU_RAKAMI } from "@/lib/kutu-bicimi";

/**
 * ============================================================================
 *  DEPO KURULUM FORMU (K50 ①)
 * ----------------------------------------------------------------------------
 *  ⚠ İKİ ADIM: "Önce göster" hiçbir şey yazmaz; "Kur" ancak plan görüldükten
 *  sonra basılır. Tarife yükleme ekranıyla (K47) aynı disiplin.
 *
 *  ⛔ VE O DİSİPLİN BURADA İKİ YERDEN KIRILMIŞTI (K375, 08.11.2026 — canlı):
 *  ① form `action={fn}` kullanıyordu; React 19 bunu gönderince formu
 *  SIFIRLIYOR (`requestFormReset`, react-dom 19.2.8) — dolayısıyla "Önce
 *  göster"den sonra dört alan da BOŞALIYORDU. ② ikinci düğme formu YENİDEN
 *  okuyordu (`new FormData`) ve okuduğu şey o boş formdu. Sonuç: önizleme
 *  doğru çıkıyor, "24 rafı aç"a basılınca _«Bölüm adı boş olamaz»_ yazıyor
 *  ve HİÇBİR RAF AÇILMIYORDU. Canlıda ölçüldü: `DepoBolumu` 0 satır,
 *  `DEPO_BOLUMU_KURULDU` izi 0.
 *
 *  ⭐ ÇARE İKİ PARÇA: `onSubmit` + `preventDefault` (React sıfırlamaz, alanlar
 *  DOLU kalır — tarife yükleyicisi zaten böyleydi ve bu yüzden çalışıyordu)
 *  VE ikinci adım formu değil ÖNİZLEMEDE GÖRÜLEN tarifi gönderir. İkincisi
 *  tek başına yeterli olurdu ama birincisi olmadan kullanıcı bir sayıyı
 *  düzeltmek için dördünü birden yeniden yazardı.
 *
 *  ⚠ EKRAN KARAR VERMEZ. Doğrulama ve kod üretimi `lib/depo/sablon.ts`te ve
 *  orası veritabanısız sınanıyor.
 * ============================================================================
 */
export function DepoFormu() {
  const t = useTranslations("Depo");
  const [sonuc, setSonuc] = useState<DepoSonucu | null>(null);
  const [bekliyor, basla] = useTransition();
  const onizleme = sonuc?.durum === "ONIZLEME" ? sonuc : null;

  return (
    <form
      className="max-w-3xl space-y-5"
      /**
       * ⛔ `action={fn}` KULLANILMAZ — React formu sıfırlar ve iki adımlı
       * akışın ikinci adımı okuyacak veriyi bulamaz (K375).
       */
      onSubmit={(e) => {
        e.preventDefault();
        const veri = new FormData(e.currentTarget);
        basla(async () => setSonuc(await depoOnizle(veri)));
      }}
    >
      <div className="border-border space-y-4 rounded-lg border p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ad">{t("ad")}</Label>
            <Input id="ad" name="ad" placeholder={t("adIpucu")} disabled={bekliyor} />
            <p className="text-muted-foreground text-xs">{t("adNotu")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kisaltma">{t("kisaltma")}</Label>
            <Input
              id="kisaltma"
              name="kisaltma"
              placeholder={t("kisaltmaIpucu")}
              disabled={bekliyor}
              className="uppercase"
            />
            {/*
              ⚠ "SONRADAN DEĞİŞMEZ" BAŞTAN SÖYLENİR (İlke #5 · mimar şartı).
              Kısaltma basılı etiketin İÇİNDE; değişirse etiket yalan söyler.
              Kullanıcı bunu kurarken bilmeli, sonradan öğrenmemeli.
            */}
            <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("kisaltmaNotu")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unite">{t("unite")}</Label>
            <Input
              id="unite"
              name="unite"
              type="number"
              min={1}
              placeholder={t("uniteIpucu")}
              disabled={bekliyor}
            />
            <p className="text-muted-foreground text-xs">{t("uniteNotu")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goz">{t("goz")}</Label>
            <Input
              id="goz"
              name="goz"
              type="number"
              min={1}
              placeholder={t("gozIpucu")}
              disabled={bekliyor}
            />
            {/*
              ⚠ SABİT KURAL, AYAR DEĞİL — ve gerekçesi EKRANDA yazar.
              Üste kat eklenince mevcut etiketlerin hiçbiri değişmesin diye.
            */}
            <p className="text-muted-foreground text-xs">{t("gozNotu")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={bekliyor} className="min-h-11">
            <Warehouse className="size-4" />
            {bekliyor ? t("hesaplaniyor") : t("onizle")}
          </Button>

          {onizleme ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={bekliyor || onizleme.ozet.yeni.length === 0}
              onClick={() => {
                /**
                 * ⛔ FORM YENİDEN OKUNMAZ (K375). Yazılacak şey, ekranda
                 * GÖRÜLEN plandır; ikisi aynı tariften gelir. Formu okusaydık
                 * kullanıcının önizlemeden sonra yaptığı bir değişiklik
                 * onaylanmamış hâlde yazılabilirdi.
                 */
                basla(async () => setSonuc(await depoyuKur(onizleme.tarif)));
              }}
            >
              {t("kur", { adet: onizleme.ozet.yeni.length })}
            </Button>
          ) : null}
        </div>

        {sonuc?.durum === "HATA" ? (
          <p className={`text-sm ${DURUM_YAZISI.olumsuz}`} role="alert">
            {sonuc.engel}
          </p>
        ) : null}
      </div>

      {/* ── ÖNİZLEME — ONAYSIZ HİÇBİR RAF YAZILMAZ ────────────────────── */}
      {sonuc?.durum === "ONIZLEME" ? (
        <div className="border-border space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">{t("onizlemeBaslik")}</p>

          {/*
            ⛔ NE ONAYLADIĞI EKRANDA YAZAR (K375). Form "Önce göster"den sonra
            da dolu kalıyor, ama onaylanan şey formun O ANKİ hâli DEĞİL,
            önizlemenin dayandığı tariftir. İkisi ayrışabilirse (kullanıcı
            önizlemeden sonra bir sayıyı değiştirdi) bunu görebilmeli.
          */}
          <p className="text-muted-foreground text-sm">
            {t("onizlemeTarif", {
              ad: sonuc.tarif.ad,
              kisaltma: sonuc.tarif.kisaltma,
              unite: sonuc.tarif.uniteSayisi,
              goz: sonuc.tarif.gozSayisi,
            })}
          </p>

          {/* ⚠ Kompakt kutucuk ızgarası — tam genişlik "etiket solda, rakam sağda" YASAK (İlke #12). */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["toplamKod", sonuc.ozet.toplam],
                ["yeniAcilacak", sonuc.ozet.yeni.length],
                ["zatenVar", sonuc.ozet.mevcut.length],
              ] as const
            ).map(([anahtar, deger]) => (
              <div key={anahtar} className="bg-card rounded-lg border px-3 py-2">
                <p className={KUTU_ETIKETI}>{t(anahtar)}</p>
                <p className={`text-base ${KUTU_RAKAMI}`}>{deger}</p>
              </div>
            ))}
          </div>

          {/*
            ⚠ ZATEN VAR OLAN ÜSTÜNE YAZILMAZ — ve bu SESSİZ kalmaz.
            "Kapasite artırma = EKLEME": mevcut rafların üstünde ürün var ve
            basılı etiketleri raflarda duruyor.
          */}
          {sonuc.ozet.mevcut.length > 0 ? (
            <p className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.notr}`}>
              {t("mevcutAtlanacak", { adet: sonuc.ozet.mevcut.length })}
            </p>
          ) : null}

          {sonuc.ozet.yeni.length === 0 ? (
            <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("yeniYok")}</p>
          ) : (
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">{t("ornekKodlar")}</p>
              <p className="font-mono text-sm break-all">
                {sonuc.ozet.yeni.slice(0, 12).join(" · ")}
                {sonuc.ozet.yeni.length > 12
                  ? ` … +${sonuc.ozet.yeni.length - 12}`
                  : ""}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {sonuc?.durum === "KURULDU" ? (
        <div className="border-border space-y-2 rounded-lg border p-4">
          <DurumRozeti durum="olumlu">{t("kurulduBaslik")}</DurumRozeti>
          <p className="text-sm">
            {t("kurulduOzet", { acilan: sonuc.acilan, atlanan: sonuc.atlanan })}
          </p>
          <p className="text-muted-foreground text-sm">{t("kurulduSonraki")}</p>
        </div>
      ) : null}
    </form>
  );
}
