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
            Detay
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/kartlar/${kart.id}/duzenle`}>
            <Pencil />
            Düzenle
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
          <h1 className="text-2xl font-semibold">Kredi Kartları</h1>
          <p className="text-muted-foreground text-sm">{kartlar.length} kart</p>
        </div>
        <Button asChild>
          <Link href="/kartlar/yeni">
            <Plus />
            Yeni Kart
          </Link>
        </Button>
      </div>

      {kartlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">Henüz kart eklenmemiş.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Alım girerken hangi kartla ödediğinizi seçebilmek için en az bir
            kart gerekiyor.
          </p>
        </div>
      ) : (
        <>
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kart</TableHead>
                  <TableHead>Banka</TableHead>
                  <TableHead>Son 4</TableHead>
                  <TableHead className="text-right">Kesim / Ödeme</TableHead>
                  <TableHead className="text-right">Limit</TableHead>
                  <TableHead className="text-right">Alım</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Eylemler</TableHead>
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
                        etiket="Son 4 hane"
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
                        <Badge variant="secondary">aktif</Badge>
                      ) : (
                        <Badge variant="outline">pasif</Badge>
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
                    etiket: "Son 4 hane",
                    deger: (
                      <KopyalanabilirKod
                        deger={kart.last4}
                        etiket="Son 4 hane"
                      />
                    ),
                  },
                  {
                    etiket: "Durum",
                    deger: kart.isActive ? (
                      <Badge variant="secondary">aktif</Badge>
                    ) : (
                      <Badge variant="outline">pasif</Badge>
                    ),
                  },
                  { etiket: "Kesim / Ödeme", deger: gunlerMetni(kart) },
                  { etiket: "Limit", deger: limitMetni(kart) },
                  { etiket: "Alım sayısı", deger: kart._count.purchases },
                  { etiket: "Sahibi", deger: kart.holderName ?? "—" },
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
