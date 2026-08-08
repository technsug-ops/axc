import Link from "next/link";
import { notFound } from "next/navigation";

import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
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
import { stokHareketiEtiketi } from "@/lib/etiketler";
import { paraFormatla, tarihFormatla } from "@/lib/format";
import { prisma } from "@/lib/prisma";
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

  const [stok, hareketler] = await Promise.all([
    varyantStogu(variantId),
    prisma.stockMovement.findMany({
      where: { variantId },
      include: {
        location: { select: { code: true } },
        purchaseItem: {
          include: { purchase: { select: { id: true, code: true } } },
        },
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/stok"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Stok
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          {varyant.product.name}
          {varyant.name ? ` — ${varyant.name}` : ""}
        </h1>
        <p className="text-sm">
          <Baglanti href={`/urunler/${varyant.product.id}`}>
            Ürün kartına git
          </Baglanti>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Mevcut stok</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stok}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Raf</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {varyant.location ? varyant.location.code : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Kodlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">SKU:</span>
              <KopyalanabilirKod deger={varyant.sku} etiket="SKU" />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">Axcali:</span>
              <KopyalanabilirKod
                deger={varyant.axcaliSku}
                etiket="Axcali SKU"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">Barkod:</span>
              <KopyalanabilirKod deger={varyant.barcode} etiket="Barkod" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hareket geçmişi ({hareketler.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hareketler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Henüz stok hareketi yok.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                İlk giriş, bir alımın mal kabulü yapıldığında oluşur.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead className="text-right">Adet</TableHead>
                    <TableHead>Raf</TableHead>
                    <TableHead>Kaynak</TableHead>
                    <TableHead className="text-right">Birim maliyet</TableHead>
                    <TableHead>Kim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hareketler.map((hareket) => (
                    <TableRow key={hareket.id}>
                      <TableCell className="whitespace-nowrap">
                        {tarihFormatla(hareket.occurredAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {stokHareketiEtiketi(hareket.type)}
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
                      <TableCell>
                        {hareket.purchaseItem?.purchase ? (
                          <Baglanti
                            href={`/alimlar/${hareket.purchaseItem.purchase.id}`}
                          >
                            {hareket.purchaseItem.purchase.code}
                          </Baglanti>
                        ) : (
                          <span className="text-muted-foreground">
                            {hareket.note ?? "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {hareket.unitCostAmount
                          ? paraFormatla(
                              hareket.unitCostAmount,
                              hareket.unitCostCurrency ?? "TRY",
                            )
                          : "—"}
                      </TableCell>
                      {/* Kullanıcı/kimlik doğrulama Faz 4'te gelecek. */}
                      <TableCell className="text-muted-foreground">—</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-muted-foreground text-xs">
            Hareketler değiştirilmez ve silinmez. Hatalı bir giriş, ters
            işaretli bir ADJUSTMENT kaydıyla düzeltilir. &quot;Kim&quot;
            sütunu çok kullanıcılı yapıyla (Faz 4) dolacak.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
