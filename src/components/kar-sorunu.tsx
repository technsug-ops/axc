import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { ProfitStatus } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  KÂR HESAPLANAMADI — ÇÖZÜM YOL HARİTASI
 * ----------------------------------------------------------------------------
 *  Sorunu söylemek yarısıdır. "Kural eksik" yazan bir uyarı, kullanıcıya NE
 *  YAPACAĞINI söylemezse ekranda asılı kalır.
 *  _Kullanıcı isteği 10.08.2026: "sorunu yazdığın gibi çözümün yol haritasını
 *  da yaz."_
 *
 *  ADIMLAR GERÇEK EKRANLARA GÖRE YAZILDI — uydurulmadı:
 *  Kanal SKU düzenleme ekranı ve alım düzenleme ekranı BUGÜN YOK. Olmayan
 *  bir yola yönlendirmektense o adımda "bu ekran henüz yok" yazıyor.
 *  Rapor ve satış detayı AYNI bileşeni kullanır (İlke #10).
 * ============================================================================
 */
export async function KarSorunuCozumu({
  durum,
  saleId,
}: {
  durum: ProfitStatus;
  /** Verilirse sonuna "Satışa git" düğmesi eklenir (rapor bağlamı). */
  saleId?: string;
}) {
  const t = await getTranslations("KarSorunu");

  if (durum === "CALCULATED") return null;

  const { neden, adimlar } =
    durum === "NO_COST"
      ? {
          neden: t("nedenNoCost"),
          adimlar: [t("costAdim1"), t("costAdim2"), t("costAdim3")],
        }
      : durum === "CURRENCY_MISMATCH"
        ? {
            neden: t("nedenCurrency"),
            adimlar: [
              t("currencyAdim1"),
              t("currencyAdim2"),
              t("currencyAdim3"),
            ],
          }
        : {
            neden: t("nedenRuleMissing"),
            adimlar: [t("ruleAdim1"), t("ruleAdim2"), t("ruleAdim3")],
          };

  return (
    <div className="bg-background/60 space-y-2 rounded-md border p-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Wrench className="size-4 shrink-0" />
        {t("baslik")}
      </p>

      <p className="text-muted-foreground text-xs">{neden}</p>

      <ol className="ml-4 list-decimal space-y-1 text-xs">
        {adimlar.map((adim, sira) => (
          <li key={sira}>{adim}</li>
        ))}
      </ol>

      {saleId ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/satislar/${saleId}`}>
            <ArrowRight />
            {t("satisaGit")}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
