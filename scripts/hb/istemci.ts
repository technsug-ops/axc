/**
 * ============================================================================
 *  HEPSİBURADA API İSTEMCİSİ — ORTAK GÖVDE (YALNIZ OKUMA)
 * ----------------------------------------------------------------------------
 *  ⚠ TEK GÖVDE, İKİ OKUYUCU (TY dersi 26.08.2026): kimlik okuma, başlık
 *  kurma ve sayfalama BURADA yaşar; sağlık ölçümü de içe aktarma da
 *  buradan alır. Yerel kopyalar TY'de 44 siparişi yanlış SAPAN ilan
 *  ettirmişti — aynı sınıf burada doğmadan kapatıldı.
 *
 *  ⛔ YAZMA UCU TANIMLI DEĞİL (A3 sınırı). `apiGet`in fiil parametresi
 *  YOK — yasak disiplinle değil İMZAYLA kuruldu. `api:dogrula` bu dizini
 *  `hb/istemci` iziyle tarar.
 *
 *  ⚠ ANAHTAR SADECE BELLEĞE OKUNUR — basılmaz, loglanmaz.
 *
 *  ⚠ KİMLİK KURGUSU HB'NİN KENDİ E-POSTASINDAN (04.09.2026 — kanalın
 *  kendi belgesi, kaynak sırası #1):
 *    · Basic auth: Username = MerchantId, Password = SecretKey
 *    · User-Agent = DEVELOPER USERNAME (merchantId DEĞİL — ilk ölçümde
 *      merchantId konmuştu, üç uç da 401 döndü; düzeltilince 200)
 *
 *  ⚠ ORTAM `.env.canli`den: TEST → `-sit` alan adları. Canlıya geçiş
 *  HEPSIBURADA_ORTAM=CANLI ile olur, kod değişmez.
 * ============================================================================
 */
import { readFileSync } from "node:fs";

export type Kimlik = {
  merchantId: string;
  key: string;
  ortam: string;
  developer: string;
};

/** `.env.canli`den okur. Eksikse `null` — çağıran açıklayıcı mesaj basar. */
export function kimlikOku(): Kimlik | null {
  let ham: string;
  try {
    ham = readFileSync(".env.canli", "utf8");
  } catch {
    return null;
  }
  const al = (ad: string) =>
    ham.match(new RegExp("^" + ad + "=(.*)$", "m"))?.[1]?.trim() ?? "";
  const merchantId = al("HEPSIBURADA_MERCHANT_ID");
  const key = al("HEPSIBURADA_API_KEY");
  const ortam = al("HEPSIBURADA_ORTAM") || "TEST";
  const developer = al("HEPSIBURADA_DEVELOPER");
  if (merchantId === "" || key === "" || developer === "") return null;
  return { merchantId, key, ortam, developer };
}

export function baslikKur(k: Kimlik): Record<string, string> {
  return {
    Authorization:
      "Basic " + Buffer.from(k.merchantId + ":" + k.key).toString("base64"),
    "User-Agent": k.developer,
    Accept: "application/json",
  };
}

/** HB servisleri AYRI alan adlarında yaşıyor — TY'deki tek TABAN burada iki. */
export function taban(servis: "oms" | "listing", ortam: string): string {
  const sit = ortam.toUpperCase() === "TEST" ? "-sit" : "";
  return servis === "oms"
    ? `https://oms-external${sit}.hepsiburada.com`
    : `https://listing-external${sit}.hepsiburada.com`;
}

export type OkumaSonucu =
  | { tur: "VERI"; govde: unknown }
  | { tur: "YETKISIZ"; durum: number }
  | { tur: "BULUNAMADI" }
  | { tur: "ISTEK_HATALI"; durum: number; mesaj: string }
  | { tur: "ULASILAMADI"; sebep: string };

/**
 * TEK ÇAĞRI NOKTASI — VE YALNIZ `GET`.
 * ⚠ `yontem` PARAMETRESİ YOK, BİLEREK (TY istemcisiyle aynı gerekçe):
 * parametresi olmayan bir fonksiyona yanlış fiil geçirilemez.
 */
