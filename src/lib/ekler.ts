/**
 * ============================================================================
 *  DOSYA EKLERİ — SINIRLAR VE DOĞRULAMA (SAF MANTIK)
 * ----------------------------------------------------------------------------
 *  İtiraz dosyası, hasar fotoğrafı, tedarikçi yazışması: hepsi aynı kalıptan
 *  geçer. Doğrulama SAF tutuluyor ki dosya yüklemeden sınanabilsin
 *  (`rma:dogrula` 6 MB'lık dosyayı ve 11. eki gerçek dosya olmadan reddediyor).
 *
 *  SINIRLAR NEDEN VAR:
 *    5 MB/dosya  — telefonla çekilen fotoğraf 2-4 MB; sınır bunu geçirir ama
 *                  video/PDF taramasının depoyu şişirmesini engeller.
 *    10 ek/kayıt — bir itiraz dosyası 10 belgeden fazlaysa problem belgede
 *                  değil süreçtedir; sınırsız yükleme sessizce maliyet üretir.
 *    4 tür       — jpeg/png/webp fotoğraf, pdf belge. Office dosyası ve zip
 *                  KABUL EDİLMEZ: içeriği görüntülenemez, ekranda açılamaz.
 *
 *  ⚠ DOSYALAR JSON YEDEĞE GİRMEZ. Yedekte Attachment SATIRLARI vardır
 *  (hangi kayda ait, hangi ad, hangi yol) ama dosyanın kendisi Blob'da
 *  kalır. Geri yükleme satırları döndürür, dosyaları döndürmez — bu yüzden
 *  ekranda uyarı duruyor. Sessiz bırakılırsa kullanıcı "yedeğim var" diye
 *  güvenir ve felaket anında dosyaları kaybettiğini o gün öğrenir.
 * ============================================================================
 */

/**
 * ---------------------------------------------------------------------------
 *  TAŞIMA SINIRI — BEYAN EDİLEN SINIR BUNU AŞAMAZ
 * ---------------------------------------------------------------------------
 *  14.08.2026 CANLI ÇÖKMESİ (T5): kullanıcı itiraz kanıtı yüklemeye çalıştı,
 *  sayfa "This page couldn't load" ile düştü. Sebep dosyada ya da kodumuzda
 *  değildi: BEYAN EDİLEN SINIR (5 MB) TAŞINABİLİR SINIRDAN BÜYÜKTÜ.
 *
 *  İki tavan var ve ikisi de bizim kodumuzun ÜSTÜNDE:
 *    • Server Action gövdesi varsayılan 1 MB (Next belgesi:
 *      config/next-config-js/serverActions → bodySizeLimit). Aşınca istek
 *      ÇERÇEVE KATMANINDA reddedilir — bizim `try/catch`imiz hiç çalışmaz,
 *      fonksiyon 500 döner, ekran error boundary'ye düşer. Bu yüzden
 *      "kibarca hata göster" kodu yazmak tek başına ÇÖKMEYİ ÖNLEMİYORDU.
 *      (`bodySizeLimit` yalnız `experimental.` altında yaşıyor; anayasa
 *      gereği kullanılmıyor — bu yüzden yükleme Route Handler'a taşındı.)
 *    • Sunucusuz fonksiyon istek gövdesi ~4,5 MB (barındırma tavanı).
 *
 *  Beyan edilen sınır bu tavanın ALTINDA kalmalı; multipart başlıkları da
 *  yer kaplar. 4 MB seçildi: telefon fotoğrafı (2-4 MB) geçer, tavana yarım
 *  megabaytlık pay kalır. `rma:dogrula` bu ilişkiyi KİLİTLİYOR — sınır
 *  yeniden yükseltilirse test kırmızı yanar.
 */
export const TASIMA_SINIRI = Math.floor(4.5 * 1024 * 1024);

