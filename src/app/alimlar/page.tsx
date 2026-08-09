import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Eye, PackageCheck, Plus } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { ListeKarti } from "@/components/liste-karti";
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
import { ALIM_DURUMLARI, alimDurumuEtiketi } from "@/lib/etiketler";
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
  const { q, durum } = await searchParams;
  const arama = (q ?? "").trim();
  const durumFiltresi = (durum ?? "").trim();
  const bicim = await bicimlendirici();

  const alimlar = await prisma.purchase.findMany({
    where: {
      ...(arama ? { code: { contains: arama } } : {}),
      ...(durumGecerliMi(durumFiltresi) ? { status: durumFiltresi } : {}),
    },
    include: {
      items: true,
      creditCard: { select: { label: true, last4: true } },
      channelAccount: {
        include: { channel: { select: { name: true } } },
      },
    },
    orderBy: { purchasedAt: "desc" },
  });

  function toplamMetni(alim: (typeof alimlar)[number]) {
    const toplamlar = kalemToplamlari(alim.items);
    if (!toplamlar.length) return "—";
    return toplamlar
      .map((t) => bicim.para(t.tutar, t.paraBirimi))
      .join(" + ");
  }

  function eylemler(alim: (typeof alimlar)[number]) {
    const kabulEdilebilir =
      alim.status !== "CANCELLED" && alim.status !== "RECEIVED";
    return (
      <>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/alimlar/${alim.id}`}>
            <Eye />
            Detay
          </Link>
        </Button>
        {kabulEdilebilir ? (
          <Button size="sm" asChild>
            <Link href={`/alimlar/${alim.id}/mal-kabul`}>
              <PackageCheck />
              Mal Kabul
            </Link>
          </Button>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Alımlar</h1>
          <p className="text-muted-foreground text-sm">
            {alimlar.length} kayıt
            {arama ? ` — "${arama}" araması` : ""}
            {durumGecerliMi(durumFiltresi)
              ? ` — ${alimDurumuEtiketi(durumFiltresi)}`
              : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/alimlar/yeni">
            <Plus />
            Yeni Alım
          </Link>
        </Button>
      </div>

      <form action="/alimlar" className="flex flex-wrap items-end gap-2">
        <Input
          name="q"
          defaultValue={arama}
          placeholder="Sipariş numarasına göre ara..."
          className="max-w-xs min-w-44 flex-1"
        />
        <select
          name="durum"
          defaultValue={durumFiltresi}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          aria-label="Duruma göre filtrele"
        >
          <option value="">Tüm durumlar</option>
          {ALIM_DURUMLARI.map((d) => (
            <option key={d} value={d}>
              {alimDurumuEtiketi(d)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Filtrele
        </Button>
        {arama || durumFiltresi ? (
          <Button type="button" variant="ghost" asChild>
            <Link href="/alimlar">Temizle</Link>
          </Button>
        ) : null}
      </form>

      {alimlar.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">
            {arama || durumFiltresi
              ? "Filtreye uyan alım yok."
              : "Henüz alım kaydı yok."}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {arama || durumFiltresi
              ? "Filtreleri temizleyip tekrar deneyin."
              : "Sağ üstteki Yeni Alım düğmesiyle başlayın."}
          </p>
        </div>
      ) : (
        <>
          {/* ---------------------- MASAÜSTÜ: TABLO ---------------------- */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sipariş no</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Kanal hesabı</TableHead>
                  <TableHead className="text-right">Kalem</TableHead>
                  <TableHead>Toplam</TableHead>
                  <TableHead>Kart</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Eylemler</TableHead>
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
                          etiket="Sipariş no"
                          sadeceIkon
                        />
                      </div>
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
                        {alimDurumuEtiketi(alim.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {eylemler(alim)}
                      </div>
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
                      etiket="Sipariş no"
                      sadeceIkon
                    />
                  </span>
                }
                alanlar={[
                  {
                    etiket: "Tarih",
                    deger: bicim.tarih(alim.purchasedAt),
                  },
                  {
                    etiket: "Durum",
                    deger: (
                      <Badge variant="secondary">
                        {alimDurumuEtiketi(alim.status)}
                      </Badge>
                    ),
                  },
                  { etiket: "Kalem", deger: alim.items.length },
                  { etiket: "Toplam", deger: toplamMetni(alim) },
                  {
                    etiket: "Kanal hesabı",
                    deger: alim.channelAccount
                      ? `${alim.channelAccount.channel.name} — ${alim.channelAccount.name}`
                      : "—",
                  },
                  {
                    etiket: "Kart",
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
