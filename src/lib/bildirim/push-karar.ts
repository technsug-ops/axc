/**
 * ============================================================================
 *  ANLIK BİLDİRİM — SAF KARARLAR (20.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: _«bildirimler telefon ekranı kapalıyken ya da bilgisayarda program
 *  açık değilken gelmiyor.»_ Kasa sesi açık sayfanın dakikada bir sormasıydı;
 *  kapalı cihaza ancak sunucu kendisi gönderirse ulaşılır (Web Push).
 *
 *  Bu dosya veritabanına ve ağa DOKUNMAZ — bekçi gövdeleri doğrudan çağırıp
 *  değerini sınar (anayasa: saf hesap katmanı desen tarayan bekçiye muhtaç olmaz).
 * ============================================================================
 */

/** İmleç satırının anahtarı — olay türü başına tek satır. */
export const SIPARIS_IMLECI = "siparis";

/**
 * İMLEÇ KARARI. İmleç yoksa TABAN: ilk kurulumda geçmiş siparişler için
 * bildirim GİTMEZ (kasa sesinin kuralıyla aynı). İmleç gelecekteyse (saat
 * kayması) yine taban — negatif aralık sayılmaz.
 * ⚠ 24 saat tavanı YOK (kasa sesinden farklı): orada tavan, bir gün kapalı kalan
 * sekmenin yüz siparişlik ses çalmasını önlüyordu. Burada tek bildirim gider
 * («120 yeni sipariş»); zamanlayıcı bir gün durduysa bunu söylemek doğrudur.
 */
export function bildirimImleciKarari(onceki: Date | null, simdi: Date): { tur: "TABAN" } | { tur: "SAY"; bas: Date } {
  if (!onceki || Number.isNaN(onceki.getTime()) || onceki > simdi) return { tur: "TABAN" };
  return { tur: "SAY", bas: onceki };
}

/** Bildirim servisi bu cevabı verdiyse abonelik ÖLÜDÜR (cihazdan kaldırılmış) — satır silinir. */
export function olusAbonelikMi(durumKodu: number | undefined): boolean {
  return durumKodu === 404 || durumKodu === 410;
}

/** Abonelik sahibinin bu bildirimi almaya hakkı var mı — `yetkiBaglami` ile AYNI ölçüt. */
export type AboneSahibi = {
  isActive: boolean;
  /** İlk üyelik (createdAt sırası), firması aktif olanlar arasından. */
  ilkUyelik: { rolAktif: boolean; izinler: readonly string[] } | null;
};
export function bildirimHakkiVarMi(sahip: AboneSahibi, izin: string): boolean {
  if (!sahip.isActive || !sahip.ilkUyelik) return false;
  if (!sahip.ilkUyelik.rolAktif) return false;
  return sahip.ilkUyelik.izinler.includes(izin);
}

/**
 * TARAYICIDAN GELEN ABONELİK — istemciye güvenilmez. Uç `https` olmalı ve
 * anahtarlar base64url biçiminde, makul boyda olmalı. Uyuşmazsa null.
 */
export type AbonelikGirdisi = { endpoint: string; p256dh: string; auth: string };
export function abonelikOku(ham: unknown): AbonelikGirdisi | null {
  if (!ham || typeof ham !== "object") return null;
  const o = ham as Record<string, unknown>;
  const anahtarlar = (o.keys ?? {}) as Record<string, unknown>;
  const endpoint = typeof o.endpoint === "string" ? o.endpoint.trim() : "";
  const p256dh = typeof anahtarlar.p256dh === "string" ? anahtarlar.p256dh.trim() : "";
  const auth = typeof anahtarlar.auth === "string" ? anahtarlar.auth.trim() : "";
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || endpoint.length > 700) return null;
  const b64 = /^[A-Za-z0-9_-]+={0,2}$/;
  if (!b64.test(p256dh) || p256dh.length < 40 || p256dh.length > 255) return null;
  if (!b64.test(auth) || auth.length < 8 || auth.length > 255) return null;
  return { endpoint, p256dh, auth };
}

/**
 * Bildirime dokununca açılacak adres — yalnız AYNI sitenin yolu. Dışarı
 * yönlendiren (`//başka-site`, `https://…`) bir yük kabul edilmez.
 */
export function guvenliBildirimAdresi(adres: unknown): string {
  if (typeof adres !== "string" || !adres.startsWith("/") || adres.startsWith("//") || adres.includes("\\")) return "/";
  return adres;
}

/**
 * Cihaz listesinde kullanıcının kendi cihazını tanıması için kısa etiket
 * («Android · Chrome»). Kimlik değildir; yalnız gösterim.
 */
export function cihazEtiketi(ua: string): string {
  const sistem = /iPhone|iPad|iPod/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  const tarayici = /Edg\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\/|CriOS\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return [sistem, tarayici].filter(Boolean).join(" · ");
}

/** VAPID genel anahtarı (base64url) → tarayıcının istediği bayt dizisi. */
export function anahtarBaytlari(base64url: string): Uint8Array<ArrayBuffer> {
  const dolgu = "=".repeat((4 - (base64url.length % 4)) % 4);
  const ikili = atob((base64url + dolgu).replace(/-/g, "+").replace(/_/g, "/"));
  const baytlar = new Uint8Array(new ArrayBuffer(ikili.length));
  for (let i = 0; i < ikili.length; i++) baytlar[i] = ikili.charCodeAt(i);
  return baytlar;
}
