import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Pencil, QrCode } from "lucide-react";

import { DurumDegistirButonu } from "@/components/durum-degistir-butonu";
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
import { prisma } from "@/lib/prisma";

import { konumDurumDegistir } from "./actions";
import { KonumFormu } from "./konum-formu";

export async function generateMetadata() {
  const t = await getTranslations("Basliklar");
  return { title: t("rafKonumlari") };
}

export default async function KonumlarSayfasi() {
  const konumlar = await prisma.location.findMany({
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
    include: { _count: { select: { variants: true } } },
  });

  function eylemler(konum: (typeof konumlar)[number]) {
    return (
      <>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/ayarlar/konumlar/${konum.id}/duzenle`}>
            <Pencil />
            Düzenle
          </Link>
        </Button>
        <DurumDegistirButonu
          kayitId={konum.id}
          aktifMi={konum.isActive}
          action={konumDurumDegistir}
        />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Raf Konumları</h1>
          <p className="text-muted-foreground text-sm">
            Depodaki raf kodlarını buradan tanımlarsınız. Ürün formundaki ve
            mal kabuldeki raf seçimi bu listeden beslenir.
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
            <>
              {/* -------------------- MASAÜSTÜ: TABLO -------------------- */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kod</TableHead>
                      <TableHead>Ad</TableHead>
                      <TableHead className="text-right">Varyant</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Eylemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {konumlar.map((konum) => (
                      <TableRow key={konum.id}>
                        <TableCell>
                          <KopyalanabilirKod
                            deger={konum.code}
                            etiket="Raf kodu"
                          />
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
                        <TableCell>
                          <div className="flex flex-wrap items-start gap-2">
                            {eylemler(konum)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* --------------------- TELEFON: KART --------------------- */}
              <div className="space-y-3 md:hidden">
                {konumlar.map((konum) => (
                  <ListeKarti
                    key={konum.id}
                    baslik={
                      <KopyalanabilirKod
                        deger={konum.code}
                        etiket="Raf kodu"
                      />
                    }
                    altBaslik={konum.name ?? undefined}
                    alanlar={[
                      {
                        etiket: "Durum",
                        deger: konum.isActive ? (
                          <Badge variant="secondary">aktif</Badge>
                        ) : (
                          <Badge variant="outline">pasif</Badge>
                        ),
                      },
                      { etiket: "Varyant", deger: konum._count.variants },
                    ]}
                    eylemler={eylemler(konum)}
                  />
                ))}
              </div>
            </>
          )}

          <p className="text-muted-foreground mt-3 text-xs">
            Raflar silinmez, pasife alınır — varyantlar ve stok hareketleri
            bu raflara referans veriyor olabilir. Pasif raf, seçim
            listelerinde çıkmaz ama geçmiş kayıtlarda görünmeye devam eder.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
