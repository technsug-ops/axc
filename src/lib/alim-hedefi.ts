import { saticiAnahtari, type BuyboxKanali, type BuyboxSatiri } from "./buybox";
import { REHBER_YOLU } from "./rapor/alim-rehberi";

/**
 * ============================================================================
 *  ALIM FIRSATI TAKİBİ — SAF HESAP (K363 Faz 3-d, kullanıcı kararları 30.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı bir ürüne HEDEF alış fiyatı yazar; saatlik Buybox ölçümü o ürünün
 *  TY ve HB'deki fiyatını okur (`alim-hedefi-verisi.ts`), fiyat hedefe eşit ya
 *  da altındaysa çan ve sekme haber verir. Kaynak yalnız resmî satıcı uçları
 *  («önce TY + HB»); kazıma YOK.
 *  ⚠ FİYAT = BAŞKA BİR SATICININ EN UCUZ FİYATI: Buybox bizdeyse Buybox fiyatı
 *  bizim kendi fiyatımızdır — kendi malımızı «fırsat» diye göstermek yanlış
 *  alarm olurdu. O zaman bizden sonraki satıcıya bakılır.
 *  ⚠ «Hedefin altında mı» SAKLANMAZ: son fiyat ve hedeften burada hesaplanır;
 *  çan sayısı ile sekme listesi bu tek gövdeden geçer (sayı = liste).
 *  Bu dosya veritabanına ve ağa gitmez.
 * ============================================================================
 */

/**
 * Bir Buybox satırından «başka satıcının en ucuz fiyatı». `null` = bilinmiyor
 * (sorgulanamadı · kanal kayıt döndürmedi · bizden başka satıcı yok).
 * · HB: satıcı listesinden biz (mağaza adıyla) ÇIKARILIR, kalanların en ucuzu.
 *   Mağaza adı boşsa kimse «biz» sayılmaz — listedeki en ucuz alınır.
 * · TY: sıramız 1 ise 2. fiyat; değilse Buybox fiyatı (o zaten başkasının).
 *   Sıramız bilinmiyorsa (ilanımız görünmüyor) Buybox fiyatı başkasınındır.
 */
export function firsatFiyati(s: Pick<BuyboxSatiri, "kanal" | "durum" | "siramiz" | "buyboxFiyati" | "ikinciFiyat" | "rakipler">, magazaAdi: string): number | null {
  if (s.durum === "SORGULANAMADI") return null;
  if (s.kanal === "HB") {
    const biz = saticiAnahtari(magazaAdi);
    const baskalari = s.rakipler.filter((r) => biz === "" || saticiAnahtari(r.satici) !== biz).map((r) => r.fiyat).filter((f) => f > 0);
    return baskalari.length === 0 ? null : Math.min(...baskalari);
  }
  const f = s.siramiz === 1 ? s.ikinciFiyat : s.buyboxFiyati;
  return f !== null && f > 0 ? f : null;
}

export type HedefFiyatlari = { hedef: number; ty: number | null; hb: number | null };

/** İki kanalın en ucuzu. Eşitse TY (sıra sabit — ekran her açılışta aynı kanalı yazsın). İkisi de yoksa `null`. */
export function enUcuz(f: Pick<HedefFiyatlari, "ty" | "hb">): { kanal: BuyboxKanali; fiyat: number } | null {
  if (f.ty === null && f.hb === null) return null;
  if (f.hb === null || (f.ty !== null && f.ty <= f.hb)) return { kanal: "TY", fiyat: f.ty as number };
  return { kanal: "HB", fiyat: f.hb };
}

/** Kuruşa yuvarlanmış kıyas — Decimal→float kuyruğu «eşit» fiyatı «üstünde» saymasın (kuruş birim seçimidir, tolerans değil). */
const kurus = (n: number) => Math.round(n * 100);

