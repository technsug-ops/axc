/**
 * ÜRÜN ANALİZİ — TELEFON SÜZGEÇ ÖZETİ (K293, 28.09.2026) — saf; ekran ve bekçi
 * aynı gövdeyi çağırır.
 *
 * Telefonda süzgeçler «Süzgeçler (N)» düğmesinin arkasına katlandı. Düğme iki
 * şey söyler: kaç süzgeç AÇIK (N) ve hangileri (özet metni). Kural:
 *  · N yalnız VARSAYILANDAN SAPANLARI sayar — dönem «Bu ay», kanal «tümü»,
 *    para TRY varsayılandır; sayılsaydı hiçbir şey seçilmemişken «2» yazardı.
 *  · Satış eksenlerinde dönem varsayılan olsa da ÖZETTE yazar (hangi döneme
 *    bakıldığı bilgidir), ama SAYILMAZ.
 *  · Dönem/kanal/para stok ve mevsim ekseninde YOK (orada çizilmiyorlar);
 *    raf yaşı kovası yalnız stok ekseninde var.
 *  · Arama bu özete girmez — arama kutusu telefonda da hep açık.
 */
export type OzetParcasi =
  | { tur: "donem" | "kanal" | "para" | "kova" | "sezon"; deger: string; sayilir: boolean }
  | { tur: "marka" | "kategori" | "minAdet" | "minCiro"; sayi: number; sayilir: true }
  | { tur: "favori" | "incelenecek"; sayilir: true };

export const VARSAYILAN_PENCERE = "BU_AY";

export function analizOzetParcalari(g: {
  eksen: string;
  pencere: string;
  kanal: string | null;
  para: "TRY" | "EUR";
  kova: string | null;
  markaSayisi: number;
  kategoriSayisi: number;
  minAdet: number | null;
  minCiro: number | null;
  favori: boolean;
  incelenecek: boolean;
  sezon: "YAZ" | "KIS" | null;
}): OzetParcasi[] {
  const satisEkseni = g.eksen !== "stok" && g.eksen !== "mevsim";
  const p: OzetParcasi[] = [];
  if (satisEkseni) {
    p.push({ tur: "donem", deger: g.pencere, sayilir: g.pencere !== VARSAYILAN_PENCERE });
    if (g.kanal) p.push({ tur: "kanal", deger: g.kanal, sayilir: true });
    if (g.para === "EUR") p.push({ tur: "para", deger: "EUR", sayilir: true });
  }
  if (g.eksen === "stok" && g.kova !== null) p.push({ tur: "kova", deger: g.kova, sayilir: true });
  if (g.markaSayisi > 0) p.push({ tur: "marka", sayi: g.markaSayisi, sayilir: true });
  if (g.kategoriSayisi > 0) p.push({ tur: "kategori", sayi: g.kategoriSayisi, sayilir: true });
  if (g.minAdet !== null) p.push({ tur: "minAdet", sayi: g.minAdet, sayilir: true });
  if (g.minCiro !== null) p.push({ tur: "minCiro", sayi: g.minCiro, sayilir: true });
  if (g.favori) p.push({ tur: "favori", sayilir: true });
  if (g.incelenecek) p.push({ tur: "incelenecek", sayilir: true });
  if (g.sezon !== null) p.push({ tur: "sezon", deger: g.sezon, sayilir: true });
  return p;
}

export const acikSuzgecSayisi = (p: OzetParcasi[]) => p.filter((x) => x.sayilir).length;
