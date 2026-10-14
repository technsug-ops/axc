/**
 * ============================================================================
 *  KULLANIM İZİ — SAF KURALLAR (kullanıcı kararı 13.10.2026)
 * ----------------------------------------------------------------------------
 *  «En çok nereler kullanılıyor, hangi tuşlara basılıyor, hangi sayfalarda ve
 *  nereden nereye geçiliyor.» Tarayıcı (`components/kullanim-izi.tsx`) ve sunucu
 *  (`app/api/kullanim/route.ts`) AYNI kuralları kullanır; sunucu tarayıcıdan
 *  geleni ASLA olduğu gibi yazmaz, kendisi yeniden süzer.
 *
 *  ⛔ İZ İŞ VERİSİ TAŞIMAZ:
 *  · sayfa KALIBA indirgenir — kayıt kimliği `:id` olur (`/satislar/:id`),
 *    sorgu dizesi (arama kelimesi, süzgeç) ve `#` atılır;
 *  · düğme yazısındaki RAKAMLAR «#» olur — sipariş no, tutar, adet sızmaz;
 *  · yazma alanları (input/textarea) hiç dinlenmez, yalnız tıklama.
 * ============================================================================
 */

export const KULLANIM_TURLERI = ["SAYFA", "TIKLAMA"] as const;
export type KullanimTuru = (typeof KULLANIM_TURLERI)[number];
export const KULLANIM_CIHAZLARI = ["TELEFON", "TABLET", "MASAUSTU"] as const;
export type KullanimCihazTuru = (typeof KULLANIM_CIHAZLARI)[number];

/** Bir istekte en çok kaç olay kabul edilir — fazlası atılır (sayı ekranda değil, sunucu kaydında). */
export const KULLANIM_PAKET_SINIRI = 50;
/** Veritabanı sütunu 191 karakter; kalıp ve hedef bunu aşamaz. */
const ALAN_SINIRI = 191;
const HEDEF_SINIRI = 60;

/**
 * Kayıt kimliği gibi duran yol parçası → `:id`. Ölçüt: rakam TAŞIYAN parça
 * (cuid `cmsrg9jek000104…`, sipariş no `11600993042`, sayı `123`). Rakamsız parça
 * bir SAYFA adıdır (`satislar`, `mal-kabul`) ve olduğu gibi kalır.
 */
function kimlikMi(parca: string): boolean {
  return /\d/.test(parca);
}

