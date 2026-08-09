import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Eye, Plus } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { NetKar } from "@/components/net-kar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { satisKalemToplamlari } from "@/lib/tutar";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("satislar") };
}

export default async function SatislarSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const arama = (q ?? "").trim();
  const bicim = await bicimlendirici();
  const t = await getTranslations("Satis");
  const ortak = await getTranslations("Ortak");

  const satislar = await prisma.sale.findMany({
    where: arama ? { code: { contains: arama } } : undefined,
    include: {
      items: {
        include: {
          variant: {
            include: { product: { select: { name: true } } },
          },
        },
      },
      channelAccount: { include: { channel: { select: { name: true } } } },
    },
    orderBy: { soldAt: "desc" },
  });

  /** Satırda "ne satıldı" özeti: tek kalemse ürün adı, çoksa "+N". */
  function urunOzeti(satis: (typeof satislar)[number]) {
    if (satis.items.length === 0) return "—";
    const ilk = satis.items[0];
    const ad = ilk.variant.name
      ? `${ilk.variant.product.name} — ${ilk.variant.name}`
      : ilk.variant.product.name;
    if (satis.items.length === 1) return ad;
    return t("digerKalemler", { urun: ad, sayi: satis.items.length - 1 });
  }

  function adetToplami(satis: (typeof satislar)[number]) {
    return satis.items.reduce((toplam, k) => toplam + k.quantity, 0);
  }

  function tutarMetni(satis: (typeof satislar)[number]) {
    const toplamlar = satisKalemToplamlari(satis.items);
    if (!toplamlar.length) return "—";
    return toplamlar.map((k) => bicim.para(k.tutar, k.paraBirimi)).join(" + ");
  }

  function hesapMetni(satis: (typeof satislar)[number]) {
    return `${satis.channelAccount.channel.name} — ${satis.channelAccount.name}`;
  }

  /** Birim fiyat kolonu: tek kalemde gerçek fiyat, çok kalemde çizgi. */
  function birimFiyatMetni(satis: (typeof satislar)[number]) {
    if (satis.items.length !== 1) return "—";
    const kalem = satis.items[0];
    return bicim.para(kalem.unitPriceAmount, kalem.unitPriceCurrency);
  }

  function eylemler(satis: (typeof satislar)[number]) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href={`/satislar/${satis.id}`}>
          <Eye />
          {ortak("detay")}
        </Link>
      </Button>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">
            {ortak("kayitSayisi", { sayi: satislar.length })}
            {arama ? ortak("aramaEki", { arama }) : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/satislar/yeni">
            <Plus />
            {t("yeniSatis")}
          </Link>
        </Button>
      </div>

      <form action="/satislar" className="flex flex-wrap items-end gap-2">
        <Input
          name="q"
          defaultValue={arama}
          placeholder={t("aramaIpucu")}
          className="max-w-xs min-w-44 flex-1"
        />
        <Button type="submit" variant="secondary">
          {ortak("ara")}
        </Button>
        {arama ? (
          <Button type="button" variant="ghost" asChild>
            <Link href="/satislar">{ortak("temizle")}</Link>
          </Button>
        ) : null}
      </form>

      {satislar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {arama ? t("bosFiltreBaslik") : t("bosBaslik")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {arama ? t("bosFiltreIpucu") : t("bosIpucu")}
          </p>
        </div>
      ) : (
        <>
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ortak("tarih")}</TableHead>
                  <TableHead>{ortak("siparisNo")}</TableHead>
                  <TableHead>{ortak("kanalHesabi")}</TableHead>
                  <TableHead>{ortak("urun")}</TableHead>
                  <TableHead className="text-right">{ortak("adet")}</TableHead>
                  <TableHead className="text-right">
                    {ortak("sutunBirimFiyat")}
                  </TableHead>
                  <TableHead>{ortak("tutar")}</TableHead>
                  <TableHead className="text-right">{t("netKar")}</TableHead>
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {satislar.map((satis) => (
                  <TableRow key={satis.id}>
                    <TableCell className="whitespace-nowrap">
                      <Baglanti href={`/satislar/${satis.id}`}>
                        {bicim.tarih(satis.soldAt)}
                      </Baglanti>
                    </TableCell>
                    <TableCell>
                      {satis.code ? (
                        <KopyalanabilirKod
                          deger={satis.code}
                          etiket={ortak("siparisNo")}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {t("siparisNoYok")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {hesapMetni(satis)}
                    </TableCell>
                    <TableCell>{urunOzeti(satis)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {adetToplami(satis)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {birimFiyatMetni(satis)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {tutarMetni(satis)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <NetKar
                        tutar={satis.net2Amount}
                        paraBirimi={satis.profitCurrency}
                        durum={satis.profitStatus}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {eylemler(satis)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {satislar.map((satis) => (
              <ListeKarti
                key={satis.id}
                baslik={
                  <Baglanti href={`/satislar/${satis.id}`}>
                    {urunOzeti(satis)}
                  </Baglanti>
                }
                altBaslik={bicim.tarih(satis.soldAt)}
                alanlar={[
                  {
                    etiket: ortak("siparisNo"),
                    deger: satis.code ? (
                      <KopyalanabilirKod
                        deger={satis.code}
                        etiket={ortak("siparisNo")}
                      />
                    ) : (
                      t("siparisNoYok")
                    ),
                  },
                  {
                    etiket: ortak("adet"),
                    deger: (
                      <span className="text-base font-semibold">
                        {adetToplami(satis)}
                      </span>
                    ),
                  },
                  {
                    etiket: ortak("sutunBirimFiyat"),
                    deger: birimFiyatMetni(satis),
                  },
                  { etiket: ortak("tutar"), deger: tutarMetni(satis) },
                  {
                    etiket: t("netKar"),
                    deger: (
                      <NetKar
                        tutar={satis.net2Amount}
                        paraBirimi={satis.profitCurrency}
                        durum={satis.profitStatus}
                      />
                    ),
                  },
                  { etiket: ortak("kanalHesabi"), deger: hesapMetni(satis) },
                ]}
                eylemler={eylemler(satis)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
