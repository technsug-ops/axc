import type {
  NoticeStatus,
  ProfitStatus,
  PurchaseStatus,
} from "@/generated/prisma/enums";

import type { DurumRengi } from "./renkler";

/**
 * ============================================================================
 *  DURUM → RENK EŞLEMESİ — HER SAYFA AYNI SÖZLÜKTEN OKUR
 * ----------------------------------------------------------------------------
 *  `lib/renkler.ts` renklerin NE OLDUĞUNU tanımlar; bu dosya HANGİ DURUMUN
 *  hangi renge düştüğünü söyler. İkisi ayrı çünkü palet değişebilir ama
 *  "teslim alındı iyidir" kararı değişmez.
 *
 *  EŞLEMELER SAYFADA DEĞİL BURADA. Alım listesi ile panel aynı durumu farklı
 *  renge boyarsa kullanıcı iki ekranda iki şey öğrenmiş olur; renk sisteminin
 *  tek vaadi buydu — aynı renk her yerde aynı anlam.
 *
 *  `panel:dogrula` bu eşlemeleri değer olarak sınıyor: enum'a yeni bir durum
 *  eklenip burada unutulursa TypeScript `Record` tipi yüzünden DERLENMEZ.
 * ============================================================================
 */

/**
 * ALIM DURUMU.
 * Teslim alındı → iş bitti (olumlu). Sipariş verildi / kısmen geldi →
 * bekleyen iş (uyarı). Taslak ve iptal durum bildirmez (nötr) — iptal
 * KIRMIZI DEĞİLDİR: bilinçli bir karardır, hata değil.
 */
export const ALIM_DURUM_RENGI: Record<PurchaseStatus, DurumRengi> = {
  RECEIVED: "olumlu",
  ORDERED: "uyari",
  PARTIALLY_RECEIVED: "uyari",
  DRAFT: "notr",
  CANCELLED: "notr",
};

/**
 * İADE BİLDİRİMİ DURUMU.
 * Kapandı → iş bitti. Mal geldi → öngörü/bilgi (akış ilerledi, hüküm
 * bekleniyor). Beklenen ve itiraz dalı → uyarı. İtiraz KABUL lehimize
 * sonuçtur (olumlu); RED aleyhe (olumsuz). İptal nötr — müşteri vazgeçti,
 * bu bir başarısızlık değil.
 */
export const BILDIRIM_DURUM_RENGI: Record<NoticeStatus, DurumRengi> = {
  KAPANDI: "olumlu",
  ITIRAZ_KABUL: "olumlu",
  MAL_GELDI: "bilgi",
  BEKLENIYOR: "uyari",
  ITIRAZ_ACILDI: "uyari",
  ITIRAZ_INCELEMEDE: "uyari",
  ITIRAZ_RED: "olumsuz",
  IPTAL: "notr",
};

/**
 * KÂR HESABI DURUMU. Hesaplanmış olmak "iyi" değil NÖTRDÜR — rakamın
 * kendisi zaten kâr/zarar rengini taşıyor; kutuyu bir de yeşile boyamak
 * aynı şeyi iki kez söylerdi. Hesaplanamayan hâller UYARIDIR: ele alınacak
 * bir eksik var.
 */
export const KAR_DURUM_RENGI: Record<ProfitStatus, DurumRengi> = {
  CALCULATED: "notr",
  NO_COST: "uyari",
  RULE_MISSING: "uyari",
  CURRENCY_MISMATCH: "uyari",
};

/**
 * STOK YAŞLANMA BANDI. Taze mal durum bildirmez; 31-60 gün uyarı,
 * 60+ gün kırmızı — o mal artık bağlı sermayedir.
 */
export const YAS_BANDI_RENGI: Record<"NOTR" | "AMBER" | "KIRMIZI", DurumRengi> =
  {
    NOTR: "notr",
    AMBER: "uyari",
    KIRMIZI: "olumsuz",
  };

/** Kargo: verildi → iş bitti, bekleyen → yapılacak iş. */
export function kargoDurumRengi(verildiMi: boolean): DurumRengi {
  return verildiMi ? "olumlu" : "uyari";
}

/**
 * ============================================================================
 *  KÂR/ZARAR RENGİ — TEK KARAR NOKTASI
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 19.08.2026: "kârda yeşil, zararda kırmızı ile uyarıda
 *  bulunsun." Rakamın işareti tabular-nums bir sütunda gözden kaçıyor;
 *  eksi işareti tek karakter ve göz onu atlıyor.
 *
 *  ── SIFIR KIRMIZI DEĞİL, YEŞİL DE DEĞİL ─────────────────────────────────
 *  ⚠ Başabaş noktası ne kâr ne zarardır. Kırmızı yakmak "zarar ediyorsun"
 *  demek olurdu, yeşil yakmak "kazanıyorsun". İkisi de yanlış — ve bu,
 *  aynı gün yön satırında verilen "sıfır kâr sayılmaz" kararının
 *  RENK tarafındaki karşılığıdır. Aynı kural iki yerde aynı davranmalı.
 *
 *  Burada durmasının sebebi Kural #10 (tutarlılık): eşiği ekranın içine
 *  yazsaydık ikinci ekran onu yeniden yorumlardı ve iki ekran aynı rakamı
 *  farklı renkte gösterebilirdi.
 * ============================================================================
 */
export function karZararRengi(deger: number | null): DurumRengi {
  if (deger === null) return "notr";
  if (deger > 0) return "olumlu";
  if (deger < 0) return "olumsuz";
  /** Tam sıfır = başabaş. Renk YOK; iddia da yok. */
  return "notr";
}
