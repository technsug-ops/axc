"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Truck } from "lucide-react";

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
import { DURUM_YAZISI } from "@/lib/renkler";

import { topluKargoyaVerildi } from "./actions";

/**
 * ============================================================================
 *  TOPLU "KARGOYA VERİLDİ" — EKRANDAKİLERİ TEK TIKLA İŞARETLE
 * ----------------------------------------------------------------------------
 *  Kullanıcı 24.08.2026: _"siparişleri kargoya verildi işaretle tuşu koy,
 *  hepsini birden kargoya verildi işaretlesin."_
 *
 *  ⚠ "HEPSİ" TEHLİKELİ BİR KELİME — VE BURADA DARALTILDI.
 *  Ekranda süzgeç "Tüm Kargo" iken 125 satış listeleniyor ve çoğu ZATEN
 *  kargoya verilmiş. Düğme "hepsini" işaretleseydi, verilmiş siparişlerin
 *  kargo TARİHİ bugüne kayardı — panelin "hangi gün kargoladım" sayacı
 *  bozulur ve geri alınması tek tek elle olurdu.
 *
 *  Bu yüzden düğme YALNIZ **ekrandaki, henüz kargoya verilmemiş, iptal
 *  edilmemiş** siparişleri işaretler ve KAÇ TANE olduğunu düğmenin
 *  üstünde yazar. Sunucu aynı süzgeci BİR KEZ DAHA uygular — istemciden
 *  gelen listeye güvenilmez.
 *
 *  ⚠ SÜZGECE BAĞLI, "TÜM DEFTER"E DEĞİL (İlke #15'in kardeşi): ekranda ne
 *  varsa onun üzerinde çalışır. Kullanıcı `Kargo: bekleyenler` +
 *  `Paketleme: Paketlendi` süzerse tam o kümeyi işaretler.
 *
 *  ⚠ YIKICI EYLEM = ONAY (İlke #6): geri alma tek tek satırdan yapılır,
 *  toplu geri alma YOK. Bu yüzden onay diyaloğu sayıyı ADIYLA söyler.
 *
 *  ═══ 27.08.2026 — KÜME BİR KEZ DAHA DARALDI (K60) ═══
 *
 *  ⛔ İÇE AKTARILMIŞ SİPARİŞLER KÜMEDE DEĞİL. Vaka: görev kutusunda
 *  kapatılamayan 5192 maddelik bir yığın vardı (içe aktarılan geçmiş
 *  satışların `shippedAt`i yok) ve bu düğme onu kapatmanın tek görünen
 *  yoluydu. İki tıkla **5601 siparişe** bugünün tarihi yazıldı — sistemin
 *  HİÇ BİLMEDİĞİ bir tarih. Günlük operasyon grafiği tek günde 5192 paketlik
 *  sahte bir gün gösterdi.
 *
 *  ⚠ HATA KULLANICIDA DEĞİLDİ. Kutuya kapatılamayan madde koyan, kapatma
 *  yolunu da GÜVENLİ hâlde koymak zorundadır: düğme uyarmadı, liste
 *  sayfalanmıyordu, geri alma yolu yoktu.
 *
 *  ⚠ VE ONAY METNİ ARTIK SOMUT: hangi TARİHİN yazılacağını rakamla söylüyor
 *  ve o tarih gerçek değilse ne olacağını yazıyor. "Bugünün tarihiyle"
 *  demek yetmiyordu — okuyan onu bir ayrıntı sanıyor.
 * ============================================================================
 */
export function TopluKargo({
  kimlikler,
  iceAktarilanSayisi,
}: {
  kimlikler: string[];
  /** Kümeden ÇIKARILAN içe aktarılmış sipariş sayısı — sessizce elenmez. */
  iceAktarilanSayisi: number;
}) {
  const t = useTranslations("Satis");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [bekliyor, basla] = useTransition();
  const [mesaj, setMesaj] = useState<{ hata?: string; basari?: string } | null>(
    null,
  );

  const sayi = kimlikler.length;
  /**
   * ⚠ TARİH SUNUCUYLA AYNI GÖVDEDEN GELMİYOR — ve gelemez, bu bir istemci
   * bileşeni. Bu yüzden İSTANBUL günü burada da AÇIKÇA kuruluyor;
   * `toLocaleDateString()` çıplak çağrılsaydı Almanya'daki tarayıcı gece
   * yarısından sonra bir gün geriye yazardı ve onay metni sunucunun
   * yazacağı tarihten FARKLI bir tarih gösterirdi.
   */
  const bugun = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  /**
   * ⚠ SIFIRDA DÜĞME ÇİZİLİR AMA KİLİTLİ, VE NİYE KİLİTLİ YAZAR (İlke #5).
   * Hiç çizmemek, kullanıcıya "böyle bir şey yok" derdi; oysa var, sadece
   * bu süzgeçte işaretlenecek sipariş kalmamış.
   */
  if (sayi === 0) {
    return (
      <div className="text-muted-foreground text-xs">
        {t("topluKargoBos")}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <AlertDialog open={acik} onOpenChange={setAcik}>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="secondary" className="h-11 md:h-9">
            <Truck className="size-4" />
            {t("topluKargoDugme", { sayi })}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("topluKargoBaslik")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("topluKargoAciklama", { sayi, tarih: bugun })}
            </AlertDialogDescription>
            {iceAktarilanSayisi > 0 ? (
              /**
               * ⛔ ELENEN KÜME SESSİZCE ELENMEZ (İlke #5). Kullanıcı
               * "5192 bekleyen" görüp düğmede "12" yazınca aradaki farkı
               * SORAR; cevabı ekranda durmalı, yoksa sistem bozuk sanılır.
               */
              <AlertDialogDescription className="mt-2 font-medium">
                {t("topluKargoIceAktarilan", { sayi: iceAktarilanSayisi })}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
            <Button
              type="button"
              className="h-11 md:h-9"
              disabled={bekliyor}
              onClick={() => {
                setMesaj(null);
                basla(async () => {
                  const sonuc = await topluKargoyaVerildi(kimlikler);
                  if (sonuc.hata) {
                    setMesaj({ hata: sonuc.hata });
                    return;
                  }
                  setAcik(false);
                  setMesaj({
                    basari: t("topluKargoSonuc", { sayi: sonuc.isaretlenen ?? 0 }),
                  });
                  router.refresh();
                });
              }}
            >
              <Truck className="size-4" />
              {bekliyor ? ortak("kaydediliyor") : t("topluKargoOnayla")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {mesaj?.basari ? (
        <p className={`text-xs font-medium ${DURUM_YAZISI.olumlu}`} role="status">
          {mesaj.basari}
        </p>
      ) : null}
      {mesaj?.hata ? (
        <p className="text-destructive text-xs font-medium" role="alert">
          {mesaj.hata}
        </p>
      ) : null}
    </div>
  );
}
