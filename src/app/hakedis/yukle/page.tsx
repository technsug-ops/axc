import { getTranslations } from "next-intl/server";

import { GeriBaglanti } from "@/components/baglanti";
import { prisma } from "@/lib/prisma";

import { Yukleyici, type HesapSecenegi } from "./yukleyici";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("hakedisYukle") };
}

export default async function HakedisYukleSayfasi() {
  const t = await getTranslations("Hakedis");

  const kayitlar = await prisma.channelAccount.findMany({
    where: { isActive: true },
    include: { channel: { select: { name: true } } },
    orderBy: [{ channelId: "asc" }, { name: "asc" }],
  });

  const hesaplar: HesapSecenegi[] = kayitlar.map((h) => ({
    id: h.id,
    etiket: `${h.channel.name} — ${h.name}`,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <GeriBaglanti href="/hakedis">{t("baslik")}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">{t("yukleBaslik")}</h1>
      </div>

      <Yukleyici hesaplar={hesaplar} />
    </div>
  );
}
