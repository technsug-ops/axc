import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GeriBaglanti } from "@/components/baglanti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici, tarihGirdisi } from "@/lib/bicim";
import { yenidenGonderimSorulurMu } from "@/lib/iade/yeniden-gonderim";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";

import { IadeDuzenleFormu } from "./iade-duzenle-formu";

/**
 * İADE DÜZENLE (K44 · 1. adım) — yalnız STOĞA DOKUNMAYAN alanlar.
 * Stok yazan alanlar (adet · sağlam/hasarlı · değişim ürünü · raf · tür)
 * salt okunur gösterilir ve NİYE değişmediği ekranda yazar (İlke #5).
 */
export async function generateMetadata() {
  const t = await getTranslations("IadeDuzenle");
  return { title: t("baslik") };
}

/** Form alanına konacak ham sayı — ekran biçimi DEĞİL, geri okunabilir girdi. */
const girdiSayisi = (d: { toString(): string } | null) =>
  d === null ? "" : Number(d.toString()).toFixed(2).replace(".", ",");

export default async function IadeDuzenleSayfasi({
  params,
}: {
  params: Promise<{ id: string; iadeId: string }>;
}) {
  await sayfaIzni("iade.yaz");
  const { id, iadeId } = await params;
  const t = await getTranslations("IadeDuzenle");
  const tTur = await getTranslations("IadeTuru");
  const bicim = await bicimlendirici();

  const iade = await prisma.return.findUnique({
    where: { id: iadeId },
    include: {
      sale: { select: { id: true, code: true } },
      items: {
        include: {
          variant: { select: { sku: true, name: true, product: { select: { name: true } } } },
          exchangeVariant: { select: { sku: true, product: { select: { name: true } } } },
        },
      },
    },
  });
  /** Adresteki satış bu iadenin satışı değilse iade YOK sayılır. */
  if (!iade || iade.saleId !== id) notFound();

  const degisimVar = iade.items.some((k) => k.exchangeVariantId !== null);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <GeriBaglanti href={`/satislar/${id}`}>{t("geri", { satis: iade.sale.code ?? "" })}</GeriBaglanti>
      <h1 className="text-xl font-semibold">{t("baslik")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("stokluBaslik")}</CardTitle>
          <p className="text-muted-foreground text-sm">{t("stokluNotu")}</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            {tTur(iade.returnType)} · {bicim.tarih(iade.occurredAt)}
          </p>
          <ul className="space-y-1">
            {iade.items.map((k) => (
              <li key={k.id} className="rounded-md border p-2">
                <div className="font-medium">
                  {k.variant.name ? `${k.variant.product.name} — ${k.variant.name}` : k.variant.product.name}
                </div>
                <div className="text-muted-foreground">
                  {t("kalemOzeti", { adet: k.quantity, saglam: k.soundQuantity, hasarli: k.damagedQuantity })}
                  {k.exchangeVariant ? ` · ${t("degisimUrunu", { urun: k.exchangeVariant.product.name })}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <IadeDuzenleFormu
        returnId={iade.id}
        beklenenGuncelleme={iade.updatedAt.toISOString()}
        baslangic={{
          code: iade.code ?? "",
          note: iade.note ?? "",
          cezaNotu: iade.penaltyNote ?? "",
          degisimTeslimTarihi: iade.exchangeDeliveredAt ? tarihGirdisi(iade.exchangeDeliveredAt) : "",
          iadeKargosu: girdiSayisi(iade.returnCargoAmount),
          yenidenGonderimKargosu: girdiSayisi(iade.reshipCargoAmount),
          ceza: girdiSayisi(iade.penaltyAmount),
        }}
        degisimVar={degisimVar}
        yenidenGonderimGorunur={
          yenidenGonderimSorulurMu({ returnType: iade.returnType, degisimVar }) || iade.reshipCargoAmount !== null
        }
        hasarliKalemler={iade.items
          .filter((k) => k.damagedQuantity > 0)
          .map((k) => ({
            id: k.id,
            baslik: k.variant.product.name,
            not: k.damageNote ?? "",
          }))}
        iptalAdresi={`/satislar/${id}`}
      />
    </div>
  );
}
