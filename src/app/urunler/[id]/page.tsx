import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { GeriBaglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
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
import { bicimlendirici } from "@/lib/bicim";
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

  const bicim = await bicimlendirici();

  // Stok hesabı tek yerde: src/lib/stok.ts (ledger toplamı).
  const stokHaritasi = await varyantStoklari(urun.variants.map((v) => v.id));

  return (
    <div className="space-y-6">
      <div>
        <GeriBaglanti href="/urunler">Ürünler</GeriBaglanti>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{urun.name}</h1>
            <p className="text-muted-foreground text-sm">
              {urun.brand ?? "Marka belirtilmemiş"} ·{" "}
              {bicim.tarih(urun.createdAt)} tarihinde eklendi
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/urunler/${urun.id}/duzenle`}>
                <Pencil />
                Düzenle
              </Link>
            </Button>
            <SilButonu urunId={urun.id} urunAdi={urun.name} boyut="default" />
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
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Varyant</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Firma SKU</TableHead>
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
                        etiket="Firma SKU"
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

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {urun.variants.map((varyant) => (
              <ListeKarti
                key={varyant.id}
                baslik={
                  <span className="flex flex-wrap items-center gap-2">
                    {varyant.name ?? "Varsayılan"}
                    {varyant.isDefault ? (
                      <Badge variant="outline">varsayılan</Badge>
                    ) : null}
                  </span>
                }
                altBaslik={
                  varyant.options.length
                    ? varyant.options
                        .map((o) => `${o.name}: ${o.value}`)
                        .join(" · ")
                    : undefined
                }
                alanlar={[
                  {
                    etiket: "Stok",
                    deger: (
                      <span className="text-base font-semibold">
                        {stokHaritasi.get(varyant.id) ?? 0}
                      </span>
                    ),
                  },
                  {
                    etiket: "Raf",
                    deger: varyant.location ? (
                      <Badge variant="secondary">{varyant.location.code}</Badge>
                    ) : (
                      "—"
                    ),
                  },
                  {
                    etiket: "SKU",
                    deger: (
                      <KopyalanabilirKod deger={varyant.sku} etiket="SKU" />
                    ),
                  },
                  {
                    etiket: "Firma SKU",
                    deger: (
                      <KopyalanabilirKod
                        deger={varyant.axcaliSku}
                        etiket="Firma SKU"
                      />
                    ),
                  },
                  {
                    etiket: "Barkod",
                    deger: (
                      <KopyalanabilirKod
                        deger={varyant.barcode}
                        etiket="Barkod"
                      />
                    ),
                  },
                ]}
              />
            ))}
          </div>
          <p className="text-muted-foreground mt-3 text-xs">
            Stok, bu varyantın tüm stok hareketlerinin toplamıdır. Alımlar mal
            kabul edildikçe artar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
