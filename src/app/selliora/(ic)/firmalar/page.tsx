import { getTranslations } from "next-intl/server";

import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Badge } from "@/components/ui/badge";
import { bicimlendirici } from "@/lib/bicim";
import { sistemPrisma } from "@/lib/prisma";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Yonetim");
  return { title: t("firmalar") };
}

/**
 * FİRMALAR — Selliora yönetim katmanı (K303 4c-2). Bütün müşteri firmalar.
 * Yalnız KAYIT bilgisi (ad, kod, durum, üye sayısı) — ticari veri YOK
 * (kullanıcı kararı 04.10.2026: süper admin firmanın ticari ekranlarını
 * görmez). İlke #17: arama kutusu; sayı ekranda yazar.
 */
export default async function FirmalarSayfasi({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await yonetimSayfasi();
  const { q } = await searchParams;
  const arama = (q ?? "").trim();
  const t = await getTranslations("Yonetim");
  const bicim = await bicimlendirici();

  const [toplam, firmalar] = await Promise.all([
    // SISTEM: yönetim katmanı firmalar-üstüdür — toplam firma sayısı.
    sistemPrisma.company.count(),
    // SISTEM: yönetim katmanı firmalar-üstüdür — firmaların KAYDI (ticari veri değil).
    sistemPrisma.company.findMany({
      where: arama ? { OR: [{ name: { contains: arama } }, { code: { contains: arama } }] } : {},
      select: { id: true, name: true, code: true, isActive: true, createdAt: true, _count: { select: { uyelikler: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">{t("firmalar")}</h1>
      <KodAramaKutusu temelAdres="/selliora/firmalar" baslangic={arama} tasinanlar={{}} ipucu={t("firmaAramaIpucu")} />
      <p className="text-muted-foreground text-sm">
        {arama ? t("aramaSonucu", { bulunan: firmalar.length, toplam }) : t("firmaSayisi", { toplam })}
      </p>
      {firmalar.length === 0 ? (
        <p className="text-muted-foreground text-sm">{arama ? t("aramaBos") : t("firmaYok")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {firmalar.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-3 text-sm">
              <span className="min-w-40 font-medium">{f.name}</span>
              <KopyalanabilirKod deger={f.code} etiket={t("firmaKodu")} />
              <Badge variant={f.isActive ? "secondary" : "outline"}>{f.isActive ? t("aktif") : t("pasif")}</Badge>
              <span className="text-muted-foreground">{t("uyeSayisi", { sayi: f._count.uyelikler })}</span>
              <span className="text-muted-foreground ml-auto text-xs">{t("acilis", { tarih: bicim.tarih(f.createdAt) })}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
