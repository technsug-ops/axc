import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";

import { Yukleyici } from "./yukleyici";

/**
 * ============================================================================
 *  HEPSİBURADA KARGO TARİFESİ PDF YÜKLEME (K202, 17.09.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE VAR: HB'nin resmi kargo tarifesi (desi × 11 taşıyıcı) daha önce
 *  yalnız terminalden, elle çalıştırılan tek seferlik bir betikle
 *  yükleniyordu (`canli-hb-kargo-tarifesi-yukle.ts`) — kalıcı bir çözüm
 *  değildi (kullanıcı kararı 17.09.2026: "PDF ile bunun programın
 *  içerisinden çözümü olmalı"). Bu ekran aynı işi PDF yükleyerek yapar.
 *
 *  ⛔ YALNIZ HEPSİBURADA — genel bir "her kanalın PDF'i" ekranı DEĞİL.
 *  Ayrıştırıcı (`kargo-tarife-pdf/pdf-oku.ts`) HB'nin BUGÜNKÜ PDF düzenine
 *  (11 sabit sütun, "Desi" başlığı, "GG Ay YYYY itibariyle geçerli" cümlesi)
 *  bağlı; sahte bir genellik iddia etmek yerine kapsam adında açık.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

/** Ekranda listelenecek parti sayısı — İlke #13: özet ekranda döküm olmaz. */
const LISTE_TAVANI = 8;

export async function generateMetadata() {
  const t = await getTranslations("HbKargoTarife");
  return { title: t("baslik") };
}

export default async function HbKargoTarifePage() {
  await sayfaIzni("kanalsku.yaz");
  const t = await getTranslations("HbKargoTarife");

  const kanal = await prisma.channel.findFirst({
    where: { name: { contains: "Hepsiburada" } },
    select: { id: true },
  });

  const partiler = kanal
    ? await prisma.cargoTariff.groupBy({
        by: ["effectiveFrom"],
        where: { channelId: kanal.id },
        _count: { _all: true },
        orderBy: { effectiveFrom: "desc" },
        take: LISTE_TAVANI,
      })
    : [];

  return (
    <div className="max-w-3xl space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklama")}</p>
      </div>

      <div className="border-border rounded-lg border p-4">
        <Yukleyici />
      </div>

      <div className="border-border space-y-2 rounded-lg border p-4">
        <p className="text-sm font-medium">{t("mevcutPartilerBaslik")}</p>
        {/* AÇIK SIFIR: liste boşsa satır gizlenmez, NEDEN boş olduğu yazar. */}
        {partiler.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("mevcutPartiYok")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {partiler.map((p) => (
              <li key={p.effectiveFrom.toISOString()} className="tabular-nums">
                {p.effectiveFrom.toISOString().slice(0, 10)} —{" "}
                {t("partiSatirSayisi", { adet: p._count._all })}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
