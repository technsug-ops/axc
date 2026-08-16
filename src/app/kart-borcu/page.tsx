import Link from "next/link";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";
import { DurumRozeti } from "@/components/durum-rozeti";
import { getTranslations } from "next-intl/server";
import { CreditCard, Pencil, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bicimlendirici } from "@/lib/bicim";
import { gunDegeri, gunMetni, isTakvimGunu } from "@/lib/donem";
import {
  donemAnahtari,
  kartBorcuHesapla,
  type BorcAlimi,
} from "@/lib/kart-borcu";
import { faizKategorileri } from "./eylemler";
import { OdemeFormu } from "./odeme-formu";
import { OdemeSatiri } from "./odeme-satiri";
import { IstatistikKutusu } from "@/components/istatistik-kutusu";
import { SekmeliBolum } from "@/components/sekmeli-bolum";
import { prisma } from "@/lib/prisma";

import type { Currency } from "@/generated/prisma/enums";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

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

export default async function KartBorcuSayfasi({
  searchParams,
}: {
  /** Seçili kart sekmesi — seçim ADRESTE yaşar (bkz. sekmeli-bolum.tsx). */
  searchParams: Promise<{ kart?: string }>;
}) {
  await sayfaIzni("kart.gor");

  /**
   * ════════════════════════════════════════════════════════════════════
   *  SAYFA İZNİ ≠ ÖDEME İZNİ (K19, 16.08.2026)
   * --------------------------------------------------------------------
   *  Sayfayı `kart.gor` açıyor. Ama ödeme kaydetmek bir PARA işlemidir
   *  ve eylemler ayrıca `satis.kar.gor` istiyor. Sayfa bunu sormuyordu:
   *  yalnız `kart.gor` olan kullanıcı formu GÖRÜYOR, dolduruyor, kaydete
   *  basıyor ve ancak o zaman yetki hatası alıyordu.
   *
   *  Yazma güvendeydi (sunucu eylemi durduruyor) ama kullanıcı yapamayacağı
   *  bir işe DAVET ediliyordu — çıkmaza götüren uyarı, anayasadaki
   *  "kural teslim edilebilir mi" süzgecinin tam örneği.
   *
   *  Düğmeyi pasif yapmak da yetmez (İlke #5: sessiz başarısızlık yasak):
   *  yetki yoksa form hiç çizilmez ve NEDEN çizilmediği yazılır.
   * ════════════════════════════════════════════════════════════════════
   */
  const odemeYetkisi = await izinVarMi("satis.kar.gor");

  const t = await getTranslations("KartBorcu");
  const ortak = await getTranslations("Ortak");
  const tOdeme = await getTranslations("KartOdeme");
  const bicim = await bicimlendirici();
  const { kart: seciliKartParam } = await searchParams;

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
  const bugunMetni = gunMetni(bugun);

  /**
   * KART ÖDEMELERİ — ekstre dönemine göre eşlenecek.
   *
   * Ödeme kaydı geldiği için "geçmiş ekstreler ödenmiş sayılır" varsayımı
   * artık gerekmiyor: hangi ekstreye ne ödendiği GERÇEK kayıttan okunuyor.
   */
  const odemeler = await prisma.kartOdeme.findMany({
    orderBy: { odemeTarihi: "asc" },
    select: {
      id: true,
      cardId: true,
      donem: true,
      ekstreBorcu: true,
      odenenAnaBorc: true,
      odemeTarihi: true,
      faizTutar: true,
      isReversal: true,
      reversedBy: { select: { id: true } },
    },
  });

  /**
   * Faiz giderinin yazılabileceği AKTİF kategoriler.
   *
   * Kullanıcı SEÇER; sessizce kategori yaratılmaz (mimar kararı) ama tek bir
   * ADA da bağlanmaz. Tek ada bağlıydı ve kategori yoksa form "ayarlardan
   * ekle" diyordu — oysa gider kategorisi ekleyecek EKRAN YOK, yani uyarı
   * çıkmaza götürüyordu (16.08.2026 bulgusu).
   */
  const kategoriler = await faizKategorileri();

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

  /**
   * ÖZET HESABI — ÇİZİMDEN AYRI.
   *
   * `kartBorcuHesapla` burada özet için, aşağıda sekme içeriği için olmak
   * üzere iki kez çağrılıyor. İKİNCİ BİR KURAL YAZILMIYOR, aynı saf
   * fonksiyon çağrılıyor — iki farklı toplam doğması imkânsız. Kopyalasaydık
   * panodaki rakam ile sekmedeki rakam bir gün ayrışırdı.
   */
  /** Bir kartın ödeme kayıtları, saf hesabın beklediği biçimde. */
  const kartinOdemeleri = (kartId: string) =>
    odemeler
      .filter((o) => o.cardId === kartId)
      .map((o) => ({
        donem: o.donem,
        odenenAnaBorc: Number(o.odenenAnaBorc.toString()),
      }));

  const kartHesaplari = kartlar.map((kart) => {
    const borclar: BorcAlimi[] = [];
    for (const a of alimlar.filter((x) => x.creditCardId === kart.id)) {
      const { tutar } = kartTutari(a, kart.currency);
      if (tutar <= 0) continue;
      borclar.push({
        id: a.id,
        kod: a.code,
        tarih: a.purchasedAt,
        tutar,
        taksitSayisi: a.installmentCount,
      });
    }
    const limit =
      kart.creditLimitCurrency === kart.currency
        ? sayi(kart.creditLimitAmount)
        : null;
    const sonuc = kartBorcuHesapla(
      borclar,
      { kesimGunu: kart.statementDay, sonOdemeGunu: kart.dueDay, limit },
      bugun,
      kartinOdemeleri(kart.id),
    );
    /**
     * "Önce hangisini ödemeliyim" — KAPANMAMIŞ ilk ekstre.
     *
     * Eskiden "geçmemiş ilk ekstre" idi; geçmişler nasılsa ödenmiş
     * sayıldığı için doğruydu. Artık geçmiş bir ekstre açık kalabiliyor
     * ve sıradaki iş odur — gecikmiş borç, gelecek borçtan önce gelir.
     * Ekstreler kesim tarihine göre sıralı olduğundan ilk eşleşen zaten
     * en eskisidir.
     */
    const yakin =
      sonuc.ekstreler.find((e) => e.sonOdemeTarihi !== null && e.kalan > 0) ??
      null;
    return { kart, sonuc, limit, yakin };
  });

  /** Para birimi başına toplam — ÇEVRİM YOK, her birim kendi kutusunda. */
  const paraOzeti = new Map<
    Currency,
    {
      bekleyen: number;
      gecikmis: number;
      limit: number;
      limitVar: boolean;
      adet: number;
    }
  >();
  for (const h of kartHesaplari) {
    const g = paraOzeti.get(h.kart.currency) ?? {
      bekleyen: 0,
      gecikmis: 0,
      limit: 0,
      limitVar: false,
      adet: 0,
    };
    /**
     * ÖZETTE AÇIK BORCUN TAMAMI DURUR. `bekleyenToplam` artık yalnız GELECEK
     * ekstreleri sayıyor; özete onu yazsaydık gecikmiş borç ekranda hiç
     * görünmezdi — varsayımı kaldırıp yerine SESSİZLİK koymuş olurduk.
     * Gecikmiş ayrıca da gösterilir, çünkü aciliyeti farklıdır.
     */
    g.bekleyen += h.sonuc.acikToplam;
    g.gecikmis += h.sonuc.gecikmisToplam;
    g.adet += 1;
    if (h.limit !== null) {
      g.limit += h.limit;
      g.limitVar = true;
    }
    paraOzeti.set(h.kart.currency, g);
  }

  /**
   * ════════════════════════════════════════════════════════════════════
   *  "YAKLAŞAN" DEĞİL "SIRADAKİ" — 16.08.2026 canlı bulgusu
   * --------------------------------------------------------------------
   *  Bu kutu eskiden "en yakın son ödeme" idi ve geçmiş ekstreler zaten
   *  ödenmiş sayıldığı için gösterdiği tarih hep GELECEKTEYDİ. Varsayım
   *  kalkınca değer "kapanmamış ilk ekstre"ye döndü ve ekranda 02.02.2026
   *  belirdi — bugünden altı ay ÖNCE. Etiket "en yakın" derken geçmiş bir
   *  tarih göstermek, kullanıcıya sistemin bozulduğunu düşündürür.
   *
   *  Rakam doğruydu, ADI yanlıştı. Değer değişince etiketin de değişmesi
   *  gerekiyordu: sıradaki iş, gecikmişse gecikmiş olduğu SÖYLENEREK.
   * ════════════════════════════════════════════════════════════════════
   */
  const siradakiOdeme =
    kartHesaplari
      .filter((h) => h.yakin?.sonOdemeTarihi)
      .map((h) => ({
        sonOdeme: h.yakin!.sonOdemeTarihi!,
        tutar: h.yakin!.kalan,
        etiket: h.kart.label,
        paraBirimi: h.kart.currency,
        gecikmisMi: h.yakin!.sonOdemeTarihi!.getTime() < bugun.getTime(),
      }))
      .sort((a, b) => a.sonOdeme.getTime() - b.sonOdeme.getTime())[0] ?? null;

  /**
   * SEKME SIRASI: BEKLEYEN TUTARA GÖRE AZALAN — alfabetik DEĞİL.
   *
   * Kullanıcı kararı 16.08.2026: borç ekranında sıralama ölçütü AD değil
   * TUTARDIR; ekran "hangi kartı önce ödemeliyim" sorusuna hizmet eder.
   * Ad sekme etiketinde durduğu için arama kaybolmuyor.
   */
  const siraliKartlar = [...kartHesaplari]
    .sort((a, b) => b.sonuc.acikToplam - a.sonuc.acikToplam)
    .map((h) => h.kart);

  /**
   * Seçili sekme; bilinmeyen/eksik seçim EN BORÇLU karta düşer (sıralı
   * listenin ilki), boş ekran yok.
   */
  const seciliKart =
    siraliKartlar.find((k) => k.id === seciliKartParam)?.id ??
    siraliKartlar[0]?.id ??
    "";

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
          {/* ═════════════════ TOPLAM PANOSU ═════════════════
              Kartlar sekmeye alındığı için "hepsi birden" görünümü burada
              duruyor. Sekme yalnız AYNI ANDA gerekmeyen şeyleri ayırır;
              toplamlar birlikte okunmalı, o yüzden üstte ve hep açık.

              PARA BİRİMİ ÇEVRİLMEZ: her birim kendi kutusunda toplanır. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...paraOzeti.entries()].map(([birim, g]) => (
              <IstatistikKutusu
                key={birim}
                etiket={t("toplamBekleyen", { paraBirimi: birim })}
                cocuk={bicim.para(g.bekleyen, birim)}
                /**
                 * GECİKMİŞ BORÇ AYRI SÖYLENİR. Büyük rakam açık borcun
                 * tamamı; içindeki gecikmiş kısım aciliyeti farklı olduğu
                 * için kendi rozetinde durur. Gecikme yoksa rozet de yok —
                 * "borcun yok" bir başarı değil, sıradan hâldir.
                 */
                rozet={
                  g.gecikmis > 0 ? (
                    <DurumRozeti durum="olumsuz" isaretsiz>
                      {t("gecikmisRozeti", {
                        tutar: bicim.para(g.gecikmis, birim),
                      })}
                    </DurumRozeti>
                  ) : null
                }
                altNot={
                  <span className="text-muted-foreground">
                    {g.limitVar
                      ? t("toplamLimitNotu", {
                          kalan: bicim.para(g.limit - g.bekleyen, birim),
                          adet: g.adet,
                        })
                      : t("kartAdedi", { adet: g.adet })}
                  </span>
                }
              />
            ))}
            {/* "Önce hangisini ödemeliyim" — kapanmamış ilk ekstrenin vadesi. */}
            {siradakiOdeme ? (
              <IstatistikKutusu
                etiket={t("siradakiOdeme")}
                cocuk={bicim.tarih(siradakiOdeme.sonOdeme)}
                /* Vadesi geçmiş bir tarihi sessizce göstermek yasak: tarih
                   tek başına "geç kaldım" demez, rozet der. */
                rozet={
                  siradakiOdeme.gecikmisMi ? (
                    <DurumRozeti durum="olumsuz" isaretsiz>
                      {t("vadesiGecti")}
                    </DurumRozeti>
                  ) : null
                }
                altNot={
                  <span className="text-muted-foreground">
                    {siradakiOdeme.etiket} ·{" "}
                    {bicim.para(siradakiOdeme.tutar, siradakiOdeme.paraBirimi)}
                  </span>
                }
              />
            ) : null}
          </div>

          <SekmeliBolum
            baslik={t("kartlarBaslik")}
            notu={t("kartlarNotu")}
            secili={seciliKart}
            sekmeler={siraliKartlar.map((kart) => {
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
              kartinOdemeleri(kart.id),
            );

            const para = (n: number) => bicim.para(n, kart.currency);
            const limit =
              kart.creditLimitCurrency === kart.currency
                ? sayi(kart.creditLimitAmount)
                : null;
            const doluluk =
              limit && limit > 0
                ? Math.round((sonuc.acikToplam / limit) * 100)
                : null;

            return {
              anahtar: kart.id,
              // Sekme etiketi kart adı + bekleyen tutar: hangi karta
              // bakacağını sekmeye tıklamadan görebil (İlke #9).
              etiket: `${kart.label} · ${para(sonuc.acikToplam)}`,
              adres: `/kart-borcu?kart=${kart.id}`,
              icerik: (
              <section
                key={kart.id}
                className="space-y-4"
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
                  <div className={`space-y-3 rounded-md p-4 ${DURUM_KUTUSU.uyari}`}>
                    <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
                      <TriangleAlert className="size-4 shrink-0" />
                      {t("hesaplanamazBaslik")}
                    </p>
                    <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
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
                          {para(sonuc.acikToplam)}
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

                            {/* ---------------- ÖDEME KAYDI ----------------
                                Borç burada türetiliyor, ödeme de buraya
                                düşüyor: ekran arası gidiş geliş yok
                                (mimar kararı 15.08.2026, seçenek a). */}
                            {(() => {
                              const anahtar = donemAnahtari(ekstre.kesimTarihi);
                              const donemOdemeleri = odemeler.filter(
                                (o) =>
                                  o.cardId === kart.id &&
                                  donemAnahtari(o.donem) === anahtar,
                              );
                              const netOdenen = donemOdemeleri.reduce(
                                (top, o) => top + Number(o.odenenAnaBorc.toString()),
                                0,
                              );
                              return (
                                <div className="space-y-2 border-t pt-2">
                                  {donemOdemeleri.length > 0 ? (
                                    <>
                                      <div className="text-xs font-medium">
                                        {tOdeme("odemeler")}
                                      </div>
                                      {donemOdemeleri.map((o) => (
                                        <OdemeSatiri
                                          key={o.id}
                                          odemeId={o.id}
                                          odenen={Number(o.odenenAnaBorc.toString())}
                                          faiz={Number(o.faizTutar.toString())}
                                          tarih={bicim.tarih(o.odemeTarihi)}
                                          paraBirimi={kart.currency}
                                          tersMi={o.isReversal}
                                          tersAlinmisMi={o.reversedBy !== null}
                                          /* Ters almak da yazma işlemidir —
                                             aynı izne bağlı. */
                                          yetkiVar={odemeYetkisi}
                                        />
                                      ))}
                                      {/* Kalan TÜRETİLİR, saklanmaz. */}
                                      <div className="flex flex-wrap justify-between gap-2 text-sm">
                                        <span className="text-muted-foreground">
                                          {tOdeme("kalan")}
                                        </span>
                                        <span className="tabular-nums font-medium">
                                          {para(ekstre.toplam - netOdenen)}
                                        </span>
                                      </div>
                                    </>
                                  ) : null}
                                  {/**
                                   * KAYIT DEĞİŞİNCE FORM SIFIRLANIR — 16.08.2026 canlı bulgusu.
                                   *
                                   * Ödeme kaydedilince sunucu verisi tazeleniyor ve "Kalan"
                                   * ₺0,00'a düşüyordu, ama formun içindeki tutar EN SON
                                   * yazılan değerde kalıyordu: ekranda "Kalan ₺0,00" ile
                                   * dolu bir "283,33" alanı yan yana duruyordu. Sebep
                                   * useState: ilk değer yalnız bileşen KURULURKEN okunur,
                                   * prop sonradan değişince yeniden çalışmaz.
                                   *
                                   * key ödeme kümesini taşır; küme değişince React bileşeni
                                   * yeniden kurar ve ön-dolu değer taze kalandan hesaplanır.
                                   * Alternatif (useEffect ile eşitleme) kullanıcı yazarken
                                   * de tetiklenip elle girilen tutarı ezerdi.
                                   */}
                                  {!odemeYetkisi ? (
                                    <p className="text-muted-foreground text-xs">
                                      {tOdeme("yetkiYok")}
                                    </p>
                                  ) : (
                                  <OdemeFormu
                                    key={`${anahtar}-${donemOdemeleri.length}-${netOdenen}`}
                                    cardId={kart.id}
                                    donem={anahtar}
                                    donemEtiketi={bicim.tarih(ekstre.kesimTarihi)}
                                    ekstreBorcu={ekstre.toplam}
                                    paraBirimi={kart.currency}
                                    mevcutKayitlar={donemOdemeleri.map((o) => ({
                                      odenenAnaBorc: Number(
                                        o.odenenAnaBorc.toString(),
                                      ),
                                    }))}
                                    bugun={bugunMetni}
                                    kategoriler={kategoriler}
                                  />
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ------------- FARKLI PARA BİRİMİ: SESSİZ ATLANMAZ ------- */}
                {farkliParaBirimiSayisi > 0 ? (
                  <div className={`rounded-md p-3 text-xs ${DURUM_KUTUSU.uyari}`}>
                    <strong>
                      {t("farkliParaBirimi", { sayi: farkliParaBirimiSayisi })}
                    </strong>{" "}
                    {t("farkliParaBirimiNotu", { paraBirimi: kart.currency })}
                  </div>
                ) : null}
              </section>
              ),
            };
          })}
          />

          <p className="text-muted-foreground text-xs">{t("varsayimNotu")}</p>
        </div>
      )}
    </div>
  );
}
