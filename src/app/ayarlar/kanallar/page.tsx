import { getTranslations } from "next-intl/server";
import { DurumDegistirButonu } from "@/components/durum-degistir-butonu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
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
import { prisma } from "@/lib/prisma";

import { kanalHesabiDurumDegistir } from "./actions";
import { KanalHesabiFormu } from "./kanal-hesabi-formu";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("kanalHesaplari") };
}

export default async function KanalHesaplariSayfasi() {
  const [kanallar, hesaplar] = await Promise.all([
    prisma.channel.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.channelAccount.findMany({
      include: {
        channel: { select: { name: true } },
        _count: { select: { purchases: true } },
      },
      orderBy: [{ channelId: "asc" }, { code: "asc" }],
    }),
  ]);

  const t = await getTranslations("KanalHesabi");
  const ortak = await getTranslations("Ortak");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("yeniHesap")}</CardTitle>
        </CardHeader>
        <CardContent>
          <KanalHesabiFormu kanallar={kanallar} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("tanimliHesaplar", { sayi: hesaplar.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hesaplar.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("bosBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("bosIpucu")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("kanal")}</TableHead>
                    <TableHead>{t("hesap")}</TableHead>
                    <TableHead>{ortak("kod")}</TableHead>
                    <TableHead>{ortak("paraBirimi")}</TableHead>
                    <TableHead className="text-right">
                      {t("alimSutunu")}
                    </TableHead>
                    <TableHead>{ortak("durum")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hesaplar.map((hesap) => (
                    <TableRow key={hesap.id}>
                      <TableCell className="font-medium">
                        {hesap.channel.name}
                      </TableCell>
                      <TableCell>{hesap.name}</TableCell>
                      <TableCell>
                        <KopyalanabilirKod
                          deger={hesap.code}
                          etiket={t("hesapKodu")}
                        />
                      </TableCell>
                      <TableCell>{hesap.defaultCurrency}</TableCell>
                      <TableCell className="text-right">
                        {hesap._count.purchases}
                      </TableCell>
                      <TableCell>
                        {hesap.isActive ? (
                          <Badge variant="secondary">{ortak("aktif")}</Badge>
                        ) : (
                          <Badge variant="outline">{ortak("pasif")}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DurumDegistirButonu
                          kayitId={hesap.id}
                          aktifMi={hesap.isActive}
                          action={kanalHesabiDurumDegistir}
                        />
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
