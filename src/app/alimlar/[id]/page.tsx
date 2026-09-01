/**
 * SUTUN TAVANI ISTISNASI: 8 — 8 sutunun 6'si saga yasli SAYI (beklenen/saglam/hasarli/kalan/satir toplami) — dar sutunlar; piksel genisligi OLCULMEDI. K43 · gercek cihazda bakilacak 01.09.2026.
 *
 * Tavan (7) UC metin agirlikli ekranin icerik genisligine gore olculmustu;
 * bu ekran o kumenin disinda. Istisna SAYIYLA birlikte okunuyor: sutun
 * eklenirse beyan bayatlar ve bekci kirmizi yanar.
 */
import Link from "next/link";
import { sayfaIzni } from "@/lib/yetki";
import { notFound } from "next/navigation";
import { Pencil, PackageCheck } from "lucide-react";

import { Baglanti, GeriBaglanti } from "@/components/baglanti";
import { donusTasiyan, geriAdresi } from "@/lib/suzgec";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlimIptalButonu } from "../iptal-butonu";
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
import { tedarikciAdi } from "@/lib/tedarikci-adi";
import { kalemIlerlemesi, kalemTeslimAlinanlar } from "@/lib/stok";
import { kalemToplamlari } from "@/lib/tutar";
import { DURUM_KUTUSU } from "@/lib/renkler";

