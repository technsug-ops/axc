import { getTranslations } from "next-intl/server";
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

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("stok") };
}

export default async function StokSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const arama = (q ?? "").trim();
  const bicim = await bicimlendirici();
  const t = await getTranslations("Stok");
  const ortak = await getTranslations("Ortak");

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
            {t("hareketler")}
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/urunler/${varyant.product.id}`}>
            <Package />
            {t("urunKarti")}
          </Link>
        </Button>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("ozet", { varyant: varyantlar.length, adet: toplamStok })}
          {arama ? ortak("aramaEki", { arama }) : ""}
        </p>
      </div>

      <StokArama baslangic={arama} />

      {varyantlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {arama ? t("bosAramaBaslik") : t("bosBaslik")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {arama ? t("bosAramaIpucu") : t("bosIpucu")}
          </p>
        </div>
      ) : (
        <>
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ortak("urun")}</TableHead>
                  <TableHead>{ortak("varyant")}</TableHead>
                  <TableHead>{ortak("firmaSku")}</TableHead>
                  <TableHead>{ortak("barkod")}</TableHead>
                  <TableHead>{ortak("raf")}</TableHead>
                  <TableHead className="text-right">
                    {t("mevcutStok")}
                  </TableHead>
                  <TableHead>{t("sonHareket")}</TableHead>
                  <TableHead>{ortak("eylemler")}</TableHead>
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
                      {varyant.name ?? t("varsayilan")}
                    </TableCell>
                    <TableCell>
                      <KopyalanabilirKod
                        deger={varyant.axcaliSku}
                        etiket={ortak("firmaSku")}
                      />
                    </TableCell>
                    <TableCell>
                      <KopyalanabilirKod
                        deger={varyant.barcode}
                        etiket={ortak("barkod")}
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
                altBaslik={varyant.name ?? t("varsayilanVaryant")}
                alanlar={[
                  {
                    etiket: t("mevcutStok"),
                    deger: (
                      <span className="text-base font-semibold">
                        {stoklar.get(varyant.id) ?? 0}
                      </span>
                    ),
                  },
                  {
                    etiket: ortak("raf"),
                    deger: varyant.location ? (
                      <Badge variant="secondary">
                        {varyant.location.code}
                      </Badge>
                    ) : (
                      "—"
                    ),
                  },
                  {
                    etiket: ortak("firmaSku"),
                    deger: (
                      <KopyalanabilirKod
                        deger={varyant.axcaliSku}
                        etiket={ortak("firmaSku")}
                      />
                    ),
                  },
                  {
                    etiket: ortak("barkod"),
                    deger: (
                      <KopyalanabilirKod
                        deger={varyant.barcode}
                        etiket={ortak("barkod")}
                      />
                    ),
                  },
                  {
                    etiket: t("sonHareket"),
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
        {t("listeNotu")}
      </p>
    </div>
  );
}
