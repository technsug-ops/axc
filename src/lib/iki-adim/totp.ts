import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * ============================================================================
 *  TOTP ÇEKİRDEĞİ — RFC 6238 / RFC 4226 (K303 ⑤, 06.10.2026) · SAF
 * ----------------------------------------------------------------------------
 *  Doğrulama uygulamalarıyla (Google/Microsoft Authenticator) uyumlu standart:
 *  HMAC-SHA1 · 30 sn adım · 6 hane · anahtar base32 (20 bayt).
 *  Bekçi RFC 6238 Ek B'nin kendi test değerleriyle sınar.
 *
 *  ⚠ SAAT KAYMASI: ±1 adım (±30 sn) kabul edilir — telefon saati birkaç saniye
 *  kayıksa kullanıcı kilitlenmesin. Daha geniş pencere kaba kuvvete kapı açar.
 *  ⚠ TEKRAR: son kabul edilen adım ve öncesi REDDEDİLİR — aynı kod iki kez
 *  (ör. omuz üstünden görülüp) kullanılamaz.
 *  ⚠ Karşılaştırma sabit süreli (`timingSafeEqual`).
 * ============================================================================
 */

export const ADIM_SN = 30;
export const HANE = 6;
export const PENCERE = 1;

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Kodla(b: Buffer): string {
  let bit = 0, deger = 0, cikti = "";
  for (const x of b) {
    deger = (deger << 8) | x;
    bit += 8;
    while (bit >= 5) { cikti += B32[(deger >>> (bit - 5)) & 31]; bit -= 5; }
  }
  if (bit > 0) cikti += B32[(deger << (5 - bit)) & 31];
  return cikti;
}

export function base32Coz(s: string): Buffer | null {
  const temiz = s.toUpperCase().replace(/[\s=]/g, "");
  if (!/^[A-Z2-7]+$/.test(temiz)) return null;
  let bit = 0, deger = 0;
  const cikti: number[] = [];
  for (const c of temiz) {
    deger = (deger << 5) | B32.indexOf(c);
    bit += 5;
    if (bit >= 8) { cikti.push((deger >>> (bit - 8)) & 255); bit -= 8; }
  }
  return Buffer.from(cikti);
}

/** RFC 4226 HOTP — sayaç için kod (algoritma seçilebilir: RFC 6238 test değerleri SHA256/512 de içerir). */
export function hotp(anahtar: Buffer, sayac: number, hane = HANE, algoritma: "sha1" | "sha256" | "sha512" = "sha1"): string {
  const s = Buffer.alloc(8);
  s.writeBigUInt64BE(BigInt(sayac));
  const h = createHmac(algoritma, anahtar).update(s).digest();
  const o = h[h.length - 1]! & 0x0f;
  const kod = ((h[o]! & 0x7f) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(kod % 10 ** hane).padStart(hane, "0");
}

export function adim(an: Date): number {
  return Math.floor(an.getTime() / 1000 / ADIM_SN);
}

export type DogrulamaSonucu = { gecer: true; adim: number } | { gecer: false; sebep: "BICIM" | "YANLIS" | "TEKRAR" };

/** Kodu doğrular: ±PENCERE adım, son kabul edilen adım ve öncesi reddedilir. */
export function dogrula(anahtar: Buffer, kod: string, an: Date, sonAdim: number | null): DogrulamaSonucu {
  const k = kod.replace(/\s/g, "");
  if (!/^\d{6}$/.test(k)) return { gecer: false, sebep: "BICIM" };
  const simdi = adim(an);
  let tekrar = false;
  for (let d = -PENCERE; d <= PENCERE; d++) {
    const a = simdi + d;
    const beklenen = hotp(anahtar, a);
    if (timingSafeEqual(Buffer.from(beklenen), Buffer.from(k))) {
      if (sonAdim !== null && a <= sonAdim) { tekrar = true; continue; }
      return { gecer: true, adim: a };
    }
  }
  return { gecer: false, sebep: tekrar ? "TEKRAR" : "YANLIS" };
}

/** Yeni gizli anahtar — 20 bayt (160 bit, RFC 4226 önerisi), base32. */
export function yeniAnahtar(): string {
  return base32Kodla(randomBytes(20));
}

/** Doğrulama uygulamasının okuduğu adres (QR'a bu yazılır). */
export function otpauthAdresi(sorumlu: string, hesap: string, anahtar: string): string {
  const etiket = encodeURIComponent(`${sorumlu}:${hesap}`);
  const p = new URLSearchParams({ secret: anahtar, issuer: sorumlu, algorithm: "SHA1", digits: String(HANE), period: String(ADIM_SN) });
  return `otpauth://totp/${etiket}?${p.toString()}`;
}

/** Yedek kod — 10 karakter, karışmayan harf/rakam (0/O, 1/I yok), okunur biçim «XXXXX-XXXXX». */
export function yeniYedekKod(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = randomBytes(10);
  const s = [...b].map((x) => A[x % A.length]).join("");
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

/** Yedek kodu karşılaştırma biçimine indirger (büyük harf, tiresiz, boşluksuz). */
export function yedekKodNormal(k: string): string {
  return k.toUpperCase().replace(/[\s-]/g, "");
}
