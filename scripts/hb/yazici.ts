import { apiGet, baslikKur, taban, UCLAR, type Kimlik } from "./istemci";

/**
 * ============================================================================
 *  K194-HB — HEPSİBURADA'YA STOK / FİYAT GÖNDERİMİ (YAZICI)
 * ----------------------------------------------------------------------------
 *  TY (`scripts/ty/yazici.ts`) ve N11 (`scripts/n11/yazici.ts`) ile AYNI
 *  sözleşme: tek gönderim noktası, tek POST, iz eylemde (`kart/actions.ts`).
 *
 *  📏 HER KURAL SIT'TE ÖLÇÜLDÜ (01.10.2026, test ilanı HBV000010LWPR) —
 *  DOKÜMAN İKİ YERDE YANLIŞ ÇIKTI:
 *    · gövde JSON DİZİSİ — dokümandaki XML örneği HTTP 400 alıyor;
 *    · stok `stock-uploads`, fiyat `price-uploads` — İKİ AYRI uç, birbirinden
 *      BAĞIMSIZ: fiyatsız stok kabul ediliyor ve fiyatı EZMİYOR (bayat fiyat
 *      riski YOK); fiyat gönderimi stoğa dokunmuyor;
 *    · kargo firması / teslimat profili İSTENMİYOR;
 *    · `merchantSku` gerekmiyor — yalnız `hepsiburadaSku` yetiyor;
 *    · durum önce «Ready» (kuyrukta), bitince «Done» — stokta da fiyatta da
 *      (ilk ölçümde «Ready» bitiş sanılmıştı; ~10 sn sonra «Done» oldu).
 *
 *  ⛔ SESSİZ STOK HATASI — ÖLÇÜLDÜ: var OLMAYAN bir SKU'ya stok gönderilince
 *  durum «Ready», `errors: null` dönüyor; fiyatta ise `ListingNotFound`
 *  geliyor. Yani stok yüklemesinin DURUMU başarıyı kanıtlamaz. Stok,
 *  gönderimden sonra ilan GERİ OKUNARAK doğrulanır (`stokKanaldaMi`).
 *
 *  ⛔ TEK UÇ, KAPALI KÜME: HB'nin iki yükleme ucu var; tek `fetch` noktası
 *  ikisine de gider ama adres yalnız `YUKLEME_UCLARI`ndan seçilir (iki
 *  değer). Serbest bir yol parametresi YOK (`kanal-yazma:dogrula`).
 *
 *  ⛔ CANLI MAĞAZA KİLİDİ: `HB_CANLI_YAZMA_ACIK = false` iken canlı ortama
 *  HİÇBİR istek çıkmaz. Açılış kullanıcının AYRI onayıyla, tek satır
 *  değişikliğiyle olur (kullanıcı kararı 01.10.2026: «önce deneme ortamı»).
 * ============================================================================
 */

/**
 * ⛔ CANLI MAĞAZAYA GÖNDERİM — KULLANICI ONAYIYLA AÇILIR.
 * `false` iken `stokFiyatGonder` canlı ortamda ağa çıkmadan `CANLI_KAPALI` döner.
 */
export const HB_CANLI_YAZMA_ACIK = false;

/** İki yükleme ucu — kapalı küme. Adres başka hiçbir yerden kurulamaz. */
const YUKLEME_UCLARI = {
  STOK: "stock-uploads",
  FIYAT: "price-uploads",
} as const;
type YuklemeTuru = keyof typeof YUKLEME_UCLARI;

export type GonderilecekKalem = {
  hepsiburadaSku: string;
  availableStock?: number;
  price?: number;
};

export type KuralKodu = "GONDERILECEK_YOK" | "STOK_HATALI" | "FIYAT_HATALI" | "SKU_YOK";

/** Tek yüklemenin sonucu (stok ya da fiyat). */
export type YuklemeSonucu =
  | { tur: "KABUL"; id: string }
  | { tur: "YETKISIZ"; durum: number }
  | { tur: "ISTEK_HATALI"; durum: number; mesaj: string }
  | { tur: "ULASILAMADI"; sebep: string };

export type YazmaSonucu =
  | { tur: "GONDERILDI"; stok: YuklemeSonucu | null; fiyat: YuklemeSonucu | null }
  | { tur: "KURAL_IHLALI"; kod: KuralKodu; mesaj: string }
  | { tur: "CANLI_KAPALI" };

