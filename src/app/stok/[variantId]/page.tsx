import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";
import { getTranslations } from "next-intl/server";

import { Baglanti } from "@/components/baglanti";
import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";
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
import { stokHareketEtiketleri } from "@/lib/etiketler";
import { DURUM_YAZISI } from "@/lib/renkler";
import { bicimlendirici } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";
import { tarihGirdisi } from "@/lib/bicim";

import { DuzeltmeFormu } from "./duzeltme-formu";
import { acikPartilerToplu, varyantStogu } from "@/lib/stok";
import { KART_PARTI_CAPASI, kalanMaliyetOzeti, partilerinParaBirimi } from "@/lib/kart-partileri";
import { sonSayimTarihleri } from "@/lib/sayim-damgasi";

export default async function VaryantHareketleriSayfasi({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  await sayfaIzni("stok.gor");

  const { variantId } = await params;

  const varyant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: { select: { id: true, name: true, brand: true } },
      location: { select: { code: true, name: true } },
    },
  });

  if (!varyant) notFound();

  const nedenler = await prisma.stockAdjustmentReason.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  /**
   * ⭐ SAYIM KAPISI İÇİN — bu varyantın SON sayımının İŞ TARİHİ.
   * Ölçüt `sonSayimTarihleri` gövdesinden gelir; ekran kendi sorgusunu
   * kurmaz. İki yerde iki ölçüt olursa biri ötekinden sessizce ayrışır.
   */
  const sonSayim =
    (await sonSayimTarihleri(prisma, [variantId])).get(variantId) ?? null;

  const bicim = await bicimlendirici();
  const t = await getTranslations("Stok");
  const ortak = await getTranslations("Ortak");
  const hareketEtiketleri = await stokHareketEtiketleri();
  const tIade = await getTranslations("Iade");

  /**
   * KALAN STOĞUN MALİYETİ (kullanıcı isteği 04.10.2026) — «Mevcut stok»
   * kutusu açık partilerin özetini yazar ve kartın parti paneline götürür.
   * ⛔ İZİN: stok sayfası `stok.gor` ile açılır, maliyet ise kartta `urun.gor`
   * ile görünür. Özet ve bağlantı YALNIZ `urun.gor` sahibine çizilir — yoksa
   * stok gören ama maliyet görmemesi gereken biri maliyeti burada görürdü.
   */
  const maliyetGorur = await izinVarMi("urun.gor");

  const [stok, hareketler, partiHaritasi] = await Promise.all([
    varyantStogu(variantId),
    prisma.stockMovement.findMany({
      where: { variantId },
      include: {
        location: { select: { code: true } },
        purchaseItem: {
          include: { purchase: { select: { id: true, code: true } } },
        },
        saleItem: {
          include: { sale: { select: { id: true, code: true } } },
        },
        returnItem: {
          include: {
            return: { select: { id: true, saleId: true, code: true } },
          },
        },
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    }),
    maliyetGorur ? acikPartilerToplu(prisma, [variantId]) : Promise.resolve(null),
  ]);

  const partiler = (partiHaritasi?.get(variantId) ?? []).map((pa) => ({
    kalanAdet: pa.kalanAdet,
    birimMaliyet: pa.birimMaliyet === null ? null : Number(pa.birimMaliyet),
    paraBirimi: pa.birimMaliyetParaBirimi,
  }));
  const kalanPara = partilerinParaBirimi(partiler);
  const kalan = kalanMaliyetOzeti(partiler, kalanPara);

  /**
   * Hareketin kaynağı: alım girişiyse alıma, satış çıkışıysa satışa link.
   * Masaüstü tablosu ve mobil kart aynı işlevden beslenir; iki yerde
   * ayrı yazılırsa biri güncellenip diğeri unutulur.
   */
  function kaynakHucresi(hareket: (typeof hareketler)[number]) {
    if (hareket.purchaseItem?.purchase) {
      return (
        <Baglanti href={`/alimlar/${hareket.purchaseItem.purchase.id}`}>
          {hareket.purchaseItem.purchase.code}
        </Baglanti>
      );
    }

    // İade/değişim hareketleri satışın iade bölümüne gider.
    if (hareket.returnItem?.return) {
      return (
        <Baglanti href={`/satislar/${hareket.returnItem.return.saleId}`}>
          {hareket.returnItem.return.code ?? tIade("baslik")}
        </Baglanti>
      );
    }

    if (hareket.saleItem?.sale) {
      // Satışın sipariş numarası olmayabilir; o zaman "Satış" yazar.
      return (
        <Baglanti href={`/satislar/${hareket.saleItem.sale.id}`}>
          {hareket.saleItem.sale.code ?? t("satisKaynagi")}
        </Baglanti>
      );
    }

    return <span className="text-muted-foreground">{hareket.note ?? "—"}</span>;
  }

  return (
    <div className="space-y-6">
      <div>
        <ListeyeDon href="/stok">{t("baslik")}</ListeyeDon>
        <h1 className="mt-1 text-2xl font-semibold">
          {varyant.product.name}
          {varyant.name ? ` — ${varyant.name}` : ""}
        </h1>
        {/* İlke #9 — az tıkla: kârlılık kartı buradan tek tıkla açılır.
            Stok ekranı "ne kadar var" der; kart "almalı mıyım" der. */}
        <p className="flex flex-wrap gap-x-4 text-sm">
          <Baglanti href={`/urunler/${varyant.product.id}`}>
            {t("urunKartinaGit")}
          </Baglanti>
          <Baglanti href={`/kart/${varyant.id}`}>{t("karlilikKarti")}</Baglanti>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {maliyetGorur ? (
          /* İlke #16 — rakam kaynağına götürür: dokununca kartın «Açık
             partiler» bölümüne iner. İlke #2 — tıklanabilir görünür (ok + hover). */
          <Link
            href={`/kart/${varyant.id}#${KART_PARTI_CAPASI}`}
            aria-label={t("kalanPartileriGor")}
            className="group block rounded-xl focus-visible:ring-2 focus-visible:outline-none"
          >
            <Card className="group-hover:ring-primary/60 group-hover:ring-2 h-full transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-sm font-medium">
                  {t("mevcutStok")}
                  <span className="text-primary flex items-center gap-0.5 text-xs font-normal">
                    {t("kalanPartileriGor")}
                    <ChevronRight className="size-4" />
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-3xl font-semibold">{stok}</p>
                {kalan.partiSayisi === 0 ? (
                  stok > 0 ? <p className="text-muted-foreground text-xs">{t("kalanPartiYok")}</p> : null
                ) : (
                  <p className="text-sm">
                    {kalan.tekBirim !== null
                      ? t("kalanTekBirim", { birim: bicim.para(kalan.tekBirim, kalanPara) })
                      : kalan.ortalama !== null
                        ? t("kalanOrtalama", { parti: kalan.partiSayisi, ortalama: bicim.para(kalan.ortalama, kalanPara) })
                        : t("kalanMaliyetBilinmiyor")}
                    {kalan.olculenAdet > 0
                      ? " · " + t("kalanToplam", { tutar: bicim.para(kalan.tutar, kalanPara) })
                      : ""}
                  </p>
                )}
                {kalan.partiSayisi > 0 && kalan.olculemeyen > 0 ? (
                  <p className="text-muted-foreground text-xs">{t("kalanEksik", { adet: kalan.olculemeyen })}</p>
                ) : null}
                {/* İki defter: ekrandaki stok (ledger) ile açık partiler (FIFO) ayrışırsa SÖYLENİR. */}
                {kalan.partiSayisi > 0 && kalan.adet !== stok ? (
                  <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("kalanAyrisma", { adet: kalan.adet })}</p>
                ) : null}
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                {t("mevcutStok")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{stok}</CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              {ortak("raf")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {varyant.location ? varyant.location.code : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("kodlar")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">{ortak("sku")}:</span>
              <KopyalanabilirKod deger={varyant.sku} etiket={ortak("sku")} />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">
                {ortak("firmaSku")}:
              </span>
              <KopyalanabilirKod
                deger={varyant.companySku}
                etiket={ortak("firmaSku")}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">{ortak("barkod")}:</span>
              <KopyalanabilirKod
                deger={varyant.barcode}
                etiket={ortak("barkod")}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Düzeltme formu hareket geçmişinin ÜSTÜNDE: yeni kaydın hemen
          altında sonucunu görürsünüz. */}
      <DuzeltmeFormu
        variantId={varyant.id}
        mevcutStok={stok}
        bugun={tarihGirdisi(new Date())}
        /**
         * ⭐ SAYIM KAPISI — bu varyantın SON sayımının iş tarihi.
         * Form, seçilen tarih bundan ÖNCEYSE ısrar bloğunu çizer.
         * ⚠ Ekran kilitler, SUNUCU GÜVENMEZ: aynı ölçüt orada da koşuyor.
         */
        sonSayimTarihi={
          sonSayim === null ? null : tarihGirdisi(sonSayim)
        }
        nedenler={nedenler.map((n) => ({
          id: n.id,
          ad: n.name,
          aciklamaZorunlu: n.requiresNote,
          sayimFarkiMi: n.movementType === "COUNT_CORRECTION",
          yon: n.yon,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {t("hareketGecmisi", { sayi: hareketler.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hareketler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("hareketYokBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("hareketYokIpucu")}
              </p>
            </div>
          ) : (
            <>
              {/* -------------------- MASAÜSTÜ: TABLO -------------------- */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sutunTarih")}</TableHead>
                      <TableHead>{t("sutunTip")}</TableHead>
                      <TableHead className="text-right">
                        {t("sutunAdet")}
                      </TableHead>
                      <TableHead>{ortak("raf")}</TableHead>
                      <TableHead>{t("sutunKaynak")}</TableHead>
                      <TableHead className="text-right">
                        {t("sutunBirimMaliyet")}
                      </TableHead>
                      <TableHead>{t("sutunKim")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hareketler.map((hareket) => (
                      <TableRow key={hareket.id}>
                        <TableCell className="whitespace-nowrap">
                          {bicim.tarih(hareket.occurredAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {hareketEtiketleri[hareket.type]}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={
                            hareket.quantityDelta < 0
                              ? "text-destructive text-right font-medium"
                              : "text-right font-medium"
                          }
                        >
                          {hareket.quantityDelta > 0 ? "+" : ""}
                          {hareket.quantityDelta}
                        </TableCell>
                        <TableCell>
                          {hareket.location ? (
                            <Badge variant="outline">
                              {hareket.location.code}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{kaynakHucresi(hareket)}</TableCell>

                        <TableCell className="text-right whitespace-nowrap">
                          {hareket.unitCostAmount
                            ? bicim.para(
                                hareket.unitCostAmount,
                                hareket.unitCostCurrency ?? "TRY",
                              )
                            : "—"}
                        </TableCell>
                        {/* Kullanıcı/kimlik doğrulama Faz 4'te gelecek. */}
                        <TableCell className="text-muted-foreground">
                          —
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* --------------------- TELEFON: KART --------------------- */}
              <div className="space-y-3 md:hidden">
                {hareketler.map((hareket) => (
                  <ListeKarti
                    key={hareket.id}
                    baslik={
                      <span className="flex flex-wrap items-center gap-2">
                        {bicim.tarih(hareket.occurredAt)}
                        <Badge variant="secondary">
                          {hareketEtiketleri[hareket.type]}
                        </Badge>
                      </span>
                    }
                    alanlar={[
                      {
                        etiket: t("sutunAdet"),
                        deger: (
                          <span
                            className={
                              hareket.quantityDelta < 0
                                ? "text-destructive text-base font-semibold"
                                : "text-base font-semibold"
                            }
                          >
                            {hareket.quantityDelta > 0 ? "+" : ""}
                            {hareket.quantityDelta}
                          </span>
                        ),
                      },
                      {
                        etiket: ortak("raf"),
                        deger: hareket.location ? (
                          <Badge variant="outline">
                            {hareket.location.code}
                          </Badge>
                        ) : (
                          "—"
                        ),
                      },
                      {
                        etiket: t("sutunKaynak"),
                        deger: kaynakHucresi(hareket),
                      },
                      {
                        etiket: t("sutunBirimMaliyet"),
                        deger: hareket.unitCostAmount
                          ? bicim.para(
                              hareket.unitCostAmount,
                              hareket.unitCostCurrency ?? "TRY",
                            )
                          : "—",
                      },
                      // Kullanıcı/kimlik doğrulama Faz 4'te gelecek.
                      { etiket: t("sutunKim"), deger: "—" },
                    ]}
                  />
                ))}
              </div>
            </>
          )}

          <p className="text-muted-foreground text-xs">{t("gecmisNotu")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
