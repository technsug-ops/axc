import { getTranslations } from "next-intl/server";
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
} from "@/lib/tazminat";

import { DurumSecici } from "./durum-secici";
import { TalepFormu, type HasarKalemi } from "./talep-formu";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("tazminat") };
}

export default async function TazminatSayfasi() {
  const t = await getTranslations("Tazminat");
  const tDurum = await getTranslations("TazminatDurumu");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  const [talepler, hasarliKalemler] = await Promise.all([
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
  ]);

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
        purchaseItemId: k.id,
        alimKodu: k.purchase.code,
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
            {t("talepEdilebilir")} ({bekleyenler.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bekleyenler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <PackageX className="text-muted-foreground mx-auto size-6" />
              <p className="mt-2 font-medium">{t("hasarBosBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("hasarBosIpucu")}
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {bekleyenler.map((h) => (
                <div
                  key={h.purchaseItemId}
                  className="flex flex-wrap items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{h.urun}</div>
                    <div className="text-muted-foreground text-xs">
                      {h.tedarikci} · {h.alimKodu} · {t("hasarliAdet")}:{" "}
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
                        <TableCell>{k.supplier.name}</TableCell>
                        <TableCell className="max-w-[18rem]">
                          <span className="block truncate">
                            {k.purchaseItem?.variant.product.name ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {k.purchaseItem ? (
                            <Baglanti
                              href={`/alimlar/${k.purchaseItem.purchase.id}`}
                            >
                              {k.purchaseItem.purchase.code}
                            </Baglanti>
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
                    baslik={k.purchaseItem?.variant.product.name ?? "—"}
                    altBaslik={`${k.supplier.name} · ${bicim.tarih(k.occurredAt)}`}
                    alanlar={[
                      {
                        etiket: t("sutunAlim"),
                        deger: k.purchaseItem ? (
                          <KopyalanabilirKod
                            deger={k.purchaseItem.purchase.code}
                            etiket={t("sutunAlim")}
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
