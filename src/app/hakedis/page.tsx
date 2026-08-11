import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { TriangleAlert, Upload } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
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
import { isTakvimGunu, gunDegeri } from "@/lib/donem";
import { odemeDurumu } from "@/lib/hakedis/eslestir";
import { HAKEDIS_ESIKLERI } from "@/lib/hakedis/model";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("hakedis") };
}

export default async function HakedisSayfasi() {
  const t = await getTranslations("Hakedis");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const [partiler, kalemler] = await Promise.all([
    prisma.settlement.findMany({
      include: {
        channelAccount: { include: { channel: { select: { name: true } } } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.settlementItem.findMany({
      include: {
        channelAccount: { include: { channel: { select: { name: true } } } },
        sale: { select: { id: true, code: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  // "Bugün" İŞ saat diliminden — vade karşılaştırması gün-güne yapılır.
  const bugun = gunDegeri(isTakvimGunu(new Date()));

  /**
   * BEKLEYEN PARA: ödeme tarihi olmayan kalemler.
   * Beklenen tutar HENÜZ karşılaştırılmıyor (kâr motoru ile eşleme sonraki
   * iş); bu yüzden EKSIK/FAZLA ödeme durumu üretilmiyor, yalnız
   * bekliyor/gecikti ayrımı yapılıyor.
   */
  const bekleyenler = kalemler
    .filter((k) => k.paidAt === null)
    .map((k) => ({
      kayit: k,
      durum: odemeDurumu({
        beklenenTutar: null,
        gerceklesenTutar: null,
        vade: k.dueDate,
        odendiMi: false,
        bugun,
      }),
    }));

  const geciken = bekleyenler.filter((b) => b.durum === "GECIKTI");

  // Para birimi başına bekleyen toplam.
  const bekleyenToplam = new Map<string, number>();
  for (const b of bekleyenler) {
    const tutar = Number(b.kayit.amount.toString());
    bekleyenToplam.set(
      b.kayit.currency,
      (bekleyenToplam.get(b.kayit.currency) ?? 0) + tutar,
    );
  }

  const eslesmemis = kalemler.filter(
    (k) => k.saleId === null && k.orderNo !== null,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
        </div>
        <Button asChild>
          <Link href="/hakedis/yukle">
            <Upload />
            {t("yukle")}
          </Link>
        </Button>
      </div>

      {kalemler.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{t("bosBaslik")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("bosIpucu")}</p>
        </div>
      ) : (
        <>
          {/* ----------------------- BEKLEYEN PARA ---------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>{t("bekleyenPara")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-6">
                {[...bekleyenToplam.entries()].map(([para, tutar]) => (
                  <div key={para}>
                    <div className="text-2xl font-semibold">
                      {bicim.para(tutar, para)}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {bekleyenler.length} {t("sutunKalem").toLowerCase()}
                    </div>
                  </div>
                ))}
                {bekleyenToplam.size === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("bekleyenParaNotu")}
                  </p>
                ) : null}
              </div>

              {geciken.length > 0 ? (
                <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                    <TriangleAlert className="size-4 shrink-0" />
                    {geciken.length} {t("gecikti")}
                  </p>
                  <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-300/90">
                    {t("gecikmeNotu", { gun: HAKEDIS_ESIKLERI.gecikmeIsGunu })}
                  </p>
                </div>
              ) : null}

              <p className="text-muted-foreground text-xs">
                {t("bekleyenParaNotu")}
              </p>
            </CardContent>
          </Card>

          {/* -------------------- EŞLEŞMEYEN KALEMLER ------------------- */}
          {eslesmemis.length > 0 ? (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {t("eslesmemisKalem", { sayi: eslesmemis.length })}
              </p>
              <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-300/90">
                {t("eslesmemisNotu")}
              </p>
            </div>
          ) : null}

          {/* -------------------------- KALEMLER ------------------------ */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("partiler", { sayi: partiler.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* ------------------ MASAÜSTÜ: TABLO ------------------- */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sutunDosya")}</TableHead>
                      <TableHead>{t("sutunKanal")}</TableHead>
                      <TableHead className="text-right">
                        {t("sutunKalem")}
                      </TableHead>
                      <TableHead>{t("sutunOdeme")}</TableHead>
                      <TableHead className="text-right">
                        {t("sutunTutar")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partiler.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="max-w-[20rem]">
                          <span className="block truncate">
                            {p.sourceFile ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.channelAccount.channel.name} —{" "}
                          {p.channelAccount.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {p._count.items}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {p.paidAt ? (
                            bicim.tarih(p.paidAt)
                          ) : (
                            <Badge variant="outline">{t("odenmedi")}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {bicim.para(p.amount, p.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* -------------------- TELEFON: KART ------------------- */}
              <div className="space-y-3 md:hidden">
                {partiler.map((p) => (
                  <ListeKarti
                    key={p.id}
                    baslik={p.sourceFile ?? "—"}
                    altBaslik={`${p.channelAccount.channel.name} — ${p.channelAccount.name}`}
                    alanlar={[
                      { etiket: t("sutunKalem"), deger: p._count.items },
                      {
                        etiket: t("sutunOdeme"),
                        deger: p.paidAt ? bicim.tarih(p.paidAt) : t("odenmedi"),
                      },
                      {
                        etiket: t("sutunTutar"),
                        deger: bicim.para(p.amount, p.currency),
                      },
                    ]}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ----------------- BEKLEYEN KALEM DÖKÜMÜ -------------------- */}
          {bekleyenler.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("bekleyenPara")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="hidden overflow-x-auto rounded-lg border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ortak("tarih")}</TableHead>
                        <TableHead>{ortak("siparisNo")}</TableHead>
                        {/* HB'de bu alan bir FATURA numarasıdır ve o
                            faturanın tüm kalemleri aynı numarayı taşır. */}
                        <TableHead>{t("faturaNo")}</TableHead>
                        <TableHead>{t("sutunKalem")}</TableHead>
                        <TableHead className="text-right">
                          {t("sutunTutar")}
                        </TableHead>
                        <TableHead>{ortak("durum")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bekleyenler.slice(0, 100).map(({ kayit, durum }) => (
                        <TableRow key={kayit.id}>
                          <TableCell className="whitespace-nowrap">
                            {kayit.dueDate ? (
                              bicim.tarih(kayit.dueDate)
                            ) : (
                              <span className="text-muted-foreground">
                                {t("vadeYok")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {kayit.sale ? (
                              <Baglanti href={`/satislar/${kayit.sale.id}`}>
                                {kayit.sale.code ?? kayit.orderNo}
                              </Baglanti>
                            ) : (
                              <span className="text-muted-foreground">
                                {kayit.orderNo ?? "—"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <KopyalanabilirKod
                              deger={kayit.externalId}
                              etiket={t("faturaNo")}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {kayit.rawType ?? kayit.code}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {bicim.para(kayit.amount, kayit.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                durum === "GECIKTI" ? "secondary" : "outline"
                              }
                            >
                              {durum === "GECIKTI"
                                ? t("gecikti")
                                : t("bekliyor")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-muted-foreground text-xs">
                  {t("faturaNoNotu")}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
