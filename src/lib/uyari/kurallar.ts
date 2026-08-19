/**
 * ============================================================================
 *  UYARI KURALLARI — SAF
 * ----------------------------------------------------------------------------
 *  Veritabanına gitmez, ekran bilmez. "Bu uyarı var mı, kaç, ne kadar" tek
 *  yerde karara bağlanır; `uyari:dogrula` bunu ÇAĞIRARAK sınayabiliyor.
 *
 *  Sorgunun içine gömülseydi hiçbir test göremezdi — bu oturumda tam olarak
 *  bu tuzağa iki kez düşüldü (`varyantAra`, rapordaki `returnItemId` süzgeci).
 * ============================================================================
 */

import {
  UYARI_SEVIYESI,
  UYARI_ADRESLERI,
  UYARI_ANAHTARLARI,
  UYARI_IZINLERI,
  type Uyari,
  type UyariAnahtari,
  type UyariSeviyesi,
} from "./turler";

/** Toplayıcının ürettiği ham ölçümler. */
export type UyariOlcumleri = Record<
  UyariAnahtari,
  { sayi: number; tutar?: number | null }
>;

/**
 * NAKİT AÇIĞI — YALNIZ EKSİ POZİSYON UYARIR.
 *
 * `netPozisyon` artıysa ortada uyarı yoktur; sıfır da uyarı değildir.
 * "14 günde ₺0 açık" diye bir uyarı, kullanıcının dikkatini boşa harcar.
 *
 * Sayı burada 1'dir (tek bir olgu), tutar açığın büyüklüğüdür — diğer
 * üçünde sayı "kaç kayıt" demek. Bu fark bilinçli: uyarı listesi "N adet"
 * yerine açığın kendisini gösterir.
 */
export function nakitAcigiOlcumu(netPozisyon: number): {
  sayi: number;
  tutar: number | null;
} {
  if (netPozisyon >= 0) return { sayi: 0, tutar: null };
  return { sayi: 1, tutar: Math.abs(netPozisyon) };
}

/**
 * Ölçümlerden uyarı listesi. SIFIR OLANLAR ELENİR — çan yalnız gerçek işi
 * gösterir; "temiz ✓" mesajı liste BOŞ olduğunda ekranda çıkar.
 */
export function uyarilariKur(olcumler: UyariOlcumleri): Uyari[] {
  const liste: Uyari[] = [];
  for (const anahtar of UYARI_ANAHTARLARI) {
    const olcum = olcumler[anahtar];
    if (!olcum || olcum.sayi <= 0) continue;
    liste.push({
      anahtar,
      /**
       * SEVİYE UYARININ KENDİ TANIMINDAN — Faz 2. Burada sabit
       * `"kirmizi"` yazılıydı; kural gövdesi artık karar vermiyor,
       * `UYARI_SEVIYESI` haritasından okuyor. Yeni uyarı eklendiğinde
       * seviye tanımla birlikte gelir, kural gövdesi değişmez.
       */
      seviye: UYARI_SEVIYESI[anahtar],
      sayi: olcum.sayi,
      tutar: olcum.tutar ?? null,
      // Faz 1'in tamamı TRY; EUR uyarısı doğduğunda ölçüm taşıyacak.
      paraBirimi: olcum.tutar == null ? null : "TRY",
      adres: UYARI_ADRESLERI[anahtar],
      izin: UYARI_IZINLERI[anahtar],
    });
  }
  return liste;
}

/**
 * YETKİ SÜZGECİ — GÖREMEYECEĞİ UYARI SAYIYA DA GİRMEZ.
 *
 * Rozet 3 gösterip panelde 1 uyarı listelemek, kullanıcıya "iki uyarı
 * saklanıyor" demektir; bu hem kafa karıştırır hem de saklananın NE
 * olduğunu sızdırır. Süzme sayımdan ÖNCE yapılır.
 */
export function izneGoreSuz(
  uyarilar: Uyari[],
  izinVar: (izin: string) => boolean,
): Uyari[] {
  return uyarilar.filter((u) => u.izin === null || izinVar(u.izin));
}

/**
 * ÇAN ROZETİ — EN YÜKSEK SEVİYE KAZANIR.
 *
 * Bir kırmızı ve üç amber varsa rozet KIRMIZIDIR. Ortalama ya da çoğunluk
 * alınsaydı tek bir para kaybı uyarısı sarıya boğulup gözden kaçardı.
 */
export function canSeviyesi(uyarilar: Uyari[]): UyariSeviyesi | null {
  if (uyarilar.length === 0) return null;
  if (uyarilar.some((u) => u.seviye === "kirmizi")) return "kirmizi";
  if (uyarilar.some((u) => u.seviye === "amber")) return "amber";
  return "notr";
}

/**
 * ROZETTEKİ SAYI — YALNIZ KIRMIZI + AMBER (mimar kararı 19.08.2026).
 *
 * ⚠ NÖTR ROZETE GİRMEZ. Girseydi şu olurdu: hiç kırmızı yokken bile rozet
 * `3` gösterir, kullanıcı açar, hepsi bilgi çıkar. İki üç kez tekrarlayınca
 * rozete bakmayı bırakır — ve o gün gerçek bir kırmızı geldiğinde de
 * bakmaz. Rozet EYLEM ÇAĞRISIDIR; bilgi sayacı değil.
 *
 * Sayı uyarı ADEDİDİR, kayıt adedi değil: "3 uyarı" der, "3 satış" demez.
 */
export function canSayisi(uyarilar: Uyari[]): number {
  return uyarilar.filter((u) => u.seviye !== "notr").length;
}

/**
 * NÖTR KATMAN VAR MI — ROZETSİZ VARLIK NOKTASI.
 *
 * _Mimar bu kararı bana bıraktı (19.08.2026); şöyle karar verdim:_
 * Nötr katman rozete girmiyor, ama HİÇBİR işaret bırakmazsak o katman
 * görünmez olur ve kimse oraya bakmaz — yazmakla yazmamak arasında fark
 * kalmaz. Bu yüzden **sayısız minik bir nokta**: çanın yanında durur,
 * "burada bakılacak bir şey var" der, ama RAKAM TAŞIMAZ.
 *
 * Rakam taşısaydı rozetin işini yapar ve tam kaçındığımız şeye —
 * eylemsiz sayı enflasyonuna — dönerdi. Nokta bir davettir, çağrı değil.
 */
export function notrVarMi(uyarilar: Uyari[]): boolean {
  return uyarilar.some((u) => u.seviye === "notr");
}
