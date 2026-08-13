import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import Link from "next/link";
import { Merge, Pencil, QrCode, TriangleAlert } from "lucide-react";

import { DurumDegistirButonu } from "@/components/durum-degistir-butonu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { Badge } from "@/components/ui/badge";
import { rafKoduGecerliMi } from "@/lib/kimlik";
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

/**
 * VERİTABANI OKUYAN SAYFA — HER İSTEKTE ÇİZİLİR.
 *
 * Statik kipte Next bu sayfayı DERLEME ANINDA üretmeye çalışır ve o sırada
 * veritabanına bağlanması gerekir. Derlemenin veritabanına bağımlı olması
 * kırılgandır (Vercel yapı makinesi uzak MySQL'e erişemeyebilir) ve zaten
 * bir ERP'de liste ekranı canlı veri göstermelidir.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("rafKonumlari") };
}

export default async function KonumlarSayfasi() {
  await sayfaIzni("ayar.yaz");

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

  // Standarda uymayan kodlar ÇALIŞMAYA DEVAM EDER — geçmişi bozmamak için
  // zorla düzeltilmez. Ama görünür olur: kod değişirse etiket yeniden basılır,
  // bu yüzden karar kullanıcınındır.
  const bicimsizSayi = konumlar.filter((k) => !rafKoduGecerliMi(k.code)).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/ayarlar/konumlar/birlestir">
              <Merge />
              {t("birlestir")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/ayarlar/konumlar/etiketler">
              <QrCode />
              {t("qrEtiketleri")}
            </Link>
          </Button>
        </div>
      </div>

      {bicimsizSayi > 0 ? (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            <TriangleAlert className="size-4 shrink-0" />
            {t("bicimsizBaslik", { sayi: bicimsizSayi })}
          </p>
          <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-300/90">
            {t("bicimsizMetin")}
          </p>
        </div>
      ) : null}

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
                          <span className="flex flex-wrap items-center gap-2">
                            <KopyalanabilirKod
                              deger={konum.code}
                              etiket={t("rafKodu")}
                            />
                            {rafKoduGecerliMi(konum.code) ? null : (
                              <Badge
                                variant="outline"
                                className="border-amber-500/50 text-amber-700 dark:text-amber-400"
                              >
                                {t("bicimsizRozet")}
                              </Badge>
                            )}
                          </span>
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
