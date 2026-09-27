import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { prisma } from "@/lib/prisma";
import { ETIKET_OLCULERI, olcuCoz, urunEtiketiSvg, type EtiketOlcusu } from "@/lib/urun-etiketi";
import { aramaKosulu } from "@/lib/varyant-arama-kurali";
import { sayfaIzni } from "@/lib/yetki";

import { EtiketBasici } from "./etiket-basici";

/**
 * ============================================================================
 *  ÜRÜN ETİKETİ EKRANI (K291)
 * ----------------------------------------------------------------------------
 *  Ürün aranır (İlke #17, ortak arama — eski kod da bulur), adet girilir,
 *  yazdırılır. Etiket gövdesi `lib/urun-etiketi.ts`; kod = Firma SKU
 *  (KAT-MRK-NNNN). Ölçü adrese yazılır (`?olcu=`), arama korunur.
 *  Aramasız açılışta liste BOŞ: 1.255 etiketi birden çizmek anlamsız ve yavaş.
 * ============================================================================
 */
export const dynamic = "force-dynamic";

const TAVAN = 40;

export async function generateMetadata() {
  const t = await getTranslations("UrunEtiketi");
  return { title: t("baslik") };
}

export default async function UrunEtiketleriSayfasi({ searchParams }: { searchParams: Promise<{ q?: string; olcu?: string }> }) {
  await sayfaIzni("urun.gor");
  const t = await getTranslations("UrunEtiketi");
  const { q, olcu: olcuHam } = await searchParams;
  const arama = (q ?? "").trim();
  const olcu = olcuCoz(olcuHam);
  const { en, boy } = ETIKET_OLCULERI[olcu];

  const bulunan = arama
    ? await prisma.productVariant.findMany({
        where: { isActive: true, product: { isActive: true }, OR: aramaKosulu(arama) },
        select: { id: true, companySku: true, name: true, product: { select: { name: true } } },
        orderBy: { companySku: "asc" },
        take: TAVAN + 1,
      })
    : [];
  const urunler = bulunan.slice(0, TAVAN).map((v) => {
    const ad = v.name ? `${v.product.name} — ${v.name}` : v.product.name;
    return { id: v.id, kod: v.companySku, ad, svg: urunEtiketiSvg(v.companySku, ad, olcu) };
  });

  const olcuAdresi = (o: EtiketOlcusu) => `/urunler/etiketler?olcu=${o}${arama ? `&q=${encodeURIComponent(arama)}` : ""}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-sm">{t("olcu")}:</span>
        {(Object.keys(ETIKET_OLCULERI) as EtiketOlcusu[]).map((o) => (
          <Link
            key={o}
            href={olcuAdresi(o)}
            className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm md:min-h-9 ${o === olcu ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {t(`olcuAdi.${o}`)}
          </Link>
        ))}
      </div>
      <p className="text-muted-foreground text-xs print:hidden">{t("olcuNotu", { en, boy })}</p>

      <div className="space-y-1 print:hidden">
        <KodAramaKutusu temelAdres="/urunler/etiketler" baslangic={arama} tasinanlar={{ olcu }} ipucu={t("aramaIpucu")} />
        {arama ? (
          <p className="text-muted-foreground text-xs">
            {bulunan.length > TAVAN ? t("aramaFazla", { sayi: TAVAN }) : t("aramaSonuc", { q: arama, sayi: urunler.length })}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">{t("aramaOnce")}</p>
        )}
      </div>

      {urunler.length > 0 ? (
        <>
          <div className="print:hidden">
            <p className="mb-1 text-xs font-medium">{t("onizleme")}</p>
            <div
              className="inline-block border [&>svg]:h-auto [&>svg]:w-48"
              dangerouslySetInnerHTML={{ __html: urunler[0]!.svg }}
            />
          </div>
          <EtiketBasici urunler={urunler} en={en} boy={boy} />
        </>
      ) : null}
    </div>
  );
}
