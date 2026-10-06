import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { KodAramaKutusu } from "@/components/kod-arama-kutusu";
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
 * KAYIT DEFTERİ — referans iskeletin `log` sayfası BİREBİR (`.toolbar` arama
 * + `.tablewrap` tablo): yönetim panelinde yapılan her işlem. Ölçüt LİSTE
 * DEĞİL, KİŞİ: yapanı süper admin olan her iz (anayasa: «bekçi ölçütü elle
 * tutulan liste değil, tersten kurulur» — yarın eklenen işlem kendiliğinden
 * görünür). İz değiştirilmez; yalnız okunur.
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
    <>
      <SayfaBasligi baslik={t("baslik")} aciklama={t("aciklama")} />
      <div className="yn-toolbar">
        <KodAramaKutusu temelAdres={`${YONETIM_YOLU}/kayit-defteri`} baslangic={arama} tasinanlar={{}} ipucu={t("aramaIpucu")} />
      </div>
      <p className="yn-muted yn-small" style={{ margin: "0 0 10px" }}>{arama ? t("aramaSonucu", { sayi: toplam }) : t("toplam", { sayi: toplam })}</p>
      {izler.length === 0 ? (
        <div className="yn-card yn-muted">{t("bos")}</div>
      ) : (
        <div className="yn-tablewrap">
          <table>
            <thead>
              <tr>
                <th>{t("sutunZaman")}</th>
                <th>{t("sutunIslem")}</th>
                <th>{t("sutunFirma")}</th>
                <th>{t("sutunYapan")}</th>
              </tr>
            </thead>
            <tbody>
              {izler.map((i) => {
                const firmaId = i.company?.id ?? (i.targetType === "Company" ? i.targetId : null);
                const firmaAdi = i.company?.name ?? (firmaId ? hedefler.get(firmaId) : undefined);
                return (
                  <tr key={i.id}>
                    <td className="nw yn-muted">{bicim.tarihSaat(i.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{t.has(`islem_${i.action}`) ? t(`islem_${i.action}`) : i.action}</td>
                    <td>{firmaId && firmaAdi ? <Link href={`${YONETIM_YOLU}/firmalar/${firmaId}`} className="yn-link">{firmaAdi}</Link> : <span className="yn-muted">—</span>}</td>
                    <td className="yn-muted yn-small">{i.user?.email ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {sonSayfa > 1 ? (
        <nav aria-label={t("sayfalama")} className="yn-row" style={{ marginTop: 12 }}>
          {sayfa > 1 ? <Link href={adres(sayfa - 1)} className="yn-btn">{t("onceki")}</Link> : null}
          <span className="yn-muted yn-small">{t("sayfaBilgisi", { sayfa, son: sonSayfa })}</span>
          {sayfa < sonSayfa ? <Link href={adres(sayfa + 1)} className="yn-btn">{t("sonraki")}</Link> : null}
        </nav>
      ) : null}
    </>
  );
}
