import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { bicimlendirici } from "@/lib/bicim";

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
    return (
      <Badge
        variant="outline"
        className="border-amber-500/50 text-amber-700 dark:text-amber-400"
      >
        {kisa}
      </Badge>
    );
  }

  const sayi = Number(tutar.toString());
  return (
    <span className={sayi < 0 ? "text-destructive font-medium" : "font-medium"}>
      {bicim.para(sayi, paraBirimi ?? "TRY")}
    </span>
  );
}
