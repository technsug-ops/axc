import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, TriangleAlert } from "lucide-react";

import { CizgiGrafik, type GrafikNoktasi } from "@/components/cizgi-grafik";
import { ListeKarti } from "@/components/liste-karti";
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
  ayKaydir,
  gunDegeri,
  gunEkle,
  isTakvimGunu,
  pencereOlustur,
} from "@/lib/donem";
import {
  aylikSeri,
  panelHesapla,
  type PanelIadesi,
  type PanelSatisi,
} from "@/lib/panel";
import { prisma } from "@/lib/prisma";
import { izinVarMi } from "@/lib/yetki";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  ANA SAYFA — "BU AY NE OLDU?"
 * ----------------------------------------------------------------------------
 *  Kâr rakamları SNAPSHOT'lardan okunur; burada hiçbir kâr YENİDEN
 *  HESAPLANMAZ (rapor ekranıyla aynı ilke). Oran/tarife bugün değişse
 *  geçmiş ayların grafiği oynamaz.
 *
 *  TEK SORGU İKİ İŞE BAKAR: hem bu ayın kanal blokları hem 12 aylık grafik
 *  aynı satış listesinden türetilir. Ayrı sorgu atmak aynı veriyi iki kez
 *  okumak olurdu.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

/** Grafikte kaç ay görünecek (bu ay dahil). */
const GRAFIK_AY_SAYISI = 12;

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("panel") };
}

