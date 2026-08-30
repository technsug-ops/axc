import QRCode from "qrcode";

import { code128B, code128Genisligi, code128Yol } from "./code128";

/**
 * ============================================================================
 *  RAF ETİKETİ — SVG, SİSTEM İÇİNDE ÜRETİLİR (K50)
 * ----------------------------------------------------------------------------
 *  ⛔ DIŞ SERVİS/API ÇAĞRISI YOK. Etiket basma yeteneği başkasının çalışır
 *  olmasına bağlanmaz.
 *
 *  ⭐ ÜÇ GÖSTERİM, **TEK DEĞER**:
 *    sol   `Code128`  → el terminali
 *    sağ   `QR`       → telefon kamerası
 *    alt   okunabilir → insan gözü (`RAF-SLN3-2`)
 *
 *  ⛔ QR'A ZENGİN VERİ KONMAZ — adres/URL/liste YASAK.
 *  Gerekçe: iki kod ayrışırsa aynı etiket İKİ KİMLİK taşır. Telefonla
 *  okuyan bir raf, el terminaliyle okuyan başka bir raf bulur ve bunu
 *  kimse fark etmez. Üçü de AYNI dizeyi taşır; bekçi bunu ölçer.
 *
 *  ⚠ VE KODLAYICI BAĞIMSIZ DOĞRULANDI (30.08.2026): üretilen barkodlar
 *  `zxing-wasm` okuyucusuna verildi ve dördü de birebir okundu. Kendi
 *  kendini doğrulayan bir ölçüm değil — kodlayan ile okuyan ayrı gövdeler.
 * ============================================================================
 */

/** Etiket ölçüleri — mm. 50×30 standart termal etiket. */
export const ETIKET_EN_MM = 50;
export const ETIKET_BOY_MM = 30;

export type EtiketSecenekleri = {
  /** Tek etiketin genişliği (mm). */
  enMm?: number;
  boyMm?: number;
};

/**
 * ⚠ QR ÜRETİMİ ASENKRON — `qrcode` paketi öyle çalışıyor. Etiket sayfası
 * sunucuda çizildiği için sorun değil; istemciye iş düşmüyor.
 *
 * ⛔ `errorCorrectionLevel: "M"` — depo ortamında etiket çizilir, tozlanır.
 * "L" ucuz ama hasarlı etikette okunmaz; "H" fazla modül üretir ve 30 mm
 * etikette modüller kıl gibi incelir. M ortadaki doğru seçim.
 */
export async function rafEtiketiSvg(
  kod: string,
  secenek: EtiketSecenekleri = {},
): Promise<string> {
  const en = secenek.enMm ?? ETIKET_EN_MM;
  const boy = secenek.boyMm ?? ETIKET_BOY_MM;

  const barkod = code128B(kod);
  if (!barkod.olur) {
    /**
     * ⛔ SESSİZ BOŞ ETİKET YASAK (İlke #5). Kod basılamıyorsa etiket
     * NİYE basılamadığını yazar; boş bir kâğıt çıkmaz.
     */
    return hataEtiketi(kod, en, boy, barkod.sebep);
  }

  /**
   * ⭐ QR AYNI DİZEYİ TAŞIR — zengin veri YOK.
   * `type: "svg"` ile üretilip `<svg>` sarmalayıcısı soyuluyor; iç içe SVG
   * bazı yazıcı sürücülerinde çizilmiyor.
   */
  const qrHam = await QRCode.toString(kod, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
  });
  const qrIc = /<svg[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*)<\/svg>/.exec(qrHam);
  const qrKutu = qrIc?.[1] ?? "0 0 1 1";
  const qrGovde = qrIc?.[2] ?? "";

  const modulSayisi = code128Genisligi(barkod.moduller);
  /** Barkod alanı: solun ~%58'i. Kalan sağda QR + altta yazı. */
  const barkodEn = en * 0.56;
  const modulGenisligi = barkodEn / modulSayisi;
  const barkodBoy = boy * 0.5;
  const qrKenar = Math.min(boy * 0.5, en * 0.32);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${en}mm" height="${boy}mm"`,
    ` viewBox="0 0 ${en} ${boy}">`,
    `<rect width="${en}" height="${boy}" fill="#fff"/>`,
    /* --- Code128: sol üst --- */
    `<g transform="translate(${(en * 0.04).toFixed(2)} ${(boy * 0.12).toFixed(2)})`,
    ` scale(1 ${barkodBoy.toFixed(3)})">`,
    `<path d="${code128Yol(barkod.moduller, modulGenisligi)}" fill="#000"/>`,
    `</g>`,
    /* --- QR: sağ üst --- */
    `<g transform="translate(${(en - qrKenar - en * 0.04).toFixed(2)} ${(boy * 0.12).toFixed(2)})">`,
    `<svg width="${qrKenar.toFixed(2)}" height="${qrKenar.toFixed(2)}" viewBox="${qrKutu}">${qrGovde}</svg>`,
    `</g>`,
    /* --- okunabilir yazı: alt, ORTALI --- */
    `<text x="${(en / 2).toFixed(2)}" y="${(boy * 0.88).toFixed(2)}"`,
    ` text-anchor="middle" font-family="monospace"`,
    ` font-size="${(boy * 0.16).toFixed(2)}" font-weight="bold" fill="#000">`,
    kodKacir(kod),
    `</text>`,
    `</svg>`,
  ].join("");
}

