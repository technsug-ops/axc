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
 *  Gövde:         kullaniciId | oturumSurumu | sonGecerlilikMs | firmaId
 *
 *  FİRMA (K303 4c-1, 04.10.2026 — kullanıcı kararı): oturum GİRİŞTE seçilen
 *  firmaya bağlıdır (firma kodu + e-posta + parola). Firma içinden başka
 *  firmaya geçiş YOKTUR. Firmasız (üç parçalı) eski jeton GEÇERSİZDİR:
 *  ona «ilk üyelik» diye firma uydurulmaz, kullanıcı bir kez yeniden girer.
 *
 *  Jeton KENDİ İÇİNDE doğrulanabilir: veritabanına gitmeden imza ve süre
 *  kontrol edilir. Böylece koruma katmanı her istekte sorgu yapmaz.
 *
 *  İPTAL: kullanıcının `sessionVersion` alanı artırılınca eski jetonlar
 *  geçersiz olur ("her yerden çıkış" ve parola değişikliği bunu kullanır).
 *  Sürüm karşılaştırması veritabanı okunan yerlerde yapılır.
 * ============================================================================
 */

import { UYGULAMA } from "@/lib/uygulama";

/**
 * Çerez adı teknik addan türetilir (04.10.2026: `selliora_oturum` →
 * `bezirga_oturum`). ⚠ Ad değişince açık oturumlar bir kez düşer —
 * kullanıcı kararıyla kabul edildi; eski çerez zararsız, süresi dolunca
 * tarayıcı siler.
 */
export const OTURUM_CEREZI = `${UYGULAMA.teknikAd}_oturum`;

/** Jetonun geçerlilik süresi. */
export const OTURUM_SURESI_MS = 30 * 24 * 60 * 60 * 1000;

export type JetonGovdesi = {
  kullaniciId: string;
  oturumSurumu: number;
  sonGecerlilik: number;
  firmaId: string;
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
  if (!govde.firmaId || govde.firmaId.includes("|")) throw new Error("jetonUret: firmaId boş ya da geçersiz");
  const metin = `${govde.kullaniciId}|${govde.oturumSurumu}|${govde.sonGecerlilik}|${govde.firmaId}`;
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

  const parcalarGovde = new TextDecoder().decode(govdeBaytlari).split("|");
  // Firmasız (3 parçalı) eski jeton geçersiz — firma uydurulmaz.
  if (parcalarGovde.length !== 4) return null;
  const [kullaniciId, surum, sonGecerlilik, firmaId] = parcalarGovde;

  const bitis = Number(sonGecerlilik);
  if (!kullaniciId || !firmaId || !Number.isFinite(bitis)) return null;
  if (bitis <= an) return null;

  return {
    kullaniciId,
    oturumSurumu: Number(surum),
    sonGecerlilik: bitis,
    firmaId,
  };
}

/**
 * ============================================================================
 *  SELLİORA YÖNETİM KATMANI — süper admin oturumu (K303 4c-2, 04.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı: Selliora bir firma DEĞİL, firmaların üstündeki yönetim
 *  katmanıdır; girişi AYRI adresten (`/selliora`).
 *
 *  · Çerez AYRI ve YALNIZ `/selliora` yolunda gönderilir — firma ekranlarına
 *    hiç ulaşmaz.
 *  · Jetonun firma alanı ayrılmış İŞARETİ taşır: firma jetonu yönetimde,
 *    yönetim jetonu firma ekranlarında geçmez (firma jetonunda firma kimliği
 *    bir cuid'dir, bu işarete eşit olamaz; yönetim jetonu firma okumasında
 *    `uyeMi(…, YONETIM_ISARETI)` → false).
 *  · Başlık: proxy `/selliora` isteğine koyar (dışarıdan gelenini SİLER);
 *    kök düzen onu görünce firma kabuğunu çizmez.
 *  Burada yalnız Web Crypto'ya güvenen sabitler var — proxy de okuyor.
 * ============================================================================
 */
export const YONETIM_CEREZI = `${UYGULAMA.teknikAd}_yonetim`;
export const YONETIM_ISARETI = `${UYGULAMA.teknikAd.toUpperCase()}_YONETIM`;
/** Yönetim katmanının adresi — teknik addan (05.10.2026, K318). ⚠ Klasör `src/app/<teknik ad>`; Next.js adresi klasörden alır, sabitten değil — `uygulama-adi:dogrula` ikisinin aynı olduğunu ölçer. */
export const YONETIM_YOLU = `/${UYGULAMA.teknikAd}`;
export const YONETIM_BASLIGI = `x-${UYGULAMA.teknikAd}-katman`;
/** Süper admin oturumu daha kısa: 12 saat. */
export const YONETIM_SURESI_MS = 12 * 60 * 60 * 1000;

export function yonetimYoluMu(yol: string): boolean {
  return yol === YONETIM_YOLU || yol.startsWith(`${YONETIM_YOLU}/`);
}