/** Ağa çıkmadan önceki saf kural kapısı. */
export function kalemGecerliMi(
  kalem: GonderilecekKalem,
): { gecerli: true } | { gecerli: false; kod: KuralKodu; mesaj: string } {
  if (kalem.hepsiburadaSku.trim() === "") {
    return { gecerli: false, kod: "SKU_YOK", mesaj: "Hepsiburada SKU'su boş." };
  }
  const stokVar = kalem.availableStock !== undefined;
  const fiyatVar = kalem.price !== undefined;
  if (!stokVar && !fiyatVar) {
    return { gecerli: false, kod: "GONDERILECEK_YOK", mesaj: "Ne stok ne fiyat verildi — gönderilecek bir şey yok." };
  }
  if (stokVar && (!Number.isInteger(kalem.availableStock) || (kalem.availableStock ?? 0) < 0)) {
    return { gecerli: false, kod: "STOK_HATALI", mesaj: "Stok tam sayı ve negatif olmayan bir değer olmalı." };
  }
  if (fiyatVar) {
    const f = kalem.price as number;
    if (!Number.isFinite(f) || f <= 0) {
      return { gecerli: false, kod: "FIYAT_HATALI", mesaj: "Fiyat geçerli bir pozitif sayı değil." };
    }
    if (Math.round(f * 100) !== Number((f * 100).toFixed(6))) {
      return { gecerli: false, kod: "FIYAT_HATALI", mesaj: `Fiyat en fazla 2 küsurat hanesi taşıyabilir — verilen: ${f}.` };
    }
  }
  return { gecerli: true };
}

