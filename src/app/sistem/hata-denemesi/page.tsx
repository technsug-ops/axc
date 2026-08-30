import { sayfaTamYetki } from "@/lib/yetki";

/**
 * ============================================================================
 *  HATA EKRANI DENEME ROTASI (K98) — ÜRETİM ÖZELLİĞİ DEĞİLDİR
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR: hata ekranı yazıldı, bekçisi 60 ölçütle yeşil, mutasyonu
 *  17/17 — ve HİÇBİRİ o ekranın gerçek cihazda çizildiğini kanıtlamıyor.
 *  30.08.2026'da tam bu oldu: üç raf ekranı yazıldı, tur 63/63 yeşildi ve
 *  ekranlar canlıda HİÇ YOKTU. **Sınanmamış ekran, ekran değildir.**
 *
 *  Bu rota `SUNUCU_HATASI` yolunu emirle tetikliyor: sayfa hata atar, en
 *  yakın hata sınırı (`src/app/error.tsx`) devreye girer, sonda koşar ve
 *  ekran ölçtüğünü söyler. Halil böylece ekranı GERÇEK CİHAZDA, CANLI
 *  ADRESTE görebiliyor.
 *
 *  ⚠ ÖTEKİ İKİ YOL BURADAN GÖRÜLEMEZ ve bu bilerek böyle:
 *    · `VERITABANI_YOK`       — gerçek kesinti ya da sağlayıcı duraklatması
 *    · `SUNUCUYA_ULASILAMADI` — sunucu susarken; o hâlde sayfa da açılmaz
 *  İkisi Halil testinde AÇIK kalıyor. Tetiklenemeyen bir yolu "geçti"
 *  saymak, testi değil raporu düzeltmek olurdu.
 *
 *  ── ÜÇ KISIT ────────────────────────────────────────────────────────────
 *  1. KAPI ÖNCE. Yetki kontrolü hatadan ÖNCE koşar. Sıra ters olsaydı hata
 *     herkese çizilirdi ve kapı hiçbir şeye yaramazdı — bekçi bu SIRAYI
 *     ayrıca ölçüyor.
 *  2. REDDEDİLEN İSTEK 404 ALIR, "yetkiniz yok" DEĞİL: rotanın varlığı bile
 *     sızmaz.
 *  3. HİÇBİR ŞEY YAZMAZ. Bu sayfa veritabanına dokunmaz; `prisma` içeri
 *     bile alınmaz. Bekçi bunu da ölçüyor — "dokunmuyor" da bir davranıştır
 *     ve fazladan dokunan bir mutasyonla sınanır.
 *
 *  ⚠ MENÜYE KONULMADI. Üretim özelliği değil; adresi Halil test listesinde
 *  yazılı. Menüde durursa günlük akışın parçası sanılır.
 * ============================================================================
 */
export default async function HataDenemesi() {
  /** ⛔ KAPI — bu satır hatadan ÖNCE koşmak ZORUNDA. */
  await sayfaTamYetki();

  /**
   * ⚠ MESAJ KULLANICIYA GÖSTERİLMEZ. Üretimde `Error` yalnız `digest`
   * taşıyor; bu metin sunucu günlüğüne düşer ve orada "bu hata kasıtlı"
   * demek, birinin gerçek arıza sanıp aramaya çıkmasını engeller.
   */
  throw new Error(
    "K98 DENEME — hata ekranını sınamak için KASITLI atıldı. Arıza değildir.",
  );
}
