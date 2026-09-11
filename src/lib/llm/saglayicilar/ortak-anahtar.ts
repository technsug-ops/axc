import { readFileSync } from "node:fs";

/**
 * İKİ KATMANLI SIR OKUMA — `scripts/hb/istemci.ts`teki `kimlikOku()`
 * DESENİYLE BİREBİR AYNI: önce SÜREÇ ORTAMI (Vercel), yoksa `.env.canli`
 * (yerel). Bütün sağlayıcılar VE sağlayıcı seçimi AYNI mekanizmayı
 * kullanıyor — tek gövde, kopya yok.
 */
export function ikiKatmanliAnahtarOku(envAdi: string): string | null {
  const surec = process.env[envAdi]?.trim();
  if (surec) return surec;

  let ham: string;
  try {
    ham = readFileSync(".env.canli", "utf8");
  } catch {
    return null;
  }
  const deger = ham.match(new RegExp(`^${envAdi}=(.*)$`, "m"))?.[1]?.trim();
  return deger && deger !== "" ? deger : null;
}
