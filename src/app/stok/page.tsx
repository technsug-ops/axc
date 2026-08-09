import Link from "next/link";
import { History, Package } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
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
import { bicimlendirici } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";
import { sonHareketTarihleri, varyantStoklari } from "@/lib/stok";

import { StokArama } from "./stok-arama";

export const metadata = { title: "Stok" };

export default async function StokSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const arama = (q ?? "").trim();
  const bicim = await bicimlendirici();

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

  function eylemler(varyant: (typeof varyantlar)[number]) {
    return (
      <>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/stok/${varyant.id}`}>
            <History />
            Hareketler
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/urunler/${varyant.product.id}`}>
            <Package />
            Ürün kartı
          </Link>
        </Button>
      </>
    );
  }

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
        <>
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Varyant</TableHead>
                  <TableHead>Firma SKU</TableHead>
                  <TableHead>Barkod</TableHead>
                  <TableHead>Raf</TableHead>
                  <TableHead className="text-right">Mevcut stok</TableHead>
                  <TableHead>Son hareket</TableHead>
                  <TableHead>Eylemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {varyantlar.map((varyant) => (
                  <TableRow key={varyant.id}>
                    <TableCell>
                      <Baglanti href={`/stok/${varyant.id}`}>
                        {varyant.product.name}
                      </Baglanti>
                      {varyant.product.brand ? (
                        <div className="text-muted-foreground text-xs">
                          {varyant.product.brand}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {varyant.name ?? "Varsayılan"}
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
                    <TableCell className="text-right text-base font-semibold">
                      {stoklar.get(varyant.id) ?? 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {sonHareketler.get(varyant.id)
                        ? bicim.tarih(sonHareketler.get(varyant.id)!)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {eylemler(varyant)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {varyantlar.map((varyant) => (
              <ListeKarti
                key={varyant.id}
                baslik={
                  <Baglanti href={`/stok/${varyant.id}`}>
                    {varyant.product.name}
                  </Baglanti>
                }
                altBaslik={varyant.name ?? "Varsayılan varyant"}
                alanlar={[
                  {
                    etiket: "Mevcut stok",
                    deger: (
                      <span className="text-base font-semibold">
                        {stoklar.get(varyant.id) ?? 0}
                      </span>
                    ),
                  },
                  {
                    etiket: "Raf",
                    deger: varyant.location ? (
                      <Badge variant="secondary">
                        {varyant.location.code}
                      </Badge>
                    ) : (
                      "—"
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
                  {
                    etiket: "Son hareket",
                    deger: sonHareketler.get(varyant.id)
                      ? bicim.tarih(sonHareketler.get(varyant.id)!)
                      : "—",
                  },
                ]}
                eylemler={eylemler(varyant)}
              />
            ))}
          </div>
        </>
      )}

      <p className="text-muted-foreground text-xs">
        Mevcut stok, o varyantın tüm stok hareketlerinin toplamıdır.
      </p>
    </div>
  );
}
