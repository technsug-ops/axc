"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Ban } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { IPTAL_GEREKCESI_ENAZ } from "@/lib/iade/bildirim";
import { DURUM_YAZISI } from "@/lib/renkler";

import { kapanmisBildirimiIptalEt } from "./bildirim-actions";

/**
 * ============================================================================
 *  KAPANMIŞ BİLDİRİMİ İPTAL ET (K39, 24.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE VAR: `11473322212` üstünde test denemelerinden bildirimler
 *  birikti. `KAPANDI`nın hiçbir çıkışı yoktu, yani düzeltilemiyorlardı ve
 *  test artığının kırmızı _"ayrılan ürün düşülmedi"_ uyarısı GERÇEK
 *  uyarının değerini düşürüyordu — sönmeyen uyarı okunmaz olur.
 *
 *  ⚠ "TEST" DİYE İŞARETLENMEZ (mimar kararı): ikinci bir doğruluk kanalı
 *  açılmıyor. Durum tek dildir; kaydın gerçeği değiştiyse DURUMU değişir.
 *
 *  ⚠ GEREKÇE ZORUNLU ve serbest metin. Kapalı bir listeden seçtirmek,
 *  bugün bilmediğimiz sebepleri "diğer"e sıkıştırırdı; bu geçiş nadir ve
 *  her vakası kendi hikâyesini taşıyor. Üç ay sonra "bunu neden iptal
 *  ettik" sorusunun cevabı bu metindir.
 *
 *  ⚠ YIKICI EYLEM = ONAY (İlke #6): diyalog açılır, gerekçe yazılmadan
 *  düğme basılmaz ve NİYE basılmadığı ekranda yazar (İlke #5).
 * ============================================================================
 */
export function BildirimIptal({ bildirimId }: { bildirimId: string }) {
  const t = useTranslations("Bildirim2");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [gerekce, setGerekce] = useState("");
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  /**
   * ⚠ KURAL İSTEMCİDE TEKRAR YAZILMAZ, SUNUCUDAN OKUNUR. Eşiği burada
   * elle "10" yazsaydık iki gerçek doğar ve biri gün gelip ötekinden
   * ayrışırdı. Sunucu yine de kendi kontrolünü yapıyor — bu yalnız
   * düğmeyi kilitlemek için.
   */
  const yeterli = gerekce.trim().length >= IPTAL_GEREKCESI_ENAZ;

  const iptalEt = () => {
    setHata(null);
    basla(async () => {
      const sonuc = await kapanmisBildirimiIptalEt(bildirimId, gerekce);
      if (sonuc.hata) setHata(sonuc.hata);
      else {
        setAcik(false);
        setGerekce("");
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={acik} onOpenChange={setAcik}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-11 md:h-8"
        >
          <Ban className="size-4" />
          {t("iptalEt")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("iptalBaslik")}</DialogTitle>
          <DialogDescription>{t("iptalAciklama")}</DialogDescription>
        </DialogHeader>

        <label className="block space-y-1">
          <span className="text-sm font-medium">{t("iptalGerekcesi")}</span>
          <Textarea
            value={gerekce}
            onChange={(e) => setGerekce(e.target.value)}
            placeholder={t("iptalGerekcesiIpucu")}
            rows={3}
          />
        </label>

        {/* KİLİTLİ DÜĞME SESSİZ KALMAZ (İlke #5): neden basılmadığı yazar. */}
        {!yeterli ? (
          <p className="text-muted-foreground text-xs">
            {t("iptalGerekcesiKisa", { enaz: IPTAL_GEREKCESI_ENAZ })}
          </p>
        ) : null}
        {hata ? (
          <p className={`text-xs font-medium ${DURUM_YAZISI.olumsuz}`} role="alert">
            {hata}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            className="h-11 md:h-9"
            disabled={!yeterli || bekliyor}
            onClick={iptalEt}
          >
            <Ban className="size-4" />
            {bekliyor ? ortak("kaydediliyor") : t("iptalOnayla")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
