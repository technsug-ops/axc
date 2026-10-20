/**
 * ============================================================================
 *  KASA SESİ TARİFİ — TEK KAYNAK (20.10.2026)
 * ----------------------------------------------------------------------------
 *  Kasa sesi iki yerde çalar ve İKİSİ DE bu tariften üretilir:
 *   · uygulama açıkken tarayıcının ses motoru (`okuma-sinyali.ts`)
 *   · telefon kilitliyken bildirim sesi — kullanıcı bu tariften üretilen WAV
 *     dosyasını indirip sitenin bildirim sesi yapar (`/bildirimler/kasa-sesi`).
 *  Kullanıcı 20.10: _«normal mesaj sesi geliyor, kasa sesi değil.»_ Web bildirimi
 *  kendi ses dosyasını taşıyamaz; telefonun ayarında seçilen ses çalar.
 *
 *  Saf modül — tarayıcıya da sunucuya da girer, hiçbir şeye dokunmaz.
 * ============================================================================
 */

export type Ton = { frekans: number; bas: number; sure: number; dalga: "sine" | "square" | "triangle"; ses: number };
export type Hisirti = { bas: number; sure: number; ses: number };

/** Metalik çan + kısa çekmece hışırtısı. */
export const KASA_TARIFI: { hisirti: Hisirti; tonlar: readonly Ton[] } = {
  hisirti: { bas: 0, sure: 0.07, ses: 0.25 },
  tonlar: [
    { frekans: 2093, bas: 0.06, sure: 0.7, dalga: "triangle", ses: 0.3 },
    { frekans: 2637, bas: 0.06, sure: 0.55, dalga: "triangle", ses: 0.18 },
    { frekans: 3136, bas: 0.16, sure: 0.6, dalga: "triangle", ses: 0.22 },
  ],
};

const ORNEK_HIZI = 44_100;
const SESSIZ = 0.0001;
/** Tarayıcının ses motorundaki zarfla aynı: 10 ms'de yükselir, süre sonunda söner (üstel). */
function zarf(t: number, sure: number, ses: number): number {
  if (t < 0 || t > sure) return 0;
  if (t < 0.01) return SESSIZ * Math.pow(ses / SESSIZ, t / 0.01);
  return ses * Math.pow(SESSIZ / ses, (t - 0.01) / (sure - 0.01));
}
function dalga(tur: Ton["dalga"], faz: number): number {
  const f = faz - Math.floor(faz);
  if (tur === "sine") return Math.sin(2 * Math.PI * f);
  if (tur === "square") return f < 0.5 ? 1 : -1;
  return 1 - 4 * Math.abs(f - 0.5);
}

/**
 * Tariften örnekler (−1…1). Hışırtı DETERMİNİSTİK sözde-rastgele — aynı tarif
 * her seferinde bayt bayt aynı dosyayı verir (ölçülebilir, önbelleklenebilir).
 */
export function kasaOrnekleri(tarif = KASA_TARIFI, hiz = ORNEK_HIZI): Float32Array {
  const son = Math.max(tarif.hisirti.bas + tarif.hisirti.sure, ...tarif.tonlar.map((t) => t.bas + t.sure)) + 0.05;
  const n = Math.ceil(son * hiz);
  const cikti = new Float32Array(n);
  let tohum = 0x2f6b1d3;
  const hisirtiOrnek = Math.floor(tarif.hisirti.sure * hiz);
  const hisirtiBas = Math.floor(tarif.hisirti.bas * hiz);
  for (let i = 0; i < hisirtiOrnek; i++) {
    tohum = (Math.imul(tohum, 1664525) + 1013904223) >>> 0;
    cikti[hisirtiBas + i] += ((tohum / 0xffffffff) * 2 - 1) * (1 - i / hisirtiOrnek) * tarif.hisirti.ses;
  }
  for (const ton of tarif.tonlar) {
    for (let i = Math.floor(ton.bas * hiz); i < n; i++) {
      const t = i / hiz - ton.bas;
      if (t > ton.sure) break;
      cikti[i] += dalga(ton.dalga, ton.frekans * t) * zarf(t, ton.sure, ton.ses);
    }
  }
  for (let i = 0; i < n; i++) cikti[i] = Math.max(-1, Math.min(1, cikti[i]));
  return cikti;
}

/** 16 bit, tek kanal PCM WAV — Android'in bildirim sesi seçicisi bu biçimi okur. */
export function wavBaytlari(ornekler: Float32Array, hiz = ORNEK_HIZI): Uint8Array<ArrayBuffer> {
  const veriBoyu = ornekler.length * 2;
  const tampon = new ArrayBuffer(44 + veriBoyu);
  const v = new DataView(tampon);
  const yaz = (yer: number, metin: string) => { for (let i = 0; i < metin.length; i++) v.setUint8(yer + i, metin.charCodeAt(i)); };
  yaz(0, "RIFF"); v.setUint32(4, 36 + veriBoyu, true); yaz(8, "WAVE");
  yaz(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, hiz, true); v.setUint32(28, hiz * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  yaz(36, "data"); v.setUint32(40, veriBoyu, true);
  for (let i = 0; i < ornekler.length; i++) v.setInt16(44 + i * 2, Math.round(ornekler[i] * 32767), true);
  return new Uint8Array(tampon);
}
