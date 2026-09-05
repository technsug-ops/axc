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

export type CekimSonucu =
  | { tur: "TAMAM"; kayitlar: unknown[]; sayfaSayisi: number }
  | { tur: "HATA"; sonuc: OkumaSonucu }
  | { tur: "ZARF_TANINMADI"; anahtarlar: string[] };

/**
 * Bütün paket sayfalarını toplar. Bitiş ölçütü ZARFIN BEYANI (`totalPages`;
 * ölçüldü 05.09.2026: üst alanlar pageCount/totalPages/page/size/content) —
 * 404'e ya da boş sayfaya bel bağlanmaz (HB dersi: sınır ötesi davranış
 * uçtan uca ayrı ölçülmeden bitiş işareti sayılmaz). Zarf tanınmazsa hüküm
 * yok: hangi anahtarların geldiği aynen raporlanır.
 */
export async function tumPaketler(
  baslik: Record<string, string>,
  boyut = 100,
): Promise<CekimSonucu> {
  const kayitlar: unknown[] = [];
  let sayfaSayisi = 1;
  /** Emniyet tavanı: zarf bozulup totalPages şişerse sonsuz döngü olmaz. */
  const TAVAN = 200;
  for (let sayfa = 0; sayfa < Math.min(sayfaSayisi, TAVAN); sayfa++) {
    const sonuc = await apiGet(UCLAR.paketler(sayfa, boyut), baslik);
    if (sonuc.tur !== "VERI") return { tur: "HATA", sonuc };
    const govde = sonuc.govde as {
      totalPages?: unknown;
      pageCount?: unknown;
      content?: unknown;
    };
    const beyan = Number(govde.totalPages ?? govde.pageCount);
    if (!Number.isFinite(beyan) || !Array.isArray(govde.content)) {
      return {
        tur: "ZARF_TANINMADI",
        anahtarlar: Object.keys(govde as Record<string, unknown>),
      };
    }
    sayfaSayisi = beyan;
    kayitlar.push(...govde.content);
  }
  return { tur: "TAMAM", kayitlar, sayfaSayisi };
}
