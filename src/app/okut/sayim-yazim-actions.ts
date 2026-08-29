"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { acikPartiler, fifoDagit, gunSonu } from "@/lib/stok";
import { kapanisVerisi } from "@/lib/sayim/kapanis-verisi";
import { oturumdakiKullanici } from "@/lib/oturum";
import { yetkiIste } from "@/lib/yetki";
import type { Currency } from "@/generated/prisma/enums";

/**
 * SAYIM KORUMASI YOK: kapı bu yola HENÜZ BAĞLANMADI (K84, 29.08.2026).
 *
 * Kural ve saf gövde hazır (`lib/sayim-korumasi.ts`), bekçisi koşuyor
 * (`sayim-korumasi:dogrula`). Eksik olan tek şey KULLANICI TARAFI:
 * duraksama bir soru sorar ve "ısrar edersen iz bırakarak geçer" yolu
 * gerektirir; o ekran yok. Kapıyı ekransız bağlamak, meşru bir işi
 * SESSİZCE kilitlerdi — anayasadaki "kural doğru mu değil, teslim
 * edilebilir mi" süzgeci tam burada durduruyor.
 *
 * Bu beyan bir gerekçe DEĞİL, BORÇ KAYDIDIR: yeni açılan bir yol bekçiye
 * takılır ve bu satırı kopyalamak zorunda kalan kişi borcu görür.
 */

/**
 * ============================================================================
 *  SAYIM FARKINI YAZ (K57 ②) — DEFTERE DOKUNAN TEK YER
 * ----------------------------------------------------------------------------
 *  ⛔ İZİN `stok.duzelt` — okuma `stok.gor` ile yapılıyordu; burası deftere
 *  yazıyor ve ayrı izin istiyor. Yeni izin AÇILMADI, ikisi de mevcut.
 *
 *  ⛔ MEVCUT MOTOR KULLANILIYOR, İKİNCİ BİR YOL AÇILMIYOR:
 *  `COUNT_CORRECTION` + `StokAdjustmentReason("Sayım farkı")` + FIFO dağıtımı
 *  zaten canlıda ve sınanmış. Sayım için ayrı bir yazma yolu açmak, aynı işi
 *  iki farklı şekilde yapan iki kapı demekti.
 *
 *  ═══ İKİ YÖN, İKİ AYRI SORU ═══
 *
 *  EKSİ (rafta az) — FIFO'dan düşer, **her parti için ayrı hareket**
 *  (`sourceMovementId`). Maliyet PARTİDEN gelir, kullanıcıdan değil.
 *
 *  ARTI (rafta çok) — yeni FIFO partisi. Maliyet girilmezse parti `NO_COST`
 *  doğar ve o mal satılınca kâr "hesaplanamadı" der. **Sıfır maliyet
 *  VARSAYILMAZ.**
 *
 *  ⛔ VE HESAPLAR KARIŞMAZ (kullanıcı sorusu 28.08.2026): düzeltme bir satış
 *  değildir. Ciroya GİRMEZ, NET-1/NET-2'ye GİRMEZ, gider tablosuna
 *  YAZILMAZ. Yalnız dönem raporunda ayrı kalem olur ve
 *  `gercekNet = brutNet2 − giderNetDusen − duzeltmeZarari` üzerinden
 *  GERÇEK NET'ten düşer (`lib/rapor.ts:426`).
 * ============================================================================
 */

export type YazimSonucu = {
  hata?: string;
  /** Stok yetmediyse: gerçekte kaç adet var. */
  mevcutStok?: number;
  yazilanHareket?: number;
};

/** `Sayım farkı` nedeni — sistem anahtarı yok, ADIYLA aranıyor (seed'den). */
const NEDEN_ADI = "Sayım farkı";

