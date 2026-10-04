"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UYGULAMA } from "@/lib/uygulama";
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
import { HB_HATA_ANAHTARLARI } from "@/lib/kanal-gonderim-hb";
import { DURUM_YAZISI } from "@/lib/renkler";

import {
  hbGonderimOnizle,
  hbStokFiyatGonder,
  type HbGonderimOnizlemesi,
  type HbGonderimSonucu,
  type HbParcaSonucu,
} from "./actions";

/**
 * ============================================================================
 *  K194-HB — HEPSİBURADA'YA GÖNDER (stok / fiyat)
 * ----------------------------------------------------------------------------
 *  TY penceresiyle aynı düzen (İlke #10): önizleme gelmeden Gönder pasif ·
 *  boş fiyat «fiyata dokunma» demek · hata kodla gelir.
 *  HB'ye özgü: hangi mağazaya gideceği (deneme/canlı) YAZAR; canlı kilidi
 *  kapalıyken düğme kapalı kalır ve NEDEN kapalı olduğu yazar (İlke #5).
 *  Stok ve fiyatın sonucu AYRI satırlarda — biri reddedilip öteki gitmiş
 *  olabilir; tek «başarılı» cümlesi bunu gizlerdi.
 * ============================================================================
 */

export const HATA_ANAHTARI: Record<Exclude<HbGonderimSonucu, { tamam: true }>["kod"], string> = {
  KANAL_SKU_YOK: "hataKanalSkuYok",
  HESAP_YOK: "hataHesapYok",
  VARYANT_YOK: "hataVaryantYok",
  GONDERILECEK_YOK: "hataGonderilecekYok",
  FIYAT_GECERSIZ: "hataFiyatGecersiz",
  KURAL_IHLALI: "hataKuralIhlali",
  ANAHTAR_YOK: "hataAnahtarYok",
  CANLI_KAPALI: "canliKapali",
};

export const ONIZLEME_HATA: Record<Exclude<HbGonderimOnizlemesi, { tamam: true }>["kod"], string> = {
  KANAL_SKU_YOK: "hataKanalSkuYok",
  HESAP_YOK: "hataHesapYok",
  VARYANT_YOK: "hataVaryantYok",
  ANAHTAR_YOK: "hataAnahtarYok",
};

