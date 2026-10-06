import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * ============================================================================
 *  KANAL ANAHTARI ŞİFRELEMESİ — AES-256-GCM (K303, 06.10.2026)
 * ----------------------------------------------------------------------------
 *  Pazaryeri API anahtarları veritabanında YALNIZ bu paketle durur:
 *      v1:<iv base64>:<doğrulama etiketi base64>:<şifreli veri base64>
 *  Ana sır `PAZARYERI_ANAHTAR_SIRRI` (32 bayt, base64) — OTURUM SIRRINDAN AYRI:
 *  biri değişince öteki etkilenmez; veritabanı yedeği tek başına anahtarı AÇAMAZ.
 *
 *  ⚠ GCM etiketi bütünlüğü de doğrular: tek bayt değişen paket «çözülemedi»
 *  verir, bozuk/yanlış anahtar sessizce «çözülmüş» sayılmaz.
 *  ⚠ Hiçbir hata dalı paketi, sırrı ya da düz metni dışarı taşımaz — dönüş
 *  yalnız bir KOD'dur (anayasa: hata koda çevrilir; burada sızıntı da önlenir).
 *  ⚠ Sır yoksa ya da bozuksa düz metne DÜŞÜLMEZ; çağıran «SIR_YOK» görür.
 * ============================================================================
 */

export const SIR_DEGISKENI = "PAZARYERI_ANAHTAR_SIRRI";
const SURUM = "v1";

export type SirSonucu = { durum: "TAMAM"; sir: Buffer } | { durum: "SIR_YOK" } | { durum: "SIR_GECERSIZ" };

/** Ana sırrı okur ve sınar (base64, tam 32 bayt). */
export function sirOku(ham: string | undefined = process.env[SIR_DEGISKENI]): SirSonucu {
  const s = (ham ?? "").trim();
  if (!s) return { durum: "SIR_YOK" };
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return { durum: "SIR_GECERSIZ" };
  const b = Buffer.from(s, "base64");
  if (b.length !== 32) return { durum: "SIR_GECERSIZ" };
  return { durum: "TAMAM", sir: b };
}

/** Düz metni şifreler. Her çağrı YENİ bir iv kullanır (aynı metin iki kez aynı paketi vermez). */
export function sifrele(duz: string, sir: Buffer): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", sir, iv);
  const veri = Buffer.concat([c.update(duz, "utf8"), c.final()]);
  return [SURUM, iv.toString("base64"), c.getAuthTag().toString("base64"), veri.toString("base64")].join(":");
}

/** Paketi çözer. Biçim, sürüm, etiket ya da sır tutmazsa YALNIZ kod döner. */
export function coz(paket: string, sir: Buffer): { durum: "TAMAM"; duz: string } | { durum: "COZULEMEDI" } {
  const p = paket.split(":");
  if (p.length !== 4 || p[0] !== SURUM) return { durum: "COZULEMEDI" };
  try {
    const d = createDecipheriv("aes-256-gcm", sir, Buffer.from(p[1]!, "base64"));
    d.setAuthTag(Buffer.from(p[2]!, "base64"));
    const duz = Buffer.concat([d.update(Buffer.from(p[3]!, "base64")), d.final()]).toString("utf8");
    return { durum: "TAMAM", duz };
  } catch {
    // Bilerek kod: hata nesnesi paketin parçalarını taşıyabilir, dışarı çıkmaz.
    return { durum: "COZULEMEDI" };
  }
}

/** Gizli anahtarın son 4 hanesi — ekranda tanıma için (anahtar 8'den kısaysa yıldız). */
export function sonDort(gizli: string): string {
  const s = gizli.trim();
  return s.length >= 8 ? s.slice(-4) : "****";
}
