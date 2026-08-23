"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Ban, Undo2 } from "lucide-react";

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  analizSonucuIstenirMi,
  gecisOnayIster,
  itirazGerekcesiGerekliMi,
} from "@/lib/iade/bildirim";

import { bildirimDurumuGuncelle } from "./bildirim-actions";

import type { NoticeStatus } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  BİLDİRİM DURUM DÜĞMELERİ — KAPALI OLAN PASİF VE SEBEBİ YAZILI
 * ----------------------------------------------------------------------------
 *  Mimar kuralı 14.08.2026: kapalı geçişler GİZLENMEZ, PASİF görünür ve
 *  NEDENİ ekranda yazar. Gizlemek "sistem bozuk" hissi verir; sebepsiz pasif
 *  düğme "neden basamıyorum" sorusunu doğurur. İkisi de sessiz başarısızlık
 *  sayılır (İlke #5).
 *
 *  İKİ ÖRNEK BİLEREK SABİT:
 *    BEKLENIYOR   → "İadeyi işle" PASİF: mal gelmeden iade işlenemez.
 *    ITIRAZ_KABUL → "İadeyi işle" PASİF: itiraz kazanıldı, ürün müşteride.
 *
 *  KURAL TEK KAYNAKTAN GELİR (`lib/iade/bildirim.ts`): düğmeyi çizen de,
 *  sunucudaki action da aynı fonksiyonu çağırır. Ekranda pasif göstermek
 *  yetki değildir — istek elle kurulabilir.
 * ============================================================================
 */

export type DurumSecenegi = {
  hedef: NoticeStatus;
  etiket: string;
  /** Açık mı? Kapalıysa sebep zorunlu. */
  acik: boolean;
  /** Pasifse ekranda/ipuçunda yazan sebep. */
  sebep?: string;
};

export function BildirimDurumu({
  bildirimId,
  mevcutDurum,
  secenekler,
  iadeIsle,
  itirazGerekceleri,
  analizSonuclari,
}: {
  bildirimId: string;
  /** Kaydın ŞU ANKİ durumu — analiz sonucu buna göre sorulur. */
  mevcutDurum: NoticeStatus;
  secenekler: DurumSecenegi[];
  /** Etiketler sunucudan gelir; ham enum ekranda görünmez. */
  itirazGerekceleri: { deger: string; etiket: string }[];
  analizSonuclari: { deger: string; etiket: string }[];
  /**
   * "İadeyi işle" — AŞAMA B'ye geçiş. Açıksa adres verilir (ön-dolu iade
   * formu), kapalıysa sebep.
   */
  iadeIsle: { acik: boolean; adres?: string; sebep: string; etiket: string };
}) {
  const t = useTranslations("Bildirim2");
  const ortak = useTranslations("Ortak");
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [gerekce, setGerekce] = useState("");
  const [analiz, setAnaliz] = useState("");

  const git = (hedef: NoticeStatus) => {
    setHata(null);
    basla(async () => {
      const sonuc = await bildirimDurumuGuncelle(bildirimId, hedef, undefined, {
        itirazGerekcesi: gerekce,
        analizSonucu: analiz,
      });
      if (sonuc.hata) setHata(sonuc.hata);
      else {
        setGerekce("");
        setAnaliz("");
        router.refresh();
      }
    });
  };

  /**
   * ⚠ KURAL SAF MODÜLDEN — ekran da sunucu da AYNI fonksiyonu çağırıyor.
   * İki yerde iki ölçüt olsaydı, ekran sormadan gönderir ve sunucu sessizce
   * reddederdi; kullanıcı "kaydetmiyor" derdi ve sebebi görünmezdi.
   * (23.08.2026'da iade gerekçesinde tam bu yaşandı.)
   */
  const analizSorulur = analizSonucuIstenirMi(mevcutDurum);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* --- AŞAMA B KAPISI: iadeyi işle --- */}
        {iadeIsle.acik && iadeIsle.adres ? (
          <Button size="sm" className="h-11 md:h-8" asChild>
            <Link href={iadeIsle.adres}>
              <Undo2 className="size-4" />
              {iadeIsle.etiket}
            </Link>
          </Button>
        ) : (
          /**
           * PASİF DÜĞME + SEBEP. `disabled` düğme ipucu (tooltip) tetiklemez,
           * bu yüzden sarmalayıcı span'e sarılıyor — sebep hem ipuçunda hem
           * altta yazılı duruyor ki dokunmatik cihazda da okunabilsin.
           */
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button size="sm" className="h-11 md:h-8" variant="outline" disabled>
                  <Ban className="size-4" />
                  {iadeIsle.etiket}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{iadeIsle.sebep}</TooltipContent>
          </Tooltip>
        )}

        {/* --- DURUM GEÇİŞLERİ --- */}
        {secenekler.map((s) =>
          s.acik ? (
            /**
             * ONAY ZORUNLU (İlke #6). Bu durum makinesinde hiçbir geçiş geri
             * alınamaz; kullanıcı 14.08.2026'da yanlışlıkla "İtiraz açıldı"ya
             * bastı ve bildirim tek tıkla itiraz dalına düştü, MAL_GELDI'ye
             * dönüş olmadığı için akış kilitlendi. Kural saf fonksiyonda:
             * `gecisOnayIster`.
             */
            gecisOnayIster(s.hedef) ? (
              <AlertDialog key={s.hedef}>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 md:h-8"
                    disabled={bekliyor}
                  >
                    <ArrowRight className="size-4" />
                    {s.etiket}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{s.etiket}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("gecisOnayAciklama")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  {/*
                    RET GEREKÇESİ — ZORUNLU (K31 ④). Pazaryeri de gerekçesiz
                    itiraz kurdurmuyor; bizim kaydımızda kurulabilseydi
                    defterimiz pazaryerinden daha az şey bilirdi.
                    ⚠ Ve gerekçe MALİYET tarafını belirliyor: "Değişim"
                    seçilirse kargo her kanalda satıcıya ait, satıcı haklı
                    bulunduğunda Trendyol yansıtmıyor (docs §5).
                  */}
                  {itirazGerekcesiGerekliMi(s.hedef) ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {t("itirazGerekcesiBaslik")} *
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t("itirazGerekcesiAciklama")}
                      </p>
                      <Secim
                        deger={gerekce}
                        onDegisim={setGerekce}
                        ipucu={t("itirazGerekcesiSec")}
                        secenekler={itirazGerekceleri}
                      />
                    </div>
                  ) : null}

                  {/* ANALİZ SONUCU — sorulur, boş geçilebilir. */}
                  {analizSorulur ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {t("analizSonucuBaslik")}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t("analizSonucuAciklama")}
                      </p>
                      <Secim
                        deger={analiz}
                        onDegisim={setAnaliz}
                        ipucu={t("analizSonucuSec")}
                        secenekler={analizSonuclari}
                      />
                    </div>
                  ) : null}

                  <AlertDialogFooter>
                    <AlertDialogCancel>{ortak("vazgec")}</AlertDialogCancel>
                    <Button
                      type="button"
                      onClick={() => git(s.hedef)}
                      /*
                        ⚠ SEBEP EKRANDA YAZILI (İlke #5): kilitli düğme sessiz
                        kalmaz — gerekçe seçilmediği için basılamadığı
                        yukarıdaki zorunlu alandan okunuyor.
                      */
                      disabled={
                        bekliyor ||
                        (itirazGerekcesiGerekliMi(s.hedef) && gerekce === "")
                      }
                    >
                      {t("gecisOnayla")}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button
                key={s.hedef}
                size="sm"
                variant="outline"
                className="h-11 md:h-8"
                disabled={bekliyor}
                onClick={() => git(s.hedef)}
              >
                <ArrowRight className="size-4" />
                {s.etiket}
              </Button>
            )
          ) : (
            <Tooltip key={s.hedef}>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button size="sm" variant="ghost" className="h-11 md:h-8" disabled>
                    {s.etiket}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{s.sebep ?? t("gecisIzinliDegil")}</TooltipContent>
            </Tooltip>
          ),
        )}
      </div>

      {/* SEBEPLER ALTTA DA YAZILI: dokunmatik cihazda ipucu görünmez. */}
      {!iadeIsle.acik ? (
        <p className="text-muted-foreground text-xs">{iadeIsle.sebep}</p>
      ) : null}

      {hata ? (
        <p role="alert" className="text-destructive text-xs">
          {hata}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Küçük seçim kutusu — iki yerde kullanıldığı için ayrı.
 *
 * ⚠ HAM ENUM EKRANA ÇIKMAZ: etiketler sunucudan, exhaustive `Record`tan
 * gelen sözlükle çözülüp geliyor. Burada `deger` yalnız gönderilecek
 * anahtardır, gösterilen şey `etiket`tir.
 */
function Secim({
  deger,
  onDegisim,
  ipucu,
  secenekler,
}: {
  deger: string;
  onDegisim: (yeni: string) => void;
  ipucu: string;
  secenekler: { deger: string; etiket: string }[];
}) {
  return (
    <select
      value={deger}
      onChange={(e) => onDegisim(e.target.value)}
      className="border-input bg-background h-11 w-full rounded-md border px-2 text-sm md:h-9"
    >
      <option value="">{ipucu}</option>
      {secenekler.map((s) => (
        <option key={s.deger} value={s.deger}>
          {s.etiket}
        </option>
      ))}
    </select>
  );
}
