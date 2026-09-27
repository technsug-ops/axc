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
  "100x100": { en: 100, boy: 100 },
  "100x150": { en: 100, boy: 150 },
  "50x30": { en: 50, boy: 30 },
} as const;
export type EtiketOlcusu = keyof typeof ETIKET_OLCULERI;
export const VARSAYILAN_OLCU: EtiketOlcusu = "100x100";

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

export function urunEtiketiSvg(kod: string, ad: string, olcu: EtiketOlcusu): string {
  const { en, boy } = ETIKET_OLCULERI[olcu];
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
