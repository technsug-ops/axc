"use server";

import { revalidatePath } from "next/cache";

import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { prisma } from "@/lib/prisma";
import { oturumdakiKullanici } from "@/lib/oturum";
import { acikOturumVarMi, sayimKodu } from "@/lib/sayim/oturum";
import { kodKosulu } from "@/lib/varyant-arama-kurali";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  FİZİKSEL SAYIM — SUNUCU EYLEMLERİ (K57)
 * ----------------------------------------------------------------------------
 *  ⛔ HER OKUMA ANINDA YAZILIR. Oturum sonunda toplu yazım YOK.
 *
 *  Gerekçe ölçüldü: sayım TAM GÜN sürüyor (202 varyant · 768 adet, ve
 *  varyantların %65'i tek "DEPO" konumunda — okutmak hızlı, BULMAK yavaş).
 *  Tam günlük işte ara kaçınılmaz: telefon uykuya geçer, uygulama kapanır,
 *  bağlantı kesilir. Toplu yazım seçilseydi bunlardan biri günün tamamını
 *  siler ve kimse bunu geri getiremezdi.
 *
 *  ⚠ İZİN AYRIMI BİLİNÇLİ:
 *    · sayım açmak / okutmak / kapatmak → `stok.gor`   (depo işi)
 *    · DÜZELTME YAZMAK                  → `stok.duzelt` (deftere dokunur)
 *  Yeni izin AÇILMADI; ikisi de var ve ayrımı birebir karşılıyor.
 * ============================================================================
 */

export type SayimAcilisi = {
  hata?: string;
  sayimId?: string;
  kod?: string;
  /** Sayım gününde stoğu oynatan hareket var mı — açılışta uyarı için. */
  bugunHareketVar?: boolean;
  kapsam?: number;
};

/**
 * SAYIM AÇ — kapsamdaki her varyant için satır MADDİLEŞTİRİLİR.
 *
 * ⛔ SATIRLAR BAŞTAN AÇILIR ve niye: "sayılmadı" bir YOKLUK değil, ekranda
 * GÖRÜNEN bir satır olsun diye. Satırlar okutuldukça doğsaydı, sayılmayan
 * varyant hiçbir yerde görünmezdi — ve sayımın en kritik ayrımı
 * (`sayılmadı` ≠ `rafta yok`) daha başlamadan kaybolurdu.
 */
export async function sayimAc(): Promise<SayimAcilisi> {
  await yetkiIste("stok.gor");

  const acikOlanlar = await prisma.stokSayimi.findMany({
    select: { id: true, kapanisAt: true, yazimAt: true, iptalAt: true },
  });
  /**
   * ⛔ TEK AÇIK OTURUM — ve kural SAF GÖVDEDEN geliyor (`acikOturumVarMi`).
   * Burada elle `kapanisAt === null` yazsaydık, oturum hâlinin tanımı iki
   * yerde yaşar ve bir gün ayrışırdı.
   */
  if (acikOturumVarMi(acikOlanlar)) {
    return { hata: "ZATEN_ACIK" };
  }

  const bugun = gunDegeri(isTakvimGunu(new Date()));
  const kod = sayimKodu(bugun);

  /** Kapsam: stoğu > 0 olan varyantlar (ilk sayım kararı — TÜM STOK). */
  const stoklar = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    _sum: { quantityDelta: true },
  });
  const kapsam = stoklar
    .filter((s) => (s._sum.quantityDelta ?? 0) > 0)
    .map((s) => s.variantId);

  /**
   * ⚠ SAYIM GÜNÜ HAREKETİ — açılışta söylenir, KAPANIŞTA DEĞİL.
   * Kapanışta söylemek geç olur: sayım çoktan yapılmıştır.
   */
  const bugunHareket = await prisma.stockMovement.count({
    where: { occurredAt: bugun },
  });

  const kullanici = await oturumdakiKullanici();
  const sayim = await prisma.stokSayimi.create({
    data: {
      kod,
      sayimGunu: bugun,
      kapsamTuru: "TUM_STOK",
      userId: kullanici?.id ?? null,
      satirlar: {
        create: kapsam.map((variantId) => ({ variantId })),
      },
    },
    select: { id: true },
  });

  revalidatePath("/okut");
  return {
    sayimId: sayim.id,
    kod,
    bugunHareketVar: bugunHareket > 0,
    kapsam: kapsam.length,
  };
}

export type SayimOkumasi = {
  hata?: string;
  variantId?: string;
  sku?: string;
  urunAdi?: string;
  /** Bu varyantın sayımdaki GÜNCEL adedi (yazıldıktan sonraki hâl). */
  adet?: number;
  /** Kapsam dışında bulundu — sistem stokta olmadığını sanıyordu. */
  kapsamDisi?: boolean;
};

/**
 * OKUNAN KODU SAYIMA YAZ — anında, tek satır.
 *
 * @param delta `+1` okuma · `-1`/`+1` ekrandaki düzeltme düğmeleri.
 *
 * ⛔ KAPSAM DIŞI KOD REDDEDİLMEZ. Sistemin boş sandığı yerde mal bulunması
 * bulgunun KENDİSİDİR; satır `kapsamdaydi: false` ile doğar ve doğrudan
 * FAZLA olur.
 */
