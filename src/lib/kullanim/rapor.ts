import { gunBasiAni, gunDegeri, gunEkle, gunMetni, isSaati, isTakvimGunu } from "@/lib/donem";


/**
 * ============================================================================
 *  KULLANIM RAPORU — SAF GÖVDE (K334 ② · kullanıcı kararı 13.10.2026
 *  «kalıbı adminde dursun» → süper admin paneli)
 * ----------------------------------------------------------------------------
 *  Ekran (`bezirga/(ic)/kullanim`) sayıları veritabanında TOPLAR (groupBy) —
 *  satır satır çekmez; burada yalnız toplanmış sayıların biçimi var:
 *  · dönem seçimi (adres → gün sayısı; bilinmeyen değer varsayılana düşer),
 *  · saatlik kovaları İŞ GÜNÜNE ve İŞ SAATİNE dağıtmak (İstanbul — çalışma
 *    ortamının saat dilimi okunmaz; anayasa),
 *  · iz hedefini ekranda nasıl göstereceğimiz (bağlantı · site dışı · düğme),
 *  · çubuk genişliği.
 * ============================================================================
 */

export const KULLANIM_DONEMLERI = [7, 30, 90] as const;
export type KullanimDonemi = (typeof KULLANIM_DONEMLERI)[number];
export const VARSAYILAN_DONEM: KullanimDonemi = 30;

/** Adresteki `d` → gün sayısı. Bilinmeyen/boş değer sessizce uydurulmaz: varsayılan döner. */
export function donemSec(ham: string | undefined): KullanimDonemi {
  const n = Number(ham);
  return (KULLANIM_DONEMLERI as readonly number[]).includes(n) ? (n as KullanimDonemi) : VARSAYILAN_DONEM;
}

/** Dönemin ilk İŞ GÜNÜ (bugün dahil N gün) — sorgu sınırı bu günün İstanbul gece yarısıdır. */
export function donemIlkGunu(bugun: Date, gunSayisi: number): Date {
  return gunEkle(gunDegeri(isTakvimGunu(bugun)), -(gunSayisi - 1));
}

/** Sorgu sınırı: dönemin ilk iş gününün BAŞLADIĞI an (İstanbul gece yarısı, mutlak). */
export function donemBasiAni(ilkGun: Date): Date {
  return gunBasiAni({ yil: ilkGun.getUTCFullYear(), ay: ilkGun.getUTCMonth() + 1, gun: ilkGun.getUTCDate() });
}

export type SaatKovasi = { an: Date; adet: number };
export type GunSatiri = { gun: string; adet: number };

/**
 * Veritabanının UTC saat kovalarını İŞ GÜNLERİNE ve İŞ SAATLERİNE dağıtır.
 * Gün listesi DÖNEMİN TAMAMIDIR (olay olmayan gün `0` — boş gün gizlenmez;
 * anayasa: «sıfır satır gizlenmez»). Dönem dışına düşen kova sayılmaz.
 */
export function saatKovalariniDagit(kovalar: SaatKovasi[], ilkGun: Date, gunSayisi: number): { gunler: GunSatiri[]; saatler: number[] } {
  const gunler: GunSatiri[] = Array.from({ length: gunSayisi }, (_, i) => ({ gun: gunMetni(gunEkle(ilkGun, i)), adet: 0 }));
  const sira = new Map(gunler.map((g, i) => [g.gun, i]));
  const saatler = Array.from({ length: 24 }, () => 0);
  for (const k of kovalar) {
    const i = sira.get(gunMetni(gunDegeri(isTakvimGunu(k.an))));
    if (i === undefined) continue;
    gunler[i]!.adet += k.adet;
    saatler[isSaati(k.an)]! += k.adet;
  }
  return { gunler, saatler };
}

/**
 * Hedef ayrımı ORTAK gövdede (`olay.ts`, 14.10.2026): firma ekranı (`ayarlar/kullanim`,
 * K334-③) da aynı kuralı okur — iki ekranda iki ayrı kopya olmasın. Buradan yeniden
 * dışa aktarılır ki süper admin ekranı ve `kullanim-raporu:dogrula` aynı adla çağırsın.
 */
export { hedefGorunumu, type HedefGorunumu } from "./olay";

/** Çubuk genişliği (%) — en büyüğe göre. Sıfır olmayan değer en az %2 (görünsün); en büyük 0 ise 0. */
export function cubukYuzdesi(adet: number, enBuyuk: number): number {
  if (enBuyuk <= 0 || adet <= 0) return 0;
  return Math.max(2, Math.round((adet / enBuyuk) * 100));
}
