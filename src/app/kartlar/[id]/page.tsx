import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { Baglanti, GeriBaglanti } from "@/components/baglanti";
import { DurumDegistirButonu } from "@/components/durum-degistir-butonu";
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
import { getTranslations } from "next-intl/server";

import { alimDurumEtiketleri } from "@/lib/etiketler";
import { bicimlendirici } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";
import { kalemToplamlari, toplamlariBirlestir } from "@/lib/tutar";

import { kartDurumDegistir } from "../actions";

export default async function KartDetaySayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const kart = await prisma.creditCard.findUnique({
    where: { id },
    include: {
      purchases: {
        include: {
          items: true,
          channelAccount: { include: { channel: { select: { name: true } } } },
        },
        orderBy: { purchasedAt: "desc" },
      },
    },
  });

  if (!kart) notFound();

  const bicim = await bicimlendirici();
  const durumEtiketleri = await alimDurumEtiketleri();
  const t = await getTranslations("Kart");
  const ortak = await getTranslations("Ortak");

  // Para birimleri BİRBİRİNE ÇEVRİLMEZ; her biri ayrı toplanır.
  const kartToplamlari = toplamlariBirlestir(
    kart.purchases.map((alim) => kalemToplamlari(alim.items)),
  );

  return (
    <div className="space-y-6">
      <div>
        <GeriBaglanti href="/kartlar">Kredi Kartları</GeriBaglanti>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
              {kart.label}
              {kart.isActive ? null : (
                <Badge variant="outline">{ortak("pasif")}</Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">
              {kart.bankName ?? t("bankaBelirtilmemis")} · •••• {kart.last4}
              {kart.holderName ? ` · ${kart.holderName}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/kartlar/${kart.id}/duzenle`}>
                <Pencil />
                {ortak("duzenle")}
              </Link>
            </Button>
            <DurumDegistirButonu
              kayitId={kart.id}
              aktifMi={kart.isActive}
              action={kartDurumDegistir}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("hesapKesim")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {kart.statementDay
              ? t("ayinGunu", { gun: kart.statementDay })
              : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {t("sonOdeme")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {kart.dueDay ? t("ayinGunu", { gun: kart.dueDay }) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {ortak("limit")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {kart.creditLimitAmount
              ? bicim.para(
                  kart.creditLimitAmount,
                  kart.creditLimitCurrency ?? kart.currency,
                )
              : "—"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("kartlaYapilanAlimlar", { sayi: kart.purchases.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {kartToplamlari.length ? (
            <div className="flex flex-wrap gap-3">
              {kartToplamlari.map((toplam) => (
                <div
                  key={toplam.paraBirimi}
                  className="rounded-lg border px-4 py-2"
                >
                  <div className="text-muted-foreground text-xs">
                    {ortak("paraBirimiToplami", {
                      paraBirimi: toplam.paraBirimi,
                    })}
                  </div>
                  <div className="text-lg font-semibold">
                    {bicim.para(toplam.tutar, toplam.paraBirimi)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <p className="text-muted-foreground text-xs">{t("toplamNotu")}</p>

          {kart.purchases.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("alimYok")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ortak("siparisNo")}</TableHead>
                    <TableHead>{ortak("tarih")}</TableHead>
                    <TableHead>{ortak("kanalHesabi")}</TableHead>
                    <TableHead className="text-right">
                      {ortak("kalem")}
                    </TableHead>
                    <TableHead>{ortak("tutar")}</TableHead>
                    <TableHead>{ortak("durum")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kart.purchases.map((alim) => (
                    <TableRow key={alim.id}>
                      <TableCell>
                        <Baglanti href={`/alimlar/${alim.id}`}>
                          {alim.code}
                        </Baglanti>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {bicim.tarih(alim.purchasedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {alim.channelAccount
                          ? `${alim.channelAccount.channel.name} — ${alim.channelAccount.name}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {alim.items.length}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {kalemToplamlari(alim.items)
                          .map((t) => bicim.para(t.tutar, t.paraBirimi))
                          .join(" + ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {durumEtiketleri[alim.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
