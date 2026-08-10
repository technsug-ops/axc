import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { Badge } from "@/components/ui/badge";
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
import { hesapEtiketi } from "@/lib/ice-aktarma/referans";
import { prisma } from "@/lib/prisma";

import { KanalSkuFiltresi } from "./filtre";
import { SatirDuzenle } from "./satir-duzenle";
import { YeniEsleme } from "./yeni-esleme";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("kanalSku") };
}

export default async function KanalSkuSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hesap?: string; q?: string; eksik?: string }>;
}) {
  const { hesap, q, eksik } = await searchParams;
  const seciliHesap = hesap ?? "";
  const arama = (q ?? "").trim();
  const eksikOran = eksik === "1";

  const t = await getTranslations("KanalSku");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const [kayitlar, hesapKayitlari, eksikOranSayisi] = await Promise.all([
    prisma.channelSku.findMany({
      where: {
        ...(seciliHesap ? { channelAccountId: seciliHesap } : {}),
        ...(eksikOran ? { commissionRate: null } : {}),
        ...(arama
          ? {
              OR: [
                { channelSku: { contains: arama } },
                { variant: { sku: { contains: arama } } },
                { variant: { companySku: { contains: arama } } },
                { variant: { product: { name: { contains: arama } } } },
              ],
            }
          : {}),
      },
      include: {
        variant: {
          select: {
            sku: true,
            name: true,
            product: { select: { name: true } },
          },
        },
        channelAccount: {
          select: { name: true, channel: { select: { name: true } } },
        },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    }),
    prisma.channelAccount.findMany({
      where: { isActive: true },
      include: { channel: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.channelSku.count({ where: { commissionRate: null } }),
  ]);

  const hesaplar = hesapKayitlari.map((h) => ({
    id: h.id,
    etiket: hesapEtiketi(h.channel.name, h.name),
  }));

  const filtreVar = Boolean(seciliHesap || arama || eksikOran);

  function urunAdi(kayit: (typeof kayitlar)[number]) {
    const v = kayit.variant;
    return v.name ? `${v.product.name} — ${v.name}` : v.product.name;
  }

  function hesapAdi(kayit: (typeof kayitlar)[number]) {
    return hesapEtiketi(
      kayit.channelAccount.channel.name,
      kayit.channelAccount.name,
    );
  }

  function oranMetni(kayit: (typeof kayitlar)[number]) {
    return kayit.commissionRate === null
      ? ""
      : String(Number(kayit.commissionRate.toString()));
  }

  function duzenleyici(kayit: (typeof kayitlar)[number]) {
    return (
      <SatirDuzenle
        kayitId={kayit.id}
        sku={kayit.variant.sku}
        hesapEtiketi={hesapAdi(kayit)}
        kanalKodu={kayit.channelSku}
        oran={oranMetni(kayit)}
        aktifMi={kayit.isActive}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground max-w-3xl text-sm">
          {t("aciklamaMetni")}
        </p>
      </div>

      {/* Oranı eksik olanlar: raporda "kural eksik" diyen satışların kaynağı. */}
      {eksikOranSayisi > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
          <TriangleAlert className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {t("eksikOranSayisi", { sayi: eksikOranSayisi })}
          </span>
          <span className="text-xs text-amber-800 dark:text-amber-300">
            {t("eksikOranNotu")}
          </span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("yeniEsleme")}</CardTitle>
        </CardHeader>
        <CardContent>
          {hesaplar.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("hesapYokBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("hesapYokIpucu")}
              </p>
            </div>
          ) : (
            <YeniEsleme hesaplar={hesaplar} />
          )}
        </CardContent>
      </Card>

      <KanalSkuFiltresi
        hesaplar={hesaplar}
        seciliHesap={seciliHesap}
        arama={arama}
        eksikOran={eksikOran}
      />

      <div>
        <p className="text-muted-foreground text-sm">
          {t("toplamEsleme", { sayi: kayitlar.length })}
        </p>
        <p className="text-muted-foreground text-xs">{t("snapshotNotu")}</p>
      </div>

      {kayitlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {eksikOran
              ? t("eksikOranBosBaslik")
              : filtreVar
                ? t("bosFiltreBaslik")
                : t("bosBaslik")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {eksikOran
              ? t("eksikOranBosIpucu")
              : filtreVar
                ? t("bosFiltreIpucu")
                : t("bosIpucu")}
          </p>
        </div>
      ) : (
        <>
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sutunUrun")}</TableHead>
                  <TableHead>{ortak("sku")}</TableHead>
                  <TableHead>{t("sutunHesap")}</TableHead>
                  <TableHead>{t("sutunGuncelleme")}</TableHead>
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kayitlar.map((kayit) => (
                  <TableRow key={kayit.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{urunAdi(kayit)}</span>
                        {kayit.commissionRate === null ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500/50 text-amber-700 dark:text-amber-400"
                          >
                            {t("eksikOranRozeti")}
                          </Badge>
                        ) : null}
                        {!kayit.isActive ? (
                          <Badge variant="secondary">{ortak("pasif")}</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <KopyalanabilirKod
                        deger={kayit.variant.sku}
                        etiket={ortak("sku")}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {hesapAdi(kayit)}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {kayit.commissionUpdatedAt
                        ? bicim.tarih(kayit.commissionUpdatedAt)
                        : t("hicGuncellenmedi")}
                    </TableCell>
                    <TableCell>{duzenleyici(kayit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {kayitlar.map((kayit) => (
              <ListeKarti
                key={kayit.id}
                baslik={
                  <span className="flex flex-wrap items-center gap-2">
                    {urunAdi(kayit)}
                    {kayit.commissionRate === null ? (
                      <Badge
                        variant="outline"
                        className="border-amber-500/50 text-amber-700 dark:text-amber-400"
                      >
                        {t("eksikOranRozeti")}
                      </Badge>
                    ) : null}
                    {!kayit.isActive ? (
                      <Badge variant="secondary">{ortak("pasif")}</Badge>
                    ) : null}
                  </span>
                }
                altBaslik={hesapAdi(kayit)}
                alanlar={[
                  {
                    etiket: ortak("sku"),
                    deger: (
                      <KopyalanabilirKod
                        deger={kayit.variant.sku}
                        etiket={ortak("sku")}
                      />
                    ),
                  },
                  {
                    etiket: t("sutunGuncelleme"),
                    deger: kayit.commissionUpdatedAt
                      ? bicim.tarih(kayit.commissionUpdatedAt)
                      : t("hicGuncellenmedi"),
                  },
                ]}
                eylemler={duzenleyici(kayit)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
