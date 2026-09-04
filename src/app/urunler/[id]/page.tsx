import Link from "next/link";
import { izinVarMi, sayfaIzni } from "@/lib/yetki";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PackagePlus, Pencil } from "lucide-react";

import { Baglanti, GeriBaglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { TyGonderim } from "../../kart/[variantId]/ty-gonderim";
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
import { prisma } from "@/lib/prisma";
import { kdvOraniniCoz } from "@/lib/kdv";
import { varyantStoklari } from "@/lib/stok";

import { SilButonu } from "../sil-butonu";
import { DURUM_KUTUSU } from "@/lib/renkler";
import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";

export default async function UrunDetaySayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await sayfaIzni("urun.gor");

  const { id } = await params;

  const urun = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { name: true, vatRate: true } },
      variants: {
        include: { options: true, location: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!urun) notFound();

  const bicim = await bicimlendirici();
  const t = await getTranslations("Urunler");
  // Kârlılık kartı bağlantısının etiketi Urun sözlüğünde (varyant terimi orada).
  const tUrun = await getTranslations("Urun");
  const ortak = await getTranslations("Ortak");

  // KDV oranı tek yerden çözülür: ürün istisnası > kategori > varsayılan.
  const kdv = kdvOraniniCoz(urun);

  // Stok hesabı tek yerde: src/lib/stok.ts (ledger toplamı).
  const stokHaritasi = await varyantStoklari(urun.variants.map((v) => v.id));
  /** K169: kanala gönderim düğmesi yalnız yetkili göze çizilir. */
  const kanalYazGorunur = await izinVarMi("kanal.yaz");

  /** Alım kısayolu bunu taşır; sıralama zaten isDefault'u başa alıyor. */
  const varsayilanVaryant =
    urun.variants.find((v) => v.isDefault) ?? urun.variants[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <ListeyeDon href="/urunler">{t("baslik")}</ListeyeDon>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{urun.name}</h1>
            <p className="text-muted-foreground text-sm">
              {t("altBilgi", {
                marka: urun.brand ?? t("markaBelirtilmemis"),
                tarih: bicim.tarih(urun.createdAt),
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* ALIM GİR — ürünü bulup "şimdi ne yapacağım" diye kalmak
                İlke #1 ve #9 ihlaliydi: kullanıcı ürünü buluyor ama alım
                girmek için /alimlar'a gidip aynı ürünü yeniden aramak
                zorunda kalıyordu. Varsayılan varyantı taşıyoruz; form o
                kalemi hazır ekliyor. */}
            {varsayilanVaryant ? (
              <Button asChild>
                <Link href={`/alimlar/yeni?varyant=${varsayilanVaryant.id}`}>
                  <PackagePlus />
                  {t("alimGir")}
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href={`/urunler/${urun.id}/duzenle`}>
                <Pencil />
                {ortak("duzenle")}
              </Link>
            </Button>
            <SilButonu urunId={urun.id} urunAdi={urun.name} boyut="default" />
          </div>
        </div>
      </div>

      {/* KDV / desi özeti — hangi orandan hesaplandığı ve NEDEN açıkça yazar. */}
      <Card>
        <CardHeader>
          <CardTitle>{t("kdvOraniEtiketi")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              %{kdv.oran}
            </Badge>
            <span className="text-muted-foreground text-sm">
              {kdv.kaynak === "ISTISNA"
                ? t("kdvKaynagiIstisna")
                : kdv.kaynak === "KATEGORI"
                  ? t("kdvKaynagiKategori", { ad: kdv.kategoriAdi ?? "" })
                  : t("kdvKaynagiVarsayilan")}
            </span>
            <span className="text-muted-foreground text-sm">·</span>
            <span className="text-muted-foreground text-sm">
              {t("desiEtiketi")}:{" "}
              {urun.desi ? Number(urun.desi.toString()) : "—"}
            </span>
          </div>
          {kdv.kaynak === "VARSAYILAN" ? (
            <p
              role="status"
              className={`rounded-md p-3 text-sm ${DURUM_KUTUSU.uyari}`}
            >
              {t("kategoriAtanmamisNotu")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {urun.description ? (
        <Card>
          <CardHeader>
            <CardTitle>{ortak("aciklama")}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm whitespace-pre-line">
            {urun.description}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {t("varyantlarBasligi", { sayi: urun.variants.length })}
            {!urun.hasVariants ? (
              <Badge variant="secondary" className="ml-2">
                {t("tekCesitRozeti")}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ortak("varyant")}</TableHead>
                  <TableHead>{ortak("sku")}</TableHead>
                  <TableHead>{ortak("firmaSku")}</TableHead>
                  <TableHead>{ortak("barkod")}</TableHead>
                  <TableHead>{ortak("raf")}</TableHead>
                  <TableHead className="text-right">{ortak("stok")}</TableHead>
                  <TableHead className="text-right">{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urun.variants.map((varyant) => (
                  <TableRow key={varyant.id}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {varyant.name ?? t("varsayilanVaryant")}
                        </span>
                        {varyant.isDefault ? (
                          <Badge variant="outline">
                            {t("varsayilanRozeti")}
                          </Badge>
                        ) : null}
                      </div>
                      {varyant.options.length ? (
                        <div className="text-muted-foreground mt-1 text-xs">
                          {varyant.options
                            .map((o) => `${o.name}: ${o.value}`)
                            .join(" · ")}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <KopyalanabilirKod
                        deger={varyant.sku}
                        etiket={ortak("sku")}
                      />
                    </TableCell>
                    <TableCell>
                      <KopyalanabilirKod
                        deger={varyant.companySku}
                        etiket={ortak("firmaSku")}
                      />
                    </TableCell>
                    <TableCell>
                      <KopyalanabilirKod
                        deger={varyant.barcode}
                        etiket={ortak("barkod")}
                      />
                    </TableCell>
                    <TableCell>
                      {varyant.location ? (
                        <Badge variant="secondary">
                          {varyant.location.code}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {stokHaritasi.get(varyant.id) ?? 0}
                    </TableCell>
                    {/* Kârlılık kartı VARYANT seviyesindedir: aynı ürünün iki
                        varyantı ayrı satar, ayrı kâr eder. Bağlantı bu yüzden
                        ürün başlığında değil, varyant satırında. */}
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-2">
                        {/* K169: kanala gönderim EYLEM yüzeyinde — kart
                            okuma yüzeyi kuralı gereği kartta DEĞİL burada. */}
                        {kanalYazGorunur ? (
                          <TyGonderim variantId={varyant.id} />
                        ) : null}
                        <Baglanti href={`/kart/${varyant.id}`}>
                          {tUrun("karlilikKarti")}
                        </Baglanti>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {urun.variants.map((varyant) => (
              <ListeKarti
                key={varyant.id}
                baslik={
                  <span className="flex flex-wrap items-center gap-2">
                    {varyant.name ?? t("varsayilanVaryant")}
                    {varyant.isDefault ? (
                      <Badge variant="outline">{t("varsayilanRozeti")}</Badge>
                    ) : null}
                  </span>
                }
                altBaslik={
                  varyant.options.length
                    ? varyant.options
                        .map((o) => `${o.name}: ${o.value}`)
                        .join(" · ")
                    : undefined
                }
                alanlar={[
                  {
                    etiket: ortak("stok"),
                    deger: (
                      <span className="text-base font-semibold">
                        {stokHaritasi.get(varyant.id) ?? 0}
                      </span>
                    ),
                  },
                  {
                    etiket: ortak("raf"),
                    deger: varyant.location ? (
                      <Badge variant="secondary">{varyant.location.code}</Badge>
                    ) : (
                      "—"
                    ),
                  },
                  {
                    etiket: ortak("sku"),
                    deger: (
                      <KopyalanabilirKod
                        deger={varyant.sku}
                        etiket={ortak("sku")}
                      />
                    ),
                  },
                  {
                    etiket: ortak("firmaSku"),
                    deger: (
                      <KopyalanabilirKod
                        deger={varyant.companySku}
                        etiket={ortak("firmaSku")}
                      />
                    ),
                  },
                  {
                    etiket: ortak("barkod"),
                    deger: (
                      <KopyalanabilirKod
                        deger={varyant.barcode}
                        etiket={ortak("barkod")}
                      />
                    ),
                  },
                ]}
                eylemler={
                  kanalYazGorunur ? (
                    <TyGonderim variantId={varyant.id} />
                  ) : undefined
                }
              />
            ))}
          </div>
          <p className="text-muted-foreground mt-3 text-xs">{t("stokNotu")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
