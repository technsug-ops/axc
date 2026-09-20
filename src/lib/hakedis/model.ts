import type { Currency } from "@/generated/prisma/enums";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";

/**
 * ============================================================================
 *  HAKEDİŞ — ORTAK İÇ MODEL
 * ----------------------------------------------------------------------------
 *  Trendyol GENİŞ format verir (bir satır = bir sipariş, kesintiler kolon),
 *  Hepsiburada UZUN format verir (bir satır = bir kalem, kesintiler ayrı
 *  satır). İki okuyucu da çıktısını BU modele çevirir; bundan sonraki her
 *  şey (eşleştirme, önizleme, yazım) formatı bilmez.
 *
 *  Yarın üçüncü bir pazaryeri eklenirse yalnız bir okuyucu yazılır.
 * ============================================================================
 */

/**
 * Kalem tipleri. Pazaryerinin kendi metni DEĞİL, bizim ortak dilimiz —
 * "Komisyon tutarı" (HB) ve "TY Hakediş"in komisyon payı aynı koda düşer.
 */
export const HAKEDIS_KODLARI = [
  "SIPARIS_TUTARI",
  "KOMISYON",
  "KARGO",
  "STOPAJ",
  "HIZMET_BEDELI",
  "TAHSILAT_BEDELI",
  "KAMPANYA",
  "KUPON",
  /** Kuponun geri gelişi — POZİTİF. Kupon'un aynası, ayrı kod. */
  "KUPON_IPTAL",
  "INDIRIM",
  "PROMOSYON",
  // --- iade aynaları: aynı kalemin geri dönüşü ---
  "IADE_TUTARI",
  "KOMISYON_IADE",
  "KARGO_IADE",
  "STOPAJ_IADE",
  "HIZMET_BEDELI_IADE",
  "TAHSILAT_BEDELI_IADE",
  "KAMPANYA_IADE",
  // --- sipariş dışı ---
  "PLATFORM_HIZMET",
  "KARGO_FATURA",
  "ETICARET_STOPAJI",
  "HURDA_GELIRI",
  "ERKEN_ODEME",
  "ULUSLARARASI_HIZMET",
  /**
   * TANINMAYAN TİP. Pazaryerleri yeni işlem tipi ekliyor ve haber vermiyor.
   * Sessizce atlamak, parayı kaybetmek demektir; yüklemeyi durdurmak ise
   * her yeni tipte sistemi kilitlerdi. Bu yüzden kalem YAZILIR, ham tipiyle
   * ve tutarıyla uyarı listesinde görünür — kullanıcı görür, biz kod ekleriz.
   */
  "DIGER",
] as const;

export type HakedisKodu = (typeof HAKEDIS_KODLARI)[number];

/** Sipariş numarasına bağlanmayan, döneme yazılan kalemler. */
export const SIPARIS_DISI_KODLAR: HakedisKodu[] = [
  "PLATFORM_HIZMET",
  "KARGO_FATURA",
  "ETICARET_STOPAJI",
  "HURDA_GELIRI",
  "ERKEN_ODEME",
  "ULUSLARARASI_HIZMET",
];

/**
 * Normalize edilmiş tek satır.
 *
 * TUTAR İŞARETİ: gelir POZİTİF, gider NEGATİF. Pazaryerleri bunu farklı
 * gösteriyor (HB'de "Kayıt Türü: Gider" kolonu var, TY'de kesintiler ayrı
 * kolonlarda pozitif duruyor); okuyucular işareti burada tekleştirir.
 * Toplam almak isteyen kimse ayrıca kural bilmek zorunda kalmasın.
 */
export type HakedisSatiri = {
  /** Pazaryerinin Kayıt No'su — idempotentliğin anahtarı. */
  externalId: string;
  kod: HakedisKodu;
  /** Ham "Kayıt Tipi" / "İşlem Tipi" metni — tanınmayanı görebilmek için. */
  hamTip: string;
  /** Pazaryeri sipariş numarası. Sipariş dışı kalemlerde null. */
  siparisNo: string | null;
  tutar: number;
  paraBirimi: Currency;
  /**
   * VADE TARİHİ RAPORDAN OKUNUR, HESAPLANMAZ.
   *
   * Aynı hesapta 21 ve 28 iş günlük satırlar bir arada çıkıyor (kullanıcı
   * ölçümü 11.08.2026). Kanal ayarındaki `payoutDays` bu satırlar için
   * kullanılmaz; o değer YALNIZCA rapora henüz düşmemiş satışların
   * ön-tahmini içindir. Rapor geldiğinde gerçek tarih buradan gelir.
   */
  vadeTarihi: Date | null;
  /** Paranın hesaba geçtiği gün. HB'de var, TY'de YOK. */
  odemeTarihi: Date | null;
  /** İkincil doğrulama: TY'de barkod, HB'de kanal SKU. */
  urunKodu: string | null;
  /** Elektronik tablodaki satır numarası — hata mesajı buna işaret eder. */
  satirNo: number;
  /** Ham satırın okunur özeti; kaynağa dönmek gerekirse. */
  ham: string;
};

