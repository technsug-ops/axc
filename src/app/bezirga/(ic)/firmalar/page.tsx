import { YONETIM_YOLU } from "@/lib/oturum-imza";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FolderOpen, Plus } from "lucide-react";

import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { kurulumDurumlari } from "@/lib/firma-acilisi";
import { bicimlendirici } from "@/lib/bicim";
import { sistemPrisma } from "@/lib/prisma";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { FirmaEylemleri } from "./firma-eylemleri";

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
  const durumlar = await kurulumDurumlari(firmalar.map((f) => f.id));

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("firmalar")}</h1>
        <Button asChild className="min-h-11">
          <Link href={`${YONETIM_YOLU}/firmalar/yeni`}>
            <Plus />
            {t("yeniFirma")}
          </Link>
        </Button>
      </div>
      <KodAramaKutusu temelAdres={`${YONETIM_YOLU}/firmalar`} baslangic={arama} tasinanlar={{}} ipucu={t("firmaAramaIpucu")} />
      <p className="text-muted-foreground text-sm">
        {arama ? t("aramaSonucu", { bulunan: firmalar.length, toplam }) : t("firmaSayisi", { toplam })}
      </p>
      {firmalar.length === 0 ? (
        <p className="text-muted-foreground text-sm">{arama ? t("aramaBos") : t("firmaYok")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {firmalar.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-3 text-sm">
              <Link href={`${YONETIM_YOLU}/firmalar/${f.id}`} className="min-w-40 font-medium underline-offset-4 hover:underline">
                {f.name}
              </Link>
              <KopyalanabilirKod deger={f.code} etiket={t("firmaKodu")} />
              {(() => {
                const d = durumlar.get(f.id) ?? (f.isActive ? "TAM" : "PASIF");
                return (
                  <>
                    <Badge variant={d === "TAM" ? "secondary" : d === "YARIM" ? "destructive" : "outline"}>
                      {d === "TAM" ? t("aktif") : d === "YARIM" ? t("kurulumYarim") : t("pasif")}
                    </Badge>
                    <span className="text-muted-foreground">{t("uyeSayisi", { sayi: f._count.uyelikler })}</span>
                    <span className="text-muted-foreground text-xs">{t("acilis", { tarih: bicim.tarih(f.createdAt) })}</span>
                    <div className="ml-auto flex flex-wrap items-start gap-2">
                      <Button asChild size="sm" variant="outline" className="min-h-11">
                        <Link href={`${YONETIM_YOLU}/firmalar/${f.id}`}>
                          <FolderOpen />
                          {t("kartiAc")}
                        </Link>
                      </Button>
                      <FirmaEylemleri firmaId={f.id} firmaAdi={f.name} durum={d} />
                    </div>
                  </>
                );
              })()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
