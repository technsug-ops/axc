import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const metadata = { title: "Ürünler — Axcali ERP" };

export default async function UrunlerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const arama = (q ?? "").trim();

  const urunler = await prisma.product.findMany({
    where: arama
      ? {
          OR: [{ name: { contains: arama } }, { brand: { contains: arama } }],
        }
      : undefined,
    include: { variants: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Stok = hareketlerin toplamı (ledger). Henüz hareket olmadığı için 0 çıkar.
  const varyantIdleri = urunler.flatMap((u) => u.variants.map((v) => v.id));
  const hareketler = varyantIdleri.length
    ? await prisma.stockMovement.groupBy({
        by: ["variantId"],
        where: { variantId: { in: varyantIdleri } },
        _sum: { quantityDelta: true },
      })
    : [];
  const stokHaritasi = new Map(
    hareketler.map((h) => [h.variantId, h._sum.quantityDelta ?? 0]),
  );

  function toplamStok(varyantlar: { id: string }[]) {
    return varyantlar.reduce(
      (toplam, v) => toplam + (stokHaritasi.get(v.id) ?? 0),
      0,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ürünler</h1>
          <p className="text-muted-foreground text-sm">
            {urunler.length} kayıt
            {arama ? ` — "${arama}" araması` : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/urunler/yeni">
            <Plus />
            Yeni Ürün
          </Link>
        </Button>
      </div>

      {/* GET formu: arama URL'e yazılır, sayfa paylaşılabilir/yer imlenebilir. */}
      <form action="/urunler" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={arama}
          placeholder="Ürün adı veya markaya göre ara..."
          className="max-w-sm min-w-48 flex-1"
        />
        <Button type="submit" variant="secondary">
          Ara
        </Button>
        {arama ? (
          <Button type="button" variant="ghost" asChild>
            <Link href="/urunler">Temizle</Link>
          </Button>
        ) : null}
      </form>

      {urunler.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {arama ? "Aramaya uyan ürün yok." : "Henüz ürün eklenmemiş."}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {arama
              ? "Farklı bir kelime deneyin."
              : "Sağ üstteki Yeni Ürün düğmesiyle başlayın."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ürün</TableHead>
                <TableHead>Marka</TableHead>
                <TableHead className="text-right">Varyant</TableHead>
                <TableHead className="text-right">Toplam stok</TableHead>
                <TableHead>Oluşturma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {urunler.map((urun) => (
                <TableRow key={urun.id}>
                  <TableCell>
                    <Link
                      href={`/urunler/${urun.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {urun.name}
                    </Link>
                    {!urun.isActive ? (
                      <Badge variant="secondary" className="ml-2">
                        pasif
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {urun.brand ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {urun.variants.length}
                  </TableCell>
                  <TableCell className="text-right">
                    {toplamStok(urun.variants)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {tarihFormatla(urun.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
