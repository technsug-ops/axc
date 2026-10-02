"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Share2, X } from "lucide-react";

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
import { useBicim } from "@/lib/bicim-istemci";
import { DURUM_YAZISI } from "@/lib/renkler";

import {
  hbGonderimOnizle,
  hbStokFiyatGonder,
  n11GonderimOnizle,
  n11StokFiyatGonder,
  tyGonderimOnizle,
  tyGonderimSonucuSorgula,
  tyStokFiyatGonder,
  type HbGonderimOnizlemesi,
  type HbGonderimSonucu,
  type N11GonderimOnizlemesi,
  type N11GonderimSonucu,
  type TyGonderimOnizlemesi,
  type TyGonderimSonucu,
} from "./actions";
import { HATA_ANAHTARI as HB_HATA, ONIZLEME_HATA as HB_ONIZLEME_HATA } from "./hb-gonderim";
import { HATA_ANAHTARI as N11_HATA, ONIZLEME_HATA as N11_ONIZLEME_HATA } from "./n11-gonderim";
import { HATA_ANAHTARI as TY_HATA, ONIZLEME_HATA as TY_ONIZLEME_HATA } from "./ty-gonderim";

/**
 * ============================================================================
 *  STOĞU BAĞLI KANALLARA TEK DÜĞMEYLE GÖNDER — Faz 4'ün son maddesi (01.10.2026)
 *  ⚠ METİNDE KANAL SAYISI YOK (kullanıcı düzeltmesi 02.10.2026): «3 kanala»
 *  yazıyordu; kanal sayısı ürüne ve firmaya göre değişir (anayasa: firma/kanal
 *  yapıya gömülmez). Başarılı her kanal satırı ✓, reddedilen ✗ taşır.
 * ----------------------------------------------------------------------------
 *  Halil kararı 09.09.2026: «stok TEK düğmeyle üç kanala, fiyat kanal başına
 *  AYRI düğmeyle». Bu pencere YALNIZ STOK gönderir — fiyat hiçbir kanala
 *  gitmez (fiyat kanalın kararıdır; tek düğmeyle üç kanala fiyat o kararı
 *  siler).
 *
 *  ⚠ YENİ YAZMA YOLU YOK: üç kanalın KENDİ eylemleri çağrılır (önizleme +
 *  gönderim). İzin kapısı, stoğun sunucuda yeniden çözülmesi, iz ve kanal
 *  kuralları oradan gelir; bu dosya yalnız birleştirir.
 *  ⚠ RAKAM GÖRÜLMEDEN GÖNDERİLMEZ: üç önizleme gelmeden Gönder pasif.
 *  Gönderilemeyen kanal (ilanı yok · canlı kilidi kapalı · anahtar yok)
 *  atlanır ve NEDEN atlandığı kendi satırında yazar (İlke #5) — sessizce
 *  düşmez.
 *  ⚠ Her kanalın sonucu AYRI satır: biri reddedip öteki kabul etmiş olabilir;
 *  tek «başarılı» cümlesi bunu gizlerdi.
 * ============================================================================
 */

const SORGU_ARALIGI_SN = 5;
const SORGU_TAVANI_SN = 120;

type Onizlemeler = {
  ty: TyGonderimOnizlemesi;
  n11: N11GonderimOnizlemesi;
  hb: HbGonderimOnizlemesi;
};

type Sonuclar = {
  ty?: TyGonderimSonucu;
  n11?: N11GonderimSonucu;
  hb?: HbGonderimSonucu;
};

/** Hangi kanallara gidilecek — önizlemeden türer, istemcide tek yerde. */
export function gonderilecekKanallar(o: Onizlemeler): { ty: boolean; n11: boolean; hb: boolean } {
  return {
    ty: o.ty.tamam,
    n11: o.n11.tamam,
    hb: o.hb.tamam && !o.hb.canliKapali,
  };
}

