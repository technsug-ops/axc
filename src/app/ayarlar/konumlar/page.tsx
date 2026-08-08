import Link from "next/link";
import { QrCode } from "lucide-react";

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
import { prisma } from "@/lib/prisma";

import { KonumFormu } from "./konum-formu";

export const metadata = { title: "Raf Konumları — Axcali ERP" };

export default async function KonumlarSayfasi() {
  const konumlar = await prisma.location.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { variants: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Raf Konumları</h1>
          <p className="text-muted-foreground text-sm">
            Depodaki raf kodlarını buradan tanımlarsınız. Ürün formundaki raf
            seçimi bu listeden beslenir.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/ayarlar/konumlar/etiketler">
            <QrCode />
            QR Etiketleri
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yeni raf</CardTitle>
        </CardHeader>
        <CardContent>
          <KonumFormu />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tanımlı raflar ({konumlar.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {konumlar.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Henüz raf tanımlanmamış.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Örnek kodlar: A-01, A-02, B-03
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead className="text-right">Varyant</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {konumlar.map((konum) => (
                    <TableRow key={konum.id}>
                      <TableCell className="font-mono font-medium">
                        {konum.code}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {konum.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {konum._count.variants}
                      </TableCell>
                      <TableCell>
                        {konum.isActive ? (
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
        </CardContent>
      </Card>
    </div>
  );
}
