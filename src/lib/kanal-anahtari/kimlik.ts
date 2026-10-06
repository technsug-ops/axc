/**
 * ============================================================================
 *  KANAL KİMLİĞİ — kanal başına alanlar ve kurallar (K303, 06.10.2026) · SAF
 * ----------------------------------------------------------------------------
 *  Dönen kimlik biçimi, bugünkü istemcilerin (`scripts/{ty,hb,n11}/istemci.ts`)
 *  `Kimlik` tipiyle BİREBİR aynıdır — istemciler değişmeden veritabanından
 *  gelen kimlikle çalışabilsin diye. Biçim değişirse bekçi kırmızı yanar.
 *
 *  `gizli`: ekranda son 4 hanesi gösterilecek alan (TY secret · HB key · N11
 *  appSecret). Alan değerleri hiçbir hata metnine KONMAZ — yalnız alan ADI.
 * ============================================================================
 */

export const DESTEKLENEN_KANALLAR = ["TRENDYOL", "HEPSIBURADA", "N11"] as const;
export type KanalKodu = (typeof DESTEKLENEN_KANALLAR)[number];

export type TyKimlik = { saticiId: string; key: string; secret: string };
export type HbKimlik = { merchantId: string; key: string; ortam: string; developer: string };
export type N11Kimlik = { appKey: string; appSecret: string };
export type KanalKimligi =
  | { kanal: "TRENDYOL"; kimlik: TyKimlik }
  | { kanal: "HEPSIBURADA"; kimlik: HbKimlik }
  | { kanal: "N11"; kimlik: N11Kimlik };

/** Formda sorulan alanlar — sıra ekran sırasıdır. `gizli: true` alanlar `type=password` çizilir. */
export const KIMLIK_ALANLARI: Record<KanalKodu, readonly { ad: string; gizli: boolean }[]> = {
  TRENDYOL: [
    { ad: "saticiId", gizli: false },
    { ad: "key", gizli: true },
    { ad: "secret", gizli: true },
  ],
  HEPSIBURADA: [
    { ad: "merchantId", gizli: false },
    { ad: "key", gizli: true },
    { ad: "developer", gizli: false },
    { ad: "ortam", gizli: false },
  ],
  N11: [
    { ad: "appKey", gizli: true },
    { ad: "appSecret", gizli: true },
  ],
};

export const HB_ORTAMLARI = ["CANLI", "TEST"] as const;

export function desteklenenKanalMi(kod: string): kod is KanalKodu {
  return (DESTEKLENEN_KANALLAR as readonly string[]).includes(kod);
}

export type KimlikHatasi = { hata: "KANAL_DESTEKLENMIYOR" } | { hata: "ALAN_EKSIK"; alanlar: string[] } | { hata: "ALAN_GECERSIZ"; alanlar: string[] };

const EN_UZUN = 500;
/** Anahtar alanlarında boşluk/satır sonu olamaz (kopyalarken gelen artık sessizce yapışmasın). */
const BOSLUKSUZ = /^\S+$/;

/** Ham form girdisinden kimlik kurar. Değerler kırpılır; hata yalnız alan ADLARINI taşır. */
export function kimlikKur(kanal: string, ham: Record<string, string | undefined>): { durum: "TAMAM"; kimlik: KanalKimligi; gizli: string } | ({ durum: "HATA" } & KimlikHatasi) {
  if (!desteklenenKanalMi(kanal)) return { durum: "HATA", hata: "KANAL_DESTEKLENMIYOR" };
  const alanlar = KIMLIK_ALANLARI[kanal];
  const v: Record<string, string> = {};
  for (const a of alanlar) v[a.ad] = (ham[a.ad] ?? "").trim();
  const eksik = alanlar.filter((a) => !v[a.ad]).map((a) => a.ad);
  if (eksik.length) return { durum: "HATA", hata: "ALAN_EKSIK", alanlar: eksik };
  const gecersiz = alanlar.filter((a) => v[a.ad]!.length > EN_UZUN || (a.ad !== "developer" && !BOSLUKSUZ.test(v[a.ad]!))).map((a) => a.ad);
  if (kanal === "TRENDYOL" && !/^\d{1,20}$/.test(v.saticiId!)) gecersiz.push("saticiId");
  if (kanal === "HEPSIBURADA" && !(HB_ORTAMLARI as readonly string[]).includes(v.ortam!.toUpperCase())) gecersiz.push("ortam");
  if (gecersiz.length) return { durum: "HATA", hata: "ALAN_GECERSIZ", alanlar: [...new Set(gecersiz)] };
  if (kanal === "TRENDYOL") return { durum: "TAMAM", kimlik: { kanal, kimlik: { saticiId: v.saticiId!, key: v.key!, secret: v.secret! } }, gizli: v.secret! };
  if (kanal === "HEPSIBURADA") return { durum: "TAMAM", kimlik: { kanal, kimlik: { merchantId: v.merchantId!, key: v.key!, ortam: v.ortam!.toUpperCase(), developer: v.developer! } }, gizli: v.key! };
  return { durum: "TAMAM", kimlik: { kanal, kimlik: { appKey: v.appKey!, appSecret: v.appSecret! } }, gizli: v.appSecret! };
}

/** Çözülmüş düz metni (JSON) yeniden SINAYARAK kimliğe çevirir — bozuk kayıt kimlik vermez. */
export function kimligiAc(kanal: string, duz: string): KanalKimligi | null {
  let nesne: unknown;
  try { nesne = JSON.parse(duz); } catch { return null; }
  if (!nesne || typeof nesne !== "object") return null;
  const r = kimlikKur(kanal, nesne as Record<string, string>);
  return r.durum === "TAMAM" ? r.kimlik : null;
}

/** Şifrelenecek düz metin — yalnız kimlik alanları, sırayla. */
export function kimlikMetni(k: KanalKimligi): string {
  return JSON.stringify(k.kimlik);
}
