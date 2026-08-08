import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tarihFormatla } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { varyantStoklari } from "@/lib/stok";

import { SilButonu } from "../sil-butonu";

export default async function UrunDetaySayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const urun = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: {
        include: { options: true, location: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!urun) notFound();

  // Stok hesabı tek yerde: src/lib/stok.ts (ledger toplamı).
  const stokHaritasi = await varyantStoklari(urun.variants.map((v) => v.id));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/urunler"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Ürünler
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{urun.name}</h1>
            <p className="text-muted-foreground text-sm">
              {urun.brand ?? "Marka belirtilmemiş"} ·{" "}
              {tarihFormatla(urun.createdAt)} tarihinde eklendi
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/urunler/${urun.id}/duzenle`}>
                <Pencil />
                Düzenle
              </Link>
            </Button>
            <SilButonu
              urunId={urun.id}
              urunAdi={urun.name}
              boyut="default"
            />
          </div>
        </div>
      </div>

      {urun.description ? (
        <Card>
          <CardHeader>
            <CardTitle>Açıklama</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm whitespace-pre-line">
            {urun.description}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            Varyantlar ({urun.variants.length})
            {!urun.hasVariants ? (
              <Badge variant="secondary" className="ml-2">
                tek çeşit
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Varyant</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Axcali SKU</TableHead>
                  <TableHead>Barkod</TableHead>
                  <TableHead>Raf</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urun.variants.map((varyant) => (
                  <TableRow key={varyant.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {varyant.name ?? "Varsayılan"}
                        </span>
                        {varyant.isDefault ? (
                          <Badge variant="outline">varsayılan</Badge>
                        ) : null}
                      </div>
                      {varyant.options.length ? (
                        <div className="text-muted-foreground mt-1 text-xs">
                          {varyant.options
                            .map((o) => `${o.name}: ${o.value}`)
                            .join(" · ")}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <KopyalanabilirKod deger={varyant.sku} etiket="SKU" />
                    </TableCell>
                    <TableCell>
                      <KopyalanabilirKod
                        deger={varyant.axcaliSku}
                        etiket="Axcali SKU"
                      />
                    </TableCell>
                    <TableCell>
                      <KopyalanabilirKod
                        deger={varyant.barcode}
                        etiket="Barkod"
                      />
                    </TableCell>
                    <TableCell>
                      {varyant.location ? (
                        <Badge variant="secondary">
                          {varyant.location.code}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {stokHaritasi.get(varyant.id) ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Stok, hareket defterindeki (StockMovement) kayıtların toplamıdır.
            Alım girişi Faz 1&apos;in sonraki aşamasında geleceği için şimdilik
            hepsi 0 görünür.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
