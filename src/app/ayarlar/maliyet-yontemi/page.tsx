import { getTranslations } from "next-intl/server";
import { Calculator } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";
import { maliyetYontemiCoz, type MaliyetYontemi } from "@/lib/maliyet-yontemi";
import { lotKipiCoz } from "@/lib/lot-kipi";
import { yontemDegisimKarari } from "@/lib/maliyet-yontemi-kapisi";

import { acikYontemler } from "./eylemler";
import { YontemFormu } from "./yontem-formu";

export async function generateMetadata() {
  const t = await getTranslations("MaliyetYontemi");
  return { title: t("baslik") };
}

/**
 * ============================================================================
 *  MALİYET YÖNTEMİ AYARI (K115, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE `Ayarlar → Depo kurulumu` DEĞİL: o ekran raf/konum kurulumudur.
 *  Maliyet yöntemi bir MUHASEBE kararıdır ve değişim kuralı DÖNEME bağlı —
 *  bu yüzden muhasebe dönemlerinin yanında, kendi sayfasında duruyor.
 *
 *  ── ⚠ İKİ AYRI AYAR, BİRİ ÖTEKİNİ KISITLIYOR ───────────────────────────
 *  `maliyetYontemi` MOTORDUR (FIFO ↔ hareketli ortalama).
 *  `lotKipi` POLİTİKADIR (partiyi kim seçer) ve YALNIZ FIFO'da anlamlıdır.
 *
 *  ── ⛔ ISRAR, KİLİT DEĞİL ──────────────────────────────────────────────
 *  Kullanıcı kuralı: yöntem değişimi ciddi uyarı + bilinçli onayla geçer.
 *  Karar `lib/maliyet-yontemi-kapisi.ts`te SAF; bu sayfa yalnız sayıları
 *  ölçüp gövdeye veriyor — ikinci bir kural yazılmıyor.
 *
 *  ⚠ SAYILAR SUNUCUDA ÖLÇÜLÜYOR, FORMDA TAHMİN EDİLMİYOR. Uyarıdaki rakam
 *  ("bu ayda N hareket var") gerçek bir sayım; yoksa uyarı somut olmaz ve
 *  okunmaz.
 * ============================================================================
 */
export default async function MaliyetYontemiSayfasi() {
  await sayfaIzni("ayar.yaz");

  const t = await getTranslations("MaliyetYontemi");

  const firma = await prisma.company.findFirst({
    select: { maliyetYontemi: true, lotKipi: true },
  });

  const mevcutYontem = maliyetYontemiCoz(firma?.maliyetYontemi ?? null);
  const mevcutKip = lotKipiCoz(firma?.lotKipi ?? null);

  /**
   * ⚠ AY BAŞI İŞ SAAT DİLİMİNDEN — `Europe/Istanbul` sabittir (anayasa).
   * Çalışma ortamının saat dilimi ASLA kullanılmaz.
   */
  const g = new Date();
  const ayinIlki = new Date(Date.UTC(g.getUTCFullYear(), g.getUTCMonth(), 1));

  const [toplamHareket, cariDonemHareketi] = await Promise.all([
    prisma.stockMovement.count(),
    prisma.stockMovement.count({ where: { occurredAt: { gte: ayinIlki } } }),
  ]);

  /**
   * ⚠ KARAR "FARKLI BİR YÖNTEME GEÇİLSEYDİ NE OLURDU" DİYE SORULUYOR.
   * Mevcut yöntemle sorsaydık gövde `DEGISIKLIK_YOK` derdi ve form ısrar
   * bloğunu HİÇ göremezdi — uyarı ancak kullanıcı seçimi değiştirince
   * belirir, ama o an sunucuya gitmeden bilinmesi gerekiyor.
   */
  const baskaYontem: MaliyetYontemi =
    mevcutYontem === "FIFO" ? "HAREKETLI_ORTALAMA" : "FIFO";
  const karar = yontemDegisimKarari({
    eski: mevcutYontem,
    yeni: baskaYontem,
    toplamHareket,
    cariDonemHareketi,
  });

  const duraksama =
    karar.sonuc === "DURAKSA"
      ? { agirlik: karar.agirlik, etkilenen: karar.etkilenen }
      : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Calculator className="size-5" aria-hidden />
          {t("baslik")}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          {t("aciklama")}
        </p>
      </div>

      {/*
        ⚠ İKİ EKRAN BİRBİRİNE BAKAR: değişim kuralı döneme bağlı olduğu için
        kullanıcı buradan dönem ekranına gidebilmeli. Anayasa: gösterdiğim
        link VAR OLAN bir ekrana gitmeli — `/ayarlar/donemler` canlıda.
      */}
      <p className="text-sm">
        <Baglanti href="/ayarlar/donemler">{t("donemlereGit")}</Baglanti>
      </p>

      <YontemFormu
        mevcutYontem={mevcutYontem}
        mevcutKip={mevcutKip}
        acikYontemler={await acikYontemler()}
        duraksama={duraksama}
      />
    </div>
  );
}
