"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Lightbulb } from "lucide-react";

import Link from "@/components/niyetli-baglanti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fiyatMetniCoz } from "@/lib/buybox-fiyat";
import { KURAL_MODLARI, MALIYET_TERCIHLERI, type EtkinKural, type GenelKural, type Oneri, type UrunKurali } from "@/lib/buybox-kural";
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_SERIDI, DURUM_YAZISI } from "@/lib/renkler";

import { buyboxUrunKuraliKaydet, type KuralHatasi } from "./kural-eylemleri";

/**
 * ============================================================================
 *  BUYBOX FİYAT KURALI — PENCERE KUTULARI (K366)
 * ----------------------------------------------------------------------------
 *  ① Öneri kutusu: önerilen fiyat + gerekçe; «kutuya yaz» yalnız fiyat
 *    kutusunu doldurur — GÖNDERMEZ (onaylı mod: Kaydet → onay adımı aynen).
 *    Öneri yoksa NEDEN yazar (İlke #5); desi eksikse ürün kartına götürür.
 *  ② Ürün kuralı formu: üç alan, boş = genel ayarı izle.
 * ============================================================================
 */

export function OneriKutusu({
  oneri,
  kural,
  ikinciFiyat,
  buyboxFiyati,
  indirimli,
  desiYok,
  urunId,
  kutuyaYaz,
}: {
  oneri: Oneri;
  kural: EtkinKural;
  ikinciFiyat: number | null;
  buyboxFiyati: number | null;
  indirimli: boolean;
  /** Kargo bilinmiyor VE sebebi ürün desisinin girilmemiş olması. */
  desiYok: boolean;
  urunId: string | null;
  kutuyaYaz: (fiyat: number) => void;
}) {
  const t = useTranslations("Buybox");
  const bicim = useBicim();
  const para = (n: number | null) => (n === null ? "—" : bicim.para(n, "TRY"));
  const ortak = { adim: para(kural.adim), min: bicim.yuzde(kural.minMarj), ikinci: para(ikinciFiyat), buybox: para(buyboxFiyati) };

  let ton: "olumlu" | "uyari" | "notr" = "notr";
  let metin: string;
  if (oneri.tur === "GONDER") {
    ton = "olumlu";
    metin = t(`oneri_${oneri.neden}`, ortak);
  } else if (oneri.tur === "DOKUNMA") {
    ton = oneri.neden === "TABAN" || oneri.neden === "FIYAT_DISI" ? "uyari" : "notr";
    metin =
      oneri.neden === "TABAN" && oneri.sonuc === null
        ? t("dokunma_TABAN_SIFIR", ortak)
        : t(`dokunma_${oneri.neden}`, { ...ortak, hedef: para(oneri.hedef), marj: oneri.sonuc?.marj == null ? "—" : bicim.yuzde(oneri.sonuc.marj) });
  } else {
    ton = "uyari";
    metin = oneri.sebep === "KARGO_YOK" && desiYok ? t("desiBekliyorUzun") : t(`hesaplanamaz_${oneri.sebep}`);
  }

  return (
    <div className={`bg-card space-y-1.5 rounded-lg border p-2.5 ${DURUM_SERIDI[ton]}`} role="status">
      <p className="flex items-center gap-1.5 text-xs font-medium">
        <Lightbulb className="size-4 shrink-0" aria-hidden />
        {t("oneriBaslik")}
      </p>
      {oneri.tur === "GONDER" ? (
        <p className="text-sm font-semibold tabular-nums">
          {para(oneri.listeFiyati)}
          {indirimli ? <span className="text-muted-foreground ml-1 text-xs font-normal">{t("musteriKisa", { fiyat: para(oneri.musteri) })}</span> : null}
          {oneri.sonuc.net2 !== null ? (
            <span className={`ml-2 text-xs ${DURUM_YAZISI.olumlu}`}>
              {t("rozetKar", { tutar: para(oneri.sonuc.net2), marj: oneri.sonuc.marj === null ? "—" : bicim.yuzde(oneri.sonuc.marj) })}
            </span>
          ) : null}
        </p>
      ) : null}
      <p className={`text-xs ${ton === "notr" ? "text-muted-foreground" : DURUM_YAZISI[ton]}`}>{metin}</p>
      {oneri.tur === "GONDER" ? (
        <Button type="button" variant="outline" className="h-11 text-xs md:h-9" onClick={() => kutuyaYaz(oneri.listeFiyati)}>
          {t("oneriKullan")}
        </Button>
      ) : null}
      {oneri.tur === "HESAPLANAMAZ" && oneri.sebep === "KARGO_YOK" && desiYok && urunId !== null ? (
        <Link href={`/urunler/${urunId}/duzenle`} className="inline-flex min-h-11 items-center text-xs underline underline-offset-2 hover:no-underline md:min-h-0">
          {t("desiGir")}
        </Link>
      ) : null}
    </div>
  );
}

/** Kural özeti satırı — her alanın değeri, ürüne ayrıysa işaretiyle. */
export function KuralOzeti({ kural }: { kural: EtkinKural }) {
  const t = useTranslations("Buybox");
  const bicim = useBicim();
  const ayri = (b: boolean) => (b ? ` (${t("kuralAyri")})` : "");
  return (
    <p className="text-muted-foreground text-xs">
      {t("kuralOzeti", {
        marj: bicim.yuzde(kural.minMarj) + ayri(kural.ayri.minMarj),
        adim: bicim.para(kural.adim, "TRY") + ayri(kural.ayri.adim),
        maliyet: t(`maliyetTercihi_${kural.maliyet}`) + ayri(kural.ayri.maliyet),
        mod: t(`mod_${kural.mod}`) + ayri(kural.ayri.mod),
      })}
    </p>
  );
}

