import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Eye, Pencil, Plus } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
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
import { bicimlendirici } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";
import { urunStoklari } from "@/lib/stok";

import { SilButonu } from "./sil-butonu";

export async function generateMetadata() {
  const t = await getTranslations("Basliklar");
  return { title: t("urunler") };
}

export default async function UrunlerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const arama = (q ?? "").trim();
  const bicim = await bicimlendirici();

  const urunler = await prisma.product.findMany({
    where: arama
      ? {
          OR: [
            { name: { contains: arama } },
            { brand: { contains: arama } },
            { variants: { some: { sku: { contains: arama } } } },
            { variants: { some: { axcaliSku: { contains: arama } } } },
            { variants: { some: { barcode: { contains: arama } } } },
          ],
        }
      : undefined,
    include: {
      variants: {
        select: {
          id: true,
          sku: true,
          axcaliSku: true,
          barcode: true,
          isDefault: true,
        },
        orderBy: { isDefault: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Stok hesabı tek yerde: src/lib/stok.ts (ledger toplamı).
  const stokHaritasi = await urunStoklari(urunler);

  /** Listede gösterilecek kodlar ilk (varsayılan) varyanttan gelir. */
  function anaVaryant(urun: (typeof urunler)[number]) {
    return urun.variants[0];
  }

  function eylemler(urun: (typeof urunler)[number]) {
    return (
      <>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/urunler/${urun.id}`}>
            <Eye />
            Detay
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/urunler/${urun.id}/duzenle`}>
            <Pencil />
            Düzenle
          </Link>
        </Button>
        <SilButonu urunId={urun.id} urunAdi={urun.name} />
      </>
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

      <form action="/urunler" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={arama}
          placeholder="Ad, marka, SKU veya barkod ile ara..."
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
              ? "Farklı bir kelime, SKU veya barkod deneyin."
              : "Sağ üstteki Yeni Ürün düğmesiyle başlayın."}
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
                  <TableHead>Marka</TableHead>
                  <TableHead>Firma SKU</TableHead>
                  <TableHead>Barkod</TableHead>
                  <TableHead className="text-right">Varyant</TableHead>
                  <TableHead className="text-right">Toplam stok</TableHead>
                  <TableHead>Oluşturma</TableHead>
                  <TableHead>Eylemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urunler.map((urun) => {
                  const ana = anaVaryant(urun);
                  return (
                    <TableRow key={urun.id}>
                      <TableCell>
                        <Baglanti href={`/urunler/${urun.id}`}>
                          {urun.name}
                        </Baglanti>
                        {!urun.isActive ? (
                          <Badge variant="secondary" className="ml-2">
                            pasif
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {urun.brand ?? "—"}
                      </TableCell>
                      <TableCell>
                        <KopyalanabilirKod
                          deger={ana?.axcaliSku}
                          etiket="Firma SKU"
                        />
                      </TableCell>
                      <TableCell>
                        <KopyalanabilirKod
                          deger={ana?.barcode}
                          etiket="Barkod"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {urun.variants.length}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {stokHaritasi.get(urun.id) ?? 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {bicim.tarih(urun.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {eylemler(urun)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {urunler.map((urun) => {
              const ana = anaVaryant(urun);
              return (
                <ListeKarti
                  key={urun.id}
                  baslik={
                    <Baglanti href={`/urunler/${urun.id}`}>
                      {urun.name}
                    </Baglanti>
                  }
                  altBaslik={urun.brand ?? undefined}
                  alanlar={[
                    {
                      etiket: "Firma SKU",
                      deger: (
                        <KopyalanabilirKod
                          deger={ana?.axcaliSku}
                          etiket="Firma SKU"
                        />
                      ),
                    },
                    {
                      etiket: "Barkod",
                      deger: (
                        <KopyalanabilirKod
                          deger={ana?.barcode}
                          etiket="Barkod"
                        />
                      ),
                    },
                    { etiket: "Varyant", deger: urun.variants.length },
                    {
                      etiket: "Toplam stok",
                      deger: (
                        <span className="font-medium">
                          {stokHaritasi.get(urun.id) ?? 0}
                        </span>
                      ),
                    },
                  ]}
                  eylemler={eylemler(urun)}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
