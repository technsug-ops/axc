"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { DurumRozeti } from "@/components/durum-rozeti";
import { Button } from "@/components/ui/button";
import { useBicim } from "@/lib/bicim-istemci";

import { odemeTersAl } from "./eylemler";

/**
 * Kaydedilmiş bir ödeme satırı + "ters al" eylemi.
 *
 * SİLME YOK. Yanlış kayıt ters işaretli bir satırla nötrlenir ve İKİSİ DE
 * defterde kalır — stok defterindeki ADJUSTMENT ilkesinin aynısı. Ters
 * kayıt ekranda `ters kayıt` etiketiyle görünür ki geçmiş okunabilir olsun.
 */
export function OdemeSatiri({
  odemeId,
  odenen,
  faiz,
  tarih,
  paraBirimi,
  tersMi,
  tersAlinmisMi,
  yetkiVar,
}: {
  odemeId: string;
  odenen: number;
  faiz: number;
  tarih: string;
  paraBirimi: "TRY" | "EUR";
  tersMi: boolean;
  tersAlinmisMi: boolean;
  /** `satis.kar.gor` — ters almak da para yazan bir işlem (K19). */
  yetkiVar: boolean;
}) {
  const t = useTranslations("KartOdeme");
  const ortak = useTranslations("Ortak");
  const bicim = useBicim();
  const router = useRouter();
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  const para = (n: number) => bicim.para(n, paraBirimi);

  /**
   * ════════════════════════════════════════════════════════════════════
   *  İPTAL EDİLMİŞ ÖDEME, İPTAL EDİLMİŞ GÖRÜNÜR (16.08.2026)
   * --------------------------------------------------------------------
   *  Kullanıcı: "ters kayıt yapmışım, sistem sıfırlamamış."
   *
   *  Sistem SIFIRLAMIŞTI — net etki sıfırdı, kalan doğru hesaplanıyordu.
   *  Ama ters ALINMIŞ asıl satır hâlâ canlı bir ödeme gibi duruyordu:
   *  düz yazı, tam renk, hiçbir işaret. Ekranda üç satır vardı ve ikisi
   *  birbirini götürüyordu; bunu görmek için okuyup kafadan toplamak
   *  gerekiyordu.
   *
   *  Defter kaydı SİLİNMEZ (StockMovement ilkesi) — silinmemeli de. Ama
   *  "kayıt duruyor" ile "kayıt geçerli" ayrı şeylerdir; ekranın bunu
   *  söylemesi gerekir. Üstü çizili + soluk + "iptal edildi" etiketi.
   * ════════════════════════════════════════════════════════════════════
   */
  const iptal = tersAlinmisMi;

  return (
    <div
      className={`flex min-w-0 flex-wrap items-center justify-between gap-2 text-sm ${
        iptal ? "opacity-60" : ""
      }`}
    >
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-muted-foreground">{tarih}</span>
        <span className={`tabular-nums ${iptal ? "line-through" : ""}`}>
          {para(odenen)}
        </span>
        {faiz !== 0 ? (
          <span
            className={`text-muted-foreground tabular-nums text-xs ${
              iptal ? "line-through" : ""
            }`}
          >
            {t("faiz")} {para(faiz)}
          </span>
        ) : null}
        {tersMi ? (
          <DurumRozeti durum="notr" isaretsiz>
            {t("tersKayitEtiketi")}
          </DurumRozeti>
        ) : null}
        {/* Renk ve çizgi tek başına yetmez — kelimeyle de söylenir. */}
        {iptal ? (
          <DurumRozeti durum="notr" isaretsiz>
            {t("iptalEdildi")}
          </DurumRozeti>
        ) : null}
      </span>

      {/* Ters kaydın tersi alınmaz; zaten ters alınmış kayıt da tekrarlanmaz. */}
      {yetkiVar && !tersMi && !tersAlinmisMi ? (
        <Button
          size="sm"
          variant="outline"
          className="h-11 md:h-8"
          disabled={bekliyor}
          onClick={() =>
            basla(async () => {
              setHata(null);
              const sonuc = await odemeTersAl(odemeId);
              if (sonuc.tamam) router.refresh();
              else setHata(sonuc.hata);
            })
          }
        >
          {bekliyor ? ortak("kaydediliyor") : t("tersAl")}
        </Button>
      ) : null}

      {hata ? (
        <DurumRozeti durum="olumsuz">{hata}</DurumRozeti>
      ) : null}
    </div>
  );
}
