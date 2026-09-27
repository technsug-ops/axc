/**
 * ============================================================================
 *  MARKASI BOŞ ÜRÜN LİSTESİ — GERİ YÜKLEME PLANI (K288, saf)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 27.09.2026: «indirebiliyoruz ama düzeltip yükleyemiyoruz».
 *  Markalar ekranındaki «markası boş ürünler» Excel'i doldurulup geri yüklenir.
 *  Eşleşme KİMLİĞE göre. Yazılan marka tabloda (aynı anahtar) varsa TABLONUN
 *  adıyla yazılır ve bağlanır; yoksa kullanıcının yazımıyla, bağsız (Markalar
 *  ekranında «bağlanmayı bekleyen»e düşer). Hatalı satır YAZILMAZ, sebebi
 *  söylenir. Marka DOLU ürünün markası EZİLMEZ.
 * ============================================================================
 */
import { markaAnahtari } from "@/lib/marka-kodu";

export type MarkaYuklemeSatiri = { satir: number; kimlik: string; marka: string };

export type MarkaDunyasi = {
  urunler: Map<string, { brand: string | null; brandId: string | null }>;
  /** Tablo: anahtar → marka. */
  tablo: Map<string, { id: string; name: string }>;
};

export type MarkaPlanHatasi = "BILINMEYEN_URUN" | "KIMLIK_TEKRAR" | "MARKA_DOLU" | "GECERSIZ_MARKA";

export type MarkaYuklemePlani = {
  yaz: { satir: number; kimlik: string; yazim: string; brandId: string | null }[];
  hatalar: { satir: number; kimlik: string; kod: MarkaPlanHatasi; deger?: string }[];
  /** Marka hücresi boş bırakılan satır. */
  bos: number;
  /** Ürünün markası zaten bu (aynı anahtar). */
  degisiklikYok: number;
};

export function markaYuklemePlani(satirlar: readonly MarkaYuklemeSatiri[], d: MarkaDunyasi): MarkaYuklemePlani {
  const plan: MarkaYuklemePlani = { yaz: [], hatalar: [], bos: 0, degisiklikYok: 0 };
  const say = new Map<string, number>();
  for (const s of satirlar) say.set(s.kimlik, (say.get(s.kimlik) ?? 0) + 1);
  for (const s of satirlar) {
    const hata = (kod: MarkaPlanHatasi, deger?: string) => plan.hatalar.push({ satir: s.satir, kimlik: s.kimlik, kod, deger });
    const u = d.urunler.get(s.kimlik);
    if (!u) { hata("BILINMEYEN_URUN"); continue; }
    if ((say.get(s.kimlik) ?? 0) > 1) { hata("KIMLIK_TEKRAR"); continue; }
    const yazim = s.marka.trim();
    if (yazim === "") { plan.bos++; continue; }
    const anahtar = markaAnahtari(yazim);
    if (anahtar === "") { hata("GECERSIZ_MARKA", yazim); continue; }
    const mevcut = markaAnahtari(u.brand);
    if (mevcut !== "" || u.brandId !== null) {
      if (mevcut === anahtar) plan.degisiklikYok++;
      else hata("MARKA_DOLU", u.brand ?? "");
      continue;
    }
    const b = d.tablo.get(anahtar);
    plan.yaz.push({ satir: s.satir, kimlik: s.kimlik, yazim: b ? b.name : yazim, brandId: b?.id ?? null });
  }
  return plan;
}
