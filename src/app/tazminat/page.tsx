import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { PackageX, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
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
import { TalepFormu, type HasarKalemi } from "./talep-formu";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("tazminat") };
}

export default async function TazminatSayfasi() {
  await sayfaIzni("tazminat.yaz");

  const t = await getTranslations("Tazminat");
  const tDurum = await getTranslations("TazminatDurumu");
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
            <div className="divide-y rounded-lg border">
              {tumBekleyenler.map((h) => (
                <div
                  key={`${h.kaynak}-${h.kalemId}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{h.urun}</div>
                    <div className="text-muted-foreground text-xs">
                      {h.tedarikci} · {h.baglam} ·{" "}
                      {h.kaynak === "iade" ? (
                        <Badge variant="outline" className="mr-1">
                          {t("kaynakIade")}
                        </Badge>
                      ) : null}
                      {t("hasarliAdet")}:{" "}
                      <strong>{h.hasarliAdet}</strong> · {t("kalanAdet")}:{" "}
                      <strong>{h.kalanAdet}</strong>
                    </div>
                  </div>
                  <TalepFormu hasar={h} bugun={bugun} />
                </div>
              ))}
            </div>
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
            <>
              {/* -------------------- MASAÜSTÜ: TABLO -------------------- */}
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("sutunTarih")}</TableHead>
                      <TableHead>{t("sutunTedarikci")}</TableHead>
                      <TableHead>{t("sutunUrun")}</TableHead>
                      <TableHead>{t("sutunAlim")}</TableHead>
                      <TableHead className="text-right">
                        {t("sutunAdet")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("sutunTutar")}
                      </TableHead>
                      <TableHead>{t("sutunDurum")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {talepler.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="whitespace-nowrap">
                          {bicim.tarih(k.occurredAt)}
                        </TableCell>
                        <TableCell>{karsiTarafAdi(k) ?? t("karsiTarafYok")}</TableCell>
                        <TableCell className="max-w-[18rem]">
                          <span className="block truncate">
                            {talepUrunu(k)}
                          </span>
                        </TableCell>
                        {/* Kaynak neyse oraya götürür: alım kaydına ya da
                            hasarın döndüğü satışa. */}
                        <TableCell className="whitespace-nowrap">
                          {k.purchaseItem ? (
                            <Baglanti
                              href={`/alimlar/${k.purchaseItem.purchase.id}`}
                            >
                              {k.purchaseItem.purchase.code}
                            </Baglanti>
                          ) : k.returnItem ? (
                            <span className="flex items-center gap-2">
                              <Badge variant="outline">
                                {t("kaynakIade")}
                              </Badge>
                              <Baglanti
                                href={`/satislar/${k.returnItem.return.saleId}`}
                              >
                                {k.returnItem.return.sale.code ?? "—"}
                              </Baglanti>
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {k.quantity}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <span
                            className={acikMi(k.status) ? "font-medium" : ""}
                          >
                            {bicim.para(k.amount, k.currency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DurumSecici kayitId={k.id} mevcut={k.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ---------------------- TELEFON: KART -------------------- */}
              <div className="space-y-3 md:hidden">
                {talepler.map((k) => (
                  <ListeKarti
                    key={k.id}
                    baslik={talepUrunu(k)}
                    altBaslik={`${karsiTarafAdi(k) ?? t("karsiTarafYok")} · ${bicim.tarih(k.occurredAt)}`}
                    alanlar={[
                      {
                        etiket: t("sutunAlim"),
                        deger: k.purchaseItem ? (
                          <KopyalanabilirKod
                            deger={k.purchaseItem.purchase.code}
                            etiket={t("sutunAlim")}
                          />
                        ) : k.returnItem ? (
                          <KopyalanabilirKod
                            deger={k.returnItem.return.sale.code}
                            etiket={t("kaynakIade")}
                          />
                        ) : (
                          "—"
                        ),
                      },
                      { etiket: ortak("adet"), deger: k.quantity },
                      {
                        etiket: t("sutunTutar"),
                        deger: bicim.para(k.amount, k.currency),
                      },
                      {
                        etiket: t("sutunDurum"),
                        deger: (
                          <Badge
                            variant={acikMi(k.status) ? "secondary" : "outline"}
                          >
                            {tDurum(k.status)}
                          </Badge>
                        ),
                      },
                    ]}
                    eylemler={<DurumSecici kayitId={k.id} mevcut={k.status} />}
                  />
                ))}
              </div>
            </>
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
