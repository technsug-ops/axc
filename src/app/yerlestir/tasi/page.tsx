import { getTranslations } from "next-intl/server";
import { ArrowRightLeft } from "lucide-react";

import { Tasiyici } from "@/app/yerlestir/tasi/tasiyici";
import { GeriBaglanti } from "@/components/baglanti";
import { sayfaIzni } from "@/lib/yetki";

/**
 * ============================================================================
 *  TOPLU RAF TAŞIMA (K50 ⑥)
 * ----------------------------------------------------------------------------
 *  Bir rafın ürünlerini (tamamını ya da bir kısmını) başka rafa taşır.
 *
 *  ⚠ MENÜYE AYRI SATIR AÇILMADI — `/yerlestir`in altında yaşıyor ve oradan
 *  girilir. Günlük iş TEK ÜRÜN yerleştirmektir; toplu taşıma raf düzeni
 *  değiştiğinde yapılır. Ayrı menü satırı, günlük listeyi seyrek bir işle
 *  şişirirdi.
 *
 *  ⛔ STOK DEFTERİNE DOKUNULMAZ — yazılan tek alan `locationId`.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("rafTasi") };
}

export default async function RafTasiSayfasi() {
  await sayfaIzni("stok.duzelt");

  const t = await getTranslations("Tasi");

  return (
    <div className="space-y-6">
      <div>
        <GeriBaglanti href="/yerlestir">{t("yerlestirmeyeDon")}</GeriBaglanti>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold">
          <ArrowRightLeft className="text-muted-foreground size-5" aria-hidden />
          {t("baslik")}
        </h1>
      </div>

      <p className="text-muted-foreground max-w-3xl text-sm">{t("aciklama")}</p>

      <Tasiyici />
    </div>
  );
}
