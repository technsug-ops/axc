import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Baglanti, GeriBaglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { stokHareketEtiketleri } from "@/lib/etiketler";
import { bicimlendirici } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";
import { tarihGirdisi } from "@/lib/bicim";

import { DuzeltmeFormu } from "./duzeltme-formu";
import { varyantStogu } from "@/lib/stok";

export default async function VaryantHareketleriSayfasi({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  const { variantId } = await params;

  const varyant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: { select: { id: true, name: true, brand: true } },
      location: { select: { code: true, name: true } },
    },
  });

  if (!varyant) notFound();

  const nedenler = await prisma.stockAdjustmentReason.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const bicim = await bicimlendirici();
  const t = await getTranslations("Stok");
  const ortak = await getTranslations("Ortak");
  const hareketEtiketleri = await stokHareketEtiketleri();
  const tIade = await getTranslations("Iade");

  const [stok, hareketler] = await Promise.all([
    varyantStogu(variantId),
    prisma.stockMovement.findMany({
      where: { variantId },
      include: {
        location: { select: { code: true } },
        purchaseItem: {
          include: { purchase: { select: { id: true, code: true } } },
        },
        saleItem: {
          include: { sale: { select: { id: true, code: true } } },
        },
        returnItem: {
          include: {
            return: { select: { id: true, saleId: true, code: true } },
          },
        },
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  /**
   * Hareketin kaynağı: alım girişiyse alıma, satış çıkışıysa satışa link.
   * Masaüstü tablosu ve mobil kart aynı işlevden beslenir; iki yerde
   * ayrı yazılırsa biri güncellenip diğeri unutulur.
   */
  function kaynakHucresi(hareket: (typeof hareketler)[number]) {
    if (hareket.purchaseItem?.purchase) {
      return (
        <Baglanti href={`/alimlar/${hareket.purchaseItem.purchase.id}`}>
          {hareket.purchaseItem.purchase.code}
        </Baglanti>
      );
    }

    // İade/değişim hareketleri satışın iade bölümüne gider.
    if (hareket.returnItem?.return) {
      return (
        <Baglanti href={`/satislar/${hareket.returnItem.return.saleId}`}>
          {hareket.returnItem.return.code ?? tIade("baslik")}
        </Baglanti>
      );
    }

    if (hareket.saleItem?.sale) {
      // Satışın sipariş numarası olmayabilir; o zaman "Satış" yazar.
      return (
        <Baglanti href={`/satislar/${hareket.saleItem.sale.id}`}>
          {hareket.saleItem.sale.code ?? t("satisKaynagi")}
        </Baglanti>
      );
    }

    return <span className="text-muted-foreground">{hareket.note ?? "—"}</span>;
  }

  return (
    <div className="space-y-6">
      <div>
        <GeriBaglanti href="/stok">{t("baslik")}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">
          {varyant.product.name}
          {varyant.name ? ` — ${varyant.name}` : ""}
        </h1>
        <p className="text-sm">
          <Baglanti href={`/urunler/${varyant.product.id}`}>
            {t("urunKartinaGit")}
          </Baglanti>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("mevcutStok")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stok}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {ortak("raf")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {varyant.location ? varyant.location.code : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("kodlar")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">{ortak("sku")}:</span>
              <KopyalanabilirKod deger={varyant.sku} etiket={ortak("sku")} />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">
                {ortak("firmaSku")}:
              </span>
              <KopyalanabilirKod
                deger={varyant.companySku}
                etiket={ortak("firmaSku")}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">{ortak("barkod")}:</span>
              <KopyalanabilirKod
                deger={varyant.barcode}
                etiket={ortak("barkod")}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Düzeltme formu hareket geçmişinin ÜSTÜNDE: yeni kaydın hemen
          altında sonucunu görürsünüz. */}
      <DuzeltmeFormu
        variantId={varyant.id}
        mevcutStok={stok}
        bugun={tarihGirdisi(new Date())}
        nedenler={nedenler.map((n) => ({
          id: n.id,
          ad: n.name,
          aciklamaZorunlu: n.requiresNote,
          sayimFarkiMi: n.movementType === "COUNT_CORRECTION",
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {t("hareketGecmisi", { sayi: hareketler.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hareketler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("hareketYokBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("hareketYokIpucu")}
              </p>
            </div>
          ) : (
            <>
              {/* -------------------- MASAÜSTÜ: TABLO -------------------- */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sutunTarih")}</TableHead>
                      <TableHead>{t("sutunTip")}</TableHead>
                      <TableHead className="text-right">
                        {t("sutunAdet")}
                      </TableHead>
                      <TableHead>{ortak("raf")}</TableHead>
                      <TableHead>{t("sutunKaynak")}</TableHead>
                      <TableHead className="text-right">
                        {t("sutunBirimMaliyet")}
                      </TableHead>
                      <TableHead>{t("sutunKim")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hareketler.map((hareket) => (
                      <TableRow key={hareket.id}>
                        <TableCell className="whitespace-nowrap">
                          {bicim.tarih(hareket.occurredAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {hareketEtiketleri[hareket.type]}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={
                            hareket.quantityDelta < 0
                              ? "text-destructive text-right font-medium"
                              : "text-right font-medium"
                          }
                        >
                          {hareket.quantityDelta > 0 ? "+" : ""}
                          {hareket.quantityDelta}
                        </TableCell>
                        <TableCell>
                          {hareket.location ? (
                            <Badge variant="outline">
                              {hareket.location.code}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{kaynakHucresi(hareket)}</TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          {hareket.unitCostAmount
                            ? bicim.para(
                                hareket.unitCostAmount,
                                hareket.unitCostCurrency ?? "TRY",
                              )
                            : "—"}
                        </TableCell>
                        {/* Kullanıcı/kimlik doğrulama Faz 4'te gelecek. */}
                        <TableCell className="text-muted-foreground">
                          —
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* --------------------- TELEFON: KART --------------------- */}
              <div className="space-y-3 md:hidden">
                {hareketler.map((hareket) => (
                  <ListeKarti
                    key={hareket.id}
                    baslik={
                      <span className="flex flex-wrap items-center gap-2">
                        {bicim.tarih(hareket.occurredAt)}
                        <Badge variant="secondary">
                          {hareketEtiketleri[hareket.type]}
                        </Badge>
                      </span>
                    }
                    alanlar={[
                      {
                        etiket: t("sutunAdet"),
                        deger: (
                          <span
                            className={
                              hareket.quantityDelta < 0
                                ? "text-destructive text-base font-semibold"
                                : "text-base font-semibold"
                            }
                          >
                            {hareket.quantityDelta > 0 ? "+" : ""}
                            {hareket.quantityDelta}
                          </span>
                        ),
                      },
                      {
                        etiket: ortak("raf"),
                        deger: hareket.location ? (
                          <Badge variant="outline">
                            {hareket.location.code}
                          </Badge>
                        ) : (
                          "—"
                        ),
                      },
                      {
                        etiket: t("sutunKaynak"),
                        deger: kaynakHucresi(hareket),
                      },
                      {
                        etiket: t("sutunBirimMaliyet"),
                        deger: hareket.unitCostAmount
                          ? bicim.para(
                              hareket.unitCostAmount,
                              hareket.unitCostCurrency ?? "TRY",
                            )
                          : "—",
                      },
                      // Kullanıcı/kimlik doğrulama Faz 4'te gelecek.
                      { etiket: t("sutunKim"), deger: "—" },
                    ]}
                  />
                ))}
              </div>
            </>
          )}

          <p className="text-muted-foreground text-xs">{t("gecmisNotu")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
