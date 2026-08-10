import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * `promisify` tek bir aşırı yüklemeyi seçtiği için ayarlı (options) biçim
 * kayboluyor; tip elle bildiriliyor.
 */
const scryptAsync = promisify(scrypt) as (
  parola: string,
  tuz: Buffer,
  uzunluk: number,
  secenekler: ScryptOptions,
) => Promise<Buffer>;

/**
 * ============================================================================
 *  PAROLA ÖZETİ — scrypt (Node'un içinde, yeni bağımlılık YOK)
 * ----------------------------------------------------------------------------
 *  `bcrypt` derleme ister, `argon2` de öyle. scrypt Node'un çekirdeğinde ve
 *  parola saklamak için tasarlanmış bir algoritmadır (RFC 7914) — bu iş için
 *  yeterlidir ve kurulum sorunu çıkarmaz.
 *
 *  AYARLAR ÖZETİN İÇİNDE SAKLANIR:
 *      scrypt$N$r$p$tuz$ozet
 *  Böylece ileride maliyet artırılsa bile ESKİ parolalar doğrulanabilir;
 *  kullanıcı bir dahaki girişinde sessizce yeni ayarla yeniden özetlenir.
 *
 *  Karşılaştırma `timingSafeEqual` ile yapılır: normal `===` karşılaştırması
 *  doğru baytların sayısını süreden sızdırır.
 * ============================================================================
 */

const N = 16384; // CPU/bellek maliyeti
const r = 8;
const p = 1;
const ANAHTAR_UZUNLUGU = 64;
const TUZ_UZUNLUGU = 16;

function b64(veri: Buffer): string {
  return veri.toString("base64url");
}

export async function parolaOzetle(parola: string): Promise<string> {
  const tuz = randomBytes(TUZ_UZUNLUGU);
  const ozet = await scryptAsync(parola.normalize("NFKC"), tuz, ANAHTAR_UZUNLUGU, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${b64(tuz)}$${b64(ozet)}`;
}

export async function parolaDogrula(
  parola: string,
  saklanan: string,
): Promise<boolean> {
  const parcalar = saklanan.split("$");
  if (parcalar.length !== 6 || parcalar[0] !== "scrypt") return false;

  const [, nMetin, rMetin, pMetin, tuzMetin, ozetMetin] = parcalar;
  const tuz = Buffer.from(tuzMetin, "base64url");
  const beklenen = Buffer.from(ozetMetin, "base64url");
  if (tuz.length === 0 || beklenen.length === 0) return false;

  let hesaplanan: Buffer;
  try {
    hesaplanan = await scryptAsync(
      parola.normalize("NFKC"),
      tuz,
      beklenen.length,
      { N: Number(nMetin), r: Number(rMetin), p: Number(pMetin) },
    );
  } catch {
    return false;
  }

  if (hesaplanan.length !== beklenen.length) return false;
  return timingSafeEqual(hesaplanan, beklenen);
}

/** Parola kuralları — tek yerde, hem kayıt hem değiştirme kullanır. */
export const EN_AZ_PAROLA_UZUNLUGU = 10;

export function parolaYeterliMi(parola: string): boolean {
  return parola.normalize("NFKC").length >= EN_AZ_PAROLA_UZUNLUGU;
}
