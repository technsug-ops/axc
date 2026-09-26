import { getTranslations } from "next-intl/server";

import { ExcelIndir } from "@/components/excel-indir";
import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SupheSebebi } from "@/lib/supheli-urun";
import { supheliSatirlari } from "@/lib/supheli-urun-veri";
import { sayfaIzni } from "@/lib/yetki";

import { SupheliYukleyici } from "./yukleyici";

/**
 * ============================================================================
 *  ŞÜPHELİ ÜRÜNLER (K284)
 * ----------------------------------------------------------------------------
 *  Sayılar indirilen Excel ile AYNI gövdeden (`supheliSatirlari`) — «sayı =
 *  liste». Kullanıcı listeyi indirir, «Doğru EAN» / «Bu ürün sizin mi»
 *  doldurur, geri yükler: önce önizleme, sonra onaylı yazım.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("SupheliUrun");
  return { title: t("baslik") };
}

const SEBEPLER: SupheSebebi[] = ["BARKOD_YOK", "EAN_DEGIL", "TY_BULUNAMADI"];

export default async function SupheliUrunlerSayfasi() {
  await sayfaIzni("urun.yaz");
  const t = await getTranslations("SupheliUrun");
  const satirlar = await supheliSatirlari();
  const islem = satirlar.filter((s) => s.islemGoruyor).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
        <p className="text-muted-foreground mt-1 text-xs">{t("sayac", { toplam: satirlar.length, islem })}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {SEBEPLER.map((s) => {
          const kume = satirlar.filter((r) => r.sebep === s);
          return (
            <IstatistikKutusu
              key={s}
              etiket={t(`sebep.${s}`)}
              cocuk={kume.length}
              altNot={t("islemGoruyor", { sayi: kume.filter((r) => r.islemGoruyor).length })}
            />
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("adim1Baslik")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">{t("adim1Metin")}</p>
          <ExcelIndir liste="supheli" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("adim2Baslik")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground text-sm">{t("adim2Metin")}</p>
          <SupheliYukleyici />
        </CardContent>
      </Card>
    </div>
  );
}
