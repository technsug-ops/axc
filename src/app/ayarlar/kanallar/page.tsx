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

export const metadata = { title: "Kanal Hesapları — Axcali ERP" };

export default async function KanalHesaplariSayfasi() {
  const [kanallar, hesaplar] = await Promise.all([
    prisma.channel.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.channelAccount.findMany({
      include: { channel: { select: { name: true } }, _count: { select: { purchases: true } } },
      orderBy: [{ channelId: "asc" }, { code: "asc" }],
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kanal Hesapları</h1>
        <p className="text-muted-foreground text-sm">
          Bir pazaryerinde birden fazla hesabınız olabilir (hesap başına alım
          limiti nedeniyle). Alım girerken hangi hesaptan alındığını buradan
          seçersiniz.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yeni hesap</CardTitle>
        </CardHeader>
        <CardContent>
          <KanalHesabiFormu kanallar={kanallar} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tanımlı hesaplar ({hesaplar.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {hesaplar.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Henüz kanal hesabı tanımlanmamış.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Alım girebilmek için en az bir hesap gerekiyor.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kanal</TableHead>
                    <TableHead>Hesap</TableHead>
                    <TableHead>Kod</TableHead>
                    <TableHead>Para birimi</TableHead>
                    <TableHead className="text-right">Alım</TableHead>
                    <TableHead>Durum</TableHead>
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
                          etiket="Hesap kodu"
                        />
                      </TableCell>
                      <TableCell>{hesap.defaultCurrency}</TableCell>
                      <TableCell className="text-right">
                        {hesap._count.purchases}
                      </TableCell>
                      <TableCell>
                        {hesap.isActive ? (
                          <Badge variant="secondary">aktif</Badge>
                        ) : (
                          <Badge variant="outline">pasif</Badge>
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
