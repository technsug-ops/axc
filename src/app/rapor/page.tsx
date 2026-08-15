import Link from "next/link";
import { sayfaIzni } from "@/lib/yetki";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Plus, TriangleAlert } from "lucide-react";

import { KarSorunuCozumu } from "@/components/kar-sorunu";
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
import {
  gunMetni,
  PENCERE_TURLERI,
  PencereHatasi,
  pencereOlustur,
  type Pencere,
  type PencereTuru,
} from "@/lib/donem";
import { prisma } from "@/lib/prisma";
import {
  raporHesapla,
  type ParaBirimiRaporu,
  type RaporGider,
  type RaporIade,
  type RaporDuzeltmesi,
  type RaporSatis,
} from "@/lib/rapor";

import {
  KIYAS_ANAHTARLARI,
  ciroyaOran,
  degisim,
  kiyasCoz,
  kiyasPenceresi,
} from "@/lib/rapor/karsilastirma";
import { DurumRozeti } from "@/components/durum-rozeti";

import { PencereSecici } from "./pencere-secici";

import type { Currency } from "@/generated/prisma/enums";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  DÖNEM RAPORU
 * ----------------------------------------------------------------------------
 *  Kâr rakamları SNAPSHOT'lardan okunur — burada hiçbir kâr YENİDEN
 *  HESAPLANMAZ. Satışın kârı satış anında, iadenin etkisi iade anında
 *  yazılmıştı; rapor yalnızca toplar. Böylece oran/tarife bugün değişse
 *  geçmiş ayın raporu oynamaz.
 * ============================================================================
 */

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("rapor") };
}

/**
 * Uyarı kutusunda kaç sorunlu kayıt doğrudan gösterilir.
 * Fazlası kutuyu ekran boyu uzatırdı; kalanı süzülmüş listeye gider.
 */
const GORUNEN_SORUN = 6;

