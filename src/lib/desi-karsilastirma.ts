/**
 * ============================================================================
 *  K197-⑤ — BİZİM DESİ, KANALIN ÖLÇTÜĞÜNDEN FARKLI MI
 * ----------------------------------------------------------------------------
 *  ⚠ BAĞIMSIZ, DIŞA BAĞIMLILIĞI OLMAYAN DOSYA — BİLEREK. Hem istemci
 *  bileşeni (`kart/[variantId]/kanal-desi-guncelle.tsx`, "use client") hem
 *  sunucu toplayıcısı (`urun-karti-verisi.ts`, prisma içe aktarır) bunu
 *  çağırıyor. Sunucu-tarafı bir dosyadan (prisma importlu) içe aktarılsaydı
 *  istemci paketine Prisma sızardı; bu yüzden mantık ayrı, saf bir dosyada.
 *
 *  KURUŞA DEĞİL — makul hassasiyete (santigram) karşılaştırılır.
 * ============================================================================
 */
export function desiFarkliMi(
  bizimDesi: number | null,
  kanalOrtalama: number,
): boolean {
  return (
    bizimDesi === null ||
    Math.round(bizimDesi * 100) !== Math.round(kanalOrtalama * 100)
  );
}
