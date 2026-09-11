import { readFileSync } from "node:fs";

/**
 * İKİ KATMANLI SIR OKUMA — `scripts/hb/istemci.ts`teki `kimlikOku()`
 * DESENİYLE BİREBİR AYNI: önce SÜREÇ ORTAMI (Vercel), yoksa `.env.canli`
 * (yerel). Bütün sağlayıcılar VE sağlayıcı seçimi AYNI mekanizmayı
 * kullanıyor — tek gövde, kopya yok.
 *
 * ⛔ YALNIZ İLK SATIR OKUNUR (canlı bulgu 11.09.2026, K-TAVSIYE). Vercel
 * panelinde bir değişkenin DEĞERİNE yanlışlıkla iki satır yapıştırılırsa
 * (`GEMINI_API_KEY`in değerine anahtar + `OZET_LLM_SAGLAYICI=gemini`
 * satırı birlikte girmişti), `.trim()` yalnız BAŞ/SON boşluğu temizler —
 * ORTADAKİ satır sonu kalır ve SDK'nın HTTP başlığı kurma denemesi
 * "invalid header value" ile çöker. İLK SATIRI almak bu sınıftaki yapıştırma
 * hatasına karşı yapısal olarak dayanıklı kılar; ikinci satır sessizce
 * atılır (hata değil, kurtarma).
 */
export function ikiKatmanliAnahtarOku(envAdi: string): string | null {
  const ilkSatir = (deger: string): string => deger.split(/\r?\n/)[0]!.trim();

  const surec = process.env[envAdi]?.trim();
  if (surec) return ilkSatir(surec);

  let ham: string;
  try {
    ham = readFileSync(".env.canli", "utf8");
  } catch {
    return null;
  }
  const deger = ham.match(new RegExp(`^${envAdi}=(.*)$`, "m"))?.[1]?.trim();
  return deger && deger !== "" ? ilkSatir(deger) : null;
}

/**
 * ⛔ HATA MESAJI SIRRI TAŞIYABİLİR — canlı bulgu 11.09.2026. Üçüncü taraf
 * SDK'ların (fetch/Headers katmanı) hata metni, isteğin kurulamayan HAM
 * başlık DEĞERİNİ (Authorization: Bearer <anahtar>) doğrudan içerebilir.
 * `(e as Error).message` düşünmeden `AuditLog`a yazılınca anahtar
 * VERİTABANINA sızdı. Anahtar biliniyorsa (çağıran her zaman biliyor —
 * kendi okuduğu değer) onu hata metninden ÇIKARIP maskelenir; anahtarın
 * kendisi asla loglanmaz (anayasa: "eksiğin adı söylenir, değeri asla").
 */
export function anahtariGizle(mesaj: string, anahtar: string): string {
  return anahtar.length < 8 ? mesaj : mesaj.split(anahtar).join("[ANAHTAR GİZLENDİ]");
}
