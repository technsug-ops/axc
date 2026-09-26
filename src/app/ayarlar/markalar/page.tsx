import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

import { ExcelIndir } from "@/components/excel-indir";
import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { markaDurumu } from "@/lib/marka-kodu-veri";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { sayfaIzni } from "@/lib/yetki";

import { HepsiniEkle, KodDuzenle, MarkaEkle } from "./marka-eylemleri";

/**
 * ============================================================================
 *  MARKA KOD TABLOSU EKRANI (K285)
 * ----------------------------------------------------------------------------
 *  Üç küme, TEK gövdeden (`markaDurumu`) — sayı = liste:
 *   ① bağlanmayı bekleyen markalar (EN ÜSTTE — iş burada): önerilen kodla ekle
 *      ya da tabloda olan markaya bağla;
 *   ② markası BOŞ ürünler: koda bağlanamaz, doldurulacak liste (Excel);
 *   ③ tablodaki markalar: kod düzenlenebilir (benzersizlik kapısıyla).
 *  Kod henüz SKU üretimine bağlı DEĞİL — SKU önizlemesi ayrı paket.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("MarkaKodu");
  return { title: t("baslik") };
}

const yazimMetni = (y: [string, number][]) => y.map(([a, n]) => `${a} (${n})`).join(" · ");

export default async function MarkalarSayfasi() {
  await sayfaIzni("ayar.yaz");
  const t = await getTranslations("MarkaKodu");
  const { tablo, bagsiz, markasiz } = await markaDurumu();
  const bagsizUrun = bagsiz.reduce((s, m) => s + m.urun, 0);
  const eklenecek = bagsiz.filter((m) => m.tabloId === null && m.oneri !== null).length;
  const baglanacak = bagsiz.filter((m) => m.tabloId !== null).length;
  const kodsuz = bagsiz.filter((m) => m.tabloId === null && m.oneri === null).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <IstatistikKutusu etiket={t("kutuTablo")} cocuk={tablo.length} />
        <IstatistikKutusu etiket={t("kutuBagsiz")} cocuk={bagsiz.length} altNot={t("urunSayisi", { sayi: bagsizUrun })} />
        <IstatistikKutusu etiket={t("kutuMarkasiz")} cocuk={markasiz} altNot={t("urunBirimi")} />
      </div>

      {markasiz > 0 ? (
        <div className={`space-y-2 rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
          <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
            <TriangleAlert className="size-4 shrink-0" />
            {t("markasizBaslik", { sayi: markasiz })}
          </p>
          <p className={`text-sm ${DURUM_YAZISI.uyari}`}>{t("markasizMetin")}</p>
          <ExcelIndir liste="markasiz" />
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{t("bagsizBaslik", { sayi: bagsiz.length })}</CardTitle>
          <HepsiniEkle eklenecek={eklenecek} baglanacak={baglanacak} kodsuz={kodsuz} />
        </CardHeader>
        <CardContent className="p-0">
          {bagsiz.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm">{t("bagsizBos")}</p>
          ) : (
            <div className="divide-y">
              {bagsiz.map((m) => (
                <div key={m.anahtar} className="grid items-center gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.ad}</p>
                    <p className="text-muted-foreground text-xs">
                      {t("urunSayisi", { sayi: m.urun })}
                      {m.yazimlar.length > 1 ? ` · ${t("yazimlar")}: ${yazimMetni(m.yazimlar)}` : ""}
                      {m.tabloId ? ` · ${t("tablodaVar")}` : ""}
                    </p>
                  </div>
                  <MarkaEkle anahtar={m.anahtar} ad={m.ad} oneri={m.oneri} tablodaVar={m.tabloId !== null} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("tabloBaslik", { sayi: tablo.length })}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tablo.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center text-sm">{t("tabloBos")}</p>
          ) : (
            <div className="divide-y">
              {tablo.map((m) => (
                <div key={m.id} className="grid items-center gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {t("urunSayisi", { sayi: m.urun })}
                      {m.yazimlar.length > 1 ? ` · ${t("yazimlar")}: ${yazimMetni(m.yazimlar)}` : ""}
                    </p>
                  </div>
                  <KodDuzenle id={m.id} kod={m.code} ad={m.name} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
