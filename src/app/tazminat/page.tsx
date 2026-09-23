import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { PackageX, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { SatirKarti, SatirListesi } from "@/components/satir-karti";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici, tarihGirdisi } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";
import {
  acikAlacakToplami,
  acikMi,
  kalanTalepEdilebilirAdet,
  varsayilanTalepTutari,
  karsiTarafAdi,
} from "@/lib/tazminat";

import { DurumSecici } from "./durum-secici";
import { NotAlani } from "./not-alani";
import { TalepFormu, type HasarKalemi } from "./talep-formu";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("tazminat") };
}

export default async function TazminatSayfasi() {
  await sayfaIzni("tazminat.yaz");

  const t = await getTranslations("Tazminat");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const [talepler, hasarliKalemler, hasarliIadeler] = await Promise.all([
    prisma.compensation.findMany({
      include: {
        supplier: { select: { name: true } },
        purchaseItem: {
          select: {
            variant: {
              select: { sku: true, product: { select: { name: true } } },
            },
            purchase: { select: { id: true, code: true } },
          },
        },
        returnItem: {
          select: {
            variant: {
              select: { sku: true, product: { select: { name: true } } },
            },
            return: { select: { saleId: true, sale: { select: { code: true } } } },
          },
        },
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    }),
    // Mal kabulde HASARLI sayılmış kalemler — talebin kaynağı.
    prisma.purchaseItem.findMany({
      where: { damagedQuantity: { gt: 0 } },
      select: {
        id: true,
        damagedQuantity: true,
        damageNote: true,
        unitCostAmount: true,
        unitCostCurrency: true,
        variant: {
          select: { sku: true, product: { select: { name: true } } },
        },
        purchase: {
          select: { code: true, supplier: { select: { name: true } } },
        },
        compensations: { select: { quantity: true } },
      },
      orderBy: { id: "desc" },
    }),
    // İKİNCİ KAYNAK: müşteriden hasarlı dönen iade kalemleri.
    prisma.returnItem.findMany({
      where: { damagedQuantity: { gt: 0 } },
      select: {
        id: true,
        damagedQuantity: true,
        damageNote: true,
        variantId: true,
        variant: {
          select: { sku: true, product: { select: { name: true } } },
        },
        return: { select: { sale: { select: { code: true } } } },
        compensations: { select: { quantity: true } },
      },
      orderBy: { id: "desc" },
    }),
  ]);

  /**
   * İade tarafında tedarikçi ve maliyet DOLAYLI bulunur: o varyantın en son
   * alındığı parti. Tek sorguda toplanır; varyant başına tek kayıt yeter.
   */
  const iadeVaryantlari = [...new Set(hasarliIadeler.map((i) => i.variantId))];
  const sonAlimlar = iadeVaryantlari.length
    ? await prisma.purchaseItem.findMany({
        where: {
          variantId: { in: iadeVaryantlari },
          purchase: { NOT: { supplierId: null } },
        },
        select: {
          variantId: true,
          unitCostAmount: true,
          unitCostCurrency: true,
          purchase: {
            select: { purchasedAt: true, supplier: { select: { name: true } } },
          },
        },
        orderBy: { purchase: { purchasedAt: "desc" } },
      })
    : [];

  const sonAlimHaritasi = new Map<string, (typeof sonAlimlar)[number]>();
  for (const a of sonAlimlar) {
    if (!sonAlimHaritasi.has(a.variantId)) sonAlimHaritasi.set(a.variantId, a);
  }

  // --- açık alacak: para birimi başına, tedarikçiden bağımsız toplam ---
  const acikToplam = acikAlacakToplami(
    talepler.map((k) => ({
      durum: k.status,
      tutar: Number(k.amount.toString()),
      paraBirimi: k.currency,
    })),
  );

  // --- talep bekleyen hasar ---
  const bekleyenler: HasarKalemi[] = hasarliKalemler
    .map((k) => {
      const kalan = kalanTalepEdilebilirAdet(
        k.damagedQuantity,
        k.compensations.map((c) => c.quantity),
      );
      return {
        kaynak: "alim" as const,
        kalemId: k.id,
        baglam: k.purchase.code,
        tedarikci: k.purchase.supplier?.name ?? "—",
        urun: k.variant.product.name,
        sku: k.variant.sku,
        hasarliAdet: k.damagedQuantity,
        kalanAdet: kalan,
        onerilenTutar: varsayilanTalepTutari(
          kalan,
          Number(k.unitCostAmount.toString()),
        ),
        paraBirimi: k.unitCostCurrency,
        hasarNotu: k.damageNote,
      };
    })
    .filter((k) => k.kalanAdet > 0);

  const bekleyenIadeler: HasarKalemi[] = hasarliIadeler
    .map((i) => {
      const kalan = kalanTalepEdilebilirAdet(
        i.damagedQuantity,
        i.compensations.map((c) => c.quantity),
      );
      const sonAlim = sonAlimHaritasi.get(i.variantId);
      return {
        kaynak: "iade" as const,
        kalemId: i.id,
        baglam: i.return.sale.code ?? "—",
        tedarikci: sonAlim?.purchase.supplier?.name ?? "—",
        urun: i.variant.product.name,
        sku: i.variant.sku,
        hasarliAdet: i.damagedQuantity,
        kalanAdet: kalan,
        onerilenTutar: varsayilanTalepTutari(
          kalan,
          sonAlim ? Number(sonAlim.unitCostAmount.toString()) : 0,
        ),
        paraBirimi: sonAlim?.unitCostCurrency ?? "TRY",
        hasarNotu: i.damageNote,
      };
    })
    .filter((i) => i.kalanAdet > 0);

  // İki kaynak TEK listede: kullanıcı için ikisi de "talep bekleyen hasar".
  const tumBekleyenler = [...bekleyenler, ...bekleyenIadeler];

  /** Talep hangi kaynaktan gelirse gelsin ürün adı tek yerden okunur. */
  function talepUrunu(k: (typeof talepler)[number]): string {
    return (
      k.purchaseItem?.variant.product.name ??
      k.returnItem?.variant.product.name ??
      "—"
    );
  }

  const bugun = tarihGirdisi(new Date());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
      </div>

      {/* ----------------------- AÇIK ALACAK ÖZETİ ---------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("acikAlacak")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {acikToplam.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("talepYok")}</p>
          ) : (
            <div className="flex flex-wrap gap-6">
              {acikToplam.map((a) => (
                <div key={a.paraBirimi}>
                  <div className="text-2xl font-semibold">
                    {bicim.para(a.tutar, a.paraBirimi)}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-muted-foreground text-xs">{t("acikAlacakNotu")}</p>
        </CardContent>
      </Card>

      {/* -------------------- TALEP BEKLEYEN HASAR ---------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("talepEdilebilir")} ({tumBekleyenler.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tumBekleyenler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <PackageX className="text-muted-foreground mx-auto size-6" />
              <p className="mt-2 font-medium">{t("hasarBosBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("hasarBosIpucu")}
              </p>
            </div>
          ) : (
            <SatirListesi>
              {tumBekleyenler.map((h) => (
                <SatirKarti
                  key={`${h.kaynak}-${h.kalemId}`}
                  baslik={h.urun}
                  baglam={[
                    h.tedarikci,
                    h.baglam,
                    h.kaynak === "iade" ? (
                      <Badge variant="outline">{t("kaynakIade")}</Badge>
                    ) : null,
                    <>
                      {t("hasarliAdet")}: <strong>{h.hasarliAdet}</strong>
                    </>,
                    <>
                      {t("kalanAdet")}: <strong>{h.kalanAdet}</strong>
                    </>,
                  ]}
                  sag={<TalepFormu hasar={h} bugun={bugun} />}
                />
              ))}
            </SatirListesi>
          )}
          <p className="text-muted-foreground text-xs">
            {t("talepEdilebilirNotu")}
          </p>
        </CardContent>
      </Card>

      {/* --------------------------- TALEPLER --------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>{t("talepler", { sayi: talepler.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {talepler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("bosBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("bosIpucu")}
              </p>
            </div>
          ) : (
            /*
             * ⚠ TEK RENDER (K235, 22.09.2026): burada aynı liste İKİ KEZ
             * çiziliyordu — masaüstü `<Table>` (7 sütun) ve telefon
             * `ListeKarti`. Satır kartı ikisinin yerine geçer: `flex-wrap`
             * ile telefonda da okunur ve "birini düzeltip ötekini unutma"
             * riski ortadan kalkar (İlke #10).
             * ⚠ DURUM KAYBOLMADI: rozet yerine DurumSecici zaten durumu
             * YAZIYOR ve değiştirilebilir kılıyor — iki yerde iki gösterim
             * olmasın.
             */
            <SatirListesi>
              {talepler.map((k) => (
                <SatirKarti
                  key={k.id}
                  baslik={talepUrunu(k)}
                  baglam={[
                    bicim.tarih(k.occurredAt),
                    karsiTarafAdi(k) ?? t("karsiTarafYok"),
                    /* Kaynak neyse oraya götürür: alım kaydına ya da hasarın
                       döndüğü satışa (İlke #16). */
                    k.purchaseItem ? (
                      <Baglanti href={`/alimlar/${k.purchaseItem.purchase.id}`}>
                        {k.purchaseItem.purchase.code}
                      </Baglanti>
                    ) : k.returnItem ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Badge variant="outline">{t("kaynakIade")}</Badge>
                        <Baglanti href={`/satislar/${k.returnItem.return.saleId}`}>
                          {k.returnItem.return.sale.code ?? "—"}
                        </Baglanti>
                      </span>
                    ) : null,
                    `${ortak("adet")}: ${k.quantity}`,
                  ]}
                  /*
                    ⛔ SÜTUNLAR SABİT (K235-③): tutar ve not satırdan satıra
                    farklı genişlikte olduğu için sağ blok kayıyordu ve
                    ARADAKİ açılır kutu her satırda başka yerde duruyordu.
                    Genişlikler uydurulmadı, en uzun içeriğe göre seçildi:
                    tutar `₺123.456,78` (11 hane) 8rem'e sığar · seçici
                    zaten `w-40` · not `w-48`.
                  */
                  sagIzgara="sm:grid-cols-[8rem_10rem_12rem]"
                  sag={
                    <>
                      <span
                        className={`tabular-nums whitespace-nowrap sm:text-right ${
                          acikMi(k.status) ? "font-semibold" : ""
                        }`}
                      >
                        {bicim.para(k.amount, k.currency)}
                      </span>
                      <DurumSecici kayitId={k.id} mevcut={k.status} />
                      <NotAlani kayitId={k.id} not={k.note} />
                    </>
                  }
                />
              ))}
            </SatirListesi>
          )}

          <p className="text-muted-foreground flex items-start gap-2 text-xs">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {t("listeNotu")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
