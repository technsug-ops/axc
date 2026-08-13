import Link from "next/link";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";
import { notFound } from "next/navigation";
import { Undo2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Baglanti, GeriBaglanti } from "@/components/baglanti";
import {
  IadeBlogu,
  type BekleyenHasar,
  type IadeGorunumu,
} from "@/components/iade-blogu";
import { KarBlogu, type KarBloguVerisi } from "@/components/kar-blogu";

import { HesapDegistir } from "./hesap-degistir";
import { YenidenHesapla } from "./yeniden-hesapla";
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
import { gunMetni } from "@/lib/donem";
import { prisma } from "@/lib/prisma";
import { KargoDurumu } from "../kargo-durumu";
import { kalemDusumleri, type Dusum } from "@/lib/satis";
import { kalanTalepEdilebilirAdet } from "@/lib/tazminat";

import type { Currency } from "@/generated/prisma/enums";
import { satisKalemToplamlari } from "@/lib/tutar";

export default async function SatisDetaySayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await sayfaIzni("satis.gor");
  // Kâr bloğu ayrı izin — bkz. lib/yetki/izinler.ts (tek alan-izni istisnası).
  const karGorunur = await izinVarMi("satis.kar.gor");

  const { id } = await params;

  // Satış yanlış hesaba yazılmış olabilir; taşıma için SATIŞ hesapları.
  const satisHesaplari = await prisma.channelAccount.findMany({
    where: { isActive: true, satisIcin: true },
    include: { channel: { select: { name: true } } },
    orderBy: [{ channelId: "asc" }, { name: "asc" }],
  });

  const satis = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, categoryId: true } },
            },
          },
          fees: { orderBy: { createdAt: "asc" } },
          returnItems: { select: { quantity: true } },
        },
      },
      // Sipariş başına kesintiler: saleItemId BOŞ olanlar.
      fees: { where: { saleItemId: null }, orderBy: { createdAt: "asc" } },
      cargoCarrier: { select: { name: true } },
      returns: {
        orderBy: { occurredAt: "asc" },
        include: {
          fees: { orderBy: { createdAt: "asc" } },
          // Hasarlı kalemler + açılmış talepler: "talep bekleyen hasar"
          // uyarısı bunlardan hesaplanır (bkz. iade-blogu.tsx).
          items: {
            select: {
              damagedQuantity: true,
              variantId: true,
              compensations: { select: { quantity: true } },
            },
          },
        },
      },
      channelAccount: { include: { channel: { select: { name: true } } } },
    },
  });

  if (!satis) notFound();

  // Mevcut hesap SATIŞ süzgecine takılıyorsa (rolü ALIŞ'a çevrilmişse)
  // yine de seçenekte durur; yoksa diyalog boş açılır ve kullanıcı
  // hangi hesapta olduğunu göremez.
  const hesapSecenekleri = [...satisHesaplari];
  if (!hesapSecenekleri.some((h) => h.id === satis.channelAccountId)) {
    hesapSecenekleri.unshift(satis.channelAccount);
  }

  const bicim = await bicimlendirici();
  const t = await getTranslations("Satis");
  const ortak = await getTranslations("Ortak");
  const tIade = await getTranslations("Iade");

  // Hangi kalem hangi partilerden düştü — ledger'dan (src/lib/satis.ts).
  const dusumler = await kalemDusumleri(satis.items.map((k) => k.id));
  const toplamlar = satisKalemToplamlari(satis.items);

  // Yeniden hesaplama diyaloğu için kargo firmaları.
  const kargoFirmalari = (
    await prisma.cargoCarrier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
  ).map((f) => ({ id: f.id, ad: f.name }));

  const sayi = (d: { toString(): string } | null) =>
    d === null ? null : Number(d.toString());

  // Daha önce iade edilen adetler kalem bazında düşülür; hepsi iade
  // edilmişse "İade Al" pasifleşir ve NEDENİ yazar (#1, #5).
  const iadeKalanVar = satis.items.some((k) => {
    const iadeEdilen = k.returnItems.reduce((t2, r) => t2 + r.quantity, 0);
    return k.quantity - iadeEdilen > 0;
  });

  const iadeler: IadeGorunumu[] = satis.returns.map((i) => ({
    id: i.id,
    code: i.code,
    returnType: i.returnType,
    occurredAt: i.occurredAt,
    net1: i.net1Amount ? Number(i.net1Amount.toString()) : null,
    net2: i.net2Amount ? Number(i.net2Amount.toString()) : null,
    satirlar: i.fees.map((f) => ({
      code: f.code,
      tutar: Number(f.amount.toString()),
    })),
  }));

  /**
   * TALEP BEKLEYEN HASAR — hasarlı dönüp de tazminat talebi açılmamış adet.
   * Tutar, Tazminat ekranıyla AYNI yoldan bulunur: varyantın son alımındaki
   * birim maliyet. İki ekranın farklı rakam söylemesi güven kaybettirirdi.
   */
  const hasarliIadeKalemleri = satis.returns
    .flatMap((i) => i.items)
    .filter((k) => k.damagedQuantity > 0);

  const bekleyenAdet = hasarliIadeKalemleri.reduce(
    (toplam, k) =>
      toplam +
      kalanTalepEdilebilirAdet(
        k.damagedQuantity,
        k.compensations.map((c) => c.quantity),
      ),
    0,
  );

  let bekleyenHasar: BekleyenHasar | null = null;
  if (bekleyenAdet > 0) {
    const sonAlimlar = await prisma.purchaseItem.findMany({
      where: {
        variantId: { in: hasarliIadeKalemleri.map((k) => k.variantId) },
        purchase: { NOT: { supplierId: null } },
      },
      select: {
        variantId: true,
        unitCostAmount: true,
        unitCostCurrency: true,
      },
      orderBy: { purchase: { purchasedAt: "desc" } },
    });

    const sonAlim = new Map<string, (typeof sonAlimlar)[number]>();
    for (const a of sonAlimlar) {
      if (!sonAlim.has(a.variantId)) sonAlim.set(a.variantId, a);
    }

    let tutar = 0;
    let paraBirimi: Currency = satis.profitCurrency ?? "TRY";
    for (const k of hasarliIadeKalemleri) {
      const kalan = kalanTalepEdilebilirAdet(
        k.damagedQuantity,
        k.compensations.map((c) => c.quantity),
      );
      const alim = sonAlim.get(k.variantId);
      if (kalan > 0 && alim) {
        tutar += kalan * Number(alim.unitCostAmount.toString());
        paraBirimi = alim.unitCostCurrency;
      }
    }
    bekleyenHasar = { adet: bekleyenAdet, tutar, paraBirimi };
  }

  const karVerisi: KarBloguVerisi = {
    durum: satis.profitStatus,
    paraBirimi: satis.profitCurrency ?? "TRY",
    net1: sayi(satis.net1Amount),
    net2: sayi(satis.net2Amount),
    kalemler: satis.items.map((kalem) => ({
      id: kalem.id,
      baslik: kalem.variant.name
        ? `${kalem.variant.product.name} — ${kalem.variant.name}`
        : kalem.variant.product.name,
      net1: sayi(kalem.net1Amount),
      net2: sayi(kalem.net2Amount),
      durum: kalem.profitStatus,
      vatRate: sayi(kalem.vatRate),
      kesintiler: kalem.fees.map((f) => ({
        code: f.code,
        tutar: Number(f.amount.toString()),
      })),
    })),
    siparisKesintileri: satis.fees.map((f) => ({
      code: f.code,
      tutar: Number(f.amount.toString()),
    })),
    // Kategorisiz üründe motor varsayılan %20 kullanır; kullanıcı görsün.
    varsayilanKdvKullanildi: satis.items.some(
      (k) => sayi(k.vatRate) === 20 && k.variant.product.categoryId === null,
    ),
    // Kargo hiç girilmemişse kâr kargo düşülmeden hesaplanmıştır.
    kargoGirilmedi: satis.cargoAmount === null,
  };

  // `deger` ReactNode: kargo satırı bir düğme taşıyor (metin değil).
  const bilgiler: { etiket: string; deger: React.ReactNode }[] = [
    { etiket: t("satisTarihi"), deger: bicim.tarih(satis.soldAt) },
    {
      etiket: ortak("kanalHesabi"),
      deger: `${satis.channelAccount.channel.name} — ${satis.channelAccount.name}`,
    },
    {
      etiket: ortak("adet"),
      deger: String(satis.items.reduce((toplam, k) => toplam + k.quantity, 0)),
    },
    {
      etiket: t("kargoFirmasi"),
      deger: satis.cargoCarrier
        ? `${satis.cargoCarrier.name}${satis.cargoDesi ? ` — ${Number(satis.cargoDesi.toString())} desi` : ""}`
        : t("kargoSecilmedi"),
    },
    {
      /**
       * KARGOYA VERİLDİ — elle işaretlenir (kullanıcı kararı 14.08.2026).
       * Detayda tarih de değiştirilebiliyor: "dün verdim, bugün giriyorum"
       * hâli listedeki tek tıklık düğmeyle çözülmez.
       */
      etiket: t("kargoyaVerildi"),
      deger: (
        <KargoDurumu
          saleId={satis.id}
          shippedAt={satis.shippedAt ? gunMetni(satis.shippedAt) : null}
          kip="detay"
        />
      ),
    },
  ];

  /** Partinin nereden geldiği: alım kaleminden mi, açılış/düzeltme mi. */
  function partiKaynagi(dusum: Dusum) {
    const kaynak = dusum.sourceMovement;
    if (!kaynak) return <span className="text-muted-foreground">—</span>;

    if (kaynak.purchaseItem?.purchase) {
      return (
        <Baglanti href={`/alimlar/${kaynak.purchaseItem.purchase.id}`}>
          {kaynak.purchaseItem.purchase.code}
        </Baglanti>
      );
    }
    return (
      <span className="text-muted-foreground">
        {kaynak.type === "INITIAL" ? t("acilisStogu") : t("elleDuzeltme")}
      </span>
    );
  }

  function partiTarihi(dusum: Dusum) {
    return dusum.sourceMovement
      ? bicim.tarih(dusum.sourceMovement.occurredAt)
      : "—";
  }

  function partiMaliyeti(dusum: Dusum) {
    return dusum.unitCostAmount
      ? bicim.para(dusum.unitCostAmount, dusum.unitCostCurrency ?? "TRY")
      : t("maliyetYok");
  }

  return (
    <div className="space-y-6">
      <div>
        <GeriBaglanti href="/satislar">{t("baslik")}</GeriBaglanti>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
              {satis.code ?? t("siparisNoYok")}
              {satis.code ? (
                <KopyalanabilirKod
                  deger={satis.code}
                  etiket={ortak("siparisNo")}
                  sadeceIkon
                />
              ) : null}
            </h1>
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              <span>{bicim.tarih(satis.soldAt)}</span>
              <span>·</span>
              <span>
                {ortak("kalemlerBasligi", { sayi: satis.items.length })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {iadeKalanVar ? (
              <Button variant="outline" asChild>
                <Link href={`/satislar/${satis.id}/iade`}>
                  <Undo2 />
                  {tIade("iadeAl")}
                </Link>
              </Button>
            ) : (
              // Buton kaybolmaz, PASİF olur ve nedeni yazar (#1, #5).
              <Button
                variant="outline"
                disabled
                title={tIade("tamamiIadeNotu")}
              >
                <Undo2 />
                {tIade("tamamiIade")}
              </Button>
            )}
            <HesapDegistir
              saleId={satis.id}
              mevcutHesapId={satis.channelAccountId}
              mevcutKanalId={satis.channelAccount.channelId}
              secenekler={hesapSecenekleri.map((h) => ({
                id: h.id,
                etiket: `${h.channel.name} — ${h.name}`,
                channelId: h.channelId,
              }))}
            />
            <YenidenHesapla
              saleId={satis.id}
              kalemler={satis.items.map((k) => {
                // Diyalog MEVCUT komisyonla açılmalı; boş açılırsa kullanıcı
                // farkında olmadan komisyonu sıfırlar (09.08.2026'da oldu).
                //
                // Komisyon oran ile mi tutar ile mi girilmişti? commissionRate
                // doluysa ORAN, boşsa TUTAR. Aslını koruyoruz: tutar her zaman
                // oranı ezdiği için ikisini birden doldurmak oranı işlevsiz
                // bırakırdı.
                const oranVar = k.commissionRate !== null;
                const komisyonKesintisi = k.fees.find(
                  (f) => f.code === "KOMISYON",
                );
                const tutar = komisyonKesintisi
                  ? Number(komisyonKesintisi.amount.toString())
                  : 0;

                return {
                  saleItemId: k.id,
                  baslik: k.variant.name
                    ? `${k.variant.product.name} — ${k.variant.name}`
                    : k.variant.product.name,
                  komisyonOrani: oranVar
                    ? String(Number(k.commissionRate!.toString()))
                    : "",
                  komisyonTutari: !oranVar && tutar > 0 ? String(tutar) : "",
                };
              })}
              kargoFirmalari={kargoFirmalari}
              cargoCarrierId={satis.cargoCarrierId}
              cargoDesi={
                satis.cargoDesi
                  ? String(Number(satis.cargoDesi.toString()))
                  : ""
              }
              cargoAmount={
                satis.cargoAmount
                  ? String(
                      Math.round(
                        Number(satis.cargoAmount.toString()) * 1.2 * 100,
                      ) / 100,
                    )
                  : ""
              }
            />
          </div>
          {toplamlar.length ? (
            <div className="flex flex-wrap gap-2">
              {toplamlar.map((toplam) => (
                <Badge
                  key={toplam.paraBirimi}
                  variant="secondary"
                  className="text-sm"
                >
                  {bicim.para(toplam.tutar, toplam.paraBirimi)}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("satisBilgileri")}</CardTitle>
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
          {satis.note ? (
            <div className="mt-4">
              <div className="text-muted-foreground text-xs">
                {ortak("aciklama")}
              </div>
              <p className="text-sm whitespace-pre-line">{satis.note}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {satis.items.map((kalem) => {
        const kalemDusumleriListesi = dusumler.get(kalem.id) ?? [];

        return (
          <Card key={kalem.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <Baglanti href={`/urunler/${kalem.variant.product.id}`}>
                  {kalem.variant.product.name}
                  {kalem.variant.name ? ` — ${kalem.variant.name}` : ""}
                </Baglanti>
                <Badge variant="outline">
                  {kalem.quantity} ×{" "}
                  {bicim.para(kalem.unitPriceAmount, kalem.unitPriceCurrency)}
                </Badge>
              </CardTitle>
              <div className="text-muted-foreground text-xs">
                <KopyalanabilirKod
                  deger={kalem.variant.sku}
                  etiket={ortak("sku")}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm font-medium">{t("dusulenPartiler")}</div>

              {/* -------------------- MASAÜSTÜ: TABLO -------------------- */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("partiTarihi")}</TableHead>
                      <TableHead>{t("partiKaynagi")}</TableHead>
                      <TableHead>{ortak("raf")}</TableHead>
                      <TableHead className="text-right">
                        {t("partiAdet")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("partiBirimMaliyet")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kalemDusumleriListesi.map((dusum) => (
                      <TableRow key={dusum.id}>
                        <TableCell className="whitespace-nowrap">
                          {partiTarihi(dusum)}
                        </TableCell>
                        <TableCell>{partiKaynagi(dusum)}</TableCell>
                        <TableCell>
                          {dusum.location ? (
                            <Badge variant="secondary">
                              {dusum.location.code}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Math.abs(dusum.quantityDelta)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {partiMaliyeti(dusum)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* --------------------- TELEFON: KART --------------------- */}
              <div className="space-y-3 md:hidden">
                {kalemDusumleriListesi.map((dusum) => (
                  <ListeKarti
                    key={dusum.id}
                    baslik={
                      <span className="flex flex-wrap items-center gap-2">
                        {partiTarihi(dusum)}
                        <Badge variant="outline">
                          {Math.abs(dusum.quantityDelta)}
                        </Badge>
                      </span>
                    }
                    alanlar={[
                      { etiket: t("partiKaynagi"), deger: partiKaynagi(dusum) },
                      {
                        etiket: ortak("raf"),
                        deger: dusum.location ? (
                          <Badge variant="secondary">
                            {dusum.location.code}
                          </Badge>
                        ) : (
                          "—"
                        ),
                      },
                      {
                        etiket: t("partiBirimMaliyet"),
                        deger: partiMaliyeti(dusum),
                      },
                    ]}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {karGorunur && satis.profitStatus !== null ? (
        <KarBlogu veri={karVerisi} />
      ) : null}

      <IadeBlogu
        iadeler={iadeler}
        paraBirimi={satis.profitCurrency ?? "TRY"}
        orijinalNet1={sayi(satis.net1Amount)}
        orijinalNet2={sayi(satis.net2Amount)}
        bekleyenHasar={bekleyenHasar}
      />

      <p className="text-muted-foreground text-xs">{t("detayNotu")}</p>
    </div>
  );
}
