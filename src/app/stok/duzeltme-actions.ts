"use server";

import { yetkiIste } from "@/lib/yetki";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { acikPartiler, fifoDagit, gunSonu } from "@/lib/stok";
import {
  duzeltmeyiDogrula,
  hareketMiktari,
  type DuzeltmeYonu,
} from "@/lib/stok-duzeltme";

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
 *  STOK DÜZELTME — YAZAN TARAF
 * ----------------------------------------------------------------------------
 *  LEDGER KURALI (anayasa): hareket SİLİNMEZ, DEĞİŞTİRİLMEZ. Yanlış düzeltme,
 *  ters işaretli ikinci bir düzeltmeyle kapatılır. Bu ekranda "düzelt" ya da
 *  "sil" düğmesi bilerek YOKTUR.
 *
 *  EKSİ YÖN — FIFO'dan düşer ve HER PARTİ İÇİN AYRI HAREKET yazılır.
 *  Tek hareket yazıp maliyeti ortalasaydık, o partinin gerçek maliyeti
 *  kaybolurdu; satışta olduğu gibi burada da parti izi korunuyor
 *  (`sourceMovementId`).
 *
 *  ARTI YÖN — tek hareket, yeni bir FIFO partisi. Maliyet girilmezse parti
 *  NO_COST doğar; o mal satılınca kâr "hesaplanamadı" der. Sıfır maliyet
 *  VARSAYILMAZ.
 *
 *  STOK YETMİYORSA HİÇ YAZILMAZ: kısmi düzeltme yok. Elinizde 3 varken 5
 *  kırıldıysa, kayıt 3'e düşürülmez — ne olduğu sorulur.
 * ============================================================================
 */

export type DuzeltmeDurumu = {
  hatalar?: string[];
  /** Stok yetersizse: gerçekte kaç adet var. */
  mevcutStok?: number;
};

