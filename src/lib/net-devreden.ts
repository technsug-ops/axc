/**
 * ============================================================================
 *  DEVREDEN KDV — NET-2 ÖDENECEK KDV NEGATİFE DÜŞÜNCE KÂR SAYILMAZ (K170)
 * ----------------------------------------------------------------------------
 *  Halil kararı 05.09.2026 (Seçenek 1): bir iade, o dönemin ödenecek KDV'sini
 *  negatife (devreden KDV) çektiğinde, o negatif NET-2'ye KÂR olarak eklenmez
 *  — çünkü devreden KDV bu ay cebe girmez, sonraki döneme mahsup edilir.
 *
 *  ⛔ NİYE DOĞDU: iade NET-2 etkisi POZİTİF olabiliyor (`iade.ts`:
 *  net2Etkisi = net1Etkisi − ödenecekKdvDeğişimi; iade satış KDV'sini geri
 *  getirdiği için ödenecekKdvDeğişimi büyük negatif → net2 net1'in ÜSTÜNE
 *  çıkıyor). Büyük tutarlı bir iade panelde NET-2'yi NET-1'in üstüne çıkardı
 *  (NET-1 −160 zararda · NET-2 +670 kârda — İMKÂNSIZ, çünkü
 *  NET-2 = NET-1 − ödenecekKDV, ödenecekKDV ≥ 0 olmalı).
 *
 *  ⚠ KIRPMA GÖSTERİLEN KÜMEDE, SNAPSHOT'TA DEĞİL (şart 4). Ölçüldü
 *  05.09.2026: MUHASEBE AYI toplamında 28 dönemin 28'inde ödenecek KDV
 *  POZİTİF (devreden 0) — sorun yalnız ayın PARÇASI olan dar pencerede
 *  (tek satış+iade izole, telafi edecek satış yok). Bu yüzden kırpma her
 *  GÖSTERİLEN küme (kanal · hesap · dönem · seçili pencere) için ayrı
 *  yapılır: ayı seçince devreden 0'a mahsuplaşır, dar pencerede görünür.
 *  Snapshot'lar (Sale/Return.net2Amount) DOKUNULMAZ.
 *
 *  ⚠ ÖDENECEK KDV TÜRETİLİR: `Σ(net1 − net2)`. Ayrı alan saklanmaz —
 *  snapshot zaten taşıyor (şema değişikliği en pahalı çözümdür).
 *
 *  ⭐ MUHASEBE DAYANAĞI (Halil, 05.09.2026): _"Her ayın 15-20'si arasında
 *  geçen ayki satışlardan iade olanlarla ilgili GİDER PUSULASI düzenliyorum;
 *  o aya ait satıştan doğan KDV hesaplanırken iadeler DÜŞÜLEREK
 *  hesaplanıyor."_ Yani iadenin KDV avantajı gerçektir ve o dönemin SATIŞ
 *  KDV'siyle mahsuplaşır (pusula ile). O ay yeterince satış varsa devreden 0;
 *  yoksa fazlalık gerçekten sonraki döneme devreder (KDV beyanı "devreden
 *  KDV"). Bu gövde tam o mahsubu modellemektedir — kırpma bir "yaklaşıklık"
 *  değil, kullanıcının fiilen işlettiği sürecin karşılığıdır.
 * ============================================================================
 */

const kurus = (n: number) => Math.round(n * 100) / 100;

export type DonemNet = {
  /** Kırpılmış NET-2 — NET-1'i ASLA aşmaz (değişmez: net2 ≤ net1). */
  net2: number;
  /** Ödenecek KDV negatife düşen kısım — gelecek döneme mahsup. `0` ise yok. */
  devreden: number;
};

/**
 * Bir kümenin (dönem/kanal/hesap) kırpılmış NET-2'si ve devreden KDV'si.
 *
 * ödenecekKdv = net1 − net2 (türetilir). Negatifse (devreden):
 *   net2 → net1'e kırpılır (fazlalık kâra karışmaz)
 *   devreden = |fazlalık|  (kaybolmaz, ayrı döner)
 *
 * ⚠ TÜREYEN DEĞİL, ÇAĞRILAN: `kar:dogrula` / `panel:dogrula` bu gövdeyi
 * DEĞERLE sınar (desen değil). Tek yer — panel, rapor, kanal, hesap hepsi
 * buradan geçer (iki yerde iki ölçüt olmaz).
 */
export function donemNet2(net1Toplam: number, hamNet2Toplam: number): DonemNet {
  const net1 = kurus(net1Toplam);
  const ham = kurus(hamNet2Toplam);
  return {
    net2: Math.min(ham, net1),
    devreden: Math.max(0, kurus(ham - net1)),
  };
}
