/**
 * ============================================================================
 *  TRENDYOL KATEGORİSİ → BİZİM KATEGORİ — SAF KARAR (K283, 26.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: _«ürün isminden karar vermemiz saçma, pazaryerleri ürünleri
 *  zaten kategorize etmiş»_ · _«kesinlikle tahmin istemiyorum; bilmiyorsak
 *  liste yap dolduralım»_.
 *
 *  Trendyol kategorisi ÖLÇÜLÜR (EAN ile). Bizdeki karşılığı `TyKategoriEslesme`
 *  tablosunda bir kez SEÇİLİR. Bu dosya yalnız «bu ürüne yazılır mı» kararını
 *  verir; okuma/yazma `kategori-eslesme-yaz.ts`te. Senkron da ekran da BURAYI
 *  çağırır — kuralın ikinci kopyası yok.
 *
 *  KARAR SIRASI (ilk tutan kazanır):
 *   ① karşılık SEÇİLMEMİŞ → yazılmaz, tahmin edilmez (ekran seçim ister).
 *   ② hedef zaten ürünün kategorisi → değişiklik yok.
 *   ③ kategori ELLE seçilmiş → senkron DOKUNMAZ.
 *      Kaynağı BİLİNMEYEN (K283 öncesi) ama kategorisi DOLU ürün de elle
 *      sayılır; kaynağı bilinmeyen yalnız kategorisi BOŞSA yazılır.
 *   ④ KDV değişecekse → YAZILMAZ, «KDV sorulacak» olarak sayılır. KDV hiçbir
 *      zaman otomatik değişmez. Ürünün kendi KDV istisnası varsa kategori
 *      değişse de KDV değişmez → kapı açık.
 *  KDV çözüm sırası (sistemin geri kalanıyla aynı): istisna > kategori > %20.
 * ============================================================================
 */

export const VARSAYILAN_KDV = 20;

export type KategoriKaynagi = "ELLE" | "TRENDYOL";

export type KategoriKararGirdisi = {
  mevcutKategoriId: string | null;
  mevcutKaynak: KategoriKaynagi | null;
  /** Mevcut kategorinin KDV oranı; kategorisizse `null` (varsayılan %20 sayılır). */
  mevcutKategoriKdv: number | null;
  /** Ürün bazlı KDV istisnası — varsa kategori KDV'yi değiştirmez. */
  urunIstisnasi: number | null;
  /** Eşleşme tablosunun seçtiği kategori; `null` = karşılık SEÇİLMEDİ. */
  hedefKategoriId: string | null;
  hedefKategoriKdv: number | null;
};

export type KategoriAtlamaSebebi = "KARSILIK_YOK" | "AYNI" | "ELLE" | "KDV_DEGISIR";
export type KategoriKarari = { yaz: string } | { atla: KategoriAtlamaSebebi };

/** Etkin KDV — istisna > kategori > varsayılan. */
export function etkinKdv(istisna: number | null, kategoriKdv: number | null): number {
  return istisna ?? kategoriKdv ?? VARSAYILAN_KDV;
}

export function kategoriKarari(g: KategoriKararGirdisi): KategoriKarari {
  if (g.hedefKategoriId === null) return { atla: "KARSILIK_YOK" };
  if (g.hedefKategoriId === g.mevcutKategoriId) return { atla: "AYNI" };
  if (g.mevcutKaynak === "ELLE") return { atla: "ELLE" };
  if (g.mevcutKaynak === null && g.mevcutKategoriId !== null) return { atla: "ELLE" };
  const once = etkinKdv(g.urunIstisnasi, g.mevcutKategoriKdv);
  const sonra = etkinKdv(g.urunIstisnasi, g.hedefKategoriKdv);
  if (once !== sonra) return { atla: "KDV_DEGISIR" };
  return { yaz: g.hedefKategoriId };
}

/** Trendyol kategori adı — tablo anahtarı; boşluk kırpılır, içerik aynen. */
export function tyKategoriAnahtari(ham: string): string {
  return ham.replace(/\s+/g, " ").trim().slice(0, 191);
}