export function HbGonderim({ variantId }: { variantId: string }) {
  const t = useTranslations("KanalGonderimHb");
  const bicim = useBicim();
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [bekliyor, basla] = useTransition();
  const [onizleme, setOnizleme] = useState<HbGonderimOnizlemesi | null>(null);
  const [stokGonder, setStokGonder] = useState(true);
  const [fiyatMetni, setFiyatMetni] = useState("");
  const [sonuc, setSonuc] = useState<HbGonderimSonucu | null>(null);

  useEffect(() => {
    if (!acik || onizleme !== null) return;
    basla(async () => {
      setOnizleme(await hbGonderimOnizle(variantId));
    });
  }, [acik, onizleme, variantId]);

  /** Türkçe ondalık girişi: "2.899,90" → 2899.9 (gösterim her zaman `bicim`den). */
  const fiyatCoz = (metin: string): number | null => {
    const temiz = metin.trim();
    if (temiz === "") return null;
    const sayi = Number(temiz.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(sayi) ? sayi : Number.NaN;
  };

  const gonder = () => {
    const fiyat = fiyatCoz(fiyatMetni);
    basla(async () => {
      const s = await hbStokFiyatGonder(variantId, { stokGonder, fiyat });
      setSonuc(s);
      if (s.tamam) router.refresh();
    });
  };

  const fiyatSayi = fiyatCoz(fiyatMetni);
  const fiyatBozuk = fiyatSayi !== null && Number.isNaN(fiyatSayi);
  const gonderilebilir =
    onizleme?.tamam === true && !onizleme.canliKapali && !fiyatBozuk && (stokGonder || fiyatSayi !== null);

  const hataMetni = (kod: string) => {
    const anahtar = HB_HATA_ANAHTARLARI[kod];
    return anahtar ? t(anahtar) : kod;
  };

  const parcaSatiri = (ad: string, p: HbParcaSonucu, deger: string, bicimle: (n: number) => string) => (
    <div className="space-y-1">
      <p
        className={`text-sm ${
          p.hukum === "DOGRULANDI" ? DURUM_YAZISI.olumlu : p.hukum === "RED" ? DURUM_YAZISI.olumsuz : DURUM_YAZISI.uyari
        }`}
        role={p.hukum === "RED" ? "alert" : "status"}
      >
        {t(`hukum_${p.hukum}`, { ad, deger })}
        {p.kanaldaki !== undefined && p.hukum !== "DOGRULANDI" && p.hukum !== "RED"
          ? " " + t("kanaldaki", { deger: p.kanaldaki === null ? "—" : bicimle(p.kanaldaki) })
          : ""}
        {p.ayrinti ? ` (${p.ayrinti})` : ""}
      </p>
      {p.hatalar.map((h) => (
        <p key={h} className={`text-xs ${DURUM_YAZISI.olumsuz}`}>
          {hataMetni(h)}
        </p>
      ))}
      {p.kilitler.map((k, i) => (
        <p key={i} className={`text-xs ${DURUM_YAZISI.olumsuz}`}>
          {hataMetni(k.tip)}{" "}
          {t("kilitAraligi", {
            min: k.min === null ? "—" : bicim.para(k.min, "TRY"),
            max: k.max === null ? "—" : bicim.para(k.max, "TRY"),
          })}
        </p>
      ))}
    </div>
  );

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
          <AlertDialogDescription>{sonuc === null ? t("aciklama") : null}</AlertDialogDescription>
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
            <p className={`text-xs font-medium ${onizleme.ortam === "TEST" ? DURUM_YAZISI.uyari : DURUM_YAZISI.notr}`}>
              {onizleme.ortam === "TEST" ? t("ortamTest") : t("ortamCanli")}
            </p>
            {onizleme.canliKapali ? (
              <p className={`text-sm ${DURUM_YAZISI.uyari}`} role="status">
                {t("canliKapali")}
              </p>
            ) : null}
            <div className="tabular-nums">
              <div>
                {t("hbSku")}: <span className="font-medium">{onizleme.hbSku}</span>
              </div>
              <div>
                {t("sistemStogu", { uygulama: UYGULAMA.ad })}: <span className="font-medium">{bicim.sayi(onizleme.sistemStogu)}</span>
                {" · "}
                {t("kanalAdet")}:{" "}
                <span className="font-medium">
                  {onizleme.kanalAdet === null ? t("kanalAdetOlculmedi") : bicim.sayi(onizleme.kanalAdet)}
                </span>
              </div>
            </div>
            <label className="flex min-h-11 items-center gap-2 md:min-h-8">
              <input type="checkbox" checked={stokGonder} onChange={(e) => setStokGonder(e.target.checked)} className="size-4" />
              {t("stokGonder", { adet: bicim.sayi(onizleme.sistemStogu) })}
            </label>
            <label className="block space-y-1">
              <span>{t("fiyatEtiketi")}</span>
              <Input inputMode="decimal" value={fiyatMetni} onChange={(e) => setFiyatMetni(e.target.value)} placeholder={t("fiyatIpucu")} />
            </label>
            <p className="text-muted-foreground text-xs">{t("fiyatBandiNotu")}</p>
            {fiyatBozuk ? <p className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{t("hataFiyatGecersiz")}</p> : null}
            {!stokGonder && fiyatSayi === null ? (
              <p className={`text-xs ${DURUM_YAZISI.notr}`}>{t("gonderilecekYokUyari")}</p>
            ) : null}
          </div>
        )}

        {sonuc === null ? null : sonuc.tamam ? (
          <div className="space-y-2">
            {sonuc.stok ? parcaSatiri(t("parcaStok"), sonuc.stok, bicim.sayi(sonuc.stok.gonderilen), (n) => bicim.sayi(n)) : null}
            {sonuc.fiyat ? parcaSatiri(t("parcaFiyat"), sonuc.fiyat, bicim.para(sonuc.fiyat.gonderilen, "TRY"), (n) => bicim.para(n, "TRY")) : null}
          </div>
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
              <Button type="button" disabled={bekliyor || !gonderilebilir} onClick={gonder}>
                {bekliyor ? t("gonderiliyor") : t("gonderOnayla")}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
