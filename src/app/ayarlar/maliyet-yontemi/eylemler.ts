"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { yetkiIste } from "@/lib/yetki";
import {
  MALIYET_YONTEMLERI,
  maliyetYontemiCoz,
  type MaliyetYontemi,
} from "@/lib/maliyet-yontemi";
import {
  YONTEM_DEGISTI_EYLEMI,
  YONTEM_ISRAR_SEBEPLERI,
  yontemDegisimKarari,
  type YontemIsrarSebebi,
} from "@/lib/maliyet-yontemi-kapisi";
import { LOT_KIPLERI, lotKipiCoz, type LotKipi } from "@/lib/lot-kipi";

/**
 * ============================================================================
 *  MALİYET YÖNTEMİ / LOT KİPİ — YAZMA (K115, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ ISRAR, KİLİT DEĞİL. Kural `lib/maliyet-yontemi-kapisi.ts`te ve SAF;
 *  burada yalnız sayılar toplanıp gövdeye veriliyor, ikinci bir kural
 *  yazılmıyor. K108'in kapı·ısrar deseni aynen.
 *
 *  ⚠ ORTALAMA SEÇENEĞİ HENÜZ AÇIK DEĞİL — VE BU BİR KAPI, SÜS DEĞİL.
 *  Kullanıcı şartı: _"bekçiler koşullanmadan HAREKETLI_ORTALAMA seçilebilir
 *  olmaz."_ Ekran onu listelemiyor; ama ekran listelemese de gövde kabul
 *  ederse bir POST isteği yeter. Kapı BURADA, sunucuda.
 *
 *  ⚠ İZ HER DEĞİŞİKLİKTE — `MALIYET_YONTEMI_DEGISTI` {eskisi, yenisi,
 *  donem, kullanıcı, ısrar}. Üç ay sonra "bu firma niye ortalamaya geçmiş"
 *  sorusunun cevabı olmalı.
 * ============================================================================
 */

const IZIN = "ayar.yaz";

export type YontemSonucu = { hata?: string; basari?: string };

/**
 * ⛔ BUGÜN AÇIK OLAN YÖNTEMLER — ekranın değil GÖVDENİN kapısı.
 *
 * ⚠ Bekçiler yöntem-koşullu hâle geldiğinde bu liste `MALIYET_YONTEMLERI`
 * olur ve satır silinir. O güne kadar `HAREKETLI_ORTALAMA` gövdeden geçmez.
 */
const ACIK_YONTEMLER: readonly MaliyetYontemi[] = ["FIFO"];

export async function yontemiDegistir(
  _onceki: YontemSonucu,
  form: FormData,
): Promise<YontemSonucu> {
  const baglam = await yetkiIste(IZIN);
  const t = await getTranslations("MaliyetYontemi");

  const firma = await prisma.company.findFirst({
    select: { id: true, maliyetYontemi: true, lotKipi: true },
  });
  if (!firma) return { hata: t("firmaYok") };

  const yeniYontem = maliyetYontemiCoz(String(form.get("maliyetYontemi") ?? ""));
  const yeniKip = lotKipiCoz(String(form.get("lotKipi") ?? ""));

  /** ⛔ KAPI: ekran gizlese de gövde kabul etmez. */
  if (!ACIK_YONTEMLER.includes(yeniYontem)) {
    return { hata: t("yontemHenuzAcikDegil") };
  }

  const yontemDegisti = yeniYontem !== firma.maliyetYontemi;
  const kipDegisti = yeniKip !== firma.lotKipi;
  if (!yontemDegisti && !kipDegisti) return { basari: t("degisiklikYok") };

  /**
   * ⚠ ISRAR YALNIZ YÖNTEM değişiminde istenir. Lot kipi bir GÖRÜNÜM
   * politikasıdır — maliyeti değiştirmez, geçmişi bölmez. Onu da ısrara
   * bağlamak, uyarıyı ucuzlatır ve okunmaz hâle getirirdi.
   */
  if (yontemDegisti) {
    const [toplamHareket, cariDonemHareketi] = await Promise.all([
      prisma.stockMovement.count(),
      prisma.stockMovement.count({ where: { occurredAt: { gte: ayinIlkGunu() } } }),
    ]);

    const karar = yontemDegisimKarari({
      eski: firma.maliyetYontemi as MaliyetYontemi,
      yeni: yeniYontem,
      toplamHareket,
      cariDonemHareketi,
    });

    if (karar.sonuc === "DURAKSA") {
      const onay = form.get("yontemOnay") === "1";
      const sebep = String(form.get("yontemSebep") ?? "") as YontemIsrarSebebi;
      const aciklama = String(form.get("yontemAciklama") ?? "").trim();

      /** ⚠ SEBEP KAPALI KÜMEDEN — serbest metin bir sebep değildir. */
      const sebepGecerli = (YONTEM_ISRAR_SEBEPLERI as readonly string[]).includes(
        sebep,
      );
      if (!onay) return { hata: t("onayGerek") };
      if (!sebepGecerli) return { hata: t("sebepGerek") };
      /** ⛔ `DIGER` seçildiyse açıklama ZORUNLU — sebepsiz istisna kusurdur. */
      if (sebep === "DIGER" && aciklama === "") return { hata: t("aciklamaGerek") };
    }
  }

  await prisma.company.update({
    where: { id: firma.id },
    data: { maliyetYontemi: yeniYontem, lotKipi: yeniKip },
  });

  /**
   * ⚠ İZ, DEĞİŞİKLİĞİN İKİ UCUNU DA TAŞIR. Yalnız yenisini yazmak, üç ay
   * sonra "neredeyse geçmişti" sorusunu cevapsız bırakırdı.
   */
  await prisma.auditLog.create({
    data: {
      action: YONTEM_DEGISTI_EYLEMI,
      targetType: "Company",
      targetId: firma.id,
      userId: baglam.kullaniciId,
      detail: JSON.stringify({
        eskiYontem: firma.maliyetYontemi,
        yeniYontem,
        eskiKip: firma.lotKipi,
        yeniKip,
        donem: donemAnahtariBugun(),
        israrSebep: form.get("yontemSebep") ?? null,
        israrAciklama: String(form.get("yontemAciklama") ?? "").trim() || null,
      }),
    },
  });

  revalidatePath("/ayarlar/maliyet-yontemi");
  return { basari: t("kaydedildi") };
}

/**
 * ⚠ İŞ SAAT DİLİMİ SABİT (`Europe/Istanbul`) — anayasa. Ay başı, çalışma
 * ortamının saat diliminden ÜRETİLMEZ; `donem.ts` gövdesi bunu biliyor.
 */
function ayinIlkGunu(): Date {
  const g = new Date();
  return new Date(Date.UTC(g.getUTCFullYear(), g.getUTCMonth(), 1));
}

function donemAnahtariBugun(): string {
  const g = new Date();
  return `${g.getUTCFullYear()}-${String(g.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Ekranın seçenek listesi — gövdeyle AYNI kapıdan geçer. */
export async function acikYontemler(): Promise<MaliyetYontemi[]> {
  return MALIYET_YONTEMLERI.filter((y) => ACIK_YONTEMLER.includes(y));
}

export async function tumKipler(): Promise<LotKipi[]> {
  return [...LOT_KIPLERI];
}
