import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import Link from "next/link";
import { Eye, Pencil, PackageCheck, Plus } from "lucide-react";

import { ExcelIndir } from "@/components/excel-indir";
import { AlimIptalButonu } from "./iptal-butonu";
import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
import { SatirEylemi, SatirEylemleri } from "@/components/satir-eylemi";
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
import { ALIM_DURUMLARI, alimDurumEtiketleri } from "@/lib/etiketler";
import { alimAramaKosulu } from "@/lib/alim-arama";
import { bicimlendirici } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";
import { kalemToplamlari } from "@/lib/tutar";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("alimlar") };
}

type AlimDurumKodu = (typeof ALIM_DURUMLARI)[number];

function durumGecerliMi(deger: string): deger is AlimDurumKodu {
  return (ALIM_DURUMLARI as readonly string[]).includes(deger);
}

export default async function AlimlarSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; durum?: string }>;
}) {
  await sayfaIzni("alim.gor");

  const { q, durum } = await searchParams;
  const arama = (q ?? "").trim();
  const durumFiltresi = (durum ?? "").trim();
  const bicim = await bicimlendirici();
  const durumEtiketleri = await alimDurumEtiketleri();
  const t = await getTranslations("Alim");
  const ortak = await getTranslations("Ortak");

  const aramaKosulu = await alimAramaKosulu(arama);

  const alimlar = await prisma.purchase.findMany({
    where: {
      ...(aramaKosulu ?? {}),
      ...(durumGecerliMi(durumFiltresi) ? { status: durumFiltresi } : {}),
    },
    include: {
      items: {
        include: {
          // Duzenleme/iptal kurallari icin: mal kabul yapilmis mi?
          stockMovements: { select: { quantityDelta: true } },
        },
      },
      creditCard: { select: { label: true, last4: true } },
      channelAccount: {
        include: { channel: { select: { name: true } } },
      },
      supplier: { select: { name: true } },
    },
    orderBy: { purchasedAt: "desc" },
  });

  function toplamMetni(alim: (typeof alimlar)[number]) {
    const toplamlar = kalemToplamlari(alim.items);
    if (!toplamlar.length) return "—";
    return toplamlar.map((t) => bicim.para(t.tutar, t.paraBirimi)).join(" + ");
  }

  function eylemler(alim: (typeof alimlar)[number]) {
    const kabulEdilebilir =
      alim.status !== "CANCELLED" && alim.status !== "RECEIVED";
    const malKabulVar = alim.items.some((k) =>
      k.stockMovements.some((h) => h.quantityDelta > 0),
    );
    const iptalli = alim.status === "CANCELLED";
    return (
      <>
        <SatirEylemi href={`/alimlar/${alim.id}`} ikon={Eye} etiket={ortak("detay")} />
        {!iptalli ? (
          <SatirEylemi href={`/alimlar/${alim.id}/duzenle`} ikon={Pencil} etiket={ortak("duzenle")} />
        ) : null}
        {!iptalli ? (
          <AlimIptalButonu
            alimId={alim.id}
            kod={alim.code}
            malKabulVar={malKabulVar}
          />
        ) : null}
        {kabulEdilebilir ? (
          <SatirEylemi href={`/alimlar/${alim.id}/mal-kabul`} ikon={PackageCheck} etiket={t("malKabul")} birincil />
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
            {ortak("kayitSayisi", { sayi: alimlar.length })}
            {arama ? ortak("aramaEki", { arama }) : ""}
            {durumGecerliMi(durumFiltresi)
              ? t("durumEki", { durum: durumEtiketleri[durumFiltresi] })
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExcelIndir
            liste="alimlar"
            parametreler={{ q: arama, durum: durumFiltresi }}
          />
          <Button asChild>
            <Link href="/alimlar/yeni">
              <Plus />
              {t("yeniAlim")}
            </Link>
          </Button>
        </div>
      </div>

      <form action="/alimlar" className="flex flex-wrap items-end gap-2">
        <Input
          name="q"
          defaultValue={arama}
          placeholder={t("aramaIpucu")}
          className="max-w-xs min-w-44 flex-1"
        />
        <select
          name="durum"
          defaultValue={durumFiltresi}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          aria-label={t("durumFiltresiEtiketi")}
        >
          <option value="">{t("tumDurumlar")}</option>
          {ALIM_DURUMLARI.map((d) => (
            <option key={d} value={d}>
              {durumEtiketleri[d]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          {ortak("filtrele")}
        </Button>
        {arama || durumFiltresi ? (
          <Button type="button" variant="ghost" asChild>
            <Link href="/alimlar">{ortak("temizle")}</Link>
          </Button>
        ) : null}
      </form>

      {alimlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {arama || durumFiltresi ? t("bosFiltreBaslik") : t("bosBaslik")}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {arama || durumFiltresi ? t("bosFiltreIpucu") : t("bosIpucu")}
          </p>
        </div>
      ) : (
        <>
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* İKİ AYRI KİMLİK, İKİ AYRI SÜTUN (İlke #3).
                      "Alım Kodu" sistemin ürettiği kayıt numarasıdır;
                      "Sipariş No" tedarikçiye/pazaryerine sorun bildirirken
                      söylediğiniz numaradır. Eskiden tek sütun vardı ve
                      "Sipariş No" başlığı altında ALIM KODU yazıyordu. */}
                  <TableHead>{t("alimKodu")}</TableHead>
                  <TableHead>{ortak("siparisNo")}</TableHead>
                  <TableHead>{ortak("tarih")}</TableHead>
                  <TableHead>{ortak("kanalHesabi")}</TableHead>
                  <TableHead className="text-right">{ortak("kalem")}</TableHead>
                  <TableHead>{ortak("toplam")}</TableHead>
                  <TableHead>{ortak("kart")}</TableHead>
                  <TableHead>{ortak("durum")}</TableHead>
                  <TableHead>{ortak("eylemler")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alimlar.map((alim) => (
                  <TableRow key={alim.id}>
                    <TableCell>
                      {/* Kod link olarak zaten yazıyor; yanına sadece
                          kopyala ikonu koyuyoruz, metin tekrarı olmasın. */}
                      <div className="flex items-center gap-1">
                        <Baglanti href={`/alimlar/${alim.id}`}>
                          {alim.code}
                        </Baglanti>
                        <KopyalanabilirKod
                          deger={alim.code}
                          etiket={t("alimKodu")}
                          sadeceIkon
                        />
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {alim.supplierOrderNo ? (
                        <span className="inline-flex items-center gap-1">
                          {alim.supplierOrderNo}
                          <KopyalanabilirKod
                            deger={alim.supplierOrderNo}
                            etiket={ortak("siparisNo")}
                            sadeceIkon
                          />
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {bicim.tarih(alim.purchasedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {alim.channelAccount
                        ? `${alim.channelAccount.channel.name} — ${alim.channelAccount.name}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {alim.items.length}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {toplamMetni(alim)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {alim.creditCard
                        ? `${alim.creditCard.label} (••${alim.creditCard.last4})`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {durumEtiketleri[alim.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <SatirEylemleri>{eylemler(alim)}</SatirEylemleri>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------ TELEFON: KART ---------------------- */}
          <div className="space-y-3 md:hidden">
            {alimlar.map((alim) => (
              <ListeKarti
                key={alim.id}
                baslik={
                  <span className="inline-flex items-center gap-1">
                    <Baglanti href={`/alimlar/${alim.id}`}>
                      {alim.code}
                    </Baglanti>
                    <KopyalanabilirKod
                      deger={alim.code}
                      etiket={t("alimKodu")}
                      sadeceIkon
                    />
                  </span>
                }
                alanlar={[
                  // İlke #3, mobil öncelik: sipariş no tarihten ÖNCE gelir —
                  // telefonda kaydı bulmak için bakılan ilk şey odur.
                  ...(alim.supplierOrderNo
                    ? [
                        {
                          etiket: ortak("siparisNo"),
                          deger: (
                            <span className="inline-flex items-center gap-1">
                              {alim.supplierOrderNo}
                              <KopyalanabilirKod
                                deger={alim.supplierOrderNo}
                                etiket={ortak("siparisNo")}
                                sadeceIkon
                              />
                            </span>
                          ),
                        },
                      ]
                    : []),
                  {
                    etiket: ortak("tarih"),
                    deger: bicim.tarih(alim.purchasedAt),
                  },
                  {
                    etiket: ortak("durum"),
                    deger: (
                      <Badge variant="secondary">
                        {durumEtiketleri[alim.status]}
                      </Badge>
                    ),
                  },
                  { etiket: ortak("kalem"), deger: alim.items.length },
                  { etiket: ortak("toplam"), deger: toplamMetni(alim) },
                  {
                    etiket: ortak("kanalHesabi"),
                    deger: alim.channelAccount
                      ? `${alim.channelAccount.channel.name} — ${alim.channelAccount.name}`
                      : "—",
                  },
                  {
                    etiket: ortak("kart"),
                    deger: alim.creditCard
                      ? `${alim.creditCard.label} (••${alim.creditCard.last4})`
                      : "—",
                  },
                ]}
                eylemler={eylemler(alim)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
