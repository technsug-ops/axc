import { getTranslations } from "next-intl/server";

import { ExcelIndir } from "@/components/excel-indir";
import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnizlemeDurumu } from "@/lib/sku-onizleme";
import { skuOnizlemeSatirlari } from "@/lib/sku-onizleme-veri";
import { DURUM_YAZISI } from "@/lib/renkler";
import { sayfaIzni } from "@/lib/yetki";

/**
 * ============================================================================
 *  SKU ÖNİZLEMESİ EKRANI (K286) — HİÇBİR ŞEY YAZMAZ
 * ----------------------------------------------------------------------------
 *  Sayılar, liste ve Excel TEK gövdeden (`skuOnizlemeSatirlari`) — sayı = liste.
 *  Her durum kutusu SIFIR olsa da durur (sıfır satır gizlenmez). Kod alamayan
 *  ürünlerin TAMAMI listelenir (iş burada); kod alanlardan ilk ÖRNEK_SAYISI
 *  gösterilir, tamamı Excel'de.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("SkuOnizleme");
  return { title: t("baslik") };
}

const DURUMLAR: OnizlemeDurumu[] = ["HAZIR", "AYNI", "KATEGORI_YOK", "KATEGORI_KODSUZ", "MARKA_YOK", "CAKISMA"];
const ORNEK_SAYISI = 50;

export default async function SkuOnizlemeSayfasi() {
  await sayfaIzni("urun.gor");
  const t = await getTranslations("SkuOnizleme");
  const satirlar = await skuOnizlemeSatirlari();
  const kodlu = satirlar.filter((s) => s.yeniKod !== null);
  const sorunlu = satirlar.filter((s) => s.yeniKod === null);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
          <p className="text-muted-foreground mt-1 text-xs">{t("kural")}</p>
          <p className="text-muted-foreground mt-1 text-xs">{t("sayac", { toplam: satirlar.length, hazir: kodlu.length })}</p>
        </div>
        <ExcelIndir liste="sku-onizleme" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {DURUMLAR.map((d) => (
          <IstatistikKutusu key={d} etiket={t(`durum.${d}`)} cocuk={satirlar.filter((s) => s.durum === d).length} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("sorunluBaslik", { sayi: sorunlu.length })}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sorunlu.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm">{t("sorunluBos")}</p>
          ) : (
            <div className="divide-y">
              {sorunlu.map((s) => (
                <div key={s.kimlik} className="grid gap-1 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.urunAdi}</p>
                    <p className="text-muted-foreground text-xs">
                      <span className="font-mono">{s.eskiFirmaSku}</span> · {s.kategori || "—"} · {s.marka || "—"}
                    </p>
                  </div>
                  <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t(`durum.${s.durum}`)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("ornekBaslik", { sayi: Math.min(ORNEK_SAYISI, kodlu.length) })}</CardTitle>
          <p className="text-muted-foreground text-xs">{t("ornekNot")}</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {kodlu.slice(0, ORNEK_SAYISI).map((s) => (
              <div key={s.kimlik} className="grid gap-1 px-4 py-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <p className="truncate text-sm">{s.urunAdi}</p>
                <p className="font-mono text-sm">
                  <span className="text-muted-foreground">{s.eskiFirmaSku}</span> → <span className="font-semibold">{s.yeniKod}</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
