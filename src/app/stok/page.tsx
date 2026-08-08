import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
import { sonHareketTarihleri, varyantStoklari } from "@/lib/stok";

import { StokArama } from "./stok-arama";

export const metadata = { title: "Stok — Axcali ERP" };

export default async function StokSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const arama = (q ?? "").trim();

  const varyantlar = await prisma.productVariant.findMany({
    where: arama
      ? {
          OR: [
            { sku: { contains: arama } },
            { axcaliSku: { contains: arama } },
            { barcode: { contains: arama } },
            { product: { name: { contains: arama } } },
          ],
        }
      : undefined,
    include: {
      product: { select: { id: true, name: true, brand: true } },
      location: { select: { code: true } },
    },
    orderBy: [{ product: { name: "asc" } }, { sku: "asc" }],
  });

  const varyantIdleri = varyantlar.map((v) => v.id);
  const [stoklar, sonHareketler] = await Promise.all([
    varyantStoklari(varyantIdleri),
    sonHareketTarihleri(varyantIdleri),
  ]);

  const toplamStok = varyantIdleri.reduce(
    (toplam, id) => toplam + (stoklar.get(id) ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Stok</h1>
        <p className="text-muted-foreground text-sm">
          {varyantlar.length} varyant · toplam {toplamStok} adet
          {arama ? ` — "${arama}" araması` : ""}
        </p>
      </div>

      <StokArama baslangic={arama} />

      {varyantlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {arama ? "Aramaya uyan varyant yok." : "Henüz varyant yok."}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {arama
              ? "Farklı bir kod veya ad deneyin."
              : "Önce ürün ekleyin, sonra alım yapıp mal kabul edin."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead>Varyant</TableHead>
                <TableHead>Axcali SKU</TableHead>
                <TableHead>Raf</TableHead>
                <TableHead className="text-right">Mevcut stok</TableHead>
                <TableHead>Son hareket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {varyantlar.map((varyant) => {
                const stok = stoklar.get(varyant.id) ?? 0;
                const sonHareket = sonHareketler.get(varyant.id);

                return (
                  <TableRow key={varyant.id}>
                    <TableCell>
                      <Link
                        href={`/stok/${varyant.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {varyant.product.name}
                      </Link>
                      {varyant.product.brand ? (
                        <div className="text-muted-foreground text-xs">
                          {varyant.product.brand}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {varyant.name ?? "Varsayılan"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {varyant.axcaliSku}
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
                    <TableCell className="text-right text-base font-semibold">
                      {stok}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {sonHareket ? tarihFormatla(sonHareket) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Mevcut stok, stok defterindeki (StockMovement) hareketlerin
        toplamıdır. Satır başlığına tıklayarak hareket geçmişini görebilirsiniz.
      </p>
    </div>
  );
}
