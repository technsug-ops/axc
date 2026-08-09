import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageCheck } from "lucide-react";

import { Baglanti, GeriBaglanti } from "@/components/baglanti";
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
import { alimDurumEtiketleri } from "@/lib/etiketler";
import { bicimlendirici } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";
import { kalemIlerlemesi, kalemTeslimAlinanlar } from "@/lib/stok";
import { kalemToplamlari } from "@/lib/tutar";

export default async function AlimDetaySayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saglam?: string; hasarli?: string }>;
}) {
  const [{ id }, kabulSonucu] = await Promise.all([params, searchParams]);

  const alim = await prisma.purchase.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { select: { name: true, brand: true } },
              location: { select: { code: true } },
            },
          },
        },
      },
      creditCard: true,
      channelAccount: { include: { channel: { select: { name: true } } } },
    },
  });

  if (!alim) notFound();

  const bicim = await bicimlendirici();
  const durumEtiketleri = await alimDurumEtiketleri();
  const toplamlar = kalemToplamlari(alim.items);

  // Teslim alınan sağlam adetler ledger'dan gelir (src/lib/stok.ts).
  const teslimAlinanlar = await kalemTeslimAlinanlar(
    alim.items.map((k) => k.id),
  );

  const kabulEdilebilir =
    alim.status !== "CANCELLED" && alim.status !== "RECEIVED";

  // Masaüstü tablosu ve mobil kartlar aynı veriden beslensin; ilerleme
  // hesabı iki yerde tekrarlanmasın.
  const kalemler = alim.items.map((kalem) => ({
    kalem,
    birim: Number(kalem.unitCostAmount.toString()),
    ilerleme: kalemIlerlemesi(
      kalem.quantity,
      teslimAlinanlar.get(kalem.id) ?? 0,
      kalem.damagedQuantity,
    ),
  }));

  const bilgiler: { etiket: string; deger: string }[] = [
    { etiket: "Alım tarihi", deger: bicim.tarih(alim.purchasedAt) },
    {
      etiket: "Teslim alındı",
      deger: alim.receivedAt ? bicim.tarih(alim.receivedAt) : "—",
    },
    {
      etiket: "Kanal hesabı",
      deger: alim.channelAccount
        ? `${alim.channelAccount.channel.name} — ${alim.channelAccount.name}`
        : "—",
    },
    {
      etiket: "Ödenen kart",
      deger: alim.creditCard
        ? `${alim.creditCard.label} (•••• ${alim.creditCard.last4})`
        : "—",
    },
    {
      etiket: "Taksit",
      deger:
        alim.installmentCount > 1
          ? `${alim.installmentCount} taksit`
          : "Tek çekim",
    },
    { etiket: "Tedarikçi", deger: alim.supplierName ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <GeriBaglanti href="/alimlar">Alımlar</GeriBaglanti>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              {alim.code}
              {/* Başlık zaten kodu yazıyor; sadece kopyala ikonu. */}
              <KopyalanabilirKod
                deger={alim.code}
                etiket="Sipariş no"
                sadeceIkon
              />
            </h1>
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              <span>{bicim.tarih(alim.purchasedAt)}</span>
              <span>·</span>
              <span>{alim.items.length} kalem</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {durumEtiketleri[alim.status]}
            </Badge>
            {kabulEdilebilir ? (
              <Button asChild>
                <Link href={`/alimlar/${alim.id}/mal-kabul`}>
                  <PackageCheck />
                  Mal Kabul Et
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mal kabul sonrası görünür onay (#5). */}
      {kabulSonucu.saglam !== undefined ? (
        <div
          role="status"
          className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400"
        >
          Mal kabul kaydedildi:{" "}
          <strong>{kabulSonucu.saglam} adet sağlam</strong> stoğa girdi
          {Number(kabulSonucu.hasarli) > 0 ? (
            <>
              , <strong>{kabulSonucu.hasarli} adet hasarlı</strong> stoğa
              girmeden kayda geçti
            </>
          ) : null}
          . Alımın yeni durumu:{" "}
          <strong>{durumEtiketleri[alim.status]}</strong>.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Alım bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bilgiler.map((bilgi) => (
              <div key={bilgi.etiket}>
                <dt className="text-muted-foreground text-xs">
                  {bilgi.etiket}
                </dt>
                <dd className="text-sm font-medium">{bilgi.deger}</dd>
              </div>
            ))}
          </dl>
          {alim.note ? (
            <div className="mt-4">
              <div className="text-muted-foreground text-xs">Not</div>
              <p className="text-sm whitespace-pre-line">{alim.note}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kalemler ({alim.items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Raf</TableHead>
                  <TableHead className="text-right">Beklenen</TableHead>
                  <TableHead className="text-right">Sağlam</TableHead>
                  <TableHead className="text-right">Hasarlı</TableHead>
                  <TableHead className="text-right">Kalan</TableHead>
                  <TableHead className="text-right">Birim fiyat</TableHead>
                  <TableHead className="text-right">Satır toplamı</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kalemler.map(({ kalem, birim, ilerleme }) => (
                  <TableRow key={kalem.id}>
                    <TableCell>
                      {/* Her parça kendi satırında: satır içi kalırlarsa
                          ürün adı ile SKU bitişik görünüyordu. */}
                      <div className="space-y-1">
                        <div>
                          <Baglanti
                            href={`/urunler/${kalem.variant.productId}`}
                          >
                            {kalem.variant.product.name}
                          </Baglanti>
                        </div>
                        {kalem.variant.name ? (
                          <div className="text-muted-foreground text-xs">
                            {kalem.variant.name}
                          </div>
                        ) : null}
                        <div>
                          <KopyalanabilirKod
                            deger={kalem.variant.sku}
                            etiket="SKU"
                          />
                        </div>
                        {kalem.damageNote ? (
                          <div className="text-destructive text-xs whitespace-pre-line">
                            {kalem.damageNote}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {kalem.variant.location ? (
                        <Badge variant="secondary">
                          {kalem.variant.location.code}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {ilerleme.beklenen}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {ilerleme.saglam}
                    </TableCell>
                    <TableCell className="text-right">
                      {ilerleme.hasarli > 0 ? (
                        <span className="text-destructive font-medium">
                          {ilerleme.hasarli}
                        </span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {ilerleme.tamamlandiMi ? (
                        <Badge variant="secondary">tamam</Badge>
                      ) : (
                        <span className="font-medium">{ilerleme.kalan}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {bicim.para(
                        kalem.unitCostAmount,
                        kalem.unitCostCurrency,
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {bicim.para(
                        birim * kalem.quantity,
                        kalem.unitCostCurrency,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {kalemler.map(({ kalem, birim, ilerleme }) => (
              <ListeKarti
                key={kalem.id}
                baslik={
                  <Baglanti href={`/urunler/${kalem.variant.productId}`}>
                    {kalem.variant.product.name}
                  </Baglanti>
                }
                altBaslik={
                  <span className="flex flex-wrap items-center gap-2">
                    {kalem.variant.name ? (
                      <span>{kalem.variant.name}</span>
                    ) : null}
                    <KopyalanabilirKod deger={kalem.variant.sku} etiket="SKU" />
                  </span>
                }
                alanlar={[
                  {
                    etiket: "Raf",
                    deger: kalem.variant.location ? (
                      <Badge variant="secondary">
                        {kalem.variant.location.code}
                      </Badge>
                    ) : (
                      "—"
                    ),
                  },
                  { etiket: "Beklenen", deger: ilerleme.beklenen },
                  {
                    etiket: "Sağlam",
                    deger: (
                      <span className="font-medium">{ilerleme.saglam}</span>
                    ),
                  },
                  {
                    etiket: "Hasarlı",
                    deger:
                      ilerleme.hasarli > 0 ? (
                        <span className="text-destructive font-medium">
                          {ilerleme.hasarli}
                        </span>
                      ) : (
                        "0"
                      ),
                  },
                  {
                    etiket: "Kalan",
                    deger: ilerleme.tamamlandiMi ? (
                      <Badge variant="secondary">tamam</Badge>
                    ) : (
                      <span className="font-medium">{ilerleme.kalan}</span>
                    ),
                  },
                  {
                    etiket: "Birim fiyat",
                    deger: bicim.para(
                      kalem.unitCostAmount,
                      kalem.unitCostCurrency,
                    ),
                  },
                  {
                    etiket: "Satır toplamı",
                    deger: bicim.para(
                      birim * kalem.quantity,
                      kalem.unitCostCurrency,
                    ),
                  },
                  ...(kalem.damageNote
                    ? [
                        {
                          etiket: "Hasar notu",
                          deger: (
                            <span className="text-destructive whitespace-pre-line">
                              {kalem.damageNote}
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {toplamlar.map((toplam) => (
              <div
                key={toplam.paraBirimi}
                className="rounded-lg border px-4 py-2"
              >
                <div className="text-muted-foreground text-xs">
                  {toplam.paraBirimi} toplamı
                </div>
                <div className="text-lg font-semibold">
                  {bicim.para(toplam.tutar, toplam.paraBirimi)}
                </div>
              </div>
            ))}
          </div>

          <p className="text-muted-foreground text-xs">
            &quot;Sağlam&quot; sütunu stok hareketlerinden hesaplanır. Hasarlı
            ürünler stoğa girmez; satıcıya iade ve tazminat süreci sonraki
            fazlarda gelecek. Yanlış bir giriş silinmez, ters yönde bir düzeltme
            kaydıyla giderilir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
