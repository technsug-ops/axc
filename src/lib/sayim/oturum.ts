import { gunMetni } from "@/lib/donem";

/**
 * ============================================================================
 *  FİZİKSEL SAYIM — OTURUM (SAF HESAP)
 * ----------------------------------------------------------------------------
 *  ⛔ OTURUMUN HÂLİ SAKLANMAZ, TÜRETİLİR. Şemada `durum` diye bir enum
 *  BİLEREK yok: hâl üç nullable damgadan çıkar (`kapanisAt` · `yazimAt` ·
 *  `iptalAt`).
 *
 *  Enum eklenseydi aynı bilgi iki yerde yaşardı ve ayrıştıkları gün
 *  hangisinin doğru olduğu cevapsız kalırdı — `sayilanAdet` ile ayrı bir
 *  "sayıldı mı" bayrağı tutmanın reddedilmesiyle aynı gerekçe. Üstelik damga
 *  fazladan bir şey söyler: NE ZAMAN. Enum onu söylemez.
 * ============================================================================
 */

export type OturumDamgalari = {
  kapanisAt: Date | null;
  yazimAt: Date | null;
  iptalAt: Date | null;
};

/**
 * ACIK      — sayılıyor; fark CANLI, her açılışta yeniden hesaplanır
 * KAPANDI   — sayım bitti, düzeltme HENÜZ yazılmadı (fark hâlâ canlı)
 * YAZILDI   — düzeltmeler yazıldı
 * IPTAL     — oturum terk edildi; satırlar durur ama HÜKÜM VERMEZ
 */
export type OturumHali = "ACIK" | "KAPANDI" | "YAZILDI" | "IPTAL";

/**
 * ⚠ SIRA ÖNEMLİ: iptal her şeyi yener. İptal edilmiş bir oturum yazım damgası
 * taşıyorsa (yazdıktan sonra iptal), o oturum yine de hüküm vermez — ama
 * yazdığı düzeltmeler ledger'da durur ve ters kayıtla geri alınır. Ledger
 * silinmez; iptal, oturumun sözünü geri alır, hareketini değil.
 */
export function oturumHali(d: OturumDamgalari): OturumHali {
  if (d.iptalAt !== null) return "IPTAL";
  if (d.yazimAt !== null) return "YAZILDI";
  if (d.kapanisAt !== null) return "KAPANDI";
  return "ACIK";
}

/** Yeni satır okunabilir mi (yalnız açık oturumda). */
export function okumayaAcikMi(d: OturumDamgalari): boolean {
  return oturumHali(d) === "ACIK";
}

/**
 * TEK AÇIK OTURUM — uygulama katmanı garantisi (isDefault varyant deseniyle
 * aynı). Nullable damgalarla veritabanı kısıtı kurulamaz, o yüzden kapı
 * burada: ikinci bir oturum açılmadan ÖNCE sorulur.
 */
export function acikOturumVarMi(oturumlar: readonly OturumDamgalari[]): boolean {
  return oturumlar.some((o) => oturumHali(o) === "ACIK");
}

/**
 * `sayim-YYYYMMDD` — düzeltme hareketlerine damgalanan kod.
 * ⚠ Gün UTC gece yarısı olarak verilir (İstanbul iş günü). Kod, sayım
 * gününden üretilir; AÇILIŞ anından değil — gece 00:30'da açılan bir sayım
 * kodunu bir önceki günden almaz.
 */
export function sayimKodu(sayimGunu: Date): string {
  return "sayim-" + gunMetni(sayimGunu).replaceAll("-", "");
}

/**
 * AÇILIŞTA HATIRLATMA — "bugün ilk satış çıktı mı?"
 *
 * ⛔ KAPANIŞTA DEĞİL, AÇILIŞTA. Kapanışta söylemek geç olur: sayım çoktan
 * yapılmıştır ve rakamlar toplanmıştır. (Kullanıcı şartı 27.08.2026.)
 *
 * Gerekçe: ledger GÜN çözünürlüğünde (hareketlerin %99,6'sı UTC gece yarısı).
 * Sayım günü, sayımdan SONRA yapılan bir satış aynı güne damgalıdır ve gün
 * içi sıra ayrılamaz. Bu yüzden sayım o gün ilk satış çıkmadan yapılır.
 *
 * @param sayimGunuHareketVar Sayım gününe damgalı, stoğu OYNATAN hareket var mı.
 */
export function acilisUyarisiGerekirMi(sayimGunuHareketVar: boolean): boolean {
  return sayimGunuHareketVar;
}