/** Fiyat hedefe EŞİT ya da altında mı. Fiyat bilinmiyorsa `false` — bilinmeyen fiyat fırsat sayılmaz. */
export function hedefinAltinda(f: HedefFiyatlari): boolean {
  const e = enUcuz(f);
  return e !== null && kurus(e.fiyat) <= kurus(f.hedef);
}

/** Hedefe uzaklık: en ucuz − hedef (TL, eksi = hedefin altında) ve yüzde. Fiyat bilinmiyorsa `null`. */
export function hedefFarki(f: HedefFiyatlari): { tl: number; yuzde: number } | null {
  const e = enUcuz(f);
  if (e === null || !(f.hedef > 0)) return null;
  return { tl: e.fiyat - f.hedef, yuzde: ((e.fiyat - f.hedef) / f.hedef) * 100 };
}

/** Hedef fiyat girdisi: TR yazımı («1.234,50» · «1234,5» · «1234.5»). Pozitif ve en çok 2 ondalık; değilse `null`. */
export function hedefCoz(ham: string): number | null {
  let m = ham.trim().replace(/\s|₺|TL/gi, "");
  if (m === "") return null;
  if (m.includes(",")) m = m.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(m)) m = m.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(m)) return null;
  const n = Number(m);
  return Number.isFinite(n) && n > 0 && n < 100_000_000 ? n : null;
}

export type HedefSatiri = HedefFiyatlari & {
  id: string;
  variantId: string;
  aktif: boolean;
  urunAdi: string;
};

/**
 * Sekme sırası: hedefin altındakiler önce (en çok altında olan başta), sonra
 * hedefe en yakın olan; fiyatı bilinmeyen ve pasif olan sona. Eşitlikte ad.
 */
export function hedefSirala<T extends HedefSatiri>(satirlar: readonly T[]): T[] {
  const anahtar = (s: T) => (!s.aktif ? 3 : hedefFarki(s) === null ? 2 : hedefinAltinda(s) ? 0 : 1);
  return [...satirlar].sort((a, b) => {
    const ka = anahtar(a);
    const kb = anahtar(b);
    if (ka !== kb) return ka - kb;
    const fa = hedefFarki(a)?.yuzde ?? 0;
    const fb = hedefFarki(b)?.yuzde ?? 0;
    return fa - fb || a.urunAdi.localeCompare(b.urunAdi, "tr");
  });
}

/** Çan sayısı = sekmedeki «hedefin altında» rozetli satırlar: AKTİF ve hedefin altında. */
export function altindakiler<T extends HedefSatiri>(satirlar: readonly T[]): T[] {
  return satirlar.filter((s) => s.aktif && hedefinAltinda(s));
}

/** Sekmenin süzgeci: hepsi ya da yalnız hedefin altındakiler (çan buraya götürür). */
export const FIYAT_TAKIBI_SUZGECLERI = ["hepsi", "altinda"] as const;
export type FiyatTakibiSuzgeci = (typeof FIYAT_TAKIBI_SUZGECLERI)[number];
export function fiyatTakibiSuzgeciCoz(ham: string | undefined): FiyatTakibiSuzgeci {
  return ham === "altinda" ? "altinda" : "hepsi";
}

/** Sekmenin adresi — çan ve sekme içi süzgeç AYNI yerden kurar (İlke #16: adres süzgeç sözleşmesinin sahibinden). */
export function fiyatTakibiAdresi(suzgec: FiyatTakibiSuzgeci): string {
  const temel = `${REHBER_YOLU}?liste=fiyatTakibi`;
  return suzgec === "altinda" ? `${temel}&ft=altinda` : temel;
}

/** Süzgeci uygular — «altinda» = çan kümesi (`altindakiler`), sayı = liste. */
export function fiyatTakibiListesi<T extends HedefSatiri>(satirlar: readonly T[], suzgec: FiyatTakibiSuzgeci): T[] {
  return hedefSirala(suzgec === "altinda" ? altindakiler(satirlar) : satirlar);
}
