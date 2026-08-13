import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  ALIM ARAMASI — AYRAÇ DUYARSIZ
 * ----------------------------------------------------------------------------
 *  13.08.2026'DA KULLANICI YAKALADI: arama kutusunda "Sipariş numarasına göre
 *  ara" yazıyordu ama sorgu YALNIZCA bizim kendi kodumuzda (ALM-...) arıyordu.
 *  Tedarikçinin sipariş numarası hiç aranmıyordu — kayıt duruyor, arama
 *  görmüyor. En kötü hata türü: sistem "0 kayıt" diyerek yanlış cevabı
 *  KENDİNDEN EMİN veriyor.
 *
 *  İKİNCİ TUZAK — AYRAÇLAR. Canlıda ölçüldü: sipariş numarası dolu 22 alımın
 *  19'u ayraçlı yazılmış.
 *      Hepsiburada : "431 231 579 6"
 *      Amazon      : "403-6307755-6725139"
 *  Kullanıcı numarayı pazaryerinden boşluksuz kopyalayınca ("4312315796") düz
 *  `contains` tutmaz. Bu yüzden karşılaştırma İKİ TARAFTA da sadeleştirilir:
 *  boşluk, tire, alt çizgi ve nokta yok sayılır.
 *
 *  Sadeleştirilmiş karşılaştırma indeks kullanamaz (kolonun üstünde REPLACE
 *  var). Bu yüzden ÖNCE düz `contains` koşulları çalışır — onlar indeksli ve
 *  vakaların çoğunu karşılar; sadeleştirilmiş tarama yalnızca ek bir OR dalı
 *  olarak eklenir. Alım sayısı bugün 45; on binlere çıkarsa bu alan için
 *  normalize edilmiş bir kolon açılır (bugün gereksiz karmaşıklık olurdu).
 * ============================================================================
 */

/** Boşluk/tire/alt çizgi/nokta yok sayılır. `%` de düşer: LIKE joker olurdu. */
export function ayraclariAt(metin: string): string {
  return metin.replace(/[\s\-_.]/g, "").replace(/%/g, "");
}

/**
 * Alım listesi ve Excel dışa aktarma AYNI koşulu kullanır.
 * Ayrı yazsalardı ekranda görünen liste ile inen dosya sessizce ayrışırdı.
 */
export async function alimAramaKosulu(
  ham: string,
): Promise<Prisma.PurchaseWhereInput | undefined> {
  const arama = ham.trim();
  if (!arama) return undefined;

  const kosullar: Prisma.PurchaseWhereInput[] = [
    { code: { contains: arama } },
    { supplierOrderNo: { contains: arama } },
    // supplierName: eski kayıtların serbest metni; supplier.name: kayıtlı
    // tedarikçi. İkisi de aranır, yoksa göç öncesi alımlar bulunamaz.
    { supplierName: { contains: arama } },
    { supplier: { is: { name: { contains: arama } } } },
  ];

  const sade = ayraclariAt(arama);

  // 3 karakterin altında sadeleştirilmiş tarama yapılmaz: "12" gibi bir terim
  // neredeyse her kaydı getirir, kullanıcıya yardım etmez.
  if (sade.length >= 3) {
    const satirlar = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM Purchase
      WHERE REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(supplierOrderNo, ''), ' ', ''), '-', ''), '_', ''), '.', '')
              LIKE CONCAT('%', ${sade}, '%')
         OR REPLACE(REPLACE(REPLACE(REPLACE(code, ' ', ''), '-', ''), '_', ''), '.', '')
              LIKE CONCAT('%', ${sade}, '%')
    `;
    if (satirlar.length > 0) {
      kosullar.push({ id: { in: satirlar.map((s) => s.id) } });
    }
  }

  return { OR: kosullar };
}
