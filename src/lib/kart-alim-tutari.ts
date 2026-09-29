/**
 * ============================================================================
 *  BİR ALIMIN KARTA YAZILAN TUTARI — TEK GÖVDE (K308, 29.09.2026)
 * ----------------------------------------------------------------------------
 *  Kart borcunu kuran dört yer (kart borcu ekranı · panel özeti · nakit
 *  takvimi · geçmiş ekstre) alım tutarını AYRI AYRI hesaplıyordu: ikisi
 *  kargo ve vergi alanlarını EKLİYOR, ikisi eklemiyordu. Aynı alım iki
 *  ekranda iki farklı borç gösterebilirdi. _(Anayasa: "iki yerde iki ölçüt
 *  olmaz".)_
 *
 *  ⭐ KURAL — KULLANICI BEYANI (29.09.2026): «alımda sadece alım tutarı var;
 *  kargo, vergi hepsi o tutarın içinde, kargo bedava zaten.» Karta yazılan
 *  tutar = kalemlerin (birim maliyet × adet) toplamı. `Purchase.shippingAmount`
 *  ve `taxAmount` EKLENMEZ — eklenseydi fiyatın içindeki KDV/kargo İKİNCİ kez
 *  sayılırdı.
 *
 *  📏 ÖLÇÜLDÜ (29.09.2026, canlı): kartlı 625 alımın 625'inde iki alan da
 *  BOŞ ve hiçbir kod onları yazmıyor — yani bugün hiçbir rakam değişmez;
 *  karar ileride doğacak bir çift sayımı kapatır.
 *
 *  Kur çevrilmez: kartın para biriminde olmayan kalem toplama girmez ve
 *  `farkliVar` ile söylenir (sessiz düşme yok).
 * ============================================================================
 */
export function kartAlimTutari(
  kalemler: { quantity: number; unitCostAmount: { toString(): string }; unitCostCurrency: string }[],
  paraBirimi: string,
): { tutar: number; farkliVar: boolean } {
  let tutar = 0;
  let farkliVar = false;
  for (const k of kalemler) {
    if (k.unitCostCurrency !== paraBirimi) {
      farkliVar = true;
      continue;
    }
    tutar += Number(k.unitCostAmount.toString()) * k.quantity;
  }
  return { tutar, farkliVar };
}