export const EK_SINIRLARI = {
  /** Dosya başına bayt sınırı — 4 MB (taşıma tavanının altında). */
  enFazlaBayt: 4 * 1024 * 1024,
  /** Kayıt başına ek sayısı. */
  enFazlaEk: 10,
} as const;

/** Kabul edilen tür → uzantı. Tür VE uzantı birlikte kontrol edilir. */
export const IZINLI_TURLER: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

/** Eklerin bağlanabildiği kayıt tipleri — polimorfik hedef. */
export const EK_HEDEFLERI = [
  "ReturnNotice",
  "Return",
  "Purchase",
  "Compensation",
  /** Destek talebi ekran görüntüsü (16.08.2026). Migration GEREKTİRMEDİ:
   *  `Attachment.targetType` düz string, kısıt bu listede yaşıyor. */
  "Talep",
] as const;
export type EkHedefi = (typeof EK_HEDEFLERI)[number];

export function ekHedefiGecerliMi(deger: string): deger is EkHedefi {
  return (EK_HEDEFLERI as readonly string[]).includes(deger);
}

export type EkHatasi =
  | "TUR_IZINLI_DEGIL"
  | "UZANTI_TURLE_UYUSMUYOR"
  | "DOSYA_BOS"
  | "DOSYA_COK_BUYUK"
  | "EK_SINIRI_ASILDI"
  | "HEDEF_GECERSIZ";

export type EkGirdisi = {
  dosyaAdi: string;
  mimeType: string;
  sizeBytes: number;
  /** Bu kayıtta ŞU AN kaç ek var — sınır buna göre ölçülür. */
  mevcutEkSayisi: number;
  hedefTipi: string;
};

/** Uzantıyı küçük harfle döndürür ("FATURA.PDF" → ".pdf"). */
export function uzanti(dosyaAdi: string): string {
  const nokta = dosyaAdi.lastIndexOf(".");
  if (nokta < 0) return "";
  return dosyaAdi.slice(nokta).toLowerCase();
}

/**
 * Eki doğrular. Veritabanına ve dosya sistemine GİTMEZ.
 *
 * TÜR VE UZANTI BİRLİKTE: tarayıcının bildirdiği MIME türü güvenilmez
 * (kullanıcı `.exe`yi `image/png` diye gönderebilir), uzantı da tek başına
 * yetmez. İkisinin BİRBİRİYLE tutması gerekiyor.
 */
export function ekiDogrula(girdi: EkGirdisi): EkHatasi[] {
  const hatalar: EkHatasi[] = [];

  if (!ekHedefiGecerliMi(girdi.hedefTipi)) hatalar.push("HEDEF_GECERSIZ");

  const izinliUzantilar = IZINLI_TURLER[girdi.mimeType];
  if (!izinliUzantilar) {
    hatalar.push("TUR_IZINLI_DEGIL");
  } else if (!izinliUzantilar.includes(uzanti(girdi.dosyaAdi))) {
    hatalar.push("UZANTI_TURLE_UYUSMUYOR");
  }

  if (girdi.sizeBytes <= 0) hatalar.push("DOSYA_BOS");
  if (girdi.sizeBytes > EK_SINIRLARI.enFazlaBayt) hatalar.push("DOSYA_COK_BUYUK");

  if (girdi.mevcutEkSayisi >= EK_SINIRLARI.enFazlaEk) {
    hatalar.push("EK_SINIRI_ASILDI");
  }

  return hatalar;
}

/** Blob yolu: ekler/<tip>/<id>/<zaman>-<ad> — şemadaki desenle aynı. */
export function ekYolu(
  hedefTipi: EkHedefi,
  hedefId: string,
  dosyaAdi: string,
  zamanDamgasi: number,
): string {
  // Yol ayracı ve boşluk temizlenir: Blob anahtarı öngörülebilir kalsın.
  const guvenliAd = dosyaAdi.replace(/[^\w.\-]+/g, "_").slice(-80);
  return `ekler/${hedefTipi}/${hedefId}/${zamanDamgasi}-${guvenliAd}`;
}