export default async function AlimDetaySayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saglam?: string;
    hasarli?: string;
    donus?: string;
  }>;
}) {
  await sayfaIzni("alim.gor");

  const [{ id }, kabulSonucu] = await Promise.all([params, searchParams]);
  /**
   * DÖNÜŞ ZİNCİRİ — süzgeç bu ekranda kaybolmaz, bir ADIM YUKARI taşınır.
   * Değer yalnız sorgu dizesidir; yol her zaman bu dosyanın sabitinden gelir
   * (bkz. lib/suzgec → geriAdresi, açık yönlendirme gerekçesi).
   */
  const donus = kabulSonucu.donus;

  const alim = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true, code: true } },
      items: {
        include: {
          variant: {
            include: {
              product: { select: { name: true, brand: true } },
              location: { select: { code: true } },
            },
          },
          // Düzenleme/iptal kuralları için: mal kabul başladı mı?
          stockMovements: { select: { quantityDelta: true } },
        },
      },
      creditCard: true,
      channelAccount: { include: { channel: { select: { name: true } } } },
    },
  });

  if (!alim) notFound();

  const bicim = await bicimlendirici();
  const durumEtiketleri = await alimDurumEtiketleri();
  const t = await getTranslations("Alim");
  const ortak = await getTranslations("Ortak");
  const toplamlar = kalemToplamlari(alim.items);

  // Teslim alınan sağlam adetler ledger'dan gelir (src/lib/stok.ts).
  const teslimAlinanlar = await kalemTeslimAlinanlar(
    alim.items.map((k) => k.id),
  );

  const kabulEdilebilir =
    alim.status !== "CANCELLED" && alim.status !== "RECEIVED";

  /** Mal kabul başlamış mı? İptal ve kalem silme kuralları buna bakar. */
  const malKabulVar = alim.items.some((k) =>
    k.stockMovements.some((h) => h.quantityDelta > 0),
  );

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
    { etiket: t("alimTarihi"), deger: bicim.tarih(alim.purchasedAt) },
    {
      etiket: t("teslimAlindi"),
      deger: alim.receivedAt ? bicim.tarih(alim.receivedAt) : "—",
    },
    {
      etiket: ortak("kanalHesabi"),
      deger: alim.channelAccount
        ? `${alim.channelAccount.channel.name} — ${alim.channelAccount.name}`
        : "—",
    },
    {
      etiket: t("odenenKart"),
      deger: alim.creditCard
        ? `${alim.creditCard.label} (•••• ${alim.creditCard.last4})`
        : "—",
    },
    {
      etiket: t("taksit"),
      deger:
        alim.installmentCount > 1
          ? t("taksitSayisi", { sayi: alim.installmentCount })
          : t("tekCekim"),
    },
    // Çözüm kuralı lib/tedarikci-adi.ts'te — kârlılık kartı da aynı
    // fonksiyonu çağırıyor. İki ekranda iki mantık, aynı alımda iki farklı
    // tedarikçi demekti (canlı hata 17.08.2026).
    {
      etiket: t("tedarikci"),
      deger: tedarikciAdi(alim) ?? "—",
    },
    { etiket: t("tedarikciSiparisNo"), deger: alim.supplierOrderNo ?? "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <GeriBaglanti href={geriAdresi("/alimlar", donus)}>
          {t("baslik")}
        </GeriBaglanti>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              {alim.code}
              {/* Başlık zaten kodu yazıyor; sadece kopyala ikonu. */}
              <KopyalanabilirKod
                deger={alim.code}
                etiket={ortak("siparisNo")}
                sadeceIkon
              />
            </h1>
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              <span>{bicim.tarih(alim.purchasedAt)}</span>
              <span>·</span>
              <span>{t("kalemSayisi", { sayi: alim.items.length })}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {durumEtiketleri[alim.status]}
            </Badge>
            {alim.status !== "CANCELLED" ? (
              <>
                <Button variant="outline" asChild>
                  <Link
                    href={donusTasiyan(`/alimlar/${alim.id}/duzenle`, donus)}
                  >
                    <Pencil />
                    {ortak("duzenle")}
                  </Link>
                </Button>
                <AlimIptalButonu
                  alimId={alim.id}
                  kod={alim.code}
                  malKabulVar={malKabulVar}
                />
              </>
            ) : null}
            {kabulEdilebilir ? (
              <Button asChild>
                <Link
                  href={donusTasiyan(`/alimlar/${alim.id}/mal-kabul`, donus)}
                >
                  <PackageCheck />
                  {t("malKabulEt")}
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
          className={`rounded-md p-4 text-sm ${DURUM_KUTUSU.olumlu}`}
        >
          {t.rich("kabulOzeti", {
            saglam: kabulSonucu.saglam,
            kalin: (parca) => <strong>{parca}</strong>,
          })}
          {Number(kabulSonucu.hasarli) > 0
            ? t.rich("kabulHasarliEki", {
                // Sayı > 0 ise değer zaten var; ?? "0" sadece tip içindir.
                hasarli: kabulSonucu.hasarli ?? "0",
                kalin: (parca) => <strong>{parca}</strong>,
              })
            : null}
          {t.rich("kabulDurumEki", {
            durum: durumEtiketleri[alim.status],
            kalin: (parca) => <strong>{parca}</strong>,
          })}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("alimBilgileri")}</CardTitle>
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
              <div className="text-muted-foreground text-xs">{t("not")}</div>
              <p className="text-sm whitespace-pre-line">{alim.note}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {ortak("kalemlerBasligi", { sayi: alim.items.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ortak("urun")}</TableHead>
                  <TableHead>{ortak("raf")}</TableHead>
                  <TableHead className="text-right">
                    {t("sutunBeklenen")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("sutunSaglam")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("sutunHasarli")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("sutunKalan")}
                  </TableHead>
                  <TableHead className="text-right">
                    {ortak("sutunBirimFiyat")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("sutunSatirToplami")}
                  </TableHead>
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
                            etiket={ortak("sku")}
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
                        <Badge variant="secondary">{t("tamamRozeti")}</Badge>
                      ) : (
                        <span className="font-medium">{ilerleme.kalan}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {bicim.para(kalem.unitCostAmount, kalem.unitCostCurrency)}
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
                    <KopyalanabilirKod
                      deger={kalem.variant.sku}
                      etiket={ortak("sku")}
                    />
                  </span>
                }
                alanlar={[
                  {
                    etiket: ortak("raf"),
                    deger: kalem.variant.location ? (
                      <Badge variant="secondary">
                        {kalem.variant.location.code}
                      </Badge>
                    ) : (
                      "—"
                    ),
                  },
                  { etiket: t("sutunBeklenen"), deger: ilerleme.beklenen },
                  {
                    etiket: t("sutunSaglam"),
                    deger: (
                      <span className="font-medium">{ilerleme.saglam}</span>
                    ),
                  },
                  {
                    etiket: t("sutunHasarli"),
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
                    etiket: t("sutunKalan"),
                    deger: ilerleme.tamamlandiMi ? (
                      <Badge variant="secondary">{t("tamamRozeti")}</Badge>
                    ) : (
                      <span className="font-medium">{ilerleme.kalan}</span>
                    ),
                  },
                  {
                    etiket: ortak("sutunBirimFiyat"),
                    deger: bicim.para(
                      kalem.unitCostAmount,
                      kalem.unitCostCurrency,
                    ),
                  },
                  {
                    etiket: t("sutunSatirToplami"),
                    deger: bicim.para(
                      birim * kalem.quantity,
                      kalem.unitCostCurrency,
                    ),
                  },
                  ...(kalem.damageNote
                    ? [
                        {
                          etiket: ortak("hasarNotu"),
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

          <p className="text-muted-foreground text-xs">{t("detayNotu")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
