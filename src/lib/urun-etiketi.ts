import QRCode from "qrcode";

import { code128B, code128Genisligi, code128Yol } from "@/lib/depo/code128";

/**
 * ============================================================================
 *  ÜRÜN ETİKETİ — SVG GÖVDESİ (K291, 27.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 27.09: içerik «Firma SKU barkodu + kodun kendisi + ürün
 *  adının kısaltılmışı». Yazıcı Xprinter XP-490B (termal, 4 inç); eldeki
 *  rulo kargo ölçüsünde → ölçü SEÇİLEBİLİR (100×100 · 100×150 · 50×30).
 *
 *  Barkod raf etiketiyle AYNI çizici (`code128`) — ikinci bir barkod yolu
 *  açılsaydı biri ötekinden sessizce ayrışırdı. Kod Code128 B ile basılamıyorsa
 *  etiket NEDENİNİ yazar; boş kâğıt çıkmaz (İlke #5).
 *  ⚠ RAF YAZILMAZ: ürün raf değiştirirse etiket yalancı olur (kimlik koddur).
 * ============================================================================
 */

export const ETIKET_OLCULERI = {
  /**
   * K291-② (27.09.2026): kullanıcının ürün etiketi rulosu 40×30. Bu ölçüde
   * 12–13 karakterlik Code128'in en ince çizgisi 0,20–0,21 mm = 203 dpi'de
   * ~1,6 nokta (ölçüldü) — termal baskıda güvenli 2 noktanın ALTINDA. USB
   * okuyucu karekod okuyor (kullanıcı teyidi) → 40×30 KAREKODLU çizilir.
   */
  "40x30": { en: 40, boy: 30 },
  "100x100": { en: 100, boy: 100 },
  "100x150": { en: 100, boy: 150 },
  "50x30": { en: 50, boy: 30 },
} as const;
export type EtiketOlcusu = keyof typeof ETIKET_OLCULERI;
export const VARSAYILAN_OLCU: EtiketOlcusu = "40x30";
/** Karekodla çizilen ölçüler (çizgi barkod bu ölçüde güvenli değil). */
export const KAREKODLU_OLCULER: readonly EtiketOlcusu[] = ["40x30"];

export function olcuCoz(ham: string | undefined): EtiketOlcusu {
  return ham && ham in ETIKET_OLCULERI ? (ham as EtiketOlcusu) : VARSAYILAN_OLCU;
}

function kacir(m: string): string {
  return m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Adı en çok `satir` satıra böler; sığmayan kısım «…» ile kesilir (kelime
 * sınırında). Saf — değerle sınanır.
 */
export function adSatirlari(ad: string, satirBasiKarakter: number, satir: number): string[] {
  const kelimeler = ad.trim().split(/\s+/).filter(Boolean);
  const cikti: string[] = [];
  let simdiki = "";
  for (const k of kelimeler) {
    const aday = simdiki ? `${simdiki} ${k}` : k;
    if (aday.length <= satirBasiKarakter) {
      simdiki = aday;
      continue;
    }
    if (simdiki) cikti.push(simdiki);
    simdiki = k.length > satirBasiKarakter ? k.slice(0, satirBasiKarakter) : k;
    if (cikti.length === satir) break;
  }
  if (simdiki && cikti.length < satir) cikti.push(simdiki);
  const kesildi = cikti.join(" ").length < kelimeler.join(" ").length;
  if (kesildi && cikti.length > 0) {
    const son = cikti[cikti.length - 1]!;
    cikti[cikti.length - 1] = son.length + 1 <= satirBasiKarakter ? `${son}…` : `${son.slice(0, satirBasiKarakter - 1)}…`;
  }
  /* Sınır TEK kapıda (döngüdeki `break`) — ikinci bir `slice` kapısı mutasyonu gizliyordu (ölçüldü 27.09). */
  return cikti;
}

/**
 * 40×30 — KAREKOD solda (kod dizesinin AYNISI; zengin veri yok), sağda kod
 * iki satırda (ön ek / sıra no) ve ürün adı. Yazı boyu kodun uzunluğundan
 * hesaplanır — ilk taslakta «OYU-LEG» sağ kenardan TAŞIYORDU.
 */
async function karekodluEtiket(kod: string, ad: string, en: number, boy: number): Promise<string> {
  const kenar = 1.5;
  const qrKenar = boy - 2 * kenar - 3;
  const ham = await QRCode.toString(kod, { type: "svg", errorCorrectionLevel: "M", margin: 0 });
  const ic = /<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/.exec(ham);
  const sagX = kenar + qrKenar + 1.2;
  const sagEn = en - sagX - kenar;
  const ayrac = kod.lastIndexOf("-");
  const parca = ayrac > 0 ? [kod.slice(0, ayrac), kod.slice(ayrac + 1)] : [kod];
  const enUzun = Math.max(...parca.map((p) => p.length));
  /* monospace kalın: karakter ~0,6 em; 0,64 alınır → yuvarlamaya karşı pay kalır. */
  const kodYazi = Math.min(3.2, sagEn / (enUzun * 0.64));
  const adYazi = 1.5;
  const adUst = kenar + kodYazi * parca.length * 1.1 + 1.4;
  const satirSayisi = Math.max(1, Math.floor((boy - kenar - adUst) / (adYazi * 1.25)));
  const satirlar = adSatirlari(ad, Math.max(5, Math.floor(sagEn / (adYazi * 0.55))), satirSayisi);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${en}mm" height="${boy}mm" viewBox="0 0 ${en} ${boy}">`,
    `<rect width="${en}" height="${boy}" fill="#fff"/>`,
    `<svg x="${kenar}" y="${((boy - qrKenar) / 2).toFixed(2)}" width="${qrKenar.toFixed(2)}" height="${qrKenar.toFixed(2)}" viewBox="${ic?.[1] ?? "0 0 1 1"}">${ic?.[2] ?? ""}</svg>`,
    ...parca.map(
      (p, i) =>
        `<text x="${sagX.toFixed(2)}" y="${(kenar + kodYazi * 1.1 * (i + 1)).toFixed(2)}" font-family="monospace" font-weight="bold" font-size="${kodYazi.toFixed(2)}" fill="#000">${kacir(p)}</text>`,
    ),
    ...satirlar.map(
      (s, i) =>
        `<text x="${sagX.toFixed(2)}" y="${(adUst + adYazi * 1.25 * (i + 1)).toFixed(2)}" font-family="sans-serif" font-size="${adYazi}" fill="#000">${kacir(s)}</text>`,
    ),
    `</svg>`,
  ].join("");
}

