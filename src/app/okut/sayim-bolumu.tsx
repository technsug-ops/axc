import { ClipboardCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { acikOturumVarMi } from "@/lib/sayim/oturum";

import { kapanisVerisi, type KapanisSatiri } from "@/lib/sayim/kapanis-verisi";

import { SayimBaslat } from "./sayim-baslat";
import { SayimKapanis } from "./sayim-kapanis";
import { SayimKipi } from "./sayim-kipi";

/** Kapsam: stoğu > 0 olan varyant sayısı. İki yerde gerekiyor, tek gövde. */
async function kapsamSay(): Promise<number> {
  const stoklar = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    _sum: { quantityDelta: true },
  });
  return stoklar.filter((s) => (s._sum.quantityDelta ?? 0) > 0).length;
}

/**
 * Kapanış satırını ekranın beklediği düz şekle indirger.
 * ⚠ HÜKÜM BURADA ÜRETİLMİYOR — `hal` zaten saf gövdeden geldi; burası
 * yalnız taşıyor.
 */
function kapanisSatiri(s: KapanisSatiri) {
  return {
    variantId: s.variantId,
    sku: s.sku,
    urunAdi: s.urunAdi,
    sayilanAdet: s.sayilanAdet,
    sistemAdedi: s.sistemAdedi,
    fark: s.hal.fark ?? 0,
    belirsiz: s.hal.belirsiz,
    kilitli: s.karar.kilitli,
    yenidenAcildi: s.hal.damga === "YENIDEN_ACILDI",
    kapsamDisi: s.hal.kapsamDisi,
    hareketsizSatis: s.hareketsizSatis,
    alimGecmisiVar: s.alimGecmisiVar,
  };
}

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

  /**
   * ⚠ KAPANMIŞ SAYIM KENDİLİĞİNDEN KAYBOLMAZ. Kapanış bir HÜKÜM aşamasıdır:
   * fark hâlâ CANLI (her açılışta yeniden hesaplanıyor) ve düzeltmeler
   * yazılana kadar iş bitmemiştir. Kapandı diye ekrandan silseydik kullanıcı
   * bir günlük sayımın sonucunu hiç göremezdi.
   *
   * ⛔ AMA İPTAL EDİLMİŞ SAYIM GÖSTERİLMEZ: iptal, oturumun sözünü geri alır.
   */
  const kapanan =
    !acik && sayimlar[0] && sayimlar[0].kapanisAt !== null && sayimlar[0].iptalAt === null
      ? sayimlar[0]
      : null;

  if (kapanan) {
    const veri = await kapanisVerisi(prisma, kapanan.id);
    if (veri) {
      return (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <ClipboardCheck className="size-4" aria-hidden />
            {t("kapanisBaslik")}
          </h2>
          <SayimKapanis
            sayimId={veri.sayimId}
            kod={veri.kod}
            ozet={{
              kapsam: veri.ozet.kapsam,
              sayildi: veri.ozet.sayildi,
              sapan: veri.ozet.sapan,
              sayilmadi: veri.ozet.sayilmadi,
            }}
            belirsiz={veri.belirsiz}
            kapsamDisi={veri.ozet.kapsamDisi}
            bosKapandi={veri.bosKapandi}
            duzeltmesizKapandi={veri.duzeltmesizKapandi}
            yazildiMi={veri.yazildiMi}
            okutulmayanlar={veri.okutulmayanlar}
            eksik={veri.eksik.map(kapanisSatiri)}
            fazla={veri.fazla.map(kapanisSatiri)}
          />
          <SayimBaslat kapsam={await kapsamSay()} />
        </section>
      );
    }
  }

  if (!acik) {
    /**
     * Kapsam ÖNCEDEN sayılıyor ki kullanıcı "kaç varyant sayacağım"ı
     * başlamadan görsün — bir günlük işe körlemesine girilmesin.
     */
    const kapsam = await kapsamSay();
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
