import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { GeriBaglanti } from "@/components/baglanti";
import { Button } from "@/components/ui/button";
import { hesapEtiketi } from "@/lib/ice-aktarma/referans";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";

import { Yukleyici, type HesapSecenegi } from "./yukleyici";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("komisyonAktar") };
}

export default async function KomisyonAktarSayfasi() {
  await sayfaIzni("kanalsku.yaz");

  const t = await getTranslations("Komisyon");
  const tKanalSku = await getTranslations("KanalSku");
  const tHesap = await getTranslations("KanalHesabi");
  const tBaslik = await getTranslations("Basliklar");

  /**
   * YALNIZ SATIŞ HESAPLARI. Alış hesabındaki kod ürünün tedarikçi
   * kataloğundaki kodudur; komisyonu yoktur. Sunucu tarafı da ayrıca
   * reddediyor (komisyonDenetle → HESAP_SATIS_DEGIL) — liste kısaltmak
   * yetki değildir.
   */
  const kayitlar = await prisma.channelAccount.findMany({
    where: { isActive: true, satisIcin: true },
    include: { channel: { select: { name: true } } },
    orderBy: [{ channelId: "asc" }, { name: "asc" }],
  });

  const hesaplar: HesapSecenegi[] = kayitlar.map((h) => ({
    id: h.id,
    etiket: hesapEtiketi(h.channel.name, h.name),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <GeriBaglanti href="/kanal-sku">{tKanalSku("baslik")}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("aciklamaMetni")}</p>
      </div>

      {/* SATIŞ HESABI YOKSA SESSİZ BOŞ LİSTE OLMAZ: sebebi ve çözümü yazar (#5). */}
      {hesaplar.length === 0 ? (
        <div className={`rounded-lg p-4 ${DURUM_KUTUSU.uyari}`}>
          <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
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