export async function urunEtiketiSvg(kod: string, ad: string, olcu: EtiketOlcusu): Promise<string> {
  const { en, boy } = ETIKET_OLCULERI[olcu];
  if (KAREKODLU_OLCULER.includes(olcu)) return karekodluEtiket(kod, ad, en, boy);
  const barkod = code128B(kod);
  /*
   * SESSİZ BÖLGE: Code128 barkodun iki yanında en az 10 modül boşluk ister;
   * yoksa okuyucu başı/sonu ayıramaz. Modül genişliği kenara bağlı olduğu için
   * kenar denklemden çözülür: k ≥ 10·(en − 2k)/M  →  k = 10·en/(M + 20).
   * 50×30'da düz %6 kenar (3 mm) bu sınırın ALTINDA kalıyordu (ölçüldü 27.09).
   */
  const kenar = barkod.olur ? Math.max(en * 0.06, (10 * en) / (code128Genisligi(barkod.moduller) + 20)) : en * 0.06;
  if (!barkod.olur) {
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${en}mm" height="${boy}mm" viewBox="0 0 ${en} ${boy}">`,
      `<rect width="${en}" height="${boy}" fill="#fff" stroke="#000" stroke-width="0.4"/>`,
      `<text x="${en / 2}" y="${boy * 0.45}" text-anchor="middle" font-family="monospace" font-size="${Math.min(en, boy) * 0.08}">BASILAMADI</text>`,
      `<text x="${en / 2}" y="${boy * 0.6}" text-anchor="middle" font-family="monospace" font-size="${Math.min(en, boy) * 0.05}">${kacir(`${kod} · ${barkod.sebep}`)}</text>`,
      `</svg>`,
    ].join("");
  }
  /* Barkod: tam genişlik (kenar boşluklu), yüksekliğin ~%38'i; altında kod, altında ad. */
  const barkodEn = en - 2 * kenar;
  const modul = barkodEn / code128Genisligi(barkod.moduller);
  const barkodBoy = boy * 0.38;
  const barkodUst = boy * 0.08;
  const kodYazi = Math.min(boy * 0.11, en * 0.075);
  const kodY = barkodUst + barkodBoy + kodYazi * 1.25;
  const adYazi = Math.min(boy * 0.075, en * 0.05);
  /* Monospace değil — karakter genişliği ~0,55 em varsayımıyla satır başına karakter. */
  const satirBasi = Math.max(8, Math.floor(barkodEn / (adYazi * 0.55)));
  const satirlar = adSatirlari(ad, satirBasi, boy >= 60 ? 3 : 1);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${en}mm" height="${boy}mm" viewBox="0 0 ${en} ${boy}">`,
    `<rect width="${en}" height="${boy}" fill="#fff"/>`,
    `<g transform="translate(${kenar.toFixed(2)} ${barkodUst.toFixed(2)}) scale(1 ${barkodBoy.toFixed(3)})">`,
    `<path d="${code128Yol(barkod.moduller, modul)}" fill="#000"/>`,
    `</g>`,
    `<text x="${(en / 2).toFixed(2)}" y="${kodY.toFixed(2)}" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="${kodYazi.toFixed(2)}" fill="#000">${kacir(kod)}</text>`,
    ...satirlar.map(
      (s, i) =>
        `<text x="${(en / 2).toFixed(2)}" y="${(kodY + adYazi * 1.6 * (i + 1)).toFixed(2)}" text-anchor="middle" font-family="sans-serif" font-size="${adYazi.toFixed(2)}" fill="#000">${kacir(s)}</text>`,
    ),
    `</svg>`,
  ].join("");
}
