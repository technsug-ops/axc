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
import type { BuyboxDurumu, BuyboxKanali } from "@/lib/buybox";
import { fiyatMetniCoz, fiyatSonucu, hizliFiyatlar, zararOnayiGerekirMi, type FiyatSonucu } from "@/lib/buybox-fiyat";
import { useBicim } from "@/lib/bicim-istemci";
import { HB_HATA_ANAHTARLARI } from "@/lib/kanal-gonderim-hb";
import { DURUM_YAZISI, DURUM_ZEMINI } from "@/lib/renkler";

import { HATA_ANAHTARI as HB_HATA } from "../../kart/[variantId]/hb-gonderim";
import { buyboxFiyatGonder, buyboxFiyatZeminiGetir, type BuyboxGonderimSonucu, type ZeminCevabi } from "./fiyat-eylemleri";

/**
 * ============================================================================
 *  BUYBOX FİYAT KUTUSU — SATIRIN «FİYAT» SÜTUNU (K363 Faz 3-c)
 * ----------------------------------------------------------------------------
 *  «Her ürünün yanına bir kutu koyalım, mevcut Buybox fiyatını yazalım …
 *  hemen hesap ediyor ve altta kâr oranları çıkıyor; sen okey dersen hemen
 *  gönderiyor.» (Melontik örneği: Hesapla → kâr rozeti → Kaydet → onay.)
 *  Yerleşim (kullanıcı kararı 25.10.2026, «frontend zayıf»): tablonun en
 *  sağında kendi sütunu · hızlı doldurma düğmeleri · kâr renkli rozet.
 *  · İlk «Hesapla» (ya da hızlı düğme) zemini sunucudan alır (tek sefer);
 *    sonra her tuşta tarayıcıda yeniden hesaplanır — kartla aynı motor.
 *    Sayfa açılışında hesaplanmaz (kullanıcı kararı: ~170 ürün × birkaç sorgu,
 *    KAS bağlantı kotası).
 *  · Kaydet Trendyol + Hepsiburada, YALNIZ fiyat; onay penceresi eski → yeni
 *    fiyatı ve NET'i gösterir. Zarar/bilinmeyen kâr → onay kutusu
 *    işaretlenmeden geçmez.
 * ============================================================================
 */
