"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calculator, UploadCloud } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BuyboxKanali } from "@/lib/buybox";
import { fiyatMetniCoz, fiyatSonucu, zararOnayiGerekirMi, type FiyatSonucu } from "@/lib/buybox-fiyat";
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_YAZISI } from "@/lib/renkler";

import { buyboxFiyatGonder, buyboxFiyatZeminiGetir, type BuyboxGonderimSonucu, type ZeminCevabi } from "./fiyat-eylemleri";

/**
 * ============================================================================
 *  BUYBOX FİYAT KUTUSU — SATIR İÇİ (K363 Faz 3-c, kullanıcı isteği 25.10.2026)
 * ----------------------------------------------------------------------------
 *  «Her ürünün yanına bir kutu koyalım, mevcut Buybox fiyatını yazalım …
 *  hemen hesap ediyor ve altta kâr oranları çıkıyor; sen okey dersen hemen
 *  Trendyol'a gönderiyor.» (Melontik örneği: Hesapla → kâr rozeti → Kaydet →
 *  «emin misiniz».)
 *  · İlk «Hesapla» zemini sunucudan alır (tek sefer); sonra her tuşta
 *    tarayıcıda yeniden hesaplanır — kartla aynı motor.
 *  · Kaydet YALNIZ Trendyol, YALNIZ fiyat; onay penceresi eski → yeni fiyatı ve
 *    NET'i gösterir. Zarar/bilinmeyen kâr → onay kutusu işaretlenmeden geçmez.
 * ============================================================================
 */
