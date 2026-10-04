import type { RolDurumu } from "./actions";

/**
 * Yeni rol formu, gönderimden dönen sonuca göre ne yapmalı? (Saf gövde —
 * `rol-formu:dogrula` bunu doğrudan çağırır.)
 *
 * BOŞALTMA YALNIZ BAŞARIDA: hata dönen gönderimde ad ve seçilen izinler
 * YERİNDE kalır — kullanıcı hatayı düzeltip yeniden gönderir; formu silmek
 * onu bütün kutuları baştan işaretlemeye mahkûm ederdi.
 * Başlangıç durumu (`{}`) da başarı DEĞİLDİR: `eklenen` dolu olmalı.
 */
export function rolEklendiMi(durum: RolDurumu): boolean {
  return !durum.hatalar?.length && Boolean(durum.eklenen);
}
