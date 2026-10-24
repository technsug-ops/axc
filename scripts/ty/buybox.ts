import { baslikKur, type Kimlik } from "./istemci";

/**
 * ============================================================================
 *  TRENDYOL BUYBOX KONTROL — OKUMA AMAÇLI POST (K363 Faz 3-a, 25.10.2026)
 * ----------------------------------------------------------------------------
 *  TY'nin resmî Buybox ucu SORGUYU POST gövdesiyle alıyor (barkod listesi);
 *  kanalda HİÇBİR ŞEY DEĞİŞTİRMEZ. «Yalnız GET» kuralına DAR İSTİSNA —
 *  kullanıcı kararı 25.10.2026 «dar istisna aç»:
 *   · tek dosya (bu) · tek uç (`/products/buybox-information`) · tek fiil ·
 *     gövde YALNIZ `{ barcodes }` · prisma YOK;
 *   · `api:dogrula` → `OKUMA_POST_BEYANLI`: bu dosya kanala YAZAN dosyaların
 *     listesine KONMAZ (bir yazıcı değil — ad da sınıf beyanıdır).
 *  Ölçüldü 25.10.2026 (canlı, salt okuma): 10 barkod → 7 kayıt; alanlar
 *  barcode · buyboxPrice · buyboxOrder · hasMultipleSeller ·
 *  secondBuyboxPrice · thirdBuyboxPrice (7/7 dolu). Rakip ADI ve STOĞU yok.
 *  ⚠ Anahtar yalnız belleğe okunur; hiçbir yere basılmaz.
 * ============================================================================
 */

const TABAN = "https://apigw.trendyol.com";

/** Tek istekte en çok barkod (TY belgesi; fazlası istek gitmeden reddedilir). */
export const TY_BUYBOX_PARTI = 10;

export type TyBuyboxKaydi = {
  barkod: string;
  buyboxFiyati: number | null;
  /** Bizim Buybox sıramız (1 = Buybox bizde). */
  siramiz: number | null;
  ikinciFiyat: number | null;
  ucuncuFiyat: number | null;
  cokSatici: boolean;
};

export type TyBuyboxSonucu =
  | { tur: "VERI"; kayitlar: TyBuyboxKaydi[] }
  | { tur: "YETKISIZ"; durum: number }
  | { tur: "ISTEK_HATALI"; durum: number; mesaj: string }
  | { tur: "ULASILAMADI"; sebep: string };

const sayi = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Cevap gövdesi → kayıtlar. Tanınmayan zarf BOŞ LİSTE SAYILMAZ (çağıran «okunamadı» yazar). */
export function tyBuyboxCoz(govde: unknown): TyBuyboxKaydi[] | null {
  const dizi = (govde as { buyboxInfo?: unknown } | null)?.buyboxInfo;
  if (!Array.isArray(dizi)) return null;
  return dizi.map((x: Record<string, unknown>) => ({
    barkod: String(x.barcode ?? ""),
    buyboxFiyati: sayi(x.buyboxPrice),
    siramiz: sayi(x.buyboxOrder),
    ikinciFiyat: sayi(x.secondBuyboxPrice),
    ucuncuFiyat: sayi(x.thirdBuyboxPrice),
    cokSatici: x.hasMultipleSeller === true,
  }));
}

export async function tyBuyboxSorgula(k: Kimlik, barkodlar: readonly string[], zamanAsimiMs = 20_000): Promise<TyBuyboxSonucu> {
  if (barkodlar.length === 0) return { tur: "VERI", kayitlar: [] };
  if (barkodlar.length > TY_BUYBOX_PARTI) return { tur: "ISTEK_HATALI", durum: 0, mesaj: `en çok ${TY_BUYBOX_PARTI} barkod` };
  try {
    const kontrol = new AbortController();
    const zaman = setTimeout(() => kontrol.abort(), zamanAsimiMs);
    const cevap = await fetch(`${TABAN}/integration/product/sellers/${encodeURIComponent(k.saticiId)}/products/buybox-information`, {
      method: "POST",
      headers: { ...baslikKur(k), "Content-Type": "application/json" },
      body: JSON.stringify({ barcodes: [...barkodlar] }),
      signal: kontrol.signal,
    });
    clearTimeout(zaman);
    if (cevap.status === 401 || cevap.status === 403) return { tur: "YETKISIZ", durum: cevap.status };
    if (!cevap.ok) {
      /* Mesaj TAM taşınır (anayasa: hata mesajını kısaltan her işlem teşhisi kısaltır). */
      const metin = (await cevap.text()).replace(/\s+/g, " ").trim();
      return cevap.status === 400 ? { tur: "ISTEK_HATALI", durum: 400, mesaj: metin } : { tur: "ULASILAMADI", sebep: `HTTP ${cevap.status}` };
    }
    const kayitlar = tyBuyboxCoz(await cevap.json());
    return kayitlar === null ? { tur: "ULASILAMADI", sebep: "ZARF_TANINMADI" } : { tur: "VERI", kayitlar };
  } catch (e) {
    return { tur: "ULASILAMADI", sebep: e instanceof Error ? e.message.slice(0, 120) : String(e) };
  }
}
