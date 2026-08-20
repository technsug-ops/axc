import type { PencereTuru } from "@/lib/donem";

/**
 * ============================================================================
 *  PENCERE ETİKETLERİ — KOD → SÖZLÜK ANAHTARI
 * ----------------------------------------------------------------------------
 *  `donem.ts` SAF kalır: hesap yapar, metin bilmez. Metin bu haritadan
 *  `Pencere` sözlük alanına gider. Yeni bir pencere türü eklendiğinde
 *  TypeScript burayı da doldurmaya zorlar (Record tam olmalı) — etiketsiz
 *  pencere eklenip ekranda ham kod ("SON_15_GUN") görünmesi imkânsızdır.
 * ============================================================================
 */
export const PENCERE_ANAHTARI: Record<PencereTuru, string> = {
  BUGUN: "bugun",
  DUN: "dun",
  BU_HAFTA: "buHafta",
  SON_15_GUN: "son15Gun",
  SON_30_GUN: "son30Gun",
  BU_AY: "buAy",
  SON_3_AY: "son3Ay",
  SON_6_AY: "son6Ay",
  SON_1_YIL: "son1Yil",
  OZEL: "ozel",
};
