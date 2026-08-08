import { GeriBaglanti } from "@/components/baglanti";
import { tarihGirdisi } from "@/lib/format";
import { prisma } from "@/lib/prisma";

import { alimOlustur } from "../actions";
import { AlimFormu, type HesapSecenegi, type KartSecenegi } from "../alim-formu";

export const metadata = { title: "Yeni Alım" };

export default async function YeniAlimSayfasi() {
  const [hesapKayitlari, kartKayitlari] = await Promise.all([
    prisma.channelAccount.findMany({
      where: { isActive: true },
      include: { channel: { select: { name: true } } },
      orderBy: [{ channelId: "asc" }, { code: "asc" }],
    }),
    prisma.creditCard.findMany({
      where: { isActive: true },
      orderBy: { label: "asc" },
    }),
  ]);

  const hesaplar: HesapSecenegi[] = hesapKayitlari.map((h) => ({
    id: h.id,
    etiket: `${h.channel.name} — ${h.name}`,
    paraBirimi: h.defaultCurrency,
  }));

  const kartlar: KartSecenegi[] = kartKayitlari.map((k) => ({
    id: k.id,
    etiket: `${k.label} (••${k.last4})`,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <GeriBaglanti href="/alimlar">Alımlar</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">Yeni Alım</h1>
      </div>

      <AlimFormu
        hesaplar={hesaplar}
        kartlar={kartlar}
        action={alimOlustur}
        bugun={tarihGirdisi(new Date())}
      />
    </div>
  );
}
