import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageCheck } from "lucide-react";

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
import { alimDurumuEtiketi } from "@/lib/etiketler";
import { paraFormatla, tarihFormatla } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { kalemIlerlemesi, kalemTeslimAlinanlar } from "@/lib/stok";
import { kalemToplamlari } from "@/lib/tutar";

export default async function AlimDetaySayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const alim = await prisma.purchase.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { select: { name: true, brand: true } },
              location: { select: { code: true } },
            },
          },
        },
      },
      creditCard: true,
      channelAccount: { include: { channel: { select: { name: true } } } },
    },
  });

  if (!alim) notFound();

  const toplamlar = kalemToplamlari(alim.items);

  // Teslim alınan sağlam adetler ledger'dan gelir (src/lib/stok.ts).
  const teslimAlinanlar = await kalemTeslimAlinanlar(
    alim.items.map((k) => k.id),
  );

  const kabulEdilebilir =
    alim.status !== "CANCELLED" && alim.status !== "RECEIVED";

  const bilgiler: { etiket: string; deger: string }[] = [
    { etiket: "Alım tarihi", deger: tarihFormatla(alim.purchasedAt) },
    {
      etiket: "Teslim alındı",
      deger: alim.receivedAt ? tarihFormatla(alim.receivedAt) : "—",
    },
    {
      etiket: "Kanal hesabı",
      deger: alim.channelAccount
        ? `${alim.channelAccount.channel.name} — ${alim.channelAccount.name}`
        : "—",
    },
    {
      etiket: "Ödenen kart",
      deger: alim.creditCard
        ? `${alim.creditCard.label} (•••• ${alim.creditCard.last4})`
        : "—",
    },
    {
      etiket: "Taksit",
      deger:
        alim.installmentCount > 1
          ? `${alim.installmentCount} taksit`
          : "Tek çekim",
    },
    { etiket: "Tedarikçi", deger: alim.supplierName ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/alimlar"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← Alımlar
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{alim.code}</h1>
            <p className="text-muted-foreground text-sm">
              {tarihFormatla(alim.purchasedAt)} · {alim.items.length} kalem
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {alimDurumuEtiketi(alim.status)}
            </Badge>
            {kabulEdilebilir ? (
              <Button asChild>
                <Link href={`/alimlar/${alim.id}/mal-kabul`}>
                  <PackageCheck />
                  Mal Kabul Et
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alım bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bilgiler.map((bilgi) => (
              <div key={bilgi.etiket}>
                <dt className="text-muted-foreground text-xs">
                  {bilgi.etiket}
                </dt>
                <dd className="text-sm font-medium">{bilgi.deger}</dd>
              </div>
            ))}
          </dl>
          {alim.note ? (
            <div className="mt-4">
              <div className="text-muted-foreground text-xs">Not</div>
              <p className="text-sm whitespace-pre-line">{alim.note}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kalemler ({alim.items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Raf</TableHead>
                  <TableHead className="text-right">Beklenen</TableHead>
                  <TableHead className="text-right">Sağlam</TableHead>
                  <TableHead className="text-right">Hasarlı</TableHead>
                  <TableHead className="text-right">Kalan</TableHead>
                  <TableHead className="text-right">Birim fiyat</TableHead>
                  <TableHead className="text-right">Satır toplamı</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alim.items.map((kalem) => {
                  const birim = Number(kalem.unitCostAmount.toString());
                  const ilerleme = kalemIlerlemesi(
                    kalem.quantity,
                    teslimAlinanlar.get(kalem.id) ?? 0,
                    kalem.damagedQuantity,
                  );

                  return (
                    <TableRow key={kalem.id}>
                      <TableCell>
                        <Link
                          href={`/urunler/${kalem.variant.productId}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {kalem.variant.product.name}
                        </Link>
                        {kalem.variant.name ? (
                          <div className="text-muted-foreground text-xs">
                            {kalem.variant.name}
                          </div>
                        ) : null}
                        <div className="text-muted-foreground font-mono text-xs">
                          {kalem.variant.sku}
                        </div>
                        {kalem.damageNote ? (
                          <div className="text-destructive mt-1 text-xs whitespace-pre-line">
                            {kalem.damageNote}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {kalem.variant.location ? (
                          <Badge variant="secondary">
                            {kalem.variant.location.code}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {ilerleme.beklenen}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {ilerleme.saglam}
                      </TableCell>
                      <TableCell className="text-right">
                        {ilerleme.hasarli > 0 ? (
                          <span className="text-destructive font-medium">
                            {ilerleme.hasarli}
                          </span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {ilerleme.tamamlandiMi ? (
                          <Badge variant="secondary">tamam</Badge>
                        ) : (
                          <span className="font-medium">{ilerleme.kalan}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {paraFormatla(
                          kalem.unitCostAmount,
                          kalem.unitCostCurrency,
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {paraFormatla(
                          birim * kalem.quantity,
                          kalem.unitCostCurrency,
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap gap-3">
            {toplamlar.map((toplam) => (
              <div
                key={toplam.paraBirimi}
                className="rounded-lg border px-4 py-2"
              >
                <div className="text-muted-foreground text-xs">
                  {toplam.paraBirimi} toplamı
                </div>
                <div className="text-lg font-semibold">
                  {paraFormatla(toplam.tutar, toplam.paraBirimi)}
                </div>
              </div>
            ))}
          </div>

          <p className="text-muted-foreground text-xs">
            &quot;Sağlam&quot; sütunu stok defterinden hesaplanır. Hasarlı
            ürünler stoğa girmez; satıcıya iade ve tazminat süreci sonraki
            fazlarda gelecek. Yanlış bir giriş silinmez, ters işaretli bir
            ADJUSTMENT kaydıyla düzeltilir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