/** Bir dosyanın okunmuş hâli. */
export type HakedisOkumasi = {
  kanal: "TRENDYOL" | "HEPSIBURADA";
  satirlar: HakedisSatiri[];
  /** Tanınmayan başlıklar — okuyucu tutmadıysa sebebi burada. */
  eksikSutunlar: string[];
};

/**
 * ============================================================================
 *  EŞİKLER — TEK YERDE, GEREKÇESİYLE
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 11.08.2026.
 * ============================================================================
 */
export const HAKEDIS_ESIKLERI = {
  /**
   * Kaç İŞ GÜNÜ geçince "geç ödeme" sayılır.
   * Sıfır değil çünkü iş günü hesabı resmî tatilleri saymıyor; bayram
   * denk gelen dönemde beklenen tarih 2-3 gün erken çıkıyor.
   */
  gecikmeIsGunu: 3,

  /**
   * Kaç para birimi farkı "eksik/fazla ödeme" sayılır.
   * Kuruş farkları yuvarlamadan doğar ve uyarı değeri taşımaz;
   * 1 birimin altı gürültüdür.
   */
  tutarFarki: 1,
} as const;

/**
 * ============================================================================
 *  KANAL ÖDEME GÜNLERİ — KULLANICI BEYANI (20.09.2026, Trendyol 20.09'da
 *  DÜZELTİLDİ: ilk beyan "Salı + Perşembe"ydi, kullanıcı kanalın kendi
 *  ekranına bakıp "Pazartesi - Perşembe" olarak düzeltti.)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE GEREKLİ: `dueDate` SİPARİŞ BAŞINA ayrı tahmin edilir (bkz.
 *  `beklenenVade`) ama pazaryeri parayı yalnız BELİRLİ haftanın günlerinde
 *  öder. Ham `dueDate`e göre günlük gruplama yapılırsa ekran "her gün bir
 *  ödeme var" der — ki bu YANLIŞTIR ve kullanıcı bunu canlıda gördü
 *  ("bu sıklıkta bir ödeme yok").
 *
 *  Gerçek takvim (kanalın kendi ekranıyla doğrulandı):
 *    Trendyol     → Pazartesi + Perşembe
 *    Hepsiburada  → Salı
 *    N11          → Perşembe
 *
 *  `Date.getUTCDay()`: 0=Pazar 1=Pazartesi 2=Salı 3=Çarşamba 4=Perşembe
 *  5=Cuma 6=Cumartesi.
 *
 *  ⛔ ESKİ GEREKÇE YANLIŞTI, SİLİNMEDİ: burada ÖNCEDEN "`dueDate`/`gunDegeri`
 *  İstanbul takvim gününü UTC gece yarısına damgalıyor, bu yüzden
 *  `getUTCDay()` doğrudan doğru sonucu verir — ayrı bir saat dilimi çevrimi
 *  gerekmez" yazıyordu. **YANLIŞTI.** API'den gelen `dueDate`/`paidAt` HAM
 *  zaman damgasıdır (`gunDegeri` ile üretilmemiştir) ve UTC gün sınırı ile
 *  İstanbul gün sınırı UYUŞMAYABİLİR — canlı vaka: Hepsiburada'nın kendi
 *  paneli "22 Eylül Salı" derken ekran "23 Eylül" gösteriyordu, çünkü ham
 *  değer UTC'de Salı, İstanbul'da Çarşamba'ydı. `sonrakiOdemeGunu` artık
 *  ÖNCE İstanbul takvim gününe normalize ediyor (bkz. gövdesi).
 *
 *  Haritada OLMAYAN kanal için tarih İSTANBUL GÜNÜNE normalize edilip
 *  OLDUĞU GİBİ kalır — uydurma bir gün eklenmez (bkz. `sonrakiOdemeGunu`).
 * ============================================================================
 */
