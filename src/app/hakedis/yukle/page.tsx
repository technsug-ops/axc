import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { GeriBaglanti } from "@/components/baglanti";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

import { Yukleyici, type HesapSecenegi } from "./yukleyici";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("hakedisYukle") };
}

export default async function HakedisYukleSayfasi() {
  await sayfaIzni("hakedis.gor");

  const t = await getTranslations("Hakedis");
  const tHesap = await getTranslations("KanalHesabi");
  const tBaslik = await getTranslations("Basliklar");

  const kayitlar = await prisma.channelAccount.findMany({
    where: { isActive: true, satisIcin: true },
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

      {/* SATIŞ HESABI YOKSA SESSİZ BOŞ LİSTE OLMAZ: hakediş yalnız mağaza
          hesabı için vardır; sebebi ve çözümü yazılır (#5). */}
      {hesaplar.length === 0 ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {tHesap("hicSatisHesabi")}
          </p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link href="/ayarlar/kanallar">
              <ExternalLink />
              {tBaslik("kanalHesaplari")}
            </Link>
          </Button>
        </div>
      ) : (
        <Yukleyici hesaplar={hesaplar} />
      )}
    </div>
  );
}
