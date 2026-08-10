import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CreditCard, Pencil, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bicimlendirici } from "@/lib/bicim";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { kartBorcuHesapla, type BorcAlimi } from "@/lib/kart-borcu";
import { prisma } from "@/lib/prisma";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  KART BORCU
 * ----------------------------------------------------------------------------
 *  Ayrı ekstre kaydı TUTULMAZ (kullanıcı kararı 10.08.2026): borç alımlardan
 *  türetilir. Bu ekran yalnızca hesaplar ve gösterir — hiçbir şey yazmaz.
 *
 *  PARA BİRİMİ ÇEVRİLMEZ: kart hangi para biriminde ekstre kesiyorsa yalnız o
 *  para birimindeki tutarlar toplanır. Başka para birimindeki alımlar sessizce
 *  atlanmaz; sayısı ekranda yazar.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("kartBorcu") };
}

export default async function KartBorcuSayfasi() {
  const t = await getTranslations("KartBorcu");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const kartlar = await prisma.creditCard.findMany({
    where: { isActive: true },
    orderBy: { label: "asc" },
  });

  const alimlar = await prisma.purchase.findMany({
    where: { creditCardId: { not: null }, NOT: { status: "CANCELLED" } },
    include: {
      items: {
        select: {
          quantity: true,
          unitCostAmount: true,
          unitCostCurrency: true,
        },
      },
    },
    orderBy: { purchasedAt: "asc" },
  });

  // "Bugün" iş saat diliminde; ekstre geçmiş mi kararı buna bakar.
  const bugun = gunDegeri(isTakvimGunu(new Date()));
  const sayi = (d: { toString(): string } | null) =>
    d === null ? null : Number(d.toString());

  /**
   * Bir alımın KARTIN para birimindeki tutarı.
   * Kalemler gerçeğin kaynağıdır; `goodsAmount` karma para biriminde boş
   * kalabiliyor. Kargo ve vergi yalnız para birimi tutuyorsa eklenir.
   */
  function kartTutari(
    alim: (typeof alimlar)[number],
    paraBirimi: Currency,
  ): { tutar: number; farkliVar: boolean } {
    let tutar = 0;
    let farkliVar = false;

    for (const k of alim.items) {
      const satir = Number(k.unitCostAmount.toString()) * k.quantity;
      if (k.unitCostCurrency === paraBirimi) tutar += satir;
      else farkliVar = true;
    }
    if (alim.shippingAmount && alim.shippingCurrency === paraBirimi) {
      tutar += Number(alim.shippingAmount.toString());
    }
    if (alim.taxAmount && alim.taxCurrency === paraBirimi) {
      tutar += Number(alim.taxAmount.toString());
    }
    return { tutar, farkliVar };
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
          <Link href="/kartlar">
            <CreditCard />
            {ortak("kart")}
          </Link>
        </Button>
      </div>

      {kartlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{t("kartYokBaslik")}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("kartYokIpucu")}
          </p>
          <Button className="mt-4" asChild>
            <Link href="/kartlar/yeni">{ortak("ekle")}</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {kartlar.map((kart) => {
            const kartAlimlari = alimlar.filter(
              (a) => a.creditCardId === kart.id,
            );

            let farkliParaBirimiSayisi = 0;
            const borcAlimlari: BorcAlimi[] = [];
            for (const a of kartAlimlari) {
              const { tutar, farkliVar } = kartTutari(a, kart.currency);
              if (farkliVar && tutar === 0) {
                farkliParaBirimiSayisi++;
                continue;
              }
              if (farkliVar) farkliParaBirimiSayisi++;
              if (tutar <= 0) continue;
              borcAlimlari.push({
                id: a.id,
                kod: a.code,
                tarih: a.purchasedAt,
                tutar,
                taksitSayisi: a.installmentCount,
              });
            }

            const sonuc = kartBorcuHesapla(
              borcAlimlari,
              {
                kesimGunu: kart.statementDay,
                sonOdemeGunu: kart.dueDay,
                limit:
                  kart.creditLimitCurrency === kart.currency
                    ? sayi(kart.creditLimitAmount)
                    : null,
              },
              bugun,
            );

            const para = (n: number) => bicim.para(n, kart.currency);
            const limit =
              kart.creditLimitCurrency === kart.currency
                ? sayi(kart.creditLimitAmount)
                : null;
            const doluluk =
              limit && limit > 0
                ? Math.round((sonuc.bekleyenToplam / limit) * 100)
                : null;

            return (
              <section
                key={kart.id}
                className="space-y-4 rounded-lg border p-4 md:p-5"
              >
                {/* ------------------------ KART BAŞLIĞI ------------------- */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Baglanti href={`/kartlar/${kart.id}`}>
                        {kart.label}
                      </Baglanti>
                      <Badge variant="secondary">••{kart.last4}</Badge>
                      <Badge variant="outline">{kart.currency}</Badge>
                    </div>
                    {kart.bankName ? (
                      <div className="text-muted-foreground text-xs">
                        {kart.bankName}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-xs">
                    <span>
                      {t("kesimGunu")}:{" "}
                      {kart.statementDay
                        ? t("ayinGunu", { gun: kart.statementDay })
                        : "—"}
                    </span>
                    <span>
                      {t("sonOdemeGunu")}:{" "}
                      {kart.dueDay ? t("ayinGunu", { gun: kart.dueDay }) : "—"}
                    </span>
                  </div>
                </div>

                {/* --------------------- HESAPLANAMIYORSA ------------------ */}
                {!sonuc.hesaplanabilir ? (
                  <div className="space-y-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
                    <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                      <TriangleAlert className="size-4 shrink-0" />
                      {t("hesaplanamazBaslik")}
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      {t("hesaplanamazMetin")}
                    </p>
                    {/* Uyarı EYLEME DÖNÜK: kullanıcı kararı 10.08.2026 */}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/kartlar/${kart.id}/duzenle`}>
                        <Pencil />
                        {t("kartiDuzenle")}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* ---------------------- ÖZET ŞERİDİ ------------------ */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">
                          {t("bekleyenToplam")}
                        </div>
                        <div className="text-xl font-semibold">
                          {para(sonuc.bekleyenToplam)}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {t("bekleyenNotu")}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-muted-foreground text-xs">
                          {t("kalanLimit")}
                        </div>
                        {sonuc.kalanLimit === null ? (
                          <div className="text-muted-foreground text-sm">
                            {t("limitYok")}
                          </div>
                        ) : (
                          <>
                            <div
                              className={
                                sonuc.kalanLimit < 0
                                  ? "text-destructive text-xl font-semibold"
                                  : "text-xl font-semibold"
                              }
                            >
                              {para(sonuc.kalanLimit)}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {sonuc.kalanLimit < 0
                                ? t("limitAsildi")
                                : doluluk !== null
                                  ? t("limitDoluluk", { oran: doluluk })
                                  : ""}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* --------------------- EKSTRE DÖKÜMÜ ----------------- */}
                    {sonuc.ekstreler.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {t("ekstreYok")}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {sonuc.ekstreler.map((ekstre) => (
                          <div
                            key={ekstre.kesimTarihi.toISOString()}
                            className={
                              ekstre.gecmisMi
                                ? "bg-muted/40 space-y-2 rounded-lg border p-3 opacity-70"
                                : "space-y-2 rounded-lg border p-3"
                            }
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium">
                                  {t("ekstre")}{" "}
                                  {bicim.tarih(ekstre.kesimTarihi)}
                                </span>
                                {ekstre.sonOdemeTarihi ? (
                                  <span className="text-muted-foreground text-xs">
                                    {t("sonOdeme")}:{" "}
                                    {bicim.tarih(ekstre.sonOdemeTarihi)}
                                  </span>
                                ) : null}
                                {ekstre.gecmisMi ? (
                                  <Badge variant="outline">
                                    {t("gecmisEkstre")}
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="text-base font-semibold">
                                {para(ekstre.toplam)}
                              </div>
                            </div>

                            <dl className="space-y-1 text-sm">
                              {ekstre.taksitler.map((taksit, sira) => (
                                <div
                                  key={`${taksit.alimId}-${sira}`}
                                  className="flex flex-wrap justify-between gap-2"
                                >
                                  <dt className="text-muted-foreground">
                                    <Baglanti
                                      href={`/alimlar/${taksit.alimId}`}
                                      className="font-mono text-xs"
                                    >
                                      {taksit.alimKodu}
                                    </Baglanti>{" "}
                                    <span className="text-xs">
                                      {taksit.toplamTaksit > 1
                                        ? t("taksitEki", {
                                            sira: taksit.sira,
                                            toplam: taksit.toplamTaksit,
                                          })
                                        : t("tekCekim")}
                                    </span>
                                  </dt>
                                  <dd className="whitespace-nowrap">
                                    {para(taksit.tutar)}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ------------- FARKLI PARA BİRİMİ: SESSİZ ATLANMAZ ------- */}
                {farkliParaBirimiSayisi > 0 ? (
                  <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                    <strong>
                      {t("farkliParaBirimi", { sayi: farkliParaBirimiSayisi })}
                    </strong>{" "}
                    {t("farkliParaBirimiNotu", { paraBirimi: kart.currency })}
                  </div>
                ) : null}
              </section>
            );
          })}

          <p className="text-muted-foreground text-xs">{t("varsayimNotu")}</p>
        </div>
      )}
    </div>
  );
}
