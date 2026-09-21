"use server";

import { prisma } from "@/lib/prisma";
import { aramaKosulu } from "@/lib/varyant-arama-kurali";
import {
  kodlaVaryantCoz,
  type KodAdayi,
} from "@/lib/varyant-kod-cozumu";
import {
  VARYANT_SECIMI,
  varyantiOzetle,
  type VaryantSonucu,
} from "@/lib/varyant-ozet";
import { yetkiIste } from "@/lib/yetki";

/**
 * ============================================================================
 *  VARYANT ARAMA — ALIM VE SATIŞ FORMLARININ ORTAK KAYNAĞI
 * ----------------------------------------------------------------------------
 *  Hem alım hem satış formunda "ürünü barkodla okut veya adıyla ara" adımı
 *  var. Mantık tek yerde durur; iki formda ayrı ayrı yazılırsa biri
 *  düzeltilip diğeri unutulur.
 *
 *  İki ayrı davranış bilerek ayrıdır:
 *  - varyantAra()      : serbest metin, KISMİ eşleşme, insan yazar.
 *  - varyantKodlaBul() : okutulan kod, TAM eşleşme, makine okur.
 *    Okutmada kısmi eşleşme yanlış ürün eklerdi.
 * ============================================================================
 */

/** Serbest metin araması: ürün adı ve DÖRT kod rolü (bkz. varyant-arama-kurali). */
export async function varyantAra(sorgu: string): Promise<VaryantSonucu[]> {
  await yetkiIste("urun.gor");

  const q = sorgu.trim();
  if (q.length < 2) return [];

  const varyantlar = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      OR: aramaKosulu(q),
    },
    select: VARYANT_SECIMI,
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  return varyantlar.map(varyantiOzetle);
}

/**
 * Okutulan kodun TAM karşılığını bulur.
 * Barkod okuyucudan / kameradan gelen kod için kullanılır: kısmi eşleşme
 * istemeyiz, yanlış ürün eklemek kötü olur.
 */
export type KodBulmaSonucu =
  | { durum: "TEK"; varyant: VaryantSonucu }
  | { durum: "YOK" }
  | { durum: "COK"; adaylar: KodAdayi[]; tavandaMi: boolean };

export async function varyantKodlaBul(kod: string): Promise<KodBulmaSonucu> {
  await yetkiIste("urun.gor");

  /**
   * ⛔ ARTIK `findFirst` YOK — VE BU BİR CANLI ARIZANIN BEDELİ.
   * 21.09.2026: `HBCV00000R0H0K` iki aktif varyanta birden uyuyordu ve
   * `findFirst` sıralamasız olduğu için veritabanının o anki sırası
   * kazanıyordu. Stoğu SIFIR olan ikiz seçildi, sipariş onaylanamadı ve
   * ekrandaki `Stok yetersiz (0/1)` rakamı DOĞRU olduğu için kimse kodu
   * suçlamadı — arıza ürün kartında arandı.
   *
   * Çözüm kodu tekilleştirmek DEĞİL (veriyi temizlemek ayrı iştir), bu
   * ekranın **seçmeyi bırakmasıdır**: kaç karşılık olduğu sayılır ve
   * birden çoksa karar operatöre bırakılır.
   */
  const cozum = await kodlaVaryantCoz(kod);
  if (cozum.durum === "YOK") return { durum: "YOK" };
  if (cozum.durum === "COK") {
    return { durum: "COK", adaylar: cozum.adaylar, tavandaMi: cozum.tavandaMi };
  }

  /**
   * ⚠ TAM KAYIT AYRI SORGUYLA GELİR. Çözüm gövdesi yalnız KİMLİK okur;
   * her çağıranın kendi `select`i var ve onu ortak gövdeye taşımak beş
   * ekranın ihtiyacını tek bir seçime hapsederdi.
   */
  const varyant = await prisma.productVariant.findUnique({
    where: { id: cozum.id },
    select: VARYANT_SECIMI,
  });

  /** Kayıt iki sorgu arasında pasife alınmış olabilir — sessizce `TEK` denmez. */
  return varyant ? { durum: "TEK", varyant: varyantiOzetle(varyant) } : { durum: "YOK" };
}