export function FiyatKutusu({
  variantId,
  kanal,
  urunAdi,
  durum,
  bizimFiyat,
  buyboxFiyati,
  ikinciFiyat,
  gonderebilir,
}: {
  variantId: string;
  kanal: BuyboxKanali;
  urunAdi: string;
  durum: BuyboxDurumu;
  bizimFiyat: number | null;
  buyboxFiyati: number | null;
  ikinciFiyat: number | null;
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
  const hizli = hizliFiyatlar({ durum, bizimFiyat, buyboxFiyati, ikinciFiyat });
  const para = (n: number) => bicim.para(n, "TRY");

  const hesapla = () => {
    if (zemin?.tamam || yukleniyor) return;
    yukle(async () => setZemin(await buyboxFiyatZeminiGetir(variantId, kanal)));
  };

  /** Kâr cümlesi: tutar + marj, işaretiyle. */
  const karMetni = (s: FiyatSonucu) =>
    s.net2 === null
      ? t("karBilinmiyor")
      : t(s.net2 < 0 ? "rozetZarar" : "rozetKar", { tutar: para(Math.abs(s.net2)), marj: s.marj === null ? "—" : bicim.yuzde(s.marj) });
  const ton = (s: FiyatSonucu) => (s.net2 === null ? "uyari" : s.net2 < 0 ? "olumsuz" : "olumlu");

  /** Küçük karşılaştırma satırı (bizim fiyat · Buybox fiyatı) — yalnız renkli yazı. */
  const kucukKar = (s: FiyatSonucu | null) =>
    s === null ? "—" : <span className={`font-medium tabular-nums ${DURUM_YAZISI[ton(s)]}`}>{karMetni(s)}</span>;

  const gonder = () => {
    if (!fiyatGecerli) return;
    gonderBasla(async () => {
      const s = await buyboxFiyatGonder(variantId, kanal, fiyat, zararOnayi);
      setSonuc(s);
      if (s.sonuc.tamam) router.refresh();
    });
  };
  const onayGerekli = girilen !== null && zararOnayiGerekirMi(girilen);
  const kanalAdi = t(`kanal_${kanal}`);

  return (
    <div className="w-full min-w-0 space-y-2 text-left md:w-72">
      <div className="flex flex-wrap items-center gap-1.5">
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
          className="h-11 w-28 text-right tabular-nums md:h-9"
        />
        {zemin?.tamam ? null : (
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={hesapla} disabled={yukleniyor}>
            <Calculator className="size-4" />
            {yukleniyor ? t("hesaplaniyor") : t("hesapla")}
          </Button>
        )}
        {zemin?.tamam && gonderebilir ? (
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

      {/* Hızlı doldurma — yalnız kutuya yazar; ilk basışta hesabı da açar (İlke #9). */}
      {hizli.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {hizli.map((h) => {
            const secili = fiyatGecerli && Math.abs(fiyat - h.fiyat) < 0.005;
            return (
              <Button
                key={h.anahtar}
                type="button"
                variant={secili ? "secondary" : "outline"}
                aria-pressed={secili}
                className="h-11 px-2 text-xs md:h-7"
                onClick={() => {
                  setFiyatMetni(bicim.sayi(h.fiyat, 2));
                  setSonuc(null);
                  hesapla();
                }}
              >
                {t(`hizli_${h.anahtar}`, { fiyat: para(h.fiyat) })}
              </Button>
            );
          })}
        </div>
      ) : null}

      {fiyat !== null && Number.isNaN(fiyat) ? <p className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{t("fiyatGecersiz")}</p> : null}

      {zemin === null ? null : !zemin.tamam ? (
        <p className={`text-xs ${DURUM_YAZISI.olumsuz}`} role="alert">{t(`zeminHata_${zemin.kod}`)}</p>
      ) : (
        <div className="space-y-1.5">
          {girilen ? (
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-xs">{t("girilenFiyatta")}</p>
              <p className={`inline-flex rounded-md px-2 py-1 text-sm font-semibold tabular-nums ${DURUM_ZEMINI[ton(girilen)]}`}>{karMetni(girilen)}</p>
            </div>
          ) : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
            <dt className="text-muted-foreground">{t("bizimFiyatta")}</dt>
            <dd>{bizimFiyat === null ? "—" : kucukKar(hesap(bizimFiyat))}</dd>
            {buyboxFiyati !== null && buyboxFiyati !== bizimFiyat ? (
              <>
                <dt className="text-muted-foreground">{t("buyboxFiyatinda")}</dt>
                <dd>{kucukKar(hesap(buyboxFiyati))}</dd>
              </>
            ) : null}
          </dl>
          <ul className="text-muted-foreground space-y-0.5 text-xs">
            <li>
              {zemin.zemin.maliyet === null
                ? t("maliyetYok")
                : t("maliyetNotu", { maliyet: para(zemin.zemin.maliyet), parti: zemin.partiSayisi })}
            </li>
            <li>
              {zemin.zemin.kargoTarifesi !== null
                ? t(zemin.kargo.firmaKaynagi === "KANAL" ? "kargoDahilKanal" : "kargoDahil", { firma: zemin.kargo.firma ?? "—", desi: bicim.sayi(zemin.kargo.desi ?? 0, 1) })
                : t(`kargoHaric_${zemin.kargo.sebep ?? "TARIFE_YOK"}`)}
            </li>
            {girilen?.komisyonOrani != null ? <li>{t("komisyonNotu", { oran: bicim.yuzde(girilen.komisyonOrani) })}</li> : null}
          </ul>
        </div>
      )}

      {sonuc === null || onayAcik ? null : <GonderimSonucu sonuc={sonuc} para={para} />}

      <AlertDialog open={onayAcik} onOpenChange={(a) => !gonderiliyor && setOnayAcik(a)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("onayBaslik")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("onayMetni", {
                urun: urunAdi,
                kanal: kanalAdi,
                eski: bizimFiyat === null ? "—" : para(bizimFiyat),
                yeni: fiyatGecerli ? para(fiyat) : "—",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 text-sm">
            {girilen ? (
              <div className="flex flex-wrap items-center gap-2">
                {t("onayKar")}
                <span className={`inline-flex rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ${DURUM_ZEMINI[ton(girilen)]}`}>{karMetni(girilen)}</span>
              </div>
            ) : null}
            <p className="text-muted-foreground text-xs">{t(`onayYalnizFiyat_${kanal}`)}</p>
            {onayGerekli ? (
              <label className={`flex min-h-11 items-start gap-2 text-sm ${DURUM_YAZISI.olumsuz}`}>
                <input type="checkbox" className="mt-1 size-4" checked={zararOnayi} onChange={(e) => setZararOnayi(e.target.checked)} />
                {girilen?.net2 === null ? t("onayKarBilinmiyorKutu") : t("onayZararKutu")}
              </label>
            ) : null}
            {sonuc !== null ? <GonderimSonucu sonuc={sonuc} para={para} /> : null}
          </div>
          <AlertDialogFooter>
            {sonuc?.sonuc.tamam ? (
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

function GonderimSonucu({ sonuc, para }: { sonuc: BuyboxGonderimSonucu; para: (n: number) => string }) {
  const t = useTranslations("Buybox");
  const tTy = useTranslations("KanalGonderim");
  const tHb = useTranslations("KanalGonderimHb");

  if (sonuc.kanal === null) {
    return <p className={`text-xs ${DURUM_YAZISI.olumsuz}`} role="alert">{t(`gonderimHata_${sonuc.sonuc.kod}`)}</p>;
  }

  if (sonuc.kanal === "TY") {
    const s = sonuc.sonuc;
    if (!s.tamam) {
      return (
        <p className={`text-xs ${DURUM_YAZISI.olumsuz}`} role="alert">
          {tTy(TY_HATA[s.kod] ?? "hataUlasilamadi")}
          {s.ayrinti ? ` (${s.ayrinti})` : ""}
        </p>
      );
    }
    const renk = s.batchDurumu === "BASARILI" ? DURUM_YAZISI.olumlu : s.batchDurumu === "BASARISIZ" ? DURUM_YAZISI.olumsuz : DURUM_YAZISI.uyari;
    return (
      <div className="space-y-0.5" role={s.batchDurumu === "BASARISIZ" ? "alert" : "status"}>
        <p className={`text-xs ${renk}`}>{t(`gonderim_${s.batchDurumu}`, { fiyat: s.gonderilenFiyat === null ? "—" : para(s.gonderilenFiyat) })}</p>
        {s.sebepler.map((x, i) => (
          <p key={i} className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{x}</p>
        ))}
      </div>
    );
  }

  /** Hepsiburada — kartın HB penceresiyle aynı hüküm metinleri (ilan geri okunarak doğrulanır). */
  const s = sonuc.sonuc;
  if (!s.tamam) {
    return (
      <p className={`text-xs ${DURUM_YAZISI.olumsuz}`} role="alert">
        {tHb(HB_HATA[s.kod])}
        {s.ayrinti ? ` (${s.ayrinti})` : ""}
      </p>
    );
  }
  const p = s.fiyat;
  if (p === null) return <p className={`text-xs ${DURUM_YAZISI.uyari}`} role="status">{t("gonderimHbSonucYok")}</p>;
  const renk = p.hukum === "DOGRULANDI" ? DURUM_YAZISI.olumlu : p.hukum === "RED" ? DURUM_YAZISI.olumsuz : DURUM_YAZISI.uyari;
  const hbHata = (kod: string) => (HB_HATA_ANAHTARLARI[kod] ? tHb(HB_HATA_ANAHTARLARI[kod]) : kod);
  return (
    <div className="space-y-0.5" role={p.hukum === "RED" ? "alert" : "status"}>
      <p className={`text-xs ${renk}`}>
        {tHb(`hukum_${p.hukum}`, { ad: tHb("parcaFiyat"), deger: para(p.gonderilen) })}
        {p.kanaldaki !== undefined && p.hukum !== "DOGRULANDI" && p.hukum !== "RED" ? " " + tHb("kanaldaki", { deger: p.kanaldaki === null ? "—" : para(p.kanaldaki) }) : ""}
        {p.ayrinti ? ` (${p.ayrinti})` : ""}
      </p>
      {p.hatalar.map((h) => (
        <p key={h} className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{hbHata(h)}</p>
      ))}
      {p.kilitler.map((k, i) => (
        <p key={i} className={`text-xs ${DURUM_YAZISI.olumsuz}`}>
          {hbHata(k.tip)} {tHb("kilitAraligi", { min: k.min === null ? "—" : para(k.min), max: k.max === null ? "—" : para(k.max) })}
        </p>
      ))}
    </div>
  );
}
