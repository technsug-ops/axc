/**
 * ============================================================================
 *  TEDARİKÇİ ADI — TEK ÇÖZÜM KURALI
 * ----------------------------------------------------------------------------
 *  ⚠ NEDEN YAZILDI (17.08.2026, canlı hata)
 *
 *  `Purchase` tedarikçiyi İKİ ALANDA taşır:
 *    · `supplierId` → `supplier` ilişkisi (10.08.2026'da kayda bağlandı)
 *    · `supplierName` serbest metin (o tarihten ÖNCEKİ kayıtlar ve içe
 *      aktarma izi — bilinçli olarak silinmedi)
 *
 *  Alım detay ekranı ikisini de okuyordu; ürün kârlılık kartı yalnız
 *  ilişkiyi okudu. Sonuç: ALM-TR-260814-01 alımında tedarikçi "Trendyol"
 *  alım ekranında GÖRÜNÜYOR, kartta GÖRÜNMÜYORDU. Aynı veri, iki ekran,
 *  iki farklı cevap — kartın güvenini bitiren şey tam olarak budur.
 *
 *  Kural artık burada. Yeni bir ekran tedarikçi göstereceği zaman bu
 *  fonksiyonu çağırır; iki alanın varlığını bilmesi gerekmez.
 *
 *  ── SIRA ÖNEMLİ: İLİŞKİ ÖNCE, SERBEST METİN YEDEK ───────────────────────
 *  İlişki kayıtlı tedarikçiyi gösterir ve adı düzeltilebilir; serbest metin
 *  yazıldığı gün donmuştur. İkisi çelişirse güncel olan kazanır.
 * ============================================================================
 */

export type TedarikciTasiyan = {
  supplier: { name: string } | null;
  supplierName: string | null;
};

/**
 * Alımın tedarikçi adı. Hiçbiri yoksa `null` — çağıran taraf "kayıtsız"
 * yazar; boş string döndürmek sessiz boşluk üretirdi.
 */
export function tedarikciAdi(alim: TedarikciTasiyan): string | null {
  const ad = alim.supplier?.name ?? alim.supplierName ?? null;
  // Yalnız boşluktan oluşan eski kayıtlar "dolu" sayılmasın.
  return ad === null || ad.trim() === "" ? null : ad;
}
