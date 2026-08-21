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
  { toString(): string } | number | string | null | undefined;

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

    /**
     * %12,5 — oran gösterimi. GİRDİ YÜZDE DEĞERİDİR (12.5), kesir değil.
     *
     * Doğrudan `Intl.NumberFormat` ya da elle "%" eklemek YASAK (anayasa):
     * ondalık ayracı dile göre değişir ve elle biçimlendirme İngilizce
     * ortamda "12.5" yazıp Türkçe ekranda yanlış görünür.
     */
    yuzde(deger: number, basamak = 1): string {
      return format.number(deger / 100, {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: basamak,
      });
    },

    /**
     * 1.284 — SAYIM (adet, kayıt). Para değil: birim simgesi YOKTUR.
     *
     * Elle `String(n)` yazmak yasak (anayasa): binlik ayracı dile göre
     * değişir ve 1284 adet, Türkçe ekranda "1.284" okunmalı. Küçük sayıda
     * fark görünmez — tam bu yüzden elle yazma alışkanlığı sinsi: hata
     * ancak sayı büyüdüğünde ortaya çıkar.
     *
     * ONDALIK YOK: adet tam sayıdır, "2,5 ürün" diye bir şey satılmaz.
     */
    sayi(deger: number): string {
      return format.number(deger, { maximumFractionDigits: 0 });
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

/**
 * ============================================================================
 *  "EKSİ SIFIR" TUZAĞI
 * ----------------------------------------------------------------------------
 *  Canlı bulgu 19.08.2026 (Halil, Manuel Rondo). Başabaşın BİR KURUŞ
 *  altında NET-2 gerçekte −0,004 gibi bir değer; kuruşa yuvarlanınca
 *  0,00 oluyor ama eksi işareti kalıyor ve ekranda **`−₺0,00`** yazıyor.
 *  Öyle bir rakam yok — biçimlendirici matematiksel olarak haklı,
 *  kullanıcı için anlamsız.
 *
 *  ⚠ SIFIRA YUVARLAMAK "SIFIR" DEMEK DEĞİLDİR. Değeri düz `₺0,00` yazıp
 *  geçmek 0,4 kuruşluk zararı BAŞABAŞ ilan ederdi ve başabaş fiyatıyla
 *  çelişirdi (1.127,28 başabaş derken 1.127,27'yi de sıfır göstermek).
 *  Bu yüzden fonksiyon değeri DEĞİŞTİRMEZ, yalnız durumu bildirir:
 *  ekran "≈" ile yazar, rengi gerçek işaretten alır.
 * ============================================================================
 */
export function sifiraYuvarlandi(deger: number | null): boolean {
  if (deger === null) return false;
  /** Tam sıfır zaten sıfırdır — "yaklaşık" demek yanlış olurdu. */
  if (deger === 0) return false;
  return Math.round(deger * 100) === 0;
}