export async function sayimFarkiniYaz(
  sayimId: string,
  variantId: string,
  /** ARTI yönünde kullanıcının girdiği birim maliyet; girilmezse NO_COST. */
  birimMaliyet: number | null = null,
  paraBirimi: Currency = "TRY",
): Promise<YazimSonucu> {
  await yetkiIste("stok.duzelt");

  const veri = await kapanisVerisi(prisma, sayimId);
  if (!veri) return { hata: "SAYIM_YOK" };

  const satir = [...veri.fazla, ...veri.eksik].find((s) => s.variantId === variantId);
  if (!satir) return { hata: "SATIR_YOK" };

  /**
   * ⛔ KAPI SAF GÖVDEDEN: belirsiz satır, zaten yazılmış satır ve yeniden
   * açılmış satır YAZILAMAZ. Koşul burada ELLE yazılsaydı ekranla gövde bir
   * gün ayrışırdı ve "düğme kapalı ama sunucu yazıyor" hâli doğardı.
   */
  if (!satir.hal.yazilabilirMi) return { hata: "YAZILAMAZ" };

  const neden = await prisma.stockAdjustmentReason.findFirst({
    where: { name: NEDEN_ADI, isActive: true },
    select: { id: true, movementType: true },
  });
  if (!neden) return { hata: "NEDEN_YOK" };

  const adet = satir.karar.adet;
  if (adet <= 0) return { hata: "SAPMA_YOK" };

  /** Sayım GÜNÜNE damgalanır — bugüne değil. Sapma o güne aitti. */
  const tarih = veri.sayimGunu;
  const kullanici = await oturumdakiKullanici();

  try {
    const yazilan = await prisma.$transaction(async (tx) => {
      /** ⛔ SATIR KİLİDİ SUNUCUDA — çift tık ikinci düzeltmeyi yazamasın. */
      const guncel = await tx.stokSayimSatiri.findUnique({
        where: { sayimId_variantId: { sayimId, variantId } },
        select: { id: true, duzeltmeYazildiAt: true },
      });
      if (!guncel) throw Object.assign(new Error("SATIR_YOK"), { kod: "SATIR_YOK" });
      if (guncel.duzeltmeYazildiAt !== null) {
        throw Object.assign(new Error("ZATEN_YAZILDI"), { kod: "ZATEN_YAZILDI" });
      }

      let sayac = 0;
      if (satir.karar.yon === "ARTI") {
        /** Raf VARYANTIN GÜNCEL RAFINDAN — fazla mal bir yerde bulundu. */
        const varyant = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: { locationId: true },
        });
        await tx.stockMovement.create({
          data: {
            variantId,
            type: neden.movementType,
            quantityDelta: adet,
            occurredAt: tarih,
            adjustmentReasonId: neden.id,
            sayimSatiriId: guncel.id,
            userId: kullanici?.id ?? null,
            note: veri.kod,
            locationId: varyant?.locationId ?? null,
            unitCostAmount: birimMaliyet === null ? null : String(birimMaliyet),
            unitCostCurrency: birimMaliyet === null ? null : paraBirimi,
          },
        });
        sayac = 1;
      } else {
        /** MAL GİTTİ: FIFO'dan düş, HER PARTİ İÇİN AYRI hareket. */
        /** SINIR: sayim gununun sonu — geri tarihli sayim bugunku
         *  partiyi yiyemez (29.08.2026 arizasi). */
        const partiler = await acikPartiler(tx, variantId, gunSonu(tarih));
        const dagitim = fifoDagit(partiler, adet);
        if (!dagitim.yeterliMi) {
          throw Object.assign(new Error("STOK_YETMIYOR"), {
            kod: "STOK_YETMIYOR",
            mevcut: dagitim.mevcut,
          });
        }
        for (const pay of dagitim.dagitim) {
          await tx.stockMovement.create({
            data: {
              variantId,
              type: neden.movementType,
              quantityDelta: -pay.adet,
              occurredAt: tarih,
              adjustmentReasonId: neden.id,
              sayimSatiriId: guncel.id,
              userId: kullanici?.id ?? null,
              note: veri.kod,
              sourceMovementId: pay.parti.hareketId,
              locationId: pay.parti.locationId,
              /** Maliyet PARTİDEN — kaybedilen para o malın alış bedelidir. */
              unitCostAmount: pay.parti.birimMaliyet,
              unitCostCurrency: pay.parti.birimMaliyetParaBirimi,
            },
          });
          sayac++;
        }
      }

      /**
       * ⛔ DAMGA — SAYIM HÜKMÜ KAYDIN HÂLİNE BAĞLANIR (K6 deseni).
       * Yazım anındaki sistem adedi saklanıyor; sonradan sayım gününe ya da
       * öncesine damgalı bir hareket girilirse damga tutmaz ve satır
       * YENİDEN AÇILIR. Kalıcı bir "bir daha bakma" işareti YOK.
       */
      await tx.stokSayimSatiri.update({
        where: { id: guncel.id },
        data: {
          duzeltmeYazildiAt: new Date(),
          damgaSistemAdedi: satir.sistemAdedi,
        },
      });
      return sayac;
    });

    revalidatePath("/okut");
    revalidatePath("/stok");
    revalidatePath("/rapor");
    revalidatePath("/");
    return { yazilanHareket: yazilan };
  } catch (e) {
    const kod = (e as { kod?: string }).kod;
    if (kod === "STOK_YETMIYOR") {
      return { hata: "STOK_YETMIYOR", mevcutStok: (e as { mevcut?: number }).mevcut };
    }
    if (kod) return { hata: kod };
    /** ⛔ Mesaj TAM loglanır — yakalanmamış hata, yutulmuş hatanın kardeşidir. */
    console.error("[sayim yazim] beklenmeyen hata:", e instanceof Error ? e.message : String(e));
    return { hata: "YAZILAMADI" };
  }
}

/** Sayım oturumunu "yazıldı" olarak damgalar — kapanışın son adımı. */
export async function sayimiYazildiIsaretle(sayimId: string): Promise<{ hata?: string }> {
  await yetkiIste("stok.duzelt");
  const sayim = await prisma.stokSayimi.findUnique({
    where: { id: sayimId },
    select: { kapanisAt: true, yazimAt: true },
  });
  if (!sayim) return { hata: "SAYIM_YOK" };
  if (sayim.kapanisAt === null) return { hata: "KAPANMADI" };
  if (sayim.yazimAt !== null) return { hata: "ZATEN_YAZILDI" };

  await prisma.stokSayimi.update({
    where: { id: sayimId },
    data: { yazimAt: new Date() },
  });
  revalidatePath("/okut");
  return {};
}
