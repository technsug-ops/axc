import { getTranslations } from "next-intl/server";

import { DurumRozeti } from "@/components/durum-rozeti";
import { bicimlendirici } from "@/lib/bicim";
import { karDurumu } from "@/lib/renkler";

import type { Currency, ProfitStatus } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  NET KÂR GÖSTERİMİ — LİSTE VE DETAY ORTAK
 * ----------------------------------------------------------------------------
 *  Hesaplanamayan kâr BOŞ ya da SIFIR gösterilmez; NEDENİ kısa bir rozetle
 *  yazılır (Kullanıcı Kolaylığı #5 — sessiz başarısızlık yasak). Böylece
 *  listede "0,00" görüp "bu satış kârsız mı?" diye düşünmek imkânsız olur.
 * ============================================================================
 */
export async function NetKar({
  tutar,
  paraBirimi,
  durum,
}: {
  tutar: { toString(): string } | null;
  paraBirimi: Currency | null;
  durum: ProfitStatus | null;
}) {
  const t = await getTranslations("Satis");
  const bicim = await bicimlendirici();

  // Hiç hesaplanmamış (eski kayıt veya kâr yazılmadan oluşmuş).
  if (durum === null) {
    return (
      <span className="text-muted-foreground text-xs">
        {t("karHesaplanmadi")}
      </span>
    );
  }

  if (durum !== "CALCULATED" || tutar === null) {
    const kisa =
      durum === "NO_COST"
        ? t("durumKisaNoCost")
        : durum === "CURRENCY_MISMATCH"
          ? t("durumKisaCurrency")
          : t("durumKisaRule");
    // Hesaplanamayan kâr UYARI'dır: eksik bir şey var, ele alınmalı.
    return <DurumRozeti durum="uyari">{kisa}</DurumRozeti>;
  }

  const sayi = Number(tutar.toString());
  const renk = karDurumu(sayi);

  /**
   * RAKAM VE KELİME TEK PARÇA, PASTEL ZEMİN ÜSTÜNDE (15.08.2026 düzeltmesi).
   *
   * İlk denemede rakam yalnız KOYU YAZI ile renklendirilmişti ve kullanıcı
   * "inanılmaz zayıf bir renk uygulaması" dedi — haklıydı: paletin koyu
   * yeşili 13 px'te siyahtan ayırt edilmiyor. Spesifikasyonun kendisi
   * "pastel ZEMİN + koyu rakam" diyordu; zemini atlayınca renk kayboluyor.
   *
   * Rakam ile kelime AYNI çip içinde: iki ayrı öğe gibi durunca göz ikisini
   * ilişkilendirmiyordu. Sıfırda çip YOK — nötr, ne müjde ne alarm.
   */
  if (renk === "notr") {
    return (
      <span className="font-medium tabular-nums">
        {bicim.para(sayi, paraBirimi ?? "TRY")}
      </span>
    );
  }

  return (
    <DurumRozeti durum={renk} isaretsiz>
      <span className="font-semibold tabular-nums">
        {bicim.para(sayi, paraBirimi ?? "TRY")}
      </span>
      <span className="opacity-75">
        {renk === "olumlu" ? t("karda") : t("zararda")}
      </span>
    </DurumRozeti>
  );
}
