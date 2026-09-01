"use server";

import { revalidatePath } from "next/cache";

import { TOPLU_TASIMA_EYLEMI, izListesi, tasimaKarari } from "@/lib/depo/tasima";
import { YERLESTIRME_EYLEMI, yerlestirmeKarari } from "@/lib/depo/yerlestirme";
import { prisma } from "@/lib/prisma";
import { kodKosulu } from "@/lib/varyant-arama-kurali";
import { yetkiIste } from "@/lib/yetki";
import { izYaz } from "@/lib/iz";

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
  /** ⛔ İZ ORTAK GÖVDEDEN — `userId` kendiliğinden damgalanır (K90). */
  await izYaz({
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

/**
 * ============================================================================
 *  TOPLU RAF TAŞIMA (K50 ⑥)
 * ----------------------------------------------------------------------------
 *  Kaynak rafı okut → hedef rafı okut → "N ürün taşınacak" → onayla.
 *
 *  ⛔ YİNE STOK DEFTERİNE DOKUNULMAZ — yazılan tek alan `locationId`.
 *  SAYIM KORUMASI YOK: hiçbir stok hareketi yazılmıyor; konum sayımın
 *  ölçtüğü büyüklük değil.
 *
 *  ⚠ GERİ ALMA LİSTEYE BAĞLI DEĞİL: taşımayı geri almak, aynı ekranda
 *  hedefi kaynak yapıp yeniden taşımaktır. 28.08 vakasında geri alma yolu
 *  `AuditLog.detail`e konan bir listeye bağlanmış ve liste tavanda
 *  kırpıldığı için YAZILDIĞI ANDA BOZULMUŞTU.
 * ============================================================================
 */

export type RafUrunu = { variantId: string; sku: string; ad: string; adet: number };

/** Bir rafın aktif ürünleri — seçim listesi buradan çizilir. HİÇBİR ŞEY YAZMAZ. */
export async function raftakiUrunler(rafId: string): Promise<RafUrunu[]> {
  await yetkiIste("stok.duzelt");
  const varyantlar = await prisma.productVariant.findMany({
    where: { isActive: true, locationId: rafId },
    select: {
      id: true,
      sku: true,
      name: true,
      product: { select: { name: true } },
    },
    orderBy: { sku: "asc" },
  });
  return varyantlar.map((v) => ({
    variantId: v.id,
    sku: v.sku,
    ad: v.name ? `${v.product.name} — ${v.name}` : v.product.name,
    /** ⚠ Adet bu ekranda GEREKMİYOR: taşınan şey KONUM, adet değil. */
    adet: 0,
  }));
}

export type TasimaSonucu =
  | { durum: "TASINDI"; adet: number; kismi: boolean; kaynakKod: string; hedefKod: string }
  | { durum: "KAYNAK_YOK" }
  | { durum: "HEDEF_YOK" }
  | { durum: "AYNI_RAF" }
  | { durum: "KAYNAK_BOS" }
  | { durum: "SECIM_YOK" }
  | { durum: "PASIF_RAF"; kod: string };

/**
 * TAŞIMAYI UYGULA — kullanıcı "N ürün taşınacak" ONAYINDAN sonra.
 *
 * ⛔ KÜME SUNUCUDA YENİDEN TÜRETİLİR. İstemciden gelen kimlik listesine
 * körlemesine güvenilmez: ekran açıkken bir ürün başka rafa gitmiş olabilir
 * ve o zaman onu KAYNAKTA DEĞİLKEN taşımış olurduk.
 */
export async function tasimayiUygula(
  kaynakId: string | null,
  hedefId: string | null,
  seciliIdler: string[],
): Promise<TasimaSonucu> {
  const { kullaniciId } = await yetkiIste("stok.duzelt");

  if (kaynakId === null) return { durum: "KAYNAK_YOK" };
  if (hedefId === null) return { durum: "HEDEF_YOK" };

  const [kaynak, hedef] = await Promise.all([
    prisma.location.findUnique({
      where: { id: kaynakId },
      select: { id: true, code: true, isActive: true },
    }),
    prisma.location.findUnique({
      where: { id: hedefId },
      select: { id: true, code: true, isActive: true },
    }),
  ]);
  if (!kaynak) return { durum: "KAYNAK_YOK" };
  if (!hedef) return { durum: "HEDEF_YOK" };
  /** ⛔ Pasif rafa taşımak ürünü kayıp eder — aktif listelerde görünmez. */
  if (!hedef.isActive) return { durum: "PASIF_RAF", kod: hedef.code };

  /** ⭐ KAYNAK KÜMESİ SUNUCUDAN — istemcinin listesi yalnız SEÇİM. */
  const kaynaktakiler = await prisma.productVariant.findMany({
    where: { isActive: true, locationId: kaynak.id },
    select: { id: true, sku: true },
  });

  const karar = tasimaKarari({
    kaynakId: kaynak.id,
    hedefId: hedef.id,
    kaynaktakiler: kaynaktakiler.map((v) => v.id),
    secili: seciliIdler,
  });
  if (karar.tur !== "HAZIR") return { durum: karar.tur };

  const kaynakKumesi = new Set(kaynaktakiler.map((v) => v.id));
  const tasinacak = [...new Set(seciliIdler)].filter((id) => kaynakKumesi.has(id));
  const skuEslemesi = new Map(kaynaktakiler.map((v) => [v.id, v.sku]));

  /**
   * ⚠ TEK İŞLEM — yazma ile iz AYRILAMAZ. İz yazılmadan yazma yapılırsa,
   * araya giren bir hata "ne olduğu bilinmeyen" bir taşıma bırakır.
   */
  const yazilan = await prisma.$transaction(async (tx) => {
    const guncelleme = await tx.productVariant.updateMany({
      where: { id: { in: tasinacak }, isActive: true, locationId: kaynak.id },
      data: { locationId: hedef.id },
    });

    const liste = izListesi(
      tasinacak.map((id) => skuEslemesi.get(id) ?? id),
    );

    /**
     * ⭐ TEK İZ (kullanıcı şartı) — ve ÖNCEKİ DEĞER İÇİNDE.
     * Taşınan her satırın önceki konumu AYNI: `kaynakKod`. Tekdüze olduğu
     * için satır satır yazmaya gerek yok; özet o bilgiyi tam taşıyor.
     */
    /** ⛔ İZ ORTAK GÖVDEDEN — `userId` kendiliğinden damgalanır (K90). */
    await izYaz({
      action: TOPLU_TASIMA_EYLEMI,
      targetType: "Location",
      targetId: kaynak.id,
      userId: kullaniciId,
      detail: JSON.stringify({
        kaynakKod: kaynak.code,
        hedefKod: hedef.code,
        istenenAdet: tasinacak.length,
        yazilanAdet: guncelleme.count,
        kismi: karar.kismi,
        raftakiToplam: kaynaktakiler.length,
        skular: liste.skular,
        /** ⚠ KIRPILDIYSA SÖYLENİR — eksik liste, tam liste sanılmasın. */
        skuKirpildi: liste.kirpildi,
        skuToplami: liste.toplam,
      }),
    },
      tx);
    return guncelleme.count;
  });

  revalidatePath("/okut");
  revalidatePath("/ayarlar/depo");
  revalidatePath("/yerlestir");

  return {
    durum: "TASINDI",
    adet: yazilan,
    kismi: karar.kismi,
    kaynakKod: kaynak.code,
    hedefKod: hedef.code,
  };
}
