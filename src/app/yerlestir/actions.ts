"use server";

import { revalidatePath } from "next/cache";

import { yerlestirmeKarari } from "@/lib/depo/yerlestirme";
import { prisma } from "@/lib/prisma";
import { kodKosulu } from "@/lib/varyant-arama-kurali";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  YERLEŞTİRME — SUNUCU EYLEMLERİ (K50 ④)
 * ----------------------------------------------------------------------------
 *  Depoda tek akış: RAFI okut → ÜRÜNLERİ okut. Raf seçili kalır, ürünler
 *  peş peşe okutulur.
 *
 *  ⛔ STOK DEFTERİNE DOKUNULMAZ. Burada yazılan tek şey `locationId` —
 *  bir ürünün NEREDE olduğu, KAÇ TANE olduğu değil. Bu yüzden sayım
 *  koruması kapsamına da girmiyor: `StockMovement` yazılmıyor, sayılmış
 *  bir raf düşürülmüyor.
 *  SAYIM KORUMASI YOK: hiçbir stok hareketi yazılmıyor; yalnız konum alanı
 *  güncelleniyor ve konum sayımın ölçtüğü büyüklük değil.
 *
 *  ⚠ İZİN `stok.duzelt`. Ayrı bir `konum.yaz` izni AÇILMADI: RBAC Faz 4'te
 *  ve bugün tek kullanıcı var. Yeni izin, canlı veritabanına da işlenmezse
 *  ekranı SESSİZCE kaybettiriyor (13.08.2026 vakası) — bugün karşılığı
 *  olmayan bir ayrım için o riski almıyoruz. Toplayıcı rolü doğduğu gün
 *  ayrılır.
 * ============================================================================
 */

/** ⚠ İZ EYLEMİ — `AuditLog.action`, tek yerden. */
export const YERLESTIRME_EYLEMI = "URUN_YERLESTIRILDI";

export type SeciliRaf = {
  id: string;
  kod: string;
  ad: string | null;
  /** Bu rafa kayıtlı aktif varyant sayısı — yerleştirdikçe artar. */
  urunSayisi: number;
};

export type RafSonucu =
  | { durum: "RAF"; raf: SeciliRaf }
  /** ⛔ PASİF RAF SESSİZCE KABUL EDİLMEZ: ürün kaybolmuş gibi olurdu. */
  | { durum: "PASIF"; kod: string }
  | { durum: "YOK"; kod: string };

/** Rafı koduyla seç. Hiçbir şey YAZMAZ. */
export async function rafiSec(kod: string): Promise<RafSonucu> {
  await yetkiIste("stok.duzelt");

  const temiz = kod.trim();
  if (!temiz) return { durum: "YOK", kod: temiz };

  const raf = await prisma.location.findFirst({
    where: { code: temiz },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      _count: { select: { variants: { where: { isActive: true } } } },
    },
  });
  if (!raf) return { durum: "YOK", kod: temiz };
  if (!raf.isActive) return { durum: "PASIF", kod: raf.code };
  return {
    durum: "RAF",
    raf: { id: raf.id, kod: raf.code, ad: raf.name, urunSayisi: raf._count.variants },
  };
}

export type OkumaCevabi =
  | {
      durum: "YERLESTI";
      sku: string;
      urunAdi: string;
      /** Ürünün ÖNCEKİ rafının kodu — hiç konumu yoksa `null`. */
      oncekiKod: string | null;
      /** Zaten bu raftaydı — yazma yine yapıldı, ekran bunu SÖYLER. */
      ayniRaf: boolean;
      /** Yazımdan SONRAKİ raf sayısı — ekran sayacı tazeler. */
      rafUrunSayisi: number;
    }
  | { durum: "RAF_DEGISTI"; raf: SeciliRaf }
  | { durum: "RAF_SECILMEDI" }
  | { durum: "PASIF_RAF"; kod: string }
  | { durum: "BULUNAMADI"; kod: string };

/**
 * OKUTULAN KODU İŞLE — ekranın tek girişi.
 *
 * ⚠ ARAMA KURALI ORTAK KAYNAKTAN (`kodKosulu`): barkod · Firma SKU · sistem
 * SKU · Kanal SKU. Buraya ayrı bir liste yazsaydık kural değiştiği gün bu
 * ekran sessizce eski kalırdı.
 */
