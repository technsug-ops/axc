import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Eye, Plus, TriangleAlert, Undo2 } from "lucide-react";

import { ExcelIndir } from "@/components/excel-indir";
import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
import { NetKar } from "@/components/net-kar";
import { Badge } from "@/components/ui/badge";
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
  searchParams: Promise<{ q?: string; kar?: string }>;
}) {
  const { q, kar } = await searchParams;
  const arama = (q ?? "").trim();

  /**
   * Dönem raporundaki "kârı hesaplanamadı" uyarısı buraya bağlanır.
   * Sorunlu satışları aramadan bulabilmek için ayrı bir süzgeç
   * (Kullanıcı Kolaylığı #9 — bilgiye az tıkla ulaş).
   */
  const karEksik = kar === "eksik";
  const bicim = await bicimlendirici();
  const t = await getTranslations("Satis");
  const tIade = await getTranslations("Iade");
  const ortak = await getTranslations("Ortak");

  const satislar = await prisma.sale.findMany({
    where: {
      ...(arama ? { code: { contains: arama } } : {}),
      // Hiç hesaplanmamış (null) VEYA hesaplanamamış olanlar.
      ...(karEksik
        ? { OR: [{ profitStatus: null }, { NOT: { profitStatus: "CALCULATED" } }] }
        : {}),
    },
    include: {
      items: {
        include: {
          variant: {
            include: { product: { select: { name: true } } },
          },
          returnItems: { select: { quantity: true } },
        },
      },
      channelAccount: { include: { channel: { select: { name: true } } } },
      // Rozet ve satır eylemi için: iade var mı, kalan var mı?
      returns: { select: { id: true } },
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

  /** Kalemlerden en az birinde iade edilebilir adet kaldı mı? */
  function iadeKalanVar(satis: (typeof satislar)[number]) {
    return satis.items.some((k) => {
      const iadeEdilen = k.returnItems.reduce((t2, r) => t2 + r.quantity, 0);
      return k.quantity - iadeEdilen > 0;
    });
  }

  function eylemler(satis: (typeof satislar)[number]) {
    return (
      <>
        <SatirEylemi href={`/satislar/${satis.id}`} ikon={Eye} etiket={ortak("detay")} />
        {iadeKalanVar(satis) ? (
          <SatirEylemi href={`/satislar/${satis.id}/iade`} ikon={Undo2} etiket={tIade("iadeAl")} />
        ) : null}
      </>
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
        <div className="flex flex-wrap gap-2">
          <ExcelIndir
            liste="satislar"
            parametreler={{ q: arama, kar: karEksik ? "eksik" : undefined }}
          />
          <Button asChild>
            <Link href="/satislar/yeni">
              <Plus />
              {t("yeniSatis")}
            </Link>
          </Button>
        </div>
      </div>

      <form action="/satislar" className="flex flex-wrap items-end gap-2">
        {/* Süzgeç aramada kaybolmasın. */}
        {karEksik ? <input type="hidden" name="kar" value="eksik" /> : null}
        <Input
          name="q"
          defaultValue={arama}
          placeholder={t("aramaIpucu")}
          className="max-w-xs min-w-44 flex-1"
        />
        <Button type="submit" variant="secondary">
          {ortak("ara")}
        </Button>
        {arama || karEksik ? (
          <Button type="button" variant="ghost" asChild>
            <Link href="/satislar">{ortak("temizle")}</Link>
          </Button>
        ) : null}
      </form>

      {/* Hangi süzgecin açık olduğu EKRANDA yazar (#5). */}
      {karEksik ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
          <TriangleAlert className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {t("karEksikFiltresi")}
          </span>
          <Badge variant="outline">{satislar.length}</Badge>
        </div>
      ) : null}

      {satislar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {karEksik
              ? t("bosKarEksikBaslik")
              : arama
                ? t("bosFiltreBaslik")
                : t("bosBaslik")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {karEksik
              ? t("bosKarEksikIpucu")
              : arama
                ? t("bosFiltreIpucu")
                : t("bosIpucu")}
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
                    {/* Uzun metin SARILIR: hücre varsayılanı nowrap; tabloyu ekran
                          dışına itip eylem düğmelerini görünmez yapıyordu. */}
                    <TableCell className="max-w-[22rem] whitespace-normal">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{urunOzeti(satis)}</span>
                        {satis.returns.length ? (
                          <Badge variant="outline">{tIade("iadeVar")}</Badge>
                        ) : null}
                      </div>
                    </TableCell>
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
                    <TableCell className="whitespace-nowrap">
                      <SatirEylemleri>{eylemler(satis)}</SatirEylemleri>
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
                  <span className="flex flex-wrap items-center gap-2">
                    <Baglanti href={`/satislar/${satis.id}`}>
                      {urunOzeti(satis)}
                    </Baglanti>
                    {satis.returns.length ? (
                      <Badge variant="outline">{tIade("iadeVar")}</Badge>
                    ) : null}
                  </span>
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