export async function apiGet(
  tamAdres: string,
  baslik: Record<string, string>,
  zamanAsimiMs = 20_000,
): Promise<OkumaSonucu> {
  try {
    const kontrol = new AbortController();
    const zaman = setTimeout(() => kontrol.abort(), zamanAsimiMs);
    const cevap = await fetch(tamAdres, {
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
    /** ⚠ Mesaj taşınır ama anahtar İÇEREMEZ: başlıklar buraya girmiyor. */
    return {
      tur: "ULASILAMADI",
      sebep: e instanceof Error ? e.message.slice(0, 120) : String(e),
    };
  }
}

/**
 * ZARF ÇÖZÜMÜ — "0 buldum" ile "okuyamadım" AYRI döner.
 *
 * ⚠ HB'nin cevap zarfı henüz GERÇEK VERİYLE ÖLÇÜLMEDİ (SIT sipariş tarafı
 * boş). Dizi bulunamazsa bu fonksiyon üst-düzey ALAN ADLARINI döndürür ki
 * çağıran raporlasın — tanınmayan zarf sessizce "boş liste" SAYILMAZ
 * _(anayasa: boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 * değildir)_.
 */
export function kayitDizisi(
  govde: unknown,
): { tur: "DIZI"; kayitlar: unknown[] } | { tur: "ZARF_TANINMADI"; alanlar: string[] } {
  if (Array.isArray(govde)) return { tur: "DIZI", kayitlar: govde };
  const g = govde as Record<string, unknown> | null;
  for (const ad of ["items", "content", "listings"]) {
    const dizi = g?.[ad];
    if (Array.isArray(dizi)) return { tur: "DIZI", kayitlar: dizi };
  }
  return { tur: "ZARF_TANINMADI", alanlar: g ? Object.keys(g) : [] };
}

// ---------------------------------------------------------------------------
//  UÇ YOLLARI — YALNIZ OKUMA UÇLARI. Yazma ucu burada TANIMLI DEĞİL.
//  (TY istemcisiyle aynı gerekçe: bilinen yazma uçları BİLEREK yazılmadı.)
// ---------------------------------------------------------------------------
export const UCLAR = {
  siparisler: (k: Kimlik, offset: number, limit: number) =>
    `${taban("oms", k.ortam)}/orders/merchantid/${k.merchantId}?offset=${offset}&limit=${limit}`,
  paketler: (k: Kimlik, offset: number, limit: number) =>
    `${taban("oms", k.ortam)}/packages/merchantid/${k.merchantId}?offset=${offset}&limit=${limit}`,
  listingler: (k: Kimlik, offset: number, limit: number) =>
    `${taban("listing", k.ortam)}/listings/merchantid/${k.merchantId}?offset=${offset}&limit=${limit}`,
};

/**
 * OFFSET SAYFALAMASI — TÜM kayıtları toplar.
 *
 * ⚠ SONLANMA ÖLÇÜTÜ ÖLÇÜLDÜ (04.09.2026, SIT listing, 30 kayıt):
 *   · zarf `totalCount` TAŞIYOR (`listings=dizi[10] · totalCount=30`)
 *   · menzil dışı offset **404 DÖNÜYOR** (boş dizi DEĞİL) — yani 404 bu
 *     uçta iki anlamlı: "yol yanlış" da olabilir, "liste bitti" de.
 *   İki anlamlı bir işarete sonlanma bağlanmaz _(anayasa: iki okumayla da
 *   uyumlu gözlem hiçbirini kanıtlamaz)_ — birincil ölçüt `totalCount`:
 *   toplanan ≥ beyan olduğunda temiz durulur ve 404'e hiç varılmaz.
 *   `limit`ten az dönen sayfa da bitirir; beyansız zarf kalırsa tavana
 *   çarpış `kesildiMi` ile BEYAN edilir, sessizce tam liste sanılmaz
 *   _(bir kaynağın listesi kendi tamlığını kanıtlayamaz — beyan da öyle:
 *   `beyanToplam` çağırana verilir ki sayımla karşılaştırılsın)_.
 */
export async function tumKayitlar(
  yolKur: (offset: number, limit: number) => string,
  baslik: Record<string, string>,
  limit = 100,
  tavanTur = 100,
): Promise<
  | {
      tur: "TAMAM";
      kayitlar: unknown[];
      turSayisi: number;
      kesildiMi: boolean;
      beyanToplam: number | null;
    }
  | { tur: "HATA"; sonuc: OkumaSonucu }
  | { tur: "ZARF_TANINMADI"; alanlar: string[] }
> {
  const kayitlar: unknown[] = [];
  let beyanToplam: number | null = null;
  let turSayisi = 0;
  let temizBitti = false;
  for (; turSayisi < tavanTur; turSayisi++) {
    const s = await apiGet(yolKur(turSayisi * limit, limit), baslik);
    if (s.tur !== "VERI") {
      if (turSayisi === 0) return { tur: "HATA", sonuc: s };
      /** Ara sayfada hata: kısmi sonuç — kesik BEYAN edilir. */
      return { tur: "TAMAM", kayitlar, turSayisi, kesildiMi: true, beyanToplam };
    }
    const g = s.govde as Record<string, unknown>;
    if (typeof g?.totalCount === "number") beyanToplam = g.totalCount;
    const z = kayitDizisi(s.govde);
    if (z.tur === "ZARF_TANINMADI") {
      /** İlk sayfada zarf tanınmadıysa hiçbir şey "boş" İLAN EDİLMEZ. */
      if (turSayisi === 0) return { tur: "ZARF_TANINMADI", alanlar: z.alanlar };
      return { tur: "TAMAM", kayitlar, turSayisi, kesildiMi: true, beyanToplam };
    }
    kayitlar.push(...z.kayitlar);
    if (
      z.kayitlar.length < limit ||
      (beyanToplam !== null && kayitlar.length >= beyanToplam)
    ) {
      turSayisi++;
      temizBitti = true;
      break;
    }
  }
  return {
    tur: "TAMAM",
    kayitlar,
    turSayisi,
    kesildiMi: !temizBitti && turSayisi >= tavanTur,
    beyanToplam,
  };
}
