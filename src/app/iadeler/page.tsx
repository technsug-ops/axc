import { getTranslations } from "next-intl/server";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";
import { Eye, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { ExcelIndir } from "@/components/excel-indir";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { SayfalamaCubugu } from "@/components/sayfalama";
import { SuzgecCubugu, type SuzgecTanimi } from "@/components/suzgec-cubugu";
import { UzunAd } from "@/components/uzun-ad";
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
import {
  LISTE_PENCERELERI,
  gunMetni,
  pencereOlustur,
  type PencereTuru,
} from "@/lib/donem";
import { iadeTuruEtiketleri } from "@/lib/etiketler";
import {
  iadeToplamlari,
  kanalKirilimi,
  urunKirilimi,
  type IadeSatirVerisi,
} from "@/lib/iade-liste";
import { prisma } from "@/lib/prisma";
import { sayfaCoz } from "@/lib/sayfalama";
import { kalanTalepEdilebilirAdet } from "@/lib/tazminat";

import type { ReturnType } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("iadeler") };
}

/**
 * ============================================================================
 *  İADE LİSTESİ
 * ----------------------------------------------------------------------------
 *  Bugüne kadar iadeler yalnız satış detayında yaşıyordu: "geçen ay kaç iade
 *  yedim, hangisi hasarlıydı, hangisinin tazminatı açılmadı" sorularının
 *  cevabı hiçbir ekranda yoktu.
 *
 *  PARA SÜTUNLARI `satis.kar.gor` İZNİNE BAĞLI — yeni bir alan-izni DEĞİL,
 *  aynı iznin aynı kavrama uygulanması (bkz. lib/yetki/izinler.ts başlığı).
 *  Operasyon listeyi PARASIZ görür: tarih, sipariş, ürün, adet ve hasar
 *  bilgisi açıktır; NET-2 etkisi, ceza ve maliyet gizlidir.
 * ============================================================================
 */

const TURLER: ReturnType[] = ["UNDELIVERED", "NORMAL", "DISPUTED"];

function turGecerliMi(deger: string): deger is ReturnType {
  return (TURLER as string[]).includes(deger);
}

