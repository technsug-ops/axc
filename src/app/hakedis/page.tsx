import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import Link from "next/link";
import { TriangleAlert, Upload } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
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
import { isTakvimGunu, gunDegeri } from "@/lib/donem";
import { beklenenHakedis, odemeDurumu } from "@/lib/hakedis/eslestir";
import { HAKEDIS_ESIKLERI } from "@/lib/hakedis/model";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Uzun listelerde gösterilecek en fazla satır. Kesme SESSİZ DEĞİLDİR:
 * sınırı aşan her listede kaç kalemin gösterilmediği yazar.
 */
const LISTE_SINIRI = 100;

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("hakedis") };
}

export default async function HakedisSayfasi() {
  await sayfaIzni("hakedis.gor");

  const t = await getTranslations("Hakedis");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const [partiler, kalemler, satislar] = await Promise.all([
    prisma.settlement.findMany({
      include: {
        channelAccount: { include: { channel: { select: { name: true } } } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.settlementItem.findMany({
      include: {
        channelAccount: { include: { channel: { select: { name: true } } } },
        sale: { select: { id: true, code: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    // Karşılaştırma için: kâr snapshot'ı + maliyet kesintisi.
    prisma.sale.findMany({
      include: {
        channelAccount: { include: { channel: { select: { name: true } } } },
        fees: { where: { code: "MALIYET" }, select: { amount: true } },
      },
      orderBy: { soldAt: "desc" },
    }),
  ]);

  // "Bugün" İŞ saat diliminden — vade karşılaştırması gün-güne yapılır.
  const bugun = gunDegeri(isTakvimGunu(new Date()));

  /**
   * BEKLEYEN PARA: ödeme tarihi olmayan kalemler.
   * Beklenen tutar HENÜZ karşılaştırılmıyor (kâr motoru ile eşleme sonraki
   * iş); bu yüzden EKSIK/FAZLA ödeme durumu üretilmiyor, yalnız
   * bekliyor/gecikti ayrımı yapılıyor.
   */
  const bekleyenler = kalemler
    .filter((k) => k.paidAt === null)
    .map((k) => ({
      kayit: k,
      durum: odemeDurumu({
        beklenenTutar: null,
        gerceklesenTutar: null,
        vade: k.dueDate,
        odendiMi: false,
        bugun,
      }),
    }));

  const geciken = bekleyenler.filter((b) => b.durum === "GECIKTI");

  // Para birimi başına bekleyen toplam.
  const bekleyenToplam = new Map<string, number>();
  for (const b of bekleyenler) {
    const tutar = Number(b.kayit.amount.toString());
    bekleyenToplam.set(
      b.kayit.currency,
      (bekleyenToplam.get(b.kayit.currency) ?? 0) + tutar,
    );
  }

  /**
   * BEKLENEN vs GERÇEKLEŞEN — satış bazında.
   *
   * Beklenen, kâr motorunun snapshot'ından türetilir (NET-1 + maliyet).
   * Gerçekleşen, o satışa bağlanmış hakediş kalemlerinin TOPLAMIDIR —
   * bir sipariş çok satırlıdır ve tek satıra bakmak yanıltır.
   *
   * Kâr hesaplanamamış satışta beklenen de YOKTUR: karşılaştırma
   * yapılmaz, ekranda "—" durur. Sıfır varsaymak yanlış rakam üretirdi.
   */
  const kalemHaritasi = new Map<
    string,
    { toplam: number; paraBirimi: string; vade: Date | null; odendi: boolean }
  >();
  for (const k of kalemler) {
    if (!k.saleId) continue;
    const m = kalemHaritasi.get(k.saleId) ?? {
      toplam: 0,
      paraBirimi: k.currency,
      vade: k.dueDate,
      odendi: true,
    };
    m.toplam += Number(k.amount.toString());
    // Vade: en GEÇ olan; ödendi: kalemlerin HEPSİ ödendiyse.
    if (k.dueDate && (!m.vade || k.dueDate > m.vade)) m.vade = k.dueDate;
    if (!k.paidAt) m.odendi = false;
    kalemHaritasi.set(k.saleId, m);
  }

  const karsilastirma = satislar.map((satis) => {
    const gelen = kalemHaritasi.get(satis.id);
    const maliyet = satis.fees.reduce(
      (t, f) => t + Number(f.amount.toString()),
      0,
    );
    const beklenen = beklenenHakedis(
      satis.net1Amount === null ? null : Number(satis.net1Amount.toString()),
      maliyet,
    );
    return {
      id: satis.id,
      kod: satis.code,
      tarih: satis.soldAt,
      hesap: `${satis.channelAccount.channel.name} — ${satis.channelAccount.name}`,
      paraBirimi: gelen?.paraBirimi ?? satis.profitCurrency ?? "TRY",
      beklenen,
      gerceklesen: gelen?.toplam ?? null,
      vade: gelen?.vade ?? null,
      durum: odemeDurumu({
        beklenenTutar: beklenen,
        gerceklesenTutar: gelen?.toplam ?? null,
        vade: gelen?.vade ?? null,
        odendiMi: gelen?.odendi ?? false,
        bugun,
        kalemVarMi: gelen !== undefined,
      }),
    };
  });

  /** Dikkat isteyenler önce: eksik/fazla ödeme, sonra gecikme. */
  const ONCELIK: Record<string, number> = {
    EKSIK_ODEME: 0,
    FAZLA_ODEME: 1,
    GECIKTI: 2,
    BEKLIYOR: 3,
    ODENDI: 4,
    GELMEDI: 5,
  };
  karsilastirma.sort((a, b) => ONCELIK[a.durum] - ONCELIK[b.durum]);

  const sorunlu = karsilastirma.filter(
    (k) => k.durum === "EKSIK_ODEME" || k.durum === "GECIKTI",
  );

  /**
   * Durum kodundan sözlük metnine SABİT eşleme.
   * Anahtar DEĞİŞKENLE birleştirilseydi i18n denetimi bu çağrıları
   * göremez, eksik anahtar sessizce canlıya giderdi.
   * (Bu açıklamada örnek kod YAZILMIYOR: denetim yorumları da tarıyor ve
   *  örneği gerçek çağrı sanıp "eksik anahtar" veriyor — 12.08.2026.)
   */
  const durumMetni = (kod: string) =>
    kod === "ODENDI"
      ? t("durumODENDI")
      : kod === "BEKLIYOR"
        ? t("durumBEKLIYOR")
        : kod === "GECIKTI"
          ? t("durumGECIKTI")
          : kod === "EKSIK_ODEME"
            ? t("durumEKSIK_ODEME")
            : kod === "FAZLA_ODEME"
              ? t("durumFAZLA_ODEME")
              : t("durumGELMEDI");

  const eslesmemis = kalemler.filter(
    (k) => k.saleId === null && k.orderNo !== null,
  );

  /**
   * EŞLEŞMEYENLER SİPARİŞ BAZINDA GRUPLANIR.
   * Bir sipariş 7 kalem olabilir; kalem kalem listelemek 648 satır
   * demekti ve okunmazdı. Kullanıcının sorduğu soru "hangi siparişler
   * sistemde yok?" — cevabı sipariş listesidir.
   *
   * Uyarıyı sayı olarak yazıp listelemeseydik, "eyleme dönük hata"
   * ilkesini kendi ekranımızda çiğnerdik: kullanıcı hangi siparişleri
   * gireceğini göremezdi.
   */
  const eslesmeyenSiparisler = [
    ...eslesmemis
      .reduce((harita, k) => {
        const no = k.orderNo!;
        const m = harita.get(no) ?? { sayi: 0, toplam: 0, paraBirimi: k.currency };
        m.sayi++;
        m.toplam += Number(k.amount.toString());
        harita.set(no, m);
        return harita;
      }, new Map<string, { sayi: number; toplam: number; paraBirimi: string }>())
      .entries(),
  ]
    .map(([siparisNo, m]) => ({ siparisNo, ...m }))
    .sort((a, b) => Math.abs(b.toplam) - Math.abs(a.toplam));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
        </div>
        <Button asChild>
          <Link href="/hakedis/yukle">
            <Upload />
            {t("yukle")}
          </Link>
        </Button>
      </div>

      {kalemler.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{t("bosBaslik")}</p>
          <p className="text-muted-foreground mt-1 text-sm">{t("bosIpucu")}</p>
        </div>
      ) : (
        <>
          {/* ----------------------- BEKLEYEN PARA ---------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>{t("bekleyenPara")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-6">
                {[...bekleyenToplam.entries()].map(([para, tutar]) => (
                  <div key={para}>
                    <div className="text-2xl font-semibold">
                      {bicim.para(tutar, para)}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {bekleyenler.length} {t("sutunKalem").toLowerCase()}
                    </div>
                  </div>
                ))}
                {bekleyenToplam.size === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("bekleyenParaNotu")}
                  </p>
                ) : null}
              </div>

              {geciken.length > 0 ? (
                <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                    <TriangleAlert className="size-4 shrink-0" />
                    {geciken.length} {t("gecikti")}
                  </p>
                  <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-300/90">
                    {t("gecikmeNotu", { gun: HAKEDIS_ESIKLERI.gecikmeIsGunu })}
                  </p>
                </div>
              ) : null}

              <p className="text-muted-foreground text-xs">
                {t("bekleyenParaNotu")}
              </p>
            </CardContent>
          </Card>

          {/* ---------------- BEKLENEN vs GERÇEKLEŞEN ------------------- */}
          {karsilastirma.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("karsilastirmaBaslik")} ({karsilastirma.length})
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  {t("karsilastirmaNotu")}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {sorunlu.length > 0 ? (
                  <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                      <TriangleAlert className="size-4 shrink-0" />
                      {t("karsilastirmaSorunlu", { sayi: sorunlu.length })}
                    </p>
                  </div>
                ) : null}

                <div className="hidden overflow-x-auto rounded-lg border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ortak("siparisNo")}</TableHead>
                        <TableHead>{ortak("kanalHesabi")}</TableHead>
                        <TableHead className="text-right">
                          {t("sutunBeklenen")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("sutunGerceklesen")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("sutunFark")}
                        </TableHead>
                        <TableHead>{ortak("durum")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {karsilastirma.slice(0, LISTE_SINIRI).map((k) => (
                        <TableRow key={k.id}>
                          <TableCell>
                            <Baglanti href={`/satislar/${k.id}`}>
                              {k.kod ?? bicim.tarih(k.tarih)}
                            </Baglanti>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {k.hesap}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {k.beklenen === null
                              ? "—"
                              : bicim.para(k.beklenen, k.paraBirimi)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {k.gerceklesen === null
                              ? "—"
                              : bicim.para(k.gerceklesen, k.paraBirimi)}
                          </TableCell>
                          {/* Fark yalnız İKİSİ DE varsa yazılır; biri yoksa
                              çıkarma yapmak uydurmak olurdu. */}
                          <TableCell className="text-right whitespace-nowrap">
                            {k.beklenen !== null && k.gerceklesen !== null
                              ? bicim.para(
                                  k.gerceklesen - k.beklenen,
                                  k.paraBirimi,
                                )
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                k.durum === "EKSIK_ODEME" ||
                                k.durum === "GECIKTI"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {durumMetni(k.durum)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* -------------------- TELEFON: KART -------------------- */}
                <div className="space-y-3 md:hidden">
                  {karsilastirma.slice(0, LISTE_SINIRI).map((k) => (
                    <ListeKarti
                      key={k.id}
                      baslik={
                        <Baglanti href={`/satislar/${k.id}`}>
                          {k.kod ?? bicim.tarih(k.tarih)}
                        </Baglanti>
                      }
                      altBaslik={k.hesap}
                      alanlar={[
                        {
                          etiket: t("sutunBeklenen"),
                          deger:
                            k.beklenen === null
                              ? "—"
                              : bicim.para(k.beklenen, k.paraBirimi),
                        },
                        {
                          etiket: t("sutunGerceklesen"),
                          deger:
                            k.gerceklesen === null
                              ? "—"
                              : bicim.para(k.gerceklesen, k.paraBirimi),
                        },
                        {
                          etiket: ortak("durum"),
                          deger: (
                            <Badge variant="outline">
                              {durumMetni(k.durum)}
                            </Badge>
                          ),
                        },
                      ]}
                    />
                  ))}
                </div>

                {karsilastirma.length > LISTE_SINIRI ? (
                  <p className="text-sm font-medium">
                    {t("listeKesildi", {
                      gosterilen: LISTE_SINIRI,
                      toplam: karsilastirma.length,
                    })}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* -------------------- EŞLEŞMEYEN KALEMLER ------------------- */}
          {eslesmemis.length > 0 ? (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {t("eslesmemisKalem", { sayi: eslesmemis.length })}
              </p>
              <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-300/90">
                {t("eslesmemisNotu", { siparis: eslesmeyenSiparisler.length })}
              </p>

              {/* HANGİ SİPARİŞLER — tutara göre, en büyük önce. */}
              <div className="mt-3 overflow-x-auto rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ortak("siparisNo")}</TableHead>
                      <TableHead className="text-right">
                        {t("sutunKalem")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("sutunTutar")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eslesmeyenSiparisler
                      .slice(0, LISTE_SINIRI)
                      .map((s2) => (
                        <TableRow key={s2.siparisNo}>
                          <TableCell>
                            <KopyalanabilirKod
                              deger={s2.siparisNo}
                              etiket={ortak("siparisNo")}
                            />
                          </TableCell>
                          <TableCell className="text-right">{s2.sayi}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {bicim.para(s2.toplam, s2.paraBirimi)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              {eslesmeyenSiparisler.length > LISTE_SINIRI ? (
                <p className="mt-2 text-sm font-medium text-amber-900 dark:text-amber-200">
                  {t("listeKesildi", {
                    gosterilen: LISTE_SINIRI,
                    toplam: eslesmeyenSiparisler.length,
                  })}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* -------------------------- KALEMLER ------------------------ */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("partiler", { sayi: partiler.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* ------------------ MASAÜSTÜ: TABLO ------------------- */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sutunDosya")}</TableHead>
                      <TableHead>{t("sutunKanal")}</TableHead>
                      <TableHead className="text-right">
                        {t("sutunKalem")}
                      </TableHead>
                      <TableHead>{t("sutunOdeme")}</TableHead>
                      <TableHead className="text-right">
                        {t("sutunTutar")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partiler.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="max-w-[20rem]">
                          <span className="block truncate">
                            {p.sourceFile ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.channelAccount.channel.name} —{" "}
                          {p.channelAccount.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {p._count.items}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {p.paidAt ? (
                            bicim.tarih(p.paidAt)
                          ) : (
                            <Badge variant="outline">{t("odenmedi")}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {bicim.para(p.amount, p.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* -------------------- TELEFON: KART ------------------- */}
              <div className="space-y-3 md:hidden">
                {partiler.map((p) => (
                  <ListeKarti
                    key={p.id}
                    baslik={p.sourceFile ?? "—"}
                    altBaslik={`${p.channelAccount.channel.name} — ${p.channelAccount.name}`}
                    alanlar={[
                      { etiket: t("sutunKalem"), deger: p._count.items },
                      {
                        etiket: t("sutunOdeme"),
                        deger: p.paidAt ? bicim.tarih(p.paidAt) : t("odenmedi"),
                      },
                      {
                        etiket: t("sutunTutar"),
                        deger: bicim.para(p.amount, p.currency),
                      },
                    ]}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ----------------- BEKLEYEN KALEM DÖKÜMÜ -------------------- */}
          {bekleyenler.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("bekleyenPara")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="hidden overflow-x-auto rounded-lg border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ortak("tarih")}</TableHead>
                        <TableHead>{ortak("siparisNo")}</TableHead>
                        {/* HB'de bu alan bir FATURA numarasıdır ve o
                            faturanın tüm kalemleri aynı numarayı taşır. */}
                        <TableHead>{t("faturaNo")}</TableHead>
                        <TableHead>{t("sutunKalem")}</TableHead>
                        <TableHead className="text-right">
                          {t("sutunTutar")}
                        </TableHead>
                        <TableHead>{ortak("durum")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bekleyenler.slice(0, LISTE_SINIRI).map(({ kayit, durum }) => (
                        <TableRow key={kayit.id}>
                          <TableCell className="whitespace-nowrap">
                            {kayit.dueDate ? (
                              bicim.tarih(kayit.dueDate)
                            ) : (
                              <span className="text-muted-foreground">
                                {t("vadeYok")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {kayit.sale ? (
                              <Baglanti href={`/satislar/${kayit.sale.id}`}>
                                {kayit.sale.code ?? kayit.orderNo}
                              </Baglanti>
                            ) : (
                              <span className="text-muted-foreground">
                                {kayit.orderNo ?? "—"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <KopyalanabilirKod
                              deger={kayit.externalId}
                              etiket={t("faturaNo")}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {kayit.rawType ?? kayit.code}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {bicim.para(kayit.amount, kayit.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                durum === "GECIKTI" ? "secondary" : "outline"
                              }
                            >
                              {durum === "GECIKTI"
                                ? t("gecikti")
                                : t("bekliyor")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* SESSİZ KESME YOK: kaç kalemin gösterilmediği yazar.
                    Görünmeyen 12 satır, "hepsi bu" sanılmamalı. */}
                {bekleyenler.length > LISTE_SINIRI ? (
                  <p className="text-sm font-medium">
                    {t("listeKesildi", {
                      gosterilen: LISTE_SINIRI,
                      toplam: bekleyenler.length,
                    })}
                  </p>
                ) : null}
                <p className="text-muted-foreground text-xs">
                  {t("faturaNoNotu")}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
