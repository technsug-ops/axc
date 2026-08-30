import { getTranslations } from "next-intl/server";

import { sayfaIzni } from "@/lib/yetki";
import { GeriBaglanti } from "@/components/baglanti";
import { tarihGirdisi } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";

import { satisOlustur } from "../actions";
import { SatisFormu, type HesapSecenegi } from "../satis-formu";
import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";

/**
 * Forma "bugün" yazan sayfa; statik kipte DERLEME GÜNÜ gömülü kalırdı.
 * Gerekçenin tamamı: src/app/giderler/yeni/page.tsx.
 * _10.08.2026'da üretim derlemesi incelenirken bulundu._
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("yeniSatis") };
}

export default async function YeniSatisSayfasi() {
  await sayfaIzni("satis.yaz");

  const t = await getTranslations("Satis");

  const hesapKayitlari = await prisma.channelAccount.findMany({
    where: { isActive: true, satisIcin: true },
    include: { channel: { select: { name: true } } },
    orderBy: [{ channelId: "asc" }, { name: "asc" }],
  });

  const hesaplar: HesapSecenegi[] = hesapKayitlari.map((h) => ({
    id: h.id,
    etiket: `${h.channel.name} — ${h.name}`,
    paraBirimi: h.defaultCurrency,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <ListeyeDon href="/satislar">{t("baslik")}</ListeyeDon>
        <h1 className="mt-1 text-2xl font-semibold">{t("yeniSatis")}</h1>
      </div>

      <SatisFormu
        hesaplar={hesaplar}
        action={satisOlustur}
        bugun={tarihGirdisi(new Date())}
      />
    </div>
  );
}