export function FiyatKutusu({
  variantId,
  kanal,
  urunAdi,
  bizimFiyat,
  buyboxFiyati,
  gonderebilir,
}: {
  variantId: string;
  kanal: BuyboxKanali;
  urunAdi: string;
  bizimFiyat: number | null;
  buyboxFiyati: number | null;
  /** `kanal.yaz` izni var mı (sayfa çözer; sunucu yine kendisi sınar). */
  gonderebilir: boolean;
}) {
  const t = useTranslations("Buybox");
  const tk = useTranslations("KanalGonderim");
  const bicim = useBicim();
  const router = useRouter();
  const [fiyatMetni, setFiyatMetni] = useState(buyboxFiyati === null ? "" : bicim.sayi(buyboxFiyati, 2));
  const [zemin, setZemin] = useState<ZeminCevabi | null>(null);
  const [yukleniyor, yukle] = useTransition();
  const [onayAcik, setOnayAcik] = useState(false);
  const [zararOnayi, setZararOnayi] = useState(false);
  const [gonderiliyor, gonderBasla] = useTransition();
  const [sonuc, setSonuc] = useState<BuyboxGonderimSonucu | null>(null);

  const fiyat = fiyatMetniCoz(fiyatMetni);
  const fiyatGecerli = fiyat !== null && !Number.isNaN(fiyat);
  const bugun = new Date();
  const hesap = (f: number | null): FiyatSonucu | null => (zemin?.tamam && f !== null ? fiyatSonucu(zemin.zemin, f, bugun) : null);
  const girilen = fiyatGecerli ? hesap(fiyat) : null;

  const hesapla = () => {
    if (zemin?.tamam) return;
    yukle(async () => setZemin(await buyboxFiyatZeminiGetir(variantId, kanal)));
  };

  const rozet = (s: FiyatSonucu | null) => {
    if (s === null) return null;
    if (s.net2 === null) return <span className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("karBilinmiyor")}</span>;
    const zarar = s.net2 < 0;
    return (
      <span className={`text-xs font-medium tabular-nums ${zarar ? DURUM_YAZISI.olumsuz : DURUM_YAZISI.olumlu}`}>
        {t(zarar ? "rozetZarar" : "rozetKar", { tutar: bicim.para(Math.abs(s.net2), "TRY"), marj: s.marj === null ? "—" : bicim.yuzde(s.marj) })}
      </span>
    );
  };

  const gonder = () => {
    if (!fiyatGecerli) return;
    gonderBasla(async () => {
      const s = await buyboxFiyatGonder(variantId, kanal, fiyat, zararOnayi);
      setSonuc(s);
      if (s.tamam) router.refresh();
    });
  };
  const onayGerekli = girilen !== null && zararOnayiGerekirMi(girilen);

  return (
    <div className="mt-1 space-y-1 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          inputMode="decimal"
          value={fiyatMetni}
          onChange={(e) => {
            setFiyatMetni(e.target.value);
            setSonuc(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") hesapla();
          }}
          placeholder={t("fiyatIpucu")}
          aria-label={t("fiyatEtiketi", { urun: urunAdi })}
          className="h-11 w-32 tabular-nums md:h-9"
        />
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={hesapla} disabled={yukleniyor || zemin?.tamam === true}>
          <Calculator className="size-4" />
          {yukleniyor ? t("hesaplaniyor") : t("hesapla")}
        </Button>
        {zemin?.tamam && kanal === "TY" && gonderebilir ? (
          <Button
            type="button"
            className="h-11 md:h-9"
            disabled={!fiyatGecerli || gonderiliyor}
            onClick={() => {
              setZararOnayi(false);
              setSonuc(null);
              setOnayAcik(true);
            }}
          >
            <UploadCloud className="size-4" />
            {t("kaydet")}
          </Button>
        ) : null}
      </div>

      {fiyat !== null && Number.isNaN(fiyat) ? <p className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{t("fiyatGecersiz")}</p> : null}

      {zemin === null ? null : !zemin.tamam ? (
        <p className={`text-xs ${DURUM_YAZISI.olumsuz}`} role="alert">{t(`zeminHata_${zemin.kod}`)}</p>
      ) : (
        <div className="space-y-0.5 text-xs">
          {girilen ? <div>{t("girilenFiyatta")} {rozet(girilen)}</div> : null}
          <div className="text-muted-foreground">
            {t("bizimFiyatta")} {bizimFiyat === null ? "—" : rozet(hesap(bizimFiyat))}
            {" · "}
            {t("buyboxFiyatinda")} {buyboxFiyati === null ? "—" : rozet(hesap(buyboxFiyati))}
          </div>
          <div className="text-muted-foreground">
            {zemin.zemin.maliyet === null
              ? t("maliyetYok")
              : t("maliyetNotu", { maliyet: bicim.para(zemin.zemin.maliyet, "TRY"), parti: zemin.partiSayisi })}
            {" · "}
            {zemin.zemin.kargoTarifesi !== null
              ? t(zemin.kargo.firmaKaynagi === "KANAL" ? "kargoDahilKanal" : "kargoDahil", { firma: zemin.kargo.firma ?? "—", desi: bicim.sayi(zemin.kargo.desi ?? 0, 1) })
              : t(`kargoHaric_${zemin.kargo.sebep ?? "TARIFE_YOK"}`)}
          </div>
          {kanal === "HB" ? <div className="text-muted-foreground">{t("hbGonderimYok")}</div> : null}
        </div>
      )}

      {sonuc === null || onayAcik ? null : <GonderimSonucu sonuc={sonuc} t={t} tk={tk} para={(n) => bicim.para(n, "TRY")} />}

      <AlertDialog open={onayAcik} onOpenChange={(a) => !gonderiliyor && setOnayAcik(a)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("onayBaslik")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("onayMetni", {
                urun: urunAdi,
                eski: bizimFiyat === null ? "—" : bicim.para(bizimFiyat, "TRY"),
                yeni: fiyatGecerli ? bicim.para(fiyat, "TRY") : "—",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 text-sm">
            <div>{t("onayKar")} {rozet(girilen)}</div>
            <p className="text-muted-foreground text-xs">{t("onayYalnizFiyat")}</p>
            {onayGerekli ? (
              <label className={`flex min-h-11 items-start gap-2 text-sm ${DURUM_YAZISI.olumsuz}`}>
                <input type="checkbox" className="mt-1 size-4" checked={zararOnayi} onChange={(e) => setZararOnayi(e.target.checked)} />
                {girilen?.net2 === null ? t("onayKarBilinmiyorKutu") : t("onayZararKutu")}
              </label>
            ) : null}
            {sonuc !== null ? <GonderimSonucu sonuc={sonuc} t={t} tk={tk} para={(n) => bicim.para(n, "TRY")} /> : null}
          </div>
          <AlertDialogFooter>
            {sonuc?.tamam ? (
              <AlertDialogCancel>{tk("kapat")}</AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel disabled={gonderiliyor}>{tk("vazgec")}</AlertDialogCancel>
                <Button type="button" disabled={gonderiliyor || !fiyatGecerli || (onayGerekli && !zararOnayi)} onClick={gonder}>
                  {gonderiliyor ? tk("gonderiliyor") : t("onayEvet")}
                </Button>
              </>
            )}
          </AlertDialogFooter>
          {onayGerekli && !zararOnayi ? <p className={`text-xs ${DURUM_YAZISI.notr}`}>{t("onayKutuGerekli")}</p> : null}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type Ceviri = (anahtar: string, degerler?: Record<string, string | number>) => string;

/** Kartın Trendyol gönderimiyle AYNI hata metinleri (`KanalGonderim`, İlke #10). */
const TY_HATA: Record<string, string> = {
  KANAL_SKU_YOK: "hataKanalSkuYok",
  HESAP_YOK: "hataHesapYok",
  VARYANT_YOK: "hataVaryantYok",
  VARYANT_BARKODU_YOK: "hataVaryantBarkoduYok",
  GONDERILECEK_YOK: "hataGonderilecekYok",
  FIYAT_GECERSIZ: "hataFiyatGecersiz",
  ANAHTAR_YOK: "hataAnahtarYok",
  TEKRAR_15DK: "hataTekrar15dk",
  KANAL_REDDETTI: "hataKanalReddetti",
  ULASILAMADI: "hataUlasilamadi",
};

function GonderimSonucu({
  sonuc,
  t,
  tk,
  para,
}: {
  sonuc: BuyboxGonderimSonucu;
  t: Ceviri;
  tk: Ceviri;
  para: (n: number) => string;
}) {
  if (sonuc.tamam) {
    const renk = sonuc.batchDurumu === "BASARILI" ? DURUM_YAZISI.olumlu : sonuc.batchDurumu === "BASARISIZ" ? DURUM_YAZISI.olumsuz : DURUM_YAZISI.uyari;
    return (
      <div className="space-y-0.5" role={sonuc.batchDurumu === "BASARISIZ" ? "alert" : "status"}>
        <p className={`text-xs ${renk}`}>
          {t(`gonderim_${sonuc.batchDurumu}`, { fiyat: sonuc.gonderilenFiyat === null ? "—" : para(sonuc.gonderilenFiyat) })}
        </p>
        {sonuc.sebepler.map((s, i) => (
          <p key={i} className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{s}</p>
        ))}
      </div>
    );
  }
  const tyAnahtar = TY_HATA[sonuc.kod];
  return (
    <p className={`text-xs ${DURUM_YAZISI.olumsuz}`} role="alert">
      {tyAnahtar ? tk(tyAnahtar) : t(`gonderimHata_${sonuc.kod}`)}
      {sonuc.ayrinti ? ` (${sonuc.ayrinti})` : ""}
    </p>
  );
}
