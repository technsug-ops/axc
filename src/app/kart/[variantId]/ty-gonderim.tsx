"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UploadCloud } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_YAZISI } from "@/lib/renkler";

import {
  tyGonderimOnizle,
  tyStokFiyatGonder,
  type TyGonderimOnizlemesi,
  type TyGonderimSonucu,
} from "./actions";

/**
 * ============================================================================
 *  K169 — TRENDYOL'A GÖNDER (stok / fiyat) — KANALA İLK YAZAN EKRAN
 * ----------------------------------------------------------------------------
 *  ⚠ RAKAM GÖRÜLMEDEN GÖNDERİLMEZ: diyalog açılır açılmaz önizleme sunucudan
 *  gelir (barkod · Selliora stoğu · TY'nin bildirdiği adet KIYASI); Gönder
 *  düğmesi önizleme gelmeden pasif. _(K164-③ maliyet kuralının kanal hâli.)_
 *
 *  ⚠ FİYAT BOŞ BIRAKILABİLİR — boş, "fiyata dokunma" demektir; 0 ya da
 *  uydurma bir değer GÖNDERİLMEZ. Stok kutusu da kapatılabilir. İkisi de
 *  kapalıysa gönderilecek şey yoktur ve düğme bunu söyler (İlke #5).
 *
 *  ⚠ HATA KODLA GELİR (K57-③); TY'nin "aynı isteği 15 dk tekrar edemezsin"
 *  reddi AYRI kodla gösterilir — kullanıcı sistemi bozuk sanmasın.
 * ============================================================================
 */

const HATA_ANAHTARI: Record<
  Exclude<TyGonderimSonucu, { tamam: true }>["kod"],
  string
> = {
  KANAL_SKU_YOK: "hataKanalSkuYok",
  HESAP_YOK: "hataHesapYok",
  VARYANT_YOK: "hataVaryantYok",
  GONDERILECEK_YOK: "hataGonderilecekYok",
  FIYAT_GECERSIZ: "hataFiyatGecersiz",
  ANAHTAR_YOK: "hataAnahtarYok",
  TEKRAR_15DK: "hataTekrar15dk",
  KANAL_REDDETTI: "hataKanalReddetti",
  ULASILAMADI: "hataUlasilamadi",
};

const ONIZLEME_HATA: Record<
  Exclude<TyGonderimOnizlemesi, { tamam: true }>["kod"],
  string
> = {
  KANAL_SKU_YOK: "hataKanalSkuYok",
  HESAP_YOK: "hataHesapYok",
  VARYANT_YOK: "hataVaryantYok",
};

