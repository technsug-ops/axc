import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Eye, Pencil, Plus } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { DurumDegistirButonu } from "@/components/durum-degistir-butonu";
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

import { kartDurumDegistir } from "./actions";

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
  return { title: tBaslik("kartlar") };
}

export default async function KartlarSayfasi() {
  const kartlar = await prisma.creditCard.findMany({
    include: { _count: { select: { purchases: true } } },
    orderBy: [{ isActive: "desc" }, { label: "asc" }],
  });

  const bicim = await bicimlendirici();
  const t = await getTranslations("Kart");
  const ortak = await getTranslations("Ortak");

  function limitMetni(kart: (typeof kartlar)[number]) {
    return kart.creditLimitAmount
      ? bicim.para(
          kart.creditLimitAmount,
          kart.creditLimitCurrency ?? kart.currency,
        )
      : "—";
  }

  function gunlerMetni(kart: (typeof kartlar)[number]) {
    const kesim = kart.statementDay ?? "—";
    const odeme = kart.dueDay ?? "—";
    return `${kesim} / ${odeme}`;
  }

  function eylemler(kart: (typeof kartlar)[number]) {
    return (
      <>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/kartlar/${kart.id}`}>
            <Eye />
            {ortak("detay")}
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
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
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("sayi", { sayi: kartlar.length })}
          </p>
        </div>
        <Button asChild>
          <Link href="/kartlar/yeni">
            <Plus />
            {t("yeniKart")}
          </Link>
        </Button>
      </div>

      {kartlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{t("bosBaslik")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("bosIpucu")}</p>
        </div>
      ) : (
        <>
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sutunKart")}</TableHead>
                  <TableHead>{ortak("banka")}</TableHead>
                  <TableHead>{t("son4")}</TableHead>
                  <TableHead className="text-right">
                    {t("kesimOdeme")}
                  </TableHead>
                  <TableHead className="text-right">{ortak("limit")}</TableHead>
                  <TableHead className="text-right">
                    {t("alimSutunu")}
                  </TableHead>
                  <TableHead>{ortak("durum")}</TableHead>
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kartlar.map((kart) => (
                  <TableRow key={kart.id}>
                    <TableCell>
                      <Baglanti href={`/kartlar/${kart.id}`}>
                        {kart.label}
                      </Baglanti>
                      {kart.holderName ? (
                        <div className="text-muted-foreground text-xs">
                          {kart.holderName}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {kart.bankName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <KopyalanabilirKod
                        deger={kart.last4}
                        etiket={t("son4Hane")}
                      />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {gunlerMetni(kart)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {limitMetni(kart)}
                    </TableCell>
                    <TableCell className="text-right">
                      {kart._count.purchases}
                    </TableCell>
                    <TableCell>
                      {kart.isActive ? (
                        <Badge variant="secondary">{ortak("aktif")}</Badge>
                      ) : (
                        <Badge variant="outline">{ortak("pasif")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-start gap-2">
                        {eylemler(kart)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {kartlar.map((kart) => (
              <ListeKarti
                key={kart.id}
                baslik={
                  <Baglanti href={`/kartlar/${kart.id}`}>{kart.label}</Baglanti>
                }
                altBaslik={kart.bankName ?? undefined}
                alanlar={[
                  {
                    etiket: t("son4Hane"),
                    deger: (
                      <KopyalanabilirKod
                        deger={kart.last4}
                        etiket={t("son4Hane")}
                      />
                    ),
                  },
                  {
                    etiket: ortak("durum"),
                    deger: kart.isActive ? (
                      <Badge variant="secondary">{ortak("aktif")}</Badge>
                    ) : (
                      <Badge variant="outline">{ortak("pasif")}</Badge>
                    ),
                  },
                  { etiket: t("kesimOdeme"), deger: gunlerMetni(kart) },
                  { etiket: ortak("limit"), deger: limitMetni(kart) },
                  { etiket: t("alimSayisi"), deger: kart._count.purchases },
                  { etiket: t("sahibi"), deger: kart.holderName ?? "—" },
                ]}
                eylemler={eylemler(kart)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