/** Marj: virgüllü/eksi olabilir. Boş → `null`; okunamayan → `NaN`. */
function marjCoz(metin: string): number | null {
  const temiz = metin.trim().replace(/\s|%/g, "").replace(",", ".");
  if (temiz === "") return null;
  const x = Number(temiz);
  return Number.isFinite(x) ? x : Number.NaN;
}

export function UrunKuraliFormu({
  variantId,
  genel,
  urun,
  kaydedildi,
}: {
  variantId: string;
  genel: GenelKural;
  urun: UrunKurali | null;
  /** Kayıttan sonra pencere zemini (ve öneriyi) yeniden kurar. */
  kaydedildi: () => void;
}) {
  const t = useTranslations("Buybox");
  const bicim = useBicim();
  const [marjMetni, setMarjMetni] = useState(urun?.minMarj == null ? "" : bicim.sayi(urun.minMarj, 2));
  const [adimMetni, setAdimMetni] = useState(urun?.adim == null ? "" : bicim.sayi(urun.adim, 2));
  const [maliyet, setMaliyet] = useState<string>(urun?.maliyet ?? "");
  const [mod, setMod] = useState<string>(urun?.mod ?? "");
  const [kaydediliyor, kaydet] = useTransition();
  const [sonuc, setSonuc] = useState<{ tamam: true } | { tamam: false; kod: KuralHatasi | "SAYI" } | null>(null);

  const marj = marjCoz(marjMetni);
  const adim = fiyatMetniCoz(adimMetni);
  const sayiHatali = (marj !== null && Number.isNaN(marj)) || (adim !== null && Number.isNaN(adim));

  const gonder = () => {
    if (sayiHatali) {
      setSonuc({ tamam: false, kod: "SAYI" });
      return;
    }
    kaydet(async () => {
      const s = await buyboxUrunKuraliKaydet(variantId, { minMarj: marj, adim, maliyet: maliyet === "" ? null : maliyet, mod: mod === "" ? null : mod });
      setSonuc(s);
      if (s.tamam) kaydedildi();
    });
  };

  return (
    <details className="rounded-lg border p-2.5 text-sm">
      <summary className="cursor-pointer text-xs font-medium underline underline-offset-2">{t("urunKuraliBaslik")}</summary>
      <div className="mt-2 space-y-2">
        <p className="text-muted-foreground text-xs">{t("urunKuraliNotu")}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="font-medium">{t("alanMarj")}</span>
            <Input inputMode="decimal" value={marjMetni} onChange={(e) => { setMarjMetni(e.target.value); setSonuc(null); }} placeholder={t("marjIpucu")} className="h-11 tabular-nums md:h-9" />
            <span className="text-muted-foreground block">{t("genelIzle", { deger: bicim.yuzde(genel.minMarj) })}</span>
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium">{t("alanAdim")}</span>
            <Input inputMode="decimal" value={adimMetni} onChange={(e) => { setAdimMetni(e.target.value); setSonuc(null); }} placeholder={t("adimIpucu")} className="h-11 tabular-nums md:h-9" />
            <span className="text-muted-foreground block">{t("genelIzle", { deger: bicim.para(genel.adim, "TRY") })}</span>
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium">{t("alanMaliyet")}</span>
            <select value={maliyet} onChange={(e) => { setMaliyet(e.target.value); setSonuc(null); }} className="border-input bg-background h-11 w-full rounded-md border px-2 text-sm md:h-9">
              <option value="">{t("genelIzle", { deger: t(`maliyetTercihi_${genel.maliyet}`) })}</option>
              {MALIYET_TERCIHLERI.map((m) => (
                <option key={m} value={m}>{t(`maliyetTercihi_${m}`)}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium">{t("alanMod")}</span>
            <select value={mod} onChange={(e) => { setMod(e.target.value); setSonuc(null); }} className="border-input bg-background h-11 w-full rounded-md border px-2 text-sm md:h-9">
              <option value="">{t("genelIzle", { deger: t(`mod_${genel.mod}`) })}</option>
              {KURAL_MODLARI.map((m) => (
                <option key={m} value={m}>{t(`mod_${m}`)}</option>
              ))}
            </select>
          </label>
        </div>
        {(mod === "" ? genel.mod : mod) === "OTOMATIK" ? <p className={`text-xs ${DURUM_YAZISI.uyari}`} role="alert">{t("urunModOtomatikNotu")}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" className="h-11 md:h-9" disabled={kaydediliyor} onClick={gonder}>
            {kaydediliyor ? t("kuralKaydediliyor") : t("kuralKaydet")}
          </Button>
          {sonuc?.tamam ? <p className={`text-xs ${DURUM_YAZISI.olumlu}`} role="status">{t("kuralKaydedildi")}</p> : null}
          {sonuc && !sonuc.tamam ? <p className={`text-xs ${DURUM_YAZISI.olumsuz}`} role="alert">{t(`kuralHata_${sonuc.kod}`)}</p> : null}
        </div>
      </div>
    </details>
  );
}