export async function sayimaOkut(
  sayimId: string,
  kod: string,
  delta = 1,
): Promise<SayimOkumasi> {
  await yetkiIste("stok.gor");

  const temiz = kod.trim();
  if (!temiz) return { hata: "BOS_KOD" };

  const sayim = await prisma.stokSayimi.findUnique({
    where: { id: sayimId },
    select: { kapanisAt: true, yazimAt: true, iptalAt: true },
  });
  if (!sayim) return { hata: "SAYIM_YOK" };
  /** ⛔ Kapanmış oturuma okuma girmez — hüküm verilmiş bir sayım değişmez. */
  if (!acikOturumVarMi([sayim])) return { hata: "SAYIM_KAPALI" };

  /** Kod → varyant: ortak arama kuralı (barkod · Firma SKU · SKU · Kanal SKU). */
  const varyant = await prisma.productVariant.findFirst({
    where: { OR: kodKosulu(temiz) },
    select: { id: true, sku: true, product: { select: { name: true } } },
  });
  if (!varyant) return { hata: "BULUNAMADI" };

  const mevcut = await prisma.stokSayimSatiri.findUnique({
    where: { sayimId_variantId: { sayimId, variantId: varyant.id } },
    select: { id: true, sayilanAdet: true, kapsamdaydi: true },
  });

  if (!mevcut) {
    /** Kapsam dışı bulundu — satır ŞİMDİ doğuyor, `kapsamdaydi: false`. */
    const yeni = await prisma.stokSayimSatiri.create({
      data: {
        sayimId,
        variantId: varyant.id,
        kapsamdaydi: false,
        sayilanAdet: Math.max(0, delta),
      },
      select: { sayilanAdet: true },
    });
    revalidatePath("/okut");
    return {
      variantId: varyant.id,
      sku: varyant.sku,
      urunAdi: varyant.product.name,
      adet: yeni.sayilanAdet ?? 0,
      kapsamDisi: true,
    };
  }

  /**
   * ⚠ `null` (sayılmadı) + okuma → adet `delta`. `?? 0` ile başlıyoruz çünkü
   * ilk okuma o satırı "sayıldı" hâline geçiriyor.
   * ⛔ SIFIRIN ALTINA İNMEZ ama SIFIR SİLİNMEZ: `0` "sayıldı, rafta yok"
   * demektir ve sayımın en kritik değeridir.
   */
  const sonraki = Math.max(0, (mevcut.sayilanAdet ?? 0) + delta);
  await prisma.stokSayimSatiri.update({
    where: { id: mevcut.id },
    data: { sayilanAdet: sonraki },
  });

  revalidatePath("/okut");
  return {
    variantId: varyant.id,
    sku: varyant.sku,
    urunAdi: varyant.product.name,
    adet: sonraki,
    kapsamDisi: !mevcut.kapsamdaydi,
  };
}

/**
 * SAYIMI KAPAT — okuma biter, hüküm aşamasına geçilir.
 * ⚠ Düzeltme YAZILMAZ: fark kapanıştan sonra da CANLI kalır ve kapanış
 * ekranında her açılışta yeniden hesaplanır.
 */
export async function sayimiKapat(sayimId: string): Promise<{ hata?: string }> {
  await yetkiIste("stok.gor");
  const sayim = await prisma.stokSayimi.findUnique({
    where: { id: sayimId },
    select: { kapanisAt: true, yazimAt: true, iptalAt: true },
  });
  if (!sayim) return { hata: "SAYIM_YOK" };
  if (!acikOturumVarMi([sayim])) return { hata: "SAYIM_KAPALI" };

  await prisma.stokSayimi.update({
    where: { id: sayimId },
    data: { kapanisAt: new Date() },
  });
  revalidatePath("/okut");
  return {};
}

/**
 * OKUTULMAYAN SATIRLARI CEVAPLA — kapanışın zorunlu adımı.
 *
 * ⛔ VARSAYILAN YOK. Kullanıcı her satır için AÇIKÇA seçer:
 *   · `sifirla`  → `sayilanAdet = 0`  ("rafta yok" — gerçek eksik)
 *   · `dokunma`  → `sayilanAdet = null` kalır ("sayılmadı" — hüküm yok)
 *
 * Bu ikisi karıştırılırsa **sayılmamış mal stoktan silinir.**
 */
export async function okutulmayanlariCevapla(
  sayimId: string,
  variantIdler: string[],
  karar: "sifirla" | "dokunma",
): Promise<{ hata?: string; etkilenen?: number }> {
  await yetkiIste("stok.gor");
  if (karar === "dokunma") return { etkilenen: 0 };

  const sonuc = await prisma.stokSayimSatiri.updateMany({
    where: {
      sayimId,
      variantId: { in: variantIdler },
      /** ⚠ Yalnız HÂLÂ sayılmamış satırlar — okutulmuş bir satır ezilmez. */
      sayilanAdet: null,
    },
    data: { sayilanAdet: 0 },
  });
  revalidatePath("/okut");
  return { etkilenen: sonuc.count };
}