export default async function AnaSayfa({
  searchParams,
}: {
  searchParams: Promise<{ kanal?: string; para?: string }>;
}) {
  // PANEL HERKESE AÇIK ama NET-2 DEĞİL. 13.08.2026'da kullanıcı yakaladı:
  // satış listesinde marj gizliydi, panelde TOPLU görünüyordu.
  // `satis.kar.gor` NET-2 KAVRAMINI yönetir — nerede görünürse orada.
  // Bu yeni bir alan-izni değil, aynı iznin aynı kavrama uygulanması.
  const karGorunur = await izinVarMi("satis.kar.gor");

  const parametreler = await searchParams;
  const t = await getTranslations("Panel");
  const bicim = await bicimlendirici();

  const an = new Date();
  const bugun = isTakvimGunu(an);
  const buAy = pencereOlustur("BU_AY", an);

  // Grafik penceresi: bu ay dahil son 12 ayın 1'inden bugüne.
  const ilkAy = ayKaydir(bugun.yil, bugun.ay, -(GRAFIK_AY_SAYISI - 1));
  const grafikBaslangic = gunDegeri({ yil: ilkAy.yil, ay: ilkAy.ay, gun: 1 });
  const grafikBitisHaric = gunEkle(gunDegeri(bugun), 1);

  const [kayitlar, iadeKayitlari] = await Promise.all([
    prisma.sale.findMany({
      where: { soldAt: { gte: grafikBaslangic, lt: grafikBitisHaric } },
      select: {
        soldAt: true,
        net2Amount: true,
        profitCurrency: true,
        profitStatus: true,
        channelAccount: {
          select: { channel: { select: { code: true, name: true } } },
        },
        items: {
          select: {
            quantity: true,
            unitPriceAmount: true,
            unitPriceCurrency: true,
          },
        },
      },
    }),
    // İADELER AYRI SORGU, KENDİ TARİHİYLE SÜZÜLÜR: penceredeki bir iade
    // pencere DIŞINDAKİ bir satışa bağlı olabilir (geçen yılın malı bu ay
    // iade edilir). Kanalını satış listesinden aramak yerine ilişkiden
    // okuyoruz — aksi hâlde o iade sessizce düşerdi.
    prisma.return.findMany({
      where: { occurredAt: { gte: grafikBaslangic, lt: grafikBitisHaric } },
      select: {
        occurredAt: true,
        net2Amount: true,
        profitCurrency: true,
        profitStatus: true,
        sale: {
          select: {
            channelAccount: {
              select: { channel: { select: { code: true, name: true } } },
            },
          },
        },
      },
    }),
  ]);

  const satislar: PanelSatisi[] = kayitlar.map((satis) => {
    // Satışın para birimi: kâr snapshot'ındaki birim, yoksa ilk kalemin.
    // (Rapor ekranıyla birebir aynı kural — iki ekran farklı ciro göstermesin.)
    const paraBirimi: Currency =
      satis.profitCurrency ?? satis.items[0]?.unitPriceCurrency ?? "TRY";

    const gelir = satis.items
      .filter((k) => k.unitPriceCurrency === paraBirimi)
      .reduce((t2, k) => t2 + Number(k.unitPriceAmount.toString()) * k.quantity, 0);

    return {
      kanalKodu: satis.channelAccount.channel.code,
      kanalAdi: satis.channelAccount.channel.name,
      tarih: satis.soldAt,
      paraBirimi,
      gelir,
      net2: satis.net2Amount === null ? null : Number(satis.net2Amount.toString()),
      durum: satis.profitStatus,
    };
  });

  const iadeler: PanelIadesi[] = iadeKayitlari.map((iade) => ({
    kanalKodu: iade.sale.channelAccount.channel.code,
    kanalAdi: iade.sale.channelAccount.channel.name,
    tarih: iade.occurredAt,
    // Rapor ekranıyla aynı kural: iadenin para birimi kâr snapshot'ından.
    paraBirimi: iade.profitCurrency ?? "TRY",
    net2: iade.net2Amount === null ? null : Number(iade.net2Amount.toString()),
    durum: iade.profitStatus,
  }));

  const bloklar = panelHesapla(buAy, satislar, iadeler);

  // --- grafik süzgeçleri -----------------------------------------------------
  // Süzgeç seçenekleri VERİDEN gelir: 12 ayda hiç satış olmamış kanal listeye
  // girmez, olmayan bir seçeneğe tıklanıp boş grafik görülmez.
  const kanalSecenekleri = [
    ...new Map(satislar.map((s) => [s.kanalKodu, s.kanalAdi])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], "tr"));

  const paraSecenekleri = [...new Set(satislar.map((s) => s.paraBirimi))];

  const seciliKanal =
    parametreler.kanal && kanalSecenekleri.some(([k]) => k === parametreler.kanal)
      ? parametreler.kanal
      : null;

  const seciliPara: Currency =
    parametreler.para && paraSecenekleri.includes(parametreler.para as Currency)
      ? (parametreler.para as Currency)
      : (paraSecenekleri[0] ?? "TRY");

  const seri = aylikSeri(
    satislar,
    { yil: bugun.yil, ay: bugun.ay },
    GRAFIK_AY_SAYISI,
    seciliKanal,
    seciliPara,
    iadeler,
  );

  const noktalar: GrafikNoktasi[] = seri.map((nokta) => {
    const tarih = gunDegeri({ yil: nokta.yil, ay: nokta.ay, gun: 1 });
    const tam = bicim.ayYil(tarih);
    return {
      // "Ağustos 2026" -> "Ağustos"; yıl eksende gereksiz yer kaplar.
      etiket: tam.split(" ")[0] ?? tam,
      tamEtiket: tam,
      gelir: nokta.gelir,
      net2: nokta.net2,
    };
  });

  /** Süzgeç düğmesi — bağlantıdır, istemci JavaScript'i gerektirmez. */
  function suzgecDugmesi(etiket: string, adres: string, seciliMi: boolean) {
    return (
      <Button
        key={adres + etiket}
        asChild
        size="sm"
        variant={seciliMi ? "default" : "outline"}
        className="h-11 md:h-9"
      >
        <Link href={adres}>{etiket}</Link>
      </Button>
    );
  }

  const kanalAdresi = (kanal: string | null) => {
    const s = new URLSearchParams();
    if (kanal) s.set("kanal", kanal);
    if (parametreler.para) s.set("para", parametreler.para);
    const ek = s.toString();
    return ek ? `/?${ek}` : "/";
  };

  const paraAdresi = (para: string) => {
    const s = new URLSearchParams();
    if (seciliKanal) s.set("kanal", seciliKanal);
    s.set("para", para);
    return `/?${s.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("altBaslik", { donem: bicim.ayYil(buAy.sonGun) })}
        </p>
      </div>

      {/* ==================== BU AY — KANAL BAZINDA ==================== */}
      {bloklar.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            {t("buAyBos")}
          </CardContent>
        </Card>
      ) : (
        bloklar.map((blok) => (
          <Card key={blok.paraBirimi}>
            <CardHeader>
              <CardTitle>
                {t("buAyBaslik")} · {blok.paraBirimi}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* --- büyük rakamlar: NET-2 gizliyse iki sütun, boşluk kalmaz --- */}
              <div
                className={`grid gap-3 ${karGorunur ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
              >
                <div className="space-y-1 rounded-lg border p-4">
                  <div className="text-muted-foreground text-xs">
                    {t("satisAdedi")}
                  </div>
                  <div className="text-2xl font-semibold">{blok.toplamAdet}</div>
                </div>
                <div className="space-y-1 rounded-lg border p-4">
                  <div className="text-muted-foreground text-xs">{t("ciro")}</div>
                  <div className="text-2xl font-semibold">
                    {bicim.para(blok.toplamGelir, blok.paraBirimi)}
                  </div>
                </div>
                {karGorunur ? (
                  <div className="space-y-1 rounded-lg border p-4">
                    <div className="text-muted-foreground text-xs">
                      {t("net2")}
                    </div>
                    <div className="text-2xl font-semibold">
                      {bicim.para(blok.toplamNet2, blok.paraBirimi)}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {t("net2Aciklama")}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* --- kârı hesaplanamayanlar: SIFIR SAYILMAZ, söylenir ---
                  Kâr göremeyen kullanıcıya gösterilmez: uyarı kâr hakkında ve
                  "sorunluları gör" düğmesi kâr süzgecine gider — elinden
                  gelecek bir iş yok, yalnız kafa karıştırır. */}
              {karGorunur &&
              (blok.hesaplanamayanAdet > 0 ||
                blok.hesaplanamayanIadeAdedi > 0) ? (
                <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                  <p className="space-y-1 text-sm font-medium text-amber-800 dark:text-amber-300">
                    {blok.hesaplanamayanAdet > 0 ? (
                      <span className="flex items-center gap-2">
                        <TriangleAlert className="size-4 shrink-0" />
                        {t("hesaplanamayan", { sayi: blok.hesaplanamayanAdet })}
                      </span>
                    ) : null}
                    {blok.hesaplanamayanIadeAdedi > 0 ? (
                      <span className="flex items-center gap-2">
                        <TriangleAlert className="size-4 shrink-0" />
                        {t("hesaplanamayanIade", {
                          sayi: blok.hesaplanamayanIadeAdedi,
                        })}
                      </span>
                    ) : null}
                  </p>
                  <Button asChild size="sm" variant="outline" className="h-11 md:h-8">
                    <Link href="/satislar?kar=eksik">
                      {t("sorunlulariGor")}
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
              ) : null}

              {/* --- kanal kırılımı: masaüstü tablo --- */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("kanal")}</TableHead>
                      <TableHead className="text-right">
                        {t("satisAdedi")}
                      </TableHead>
                      <TableHead className="text-right">{t("ciro")}</TableHead>
                      {karGorunur ? (
                        <TableHead className="text-right">{t("net2")}</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blok.kanallar.map((kanal) => (
                      <TableRow key={kanal.kanalKodu}>
                        <TableCell className="font-medium">
                          {kanal.kanalAdi}
                        </TableCell>
                        <TableCell className="text-right">{kanal.adet}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {bicim.para(kanal.gelir, blok.paraBirimi)}
                        </TableCell>
                        {/* İade/eksik notları BU HÜCREYE ait: ciro iadeden
                            etkilenmez, düşen rakam NET-2'dir. Sütun gizlenince
                            notlar da gider — dayanağı kalmaz. */}
                        {karGorunur ? (
                          <TableCell className="text-right whitespace-nowrap">
                            {bicim.para(kanal.net2, blok.paraBirimi)}
                            {/* İade varsa rakamın neden düştüğü satırda yazar —
                                yoksa "ciro yüksek, kâr düşük" bilmecesi olur. */}
                            {kanal.iadeAdedi > 0 ? (
                              <span className="text-muted-foreground block text-xs">
                                {t("kanalIade", { sayi: kanal.iadeAdedi })}
                              </span>
                            ) : null}
                            {kanal.hesaplanamayanAdet > 0 ? (
                              <span className="text-muted-foreground block text-xs">
                                {t("kanalEksik", { sayi: kanal.hesaplanamayanAdet })}
                              </span>
                            ) : null}
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* --- kanal kırılımı: telefon kartı --- */}
              <div className="space-y-3 md:hidden">
                {blok.kanallar.map((kanal) => (
                  <ListeKarti
                    key={kanal.kanalKodu}
                    baslik={kanal.kanalAdi}
                    alanlar={[
                      { etiket: t("satisAdedi"), deger: String(kanal.adet) },
                      {
                        etiket: t("ciro"),
                        deger: bicim.para(kanal.gelir, blok.paraBirimi),
                      },
                      ...(karGorunur
                        ? [
                            {
                              etiket: t("net2"),
                              deger: bicim.para(kanal.net2, blok.paraBirimi),
                            },
                          ]
                        : []),
                    ]}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* ======================== AYLIK GRAFİK ======================== */}
      <Card>
        <CardHeader>
          <CardTitle>{t("grafikBaslik", { ay: GRAFIK_AY_SAYISI })}</CardTitle>
          <p className="text-muted-foreground text-sm">{t("grafikNotu")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* --- kanal süzgeci --- */}
          {kanalSecenekleri.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suzgecDugmesi(t("tumKanallar"), kanalAdresi(null), seciliKanal === null)}
              {kanalSecenekleri.map(([kod, ad]) =>
                suzgecDugmesi(ad, kanalAdresi(kod), seciliKanal === kod),
              )}
            </div>
          ) : null}

          {/* --- para birimi süzgeci: yalnız birden fazlaysa görünür --- */}
          {paraSecenekleri.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {paraSecenekleri.map((para) =>
                suzgecDugmesi(para, paraAdresi(para), para === seciliPara),
              )}
            </div>
          ) : null}

          <CizgiGrafik
            noktalar={noktalar}
            gelirAdi={t("ciro")}
            net2Adi={t("net2")}
            bicimle={(deger) => bicim.para(deger, seciliPara)}
            bosMesaj={t("grafikBos")}
            net2Goster={karGorunur}
          />

          {/* Grafiğin okunabilir hâli — dokunmatik cihazda ve ekran
              okuyucuda ASIL kaynak budur (bkz. cizgi-grafik.tsx). */}
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ay")}</TableHead>
                  <TableHead className="text-right">{t("satisAdedi")}</TableHead>
                  <TableHead className="text-right">{t("ciro")}</TableHead>
                  {karGorunur ? (
                    <TableHead className="text-right">{t("net2")}</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {seri.map((nokta, i) => (
                  <TableRow key={`${nokta.yil}-${nokta.ay}`}>
                    <TableCell className="whitespace-nowrap">
                      {noktalar[i]?.tamEtiket}
                    </TableCell>
                    <TableCell className="text-right">{nokta.adet}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {bicim.para(nokta.gelir, seciliPara)}
                    </TableCell>
                    {karGorunur ? (
                      <TableCell className="text-right whitespace-nowrap">
                        {bicim.para(nokta.net2, seciliPara)}
                        {nokta.iadeAdedi > 0 ? (
                          <span className="text-muted-foreground block text-xs">
                            {t("kanalIade", { sayi: nokta.iadeAdedi })}
                          </span>
                        ) : null}
                        {nokta.hesaplanamayanAdet > 0 ? (
                          <span className="text-muted-foreground block text-xs">
                            {t("kanalEksik", { sayi: nokta.hesaplanamayanAdet })}
                          </span>
                        ) : null}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
