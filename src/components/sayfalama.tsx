import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { sayfaAdresi, type Sayfalama } from "@/lib/sayfalama";

/**
 * ============================================================================
 *  SAYFALAMA ÇUBUĞU
 * ----------------------------------------------------------------------------
 *  Bütün liste ekranlarında AYNI görünür ve AYNI çalışır (İlke #10).
 *
 *  TOPLAM SAYI HER ZAMAN YAZAR (kullanıcı kararı 12.08.2026):
 *  "1054 kayıt · sayfa 2/22". Yalnız ileri/geri okları olsaydı kullanıcı
 *  kaç kaydı olduğunu ve nerede durduğunu bilemez, evreni kaybederdi.
 *
 *  Düğmeler BAĞLANTIDIR — istemci JavaScript'i gerektirmez, yeni sekmede
 *  açılabilir, tarayıcı geçmişi doğru çalışır.
 *
 *  Tek sayfalık listede çubuk çizilmez ama SAYI YİNE DE görünür: "37 kayıt"
 *  bilgisi kaybolmamalı.
 * ============================================================================
 */
export async function SayfalamaCubugu({
  sayfalama,
  yol,
  parametreler,
}: {
  sayfalama: Sayfalama;
  /** Ekranın kendi yolu — "/urunler" gibi. */
  yol: string;
  /** Adresteki mevcut süzgeçler; sayfa değişince korunur. */
  parametreler: Record<string, string | undefined>;
}) {
  const t = await getTranslations("Sayfalama");

  const { sayfa, sonSayfa, toplam, oncekiVar, sonrakiVar } = sayfalama;

  const ozet =
    sonSayfa === 1
      ? t("toplamKayit", { toplam })
      : t("ozet", { toplam, sayfa, sonSayfa });

  if (sonSayfa === 1) {
    return <p className="text-muted-foreground text-sm">{ozet}</p>;
  }

  /** Dokunma hedefi telefonda 44px (İlke #8). */
  const dugme = (
    hedef: number,
    etiket: string,
    Ikon: typeof ChevronLeft,
    etkin: boolean,
  ) =>
    etkin ? (
      <Button asChild variant="outline" size="icon" className="size-11 md:size-9">
        <Link href={sayfaAdresi(yol, parametreler, hedef)} aria-label={etiket}>
          <Ikon />
        </Link>
      </Button>
    ) : (
      <Button
        variant="outline"
        size="icon"
        className="size-11 md:size-9"
        disabled
        aria-label={etiket}
      >
        <Ikon />
      </Button>
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">{ozet}</p>
      <div className="flex items-center gap-2">
        {dugme(1, t("ilkSayfa"), ChevronFirst, oncekiVar)}
        {dugme(sayfa - 1, t("oncekiSayfa"), ChevronLeft, oncekiVar)}
        {dugme(sayfa + 1, t("sonrakiSayfa"), ChevronRight, sonrakiVar)}
        {dugme(sonSayfa, t("sonSayfa"), ChevronLast, sonrakiVar)}
      </div>
    </div>
  );
}
