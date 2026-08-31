/**
 * ============================================================================
 *  MAL KABUL SAYIMI — HANGİ TARİH SAYILIR (K112a, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ SORUN: panel "Alım" derken `purchasedAt` (SİPARİŞ günü) sayıyordu.
 *  Operasyon açısından yanlış eksen: sipariş verilen mal daha rafta değil,
 *  satışa da çıkamaz. Kullanıcının sorduğu soru _"bugün depoya ne girdi"_.
 *
 *  ⚠ VE İKİ TARİH GERÇEKTEN AYRIŞIYOR — ÖLÇÜLDÜ (canlı, 31.08.2026):
 *      toplam alım                1973
 *        receivedAt = purchasedAt   27   %1,4
 *        receivedAt FARKLI        1931   %97,9   ← ortanca 3 gün, max 48
 *        receivedAt BOŞ             15   (ORDERED/DRAFT)
 *  Yani sütun neredeyse HER kaydı yanlış güne yazıyordu.
 *
 *  ── ⚠ BOŞ `receivedAt` HİÇBİR GÜNE DÜŞMEZ ──────────────────────────────
 *  Onları bugüne ya da sipariş gününe yazmak, olmamış bir kabulü olmuş
 *  göstermek olurdu. Sayımın dışında kalırlar — bu bir kayıp değil, DOĞRU
 *  cevaptır.
 *
 *  ⚠ VE KİMLER OLDUĞU ÖLÇÜLDÜ, TAHMİN EDİLMEDİ (31.08.2026):
 *      receivedAt boş  15  →  ORDERED 2  ·  CANCELLED 13
 *  Yani 15'in 13'ü zaten İPTAL; "bekleyen mal" sanılmamalı. Gerçekten
 *  yolda olan yalnız 2 sipariş var. _(Brief'te "ORDERED/DRAFT" yazıyordu;
 *  ölçüm DRAFT olmadığını ve çoğunluğun iptal olduğunu gösterdi — sayı
 *  doğruydu, bileşimi değil.)_
 *
 *  ── ⛔ KART TAKVİMİ BU KURALIN DIŞINDADIR ───────────────────────────────
 *  `panel/takvim-verisi.ts` alımları `purchasedAt` ile kovalıyor ve ÖYLE
 *  KALMALI: kredi kartı borcu SİPARİŞ gününde doğar, banka ekstresini ona
 *  göre keser. Mal bir ay sonra gelse de taksit çoktan başlamıştır.
 *  Bu kuralı oraya uygulamak, doğru çalışan bir takvimi bozardı.
 *  _(Anayasa: "ilke, kendi kapsamının dışına uygulanırsa hatayı korur".)_
 *
 *  ── ⚠ KISMİ KABUL: BUGÜN ÇÖZÜLMÜYOR, BEYAN EDİLİYOR ────────────────────
 *  `receivedAt` alım BAŞINA tek alandır; `PurchaseItem`de kalem bazlı kabul
 *  tarihi YOKTUR (şema okundu). Yani parçalı gelen bir sipariş, tek bir
 *  "kabul günü"ne yazılır ve ilk parçanın geldiği gün görünmez.
 *  ⭐ BUGÜN ÖLÇÜLDÜ: `PARTIALLY_RECEIVED` durumunda **0 kayıt** var, yani
 *  sorun bugün hiçbir satırı etkilemiyor. Kalem bazlı tarih eklemek şema
 *  işidir ve ayrı bir karardır — tüketicisi doğmadan açılmaz.
 * ============================================================================
 */

/** Panelin dönem penceresi — yarı açık aralık. */
export type KabulPenceresi = { baslangic: Date; bitisHaric: Date };

/**
 * Bir alımın MAL KABUL gününe göre süzülmesi.
 *
 * ⭐ TEK GÖVDE — ve bu bir bekçiyle korunuyor. Panelde `Purchase` sorgulayan
 * her yer bu koşuldan geçer; çıplak `purchasedAt` yazmak YASAK (istisnalar
 * gerekçesiyle beyan edilir). Üçüncü bir kopya açılırsa bekçi kırmızı yanar.
 * _(Anayasa: "düzeltmenin çaresi dosya listesi değil, desen yasağıdır".)_
 *
 * ⚠ `receivedAt: { gte, lt }` KENDİLİĞİNDEN `null` KAYITLARI ELER — Prisma
 * karşılaştırma koşulu `NULL` satırları döndürmez. Yani "boş olan hiçbir
 * güne düşmez" kuralı ayrı bir satır gerektirmiyor; yine de burada YAZILI
 * olması gerekiyor, çünkü okuyan biri bunu varsaymamalı.
 */
export function kabulKosulu(pencere: KabulPenceresi) {
  return {
    receivedAt: { gte: pencere.baslangic, lt: pencere.bitisHaric },
  };
}

/**
 * Sayıma giren kaydın GÜN damgası — grafik kovası bunu kullanır.
 *
 * ⚠ `receivedAt` burada `null` OLAMAZ (koşul onu zaten elemiştir) ama tip
 * seviyesinde opsiyonel geliyor. Sessizce `purchasedAt`e düşmek EN KÖTÜ
 * çare olurdu: grafik yanlış güne nokta koyar ve kimse fark etmez.
 * Bunun yerine kayıt sayımdan DÜŞER ve düştüğü sayılır.
 */
export function kabulGunu(kayit: { receivedAt: Date | null }): Date | null {
  return kayit.receivedAt;
}
