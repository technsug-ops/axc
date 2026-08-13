import Link from "next/link";
import { sayfaIzni } from "@/lib/yetki";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GeriBaglanti } from "@/components/baglanti";
import { Button } from "@/components/ui/button";
import { tarihGirdisi } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";

import {
  IadeFormu,
  type IadeKalemSecenegi,
  type KonumSecenegi,
  type VaryantSecenegi,
} from "./iade-formu";

export async function generateMetadata() {
  const t = await getTranslations("Iade");
  return { title: t("baslik") };
}

export default async function IadeSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  /** Bildirimden gelen ön-dolu geçiş: ?bildirim=<id> */
  searchParams: Promise<{ bildirim?: string }>;
}) {
  await sayfaIzni("iade.yaz");

  const { id } = await params;
  const { bildirim: bildirimId } = await searchParams;
  const t = await getTranslations("Iade");

  const satis = await prisma.sale.findUnique({
    where: { id },
    include: {
      channelAccount: {
        include: {
          channel: { select: { disputedReshipPaidBySeller: true } },
        },
      },
      items: {
        include: {
          variant: {
            include: { product: { select: { name: true } } },
          },
          // Daha önce iade edilen adetler düşülecek.
          returnItems: { select: { quantity: true } },
        },
      },
    },
  });

  if (!satis) notFound();

  const kalemler: IadeKalemSecenegi[] = satis.items.map((k) => {
    const oncekiIade = k.returnItems.reduce((t2, r) => t2 + r.quantity, 0);
    return {
      saleItemId: k.id,
      baslik: k.variant.name
        ? `${k.variant.product.name} — ${k.variant.name}`
        : k.variant.product.name,
      sku: k.variant.sku,
      satilanAdet: k.quantity,
      kalanAdet: k.quantity - oncekiIade,
      varsayilanLocationId: k.variant.locationId ?? "",
    };
  });

  const iadeEdilebilir = kalemler.filter((k) => k.kalanAdet > 0);

  const [konumKayitlari, varyantKayitlari] = await Promise.all([
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
      orderBy: { code: "asc" },
    }),
    prisma.productVariant.findMany({
      where: { isActive: true },
      include: { product: { select: { name: true } } },
      orderBy: { sku: "asc" },
      take: 200,
    }),
  ]);

  const konumlar: KonumSecenegi[] = konumKayitlari.map((k) => ({
    id: k.id,
    kod: k.code,
  }));
  const varyantlar: VaryantSecenegi[] = varyantKayitlari.map((v) => ({
    id: v.id,
    etiket: v.name
      ? `${v.product.name} — ${v.name} (${v.sku})`
      : `${v.product.name} (${v.sku})`,
  }));

  /**
   * ÖN-DOLU GEÇİŞ — bildirimden gelindiyse form hazır açılır.
   *
   * YANLIS_URUN gerekçesinde iki bilgi taşınır ve BİNDİRİLMEZ:
   *   dönen (returnedVariantId)  → geri gelen yanlış ürün, defter düzeltmesi
   *   gönderilecek (reservedVariantId) → değişimde çıkacak doğru ürün
   * Diğer gerekçelerde dönen mal satılan malın kendisidir; alan boş kalır ve
   * form eski davranışını sürdürür.
   *
   * Bildirim başka bir satışa aitse ya da iadesi zaten işlenmişse ÖN-DOLU
   * UYGULANMAZ: yanlış satışın ürününü seçili getirmek sessiz bir hata olurdu.
   */
  const bildirim = bildirimId
    ? await prisma.returnNotice.findFirst({
        where: { id: bildirimId, saleId: satis.id, returnId: null },
        select: {
          id: true,
          reason: true,
          returnedVariantId: true,
          reservedVariantId: true,
          returnedVariant: {
            select: { sku: true, product: { select: { name: true } } },
          },
        },
      })
    : null;

  const onDolu =
    bildirim === null
      ? null
      : {
          bildirimId: bildirim.id,
          donenVaryantId:
            bildirim.reason === "YANLIS_URUN" ? bildirim.returnedVariantId : null,
          gonderilecekVaryantId:
            bildirim.reason === "YANLIS_URUN" ? bildirim.reservedVariantId : null,
          donenEtiket: bildirim.returnedVariant
            ? `${bildirim.returnedVariant.product.name} (${bildirim.returnedVariant.sku})`
            : null,
        };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <GeriBaglanti href={`/satislar/${satis.id}`}>
          {satis.code ?? satis.id}
        </GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">{t("yeniIade")}</h1>
      </div>

      {iadeEdilebilir.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{t("tamamiIade")}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("tamamiIadeNotu")}
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href={`/satislar/${satis.id}`}>{t("baslik")}</Link>
          </Button>
        </div>
      ) : (
        <IadeFormu
          saleId={satis.id}
          kalemler={iadeEdilebilir}
          konumlar={konumlar}
          varyantlar={varyantlar}
          yenidenGonderimGorunur={
            satis.channelAccount.channel.disputedReshipPaidBySeller
          }
          bugun={tarihGirdisi(new Date())}
          onDolu={onDolu}
        />
      )}
    </div>
  );
}
