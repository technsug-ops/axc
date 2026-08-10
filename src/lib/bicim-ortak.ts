import type { useFormatter } from "next-intl";

import { IS_SAAT_DILIMI, paraSecenekleri } from "@/i18n/ayarlar";

/**
 * ============================================================================
 *  BİÇİMLENDİRME ÇEKİRDEĞİ
 * ----------------------------------------------------------------------------
 *  Sunucu (bicim.ts) ve istemci (bicim-istemci.ts) aynı mantığı kullansın
 *  diye buradan besleniyor. Burada next-intl'in sunucu/istemci özel
 *  girişleri YOK; sadece formatter nesnesi dışarıdan veriliyor.
 * ============================================================================
 */

/** Prisma Decimal, sayı veya metin kabul eder. */
export type HamTutar =
  | { toString(): string }
  | number
  | string
  | null
  | undefined;

export function sayiyaCevir(tutar: HamTutar): number | null {
  if (tutar === null || tutar === undefined) return null;
  const sayi = Number(tutar.toString());
  return Number.isFinite(sayi) ? sayi : null;
}

/**
 * next-intl formatter'ının tipi. Yalnızca TİP olarak alınıyor (derlemede
 * silinir), bu yüzden istemci girişi sunucu tarafına sızmaz.
 */
type Formatter = ReturnType<typeof useFormatter>;

export function bicimOlustur(format: Formatter) {
  return {
    /**
     * ₺555,00 / €13.00 — para birimi VERİDEN gelir, dilden değil.
     * Kur çevirisi YAPILMAZ; sadece gösterim dile göre biçimlenir.
     */
    para(tutar: HamTutar, paraBirimi: string): string {
      const sayi = sayiyaCevir(tutar);
      if (sayi === null) return "—";
      return format.number(sayi, paraSecenekleri(paraBirimi));
    },

    /** 09.08.2026 — biçim adı i18n ayarlarında tanımlı. */
    tarih(tarih: Date): string {
      return format.dateTime(tarih, "kisa");
    },

    /** Ağustos 2026 — ay filtresi ve dönem başlığı. */
    ayYil(tarih: Date): string {
      return format.dateTime(tarih, "ayYil");
    },
  };
}

/**
 * <input type="date"> için: 2026-08-09
 *
 * Dil altyapısından geçmez — bu bir görüntü biçimi değil, HTML'in beklediği
 * sabit makine biçimi. Bu yüzden i18n kuralındaki "doğrudan Intl yasak"
 * maddesi buraya işlemez; burada Intl DİL için değil, SAAT DİLİMİ için
 * kullanılıyor.
 *
 * SAAT DİLİMİ: çalışma ortamının değil, İŞİN saat dilimi (Europe/Istanbul).
 * Almanya'da gece 23:30'da açılan form Türkiye'de ertesi gün olduğu için
 * yarının tarihini önerir — istenen davranış budur, operasyon Türkiye'de.
 *
 * `formatToParts` kullanılıyor: yerel ayarın tarih sıralamasına bağlı
 * kalmadan yıl-ay-gün parçaları tek tek alınır, biçim garanti edilir.
 */
export function tarihGirdisi(tarih: Date): string {
  const parcalar = new Intl.DateTimeFormat("en-US", {
    timeZone: IS_SAAT_DILIMI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(tarih);

  const al = (tur: Intl.DateTimeFormatPartTypes) =>
    parcalar.find((p) => p.type === tur)?.value ?? "";

  return `${al("year")}-${al("month")}-${al("day")}`;
}
