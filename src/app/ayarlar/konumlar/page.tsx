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
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("rafKonumlari") };
}

export default async function KonumlarSayfasi() {
  const konumlar = await prisma.location.findMany({
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
    include: { _count: { select: { variants: true } } },
  });

  const t = await getTranslations("Raf");
  const ortak = await getTranslations("Ortak");

  function eylemler(konum: (typeof konumlar)[number]) {
    return (
      <>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/ayarlar/konumlar/${konum.id}/duzenle`}>
            <Pencil />
            {ortak("duzenle")}
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
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/ayarlar/konumlar/etiketler">
            <QrCode />
            {t("qrEtiketleri")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("yeniRaf")}</CardTitle>
        </CardHeader>
        <CardContent>
          <KonumFormu />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("tanimliRaflar", { sayi: konumlar.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {konumlar.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("bosBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("bosIpucu")}
              </p>
            </div>
          ) : (
            <>
              {/* -------------------- MASAÜSTÜ: TABLO -------------------- */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ortak("kod")}</TableHead>
                      <TableHead>{ortak("ad")}</TableHead>
                      <TableHead className="text-right">
                        {t("varyantSutunu")}
                      </TableHead>
                      <TableHead>{ortak("durum")}</TableHead>
                      <TableHead>{ortak("eylemler")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {konumlar.map((konum) => (
                      <TableRow key={konum.id}>
                        <TableCell>
                          <KopyalanabilirKod
                            deger={konum.code}
                            etiket={t("rafKodu")}
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
                            <Badge variant="secondary">{ortak("aktif")}</Badge>
                          ) : (
                            <Badge variant="outline">{ortak("pasif")}</Badge>
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
                        etiket={t("rafKodu")}
                      />
                    }
                    altBaslik={konum.name ?? undefined}
                    alanlar={[
                      {
                        etiket: ortak("durum"),
                        deger: konum.isActive ? (
                          <Badge variant="secondary">{ortak("aktif")}</Badge>
                        ) : (
                          <Badge variant="outline">{ortak("pasif")}</Badge>
                        ),
                      },
                      {
                        etiket: t("varyantSutunu"),
                        deger: konum._count.variants,
                      },
                    ]}
                    eylemler={eylemler(konum)}
                  />
                ))}
              </div>
            </>
          )}

          <p className="text-muted-foreground mt-3 text-xs">{t("listeNotu")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
