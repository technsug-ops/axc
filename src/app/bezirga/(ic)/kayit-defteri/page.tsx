import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
import { Button } from "@/components/ui/button";
import { bicimlendirici } from "@/lib/bicim";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { sistemPrisma } from "@/lib/prisma";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { SayfaBasligi } from "../sayfa-basligi";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tMenu = await getTranslations("YonetimMenu");
  return { title: tMenu("kayitDefteri") };
}

const SAYFA_BOYU = 50;

/**
 * KAYIT DEFTERİ — referans iskeletin `log` sayfası: yönetim panelinde yapılan
 * her işlem. Ölçüt LİSTE DEĞİL, KİŞİ: yapanı süper admin olan her iz (anayasa:
 * «bekçi ölçütü elle tutulan liste değil, tersten kurulur» — yarın eklenen
 * işlem kendiliğinden görünür). İz değiştirilmez; yalnız okunur.
 * İlke #17: arama + toplam sayı; sayfalı (toplam süzgecin tamamıdır).
 */
export default async function KayitDefteriSayfasi({ searchParams }: { searchParams: Promise<{ q?: string; s?: string }> }) {
  await yonetimSayfasi();
  const sp = await searchParams;
  const arama = (sp.q ?? "").trim();
  const sayfa = Math.max(1, Number.parseInt(sp.s ?? "1", 10) || 1);
  const t = await getTranslations("YonetimKayit");
  const bicim = await bicimlendirici();

  const kosul = {
    user: { isSuperAdmin: true },
    ...(arama ? { OR: [{ action: { contains: arama } }, { detail: { contains: arama } }, { company: { name: { contains: arama } } }] } : {}),
  };
  const [toplam, izler] = await Promise.all([
    // SISTEM: yönetim katmanı — süper admin izleri (salt okuma).
    sistemPrisma.auditLog.count({ where: kosul }),
    // SISTEM: yönetim katmanı — süper admin izleri (salt okuma).
    sistemPrisma.auditLog.findMany({
      where: kosul,
      orderBy: { createdAt: "desc" },
      skip: (sayfa - 1) * SAYFA_BOYU,
      take: SAYFA_BOYU,
      select: { id: true, action: true, createdAt: true, targetType: true, targetId: true, user: { select: { email: true } }, company: { select: { id: true, name: true } } },
    }),
  ]);
  // Hedef firma: iz firmalar-üstü yazıldığında (companyId boş) hedef kimliği targetId'de.
  const hedefIdler = [...new Set(izler.filter((i) => !i.company && i.targetType === "Company" && i.targetId).map((i) => i.targetId!))];
  // SISTEM: yönetim katmanı — iz hedeflerinin firma adı.
  const hedefler = new Map((await sistemPrisma.company.findMany({ where: { id: { in: hedefIdler } }, select: { id: true, name: true } })).map((c) => [c.id, c.name]));
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYU));
  const adres = (s: number) => {
    const p = new URLSearchParams();
    if (arama) p.set("q", arama);
    if (s > 1) p.set("s", String(s));
    const q = p.toString();
    return `${YONETIM_YOLU}/kayit-defteri${q ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <SayfaBasligi baslik={t("baslik")} aciklama={t("aciklama")} />
      <KodAramaKutusu temelAdres={`${YONETIM_YOLU}/kayit-defteri`} baslangic={arama} tasinanlar={{}} ipucu={t("aramaIpucu")} />
      <p className="text-muted-foreground text-sm">{arama ? t("aramaSonucu", { sayi: toplam }) : t("toplam", { sayi: toplam })}</p>
      {izler.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("bos")}</p>
      ) : (
        <ul className="bg-card divide-y rounded-xl border text-sm">
          {izler.map((i) => {
            const firmaId = i.company?.id ?? (i.targetType === "Company" ? i.targetId : null);
            const firmaAdi = i.company?.name ?? (firmaId ? hedefler.get(firmaId) : undefined);
            return (
              <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-0.5 px-3 py-2">
                <span className="text-muted-foreground tabular-nums">{bicim.tarihSaat(i.createdAt)}</span>
                <span className="font-medium">{t.has(`islem_${i.action}`) ? t(`islem_${i.action}`) : i.action}</span>
                {firmaId && firmaAdi ? (
                  <Link href={`${YONETIM_YOLU}/firmalar/${firmaId}`} className="inline-flex min-h-11 items-center underline underline-offset-4">{firmaAdi}</Link>
                ) : null}
                <span className="text-muted-foreground ml-auto text-xs">{i.user?.email ?? "—"}</span>
              </li>
            );
          })}
        </ul>
      )}
      {sonSayfa > 1 ? (
        <nav aria-label={t("sayfalama")} className="flex items-center gap-2">
          {sayfa > 1 ? <Button asChild variant="outline" className="min-h-11"><Link href={adres(sayfa - 1)}>{t("onceki")}</Link></Button> : null}
          <span className="text-muted-foreground text-sm">{t("sayfaBilgisi", { sayfa, son: sonSayfa })}</span>
          {sayfa < sonSayfa ? <Button asChild variant="outline" className="min-h-11"><Link href={adres(sayfa + 1)}>{t("sonraki")}</Link></Button> : null}
        </nav>
      ) : null}
    </div>
  );
}