/**
 * ⛔ YÖN DE KANALA GÖRE DEĞİŞİR — VE ÖLÇÜLEREK BULUNDU (20.09.2026).
 *
 * İlk yazımda vade HER kanalda İLERİ kaydırılıyordu ("vadeden sonraki ilk
 * ödeme günü"). Trendyol'da rakamlar tutmadı: bizde 21.09 için ₺45.968,
 * TY'nin kendi panelinde ₺90.739 — iki kat. Ölçüm (`paymentOrderId` dolu
 * GEÇMİŞ ödeme emirleri, yani GERÇEK veri) kuralı tek başına söyledi:
 *
 *     TY ödeme günü   o ödemedeki kalemlerin vade aralığı
 *     07.09 Pzt       07.09 → 09.09 Çar
 *     10.09 Per       10.09 → 13.09 Paz
 *     14.09 Pzt       14.09 → 16.09 Çar
 *     17.09 Per       17.09 → 20.09 Paz
 *
 * Dördü de birebir: TY, vadesi o güne DÜŞEN kalemi o gün öder — yani ödeme
 * günü vadeden SONRAKİ değil, vadeden ÖNCEKİ (ya da aynı) ödeme günüdür.
 *
 * ⚠ HEPSİBURADA'DA YÖN TERS VE BU DA ÖLÇÜLDÜ: HB'nin kendi paneli
 * "22 Eylül Salı · 84.680,85" diyor ve İLERİ kaydırma bu rakamı KURUŞUNA
 * tutturuyor. İki kanal iki farklı şey yapıyor; tek yön dayatmak birini
 * mutlaka bozardı. _(Anayasa: "bir sınırın yönü ölçülmeden çevrilmez".)_
 */
export type OdemeTakvimi = {
  /** `Date.getUTCDay()` değerleri. */
  gunler: number[];
  /**
   * `GERI` → vadeden önceki (ya da aynı) ödeme günü — Trendyol, ölçüldü.
   * `ILERI` → vadeden sonraki (ya da aynı) ödeme günü — Hepsiburada, ölçüldü.
   */
  yon: "ILERI" | "GERI";
};

export const KANAL_ODEME_GUNLERI: Record<string, OdemeTakvimi> = {
  Trendyol: { gunler: [1, 4], yon: "GERI" },
  Hepsiburada: { gunler: [2], yon: "ILERI" },
  /** ⚠ N11 ÖLÇÜLMEDİ — kullanıcı beyanı yalnız GÜNÜ veriyor, yönü değil.
   *  Varsayılan İLERİ; N11 hakedişi API'den çekilmeye başlayınca TY'deki
   *  gibi geçmiş ödeme emirlerinden ölçülüp düzeltilir. */
  N11: { gunler: [4], yon: "ILERI" },
};

/**
 * Bir vade tahmininden başlayarak, kanalın GERÇEKTEN ödediği ilk günü bulur.
 * Vade zaten bir ödeme gününe denk geliyorsa aynı tarih döner.
 *
 * ⛔ CANLI BULGU 20.09.2026: `vade` API'den gelen HAM bir zaman damgasıdır
 * (ör. `2026-09-15T22:00:00.000Z`) — İSTANBUL saatinde bu an ARTIK 16'sının
 * 01:00'ıdır (Çarşamba), UTC'de ise hâlâ 15'idir (Salı). Önceki hâl haftanın
 * gününü `vade.getUTCDay()` ile — yani UTC takviminde — hesaplıyordu, oysa
 * GÖSTERİM (`bicim.tarih`) İstanbul takvim gününü basıyordu. Sonuç: ekran
 * Hepsiburada'nın ödemesini SALI yerine ÇARŞAMBA gösteriyordu — bir gün
 * kaymış, kanalın kendi panelinde 22 Eylül Salı dediği ödeme burada
 * 23 Eylül olarak duruyordu.
 *
 * Çare: hesap ÖNCE İstanbul takvim gününe (UTC gece yarısı) normalize
 * edilir (bkz. `gunDegeri(isTakvimGunu(...))`, anayasanın "iş saat dilimi
 * Europe/Istanbul sabit" kuralı) — GÖSTERİM de AYNI değeri kullandığı için
 * ikisi artık ayrışamaz.
 */
export function sonrakiOdemeGunu(vade: Date, kanalAdi: string): Date {
  const istanbulGunu = gunDegeri(isTakvimGunu(vade));
  const takvim = KANAL_ODEME_GUNLERI[kanalAdi];
  if (!takvim || takvim.gunler.length === 0) return istanbulGunu;
  /** Yön kanalın ÖLÇÜLMÜŞ davranışından gelir (bkz. `OdemeTakvimi`). */
  const adim = takvim.yon === "GERI" ? -1 : 1;
  for (let i = 0; i < 7; i++) {
    const aday = new Date(istanbulGunu.getTime() + adim * i * 86_400_000);
    if (takvim.gunler.includes(aday.getUTCDay())) return aday;
  }
  /** Pratikte hiç ulaşılmaz: 7 günlük pencerede en az bir eşleşme vardır. */
  return istanbulGunu;
}
