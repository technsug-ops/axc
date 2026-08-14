import { getTranslations } from "next-intl/server";

import { DurumRakami, DurumRozeti } from "@/components/durum-rozeti";
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
   * RENK TEK BAŞINA KONUŞMAZ (kısıt #1): rakamın yanında kelime durur.
   * Sıfırda kelime YOK — sıfır nötrdür, "kârda" da "zararda" da değildir.
   */
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1">
      <DurumRakami durum={renk} className="font-medium">
        {bicim.para(sayi, paraBirimi ?? "TRY")}
      </DurumRakami>
      {renk === "notr" ? null : (
        <DurumRozeti durum={renk} isaretsiz>
          {renk === "olumlu" ? t("karda") : t("zararda")}
        </DurumRozeti>
      )}
    </span>
  );
}
