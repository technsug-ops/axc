/**
 * ============================================================================
 *  DİL AYARLARI — TEK KAYNAK
 * ----------------------------------------------------------------------------
 *  Bugün tek dil Türkçe. İngilizce sözlüğü (messages/en.json) boş iskelet
 *  olarak duruyor; doldurulunca buraya eklenmesi yeterli olacak.
 *
 *  URL STRATEJİSİ: Şu an yönlendirme YOK — /urunler, /stok gibi rotalar
 *  hiç değişmedi, basılı QR etiketleri ve yer imleri kırılmadı. İngilizce
 *  eklenince next-intl'in "as-needed" kipine geçilecek: Türkçe öneksiz
 *  kalır, İngilizce /en/... olur. Yani rotalar o gün de değişmeyecek.
 * ============================================================================
 */

export const DILLER = ["tr", "en"] as const;
export type Dil = (typeof DILLER)[number];

export const VARSAYILAN_DIL: Dil = "tr";

/**
 * ============================================================================
 *  İŞ SAAT DİLİMİ — TEK SABİT, DEĞİŞMEZ
 * ----------------------------------------------------------------------------
 *  Kullanıcı Almanya'da olabilir, sunucu bambaşka bir ülkede duruyor olabilir;
 *  OPERASYON Türkiye'dedir. "Bugün hangi gün?" sorusunun cevabı çalışma
 *  ortamına göre değişirse ay raporu, kart kesim günü ve hakediş tarihi
 *  bulunduğunuz ülkeye göre kayar.
 *
 *  Bu yüzden `Intl.DateTimeFormat().resolvedOptions().timeZone` YASAKTIR.
 *  Hem GÖSTERİM (i18n/request.ts) hem "bugün" ÜRETİMİ (lib/bicim-ortak.ts,
 *  lib/donem.ts) buradan beslenir.
 *
 *  _Karar 09.08.2026, uygulama 10.08.2026 (Faz 2 / Aşama 4)._
 * ============================================================================
 */
export const IS_SAAT_DILIMI = "Europe/Istanbul";

/**
 * Adlandırılmış biçimler. Ekranlar seçenek nesnesi tekrarlamaz,
 * bu adları kullanır — biçim değişirse tek yerden değişir.
 */
export const BICIMLER = {
  dateTime: {
    /** 09.08.2026 */
    kisa: {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
    /** Ağustos 2026 — ay filtreleri ve dönem başlıkları için. */
    ayYil: {
      month: "long",
      year: "numeric",
    },
  },
} as const;

/**
 * Para birimi seçenekleri. Para birimi VERİDEN gelir (TRY/EUR), dilden
 * değil — kur çevirisi yapılmaz, sadece gösterim biçimi dile göre değişir.
 * Türkçede "₺555,00", İngilizcede "₺555.00" gibi.
 */
export function paraSecenekleri(paraBirimi: string) {
  return {
    style: "currency" as const,
    currency: paraBirimi,
    minimumFractionDigits: 2,
  };
}
