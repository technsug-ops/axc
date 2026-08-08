import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { paraFormatla } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Kredi Kartları — Axcali ERP" };

export default async function KartlarSayfasi() {
  const kartlar = await prisma.creditCard.findMany({
    include: { _count: { select: { purchases: true } } },
    orderBy: [{ isActive: "desc" }, { label: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Kredi Kartları</h1>
          <p className="text-muted-foreground text-sm">{kartlar.length} kart</p>
        </div>
        <Button asChild>
          <Link href="/kartlar/yeni">
            <Plus />
            Yeni Kart
          </Link>
        </Button>
      </div>

      {kartlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Henüz kart eklenmemiş.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Alım girerken hangi kartla ödediğinizi seçebilmek için en az bir
            kart gerekiyor.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kart</TableHead>
                <TableHead>Banka</TableHead>
                <TableHead>Sahibi</TableHead>
                <TableHead>Son 4</TableHead>
                <TableHead className="text-right">Kesim</TableHead>
                <TableHead className="text-right">Son ödeme</TableHead>
                <TableHead className="text-right">Limit</TableHead>
                <TableHead className="text-right">Alım</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kartlar.map((kart) => (
                <TableRow key={kart.id}>
                  <TableCell>
                    <Link
                      href={`/kartlar/${kart.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {kart.label}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {kart.bankName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {kart.holderName ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono">
                    •••• {kart.last4}
                  </TableCell>
                  <TableCell className="text-right">
                    {kart.statementDay ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {kart.dueDay ?? "—"}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {kart.creditLimitAmount
                      ? paraFormatla(
                          kart.creditLimitAmount,
                          kart.creditLimitCurrency ?? kart.currency,
                        )
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {kart._count.purchases}
                  </TableCell>
                  <TableCell>
                    {kart.isActive ? (
                      <Badge variant="secondary">aktif</Badge>
                    ) : (
                      <Badge variant="outline">pasif</Badge>
                    )}
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
