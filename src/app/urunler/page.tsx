import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Eye, Pencil, Plus } from "lucide-react";

import { ExcelIndir } from "@/components/excel-indir";
import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { UzunAd } from "@/components/uzun-ad";
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
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("urunler") };
}

export default async function UrunlerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const arama = (q ?? "").trim();
  const bicim = await bicimlendirici();
  const t = await getTranslations("Urunler");
  const ortak = await getTranslations("Ortak");

  const urunler = await prisma.product.findMany({
    where: arama
      ? {
          OR: [
            { name: { contains: arama } },
            { brand: { contains: arama } },
            { variants: { some: { sku: { contains: arama } } } },
            { variants: { some: { companySku: { contains: arama } } } },
            { variants: { some: { barcode: { contains: arama } } } },
          ],
        }
      : undefined,
    include: {
      variants: {
        select: {
          id: true,
          sku: true,
          companySku: true,
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
        <SatirEylemi
          href={`/urunler/${urun.id}`}
          ikon={Eye}
          etiket={ortak("detay")}
        />
        <SatirEylemi
          href={`/urunler/${urun.id}/duzenle`}
          ikon={Pencil}
          etiket={ortak("duzenle")}
        />
        <SilButonu urunId={urun.id} urunAdi={urun.name} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">
            {ortak("kayitSayisi", { sayi: urunler.length })}
            {arama ? ortak("aramaEki", { arama }) : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExcelIndir liste="urunler" parametreler={{ q: arama }} />
          <Button asChild>
            <Link href="/urunler/yeni">
              <Plus />
              {t("yeniUrun")}
            </Link>
          </Button>
        </div>
      </div>

      <form action="/urunler" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={arama}
          placeholder={t("aramaIpucu")}
          className="max-w-sm min-w-48 flex-1"
        />
        <Button type="submit" variant="secondary">
          {ortak("ara")}
        </Button>
        {arama ? (
          <Button type="button" variant="ghost" asChild>
            <Link href="/urunler">{ortak("temizle")}</Link>
          </Button>
        ) : null}
      </form>

      {urunler.length === 0 ? (
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
                  <TableHead>{ortak("marka")}</TableHead>
                  <TableHead>{ortak("firmaSku")}</TableHead>
                  <TableHead>{ortak("barkod")}</TableHead>
                  <TableHead className="text-right">
                    {ortak("varyant")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("sutunToplamStok")}
                  </TableHead>
                  <TableHead>{t("sutunOlusturma")}</TableHead>
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urunler.map((urun) => {
                  const ana = anaVaryant(urun);
                  return (
                    <TableRow key={urun.id}>
                      {/* Uzun ad üç noktayla kesilir; tamamı `title`'da ve
                          Detay düğmesinde. Sınır hücreye değil içindeki
                          bloğa konur — `<td>` üzerinde `max-width` yok
                          sayılıyor (bkz. UzunAd). */}
                      <TableCell>
                        <UzunAd
                          metin={urun.name}
                          href={`/urunler/${urun.id}`}
                          ek={
                            !urun.isActive ? (
                              <Badge variant="secondary">{ortak("pasif")}</Badge>
                            ) : null
                          }
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {urun.brand ?? "—"}
                      </TableCell>
                      <TableCell>
                        <KopyalanabilirKod
                          deger={ana?.companySku}
                          etiket={ortak("firmaSku")}
                        />
                      </TableCell>
                      <TableCell>
                        <KopyalanabilirKod
                          deger={ana?.barcode}
                          etiket={ortak("barkod")}
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
                      <TableCell className="whitespace-nowrap">
                        <SatirEylemleri>{eylemler(urun)}</SatirEylemleri>
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
                      etiket: ortak("firmaSku"),
                      deger: (
                        <KopyalanabilirKod
                          deger={ana?.companySku}
                          etiket={ortak("firmaSku")}
                        />
                      ),
                    },
                    {
                      etiket: ortak("barkod"),
                      deger: (
                        <KopyalanabilirKod
                          deger={ana?.barcode}
                          etiket={ortak("barkod")}
                        />
                      ),
                    },
                    { etiket: ortak("varyant"), deger: urun.variants.length },
                    {
                      etiket: t("sutunToplamStok"),
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