export default async function RaporSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    pencere?: string;
    baslangic?: string;
    bitis?: string;
    /** Karşılaştırma tabanı: onceki | ucAy | gecenYil. Boşsa kapalı. */
    kiyas?: string;
  }>;
}) {
  await sayfaIzni("rapor.gor");

  const parametreler = await searchParams;
  const t = await getTranslations("Rapor");
  const tSatis = await getTranslations("Satis");
  const tGider = await getTranslations("Gider");
  const bicim = await bicimlendirici();

  const istenen = (parametreler.pencere ?? "BU_AY") as PencereTuru;
  const tur: PencereTuru = PENCERE_TURLERI.includes(istenen)
    ? istenen
    : "BU_AY";

  const an = new Date();
  let pencere: Pencere;
  let pencereHatasi: string | null = null;

  try {
    pencere = pencereOlustur(tur, an, {
      baslangic: parametreler.baslangic ?? "",
      bitis: parametreler.bitis ?? "",
    });
  } catch (hata) {
    // Bozuk aralık sessizce "bu ay"a düşmez; NEDEN düştüğü yazılır (#5).
    pencereHatasi =
      hata instanceof PencereHatasi && hata.kod === "TERS_ARALIK"
        ? t("tersAralik")
        : t("aralikGecersiz");
    pencere = pencereOlustur("BU_AY", an);
  }

  const aralik = { gte: pencere.baslangic, lt: pencere.bitisHaric };

  /**
   * Kıyas seçimi adreste yaşar; DÖNEM SEÇİMİ KORUNUR. Aynı düğmeye tekrar
   * basmak karşılaştırmayı KAPATIR — açtığın şeyi kapatmanın yolu, açtığın
   * düğmedir (İlke #10).
   */
  const kiyasAdresi = (yeni: string | null) => {
    const q = new URLSearchParams();
    if (parametreler.pencere) q.set("pencere", parametreler.pencere);
    if (parametreler.baslangic) q.set("baslangic", parametreler.baslangic);
    if (parametreler.bitis) q.set("bitis", parametreler.bitis);
    if (yeni) q.set("kiyas", yeni);
    const metin = q.toString();
    return metin ? `/rapor?${metin}` : "/rapor";
  };

  /**
   * KARŞILAŞTIRMA PENCERESİ — seçiliyse kurulur, değilse yok.
   *
   * Karşılaştırma KAPALI gelir: her rapora zorla ikinci bir rakam basmak,
   * kullanıcı istemediği hâlde ekranı iki katına çıkarırdı. Seçilince açılır
   * ve seçim adreste yaşar (özet ekranda döküm olmaz ilkesiyle aynı çizgi).
   */
  const kiyasTuru = kiyasCoz(parametreler.kiyas);
  const kiyasPencere = kiyasTuru ? kiyasPenceresi(pencere, kiyasTuru) : null;

  /**
   * SORGU İKİ PENCEREYİ DE KAPSAR AMA ARADAKİ BOŞLUĞU KAPSAMAZ.
   * "Geçen yıl aynı dönem" seçilince tek aralık kullansaydık 13 ayın
   * tamamını okurduk; oysa iki uçtaki pencereler yetiyor.
   */
  const ikiAralik = (alan: string) =>
    kiyasPencere
      ? {
          OR: [
            { [alan]: aralik },
            {
              [alan]: {
                gte: kiyasPencere.baslangic,
                lt: kiyasPencere.bitisHaric,
              },
            },
          ],
        }
      : { [alan]: aralik };

  const [satisKayitlari, iadeKayitlari, duzeltmeKayitlari, giderKayitlari] =
    await Promise.all([
    prisma.sale.findMany({
      where: ikiAralik("soldAt"),
      select: {
        id: true,
        code: true,
        soldAt: true,
        net1Amount: true,
        net2Amount: true,
        profitCurrency: true,
        profitStatus: true,
        items: {
          select: {
            quantity: true,
            unitPriceAmount: true,
            unitPriceCurrency: true,
          },
        },
      },
    }),
    prisma.return.findMany({
      where: ikiAralik("occurredAt"),
      select: {
        id: true,
        saleId: true,
        code: true,
        occurredAt: true,
        net1Amount: true,
        net2Amount: true,
        profitCurrency: true,
        profitStatus: true,
      },
    }),
    // Fire ve sayim farki: ADJUSTMENT + COUNT_CORRECTION hareketleri.
    // Gider tablosuna bakilmaz — tek kaynak stok defteri.
    prisma.stockMovement.findMany({
      where: {
        occurredAt: aralik,
        type: { in: ["ADJUSTMENT", "COUNT_CORRECTION"] },
      },
      select: {
        occurredAt: true,
        quantityDelta: true,
        unitCostAmount: true,
        unitCostCurrency: true,
        type: true,
      },
    }),
    prisma.expense.findMany({
      where: ikiAralik("spentAt"),
      select: {
        id: true,
        spentAt: true,
        amount: true,
        vatRate: true,
        currency: true,
        category: { select: { id: true, name: true, isFixed: true } },
      },
    }),
  ]);

  const sayi = (deger: { toString(): string } | null) =>
    deger === null ? null : Number(deger.toString());

  const satislar: RaporSatis[] = satisKayitlari.map((satis) => {
    // Satışın para birimi: kâr snapshot'ındaki birim, yoksa ilk kalemin.
    // Kalemler farklı para biriminde olsaydı kâr motoru zaten
    // CURRENCY_MISMATCH derdi; gelir yalnız eşleşen kalemlerden toplanır.
    const paraBirimi: Currency =
      satis.profitCurrency ?? satis.items[0]?.unitPriceCurrency ?? "TRY";

    const gelir = satis.items
      .filter((k) => k.unitPriceCurrency === paraBirimi)
      .reduce((t2, k) => t2 + Number(k.unitPriceAmount.toString()) * k.quantity, 0);

    return {
      id: satis.id,
      kod: satis.code,
      tarih: satis.soldAt,
      gelir,
      net1: sayi(satis.net1Amount),
      net2: sayi(satis.net2Amount),
      paraBirimi,
      durum: satis.profitStatus,
    };
  });

  const iadeler: RaporIade[] = iadeKayitlari.map((iade) => ({
    id: iade.id,
    satisId: iade.saleId,
    kod: iade.code,
    tarih: iade.occurredAt,
    net1: sayi(iade.net1Amount),
    net2: sayi(iade.net2Amount),
    paraBirimi: iade.profitCurrency ?? "TRY",
    durum: iade.profitStatus,
  }));

  const giderler: RaporGider[] = giderKayitlari.map((gider) => ({
    id: gider.id,
    tarih: gider.spentAt,
    tutar: Number(gider.amount.toString()),
    kdvOrani: Number(gider.vatRate.toString()),
    paraBirimi: gider.currency,
    kategoriId: gider.category.id,
    kategoriAd: gider.category.name,
    sabitMi: gider.category.isFixed,
  }));

  const duzeltmeler: RaporDuzeltmesi[] = duzeltmeKayitlari.map((d) => ({
    tarih: d.occurredAt,
    miktar: d.quantityDelta,
    birimMaliyet: sayi(d.unitCostAmount),
    paraBirimi: d.unitCostCurrency,
    tip: d.type === "COUNT_CORRECTION" ? "COUNT_CORRECTION" : "ADJUSTMENT",
  }));

  const girdi = { satislar, iadeler, giderler, duzeltmeler };
  const sonuc = raporHesapla(pencere, girdi);

  /**
   * KIYAS DÖNEMİ AYNI MOTORDAN GEÇER.
   *
   * `raporHesapla` pencereyi kendi içinde süzdüğü için ikinci çağrı aynı
   * veriyle yetiniyor. Kıyas için ayrı bir hesap yazmak, aynı kuralın
   * ikinci kopyasını doğururdu — bu oturumda tam olarak o yüzden bir hata
   * bulmuştuk (alım sayfası `select`i elle ikinci kez yazmıştı).
   */
  const kiyasSonuc = kiyasPencere ? raporHesapla(kiyasPencere, girdi) : null;

  /** Kıyas bloğunu para birimine göre bulur; o dönemde hiç hareket yoksa null. */
  const kiyasBlogu = (paraBirimi: string) =>
    kiyasSonuc?.paraBirimleri.find((b) => b.paraBirimi === paraBirimi) ?? null;

  const durumEtiketi = (durum: string) =>
    durum === "NO_COST"
      ? tSatis("durumKisaNoCost")
      : durum === "CURRENCY_MISMATCH"
        ? tSatis("durumKisaCurrency")
        : tSatis("durumKisaRule");

  /**
   * DEĞİŞİM ROZETİ — HEM SAYI HEM ORAN (kullanıcı isteği 15.08.2026).
   *
   * Yalnız yüzde gösterilseydi "%200 arttı" küçük rakamlarda abartılı
   * görünürdü (2 TL'den 6 TL'ye); yalnız sayı gösterilseydi büyüklüğün
   * anlamı kaybolurdu. İkisi birlikte duruyor.
   *
   * YÖN RENGİ İÇERİĞE GÖRE DEĞİL, KULLANICIYA GÖRE: gider ve zarar
   * kalemlerinde ARTIŞ kötüdür. Bu yüzden `artisIyiMi` çağıran taraftan
   * geliyor; burada tahmin edilmiyor.
   */
  function degisimRozeti(
    simdi: number,
    onceki: number | null,
    bicimle: (n: number) => string,
    artisIyiMi = true,
  ) {
    if (onceki === null) return null;
    const d = degisim(simdi, onceki);
    if (d.mutlak === 0) {
      return <DurumRozeti durum="notr" isaretsiz>{t("degisimYok")}</DurumRozeti>;
    }
    const iyi = d.mutlak > 0 === artisIyiMi;
    const yon = d.mutlak > 0 ? "▲" : "▼";
    return (
      <DurumRozeti durum={iyi ? "olumlu" : "olumsuz"} isaretsiz>
        <span className="tabular-nums">
          {yon} {bicimle(Math.abs(d.mutlak))}
          {/* Kıyas dönemi SIFIRSA yüzde yok — "%100 arttı" yalan olurdu. */}
          {d.yuzde === null ? "" : ` · ${bicim.yuzde(Math.abs(d.yuzde))}`}
        </span>
      </DurumRozeti>
    );
  }

  /** Üst kart — büyük rakam + değişim rozeti + altında not. */
  function kart(
    etiket: string,
    deger: string,
    not?: string,
    vurgu?: "iyi" | "kotu",
    rozet?: React.ReactNode,
  ) {
    return (
      <div className="space-y-1 rounded-lg border p-4">
        <div className="text-muted-foreground text-xs">{etiket}</div>
        <div
          className={
            vurgu === "kotu"
              ? "text-destructive text-xl font-semibold"
              : vurgu === "iyi"
                ? `text-xl font-semibold ${DURUM_YAZISI.olumlu}`
                : "text-xl font-semibold"
          }
        >
          {deger}
        </div>
        {rozet ? <div className="flex">{rozet}</div> : null}
        {not ? (
          <div className="text-muted-foreground text-xs">{not}</div>
        ) : null}
      </div>
    );
  }

  function blokCiz(b: ParaBirimiRaporu) {
    const para = (n: number) => bicim.para(n, b.paraBirimi);
    const k = kiyasBlogu(b.paraBirimi);

    /**
     * CİROYA ORANLA NET — kullanıcı isteği 15.08.2026.
     * Payda BRÜT CİRO; paneldeki "satış fiyatına göre" oranıyla AYNI tanım
     * ki iki ekran aynı kavramı farklı hesaplamasın. Ciro yoksa satır yok.
     */
    const oranNotu = (net: number, taban: string) => {
      const oran = ciroyaOran(net, b.satisGeliri);
      return oran === null
        ? taban
        : `${t("ciroyaOran", { oran: bicim.yuzde(oran) })} · ${taban}`;
    };

    return (
      <div key={b.paraBirimi} className="space-y-5">
        {sonuc.paraBirimleri.length > 1 ? (
          <h2 className="text-lg font-semibold">{b.paraBirimi}</h2>
        ) : null}

        {/* ------------------------- ÜST KARTLAR ------------------------- */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kart(
            t("satisGeliri"),
            para(b.satisGeliri),
            undefined,
            undefined,
            degisimRozeti(b.satisGeliri, k?.satisGeliri ?? null, para),
          )}
          {kart(
            t("netBir"),
            para(b.brutNet1),
            oranNotu(b.brutNet1, t("brutNotu")),
            undefined,
            degisimRozeti(b.brutNet1, k?.brutNet1 ?? null, para),
          )}
          {kart(
            t("netIki"),
            para(b.brutNet2),
            oranNotu(b.brutNet2, t("brutNotu")),
            undefined,
            degisimRozeti(b.brutNet2, k?.brutNet2 ?? null, para),
          )}
          {/* GİDERDE ARTIŞ KÖTÜDÜR — yön rengi tersine çevriliyor. */}
          {kart(
            t("donemGiderleri"),
            para(b.giderNetDusen),
            t("giderNotu"),
            undefined,
            degisimRozeti(b.giderNetDusen, k?.giderNetDusen ?? null, para, false),
          )}
          {kart(
            t("satisAdedi"),
            String(b.satisAdedi),
            undefined,
            undefined,
            degisimRozeti(b.satisAdedi, k?.satisAdedi ?? null, (n) => String(n)),
          )}
          {kart(
            t("iadeAdedi"),
            `${b.iadeAdedi} · ${para(b.iadeNet2)}`,
            t("iadeEtkisi"),
            b.iadeNet2 < 0 ? "kotu" : undefined,
            degisimRozeti(b.iadeAdedi, k?.iadeAdedi ?? null, (n) => String(n), false),
          )}
        </div>

        {/* -------------------------- GERÇEK NET ------------------------- */}
        <div className="rounded-lg border-2 p-5">
          <div className="text-muted-foreground text-sm">{t("gercekNet")}</div>
          <div
            className={
              b.gercekNet < 0
                ? "text-destructive text-3xl font-bold"
                : `text-3xl font-bold ${DURUM_YAZISI.olumlu}`
            }
          >
            {para(b.gercekNet)}
          </div>
          <div className="text-muted-foreground mt-1 text-xs">
            {t("gercekNetForm")} · {para(b.brutNet2)} − {para(b.giderNetDusen)}
            {b.duzeltmeZarari !== 0 ? ` − ${para(b.duzeltmeZarari)}` : ""}
          </div>
        </div>

        {/* ------------------- FİRE VE DÜZELTME ------------------------
            Stok defterinden türer; gider tablosuna YAZILMAZ. Bu yüzden
            gider dökümünde değil, kendi kutusunda duruyor. */}
        {b.duzeltmeZarari !== 0 || b.duzeltmeBilinmeyenAdet > 0 ? (
          <div className="space-y-2 rounded-lg border p-4">
            <div className="text-sm font-medium">{t("duzeltmeBaslik")}</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {kart(
                t("fireZarari"),
                para(b.fireZarari),
                t("duzeltmeAdet", { sayi: b.fireAdedi }),
              )}
              {kart(
                t("sayimZarari"),
                para(b.sayimZarari),
                t("duzeltmeAdet", { sayi: b.sayimAdedi }),
              )}
              {kart(t("duzeltmeToplam"), para(b.duzeltmeZarari))}
            </div>
            {b.duzeltmeBilinmeyenAdet > 0 ? (
              <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
                {t("duzeltmeBilinmeyen", { sayi: b.duzeltmeBilinmeyenAdet })}
              </p>
            ) : null}
            <p className="text-muted-foreground text-xs">{t("duzeltmeNotu")}</p>
          </div>
        ) : null}

        {/* ---------------- HESAPLANAMAYANLAR — TIKLANABİLİR -------------
            Uyarı "bir sorun var" demekle kalmaz, SORUNUN NEREDE olduğunu
            gösterir: her kayıt kendi satışına giden bir bağlantıdır.
            _Kullanıcı isteği 10.08.2026: "tıklayınca problemli olan yere
            giderse kullanıcı kolaylığı olmuş olur."_                    */}
        {b.hesaplanamayanSatisAdedi > 0 || b.hesaplanamayanIadeAdedi > 0 ? (
          <div className={`space-y-3 rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
            <div className="space-y-1">
              <p className={`flex gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  {t("hesaplanamayanBaslik", {
                    sayi: b.hesaplanamayanSatisAdedi,
                  })}
                </span>
              </p>
              <p className={`text-xs ${DURUM_YAZISI.uyari}`}>
                {t("hesaplanamayanNotu")} {t("hesaplanamayanTikla")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {[...b.hesaplanamayanSatislar, ...b.hesaplanamayanIadeler]
                .slice(0, GORUNEN_SORUN)
                .map((kayit) => (
                  <Button
                    key={`${kayit.satisId}-${kayit.tarih.getTime()}`}
                    variant="outline"
                    size="sm"
                    className={`bg-background ${DURUM_YAZISI.uyari} border-current/40`}
                    asChild
                  >
                    <Link href={`/satislar/${kayit.satisId}`}>
                      <ArrowRight />
                      <span>{bicim.tarih(kayit.tarih)}</span>
                      <span className="font-mono text-xs">
                        {kayit.kod ?? tSatis("siparisNoYok")}
                      </span>
                      <Badge variant="secondary">
                        {durumEtiketi(kayit.durum ?? "RULE_MISSING")}
                      </Badge>
                    </Link>
                  </Button>
                ))}
            </div>

            {/* Çok sayıda varsa hepsi listede süzülür. */}
            {b.hesaplanamayanSatisAdedi + b.hesaplanamayanIadeAdedi >
            GORUNEN_SORUN ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/satislar?kar=eksik">
                  {t("hepsiniGor", {
                    sayi:
                      b.hesaplanamayanSatisAdedi +
                      b.hesaplanamayanIadeAdedi -
                      GORUNEN_SORUN,
                  })}
                </Link>
              </Button>
            ) : null}

            {b.hesaplanamayanIadeAdedi > 0 ? (
              <p className={`text-xs ${DURUM_YAZISI.uyari}`}>
                {t("hesaplanamayanIade", { sayi: b.hesaplanamayanIadeAdedi })}
              </p>
            ) : null}

            {/* SORUNU YAZDIK — ÇÖZÜMÜ DE YAZ. Kutuda hangi nedenler varsa
                yalnızca onların yol haritası çıkar; üçünü birden yazıp
                ekranı doldurmaz. */}
            {[
              ...new Set(
                [...b.hesaplanamayanSatislar, ...b.hesaplanamayanIadeler].map(
                  (k) => k.durum ?? "RULE_MISSING",
                ),
              ),
            ].map((durum) => (
              <KarSorunuCozumu key={durum} durum={durum} />
            ))}
          </div>
        ) : null}

        {/* ------------------------ GİDER DÖKÜMÜ ------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>{t("giderDokumu")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {b.kategoriler.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-muted-foreground text-sm">{t("giderYok")}</p>
                <Button variant="outline" className="mt-3" asChild>
                  <Link href="/giderler/yeni">
                    <Plus />
                    {t("giderEkle")}
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto rounded-lg border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("sutunKategori")}</TableHead>
                        <TableHead>{t("sutunTur")}</TableHead>
                        <TableHead className="text-right">
                          {t("sutunAdet")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("sutunKdvDahil")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("sutunKdv")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("sutunNetDusen")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {b.kategoriler.map((k) => (
                        <TableRow key={k.kategoriId}>
                          <TableCell>{k.kategoriAd}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {k.sabitMi ? tGider("sabit") : tGider("degisken")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {k.adet}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {para(k.kdvDahil)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-right whitespace-nowrap">
                            {para(k.kdv)}
                          </TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            {para(k.netDusen)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 md:hidden">
                  {b.kategoriler.map((k) => (
                    <ListeKarti
                      key={k.kategoriId}
                      baslik={
                        <span className="flex flex-wrap items-center gap-2">
                          {k.kategoriAd}
                          <Badge variant="outline">
                            {k.sabitMi ? tGider("sabit") : tGider("degisken")}
                          </Badge>
                        </span>
                      }
                      alanlar={[
                        { etiket: t("sutunAdet"), deger: String(k.adet) },
                        {
                          etiket: t("sutunKdvDahil"),
                          deger: para(k.kdvDahil),
                        },
                        { etiket: t("sutunKdv"), deger: para(k.kdv) },
                        {
                          etiket: t("sutunNetDusen"),
                          deger: (
                            <span className="font-semibold">
                              {para(k.netDusen)}
                            </span>
                          ),
                        },
                      ]}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {t("sabitToplam")}:{" "}
                    </span>
                    <span className="font-medium">
                      {para(b.sabitGiderNetDusen)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("degiskenToplam")}:{" "}
                    </span>
                    <span className="font-medium">
                      {para(b.degiskenGiderNetDusen)}
                    </span>
                  </div>
                </div>

                <p className="text-muted-foreground text-xs">
                  {t("indirilebilirKdvNotu", {
                    tutar: para(b.giderIndirilebilirKdv),
                  })}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* --------------------- REFERANS GÖSTERGELER -------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>{t("referansBaslik")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground text-xs">
                  {t("satisBasinaGider")}
                </div>
                <div className="text-lg font-semibold">
                  {b.satisBasinaOrtGider === null
                    ? "—"
                    : para(b.satisBasinaOrtGider)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground text-xs">
                  {t("satisBasinaKar")}
                </div>
                <div className="text-lg font-semibold">
                  {b.satisBasinaOrtBrutKar === null
                    ? "—"
                    : para(b.satisBasinaOrtBrutKar)}
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">{t("referansNotu")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground max-w-3xl text-sm">
            {t("aciklamaMetni")}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/giderler">
            <Plus />
            {t("giderEkle")}
          </Link>
        </Button>
      </div>

      {/* Aralık bozuksa panel AÇIK kalır: kullanıcı tarihi düzeltebilsin. */}
      <PencereSecici
        secili={tur}
        baslangic={parametreler.baslangic ?? gunMetni(pencere.baslangic)}
        bitis={parametreler.bitis ?? gunMetni(pencere.sonGun)}
      />

      {/* ══════════════════ KARŞILAŞTIRMA SEÇİCİ ══════════════════
          Kapalı gelir; her rapora zorla ikinci bir rakam basmak ekranı
          gereksiz yere iki katına çıkarırdı. Seçim adreste yaşar.

          KIYASLANAN ARALIK YAZILI DURUR: "1–15 Ağu ↔ 1–15 Tem". Tanım
          ekranda olmazsa rozet sessiz bir varsayıma dönerdi — kâr
          oranlarında da aynı ilkeyi uyguladık. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">{t("kiyasBaslik")}</span>
        {KIYAS_ANAHTARLARI.map((a) => (
          <Button
            key={a}
            asChild
            size="sm"
            variant={kiyasTuru === a ? "default" : "outline"}
            className="h-11 md:h-8"
          >
            <Link href={kiyasAdresi(kiyasTuru === a ? null : a)}>
              {t(`kiyas_${a}`)}
            </Link>
          </Button>
        ))}
        {kiyasPencere ? (
          <span className="text-muted-foreground text-xs">
            {bicim.tarih(pencere.baslangic)} – {bicim.tarih(pencere.sonGun)}
            {" ↔ "}
            {bicim.tarih(kiyasPencere.baslangic)} – {bicim.tarih(kiyasPencere.sonGun)}
          </span>
        ) : null}
      </div>

      {kiyasPencere ? (
        <p className="text-muted-foreground text-xs">{t("kiyasNotu")}</p>
      ) : null}

      {pencereHatasi ? (
        <p
          className="text-destructive border-destructive/50 rounded-md border p-3 text-sm font-medium"
          role="alert"
        >
          {pencereHatasi}
        </p>
      ) : null}

      <p className="text-muted-foreground text-sm">
        {bicim.tarih(pencere.baslangic)} — {bicim.tarih(pencere.sonGun)}
      </p>

      {sonuc.bos ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{t("bosBaslik")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("bosIpucu")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sonuc.paraBirimleri.map(blokCiz)}
          {sonuc.paraBirimleri.length > 1 ? (
            <p className="text-muted-foreground text-xs">
              {t("paraBirimiNotu")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
