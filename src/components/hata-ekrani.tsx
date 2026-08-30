"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { veritabaniUlasilabilirMi } from "@/app/hata-sondasi";
import { hataEkranDurumu, hataKodu, type Sonda } from "@/lib/hata/durum";
import { DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  HATA EKRANI — ORTAK GÖVDE (K98)
 * ----------------------------------------------------------------------------
 *  Hem `error.tsx` (sayfa sınırı) hem `global-error.tsx` (kök yerleşim
 *  sınırı) BU gövdeyi çiziyor. İki yerde iki ekran olsaydı biri gün gelip
 *  ötekinden ayrışırdı — ve ayrışan tarafı kimse fark etmezdi, çünkü hata
 *  ekranı nadiren görülür.
 *
 *  ⚠ METİN DIŞARIDAN GELİR. `global-error.tsx` kök yerleşimin YERİNE geçtiği
 *  için orada `NextIntlClientProvider` YOKTUR ve `useTranslations` çalışmaz.
 *  Bu yüzden metinler prop olarak veriliyor; her iki çağıran da onları
 *  SÖZLÜKTEN alıyor, koda gömmüyor.
 * ============================================================================
 */

export type HataMetinleri = {
  baslik: string;
  KONTROL_EDILIYOR: string;
  VERITABANI_YOK: string;
  SUNUCUYA_ULASILAMADI: string;
  SUNUCU_HATASI: string;
  neYapmali_VERITABANI_YOK: string;
  neYapmali_SUNUCUYA_ULASILAMADI: string;
  neYapmali_SUNUCU_HATASI: string;
  tekrarDene: string;
  kodEtiketi: string;
};

export function HataEkrani({
  digest,
  yenidenDene,
  metin,
}: {
  digest?: string;
  yenidenDene: () => void;
  metin: HataMetinleri;
}) {
  const [sonda, setSonda] = useState<Sonda>({ durum: "BEKLIYOR" });

  /**
   * ⭐ EKRAN AÇILIR AÇILMAZ SORAR. Sebebi tahmin etmek yerine ölçüyor.
   *
   * ⚠ SONDA ÇAĞRISININ KENDİSİ DÜŞERSE BU DA BİR CEVAPTIR — `CEVAPSIZ`.
   * `catch` boş bırakılsaydı ekran sonsuza kadar "kontrol ediliyor" derdi ve
   * en çok bilgi taşıyan hâl (sunucu hiç cevap vermiyor) kaybolurdu.
   */
  useEffect(() => {
    let iptal = false;
    veritabaniUlasilabilirMi()
      .then((v) => {
        if (!iptal) setSonda({ durum: "CEVAP", veritabani: v });
      })
      .catch(() => {
        if (!iptal) setSonda({ durum: "CEVAPSIZ" });
      });
    return () => {
      iptal = true;
    };
  }, []);

  const durum = hataEkranDurumu(sonda);
  const kod = hataKodu(digest);

  /** ⚠ "Ne yapmalı" satırı yalnız BİLİNEN durumlarda çıkar. */
  const neYapmali =
    durum === "VERITABANI_YOK"
      ? metin.neYapmali_VERITABANI_YOK
      : durum === "SUNUCUYA_ULASILAMADI"
        ? metin.neYapmali_SUNUCUYA_ULASILAMADI
        : durum === "SUNUCU_HATASI"
          ? metin.neYapmali_SUNUCU_HATASI
          : null;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      {/*
        ⚠ HAM RENK SINIFI YAZILMAZ. İlk yazımda `text-amber-600` kondu ve
        `panel:dogrula` kırmızı yandı — haklıydı: renk ANLAM taşır ve tek
        kaynaktan gelir (`lib/renkler.ts`), yoksa yarın biri "başka bir sarı"
        yazar ve sistem sessizce ayrışır. Buradaki anlam `uyari`.
        ⚠ Ve renk tek başına konuşmuyor (kısıt #1): simgenin yanında başlık
        ve ölçülen durum cümlesi yazılı.
      */}
      <AlertTriangle className={`size-8 ${DURUM_YAZISI.uyari}`} aria-hidden />
      <h1 className="text-lg font-semibold">{metin.baslik}</h1>

      {/* ⭐ ÖLÇÜLEN DURUM — tahmin değil, sondanın söylediği. */}
      <p className="text-sm" role="status" aria-live="polite">
        {metin[durum]}
      </p>

      {neYapmali ? (
        <p className="text-muted-foreground text-sm">{neYapmali}</p>
      ) : null}

      {/*
        ⚠ Sonda cevap verene kadar düğme GİZLENMEZ, sadece beklenir: tekrar
        denemek her hâlde meşru bir eylem ve kilitlemek operatörü çıkmaza
        sokardı.
      */}
      <button
        type="button"
        onClick={yenidenDene}
        className="mt-2 h-11 rounded-md border px-4 text-sm font-medium"
      >
        {metin.tekrarDene}
      </button>

      {/*
        ⭐ KOD GÖSTERİLİR — destek için tek tutamak. ⛔ Ham hata mesajı ASLA:
        kullanıcıya bir şey anlatmaz, iç ayrıntı sızdırır.
        ⚠ Kod yoksa satır hiç çıkmaz — boş bir "ERROR" etiketi, olmayan bir
        tutamağı varmış gibi gösterirdi.
      */}
      {kod ? (
        <p className="text-muted-foreground mt-4 font-mono text-xs">
          {metin.kodEtiketi}: {kod}
        </p>
      ) : null}
    </div>
  );
}
