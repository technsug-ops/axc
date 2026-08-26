import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  TRENDYOL API — TEK İSTEMCİ, YALNIZ OKUMA (A3-②, 26.08.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı çerçevesi (25.08.2026), birebir:
 *    _"API istemcisi TEK modülden çıkar ve o modül YALNIZ GET/okuma
 *    uçlarını bilir. Yazma ucu (statü güncelleme, stok, fiyat) fonksiyon
 *    olarak BİLE tanımlanmaz."_
 *
 *  ⚠ KORUMA DOMAİN AYRIMI DEĞİL, YAZAMAYAN İSTEMCİ. Test domaini
 *  açılmadı; güvenlik, "yanlış adrese gitmemek" değil **yanlış fiili
 *  hiç bilmemek** üzerine kuruldu. Bu dosyada `GET` dışında bir yöntem
 *  YOKTUR ve `apiGet` dışında dışa açılan bir çağrı yoktur.
 *
 *  ⚠ NİYE `src/lib` DEĞİL DE `scripts/`: anahtar yalnız `.env.canli`de
 *  yaşıyor ve o dosya Next.js sunucusuna hiç yüklenmiyor. Modülü uygulama
 *  katmanına koymak, uygulamanın onu çağırabileceğini İMA ederdi —
 *  çağıramaz. Yer, yeteneği doğru anlatmalı.
 *
 *  ⚠ ANAHTAR SADECE BELLEĞE OKUNUR. Hiçbir yere basılmaz, loglanmaz,
 *  hata mesajına konmaz. Bu dosyadaki tek `console` çağrısı bile yok.
 * ============================================================================
 */

const TABAN = "https://apigw.trendyol.com";

export type Kimlik = { saticiId: string; key: string; secret: string };

/** `.env.canli`den okur. Eksikse `null` — çağıran açıklayıcı mesaj basar. */
export function kimlikOku(): Kimlik | null {
  let ham: string;
  try {
    ham = readFileSync(".env.canli", "utf8");
  } catch {
    return null;
  }
  const oku = (ad: string) =>
    new RegExp(`^${ad}=(.*)$`, "m")
      .exec(ham)?.[1]
      ?.trim()
      .replace(/^["']|["']$/g, "") ?? "";
  const saticiId = oku("TRENDYOL_SATICI_ID");
  const key = oku("TRENDYOL_API_KEY");
  const secret = oku("TRENDYOL_API_SECRET");
  if (!saticiId || !key || !secret) return null;
  return { saticiId, key, secret };
}

/**
 * ⚠ İKİ BAŞLIK DA ZORUNLU. `User-Agent` eksikse TY `403` döner ve bu
 * YETKİSİZLİK sanılır; oysa sebep başlıktır. (A3-①'de ölçüldü.)
 */
export function baslikKur(k: Kimlik): Record<string, string> {
  return {
    Authorization: `Basic ${Buffer.from(`${k.key}:${k.secret}`).toString("base64")}`,
    "User-Agent": `${k.saticiId} - SelfIntegration`,
    Accept: "application/json",
  };
}

export type OkumaSonucu =
  | { tur: "VERI"; govde: unknown }
  /** 200 döndü ama liste boş — uç çalışıyor, kayıt yok. */
  | { tur: "BOS" }
  | { tur: "YETKISIZ"; durum: number }
  /** 400 — uç ayakta, PARAMETRE bizde yanlış. Ayrı sayılır. */
  | { tur: "ISTEK_HATALI"; durum: number; mesaj: string }
  | { tur: "BULUNAMADI" }
  /** Ağ/zaman aşımı — HÜKÜM VERİLMEZ. */
  | { tur: "ULASILAMADI"; sebep: string };

/**
 * TEK ÇAĞRI NOKTASI — VE YALNIZ `GET`.
 *
 * ⚠ `yontem` PARAMETRESİ YOK, BİLEREK. Parametre olsaydı bir gün biri
 * `"POST"` geçebilirdi; parametresi olmayan bir fonksiyona yanlış fiil
 * geçirilemez. Yasak, disiplinle değil İMZAYLA kuruldu.
 */
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
    /**
     * ⚠ HATA MESAJI OLDUĞU GİBİ TAŞINIR AMA ANAHTAR İÇEREMEZ: istek
     * gövdesi ve başlıklar buraya hiç girmiyor, yalnız `Error.message`.
     */
    return {
      tur: "ULASILAMADI",
      sebep: e instanceof Error ? e.message.slice(0, 120) : String(e),
    };
  }
}

/**
 * Sayfalı uçtan TÜM kayıtları toplar.
 *
 * ⚠ TAVAN VAR VE AŞILIRSA SÖYLENİR. Sessizce kesilseydi rapor "bu kadar
 * kayıt var" der ve eksik olduğunu bilmezdik — "boş sonuç ile temiz
 * sonucu ayırt edemeyen denetim" ailesinin sayfalama hâli.
 */
export async function tumSayfalar(
  yolKur: (sayfa: number) => string,
  baslik: Record<string, string>,
  tavanSayfa = 50,
): Promise<
  | { tur: "TAMAM"; kayitlar: unknown[]; sayfa: number; kesildiMi: boolean }
  | { tur: "HATA"; sonuc: OkumaSonucu }
> {
  const kayitlar: unknown[] = [];
  let sayfa = 0;
  for (; sayfa < tavanSayfa; sayfa++) {
    const s = await apiGet(yolKur(sayfa), baslik);
    if (s.tur !== "VERI") {
      /** İlk sayfa hata verdiyse hüküm yok; sonrakiler kısmi sonuç. */
      if (sayfa === 0) return { tur: "HATA", sonuc: s };
      return { tur: "TAMAM", kayitlar, sayfa, kesildiMi: true };
    }
    const govde = s.govde as Record<string, unknown>;
    const dizi =
      (Array.isArray(govde) ? (govde as unknown[]) : null) ??
      (Array.isArray(govde.content) ? (govde.content as unknown[]) : null) ??
      (Array.isArray(govde.items) ? (govde.items as unknown[]) : null);
    if (dizi === null || dizi.length === 0) break;
    kayitlar.push(...dizi);

    const toplamSayfa = typeof govde.totalPages === "number" ? govde.totalPages : null;
    if (toplamSayfa !== null && sayfa + 1 >= toplamSayfa) {
      sayfa++;
      break;
    }
  }
  return {
    tur: "TAMAM",
    kayitlar,
    sayfa,
    kesildiMi: sayfa >= tavanSayfa,
  };
}

// ---------------------------------------------------------------------------
//  UÇ YOLLARI — YALNIZ OKUMA UÇLARI. Yazma ucu burada TANIMLI DEĞİL.
// ---------------------------------------------------------------------------

/**
 * ⚠ BU LİSTE BİLEREK KISA. `Stock and Price Update`, `Update Package
 * Status` gibi uçlar var ve BİLİNİYOR — ama buraya yazılmadılar. Yazılsalardı
 * "yanlışlıkla çağırma" ihtimali doğardı; yazılmadıkları için çağrılamazlar.
 */
export const UCLAR = {
  /** Sipariş listesi — pencere en fazla 90 gün (A3-①b'de ölçüldü). */
  siparisler: (saticiId: string, bas: number, son: number, sayfa: number, boyut = 200) =>
    `/integration/order/sellers/${saticiId}/orders?startDate=${bas}&endDate=${son}&page=${sayfa}&size=${boyut}`,
  /** Hakediş — pencere en fazla 15 GÜN (uç kendi mesajıyla söylüyor). */
  hakedis: (saticiId: string, bas: number, son: number, sayfa: number, boyut = 500) =>
    `/integration/finance/che/sellers/${saticiId}/settlements?startDate=${bas}&endDate=${son}&transactionType=Sale&page=${sayfa}&size=${boyut}`,
  /** İade/talep listesi. */
  iadeler: (saticiId: string, sayfa: number, boyut = 200) =>
    `/integration/order/sellers/${saticiId}/claims?page=${sayfa}&size=${boyut}`,
} as const;