export default async function IadelerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    pencere?: string;
    baslangic?: string;
    bitis?: string;
    kanal?: string;
    tur?: string;
    hasar?: string;
    sayfa?: string;
  }>;
}) {
  await sayfaIzni("iade.gor");
  const karGorunur = await izinVarMi("satis.kar.gor");

  const p = await searchParams;
  const bicim = await bicimlendirici();
  const t = await getTranslations("Iadeler");
  const ortak = await getTranslations("Ortak");
  const tIade = await getTranslations("Iade");
  const turEtiketleri = await iadeTuruEtiketleri();

  // --- dönem penceresi ---
  const istenen = (p.pencere ?? "SON_30_GUN") as PencereTuru;
  const tur: PencereTuru = (LISTE_PENCERELERI as readonly string[]).includes(
    istenen,
  )
    ? istenen
    : "SON_30_GUN";

  let pencere;
  try {
    pencere = pencereOlustur(
      tur,
      new Date(),
      tur === "OZEL" && p.baslangic && p.bitis
        ? { baslangic: p.baslangic, bitis: p.bitis }
        : undefined,
    );
  } catch {
    pencere = pencereOlustur("SON_30_GUN", new Date());
  }

  const aralik = { gte: pencere.baslangic, lt: pencere.bitisHaric };

  // --- süzgeç seçenekleri ---
  const kanallar = await prisma.channel.findMany({
    where: { isActive: true },
    select: { code: true, name: true },
    orderBy: { name: "asc" },
  });

  const kanalKodu = (p.kanal ?? "").trim();
  const turFiltresi = (p.tur ?? "").trim();
  const hasarFiltresi = (p.hasar ?? "").trim();

  const kosul = {
    occurredAt: aralik,
    ...(kanalKodu
      ? { sale: { channelAccount: { channel: { code: kanalKodu } } } }
      : {}),
    ...(turGecerliMi(turFiltresi) ? { returnType: turFiltresi } : {}),
    ...(hasarFiltresi === "var" || hasarFiltresi === "talepsiz"
      ? { items: { some: { damagedQuantity: { gt: 0 } } } }
      : {}),
  };

  const toplamKayit = await prisma.return.count({ where: kosul });
  const sayfalama = sayfaCoz(p.sayfa, toplamKayit);

  const iadeler = await prisma.return.findMany({
    where: kosul,
    skip: sayfalama.atla,
    take: sayfalama.boyut,
    orderBy: { occurredAt: "desc" },
    include: {
      sale: {
        select: {
          id: true,
          code: true,
          channelAccount: {
            select: {
              name: true,
              channel: { select: { code: true, name: true } },
            },
          },
        },
      },
      user: { select: { name: true, email: true } },
      fees: { select: { code: true, amount: true } },
      items: {
        select: {
          quantity: true,
          soundQuantity: true,
          damagedQuantity: true,
          variantId: true,
          variant: {
            select: { sku: true, name: true, product: { select: { name: true } } },
          },
          compensations: { select: { quantity: true } },
        },
      },
    },
  });

  const sayi = (d: { toString(): string } | null) =>
    d === null ? null : Number(d.toString());

  /** Ekran satırı + saf hesaba giden veri, tek yerden türetilir. */
  const satirlar = iadeler.map((i) => {
    const adet = i.items.reduce((t2, k) => t2 + k.quantity, 0);
    const saglamAdet = i.items.reduce((t2, k) => t2 + k.soundQuantity, 0);
    const hasarliAdet = i.items.reduce((t2, k) => t2 + k.damagedQuantity, 0);
    const talepsizHasarAdet = i.items.reduce(
      (t2, k) =>
        t2 +
        kalanTalepEdilebilirAdet(
          k.damagedQuantity,
          k.compensations.map((c) => c.quantity),
        ),
      0,
    );

    const satirTutari = (kod: string) =>
      i.fees
        .filter((f) => f.code === kod)
        .reduce((t2, f) => t2 + Number(f.amount.toString()), 0);

    const maliyetGeri = satirTutari("MALIYET_GERI");
    const kayipGelir = Math.abs(satirTutari("KAYIP_GELIR"));

    const veri: IadeSatirVerisi = {
      iadeId: i.id,
      kanalKodu: i.sale.channelAccount.channel.code,
      kanalAdi: i.sale.channelAccount.channel.name,
      tur: i.returnType,
      adet,
      saglamAdet,
      hasarliAdet,
      talepsizHasarAdet,
      net1: sayi(i.net1Amount),
      net2: sayi(i.net2Amount),
      ceza: sayi(i.penaltyAmount) ?? 0,
      donenMaliyet: maliyetGeri,
      // Stoğa dönmeyen maliyet: hasarlı adet oranınca. Maliyet satırı
      // sağlam adede göre yazıldığı için dönmeyeni tersinden türetiyoruz.
      donmeyenMaliyet:
        saglamAdet > 0 ? (maliyetGeri / saglamAdet) * hasarliAdet : 0,
      kayipGelir,
      paraBirimi: i.profitCurrency ?? "TRY",
    };

    return { kayit: i, veri };
  });

  const toplamlar = iadeToplamlari(satirlar.map((s) => s.veri));

  // --- kanal kırılımı: PENCEREDEKİ TÜM iadeler (sayfa değil) ---
  const tumIadeler = await prisma.return.findMany({
    where: { occurredAt: aralik },
    select: {
      net2Amount: true,
      penaltyAmount: true,
      profitCurrency: true,
      returnType: true,
      sale: {
        select: {
          channelAccount: {
            select: { channel: { select: { code: true, name: true } } },
          },
        },
      },
      items: {
        select: {
          quantity: true,
          soundQuantity: true,
          damagedQuantity: true,
          variantId: true,
          variant: {
            select: { sku: true, name: true, product: { select: { name: true } } },
          },
        },
      },
    },
  });

  const kirilimGirdisi: IadeSatirVerisi[] = tumIadeler.map((i) => ({
    iadeId: "",
    kanalKodu: i.sale.channelAccount.channel.code,
    kanalAdi: i.sale.channelAccount.channel.name,
    tur: i.returnType,
    adet: i.items.reduce((t2, k) => t2 + k.quantity, 0),
    saglamAdet: 0,
    hasarliAdet: 0,
    talepsizHasarAdet: 0,
    net1: null,
    net2: sayi(i.net2Amount),
    ceza: sayi(i.penaltyAmount) ?? 0,
    donenMaliyet: 0,
    donmeyenMaliyet: 0,
    kayipGelir: 0,
    paraBirimi: i.profitCurrency ?? "TRY",
  }));

  // Oranın paydası: AYNI dönemde yapılan satışlar (dönem oranı tanımı).
  const donemSatislari = await prisma.sale.groupBy({
    by: ["channelAccountId"],
    where: { soldAt: aralik },
    _count: { _all: true },
  });
  const hesapKanallari = await prisma.channelAccount.findMany({
    select: { id: true, channel: { select: { code: true } } },
  });
  const hesapKanalKodu = new Map(
    hesapKanallari.map((h) => [h.id, h.channel.code]),
  );
  const satisAdetleri = new Map<string, number>();
  for (const g of donemSatislari) {
    const kod = hesapKanalKodu.get(g.channelAccountId);
    if (!kod) continue;
    satisAdetleri.set(kod, (satisAdetleri.get(kod) ?? 0) + g._count._all);
  }

  const kirilim = kanalKirilimi(kirilimGirdisi, satisAdetleri);

  const enCokIade = urunKirilimi(
    tumIadeler.flatMap((i) =>
      i.items.map((k) => ({
        variantId: k.variantId,
        sku: k.variant.sku,
        ad: k.variant.name
          ? `${k.variant.product.name} — ${k.variant.name}`
          : k.variant.product.name,
        adet: k.quantity,
        hasarliAdet: k.damagedQuantity,
      })),
    ),
  );

  // --- bekleyen bildirimler (RMA) ---
  const bekleyenBildirimler = await prisma.returnNotice.count({
    where: { status: { in: ["BEKLENIYOR", "MAL_GELDI", "ITIRAZ_ACILDI", "ITIRAZ_INCELEMEDE"] } },
  });

  const suzgecler: SuzgecTanimi[] = [
    {
      ad: "kanal",
      etiket: ortak("kanal"),
      secenekler: kanallar.map((k) => ({ deger: k.code, etiket: k.name })),
    },
    {
      ad: "tur",
      etiket: t("turSuzgeci"),
      secenekler: TURLER.map((x) => ({ deger: x, etiket: turEtiketleri[x] })),
    },
    {
      ad: "hasar",
      etiket: t("hasarSuzgeci"),
      secenekler: [
        { deger: "var", etiket: t("hasarVar") },
        { deger: "talepsiz", etiket: t("hasarTalepsiz") },
      ],
    },
  ];

  const aralikMetni = `${bicim.tarih(pencere.baslangic)} — ${bicim.tarih(pencere.sonGun)}`;

  // Ekrandaki süzgeç Excel'e AYNEN gider.
  const disaAktarmaParametreleri = {
    pencere: tur,
    baslangic: p.baslangic,
    bitis: p.bitis,
    kanal: kanalKodu,
    tur: turFiltresi,
    hasar: hasarFiltresi,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">
            {ortak("kayitSayisi", { sayi: toplamKayit })} · {aralikMetni}
          </p>
        </div>
        <ExcelIndir liste="iadeler" parametreler={disaAktarmaParametreleri} />
      </div>

      {/* ==================== BEKLEYEN BİLDİRİMLER ==================== */}
      <Card>
        <CardHeader>
          <CardTitle>{t("bekleyenBildirimler")}</CardTitle>
        </CardHeader>
        <CardContent>
          {bekleyenBildirimler === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("bildirimYok")}
            </p>
          ) : (
            <p className="text-sm">
              {t("bildirimSayisi", { sayi: bekleyenBildirimler })}
            </p>
          )}
        </CardContent>
      </Card>

      <SuzgecCubugu
        temelAdres="/iadeler"
        mevcut={p}
        suzgecler={suzgecler}
        zaman={{
          secili: tur,
          aralikMetni,
          baslangic: p.baslangic ?? gunMetni(pencere.baslangic),
          bitis: p.bitis ?? gunMetni(pencere.sonGun),
        }}
      />

      {/* ========================= ÜST ŞERİT ========================= */}
      {toplamlar.map((toplam) => (
        <Card key={toplam.paraBirimi}>
          <CardHeader>
            <CardTitle>
              {t("donemOzeti")} · {toplam.paraBirimi}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Ozet etiket={t("iadeAdedi")} deger={String(toplam.iadeAdedi)} />
              <Ozet etiket={t("urunAdedi")} deger={String(toplam.urunAdedi)} />
              {karGorunur ? (
                <>
                  <Ozet
                    etiket={t("kayipGelir")}
                    deger={bicim.para(toplam.kayipGelir, toplam.paraBirimi)}
                  />
                  <Ozet
                    etiket={t("toplamEtki")}
                    deger={bicim.para(toplam.toplamEtki2, toplam.paraBirimi)}
                  />
                  <Ozet
                    etiket={t("cezaToplami")}
                    deger={bicim.para(toplam.cezaToplami, toplam.paraBirimi)}
                  />
                  <Ozet
                    etiket={t("donenMaliyet")}
                    deger={bicim.para(toplam.donenMaliyet, toplam.paraBirimi)}
                  />
                  <Ozet
                    etiket={t("donmeyenMaliyet")}
                    deger={bicim.para(toplam.donmeyenMaliyet, toplam.paraBirimi)}
                    aciklama={t("donmeyenMaliyetNotu")}
                  />
                </>
              ) : null}
              {toplam.talepsizHasarAdet > 0 ? (
                <Ozet
                  etiket={t("talepsizHasar")}
                  deger={String(toplam.talepsizHasarAdet)}
                  uyari
                />
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* ======================= İŞLENMİŞ İADELER ======================= */}
      {satirlar.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            {t("bosListe")}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* --- masaüstü --- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ortak("tarih")}</TableHead>
                  <TableHead>{ortak("siparisNo")}</TableHead>
                  <TableHead>{ortak("kanalHesabi")}</TableHead>
                  <TableHead>{ortak("urun")}</TableHead>
                  <TableHead>{t("turSuzgeci")}</TableHead>
                  <TableHead className="text-right">{ortak("adet")}</TableHead>
                  {karGorunur ? (
                    <>
                      <TableHead className="text-right">
                        {t("etkiNet2")}
                      </TableHead>
                      <TableHead className="text-right">{t("ceza")}</TableHead>
                    </>
                  ) : null}
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {satirlar.map(({ kayit, veri }) => (
                  <TableRow key={kayit.id}>
                    <TableCell className="whitespace-nowrap">
                      {bicim.tarih(kayit.occurredAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Baglanti href={`/satislar/${kayit.sale.id}`}>
                          {kayit.sale.code ?? "—"}
                        </Baglanti>
                        {kayit.sale.code ? (
                          <KopyalanabilirKod
                            deger={kayit.sale.code}
                            etiket={ortak("siparisNo")}
                            sadeceIkon
                          />
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {kayit.sale.channelAccount.channel.name} —{" "}
                      {kayit.sale.channelAccount.name}
                    </TableCell>
                    <TableCell>
                      <UzunAd
                        metin={kayit.items
                          .map((k) =>
                            k.variant.name
                              ? `${k.variant.product.name} — ${k.variant.name}`
                              : k.variant.product.name,
                          )
                          .join(", ")}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {turEtiketleri[kayit.returnType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {veri.adet}
                      <AdetRozetleri
                        saglam={veri.saglamAdet}
                        hasarli={veri.hasarliAdet}
                        talepsiz={veri.talepsizHasarAdet}
                        saglamEtiket={tIade("saglamAdet")}
                        hasarliEtiket={tIade("hasarliAdet")}
                        talepsizEtiket={t("talepsizKisa")}
                      />
                    </TableCell>
                    {karGorunur ? (
                      <>
                        <TableCell className="text-right whitespace-nowrap">
                          {veri.net2 === null
                            ? "—"
                            : bicim.para(veri.net2, veri.paraBirimi)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {veri.ceza === 0
                            ? "—"
                            : bicim.para(veri.ceza, veri.paraBirimi)}
                        </TableCell>
                      </>
                    ) : null}
                    <TableCell>
                      <SatirEylemleri>
                        <SatirEylemi
                          href={`/satislar/${kayit.sale.id}`}
                          ikon={Eye}
                          etiket={ortak("detay")}
                        />
                      </SatirEylemleri>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* --- telefon --- */}
          <div className="space-y-3 md:hidden">
            {satirlar.map(({ kayit, veri }) => (
              <ListeKarti
                key={kayit.id}
                baslik={
                  <span className="inline-flex items-center gap-1">
                    <Baglanti href={`/satislar/${kayit.sale.id}`}>
                      {kayit.sale.code ?? "—"}
                    </Baglanti>
                    {kayit.sale.code ? (
                      <KopyalanabilirKod
                        deger={kayit.sale.code}
                        etiket={ortak("siparisNo")}
                        sadeceIkon
                      />
                    ) : null}
                  </span>
                }
                alanlar={[
                  { etiket: ortak("tarih"), deger: bicim.tarih(kayit.occurredAt) },
                  {
                    etiket: ortak("kanalHesabi"),
                    deger: `${kayit.sale.channelAccount.channel.name} — ${kayit.sale.channelAccount.name}`,
                  },
                  {
                    etiket: t("turSuzgeci"),
                    deger: turEtiketleri[kayit.returnType],
                  },
                  {
                    etiket: ortak("adet"),
                    deger: (
                      <span>
                        {veri.adet}
                        <AdetRozetleri
                          saglam={veri.saglamAdet}
                          hasarli={veri.hasarliAdet}
                          talepsiz={veri.talepsizHasarAdet}
                          saglamEtiket={tIade("saglamAdet")}
                          hasarliEtiket={tIade("hasarliAdet")}
                          talepsizEtiket={t("talepsizKisa")}
                        />
                      </span>
                    ),
                  },
                  ...(karGorunur
                    ? [
                        {
                          etiket: t("etkiNet2"),
                          deger:
                            veri.net2 === null
                              ? "—"
                              : bicim.para(veri.net2, veri.paraBirimi),
                        },
                      ]
                    : []),
                ]}
                eylemler={
                  <SatirEylemi
                    href={`/satislar/${kayit.sale.id}`}
                    ikon={Eye}
                    etiket={ortak("detay")}
                  />
                }
              />
            ))}
          </div>

          <SayfalamaCubugu
            sayfalama={sayfalama}
            yol="/iadeler"
            parametreler={disaAktarmaParametreleri}
          />
        </>
      )}

      {/* ====================== PAZARYERİ KIRILIMI ====================== */}
      {kirilim.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("kanalKirilimi")}</CardTitle>
            <p className="text-muted-foreground text-sm">{t("oranTanimi")}</p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ortak("kanal")}</TableHead>
                  <TableHead className="text-right">{t("iadeAdedi")}</TableHead>
                  <TableHead className="text-right">
                    {t("donemSatisi")}
                  </TableHead>
                  <TableHead className="text-right">{t("iadeOrani")}</TableHead>
                  {karGorunur ? (
                    <>
                      <TableHead className="text-right">
                        {t("toplamEtki")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("ortalamaEtki")}
                      </TableHead>
                    </>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {kirilim.map((k) => (
                  <TableRow key={k.kanalKodu}>
                    <TableCell className="font-medium">{k.kanalAdi}</TableCell>
                    <TableCell className="text-right">{k.iadeAdedi}</TableCell>
                    <TableCell className="text-right">{k.satisAdedi}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {/* Satış yoksa oran YOK — sıfır göstermek yalan olurdu. */}
                      {k.oran === null ? (
                        <span className="text-muted-foreground">
                          {t("oranYok")}
                        </span>
                      ) : (
                        bicim.yuzde(k.oran * 100)
                      )}
                    </TableCell>
                    {karGorunur ? (
                      <>
                        <TableCell className="text-right whitespace-nowrap">
                          {bicim.para(k.toplamEtki2, k.paraBirimi)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {k.ortalamaEtki === null
                            ? "—"
                            : bicim.para(k.ortalamaEtki, k.paraBirimi)}
                        </TableCell>
                      </>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {/* ==================== EN ÇOK İADE EDİLENLER ==================== */}
      {enCokIade.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("enCokIade")}</CardTitle>
            <p className="text-muted-foreground text-sm">{t("enCokIadeNotu")}</p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ortak("urun")}</TableHead>
                  <TableHead>{ortak("sku")}</TableHead>
                  <TableHead className="text-right">{t("iadeAdedi")}</TableHead>
                  <TableHead className="text-right">
                    {tIade("hasarliAdet")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enCokIade.map((u) => (
                  <TableRow key={u.variantId}>
                    <TableCell>
                      <UzunAd metin={u.ad} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        {u.sku}
                        <KopyalanabilirKod
                          deger={u.sku}
                          etiket={ortak("sku")}
                          sadeceIkon
                        />
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{u.iadeAdedi}</TableCell>
                    <TableCell className="text-right">
                      {u.hasarliAdet > 0 ? (
                        <span className="text-amber-700 dark:text-amber-400">
                          {u.hasarliAdet}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Ozet({
  etiket,
  deger,
  aciklama,
  uyari,
}: {
  etiket: string;
  deger: string;
  aciklama?: string;
  uyari?: boolean;
}) {
  return (
    <div
      className={`space-y-1 rounded-lg border p-4 ${
        uyari ? "border-amber-500/50 bg-amber-500/10" : ""
      }`}
    >
      <div className="text-muted-foreground text-xs">{etiket}</div>
      <div className="text-2xl font-semibold">{deger}</div>
      {aciklama ? (
        <div className="text-muted-foreground text-xs">{aciklama}</div>
      ) : null}
    </div>
  );
}

/** Sağlam/hasarlı ayrımı satırda GÖRÜNÜR olmalı — detaya girmeden. */
function AdetRozetleri({
  saglam,
  hasarli,
  talepsiz,
  saglamEtiket,
  hasarliEtiket,
  talepsizEtiket,
}: {
  saglam: number;
  hasarli: number;
  talepsiz: number;
  saglamEtiket: string;
  hasarliEtiket: string;
  talepsizEtiket: string;
}) {
  if (hasarli === 0 && saglam === 0) return null;
  return (
    <span className="mt-1 flex flex-wrap justify-end gap-1">
      {saglam > 0 ? (
        <Badge variant="outline" className="text-xs">
          {saglamEtiket}: {saglam}
        </Badge>
      ) : null}
      {hasarli > 0 ? (
        <Badge
          variant="outline"
          className="border-amber-500/50 text-xs text-amber-700 dark:text-amber-400"
        >
          {hasarliEtiket}: {hasarli}
        </Badge>
      ) : null}
      {talepsiz > 0 ? (
        <Badge variant="destructive" className="gap-1 text-xs">
          <TriangleAlert className="size-3" />
          {talepsizEtiket}: {talepsiz}
        </Badge>
      ) : null}
    </span>
  );
}
