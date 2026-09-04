import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  N11 API İSTEMCİSİ — ORTAK GÖVDE (YALNIZ OKUMA)
 * ----------------------------------------------------------------------------
 *  Halil 04.09.2026: "N11 API'sini aldım." Kimlik: mağaza panelindeki
 *  API yönetiminden appKey/appSecret; header'a eklenir (N11 resmî belgesi).
 *  Uç mimarisi TY'nin yakın kopyası: `/rest/delivery/v1/shipmentPackages`
 *  (GMT+3 ms timestamp pencereleri · page/size · status).
 *
 *  ⛔ YAZMA UCU TANIMLI DEĞİL (A3 sınırı) — `apiGet`in fiil parametresi yok.
 *  ⚠ ANAHTAR SADECE BELLEĞE OKUNUR: önce süreç ortamı (K166 — sunucu),
 *  yoksa `.env.canli` (yerel).
 * ============================================================================
 */

export type Kimlik = { appKey: string; appSecret: string };

export function kimlikOku(): Kimlik | null {
  const ortam = {
    appKey: process.env.N11_APP_KEY?.trim() ?? "",
    appSecret: process.env.N11_APP_SECRET?.trim() ?? "",
  };
  if (ortam.appKey && ortam.appSecret) return ortam;
  let ham: string;
  try {
    ham = readFileSync(".env.canli", "utf8");
  } catch {
    return null;
  }
  const al = (ad: string) =>
    ham.match(new RegExp("^" + ad + "=(.*)$", "m"))?.[1]?.trim() ?? "";
  const appKey = al("N11_APP_KEY");
  const appSecret = al("N11_APP_SECRET");
  if (appKey === "" || appSecret === "") return null;
  return { appKey, appSecret };
}

/** N11 resmî belgesi: kimlik header'da `appkey`/`appsecret`. */
export function baslikKur(k: Kimlik): Record<string, string> {
  return {
    appkey: k.appKey,
    appsecret: k.appSecret,
    Accept: "application/json",
  };
}

const TABAN = "https://api.n11.com";

export type OkumaSonucu =
  | { tur: "VERI"; govde: unknown }
  | { tur: "YETKISIZ"; durum: number }
  | { tur: "BULUNAMADI" }
  | { tur: "ISTEK_HATALI"; durum: number; mesaj: string }
  | { tur: "ULASILAMADI"; sebep: string };

/** TEK ÇAĞRI NOKTASI — YALNIZ GET (imzayla; TY/HB ile aynı gerekçe). */
export async function apiGet(
  yol: string,
  baslik: Record<string, string>,
  zamanAsimiMs = 20_000,
): Promise<OkumaSonucu> {
  try {
    const kontrol = new AbortController();
    const zaman = setTimeout(() => kontrol.abort(), zamanAsimiMs);
    const cevap = await fetch(`${TABAN}${yol}`, {
      method: "GET",
      headers: baslik,
      signal: kontrol.signal,
    });
    clearTimeout(zaman);
    if (cevap.status === 401 || cevap.status === 403) {
      return { tur: "YETKISIZ", durum: cevap.status };
    }
    if (cevap.status === 404) return { tur: "BULUNAMADI" };
    if (!cevap.ok) {
      const metin = (await cevap.text()).slice(0, 200).replace(/\s+/g, " ");
      return cevap.status === 400
        ? { tur: "ISTEK_HATALI", durum: 400, mesaj: metin }
        : { tur: "ULASILAMADI", sebep: `HTTP ${cevap.status}` };
    }
    return { tur: "VERI", govde: await cevap.json() };
  } catch (e) {
    /** Mesaj taşınır ama anahtar İÇEREMEZ — başlıklar buraya girmiyor. */
    return {
      tur: "ULASILAMADI",
      sebep: e instanceof Error ? e.message.slice(0, 120) : String(e),
    };
  }
}

export const UCLAR = {
  paketler: (sayfa: number, boyut: number) =>
    `/rest/delivery/v1/shipmentPackages?page=${sayfa}&size=${boyut}`,
};