/** Adres → sayfa kalıbı. Mutlak adres de kabul edilir; yalnız yol kısmı kullanılır. */
export function sayfaKalibi(adres: string): string {
  let yol = adres.trim();
  try {
    if (/^[a-z]+:\/\//i.test(yol)) yol = new URL(yol).pathname;
  } catch {
    return "/";
  }
  yol = yol.split(/[?#]/)[0] ?? "";
  const parcalar = yol.split("/").filter((p) => p !== "");
  const kalip = "/" + parcalar.map((p) => (kimlikMi(decodeURIComponentGuvenli(p)) ? ":id" : p.toLowerCase())).join("/");
  return kalip.slice(0, ALAN_SINIRI);
}

function decodeURIComponentGuvenli(p: string): string {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
}

/** Düğme yazısı → iz hedefi. Rakamlar «#», boşluk sadeleşir, uzun yazı kesilir. Boşsa `null`. */
export function hedefTemizle(metin: string | null | undefined): string | null {
  if (!metin) return null;
  const sade = metin.replace(/\s+/g, " ").replace(/\d+/g, "#").trim();
  if (sade === "") return null;
  return sade.length > HEDEF_SINIRI ? sade.slice(0, HEDEF_SINIRI - 1) + "…" : sade;
}

/** Bağlantı hedefinin ön eki — iz verisinde «buraya gitti» anlamı. */
export const BAGLANTI_ONEKI = "→ ";
/** Site dışı bağlantının kodu — veritabanına METİN değil kod yazılır, rapor sözlükten çevirir. */
export const DIS_BAGLANTI = `${BAGLANTI_ONEKI}:dis`;

/** Bağlantının hedefi → «→ /kalip». Site dışı bağlantı kalıba indirgenmez, yalnız kodu yazılır. */
export function baglantiHedefi(href: string, kendiKokeni: string): string | null {
  try {
    const u = new URL(href, kendiKokeni);
    if (u.origin !== new URL(kendiKokeni).origin) return DIS_BAGLANTI;
    return `${BAGLANTI_ONEKI}${sayfaKalibi(u.pathname)}`;
  } catch {
    return null;
  }
}

export type HedefGorunumu = { tur: "BAGLANTI"; kalip: string } | { tur: "DIS" } | { tur: "DUGME"; metin: string };

/**
 * İz hedefi → ekran biçimi. Site dışı bağlantı veritabanında KODDUR; metni sözlükten gelir.
 * ⚠ TEK GÖVDE (14.10.2026): firma ekranı (`ayarlar/kullanim`) ve süper admin ekranı
 * (`bezirga/kullanim`, deneme dalı) ikisi de bunu okur — iki yerde iki ayrım olmaz.
 * Biçim dalda Halil testinden geçen hâlidir (`metin`).
 */
export function hedefGorunumu(hedef: string): HedefGorunumu {
  if (hedef === DIS_BAGLANTI) return { tur: "DIS" };
  if (hedef.startsWith(BAGLANTI_ONEKI + "/")) return { tur: "BAGLANTI", kalip: hedef.slice(BAGLANTI_ONEKI.length) };
  return { tur: "DUGME", metin: hedef };
}

/** Sunucu: tarayıcıdan gelen hedefi YENİDEN süzer — bağlantı hedefi yeniden kalıba indirgenir. */
function hedefiYenidenSuz(hedef: string): string | null {
  if (hedef === DIS_BAGLANTI) return DIS_BAGLANTI;
  if (hedef.startsWith(BAGLANTI_ONEKI + "/")) return `${BAGLANTI_ONEKI}${sayfaKalibi(hedef.slice(BAGLANTI_ONEKI.length))}`;
  return hedefTemizle(hedef);
}

/** Ekran genişliği → cihaz. Eşikler arayüzün kendi kırılımlarıyla aynı (`md` 768 · `lg` 1024). */
export function cihazSec(genislik: number): KullanimCihazTuru {
  if (genislik < 768) return "TELEFON";
  if (genislik < 1024) return "TABLET";
  return "MASAUSTU";
}

export type HamKullanimOlayi = {
  tur?: unknown;
  sayfa?: unknown;
  oncekiSayfa?: unknown;
  hedef?: unknown;
  cihaz?: unknown;
};

export type TemizKullanimOlayi = {
  tur: KullanimTuru;
  sayfa: string;
  oncekiSayfa: string | null;
  hedef: string | null;
  cihaz: KullanimCihazTuru;
};

/**
 * Tarayıcıdan gelen paketi SUNUCUDA yeniden süzer. Bozuk olay atılır (uydurulmaz);
 * TIKLAMA hedefsizse atılır; paket sınırın üstündeyse fazlası atılır.
 */
export function paketiSuz(ham: unknown): TemizKullanimOlayi[] {
  if (!Array.isArray(ham)) return [];
  const sonuc: TemizKullanimOlayi[] = [];
  for (const o of ham.slice(0, KULLANIM_PAKET_SINIRI) as HamKullanimOlayi[]) {
    if (!o || typeof o !== "object") continue;
    if (!KULLANIM_TURLERI.includes(o.tur as KullanimTuru)) continue;
    if (!KULLANIM_CIHAZLARI.includes(o.cihaz as KullanimCihazTuru)) continue;
    if (typeof o.sayfa !== "string" || o.sayfa === "") continue;
    const tur = o.tur as KullanimTuru;
    const hedef = tur === "TIKLAMA" && typeof o.hedef === "string" ? hedefiYenidenSuz(o.hedef) : null;
    if (tur === "TIKLAMA" && hedef === null) continue;
    sonuc.push({
      tur,
      sayfa: sayfaKalibi(o.sayfa),
      oncekiSayfa: tur === "SAYFA" && typeof o.oncekiSayfa === "string" && o.oncekiSayfa !== "" ? sayfaKalibi(o.oncekiSayfa) : null,
      hedef,
      cihaz: o.cihaz as KullanimCihazTuru,
    });
  }
  return sonuc;
}
