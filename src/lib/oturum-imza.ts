/**
 * ============================================================================
 *  OTURUM JETONU — İMZALAMA VE DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  BURADA YALNIZCA WEB CRYPTO KULLANILIR (`globalThis.crypto.subtle`).
 *  Sebebi: bu dosyayı hem sunucu hem de `proxy.ts` (istek öncesi çalışan
 *  katman) kullanıyor ve proxy Node API'lerine güvenemez. `node:crypto`
 *  import etmek proxy'yi çalışmaz hâle getirirdi.
 *
 *  JETON BİÇİMİ:  base64url(govde) + "." + base64url(imza)
 *  Gövde:         kullaniciId | oturumSurumu | sonGecerlilikMs
 *
 *  Jeton KENDİ İÇİNDE doğrulanabilir: veritabanına gitmeden imza ve süre
 *  kontrol edilir. Böylece koruma katmanı her istekte sorgu yapmaz.
 *
 *  İPTAL: kullanıcının `sessionVersion` alanı artırılınca eski jetonlar
 *  geçersiz olur ("her yerden çıkış" ve parola değişikliği bunu kullanır).
 *  Sürüm karşılaştırması veritabanı okunan yerlerde yapılır.
 * ============================================================================
 */

export const OTURUM_CEREZI = "selliora_oturum";

/** Jetonun geçerlilik süresi. */
export const OTURUM_SURESI_MS = 30 * 24 * 60 * 60 * 1000;

export type JetonGovdesi = {
  kullaniciId: string;
  oturumSurumu: number;
  sonGecerlilik: number;
};

function base64urlKodla(veri: Uint8Array): string {
  let ikili = "";
  for (const bayt of veri) ikili += String.fromCharCode(bayt);
  return btoa(ikili).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlCoz(metin: string): Uint8Array {
  const doldurulmus = metin.replace(/-/g, "+").replace(/_/g, "/");
  const ikili = atob(doldurulmus + "=".repeat((4 - (doldurulmus.length % 4)) % 4));
  return Uint8Array.from(ikili, (k) => k.charCodeAt(0));
}

async function anahtariAl(sir: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sir),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function jetonUret(
  govde: JetonGovdesi,
  sir: string,
): Promise<string> {
  const metin = `${govde.kullaniciId}|${govde.oturumSurumu}|${govde.sonGecerlilik}`;
  const govdeBaytlari = new TextEncoder().encode(metin);
  const imza = await crypto.subtle.sign(
    "HMAC",
    await anahtariAl(sir),
    govdeBaytlari,
  );
  return `${base64urlKodla(govdeBaytlari)}.${base64urlKodla(new Uint8Array(imza))}`;
}

/**
 * Jetonu doğrular. Geçersizse null döner — hangi sebeple geçersiz olduğu
 * DIŞARIYA söylenmez; saldırgana ipucu vermenin faydası yok.
 *
 * @param an Şu an (ms). Dışarıdan verilir ki süre sınaması saati beklemesin.
 */
export async function jetonuCoz(
  jeton: string,
  sir: string,
  an: number,
): Promise<JetonGovdesi | null> {
  const parcalar = jeton.split(".");
  if (parcalar.length !== 2) return null;

  let govdeBaytlari: Uint8Array;
  let imza: Uint8Array;
  try {
    govdeBaytlari = base64urlCoz(parcalar[0]);
    imza = base64urlCoz(parcalar[1]);
  } catch {
    return null;
  }

  // İmza doğrulaması `verify` ile yapılır — sabit zamanlı karşılaştırma
  // kütüphanenin içindedir, elle string karşılaştırması yapılmaz.
  const gecerli = await crypto.subtle.verify(
    "HMAC",
    await anahtariAl(sir),
    imza as unknown as BufferSource,
    govdeBaytlari as unknown as BufferSource,
  );
  if (!gecerli) return null;

  const [kullaniciId, surum, sonGecerlilik] = new TextDecoder()
    .decode(govdeBaytlari)
    .split("|");

  const bitis = Number(sonGecerlilik);
  if (!kullaniciId || !Number.isFinite(bitis)) return null;
  if (bitis <= an) return null;

  return {
    kullaniciId,
    oturumSurumu: Number(surum),
    sonGecerlilik: bitis,
  };
}
