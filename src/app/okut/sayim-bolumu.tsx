import { ClipboardCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { acikOturumVarMi } from "@/lib/sayim/oturum";

import { SayimBaslat } from "./sayim-baslat";
import { SayimKipi } from "./sayim-kipi";

/**
 * ============================================================================
 *  SAYIM BÖLÜMÜ — `/okut`un İKİNCİ KİPİ (K57)
 * ----------------------------------------------------------------------------
 *  ⚠ YENİ EKRAN AÇILMADI, MEVCUT EKRANA KİP EKLENDİ. Depoda kullanılan
 *  ekran zaten `/okut`; sayım için ikinci bir adres açmak, aynı işi iki
 *  yerde arayan bir operatör üretirdi (İlke #10 — tutarlılık).
 *
 *  ⚠ İZİN `stok.gor` — sayfanın kendisi zaten onu istiyor, YENİ İZİN YOK.
 *  Düzeltme yazımı (`stok.duzelt`) kapanış ekranında ayrıca isteniyor.
 * ============================================================================
 */
export async function SayimBolumu() {
  const t = await getTranslations("Sayim");

  const sayimlar = await prisma.stokSayimi.findMany({
    select: {
      id: true,
      kod: true,
      sayimGunu: true,
      kapanisAt: true,
      yazimAt: true,
      iptalAt: true,
      _count: { select: { satirlar: true } },
    },
    orderBy: { acilisAt: "desc" },
    take: 1,
  });

  const acik = sayimlar.find((s) => acikOturumVarMi([s]));

  if (!acik) {
    /**
     * Kapsam ÖNCEDEN sayılıyor ki kullanıcı "kaç varyant sayacağım"ı
     * başlamadan görsün — bir günlük işe körlemesine girilmesin.
     */
    const stoklar = await prisma.stockMovement.groupBy({
      by: ["variantId"],
      _sum: { quantityDelta: true },
    });
    const kapsam = stoklar.filter((s) => (s._sum.quantityDelta ?? 0) > 0).length;
    return (
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <ClipboardCheck className="size-4" aria-hidden />
          {t("baslik")}
        </h2>
        <SayimBaslat kapsam={kapsam} />
      </section>
    );
  }

  /**
   * ⚠ AÇIK OTURUMDA SAYAÇ SIFIRDAN BAŞLAMAZ. Sayım bir gün sürüyor ve ara
   * verilecek; dönüşte "0 / 202" göstermek, yapılan işi yok saymak olurdu.
   * Sayılan satır sayısı veritabanından okunuyor.
   */
  const sayilan = await prisma.stokSayimSatiri.count({
    where: { sayimId: acik.id, sayilanAdet: { not: null } },
  });
  const kapsam = await prisma.stokSayimSatiri.count({
    where: { sayimId: acik.id, kapsamdaydi: true },
  });
  const bugunHareket = await prisma.stockMovement.count({
    where: { occurredAt: acik.sayimGunu },
  });

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <ClipboardCheck className="size-4" aria-hidden />
        {t("baslik")}
      </h2>
      <SayimKipi
        sayimId={acik.id}
        kod={acik.kod}
        kapsam={kapsam}
        sayilanBaslangic={sayilan}
        bugunHareketVar={bugunHareket > 0}
      />
    </section>
  );
}
