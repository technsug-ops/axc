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
 * ⛔ GÜNDE İKİNCİ SAYIM — CANLI ÇÖKME 28.08.2026.
 *
 * `kod` şemada `@unique`. `sayimKodu` günde TEK kod ürettiği için, aynı gün
 * ikinci kez "Sayım başlat"a basmak yabancı anahtar değil **tekillik**
 * ihlali veriyordu ve eylem yakalanmamış bir hatayla düşüyordu: kullanıcı
 * `This page couldn't load` gördü.
 *
 * Vaka birebir buydu: `sayim-20260827` 13:37:31'de açıldı (204 satır),
 * 13:37:47'de kapandı; ikinci deneme çöktü.
 *
 * ⚠ ÇARE "GÜNDE BİR SAYIM" DEMEK DEĞİL. Aynı gün ikinci sayım MEŞRU: ilki
 * yarım bırakılmış olabilir, ya da bir rafın yeniden sayılması gerekebilir.
 * Kapıyı kapatmak operatörü kilitlerdi.
 *
 * ⚠ VE KOD OKUNAKLI KALIR: `sayim-20260827-2`. Rastgele bir sonek (zaman
 * damgası, cuid) da tekilliği sağlardı ama düzeltme hareketine damgalanan
 * kod insanın okuyacağı bir iz — üç ay sonra "bu hangi sayımdı" sorusuna
 * cevap vermeli.
 *
 * @param mevcutKodlar O gün ZATEN kullanılmış kodlar (veritabanından).
 */
export function bosSayimKodu(
  sayimGunu: Date,
  mevcutKodlar: readonly string[],
): string {
  const taban = sayimKodu(sayimGunu);
  const kullanilan = new Set(mevcutKodlar);
  if (!kullanilan.has(taban)) return taban;
  /**
   * ⚠ SINIRSIZ DÖNGÜ YOK: 2'den başlayıp boş bulana kadar. Aynı günde 99
   * sayım gerçekçi değil ama döngünün üst sınırı YAZILI olmalı — yoksa
   * beklenmedik bir veri hâli sunucuyu kilitler.
   */
  for (let n = 2; n <= 99; n++) {
    const aday = taban + "-" + n;
    if (!kullanilan.has(aday)) return aday;
  }
  throw new Error("SAYIM_KODU_TUKENDI");
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
