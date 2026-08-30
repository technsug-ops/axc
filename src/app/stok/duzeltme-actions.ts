"use server";

import { yetkiIste } from "@/lib/yetki";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { acikPartiler, fifoDagit, gunSonu } from "@/lib/stok";
import { sayimGecersizlestir, sonSayimTarihleri } from "@/lib/sayim-damgasi";
import {
  israrGecerliMi,
  SAYIM_ISRAR_SEBEPLERI,
  sayimKorumasi,
  type SayimIsrari,
  type SayimIsrarSebebi,
} from "@/lib/sayim-korumasi";
import {
  duzeltmeyiDogrula,
  hareketMiktari,
  type DuzeltmeYonu,
} from "@/lib/stok-duzeltme";

import type { Currency } from "@/generated/prisma/enums";


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

  /**
   * ═══ SAYIM KAPISI ════════════════════════════════════════════════════════
   *
   * ⭐ ANAYASA: **FİZİKSEL SAYIM SON SÖZDÜR.** Bu ekran kullanıcının SEÇTİĞİ
   * tarihe yazıyor, yani sayımdan ÖNCEYE yazabilir.
   *
   * ⚠ YASAK DEĞİL, DURAKSAMA: kullanıcı ısrar ederse geçer — ama sebebiyle
   * ve izle. _(Anayasa: "uyarı sorar, kullanıcı ısrar ederse istisna
   * kaydedilir.")_
   *
   * ⛔ VE ÖLÇÜT SUNUCUDA DA KOŞAR: ekran düğmeyi kilitliyor, sunucu ona
   * GÜVENMİYOR. İki yerde iki ölçüt olmasın diye ikisi de AYNI saf gövdeyi
   * (`israrGecerliMi`) çağırıyor.
   */
  const sonSayimlar = await sonSayimTarihleri(prisma, [variantId]);
  const kapi = sayimKorumasi({
    sonSayimIsTarihi: sonSayimlar.get(variantId) ?? null,
    hareketIsTarihi: tarih,
    adet: hareketMiktari({ adet, yon }),
  });
  const israr: SayimIsrari = {
    onaylandi: String(formData.get("sayimIsrariOnay") ?? "") === "1",
    sebep: (SAYIM_ISRAR_SEBEPLERI as readonly string[]).includes(
      String(formData.get("sayimIsrariSebep") ?? ""),
    )
      ? (String(formData.get("sayimIsrariSebep")) as SayimIsrarSebebi)
      : null,
    aciklama: String(formData.get("sayimIsrariAciklama") ?? ""),
  };
  if (kapi.sonuc === "DURAKSA") {
    const g = israrGecerliMi(israr);
    if (!g.gecerli) {
      /**
       * ⚠ SEBEP EKRANDA YAZAR (İlke #5): niye ilerlemediği ve nasıl
       * ilerleyeceği görünür. Sessiz başarısızlık yasak.
       */
      return {
        hatalar: [
          kapi.yon === "DUSUREN"
            ? t("sayimIsrariDusuren", { tarih: tarihMetni })
            : t("sayimIsrariArtiran", { tarih: tarihMetni }),
          g.eksik === "onay"
            ? t("sayimIsrariOnayGerek")
            : g.eksik === "sebep"
              ? t("sayimIsrariSebepGerek")
              : t("sayimIsrariAciklamaGerek"),
        ],
      };
    }
  }

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

  /**
   * ═══ İSTİSNA İZ BIRAKIR — İKİ YERE ═══════════════════════════════════════
   *
   * ⭐ ANAYASA: _"'Devam edilsin' demek, kaydın sessizce geçmesi demek
   * değildir; üç ay sonra 'bu neden böyle' sorusunun cevabı olmalıdır."_
   *
   * İKİ AYRI OKUYUCU, İKİ AYRI KAYIT — biri ötekinin yerine geçmez:
   *  · `AuditLog`        → "ne oldu, kim, hangi sebeple" (geçmişe bakan)
   *  · `sayimGecersizAt` → "bu varyantın sayımı ARTIK GEÇERLİ DEĞİL"
   *                        (ileriye bakan: yeniden sayılmalı)
   * Yalnız `AuditLog` yazılsaydı, geçersizleşen sayım hiçbir ekranda
   * görünmezdi ve kimse yeniden saymazdı.
   */
  if (kapi.sonuc === "DURAKSA") {
    const an = new Date();
    await sayimGecersizlestir(prisma, [variantId], an);
    await prisma.auditLog.create({
      data: {
        action: "SAYIM_KORUMASI_ISTISNASI",
        targetType: "ProductVariant",
        targetId: variantId,
        detail: JSON.stringify({
          yol: "/stok — stok düzeltme",
          yon: kapi.yon,
          sayimTarihi: kapi.sayimTarihi.toISOString(),
          hareketIsTarihi: kapi.hareketIsTarihi.toISOString(),
          adet: hareketMiktari({ adet, yon }),
          sebep: israr.sebep,
          aciklama: israr.aciklama.trim() || null,
          sonuc: "SAYIM GECERSIZLESTI — bu varyant yeniden sayilmali.",
        }),
      },
    });
  }

  revalidatePath("/stok");
  revalidatePath(`/stok/${variantId}`);
  revalidatePath("/envanter-degeri");
  revalidatePath("/rapor");

  return {};
}
