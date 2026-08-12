import { getTranslations } from "next-intl/server";
import { GeriBaglanti } from "@/components/baglanti";
import { tarihGirdisi } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";

import { alimOlustur } from "../actions";
import {
  AlimFormu,
  type HesapSecenegi,
  type KartSecenegi,
} from "../alim-formu";
import { type TedarikciSecenegi } from "../tedarikci-secimi";

/**
 * Forma "bugün" yazan sayfa; statik kipte DERLEME GÜNÜ gömülü kalırdı.
 * Gerekçenin tamamı: src/app/giderler/yeni/page.tsx.
 * _10.08.2026'da üretim derlemesi incelenirken bulundu._
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("yeniAlim") };
}

export default async function YeniAlimSayfasi() {
  const [hesapKayitlari, kartKayitlari, tedarikciKayitlari] = await Promise.all([
    prisma.channelAccount.findMany({
      where: { isActive: true, alisIcin: true },
      include: { channel: { select: { name: true } } },
      orderBy: [{ channelId: "asc" }, { code: "asc" }],
    }),
    prisma.creditCard.findMany({
      where: { isActive: true },
      orderBy: { label: "asc" },
    }),
    // Kodu OLMAYAN tedarikçi listeye girmez: alım numarası kodundan
    // üretiliyor, kodsuz seçim sessiz hataya dönerdi.
    prisma.supplier.findMany({
      where: { isActive: true, NOT: { code: null } },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
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

  const tedarikciler: TedarikciSecenegi[] = tedarikciKayitlari.map((s) => ({
    id: s.id,
    ad: s.name,
    kod: s.code!,
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
        tedarikciler={tedarikciler}
        action={alimOlustur}
        bugun={tarihGirdisi(new Date())}
      />
    </div>
  );
}
