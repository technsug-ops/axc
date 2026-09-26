/**
 * ============================================================================
 *  ŞÜPHELİ ÜRÜN — SAF KURAL (K284, 26.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı ölçütü: _«EAN ile çekebildiklerinin haricindeki hepsi şüpheli»_.
 *  TEMİZ = barkodu GERÇEK EAN (biçim + KONTROL HANESİ) VE ürünün Trendyol
 *  kategorisi okunmuş (senkron EAN ile eşleştirdi). Geri kalan her aktif
 *  varyant ŞÜPHELİDİR ve sebebi ÖLÇÜLÜR (tahmin yok).
 *
 *  Geri yükleme planı da burada: kullanıcı Excel'de «Doğru EAN» ve «Bu ürün
 *  sizin mi» doldurur; plan SAF üretilir, yazım `app/urunler/supheli/eylemler.ts`te.
 *  Hatalı satır YAZILMAZ ve NEDENİ söylenir — hiçbir değer düzeltilerek
 *  uydurulmaz.
 * ============================================================================
 */

export const EAN_BICIMI = /^(\d{8}|\d{12}|\d{13}|\d{14})$/;

/** GTIN kontrol hanesi (EAN-8 · UPC-A · EAN-13 · GTIN-14 — aynı algoritma). */
export function kontrolHanesiDogruMu(kod: string): boolean {
  if (!/^\d+$/.test(kod) || kod.length < 2) return false;
  const govde = kod.slice(0, -1);
  let toplam = 0;
  for (let i = 0; i < govde.length; i++) {
    const hane = Number(govde[govde.length - 1 - i]);
    toplam += i % 2 === 0 ? hane * 3 : hane;
  }
  return (10 - (toplam % 10)) % 10 === Number(kod[kod.length - 1]);
}

export function eanGecerliMi(kod: string): boolean {
  return EAN_BICIMI.test(kod) && kontrolHanesiDogruMu(kod);
}

export type SupheSebebi = "BARKOD_YOK" | "EAN_DEGIL" | "TY_BULUNAMADI";

export function supheSebebi(barkod: string | null | undefined, tyKategoriVar: boolean): SupheSebebi | null {
  const b = (barkod ?? "").trim();
  if (b === "") return "BARKOD_YOK";
  if (!eanGecerliMi(b)) return "EAN_DEGIL";
  if (!tyKategoriVar) return "TY_BULUNAMADI";
  return null;
}

/**
 * Excel hücresinden EAN metni. SAYI hücresinde baştaki sıfırlar kaybolur
 * (`0027084667271` → 27084667271): sayı AYNI kalır, yalnız yazımı kısalır.
 * Sıfırla tamamlanmış hâl kontrol hanesini TUTUYORSA o sayıdır — tutmuyorsa
 * değer olduğu gibi döner ve plan onu «geçersiz EAN» diye gösterir.
 * ⚠ UZUNLUK BİR SEÇİMDİR: baştaki sıfırlar kontrol hanesini değiştirmez, yani
 * kaybolan kodun 12 mi 13 hane mi yazıldığı SAYIDAN bilinemez. 13 hane (GTIN-13,
 * EAN standardı) seçilir; kesin yazım için ekran sütunu METİN girmeyi söyler.
 */
export function eanHucresi(ham: unknown): string {
  if (typeof ham === "number" && Number.isFinite(ham)) {
    const s = String(Math.round(ham));
    if (eanGecerliMi(s)) return s;
    for (const uzunluk of [13, 12, 14, 8]) {
      if (s.length < uzunluk && eanGecerliMi(s.padStart(uzunluk, "0"))) return s.padStart(uzunluk, "0");
    }
    return s;
  }
  return String(ham ?? "").replace(/\s+/g, "").trim();
}

export type SizinMi = "EVET" | "HAYIR" | "BOS" | "GECERSIZ";

export function sizinMiCoz(ham: unknown): SizinMi {
  const m = String(ham ?? "")
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i");
  if (m === "") return "BOS";
  if (["evet", "e", "yes", "y"].includes(m)) return "EVET";
  if (["hayir", "h", "no", "n"].includes(m)) return "HAYIR";
  return "GECERSIZ";
}

export type YuklenenSatir = { satir: number; kimlik: string; ean: string; sizinMi: SizinMi };

export type Dunya = {
  varyantlar: Map<string, { barkod: string | null; aktif: boolean }>;
  /** Barkod → onu taşıyan varyant kimliği (TÜM varyantlar, pasifler dahil). */
  barkodSahibi: Map<string, string>;
};

export type PlanHatasiKodu =
  | "BILINMEYEN_URUN"
  | "KIMLIK_TEKRAR"
  | "GECERSIZ_EAN"
  | "EAN_BASKA_URUNDE"
  | "EAN_TEKRAR"
  | "GECERSIZ_CEVAP"
  | "CELISKI";

export type PlanHatasi = { satir: number; kimlik: string; kod: PlanHatasiKodu; deger?: string };

export type YuklemePlani = {
  ean: { satir: number; kimlik: string; eski: string | null; yeni: string }[];
  pasif: { satir: number; kimlik: string }[];
  hatalar: PlanHatasi[];
  /** Cevabı boş bırakılmış satır. */
  bos: number;
  /** Cevap var ama zaten öyle (aynı EAN · zaten pasif). */
  degisiklikYok: number;
};

export function yuklemePlani(satirlar: readonly YuklenenSatir[], dunya: Dunya): YuklemePlani {
  const plan: YuklemePlani = { ean: [], pasif: [], hatalar: [], bos: 0, degisiklikYok: 0 };
  const kimlikSay = new Map<string, number>();
  const eanSay = new Map<string, number>();
  for (const s of satirlar) {
    kimlikSay.set(s.kimlik, (kimlikSay.get(s.kimlik) ?? 0) + 1);
    if (s.ean !== "") eanSay.set(s.ean, (eanSay.get(s.ean) ?? 0) + 1);
  }
  for (const s of satirlar) {
    const hata = (kod: PlanHatasiKodu, deger?: string) => plan.hatalar.push({ satir: s.satir, kimlik: s.kimlik, kod, deger });
    const v = dunya.varyantlar.get(s.kimlik);
    if (!v) { hata("BILINMEYEN_URUN"); continue; }
    if ((kimlikSay.get(s.kimlik) ?? 0) > 1) { hata("KIMLIK_TEKRAR"); continue; }
    if (s.sizinMi === "GECERSIZ") { hata("GECERSIZ_CEVAP"); continue; }
    if (s.sizinMi === "HAYIR" && s.ean !== "") { hata("CELISKI", s.ean); continue; }
    if (s.ean === "" && s.sizinMi !== "HAYIR") { plan.bos++; continue; }

    if (s.sizinMi === "HAYIR") {
      if (!v.aktif) plan.degisiklikYok++;
      else plan.pasif.push({ satir: s.satir, kimlik: s.kimlik });
      continue;
    }
    if (!eanGecerliMi(s.ean)) { hata("GECERSIZ_EAN", s.ean); continue; }
    if ((eanSay.get(s.ean) ?? 0) > 1) { hata("EAN_TEKRAR", s.ean); continue; }
    const sahip = dunya.barkodSahibi.get(s.ean);
    if (sahip !== undefined && sahip !== s.kimlik) { hata("EAN_BASKA_URUNDE", s.ean); continue; }
    if (v.barkod === s.ean) { plan.degisiklikYok++; continue; }
    plan.ean.push({ satir: s.satir, kimlik: s.kimlik, eski: v.barkod, yeni: s.ean });
  }
  return plan;
}
