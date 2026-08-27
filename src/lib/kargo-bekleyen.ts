/**
 * ============================================================================
 *  "KARGO BEKLİYOR" — TEK GÖVDE (K60, 27.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ `shippedAt = null` İKİ AYRI ŞEY ANLATIYOR:
 *
 *    elle girilmiş satış   → henüz kargolanmadı        → GERÇEK İŞ
 *    içe aktarılmış satış  → sistem HİÇ BİLMİYOR       → iş DEĞİL
 *
 *  Panel kuralı (_"bekleyen zamansızdır"_) doğruydu ve KAPSAMI şuydu: her
 *  satış kendi günü elle giriliyordu. 26–27.08.2026'da 14 aylık geçmiş defter
 *  içe aktarıldı; kod değişmedi, **ANLAM değişti** ve görev kutusu 5192
 *  kapatılamaz madde gösterdi.
 *
 *  ═══ NİYE AYRI DOSYA — VE BU DERS PAHALIYA ALINDI ═══
 *
 *  Koşul ilk düzeltmede YALNIZ `panel.ts`te değiştirildi. Oysa aynı soruyu
 *  ALTI ayrı yer soruyordu ve beşi eski kuralla kalmıştı:
 *
 *    · görev kutusu sayısı        (`panel/gorev-verisi.ts`)
 *    · "paketlendi" ilerlemesi    (aynı dosya, payda)
 *    · `/satislar?kargo=bekleyen` (`liste-suzgeci.ts`)
 *    · paketleme ekranı           (`paketle/actions.ts`)
 *    · barkod okuma akışı         (`okut/actions.ts` — iki sorgu)
 *
 *  Ekran düzeltilmiş görünüyordu; kutu hâlâ 5599 diyordu.
 *  _(Anayasa: "düzeltme yolu, TÜM OKUYUCULARA ulaştığı ölçülmeden 'var'
 *  sayılmaz" — bu vaka o kuralın kendisi.)_
 *
 *  ⚠ `iptalTarihi` BİLEREK BURADA DEĞİL: iptal edilmiş satışın gösterilip
 *  gösterilmeyeceği ekrana göre değişir (iptal ekranı onu görmek ZORUNDA).
 *  Bu gövde tek bir soruyu cevaplar: _"bu sipariş kargo bekliyor mu?"_
 * ============================================================================
 */

/**
 * Prisma `where` parçası. Kullanımı:
 *
 *     where: { ...KARGO_BEKLEYEN, iptalTarihi: null }
 *     where: { sale: { ...KARGO_BEKLEYEN, iptalTarihi: null } }
 *
 * ⛔ ELLE `shippedAt: null` YAZILMAZ. `kargo-bekleyen:dogrula` bekçisi bunu
 * kaynakta arar ve beyan edilmemiş her kullanımı kırmızı yakar — liste
 * tutmakla değil, DESEN YASAĞIYLA.
 */
export const KARGO_BEKLEYEN = {
  /** Paket henüz çıkmadı (şemadaki tanım). */
  shippedAt: null,
  /**
   * ⛔ İÇE AKTARILMIŞ SİPARİŞ KARGO BEKLEMEZ — sistem onun ne zaman
   * çıktığını bilmiyor, "çıkmadı" DEMİYOR. Bilinmezliği iş sanmak, hiçbir
   * eylemle kapanmayan bir görev üretir (K49).
   */
  importKaynak: null,
} as const;

/**
 * Aynı sorunun SAF hâli — elimizde kayıt varken, sorgu kurmadan.
 * ⚠ `panel.ts → kargoHali` üç hâl döndürür (GOREV · CIKMIS · BILINMIYOR);
 * bu, onun yalnız birinci hâlini soran kısayolu.
 */
export function kargoBekliyorMu(satis: {
  shippedAt: Date | null;
  importKaynak: string | null;
}): boolean {
  return satis.shippedAt === null && satis.importKaynak === null;
}
