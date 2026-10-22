"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { veritabaniUlasilabilirMi } from "@/app/hata-sondasi";
import { hataEkranDurumu, hataKodu, type Sonda } from "@/lib/hata/durum";
import { denemeKaydiCoz, otomatikDenemeKarari } from "@/lib/hata/yeniden-deneme";
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
  /** «{sn}» yer tutucusu kalan saniyeyle değiştirilir. */
  otomatikDeneme: string;
  otomatikBitti: string;
};

/**
 * Deneme kaydının deposu — `sessionStorage`. ⛔ Burada bellek YETMEZ: deneme sayfayı
 * yeniden yükler ve bellek sıfırlanır; sayı tutulamazsa her açılış «ilk deneme» sanılır
 * ve ekran 5 sn'de bir SONSUZA kadar yenilenirdi. Bu yüzden depo çalışmıyorsa otomatik
 * deneme HİÇ yapılmaz, düğme kalır (gizli sekme · site verisi engeli).
 */
const DENEME_ANAHTARI = "hata-otomatik-deneme";
let depoCalisiyor = true;
function kayitOku(): string | null {
  try {
    return window.sessionStorage.getItem(DENEME_ANAHTARI);
  } catch {
    depoCalisiyor = false;
    return null;
  }
}
function kayitYaz(deger: string) {
  try {
    window.sessionStorage.setItem(DENEME_ANAHTARI, deger);
  } catch {
    depoCalisiyor = false;
  }
}

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

  /**
   * K358 — OTOMATİK YENİDEN DENEME. Karar saf gövdeden (`otomatikDenemeKarari`);
   * süre dolunca sayfa YENİDEN YÜKLENİR (sunucu bileşeni yeniden çizilsin diye —
   * `reset()` yalnız istemci sınırını sıfırlar). Hükümden bağımsız.
   */
  const [kalan, setKalan] = useState<number | null>(null);
  const [denemeBitti, setDenemeBitti] = useState(false);
  useEffect(() => {
    const karar = otomatikDenemeKarari(denemeKaydiCoz(kayitOku()), window.location.pathname, Date.now());
    kayitYaz(JSON.stringify(karar.yeniKayit));
    /* Durum zamanlayıcı geri çağrısında kurulur — etki gövdesinde doğrudan değil (lint kuralı). */
    if (karar.bekleSn === null || !depoCalisiyor) {
      const z = window.setTimeout(() => setDenemeBitti(true), 0);
      return () => window.clearTimeout(z);
    }
    const bitis = Date.now() + karar.bekleSn * 1000;
    let sayac = 0;
    const tik = () => {
      const sn = Math.max(0, Math.ceil((bitis - Date.now()) / 1000));
      setKalan(sn);
      if (sn === 0) {
        window.clearInterval(sayac);
        window.location.reload();
      }
    };
    const ilk = window.setTimeout(tik, 0);
    sayac = window.setInterval(tik, 250);
    return () => {
      window.clearTimeout(ilk);
      window.clearInterval(sayac);
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

      {/* K358 — geri sayım görünür; denemeler bitince NEDEN durduğu yazar (İlke #5). */}
      {kalan !== null && !denemeBitti ? (
        <p className="text-sm font-medium" aria-live="polite">
          {metin.otomatikDeneme.replace("{sn}", String(kalan))}
        </p>
      ) : null}
      {denemeBitti ? (
        <p className="text-muted-foreground text-sm">{metin.otomatikBitti}</p>
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
