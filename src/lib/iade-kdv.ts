/**
 * ============================================================================
 *  İADE KDV ETKİSİ — TÜRETİLİR, SAKLANMAZ (K172, 06.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı spec'i (iade muhasebesi): "İade KDV'si ayrı gösterilmeli."
 *  İade motoru bunu `odenecekKdvDegisimi` olarak hesaplıyor ve formülü:
 *      net2Etkisi = net1Etkisi − odenecekKdvDegisimi
 *  Yani `odenecekKdvDegisimi = net1Etkisi − net2Etkisi` — iki MEVCUT snapshot
 *  alanının (Return.net1Amount, net2Amount) FARKI. Ayrı sütun açmak gereksizdi
 *  (anayasa: "şema en pahalı çözümdür — türetilebilen için sütun açılmaz";
 *  gösterimde tüm motoru DEĞİL, tek çıkarmayı tekrarlıyoruz → iki gövde yok).
 *
 *  İŞARET: net-1 KDV'yi düşmemiş, net-2 düşmüş bakıştır.
 *    · POZİTİF etki → iade ödenecek KDV'yi ARTIRDI (nadir; ör. tazminat
 *      faturası KDV doğurur)
 *    · NEGATİF etki → iade satış KDV'sini geri getirdi, ödenecek KDV AZALDI
 *      (olağan iade). Ekranda "iade KDV'si" bu tutardır.
 * ============================================================================
 */

/**
 * İadenin ödenecek KDV'ye net etkisi = net1 − net2. Biri `null` ise (kâr
 * hesaplanamamış iade) `null` — uydurma sıfır değil.
 */
export function iadeKdvEtkisi(
  net1: number | null,
  net2: number | null,
): number | null {
  if (net1 === null || net2 === null) return null;
  return Math.round((net1 - net2) * 100) / 100;
}
