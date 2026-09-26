import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { kategoriKarari } from "@/lib/kategori-eslesme";
import { prisma } from "@/lib/prisma";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { sayfaIzni } from "@/lib/yetki";

import { EslesmeSecici } from "./eslesme-secici";

/**
 * ============================================================================
 *  TRENDYOL KATEGORİ EŞLEŞMESİ EKRANI (K283)
 * ----------------------------------------------------------------------------
 *  Her TY kategorisi bir satır: ürün sayısı · bizdeki karşılığı (seçici) ·
 *  KDV yüzünden bekleyen ve elle seçilmiş ürün sayısı. Karşılığı SEÇİLMEMİŞ
 *  (ve ürünü olan) satırlar EN ÜSTTE — tahmin yok, iş burada.
 *  «KDV bekleyen» ve «elle» sayıları yazıcıyla AYNI saf kuraldan
 *  (`kategoriKarari`) hesaplanır — ekran ile yazım ayrışamaz.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("KategoriEslesme");
  return { title: t("baslik") };
}

export default async function TyKategoriEslesmeSayfasi() {
  await sayfaIzni("ayar.yaz");
  const t = await getTranslations("KategoriEslesme");

  const [eslesmeler, kategoriler, urunler] = await Promise.all([
    prisma.tyKategoriEslesme.findMany({
      select: { tyKategori: true, categoryId: true, category: { select: { vatRate: true } } },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, vatRate: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true, tyKategori: { not: null } },
      select: {
        tyKategori: true,
        categoryId: true,
        kategoriKaynak: true,
        vatRateOverride: true,
        category: { select: { vatRate: true } },
      },
    }),
  ]);

  const sayim = new Map<string, { urun: number; kdv: number; elle: number }>();
  const harita = new Map(eslesmeler.map((e) => [e.tyKategori, e]));
  for (const u of urunler) {
    const ty = u.tyKategori!;
    const s = sayim.get(ty) ?? { urun: 0, kdv: 0, elle: 0 };
    s.urun++;
    const e = harita.get(ty);
    const karar = kategoriKarari({
      mevcutKategoriId: u.categoryId,
      mevcutKaynak: u.kategoriKaynak,
      mevcutKategoriKdv: u.category ? Number(u.category.vatRate.toString()) : null,
      urunIstisnasi: u.vatRateOverride !== null ? Number(u.vatRateOverride.toString()) : null,
      hedefKategoriId: e?.categoryId ?? null,
      hedefKategoriKdv: e?.category ? Number(e.category.vatRate.toString()) : null,
    });
    if ("atla" in karar && karar.atla === "KDV_DEGISIR") s.kdv++;
    if ("atla" in karar && karar.atla === "ELLE") s.elle++;
    sayim.set(ty, s);
  }

  const satirlar = eslesmeler
    .map((e) => ({ ...e, ...(sayim.get(e.tyKategori) ?? { urun: 0, kdv: 0, elle: 0 }) }))
    .sort(
      (a, b) =>
        Number(a.categoryId !== null) - Number(b.categoryId !== null) ||
        b.urun - a.urun ||
        a.tyKategori.localeCompare(b.tyKategori, "tr"),
    );
  const karsiliksiz = satirlar.filter((s) => s.categoryId === null && s.urun > 0).length;
  const secenekler = kategoriler.map((k) => ({ id: k.id, ad: k.name, kdv: String(Number(k.vatRate.toString())) }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
        <p className="text-muted-foreground mt-1 text-sm">{t("kurallar")}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {t("sayac", { toplam: satirlar.length, urun: urunler.length })}
        </p>
      </div>

      {karsiliksiz > 0 ? (
        <div className={`rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
          <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
            <TriangleAlert className="size-4 shrink-0" />
            {t("karsiliksizBaslik", { sayi: karsiliksiz })}
          </p>
          <p className={`mt-1 text-sm ${DURUM_YAZISI.uyari}`}>{t("karsiliksizMetin")}</p>
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {satirlar.length === 0 ? (
            <p className="text-muted-foreground p-8 text-center text-sm">{t("bos")}</p>
          ) : (
            <div className="divide-y">
              {satirlar.map((s) => (
                <div
                  key={s.tyKategori}
                  className="grid items-center gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_16rem]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium" title={s.tyKategori}>
                      {s.tyKategori}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t("urunSayisi", { sayi: s.urun })}
                      {s.kdv > 0 ? (
                        <span className={DURUM_YAZISI.uyari}> · {t("kdvBekleyen", { sayi: s.kdv })}</span>
                      ) : null}
                      {s.elle > 0 ? <span> · {t("elleSecilmis", { sayi: s.elle })}</span> : null}
                    </p>
                  </div>
                  <EslesmeSecici tyKategori={s.tyKategori} seciliId={s.categoryId} kategoriler={secenekler} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