export async function koduIsle(
  kod: string,
  seciliRafId: string | null,
): Promise<OkumaCevabi> {
  const { kullaniciId } = await yetkiIste("stok.duzelt");

  const temiz = kod.trim();
  if (!temiz) return { durum: "BULUNAMADI", kod: temiz };

  const varyant = await prisma.productVariant.findFirst({
    where: { isActive: true, OR: kodKosulu(temiz) },
    select: {
      id: true,
      sku: true,
      name: true,
      locationId: true,
      location: { select: { code: true } },
      product: { select: { name: true } },
    },
  });

  /**
   * ⚠ RAF YALNIZ ÜRÜN BULUNAMAYINCA SORULUR — sıranın gerekçesi
   * `lib/depo/yerlestirme.ts` başlığında ÖLÇÜLDÜ (çakışma 0/41).
   */
  const raf = varyant
    ? null
    : await prisma.location.findFirst({
        where: { code: temiz },
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
          _count: { select: { variants: { where: { isActive: true } } } },
        },
      });

  /** ⭐ KARAR SAF GÖVDEDEN — bu dosya kural yazmıyor, uyguluyor. */
  const karar = yerlestirmeKarari({
    varyantVar: varyant !== null,
    varyantKonumId: varyant?.locationId ?? null,
    rafVar: raf !== null,
    seciliRafId,
  });

  if (karar.tur === "BULUNAMADI") return { durum: "BULUNAMADI", kod: temiz };
  if (karar.tur === "RAF_SECILMEDI") return { durum: "RAF_SECILMEDI" };

  if (karar.tur === "RAF_DEGISTIR") {
    /** ⛔ `raf` burada zorunlu olarak dolu — karar onu görmeden bu dala girmez. */
    if (!raf) return { durum: "BULUNAMADI", kod: temiz };
    if (!raf.isActive) return { durum: "PASIF_RAF", kod: raf.code };
    return {
      durum: "RAF_DEGISTI",
      raf: { id: raf.id, kod: raf.code, ad: raf.name, urunSayisi: raf._count.variants },
    };
  }

  /* ═══ YAZMA ═══════════════════════════════════════════════════════════ */
  if (!varyant || seciliRafId === null) return { durum: "BULUNAMADI", kod: temiz };

  /**
   * ⛔ HEDEF RAF HER YAZIMDA DOĞRULANIR. İstemciden gelen kimliğe güvenilmez:
   * ekran açıkken raf pasife alınmış olabilir ve ürün kayıp rafa yazılırdı.
   */
  const hedef = await prisma.location.findUnique({
    where: { id: seciliRafId },
    select: { id: true, code: true, name: true, isActive: true },
  });
  if (!hedef) return { durum: "RAF_SECILMEDI" };
  if (!hedef.isActive) return { durum: "PASIF_RAF", kod: hedef.code };

  await prisma.productVariant.update({
    where: { id: varyant.id },
    data: { locationId: hedef.id },
  });

  /**
   * ⭐ İZ — ESKİ **VE** YENİ BİRLİKTE (kullanıcı şartı).
   *
   * ⚠ KOD DA YAZILIR, YALNIZ KİMLİK DEĞİL: raf ileride silinir ya da
   * yeniden kodlanırsa kimlik tek başına okunamaz hâle gelir ve iz
   * "bir yerden bir yere taşındı" demekten öteye gidemez.
   *
   * ⚠ VE AYNI RAFA YAZIM DA İZ BIRAKIR: "operatör bu ürünü bu rafta
   * DOĞRULADI" bilgisi, hiç okutulmamış olmaktan farklıdır.
   */
  await prisma.auditLog.create({
    data: {
      action: YERLESTIRME_EYLEMI,
      targetType: "ProductVariant",
      targetId: varyant.id,
      userId: kullaniciId,
      detail: JSON.stringify({
        sku: varyant.sku,
        okutulanKod: temiz,
        oncekiKonumId: varyant.locationId,
        oncekiKod: varyant.location?.code ?? null,
        yeniKonumId: hedef.id,
        yeniKod: hedef.code,
        ayniRaf: karar.ayniRaf,
      }),
    },
  });

  const sayi = await prisma.productVariant.count({
    where: { isActive: true, locationId: hedef.id },
  });

  /** ⚠ Raf okuma ekranı ve depo tutanağı bu yazımdan etkilenir. */
  revalidatePath("/okut");
  revalidatePath("/ayarlar/depo");

  return {
    durum: "YERLESTI",
    sku: varyant.sku,
    urunAdi: varyant.name
      ? `${varyant.product.name} — ${varyant.name}`
      : varyant.product.name,
    oncekiKod: varyant.location?.code ?? null,
    ayniRaf: karar.ayniRaf,
    rafUrunSayisi: sayi,
  };
}
