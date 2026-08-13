"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Ban, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  secenekler,
  iadeIsle,
}: {
  bildirimId: string;
  secenekler: DurumSecenegi[];
  /**
   * "İadeyi işle" — AŞAMA B'ye geçiş. Açıksa adres verilir (ön-dolu iade
   * formu), kapalıysa sebep.
   */
  iadeIsle: { acik: boolean; adres?: string; sebep: string; etiket: string };
}) {
  const t = useTranslations("Bildirim2");
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  const git = (hedef: NoticeStatus) => {
    setHata(null);
    basla(async () => {
      const sonuc = await bildirimDurumuGuncelle(bildirimId, hedef);
      if (sonuc.hata) setHata(sonuc.hata);
      else router.refresh();
    });
  };

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
