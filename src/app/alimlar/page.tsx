import Link from "next/link";
import { Plus } from "lucide-react";

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
import { paraFormatla, tarihFormatla } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { kalemToplamlari } from "@/lib/tutar";

export const metadata = { title: "Alımlar — Axcali ERP" };

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
        {/* Basit yerel select: GET formuyla en az sürtünmeli çözüm. */}
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
        <div className="overflow-x-auto rounded-lg border">
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {alimlar.map((alim) => (
                <TableRow key={alim.id}>
                  <TableCell>
                    <Link
                      href={`/alimlar/${alim.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {alim.code}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {tarihFormatla(alim.purchasedAt)}
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
                    {kalemToplamlari(alim.items)
                      .map((t) => paraFormatla(t.tutar, t.paraBirimi))
                      .join(" + ") || "—"}
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
