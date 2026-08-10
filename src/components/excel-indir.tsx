import { getTranslations } from "next-intl/server";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * "Excel indir" düğmesi — bütün liste ekranlarında AYNI görünür (İlke #10).
 *
 * EKRANDAKİ FİLTREYİ TAŞIR: sayfanın kendi arama/filtre parametreleri
 * sorgu dizesi olarak geçirilir; indirilen dosya ekranda görülenle birebir
 * aynıdır. Boş değerler atılır ki adres kirlenmesin.
 */
export async function ExcelIndir({
  liste,
  parametreler,
}: {
  liste: string;
  parametreler?: Record<string, string | undefined>;
}) {
  const t = await getTranslations("DisaAktarma");

  const sorgu = new URLSearchParams();
  for (const [anahtar, deger] of Object.entries(parametreler ?? {})) {
    if (deger) sorgu.set(anahtar, deger);
  }
  const ek = sorgu.toString();

  return (
    <Button variant="outline" asChild>
      <a href={`/api/disa-aktarma/${liste}${ek ? `?${ek}` : ""}`}>
        <Download />
        {t("excelIndir")}
      </a>
    </Button>
  );
}