/** TEK GÖNDERİM NOKTASI — tek POST, adres kapalı kümeden. */
async function yukle(
  k: Kimlik,
  tur: YuklemeTuru,
  satir: Record<string, string | number>,
  zamanAsimiMs: number,
): Promise<YuklemeSonucu> {
  const TABAN = taban("listing", k.ortam);
  try {
    const kontrol = new AbortController();
    const zaman = setTimeout(() => kontrol.abort(), zamanAsimiMs);
    const cevap = await fetch(`${TABAN}/listings/merchantid/${k.merchantId}/${YUKLEME_UCLARI[tur]}`, {
      method: "POST",
      headers: { ...baslikKur(k), "Content-Type": "application/json" },
      body: JSON.stringify([satir]),
      signal: kontrol.signal,
    });
    clearTimeout(zaman);
    const govde = await cevap.text();
    if (cevap.status === 401 || cevap.status === 403) return { tur: "YETKISIZ", durum: cevap.status };
    /** ⛔ HATA METNİ KIRPILMAZ — kısaltma yalnız gösterimde (K183). */
    if (!cevap.ok) return { tur: "ISTEK_HATALI", durum: cevap.status, mesaj: govde.replace(/\s+/g, " ").trim() };
    let id: unknown = null;
    try {
      id = (JSON.parse(govde) as { id?: unknown }).id;
    } catch {
      /* Gövde JSON değil — aşağıda «id dönmedi» diye TAM metinle raporlanır. */
    }
    if (typeof id !== "string" || id === "") {
      return { tur: "ISTEK_HATALI", durum: cevap.status, mesaj: "yükleme kimliği dönmedi: " + govde.replace(/\s+/g, " ").trim() };
    }
    return { tur: "KABUL", id };
  } catch (e) {
    return { tur: "ULASILAMADI", sebep: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Stok ve/veya fiyat gönderir. Stok ile fiyat AYRI yüklemelerdir (HB'nin
 * kendi düzeni); biri reddedilirse öteki yine de gitmiş olabilir — sonuç
 * ikisini AYRI taşır, birleştirilip «başarılı» denmez.
 */
export async function stokFiyatGonder(
  k: Kimlik,
  kalem: GonderilecekKalem,
  zamanAsimiMs = 20_000,
): Promise<YazmaSonucu> {
  const kural = kalemGecerliMi(kalem);
  if (!kural.gecerli) return { tur: "KURAL_IHLALI", kod: kural.kod, mesaj: kural.mesaj };
  if (k.ortam.toUpperCase() !== "TEST" && !HB_CANLI_YAZMA_ACIK) return { tur: "CANLI_KAPALI" };

  const stok =
    kalem.availableStock === undefined
      ? null
      : await yukle(k, "STOK", { hepsiburadaSku: kalem.hepsiburadaSku, availableStock: kalem.availableStock }, zamanAsimiMs);
  const fiyat =
    kalem.price === undefined
      ? null
      : await yukle(k, "FIYAT", { hepsiburadaSku: kalem.hepsiburadaSku, price: kalem.price }, zamanAsimiMs);
  return { tur: "GONDERILDI", stok, fiyat };
}

/** Yükleme durumu — HB'nin kendi cevabı (salt okuma). */
export type YuklemeDurumu = {
  durum: string;
  /** HB'nin satır hataları (ör. `ListingNotFound`, `OutOfPriceRange`). */
  hatalar: string[];
  /** Fiyat kilitleri (MinLock / MaxLock) — önerilen aralıkla. */
  kilitler: { tip: string; min: number | null; max: number | null }[];
};

export async function yuklemeDurumu(
  k: Kimlik,
  tur: YuklemeTuru,
  id: string,
): Promise<YuklemeDurumu | null> {
  const r = await apiGet(UCLAR.yuklemeDurumu(k, YUKLEME_UCLARI[tur], id), baslikKur(k));
  if (r.tur !== "VERI") return null;
  return yuklemeDurumuCoz(r.govde);
}

/** Saf — HB durum gövdesini okur (sınanabilir olsun diye ayrı). */
export function yuklemeDurumuCoz(govde: unknown): YuklemeDurumu {
  const g = (govde ?? {}) as {
    status?: unknown;
    errors?: unknown;
    priceValidations?: unknown;
  };
  const hatalar: string[] = [];
  if (Array.isArray(g.errors)) {
    for (const e of g.errors) {
      const ic = (e as { errors?: unknown })?.errors;
      if (Array.isArray(ic)) for (const x of ic) hatalar.push(String(x));
      else if (e) hatalar.push(String((e as { message?: unknown }).message ?? JSON.stringify(e)));
    }
  }
  const kilitler: YuklemeDurumu["kilitler"] = [];
  if (Array.isArray(g.priceValidations)) {
    for (const v of g.priceValidations as { type?: unknown; minPrice?: unknown; maxPrice?: unknown }[]) {
      const sayi = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
      kilitler.push({ tip: String(v?.type ?? "?"), min: sayi(v?.minPrice), max: sayi(v?.maxPrice) });
    }
  }
  return { durum: typeof g.status === "string" ? g.status : "?", hatalar, kilitler };
}

/**
 * DOĞRULAMA — ilan GERİ OKUNUR (stok da fiyat da).
 * ⛔ Durum başarıyı kanıtlamaz (ölçüldü 01.10.2026, SIT): olmayan SKU'ya stok
 * «Ready» dönüyor; fiyat «Done» dendiği anda ilan hâlâ ESKİ fiyatı gösterdi —
 * HB yüklemeyi ~5–6 sn sonra ilana yansıtıyor. Rakam ancak ilanda görülünce
 * «doğrulandı» sayılır.
 * ⚠ Gelen ilanın SKU'su ayrıca karşılaştırılır: HB tanımadığı süzgeci
 * sessizce yok sayıp TÜM ilanları döndürüyor (ölçüldü).
 */
export async function kanaldakiIlan(k: Kimlik, hbSku: string): Promise<KanaldakiIlan | null> {
  const r = await apiGet(UCLAR.tekListing(k, hbSku), baslikKur(k));
  if (r.tur !== "VERI") return null;
  return kanaldakiIlanCoz(r.govde, hbSku);
}

export type KanaldakiIlan = { stok: number | null; fiyat: number | null };

/** Saf — ilan listesinden O SKU'nun stoğu ve fiyatı; ilan yoksa `null`. */
export function kanaldakiIlanCoz(govde: unknown, hbSku: string): KanaldakiIlan | null {
  const liste = (govde as { listings?: unknown })?.listings;
  if (!Array.isArray(liste)) return null;
  const ilan = liste.find((x) => (x as { hepsiburadaSku?: unknown })?.hepsiburadaSku === hbSku) as
    | { availableStock?: unknown; price?: unknown }
    | undefined;
  if (!ilan) return null;
  const sayi = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
  return { stok: sayi(ilan.availableStock), fiyat: sayi(ilan.price) };
}