export function UcKanalStokGonderim({ variantId }: { variantId: string }) {
  const t = useTranslations("KanalStokToplu");
  const tTy = useTranslations("KanalGonderim");
  const tN11 = useTranslations("KanalGonderimN11");
  const tHb = useTranslations("KanalGonderimHb");
  const bicim = useBicim();
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [bekliyor, basla] = useTransition();
  const [onizleme, setOnizleme] = useState<Onizlemeler | null>(null);
  const [sonuc, setSonuc] = useState<Sonuclar | null>(null);
  const [sorguSn, setSorguSn] = useState(0);

  useEffect(() => {
    if (!acik || onizleme !== null) return;
    basla(async () => {
      const [ty, n11, hb] = await Promise.all([
        tyGonderimOnizle(variantId),
        n11GonderimOnizle(variantId),
        hbGonderimOnizle(variantId),
      ]);
      setOnizleme({ ty, n11, hb });
    });
  }, [acik, onizleme, variantId]);

  const hedef = onizleme ? gonderilecekKanallar(onizleme) : null;
  const hedefSayisi = hedef ? Number(hedef.ty) + Number(hedef.n11) + Number(hedef.hb) : 0;
  const gonderilebilir = onizleme !== null && hedefSayisi > 0;

  const gonder = () => {
    if (!hedef) return;
    setSorguSn(0);
    setSonuc({});
    basla(async () => {
      /** ⚠ YALNIZ STOK — fiyat alanları her kanalda BOŞ gider («fiyata dokunma»). */
      const [ty, n11, hb] = await Promise.all([
        hedef.ty ? tyStokFiyatGonder(variantId, { stokGonder: true, fiyat: null }) : undefined,
        hedef.n11 ? n11StokFiyatGonder(variantId, { stokGonder: true, listeFiyati: null, satisFiyati: null }) : undefined,
        hedef.hb ? hbStokFiyatGonder(variantId, { stokGonder: true, fiyat: null }) : undefined,
      ]);
      setSonuc({ ty, n11, hb });
      router.refresh();
    });
  };

  /** TY 12 sn'de bitirmeyebilir (ölçüldü) — TY penceresiyle AYNI sorma döngüsü. */
  const tySonuc = sonuc?.ty;
  const tyBekleniyor =
    acik &&
    tySonuc?.tamam === true &&
    (tySonuc.batchDurumu === "ISLEMDE" || tySonuc.batchDurumu === "SORGULANAMADI") &&
    sorguSn < SORGU_TAVANI_SN;
  useEffect(() => {
    if (!tyBekleniyor || tySonuc?.tamam !== true) return;
    const id = tySonuc.batchRequestId;
    const zamanlayici = setTimeout(async () => {
      const r = await tyGonderimSonucuSorgula(variantId, id);
      if (r.tamam) {
        setSonuc((s) =>
          s?.ty?.tamam ? { ...s, ty: { ...s.ty, batchDurumu: r.batchDurumu, sebepler: r.sebepler } } : s,
        );
      }
      setSorguSn((n) => n + SORGU_ARALIGI_SN);
    }, SORGU_ARALIGI_SN * 1000);
    return () => clearTimeout(zamanlayici);
  }, [tyBekleniyor, tySonuc, sorguSn, variantId]);

  const kanalAdet = (n: number | null) => (n === null ? t("olculmedi") : bicim.sayi(n));
  const satir = (renk: string, metin: string, alt?: string[]) => (
    <div className="space-y-0.5">
      <p className={`flex items-start gap-1.5 text-sm ${renk}`} role={renk === DURUM_YAZISI.olumsuz ? "alert" : "status"}>
        {/* Simge rengin TÜREVİ — ayrı bir karar yok: başarı ✓, red ✗. */}
        {renk === DURUM_YAZISI.olumlu ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
        {renk === DURUM_YAZISI.olumsuz ? <X className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
        <span>{metin}</span>
      </p>
      {(alt ?? []).map((a, i) => (
        <p key={i} className={`text-xs ${DURUM_YAZISI.olumsuz}`}>
          {a}
        </p>
      ))}
    </div>
  );

  /* ── Önizleme satırları (gönderimden ÖNCE) ── */
  const onizlemeSatirlari = (o: Onizlemeler) => [
    o.ty.tamam
      ? satir(DURUM_YAZISI.notr, t("onizleme", { kanal: "Trendyol", stok: bicim.sayi(o.ty.selioraStok), kanalda: kanalAdet(o.ty.kanalAdet) }))
      : satir(DURUM_YAZISI.uyari, t("atlandi", { kanal: "Trendyol", sebep: tTy(TY_ONIZLEME_HATA[o.ty.kod]) })),
    o.n11.tamam
      ? satir(DURUM_YAZISI.notr, t("onizleme", { kanal: "N11", stok: bicim.sayi(o.n11.selioraStok), kanalda: kanalAdet(o.n11.kanalAdet) }))
      : satir(DURUM_YAZISI.uyari, t("atlandi", { kanal: "N11", sebep: tN11(N11_ONIZLEME_HATA[o.n11.kod]) })),
    !o.hb.tamam
      ? satir(DURUM_YAZISI.uyari, t("atlandi", { kanal: "Hepsiburada", sebep: tHb(HB_ONIZLEME_HATA[o.hb.kod]) }))
      : o.hb.canliKapali
        ? satir(DURUM_YAZISI.uyari, t("atlandi", { kanal: "Hepsiburada", sebep: tHb("canliKapali") }))
        : satir(DURUM_YAZISI.notr, t("onizleme", { kanal: "Hepsiburada", stok: bicim.sayi(o.hb.selioraStok), kanalda: kanalAdet(o.hb.kanalAdet) })),
  ];

  /* ── Sonuç satırları (gönderimden SONRA) ── */
  const tySatiri = (s: TyGonderimSonucu | undefined) => {
    if (!s) return satir(DURUM_YAZISI.notr, t("gonderilmedi", { kanal: "Trendyol" }));
    if (!s.tamam) return satir(DURUM_YAZISI.olumsuz, t("hata", { kanal: "Trendyol", sebep: tTy(TY_HATA[s.kod]) + (s.ayrinti ? ` (${s.ayrinti})` : "") }));
    const stok = s.gonderilenStok === null ? "—" : bicim.sayi(s.gonderilenStok);
    if (s.batchDurumu === "BASARILI") return satir(DURUM_YAZISI.olumlu, t("tyBasarili", { stok }));
    if (s.batchDurumu === "BASARISIZ") return satir(DURUM_YAZISI.olumsuz, t("tyReddetti", { stok }), s.sebepler);
    return tyBekleniyor
      ? satir(DURUM_YAZISI.uyari, t("tyIsliyor", { stok, sn: bicim.sayi(12 + sorguSn) }))
      : satir(DURUM_YAZISI.uyari, t("tyZamanAsimi", { stok }));
  };
  const n11Satiri = (s: N11GonderimSonucu | undefined) => {
    if (!s) return satir(DURUM_YAZISI.notr, t("gonderilmedi", { kanal: "N11" }));
    if (!s.tamam) return satir(DURUM_YAZISI.olumsuz, t("hata", { kanal: "N11", sebep: tN11(N11_HATA[s.kod]) + (s.ayrinti ? ` (${s.ayrinti})` : "") }));
    return satir(DURUM_YAZISI.uyari, t("n11Alindi", { stok: s.gonderilenStok === null ? "—" : bicim.sayi(s.gonderilenStok) }));
  };
  const hbSatiri = (s: HbGonderimSonucu | undefined) => {
    if (!s) return satir(DURUM_YAZISI.notr, t("gonderilmedi", { kanal: "Hepsiburada" }));
    if (!s.tamam) return satir(DURUM_YAZISI.olumsuz, t("hata", { kanal: "Hepsiburada", sebep: tHb(HB_HATA[s.kod]) + (s.ayrinti ? ` (${s.ayrinti})` : "") }));
    const p = s.stok;
    if (!p) return satir(DURUM_YAZISI.notr, t("gonderilmedi", { kanal: "Hepsiburada" }));
    const renk = p.hukum === "DOGRULANDI" ? DURUM_YAZISI.olumlu : p.hukum === "RED" ? DURUM_YAZISI.olumsuz : DURUM_YAZISI.uyari;
    return satir(renk, "Hepsiburada · " + tHb(`hukum_${p.hukum}`, { ad: tHb("parcaStok"), deger: bicim.sayi(p.gonderilen) }) + (p.ayrinti ? ` (${p.ayrinti})` : ""), p.hatalar);
  };

  return (
    <AlertDialog
      open={acik}
      onOpenChange={(a) => {
        setAcik(a);
        if (!a) {
          setOnizleme(null);
          setSonuc(null);
          setSorguSn(0);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-11 md:h-8">
          <Share2 className="size-4" />
          {t("dugme")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("baslik")}</AlertDialogTitle>
          <AlertDialogDescription>{sonuc === null ? t("aciklama") : null}</AlertDialogDescription>
        </AlertDialogHeader>

        {sonuc !== null ? (
          bekliyor ? (
            <p className="text-sm" role="status">
              {t("gonderiliyorUzun")}
            </p>
          ) : (
            <div className="space-y-2">
              {tySatiri(sonuc.ty)}
              {n11Satiri(sonuc.n11)}
              {hbSatiri(sonuc.hb)}
            </div>
          )
        ) : onizleme === null ? (
          <p className="text-sm" role="status">
            {t("yukleniyor")}
          </p>
        ) : (
          <div className="space-y-2">
            {onizlemeSatirlari(onizleme)}
            {hedefSayisi === 0 ? (
              <p className={`text-sm ${DURUM_YAZISI.olumsuz}`} role="alert">
                {t("hicKanalYok")}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">{t("fiyatNotu")}</p>
            )}
          </div>
        )}

        <AlertDialogFooter>
          {sonuc !== null && !bekliyor ? (
            <AlertDialogCancel>{t("kapat")}</AlertDialogCancel>
          ) : (
            <>
              <AlertDialogCancel disabled={bekliyor}>{t("vazgec")}</AlertDialogCancel>
              <Button type="button" disabled={bekliyor || !gonderilebilir} onClick={gonder}>
                {bekliyor && sonuc !== null ? t("gonderiliyor") : t("gonderOnayla", { adet: bicim.sayi(hedefSayisi) })}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