/**
 * ⛔ BOŞ ETİKET DEĞİL, SEBEBİ YAZAN ETİKET.
 * Basılamayan bir kod için beyaz kâğıt çıkarsa kimse niye çıktığını
 * anlamaz ve etiket eksik yapıştırılır.
 */
function hataEtiketi(kod: string, en: number, boy: number, sebep: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${en}mm" height="${boy}mm"`,
    ` viewBox="0 0 ${en} ${boy}">`,
    `<rect width="${en}" height="${boy}" fill="#fff" stroke="#000" stroke-width="0.4"/>`,
    `<text x="${(en / 2).toFixed(2)}" y="${(boy * 0.42).toFixed(2)}" text-anchor="middle"`,
    ` font-family="monospace" font-size="${(boy * 0.13).toFixed(2)}" fill="#000">`,
    `BASILAMADI</text>`,
    `<text x="${(en / 2).toFixed(2)}" y="${(boy * 0.68).toFixed(2)}" text-anchor="middle"`,
    ` font-family="monospace" font-size="${(boy * 0.1).toFixed(2)}" fill="#000">`,
    kodKacir(`${kod} · ${sebep}`),
    `</text></svg>`,
  ].join("");
}

/** XML kaçışı — kod şablona kilitli ama gövde başka yerden de çağrılabilir. */
function kodKacir(m: string): string {
  return m
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * ⭐ A4 TOPLU BASIM — ve TEK RAF YENİDEN BASIMI aynı gövdeden.
 *
 * ⚠ YENİDEN BASIM AYNI KODU ÇİZER (K35 kuralı): etiket kaybolduğunda yeni
 * bir kod üretmek, duvardaki eski etiketi yalancı yapar ve konum geçmişini
 * koparır. Bu yüzden burada üretim YOK, yalnız çizim var — kodlar çağırandan
 * gelir.
 */
export async function etiketSayfasiSvg(kodlar: string[]): Promise<string> {
  /** A4: 210×297 mm. Kenar boşluğu 8 mm, etiketler arası 2 mm. */
  const kenar = 8;
  const bosluk = 2;
  const sutun = Math.max(1, Math.floor((210 - kenar * 2 + bosluk) / (ETIKET_EN_MM + bosluk)));
  const parcalar: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">`,
    `<rect width="210" height="297" fill="#fff"/>`,
  ];
  for (const [i, kod] of kodlar.entries()) {
    const s = Math.floor(i / sutun);
    const k = i % sutun;
    const x = kenar + k * (ETIKET_EN_MM + bosluk);
    const y = kenar + s * (ETIKET_BOY_MM + bosluk);
    /** ⚠ Sayfaya sığmayan etiket ÇİZİLMEZ — üst üste basmak yerine taşar. */
    if (y + ETIKET_BOY_MM > 297 - kenar) break;
    const tek = await rafEtiketiSvg(kod);
    const ic = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(tek)?.[1] ?? "";
    parcalar.push(
      `<g transform="translate(${x} ${y})">`,
      `<rect width="${ETIKET_EN_MM}" height="${ETIKET_BOY_MM}" fill="none"`,
      ` stroke="#ccc" stroke-width="0.2" stroke-dasharray="1 1"/>`,
      ic,
      `</g>`,
    );
  }
  parcalar.push(`</svg>`);
  return parcalar.join("");
}

/** Bir A4 sayfasına kaç etiket sığar — ekran "N sayfa" diyebilsin. */
export function sayfaBasinaEtiket(): number {
  const kenar = 8;
  const bosluk = 2;
  const sutun = Math.max(1, Math.floor((210 - kenar * 2 + bosluk) / (ETIKET_EN_MM + bosluk)));
  const satir = Math.max(1, Math.floor((297 - kenar * 2 + bosluk) / (ETIKET_BOY_MM + bosluk)));
  return sutun * satir;
}