export async function stokDuzelt(
  _onceki: DuzeltmeDurumu,
  formData: FormData,
): Promise<DuzeltmeDurumu> {
  await yetkiIste("stok.duzelt");

  const t = await getTranslations("StokDuzeltme");

  const variantId = String(formData.get("variantId") ?? "");
  const nedenId = String(formData.get("nedenId") ?? "");
  const yon = String(formData.get("yon") ?? "") as DuzeltmeYonu;
  const adet = Number(String(formData.get("adet") ?? "").replace(",", "."));
  const aciklama = String(formData.get("aciklama") ?? "");
  const tarihMetni = String(formData.get("tarih") ?? "");
  const maliyetMetni = String(formData.get("birimMaliyet") ?? "").trim();
  const paraBirimi = (String(formData.get("paraBirimi") ?? "TRY") ||
    "TRY") as Currency;

  if (!variantId) return { hatalar: [t("varyantYok")] };
  if (!nedenId) return { hatalar: [t("nedenSecin")] };
  if (yon !== "EKSI" && yon !== "ARTI") return { hatalar: [t("yonSecin")] };

  const neden = await prisma.stockAdjustmentReason.findUnique({
    where: { id: nedenId },
    select: {
      id: true,
      movementType: true,
      requiresNote: true,
      isActive: true,
      yon: true,
    },
  });
  if (!neden || !neden.isActive) return { hatalar: [t("nedenBulunamadi")] };

  /**
   * YÖN SUNUCUDA DA DOĞRULANIR — EKRANA GÜVENİLMEZ.
   *
   * Form nedenleri yöne göre süzüyor, ama süzgeç yalnız GÖRÜNÜRLÜKTÜR:
   * istek elle de kurulabilir, eski bir sekme açık kalabilir, kullanıcı
   * neden seçtikten sonra yönü değiştirebilir. Bu depoda kural zaten
   * yazılıydı (bkz. düzeltme nedeni tip kilidi: "ekran alanı zaten
   * kilitli, ama sunucu da güvenmiyor") — kendi eklediğim kısıtta
   * atlamıştım (16.08.2026).
   *
   * `HER_IKISI` her yönde geçer; diğerleri yalnız kendi yönünde.
   */
  if (neden.yon !== "HER_IKISI" && neden.yon !== yon) {
    return { hatalar: [t("nedenYonUyumsuz")] };
  }

  const birimMaliyet =
    maliyetMetni === "" ? null : Number(maliyetMetni.replace(",", "."));

  const hatalar = duzeltmeyiDogrula({
    adet,
    yon,
    birimMaliyet,
    paraBirimi: birimMaliyet === null ? null : paraBirimi,
    aciklamaZorunlu: neden.requiresNote,
    aciklama,
  });

  if (hatalar.length) {
    // Kod -> metin SABİT eşleme (i18n denetimi görebilsin).
    const metin = (kod: string) =>
      kod === "ADET_SIFIR"
        ? t("hataAdetSifir")
        : kod === "ADET_TAM_SAYI_DEGIL"
          ? t("hataAdetTamSayi")
          : kod === "ACIKLAMA_ZORUNLU"
            ? t("hataAciklamaZorunlu")
            : kod === "MALIYET_NEGATIF"
              ? t("hataMaliyetNegatif")
              : t("hataMaliyetParaBirimsiz");
    return { hatalar: hatalar.map(metin) };
  }

  // İş tarihi: verilmezse bugünün İSTANBUL günü (form varsayılanı zaten öyle).
  const tarih = tarihMetni ? new Date(`${tarihMetni}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(tarih.getTime())) return { hatalar: [t("tarihGecersiz")] };

  try {
    await prisma.$transaction(async (tx) => {
      if (yon === "ARTI") {
        // --- FAZLA ÇIKAN MAL: yeni parti ---
        // RAF VARYANTIN GÜNCEL RAFINDAN yazılır. Boş bırakılırsa sayım
        // fazlası "rafsız" bir parti olarak doğuyordu ve toplama ekranında
        // nerede olduğu bilinmiyordu — mal bir yerde bulundu, orası da
        // ürünün durduğu raftır. (13.08.2026, kullanıcı testinde görüldü.)
        const varyant = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: { locationId: true },
        });

        await tx.stockMovement.create({
          data: {
            variantId,
            type: neden.movementType,
            quantityDelta: hareketMiktari({ adet, yon }),
            occurredAt: tarih,
            adjustmentReasonId: neden.id,
            note: aciklama.trim() === "" ? null : aciklama.trim(),
            locationId: varyant?.locationId ?? null,
            unitCostAmount: birimMaliyet === null ? null : String(birimMaliyet),
            unitCostCurrency: birimMaliyet === null ? null : paraBirimi,
          },
        });
        return;
      }

      // --- MAL GİTTİ: FIFO'dan düş ---
      /** ⛔ SINIR: duzeltme gununun sonu — geri tarihli duzeltme
       *  bugunku partiyi yiyemez (29.08.2026 arizasi). */
      const partiler = await acikPartiler(tx, variantId, gunSonu(tarih));
      const dagitim = fifoDagit(partiler, adet);
      if (!dagitim.yeterliMi) {
        // Özel hata: ekranda "elinizde şu kadar var" diye gösterilecek.
        throw Object.assign(new Error("STOK_YETMIYOR"), {
          mevcut: dagitim.mevcut,
        });
      }

      // HER PARTİ İÇİN AYRI HAREKET: parti izi (sourceMovementId) korunur,
      // maliyet ortalanmaz.
      for (const pay of dagitim.dagitim) {
        await tx.stockMovement.create({
          data: {
            variantId,
            type: neden.movementType,
            quantityDelta: -pay.adet,
            occurredAt: tarih,
            adjustmentReasonId: neden.id,
            note: aciklama.trim() === "" ? null : aciklama.trim(),
            sourceMovementId: pay.parti.hareketId,
            locationId: pay.parti.locationId,
            // Maliyet PARTİDEN gelir, kullanıcıdan değil: kaybedilen para
            // o malın gerçek alış bedelidir.
            unitCostAmount: pay.parti.birimMaliyet,
            unitCostCurrency: pay.parti.birimMaliyetParaBirimi,
          },
        });
      }
    });
  } catch (e) {
    const mevcut = (e as { mevcut?: number }).mevcut;
    if (typeof mevcut === "number") {
      return { hatalar: [t("stokYetmiyor", { mevcut })], mevcutStok: mevcut };
    }
    console.error("[stok duzeltme] beklenmeyen hata:", e);
    return { hatalar: [t("kaydedilemedi")] };
  }

  revalidatePath("/stok");
  revalidatePath(`/stok/${variantId}`);
  revalidatePath("/envanter-degeri");
  revalidatePath("/rapor");

  return {};
}