export function TyGonderim({ variantId }: { variantId: string }) {
  const t = useTranslations("KanalGonderim");
  const bicim = useBicim();
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [bekliyor, basla] = useTransition();
  const [onizleme, setOnizleme] = useState<TyGonderimOnizlemesi | null>(null);
  const [stokGonder, setStokGonder] = useState(true);
  const [fiyatMetni, setFiyatMetni] = useState("");
  const [sonuc, setSonuc] = useState<TyGonderimSonucu | null>(null);

  useEffect(() => {
    if (!acik || onizleme !== null) return;
    basla(async () => {
      setOnizleme(await tyGonderimOnizle(variantId));
    });
  }, [acik, onizleme, variantId]);

  /** Türkçe ondalık: "2.899,90" → 2899.9 (İlke: elle biçim çözümü yalnız
   *  GİRİŞ yönünde; gösterim her zaman `bicim`den). */
  const fiyatCoz = (metin: string): number | null => {
    const temiz = metin.trim();
    if (temiz === "") return null;
    const sayi = Number(temiz.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(sayi) ? sayi : Number.NaN;
  };

  const gonder = () => {
    const fiyat = fiyatCoz(fiyatMetni);
    basla(async () => {
      const s = await tyStokFiyatGonder(variantId, {
        stokGonder,
        fiyat: fiyat !== null && Number.isNaN(fiyat) ? Number.NaN : fiyat,
      });
      setSonuc(s);
      if (s.tamam) router.refresh();
    });
  };

  const fiyatSayi = fiyatCoz(fiyatMetni);
  const fiyatBozuk = fiyatSayi !== null && Number.isNaN(fiyatSayi);
  const gonderilebilir =
    onizleme?.tamam === true &&
    !fiyatBozuk &&
    (stokGonder || fiyatSayi !== null);

  return (
    <AlertDialog
      open={acik}
      onOpenChange={(a) => {
        setAcik(a);
        if (!a) {
          setOnizleme(null);
          setSonuc(null);
          setFiyatMetni("");
          setStokGonder(true);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-11 md:h-8">
          <UploadCloud className="size-4" />
          {t("dugme")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("baslik")}</AlertDialogTitle>
          <AlertDialogDescription>
            {sonuc === null ? t("aciklama") : null}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {sonuc !== null ? null : onizleme === null ? (
          <p className="text-sm" role="status">
            {t("yukleniyor")}
          </p>
        ) : !onizleme.tamam ? (
          <p className={`text-sm ${DURUM_YAZISI.olumsuz}`} role="alert">
            {t(ONIZLEME_HATA[onizleme.kod])}
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="tabular-nums">
              <div>
                {t("barkod")}: <span className="font-medium">{onizleme.barkod}</span>
              </div>
              <div>
                {t("selioraStok")}:{" "}
                <span className="font-medium">{bicim.sayi(onizleme.selioraStok)}</span>
                {" · "}
                {t("kanalAdet")}:{" "}
                <span className="font-medium">
                  {onizleme.kanalAdet === null
                    ? t("kanalAdetOlculmedi")
                    : bicim.sayi(onizleme.kanalAdet)}
                </span>
              </div>
            </div>
            <label className="flex min-h-11 items-center gap-2 md:min-h-8">
              <input
                type="checkbox"
                checked={stokGonder}
                onChange={(e) => setStokGonder(e.target.checked)}
                className="size-4"
              />
              {t("stokGonder", { adet: bicim.sayi(onizleme.selioraStok) })}
            </label>
            <label className="block space-y-1">
              <span>{t("fiyatEtiketi")}</span>
              <Input
                inputMode="decimal"
                value={fiyatMetni}
                onChange={(e) => setFiyatMetni(e.target.value)}
                placeholder={t("fiyatIpucu")}
              />
            </label>
            {fiyatBozuk ? (
              <p className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{t("hataFiyatGecersiz")}</p>
            ) : null}
            {!stokGonder && fiyatSayi === null ? (
              <p className={`text-xs ${DURUM_YAZISI.notr}`}>{t("gonderilecekYokUyari")}</p>
            ) : null}
          </div>
        )}

        {sonuc === null ? null : sonuc.tamam ? (
          <p className={`text-sm ${DURUM_YAZISI.olumlu}`} role="status">
            {t("basari", {
              stok:
                sonuc.gonderilenStok === null
                  ? t("gonderilmedi")
                  : bicim.sayi(sonuc.gonderilenStok),
              fiyat:
                sonuc.gonderilenFiyat === null
                  ? t("gonderilmedi")
                  : bicim.para(sonuc.gonderilenFiyat, "TRY"),
              durum: sonuc.batchDurumu,
            })}
          </p>
        ) : (
          <p className={`text-sm ${DURUM_YAZISI.olumsuz}`} role="alert">
            {t(HATA_ANAHTARI[sonuc.kod])}
            {sonuc.ayrinti ? ` (${sonuc.ayrinti})` : ""}
          </p>
        )}

        <AlertDialogFooter>
          {sonuc?.tamam ? (
            <AlertDialogCancel>{t("kapat")}</AlertDialogCancel>
          ) : (
            <>
              <AlertDialogCancel disabled={bekliyor}>{t("vazgec")}</AlertDialogCancel>
              <Button
                type="button"
                disabled={bekliyor || !gonderilebilir}
                onClick={gonder}
              >
                {bekliyor ? t("gonderiliyor") : t("gonderOnayla")}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
